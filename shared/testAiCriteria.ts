export function resolveTestAiManufacturer(itemDetails: unknown): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';

  const details = itemDetails as Record<string, unknown>;
  const manufacturer = typeof details.manufacturer === 'string' ? details.manufacturer.trim() : '';
  const customManufacturer = typeof details.customManufacturer === 'string' ? details.customManufacturer.trim() : '';

  return manufacturer.toLowerCase() === 'other' ? customManufacturer : manufacturer;
}

function isYes(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'yes';
}

function isSportsCardsUnopenedProduct(details: Record<string, unknown>, itemType = ''): boolean {
  const normalizedType = itemType.trim().toLowerCase().replace(/[ -]+/g, '_');
  return normalizedType === 'unopened_product' || typeof details.productName === 'string' || typeof details.productFormat === 'string';
}

function buildSportsCardsUnopenedProductCriteria(details: Record<string, unknown>, itemType = ''): string[] {
  if (!isSportsCardsUnopenedProduct(details, itemType)) return [];
  const value = (key: string) => typeof details[key] === 'string' ? details[key].trim() : '';
  const sport = value('sport') || value('customSport');
  const parts = [sport, value('productFormat')];
  if (isYes(details.authenticated) || isYes(details.isGraded) || isYes(details.graded)) {
    const authCompany = value('authenticationCompany') || value('customAuthenticationCompany');
    if (authCompany) parts.push(authCompany);
  }
  if (isYes(details.fromASealedCase)) parts.push('FASC');
  return parts.filter(Boolean);
}

export function buildSportsCardTestAiCriteria(itemDetails: unknown, itemType = ''): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';
  const details = itemDetails as Record<string, unknown>;
  const value = (key: string) => typeof details[key] === 'string' ? details[key].trim() : '';
  const unopened = buildSportsCardsUnopenedProductCriteria(details, itemType);

  return [...[value('year'), resolveTestAiManufacturer(details), value('player'), value('cardNumber')], ...unopened]
    .filter(Boolean)
    .join(' ');
}

/**
 * Build a small, ordered set of eBay queries for sports cards. The detailed
 * query is preferred, but eBay can be overly strict when a card number or
 * year is represented differently in a listing title. The user-facing title
 * and a broader identity query provide safe read-only fallbacks.
 */
export function buildSportsCardTestAiQueries(
  itemDetails: unknown,
  fallbackTitle: string,
  certificationCompany = '',
  grade = '',
  itemType = '',
): string[] {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) {
    return [fallbackTitle].filter(Boolean);
  }
  const details = itemDetails as Record<string, unknown>;
  const value = (key: string) => typeof details[key] === 'string' ? details[key].trim() : '';
  const year = value('year');
  const manufacturer = resolveTestAiManufacturer(details);
  const player = value('player');
  const cardNumber = value('cardNumber');
  const normalizedCert = certificationCompany.trim();
  const normalizedGrade = grade.trim();
  const unopened = buildSportsCardsUnopenedProductCriteria(details, itemType);
  const candidates = [
    [year, manufacturer, player, cardNumber, ...unopened, normalizedCert, normalizedGrade],
    [year, manufacturer, player, ...unopened, normalizedCert, normalizedGrade],
    [manufacturer, player, ...unopened, normalizedCert, normalizedGrade],
    [fallbackTitle],
  ].map((parts) => parts.filter(Boolean).join(' ').trim());
  return [...new Set(candidates)].filter(Boolean);
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

function normalizeSport(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const SPORT_TOKENS: Record<string, string[]> = {
  baseball: ['baseball', 'mlb'],
  basketball: ['basketball', 'nba'],
  football: ['football', 'nfl', 'afl'],
  hockey: ['hockey', 'nhl'],
  soccer: ['soccer', 'fifa'],
  golf: ['golf', 'pga'],
  tennis: ['tennis', 'atp', 'wta'],
  wrestling: ['wrestling', 'wwe', 'wwf', 'wcw'],
  boxing: ['boxing'],
  mma: ['mma', 'ufc'],
  racing: ['racing', 'nascar', 'formula 1', 'f1'],
};

function listingMentionsSport(title: string, sport: string): boolean {
  const normalizedTitle = ` ${normalizeSport(title)} `;
  const tokens = SPORT_TOKENS[normalizeSport(sport)] ?? [normalizeSport(sport)];
  return tokens.some((token) => normalizedTitle.includes(` ${token} `));
}

function listingMentionsAnyKnownSport(title: string): boolean {
  return Object.values(SPORT_TOKENS).flat().some((token) => ` ${normalizeSport(title)} `.includes(` ${token} `));
}

/**
 * Keep listings that match the target sport or do not state a sport at all.
 * Exclude only explicit conflicting sport labels so abbreviated or sparse
 * marketplace titles are not discarded solely because they omit the sport.
 */
export function filterTestAiListingsBySport<T extends { title?: string }>(listings: T[], targetSport: string): T[] {
  const normalizedTarget = normalizeSport(targetSport);
  if (!normalizedTarget) return listings;

  return listings.filter((listing) => {
    const title = listing.title || '';
    if (listingMentionsSport(title, normalizedTarget)) return true;
    return !listingMentionsAnyKnownSport(title);
  });
}
