export type EvidenceSourceStatus = 'success' | 'not_found' | 'error' | 'idle';

export type EvidenceSourceKind = 'market_current' | 'market_completed' | 'market_historical' | 'certification' | 'reference';

export type EvidenceSourceObservation = {
  id: string;
  label: string;
  kind: EvidenceSourceKind;
  status: EvidenceSourceStatus;
  fields?: Record<string, unknown>;
  market?: {
    currentListingCount?: number;
    completedSaleCount?: number;
    recentSaleCount?: number;
    historicalSaleCount?: number;
    undatedSaleCount?: number;
  };
  message?: string | null;
};

export type EvidenceListingInput = {
  title: string;
  category: string;
  grade?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | Record<string, unknown> | null;
};

export type NormalizedIdentityField = {
  key: string;
  label: string;
  value: string;
};

export type EvidenceReviewFlag = {
  kind: 'material' | 'context' | 'coverage';
  sourceId?: string;
  sourceLabel?: string;
  field?: string;
  message: string;
};

export type NormalizedEvidenceSummary = {
  category: string;
  identity: NormalizedIdentityField[];
  alignedSources: { id: string; label: string; fields: string[] }[];
  reviewFlags: EvidenceReviewFlag[];
  marketEvidence: string[];
  sources: { id: string; label: string; kind: EvidenceSourceKind; status: EvidenceSourceStatus; message?: string | null }[];
};

type DetailRecord = Record<string, unknown>;

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  player: 'Player',
  cardName: 'Card name',
  set: 'Set',
  cardNumber: 'Card #',
  variant: 'Variant',
  year: 'Year',
  releaseYear: 'Listing year',
  globalReleaseYear: 'Global release year',
  manufacturer: 'Manufacturer',
  certificationCompany: 'Grader',
  grade: 'Grade',
  country: 'Country',
  denomination: 'Denomination',
  mintMark: 'Mint mark',
  variety: 'Variety',
  series: 'Series',
  issueNumber: 'Issue #',
  publisher: 'Publisher',
  platform: 'Platform',
  edition: 'Edition',
  format: 'Format',
  signer: 'Signer',
  signedItemType: 'Signed item',
  authenticationCompany: 'Authentication company',
  certificate: 'Certificate',
  character: 'Character',
  pinName: 'Pin name',
  editionSize: 'Edition size',
  pinNumber: 'Pin #',
  brand: 'Brand',
  line: 'Line',
  toyName: 'Toy name',
  version: 'Version',
  catalogNumber: 'Catalog #',
  issueYear: 'Issue year',
};

const CATEGORY_FIELDS: Record<string, string[]> = {
  sports_cards: ['player', 'year', 'manufacturer', 'cardNumber', 'certificationCompany', 'grade'],
  pokemon: ['cardName', 'set', 'cardNumber', 'variant', 'year', 'certificationCompany', 'grade'],
  coins: ['country', 'denomination', 'year', 'mintMark', 'variety', 'certificationCompany', 'grade'],
  comics: ['series', 'issueNumber', 'variant', 'publisher', 'certificationCompany', 'grade'],
  video_games: ['title', 'platform', 'edition', 'releaseYear', 'certificationCompany', 'grade'],
  stamps: ['country', 'catalogNumber', 'denomination', 'issueYear', 'certificationCompany', 'grade'],
  movies: ['title', 'format', 'releaseYear', 'edition', 'certificationCompany', 'grade'],
  autographs: ['signer', 'signedItemType', 'authenticationCompany', 'certificate'],
  disney_pins: ['character', 'pinName', 'series', 'editionSize', 'pinNumber'],
  vintage_toys: ['brand', 'line', 'toyName', 'year', 'version', 'grade'],
};

const MATERIAL_FIELDS: Record<string, string[]> = {
  sports_cards: ['player', 'year', 'manufacturer', 'cardNumber', 'certificationCompany', 'grade'],
  pokemon: ['cardName', 'set', 'cardNumber', 'variant', 'certificationCompany', 'grade'],
  coins: ['denomination', 'year', 'mintMark', 'variety', 'certificationCompany', 'grade'],
  comics: ['series', 'issueNumber', 'variant', 'certificationCompany', 'grade'],
  video_games: ['title', 'platform', 'edition'],
  stamps: ['catalogNumber', 'denomination', 'issueYear', 'grade'],
  movies: ['title', 'format', 'edition', 'grade'],
  autographs: ['signer', 'signedItemType', 'authenticationCompany', 'certificate'],
  disney_pins: ['character', 'pinName', 'series', 'editionSize', 'pinNumber'],
  vintage_toys: ['brand', 'toyName', 'year', 'version', 'grade'],
};

function normalizeCategory(category: string): string {
  return category.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function parseDetails(value: EvidenceListingInput['itemDetails']): DetailRecord {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as DetailRecord : {};
  } catch {
    return {};
  }
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
  return String(value).trim();
}

function firstText(details: DetailRecord, keys: string[]): string {
  for (const key of keys) {
    const candidate = text(details[key]);
    if (candidate) return candidate;
  }
  return '';
}

