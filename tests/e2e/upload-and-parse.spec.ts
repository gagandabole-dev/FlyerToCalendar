import { test, expect } from '@playwright/test';

test('should upload flyer, parse events, open export modal, and fetch calendar feed', async ({ page, request }) => {
  // 1. Navigate to http://localhost:3000
  await page.goto('/');

  // 2. Toggle user mode to Free Version (default, but verify button is visible)
  const freeButton = page.locator('button:has-text("Free Version")');
  await expect(freeButton).toBeVisible();

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
  await expect(page.locator('text=Your Extracted Events')).toBeVisible();
  await expect(page.locator('input[value="Opening Keynote"]')).toBeVisible();
  await expect(page.locator('input[value="Deep Dive into Agentic AI"]')).toBeVisible();

  // 7. Click "Export Calendar (.ICS)" and verify it downloads the file directly
  const downloadIcsButton = page.locator('button:has-text("Export Calendar (.ICS)")');
  await expect(downloadIcsButton).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await downloadIcsButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.ics');

  // 8. Send GET request to /api/feed/[id] and assert headers/content
  const response = await request.get('/api/feed/mock-project-123/calendar.ics');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('text/calendar; charset=utf-8');

  const body = await response.text();
  expect(body).toContain('BEGIN:VCALENDAR');
  expect(body).toContain('VTIMEZONE:Europe/Berlin');
});
