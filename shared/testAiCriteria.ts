export function resolveTestAiManufacturer(itemDetails: unknown): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';

  const details = itemDetails as Record<string, unknown>;
  const manufacturer = typeof details.manufacturer === 'string' ? details.manufacturer.trim() : '';
  const customManufacturer = typeof details.customManufacturer === 'string' ? details.customManufacturer.trim() : '';

  return manufacturer.toLowerCase() === 'other' ? customManufacturer : manufacturer;
}

export function resolveTestAiGradingCompany(itemDetails: unknown, fallback = ''): string {
  const details = parseTestAiDetails(itemDetails);
  const direct = fallback.trim() || detailText(details, ['gradingCompany', 'certificationCompany']);
  if (direct && direct.toLowerCase() !== 'other') return direct;
  return detailText(details, ['customGradingCompany', 'customCertificationCompany']) || direct;
}

export function normalizeTestAiGrade(value: unknown, gradingCompany = ''): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^(?:raw|ungraded|n\/a|none|null|undefined)$/i.test(raw)) return '';
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return raw;
  if (numeric <= 0) return '';
  if (gradingCompany.trim().toUpperCase() === 'PSA') return String(Math.round(numeric));
  return raw.includes('.') ? numeric.toFixed(1) : String(numeric);
}

export type TestAiRequestAudit = {
  kind: 'search' | 'certificate' | 'locator' | 'feed' | 'catalog';
  criteria: Array<{ label: string; value: string }>;
  executed: Array<{ label: string; query?: string; parameters?: Record<string, string | number | boolean>; used?: boolean }>;
  fallbackUsed?: boolean;
};

export function parseTestAiDetails(itemDetails: unknown): Record<string, unknown> {
  if (itemDetails && typeof itemDetails === 'object' && !Array.isArray(itemDetails)) return itemDetails as Record<string, unknown>;
  if (typeof itemDetails !== 'string' || !itemDetails.trim()) return {};
  try {
    const parsed = JSON.parse(itemDetails);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function detailText(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return '';
}

/** Builds an ordered, title-independent identity term list for request previews and adapters. */
export function buildStructuredItemQuery(category: string, itemDetails: unknown, extra: Array<string | null | undefined> = [], itemType = ''): string {
  const details = parseTestAiDetails(itemDetails);
  const normalizedCategory = category.trim().toLowerCase().replace(/[- ]+/g, '_');
  const unopenedProduct = normalizedCategory === 'sports_cards' && isSportsCardsUnopenedProduct(details, itemType);
  const keys = normalizedCategory === 'sports_cards'
    ? ['year', 'manufacturer', 'player', 'athlete', 'cardNumber', 'setName', 'cardSet', 'parallel', 'variant']
    : normalizedCategory === 'pokemon'
      ? ['cardName', 'pokemonName', 'name', 'cardNumber', 'cardNo', 'number', 'setName', 'set', 'cardSet', 'variant', 'printing', 'language']
      : normalizedCategory === 'comics'
        ? ['comicTitle', 'series', 'title', 'issueNumber', 'issueNo', 'issue', 'year', 'publisher', 'variant']
        : normalizedCategory === 'music'
          ? ['releaseTitle', 'album', 'artist', 'performer', 'releaseYear', 'catalogNumber']
          : normalizedCategory === 'video_games'
            ? ['gameTitle', 'videoGameTitle', 'title', 'releaseYear', 'year', 'platform', 'console', 'system', 'upc', 'barcode']
        : normalizedCategory === 'vintage_toys'
          ? ['brand', 'manufacturer', 'line', 'franchise', 'toyName', 'toyNameCharacter', 'vehicleName', 'playsetName', 'gamePuzzleName', 'modelKitName', 'setNumber', 'theme', 'toyForm', 'objectType', 'productType', 'version', 'variant', 'year']
        : normalizedCategory === 'coins'
          ? ['year', 'denomination', 'series', 'coinSeries', 'name', 'subject', 'mintMark', 'mint', 'country', 'variety', 'designation']
        : normalizedCategory === 'stamps'
              ? ['catalogNumber', 'scottNumber', 'denomination', 'year', 'country', 'catalog', 'series']
              : ['subject', 'name', 'year', 'setName', 'series', 'catalogNumber', 'issueNumber'];
  const gradingCompany = resolveTestAiGradingCompany(details);
  const manufacturer = normalizedCategory === 'sports_cards' ? resolveTestAiManufacturer(details) : '';
  const baseValues = unopenedProduct
    ? [detailText(details, ['year']), manufacturer, ...buildSportsCardsUnopenedProductCriteria(details)]
    : keys.map((key) => key === 'manufacturer' ? manufacturer : detailText(details, [key]));
  const extraValues = unopenedProduct ? [] : extra.map((value) => {
    const normalized = String(value ?? '').trim();
    if (/^\d+(?:\.\d+)?$/.test(normalized)) return normalizeTestAiGrade(normalized, gradingCompany);
    return normalized.toLowerCase() === 'other' && gradingCompany ? gradingCompany : normalized;
  });
  return [...baseValues, unopenedProduct ? '' : gradingCompany, ...extraValues]
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(' ')
    .slice(0, 240)
    .trim();
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
  if (isYes(details.authentication) || isYes(details.authenticated) || isYes(details.isAuthenticated)) {
    const authCompany = value('authenticationCompany') || value('customAuthenticationCompany');
    if (authCompany) parts.push(authCompany);
  }
  if (isYes(details.fromASealedCase) || isYes(details.fromSealedCase)) parts.push('FASC');
  return parts.filter(Boolean);
}

export function buildSportsCardTestAiCriteria(itemDetails: unknown, itemType = ''): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';
  const details = itemDetails as Record<string, unknown>;
  const value = (key: string) => typeof details[key] === 'string' ? details[key].trim() : '';
  const unopened = buildSportsCardsUnopenedProductCriteria(details, itemType);

  const identity = unopened.length
    ? [value('year'), resolveTestAiManufacturer(details)]
    : [value('year'), resolveTestAiManufacturer(details), value('player'), value('cardNumber')];
  return [...identity, ...unopened]
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
  const candidateParts: string[][] = unopened.length ? [
    [year, manufacturer, ...unopened],
    [manufacturer, ...unopened],
  ] : [
    [year, manufacturer, player, cardNumber, normalizedCert, normalizedGrade],
    [year, manufacturer, player, normalizedCert, normalizedGrade],
    [manufacturer, player, normalizedCert, normalizedGrade],
    [fallbackTitle],
  ];
  const candidates = candidateParts.map((parts) => parts.filter(Boolean).join(' ').trim());
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
  // Release, manufacture, regional, and reissue dates are too variable to
  // erase a candidate at retrieval time. The comparable engine can record a
  // stated difference as context/review where the category makes it material.
  return listings;
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
