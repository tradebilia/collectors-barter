export function resolveTestAiManufacturer(itemDetails: unknown): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';

  const details = itemDetails as Record<string, unknown>;
  const manufacturer = typeof details.manufacturer === 'string' ? details.manufacturer.trim() : '';
  const customManufacturer = typeof details.customManufacturer === 'string' ? details.customManufacturer.trim() : '';

  return manufacturer.toLowerCase() === 'other' ? customManufacturer : manufacturer;
}

export function buildSportsCardTestAiCriteria(itemDetails: unknown): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';
  const details = itemDetails as Record<string, unknown>;
  const value = (key: string) => typeof details[key] === 'string' ? details[key].trim() : '';

  return [value('year'), resolveTestAiManufacturer(details), value('player'), value('cardNumber')]
    .filter(Boolean)
    .join(' ');
}

export function resolveTestAiYear(itemDetails: unknown): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';
  const details = itemDetails as Record<string, unknown>;
  const rawCandidate = [details.year, details.releaseYear, details.manufactureYear]
    .find((value) => typeof value === 'string' || typeof value === 'number');
  const candidate = rawCandidate === undefined ? '' : String(rawCandidate).trim();

  return /^(?:18|19|20)\d{2}$/.test(candidate) ? candidate : '';
}

export function buildVideoGameTestAiCriteria(itemDetails: unknown, fallbackTitle: string): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return fallbackTitle;
  const details = itemDetails as Record<string, unknown>;
  const value = (key: string) => typeof details[key] === 'string' ? details[key].trim() : '';

  return [resolveTestAiYear(details), value('gameTitle') || fallbackTitle, value('platform')]
    .filter(Boolean)
    .join(' ');
}

export function filterTestAiListingsByYear<T extends { title?: string }>(listings: T[], targetYear: string): T[] {
  if (!targetYear) return listings;

  return listings.filter((listing) => {
    const title = listing.title || '';
    const years: string[] = title.match(/\b(?:18|19|20)\d{2}\b/g) ?? [];
    return years.length === 0 || years.includes(targetYear);
  });
}
