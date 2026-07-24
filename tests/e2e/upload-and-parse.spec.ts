import { test, expect } from '@playwright/test';

test('should upload flyer, parse events, open export modal, and fetch calendar feed', async ({ page, request }) => {
  // 1. Navigate to http://localhost:3000
  await page.goto('/');

  // 2. Toggle user mode to Organizer Pro
  const organizerButton = page.locator('button:has-text("Organizer Pro")');
  await expect(organizerButton).toBeVisible();
  await organizerButton.click();

  // 3. Upload tests/fixtures/sample-festival-flyer.png
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/sample-festival-flyer.png');

  // 4. Verify preview lists the ready file
  await expect(page.locator('text=Ready to parse')).toBeVisible();

  // 5. Click "Convert to Calendar Events"
  const convertButton = page.locator('button:has-text("Convert to Calendar Events")');
  await expect(convertButton).toBeEnabled();
  await convertButton.click();

  // 6. Verify Gemini extracts schedule slots
  await expect(page.locator('text=Review Extracted Events')).toBeVisible();
  await expect(page.locator('input[value="Opening Keynote"]')).toBeVisible();
  await expect(page.locator('input[value="Deep Dive into Agentic AI"]')).toBeVisible();

  // 7. Verify the direct download CTA is displayed in the Export Modal
  const downloadIcsButton = page.locator('button:has-text("Download .ICS")');
  await expect(downloadIcsButton).toBeEnabled();
  await downloadIcsButton.click();

  // Verify the "Download Calendar File (.ics)" CTA is visible
  const ctaButton = page.locator('button:has-text("Download Calendar File (.ics)")');
  await expect(ctaButton).toBeVisible();

  // 8. Send GET request to /api/feed/[id] and assert headers/content
  const response = await request.get('/api/feed/mock-project-123/calendar.ics');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('text/calendar; charset=utf-8');

  const body = await response.text();
  expect(body).toContain('BEGIN:VCALENDAR');
  expect(body).toContain('VTIMEZONE:Europe/Berlin');
});
