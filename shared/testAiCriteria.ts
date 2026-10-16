export function resolveTestAiManufacturer(itemDetails: unknown): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';

  const details = itemDetails as Record<string, unknown>;
  return resolveTestAiDetailValue(details, 'manufacturer');
}

export function resolveTestAiGradingCompany(itemDetails: unknown, fallback = ''): string {
  const details = parseTestAiDetails(itemDetails);
  const direct = fallback.trim() || detailText(details, ['gradingCompany', 'certificationCompany']);
  if (direct && direct.toLowerCase() !== 'other') return direct;
  return detailText(details, ['customGradingCompany', 'customCertificationCompany']);
}

export function normalizeTestAiGrade(value: unknown, gradingCompany = '', category = ''): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^(?:raw|ungraded|n\/a|none|null|undefined)$/i.test(raw)) return '';
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return raw;
  if (numeric <= 0) return '';
  const normalizedCategory = category.trim().toLowerCase().replace(/[- ]+/g, '_');
  if (gradingCompany.trim().toUpperCase() === 'PSA' && normalizedCategory !== 'video_games') return String(Math.round(numeric));
  return raw.includes('.') ? numeric.toFixed(1) : String(numeric);
}

export type TestAiRequestAudit = {
  kind: 'search' | 'certificate' | 'locator' | 'feed' | 'catalog';
  criteria: Array<{ label: string; value: string }>;
  executed: Array<{ label: string; query?: string; parameters?: Record<string, string | number | boolean>; used?: boolean }>;
  fallbackUsed?: boolean;
};

