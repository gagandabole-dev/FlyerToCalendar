export function normalizeDateStr(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const trimmed = dateStr.trim();
  // Check if it matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Check if it matches DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed) || trimmed.includes(".")) {
    const parts = trimmed.split(".");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      if (year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
  }
  return trimmed;
}
