export type TestAiSelectedItemInput = {
  title: string;
  itemDetails?: string | null;
  [key: string]: unknown;
};

function validYear(value: unknown): string {
  const candidate = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  return /^(?:18|19|20)\d{2}$/.test(candidate) ? candidate : '';
}

export function extractTestAiTitleYear(title: string): string {
  const match = title.match(/\b(?:18|19|20)\d{2}\b/);
  return match?.[0] ?? '';
}

export function normalizeTestAiSelectedItem<T extends TestAiSelectedItemInput>(item: T): T & { year?: string; itemDetails: string } {
  let details: Record<string, unknown> = {};
  if (typeof item.itemDetails === 'string' && item.itemDetails.trim()) {
    try {
      const parsed = JSON.parse(item.itemDetails);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) details = { ...parsed };
    } catch {
      details = {};
    }
  }

  const titleYear = extractTestAiTitleYear(item.title);
  const storedYear = validYear(details.year) || validYear(details.releaseYear) || validYear(details.manufactureYear);
  const currentYear = titleYear || storedYear;
  if (currentYear) details.year = currentYear;

  return {
    ...item,
    year: currentYear || undefined,
    itemDetails: JSON.stringify(details),
  } as T & { year?: string; itemDetails: string };
}