export function parseTestAiDetails(itemDetails: unknown): Record<string, any> {
  if (itemDetails && typeof itemDetails === 'object' && !Array.isArray(itemDetails)) return normalizeTestAiOtherDetails(itemDetails as Record<string, unknown>);
  if (typeof itemDetails !== 'string' || !itemDetails.trim()) return {};
  try {
    const parsed = JSON.parse(itemDetails);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? normalizeTestAiOtherDetails(parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Treat the shared “Other” option as a UI selector, never as item identity.
 * Dynamic listing forms persist its companion value using the stable
 * `custom<FieldName>` convention (for example `customPlatform`). If the
 * companion is absent, omit the field rather than inventing a search term.
 */
export function resolveTestAiDetailValue(details: Record<string, unknown>, key: string): string {
  const value = details[key];
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const text = String(value).trim();
  if (!text) return '';
  if (text.toLowerCase() !== 'other') return text;

  const customKey = `custom${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const customValue = details[customKey];
  if (typeof customValue !== 'string' && typeof customValue !== 'number') return '';
  const customText = String(customValue).trim();
  return customText && customText.toLowerCase() !== 'other' ? customText : '';
}

/** Resolves all persisted dropdown selectors before any source-specific query builder reads them. */
export function normalizeTestAiOtherDetails(details: Record<string, unknown>): Record<string, any> {
  const normalized = { ...details };
  for (const [key, value] of Object.entries(details)) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    if (String(value).trim().toLowerCase() !== 'other') continue;
    const customValue = resolveTestAiDetailValue(details, key);
    if (customValue) normalized[key] = customValue;
    else delete normalized[key];
  }
  return normalized;
}

function detailText(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const text = resolveTestAiDetailValue(details, key);
    if (text) return text;
  }
  return '';
}

function cautiousMatrixRunout(details: Record<string, unknown>): string {
  const value = detailText(details, ['pressingDetails', 'matrixRunout', 'runout']);
  // Only promote structured matrix/runout identifiers, not free-form notes.
  return /(?:\b(?:matrix|runout|deadwax)\b|\b[A-Z0-9]{2,}(?:[-/][A-Z0-9]{2,}){1,}\b)/i.test(value) ? value : '';
}

/** Builds an ordered, title-independent identity term list for request previews and adapters. */
export function buildStructuredItemQuery(category: string, itemDetails: unknown, extra: Array<string | null | undefined> = [], itemType = ''): string {
  const details = parseTestAiDetails(itemDetails);
  const normalizedCategory = category.trim().toLowerCase().replace(/[- ]+/g, '_');
  const unopenedProduct = normalizedCategory === 'sports_cards' && isSportsCardsUnopenedProduct(details, itemType);
  const keys = normalizedCategory === 'sports_cards'
    ? ['year', 'manufacturer', 'player', 'athlete', 'cardNumber', 'setName', 'cardSet', 'parallel', 'parallelVariation', 'variant']
    : normalizedCategory === 'pokemon'
      ? ['cardName', 'pokemonName', 'name', 'cardNumber', 'cardNo', 'number', 'setName', 'set', 'cardSet', 'variant', 'printing', 'language']
      : normalizedCategory === 'comics'
        ? ['comicTitle', 'series', 'title', 'issueNumber', 'issueNo', 'issue', 'year', 'publisher', 'variant']
      : normalizedCategory === 'music'
          ? ['releaseTitle', 'album', 'artist', 'performer', 'releaseYear', 'catalogNumber', 'pressingDetails']
          : normalizedCategory === 'video_games'
            ? ['gameTitle', 'videoGameTitle', 'title', 'releaseYear', 'year', 'platform', 'console', 'system', 'upc', 'barcode', 'ean', 'gtin']
        : normalizedCategory === 'vintage_toys'
          ? ['brand', 'manufacturer', 'line', 'franchise', 'toyName', 'toyNameCharacter', 'vehicleName', 'playsetName', 'gamePuzzleName', 'modelKitName', 'setNumber', 'theme', 'toyForm', 'objectType', 'productType', 'version', 'variant', 'year']
        : normalizedCategory === 'coins'
          ? ['year', 'denomination', 'series', 'coinSeries', 'name', 'subject', 'mintMark', 'mint', 'country', 'variety', 'designation']
        : normalizedCategory === 'stamps'
              ? ['catalogNumber', 'scottNumber', 'denomination', 'year', 'country', 'catalog', 'series', 'perforation', 'watermark', 'overprintSurcharge']
              : ['subject', 'name', 'year', 'setName', 'series', 'catalogNumber', 'issueNumber'];
  const gradingCompany = resolveTestAiGradingCompany(details);
  const manufacturer = normalizedCategory === 'sports_cards' ? resolveTestAiManufacturer(details) : '';
  const baseValues = unopenedProduct
    ? [detailText(details, ['year']), manufacturer, ...buildSportsCardsUnopenedProductCriteria(details)]
    : keys.map((key) => key === 'manufacturer' ? manufacturer : key === 'pressingDetails' ? cautiousMatrixRunout(details) : detailText(details, [key]));
  const extraValues = unopenedProduct ? [] : extra.map((value) => {
    const normalized = String(value ?? '').trim();
    if (/^\d+(?:\.\d+)?$/.test(normalized)) return normalizeTestAiGrade(normalized, gradingCompany, normalizedCategory);
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
  const value = (key: string) => resolveTestAiDetailValue(details, key);
  const sport = value('sport');
  const parts = [sport, value('productFormat')];
  if (isYes(details.authentication) || isYes(details.authenticated) || isYes(details.isAuthenticated)) {
    const authCompany = value('authenticationCompany');
    if (authCompany) parts.push(authCompany);
  }
  if (isYes(details.fromASealedCase) || isYes(details.fromSealedCase)) parts.push('FASC');
  return parts.filter(Boolean);
}

export function buildSportsCardTestAiCriteria(itemDetails: unknown, itemType = ''): string {
  if (!itemDetails || typeof itemDetails !== 'object' || Array.isArray(itemDetails)) return '';
  const details = itemDetails as Record<string, unknown>;
  const value = (key: string) => resolveTestAiDetailValue(details, key);
  const unopened = buildSportsCardsUnopenedProductCriteria(details, itemType);
  const normalizedType = itemType.trim().toLowerCase().replace(/[ -]+/g, '_');
  const setName = value('setName') || value('cardSet') || value('set');
  const sport = value('sport') || value('customSport');

  const identity = unopened.length
    ? [value('year'), resolveTestAiManufacturer(details)]
    : normalizedType === 'set' || normalizedType.endsWith('_set')
      ? [value('year'), resolveTestAiManufacturer(details), sport, setName]
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
  const value = (key: string) => resolveTestAiDetailValue(details, key);
  const year = value('year');
  const manufacturer = resolveTestAiManufacturer(details);
  const player = value('player');
  const cardNumber = value('cardNumber');
  const normalizedCert = certificationCompany.trim();
  const normalizedGrade = grade.trim();
  const unopened = buildSportsCardsUnopenedProductCriteria(details, itemType);
  const normalizedType = itemType.trim().toLowerCase().replace(/[ -]+/g, '_');
  const isSet = normalizedType === 'set' || normalizedType.endsWith('_set');
  const sport = value('sport') || value('customSport');
  const setName = value('setName') || value('cardSet') || value('set');
  const candidateParts: string[][] = unopened.length ? [
    [year, manufacturer, ...unopened],
    [manufacturer, ...unopened],
  ] : isSet ? [
    [year, manufacturer, sport, setName, normalizedCert, normalizedGrade],
    [year, manufacturer, sport, setName],
    [manufacturer, sport, setName],
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
  const value = (key: string) => resolveTestAiDetailValue(details, key);

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