function normalized(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function equivalent(left: string, right: string): boolean {
  return normalized(left) === normalized(right);
}

function platformIncludes(platforms: string, platform: string): boolean {
  const expected = normalized(platform);
  const aliases: Record<string, string[]> = {
    nes: ['nintendo entertainment system'],
    snes: ['super nintendo entertainment system', 'super nintendo'],
    n64: ['nintendo 64'],
    gb: ['game boy'],
    gba: ['game boy advance'],
    ds: ['nintendo ds'],
    '3ds': ['nintendo 3ds'],
    ps1: ['playstation'],
    ps2: ['playstation 2'],
    ps3: ['playstation 3'],
    ps4: ['playstation 4'],
    ps5: ['playstation 5'],
    xbox: ['xbox original'],
    'xbox 360': ['xbox360'],
    'xbox one': ['xboxone'],
  };
  const equivalentNames = new Set([expected, ...(aliases[expected] ?? [])]);
  return platforms
    .split(/[,/;|]/)
    .map((entry) => normalized(entry))
    .some((entry) => equivalentNames.has(entry) || (aliases[entry] ?? []).includes(expected));
}

function displayCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getListingValues(input: EvidenceListingInput): Record<string, string> {
  const details = parseDetails(input.itemDetails);
  const category = normalizeCategory(input.category);
  const base: Record<string, string> = {
    title: text(input.title),
    grade: text(input.grade),
    certificationCompany: text(input.certificationCompany),
  };

  const mappings: Record<string, string[]> = {
    player: ['player', 'athlete', 'subject'],
    cardName: ['cardName', 'pokemonName', 'name'],
    set: ['setName', 'set', 'cardSet'],
    cardNumber: ['cardNumber', 'cardNo', 'number'],
    variant: ['variant', 'variation', 'editionEra'],
    year: ['year', 'manufactureYear'],
    releaseYear: ['releaseYear', 'year', 'release_date_year'],
    manufacturer: ['customManufacturer', 'manufacturer', 'brand'],
    country: ['country', 'issuingCountry'],
    denomination: ['denomination', 'faceValue'],
    mintMark: ['mintMark', 'mint'],
    variety: ['variety', 'varietyName'],
    series: ['comicTitle', 'series', 'title'],
    issueNumber: ['issueNumber', 'issue', 'number'],
    publisher: ['publisher'],
    platform: ['platform', 'console', 'system'],
    edition: ['edition', 'version', 'releaseType'],
    format: ['customFormat', 'format', 'mediaFormat'],
    signer: ['signer'],
    signedItemType: ['signedItemType', 'itemType'],
    authenticationCompany: ['customAuthenticationCompany', 'authenticationCompany'],
    certificate: ['certificateNumber', 'certNumber', 'authenticationNumber'],
    character: ['character'],
    pinName: ['pinName', 'name'],
    editionSize: ['editionSize'],
    pinNumber: ['pinNumber'],
    brand: ['brand', 'manufacturer'],
    line: ['line', 'franchise', 'toyLine'],
    toyName: ['toyName', 'name'],
    version: ['version', 'variant'],
    catalogNumber: ['scottNumber', 'catalogNumber'],
    issueYear: ['year', 'issueYear'],
  };

  for (const [key, candidates] of Object.entries(mappings)) {
    const value = firstText(details, candidates);
    if (value) base[key] = value;
  }

  const listedManufacturer = firstText(details, ['manufacturer']);
  if (listedManufacturer) {
    base.manufacturer = normalized(listedManufacturer) === 'other'
      ? firstText(details, ['customManufacturer'])
      : listedManufacturer;
  }
  const listedFormat = firstText(details, ['format']);
  if (listedFormat) {
    base.format = normalized(listedFormat) === 'other'
      ? firstText(details, ['customFormat'])
      : listedFormat;
  }
  const listedAuthenticationCompany = firstText(details, ['authenticationCompany']);
  if (listedAuthenticationCompany) {
    base.authenticationCompany = normalized(listedAuthenticationCompany) === 'other'
      ? firstText(details, ['customAuthenticationCompany'])
      : listedAuthenticationCompany;
  }
  const listedCertificationCompany = text(input.certificationCompany);
  if (listedCertificationCompany) {
    base.certificationCompany = normalized(listedCertificationCompany) === 'other'
      ? firstText(details, ['customGradingCompany'])
      : listedCertificationCompany;
  }

  if (category === 'pokemon' && !base.cardName) base.cardName = base.title;
  if (category === 'video_games' && !base.title) base.title = firstText(details, ['gameTitle', 'videoGameTitle', 'title']);
  return base;
}

function compactMarketSummary(source: EvidenceSourceObservation): string | null {
  if (source.status !== 'success' || !source.market) return null;
  const market = source.market;
  const parts: string[] = [];
  if (market.currentListingCount) parts.push(`${market.currentListingCount} current asking listing${market.currentListingCount === 1 ? '' : 's'}`);
  if (market.completedSaleCount) parts.push(`${market.completedSaleCount} completed sale${market.completedSaleCount === 1 ? '' : 's'}`);
  if (market.recentSaleCount) parts.push(`${market.recentSaleCount} recent sale${market.recentSaleCount === 1 ? '' : 's'}`);
  if (market.historicalSaleCount) parts.push(`${market.historicalSaleCount} historical record${market.historicalSaleCount === 1 ? '' : 's'}`);
  if (market.undatedSaleCount) parts.push(`${market.undatedSaleCount} undated record${market.undatedSaleCount === 1 ? '' : 's'}`);
  return parts.length ? `${source.label}: ${parts.join(', ')}.` : null;
}

export function normalizeTestAiEvidence(input: EvidenceListingInput, sources: EvidenceSourceObservation[]): NormalizedEvidenceSummary {
  const category = normalizeCategory(input.category);
  const listingValues = getListingValues(input);
  const identity = (CATEGORY_FIELDS[category] ?? ['title', 'certificationCompany', 'grade'])
    .map((key) => ({ key, label: FIELD_LABELS[key] ?? key, value: listingValues[key] ?? '' }))
    .filter((field) => field.value);
  const reviewFlags: EvidenceReviewFlag[] = [];
  const alignedSources: NormalizedEvidenceSummary['alignedSources'] = [];
  const materialFields = MATERIAL_FIELDS[category] ?? ['title', 'certificationCompany', 'grade'];

  for (const source of sources) {
    if (source.status === 'error') {
      reviewFlags.push({ kind: 'coverage', sourceId: source.id, sourceLabel: source.label, message: `${source.label} could not be checked${source.message ? `: ${source.message}` : '.'}` });
      continue;
    }
    if (source.status === 'not_found') {
      reviewFlags.push({ kind: 'coverage', sourceId: source.id, sourceLabel: source.label, message: `${source.label} returned no record for the selected lookup.` });
      continue;
    }
    if (source.status !== 'success' || !source.fields) continue;

    const alignedFields: string[] = [];
    for (const key of materialFields) {
      const listingValue = listingValues[key];
      const sourceValue = text(source.fields[key]);
      if (!listingValue || !sourceValue) continue;
      if (key === 'platform') {
        if (platformIncludes(sourceValue, listingValue)) alignedFields.push(FIELD_LABELS[key]);
        else reviewFlags.push({ kind: 'material', sourceId: source.id, sourceLabel: source.label, field: FIELD_LABELS[key], message: `${source.label} does not list the selected ${FIELD_LABELS[key].toLowerCase()} “${listingValue}”. Review platform and edition before comparing market data.` });
      } else if (equivalent(listingValue, sourceValue)) {
        alignedFields.push(FIELD_LABELS[key] ?? key);
      } else {
        reviewFlags.push({ kind: 'material', sourceId: source.id, sourceLabel: source.label, field: FIELD_LABELS[key] ?? key, message: `${source.label} reports ${FIELD_LABELS[key] ?? key} “${sourceValue}” while the listing records “${listingValue}”. Review before treating records as comparable.` });
      }
    }

    const globalReleaseYear = text(source.fields.globalReleaseYear);
    if (globalReleaseYear && listingValues.releaseYear && !equivalent(globalReleaseYear, listingValues.releaseYear)) {
      reviewFlags.push({ kind: 'context', sourceId: source.id, sourceLabel: source.label, field: 'Release year', message: `${source.label} records a global first-release year of ${globalReleaseYear}; the listing records ${listingValues.releaseYear}. This may be a regional-release difference and is not resolved automatically.` });
    }
    if (alignedFields.length) alignedSources.push({ id: source.id, label: source.label, fields: alignedFields });
  }

  const marketEvidence = sources.map(compactMarketSummary).filter((entry): entry is string => Boolean(entry));
  return {
    category: displayCategory(category),
    identity,
    alignedSources,
    reviewFlags,
    marketEvidence,
    sources: sources.map(({ id, label, kind, status, message }) => ({ id, label, kind, status, message })),
  };
}

export function formatTestAiEvidenceForAnalysis(summary: NormalizedEvidenceSummary | null | undefined, itemLabel: string): string {
  if (!summary) return `${itemLabel}: No deterministic evidence review is available.`;
  const identity = summary.identity.map((field) => `${field.label}=${field.value}`).join(' | ') || 'No listing identity fields supplied';
  const aligned = summary.alignedSources.length
    ? summary.alignedSources.map((source) => `${source.label}: ${source.fields.join(', ')}`).join('; ')
    : 'No specialist field alignment established.';
  const market = summary.marketEvidence.length ? summary.marketEvidence.join(' ') : 'No classified market evidence returned.';
  const flags = summary.reviewFlags.length ? summary.reviewFlags.map((flag) => flag.message).join(' ') : 'No material identity discrepancy was detected from the selected source fields.';
  return `${itemLabel} deterministic evidence review:
Listing identity: ${identity}
Aligned specialist fields: ${aligned}
Market evidence classification: ${market}
Review flags: ${flags}
Rule: This review is source-attributed context only. Do not resolve a discrepancy silently, do not use factual reference metadata as value, and do not use historical or undated records as current-value averages.`;
}
