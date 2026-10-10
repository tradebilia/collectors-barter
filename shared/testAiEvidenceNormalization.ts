import {
  buildP0EvidenceSufficiency,
  buildTestAiP0Identity,
  evidenceRoleForSourceKind,
  type EvidenceSourceRole,
  type P0EvidenceSufficiency,
  type TestAiP0Identity,
} from './testAiP0Evidence';

export type EvidenceSourceStatus = 'success' | 'not_found' | 'error' | 'idle';

export type EvidenceSourceKind = 'market_current' | 'market_completed' | 'market_historical' | 'certification' | 'reference';

export type EvidenceSourceObservation = {
  id: string;
  label: string;
  kind: EvidenceSourceKind;
  /** Used only where a mixed source returns both completed and contextual records. */
  role?: EvidenceSourceRole;
  status: EvidenceSourceStatus;
  fields?: Record<string, unknown>;
  market?: {
    currentListingCount?: number;
    completedSaleCount?: number;
    analyzerSubmittedSaleCount?: number;
    analyzerSubmittedPrices?: number[];
    currentValueSaleCount?: number;
    historicalTrendSaleCount?: number;
    currentValuePrices?: number[];
    historicalTrendPrices?: number[];
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
  identityReadiness: TestAiP0Identity;
  evidenceSufficiency: P0EvidenceSufficiency;
  alignedSources: { id: string; label: string; fields: string[] }[];
  reviewFlags: EvidenceReviewFlag[];
  marketEvidence: string[];
  marketEvidencePriceSummaries?: string[];
  selectedSourceSummaries?: string[];
  sourceDecisions?: EvidenceSourceDecision[];
  guideAnchors: GuideValueAnchor[];
  sources: { id: string; label: string; kind: EvidenceSourceKind; role: EvidenceSourceRole; status: EvidenceSourceStatus; message?: string | null }[];
};

export type EvidenceSourceDecision = {
  id: string;
  label: string;
  status: EvidenceSourceStatus;
  kind: EvidenceSourceKind;
  completed: number;
  accepted: number;
  currentValue: number;
  historicalTrend: number;
  context: number;
  acceptedPrices: number[];
  message?: string | null;
};

export type GuideValueAnchor = {
  sourceId: string;
  sourceLabel: string;
  grade: string;
  selectedGrade?: string;
  matchType?: 'exact' | 'mapped';
  value: number;
  recordedSales: number | null;
  lastSaleDate: string | null;
  totalRecordedSales: number | null;
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
  inscription: 'Inscription',
  character: 'Character',
  pinName: 'Pin name',
  editionSize: 'Edition size',
  pinNumber: 'Pin #',
  brand: 'Brand',
  line: 'Line',
  toyName: 'Toy name',
  toyForm: 'Toy form',
  version: 'Version',
  posterFormat: 'Poster format',
  posterSize: 'Poster size',
  propType: 'Prop type',
  screenUsed: 'Screen-use state',
  catalogNumber: 'Catalog #',
  issueYear: 'Issue year',
  artist: 'Artist',
  releaseTitle: 'Release title',
  recordLabel: 'Label',
  pressing: 'Edition / pressing',
};

const CATEGORY_FIELDS: Record<string, string[]> = {
  sports_cards: ['player', 'year', 'manufacturer', 'cardNumber', 'certificationCompany', 'grade'],
  pokemon: ['cardName', 'set', 'cardNumber', 'variant', 'year', 'certificationCompany', 'grade'],
  coins: ['country', 'denomination', 'year', 'mintMark', 'variety', 'certificationCompany', 'grade'],
  comics: ['series', 'issueNumber', 'variant', 'publisher', 'certificationCompany', 'grade'],
  video_games: ['title', 'platform', 'edition', 'releaseYear', 'certificationCompany', 'grade'],
  stamps: ['country', 'catalogNumber', 'denomination', 'issueYear', 'certificationCompany', 'grade'],
  movies: ['title', 'format', 'releaseYear', 'edition', 'posterFormat', 'posterSize', 'propType', 'screenUsed', 'certificationCompany', 'grade'],
  autographs: ['signer', 'signedItemType', 'authenticationCompany', 'certificate', 'inscription'],
  disney_pins: ['character', 'pinName', 'series', 'editionSize', 'pinNumber'],
  vintage_toys: ['brand', 'line', 'toyName', 'toyForm', 'year', 'version', 'grade'],
  music: ['artist', 'releaseTitle', 'catalogNumber', 'recordLabel', 'country', 'releaseYear', 'format', 'pressing', 'certificationCompany', 'grade'],
};

const MATERIAL_FIELDS: Record<string, string[]> = {
  sports_cards: ['player', 'year', 'manufacturer', 'cardNumber', 'certificationCompany', 'grade'],
  pokemon: ['cardName', 'set', 'cardNumber', 'variant', 'certificationCompany', 'grade'],
  coins: ['denomination', 'year', 'mintMark', 'variety', 'certificationCompany', 'grade'],
  comics: ['series', 'issueNumber', 'variant', 'certificationCompany', 'grade'],
  video_games: ['title', 'platform', 'edition'],
  stamps: ['catalogNumber', 'denomination', 'issueYear', 'grade'],
  movies: ['title', 'format', 'edition', 'posterFormat', 'posterSize', 'propType', 'screenUsed', 'grade'],
  autographs: ['signer', 'signedItemType', 'authenticationCompany', 'certificate', 'inscription'],
  disney_pins: ['character', 'pinName', 'series', 'editionSize', 'pinNumber'],
  vintage_toys: ['brand', 'toyName', 'toyForm', 'year', 'version', 'grade'],
  music: ['artist', 'releaseTitle', 'catalogNumber', 'recordLabel', 'country', 'format', 'pressing', 'grade'],
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

function normalizeCoinDenomination(value: string): string {
  return normalized(value)
    .replace(/\b(us|u s|united states)\b/g, '')
    .replace(/\b(dollars?|doll|usd)\b/g, '')
    .replace(/\$\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function coinYearIncludes(sourceYear: string, listingYear: string): boolean {
  const target = Number(listingYear);
  if (!Number.isInteger(target)) return false;
  const range = sourceYear.match(/\b(\d{4})\s*[-–]\s*(\d{4})\b/);
  if (range) return target >= Number(range[1]) && target <= Number(range[2]);
  return false;
}

function fieldEquivalent(category: string, key: string, listingValue: string, sourceValue: string): boolean {
  if (category === 'coins' && key === 'denomination') {
    const left = normalizeCoinDenomination(listingValue);
    const right = normalizeCoinDenomination(sourceValue);
    if (left && right && left === right) return true;
  }
  if (category === 'coins' && key === 'year' && coinYearIncludes(sourceValue, listingValue)) return true;
  return equivalent(listingValue, sourceValue);
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
    certificationCompany: resolveTestAiGradingCompany(details, text(input.certificationCompany)),
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
    inscription: ['inscription', 'inscriptionText', 'inscriptionPresent', 'personalization'],
    character: ['character'],
    pinName: ['pinName', 'name'],
    editionSize: ['editionSize'],
    pinNumber: ['pinNumber'],
    brand: ['brand', 'manufacturer'],
    line: ['line', 'franchise', 'toyLine'],
    toyName: ['toyName', 'toyNameCharacter', 'characterName', 'vehicleName', 'playsetName', 'gamePuzzleName', 'name'],
    toyForm: ['objectType', 'productType', 'toyType', 'itemType'],
    version: ['version', 'variant'],
    posterFormat: ['posterFormat', 'posterType'],
    posterSize: ['posterSize', 'dimensions', 'size'],
    propType: ['propType', 'memorabiliaType'],
    screenUsed: ['screenUsed', 'screenWorn', 'provenance', 'propProvenance'],
    catalogNumber: ['scottNumber', 'catalogNumber'],
    issueYear: ['year', 'issueYear'],
    artist: ['artist', 'performer'],
    releaseTitle: ['releaseTitle', 'albumTitle', 'album', 'title'],
    recordLabel: ['recordLabel', 'label'],
    pressing: ['pressing', 'pressingDetails', 'edition', 'version'],
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
  if (category === 'music' && !base.releaseTitle) base.releaseTitle = base.title;
  return base;
}

function compactMarketSummary(source: EvidenceSourceObservation): string | null {
  if (source.status !== 'success' || !source.market) return null;
  const market = source.market;
  const parts: string[] = [];
  if (market.currentListingCount) parts.push(`${market.currentListingCount} current asking listing${market.currentListingCount === 1 ? '' : 's'}`);
  if (market.completedSaleCount) parts.push(`${market.completedSaleCount} completed sale${market.completedSaleCount === 1 ? '' : 's'}`);
  if (market.analyzerSubmittedSaleCount != null) parts.push(`${market.analyzerSubmittedSaleCount} submitted to analyzer`);
  const currentValueCount = market.currentValueSaleCount ?? market.recentSaleCount;
  const historicalTrendCount = market.historicalTrendSaleCount ?? market.historicalSaleCount;
  if (currentValueCount != null || historicalTrendCount != null) parts.push(`${currentValueCount ?? 0} current-value, ${historicalTrendCount ?? 0} historical-trend`);
  if (market.recentSaleCount) parts.push(`${market.recentSaleCount} recent sale${market.recentSaleCount === 1 ? '' : 's'}`);
  if (market.historicalSaleCount) parts.push(`${market.historicalSaleCount} historical record${market.historicalSaleCount === 1 ? '' : 's'}`);
  if (market.undatedSaleCount) parts.push(`${market.undatedSaleCount} undated record${market.undatedSaleCount === 1 ? '' : 's'}`);
  return parts.length ? `${source.label}: ${parts.join(', ')}.` : null;
}

function compactSubmittedPriceSummary(source: EvidenceSourceObservation): string | null {
  const currentPrices = source.market?.currentValuePrices;
  const historicalPrices = source.market?.historicalTrendPrices;
  if (currentPrices || historicalPrices) {
    const formatGroup = (label: string, values: number[]) => {
      const prices = values.filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
      if (!prices.length) return `${label}: 0 prices`;
      const total = prices.reduce((sum, price) => sum + price, 0);
      const median = prices.length % 2 === 1 ? prices[Math.floor(prices.length / 2)] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
      const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
      return `${label}: ${prices.length} prices · average ${money(total / prices.length)} · median ${money(median)} · range ${money(prices[0])}–${money(prices[prices.length - 1])}`;
    };
    return `${source.label}: submitted-price summary — ${formatGroup('current-value', currentPrices ?? [])}; ${formatGroup('historical-trend', historicalPrices ?? [])}.`;
  }
  const prices = (source.market?.analyzerSubmittedPrices ?? []).filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (!prices.length && source.market?.analyzerSubmittedSaleCount == null) {
    return source.market ? `${source.label}: submitted-price summary — 0 sales · no prices submitted to analyzer.` : null;
  }
  if (!prices.length) return `${source.label}: submitted-price summary — 0 sales · no prices submitted to analyzer.`;
  const total = prices.reduce((sum, price) => sum + price, 0);
  const median = prices.length % 2 === 1 ? prices[Math.floor(prices.length / 2)] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
  const money = (value: number) => `$${Math.round(value).toLocaleString()}`;
  return `${source.label}: submitted-price summary — ${prices.length} sale${prices.length === 1 ? '' : 's'} · average ${money(total / prices.length)} · median ${money(median)} · range ${money(prices[0])}–${money(prices[prices.length - 1])}.`;
}

function compactSelectedSourceSummary(source: EvidenceSourceObservation): string {
  if (source.status === 'error') return `${source.label}: unavailable${source.message ? ` — ${source.message}` : '.'}`;
  if (source.status === 'not_found') return `${source.label}: no record returned; 0 completed sales and 0 submitted to analyzer.`;
  if (source.market) {
    return compactMarketSummary(source) ?? `${source.label}: 0 completed sales, 0 submitted to analyzer.`;
  }
  return `${source.label}: selected ${source.kind.replace(/_/g, ' ')} source; completed-sales and analyzer-price summary not applicable.`;
}

function buildSourceDecision(source: EvidenceSourceObservation): EvidenceSourceDecision {
  const market = source.market;
  const completed = Number(market?.completedSaleCount ?? 0);
  const accepted = Number(market?.analyzerSubmittedSaleCount ?? 0);
  const currentValue = Number(market?.currentValueSaleCount ?? market?.recentSaleCount ?? 0);
  const historicalTrend = Number(market?.historicalTrendSaleCount ?? market?.historicalSaleCount ?? 0);
  const undated = Number(market?.undatedSaleCount ?? 0);
  const currentListings = Number(market?.currentListingCount ?? 0);
  const context = market ? Math.max(0, currentListings + completed - accepted - currentValue - historicalTrend + undated) : 0;
  return {
    id: source.id,
    label: source.label,
    status: source.status,
    kind: source.kind,
    completed,
    accepted,
    currentValue,
    historicalTrend,
    context,
    acceptedPrices: (market?.analyzerSubmittedPrices ?? []).filter((price) => Number.isFinite(price) && price > 0),
    message: source.message,
  };
}

export function normalizeTestAiEvidence(input: EvidenceListingInput, sources: EvidenceSourceObservation[]): NormalizedEvidenceSummary {
  const category = normalizeCategory(input.category);
  const listingValues = getListingValues(input);
  const identityReadiness = buildTestAiP0Identity(input);
  const identity = (CATEGORY_FIELDS[category] ?? ['title', 'certificationCompany', 'grade'])
    .map((key) => ({ key, label: FIELD_LABELS[key] ?? key, value: listingValues[key] ?? '' }))
    .filter((field) => field.value);
  const reviewFlags: EvidenceReviewFlag[] = [];
  const alignedSources: NormalizedEvidenceSummary['alignedSources'] = [];
  const guideAnchors: GuideValueAnchor[] = [];
  const materialFields = MATERIAL_FIELDS[category] ?? ['title', 'certificationCompany', 'grade'];

  for (const source of sources) {
    const guideValue = Number(source.fields?.guideValue);
    if (source.status === 'success' && (source.id === 'comic_book_realm' || source.id === 'numista') && Number.isFinite(guideValue) && guideValue > 0) {
      guideAnchors.push({
        sourceId: source.id,
        sourceLabel: source.label,
        grade: text(source.fields?.guideGrade),
        selectedGrade: text(source.fields?.guideSelectedGrade) || text(source.fields?.guideGrade),
        matchType: text(source.fields?.guideMatchType) === 'mapped' ? 'mapped' : 'exact',
        value: guideValue,
        recordedSales: Number.isFinite(Number(source.fields?.guideRecordedSales)) ? Number(source.fields?.guideRecordedSales) : null,
        lastSaleDate: text(source.fields?.guideLastSaleDate) || null,
        totalRecordedSales: Number.isFinite(Number(source.fields?.guideTotalRecordedSales)) ? Number(source.fields?.guideTotalRecordedSales) : null,
      });
    }
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
      } else if (fieldEquivalent(category, key, listingValue, sourceValue)) {
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
  const marketEvidencePriceSummaries = sources.map(compactSubmittedPriceSummary).filter((entry): entry is string => Boolean(entry));
  const selectedSourceSummaries = sources.map(compactSelectedSourceSummary);
  const evidenceSufficiency = buildP0EvidenceSufficiency({
    completedSaleCount: sources.reduce((count, source) => count + (source.status === 'success' ? Number(source.market?.completedSaleCount ?? 0) : 0), 0),
    askingListingCount: sources.reduce((count, source) => count + (source.status === 'success' ? Number(source.market?.currentListingCount ?? 0) : 0), 0),
    historicalRecordCount: sources.reduce((count, source) => count + (source.status === 'success' ? Number(source.market?.recentSaleCount ?? 0) + Number(source.market?.historicalSaleCount ?? 0) + Number(source.market?.undatedSaleCount ?? 0) : 0), 0),
    unavailableSourceCount: sources.filter((source) => source.status === 'error' || source.status === 'not_found').length,
  });
  return {
    category: displayCategory(category),
    identity,
    identityReadiness,
    evidenceSufficiency,
    alignedSources,
    reviewFlags,
    marketEvidence,
    marketEvidencePriceSummaries,
    selectedSourceSummaries,
    sourceDecisions: sources.map(buildSourceDecision),
    guideAnchors,
    sources: sources.map(({ id, label, kind, role, status, message }) => ({ id, label, kind, role: role ?? evidenceRoleForSourceKind(kind), status, message })),
  };
}

export function formatTestAiEvidenceForAnalysis(summary: NormalizedEvidenceSummary | null | undefined, itemLabel: string): string {
  if (!summary) return `${itemLabel}: No deterministic evidence review is available.`;
  const identity = summary.identity.map((field) => `${field.label}=${field.value}`).join(' | ') || 'No listing identity fields supplied';
  const aligned = summary.alignedSources.length
    ? summary.alignedSources.map((source) => `${source.label}: ${source.fields.join(', ')}`).join('; ')
    : 'No specialist field alignment established.';
  const market = summary.marketEvidence.length ? summary.marketEvidence.join(' ') : 'No classified market evidence returned.';
  const guides = summary.guideAnchors.length ? summary.guideAnchors.map((anchor) => `${anchor.sourceLabel}: ${anchor.matchType === 'mapped' ? `selected ${anchor.selectedGrade || 'unknown'} mapped to grade band ${anchor.grade || 'unknown'}` : `exact grade ${anchor.grade || 'unknown'}`} guide anchor $${anchor.value.toLocaleString()}${anchor.recordedSales !== null ? ` with ${anchor.recordedSales} recorded sales` : ''}.`).join(' ') : 'No grade-specific guide anchor returned.';
  const flags = summary.reviewFlags.length ? summary.reviewFlags.map((flag) => flag.message).join(' ') : 'No material identity discrepancy was detected from the selected source fields.';
  const readiness = summary.identityReadiness.missingCriticalFields.length
    ? `Identity readiness: ${summary.identityReadiness.readiness}; missing critical identifiers: ${summary.identityReadiness.missingCriticalFields.join(', ')}.`
    : `Identity readiness: ${summary.identityReadiness.readiness}; all category-critical identifiers currently supplied.`;
  const sufficiency = `Evidence sufficiency: ${summary.evidenceSufficiency.status}; ${summary.evidenceSufficiency.message}`;
  return `${itemLabel} deterministic evidence review:
Listing identity: ${identity}
Aligned specialist fields: ${aligned}
Market evidence classification: ${market}
Review flags: ${flags}
${readiness}
${sufficiency}
Guide-value anchors: ${guides}
Rule: Dated completed sales remain primary evidence. A validated direct-grade or documented mapped-grade-band guide anchor may influence the deterministic value only through the server-capped secondary weighting contract; it is never treated as a dated sale. Do not resolve a discrepancy silently, do not use factual reference metadata as value except for this validated guide-anchor contract, and do not use historical or undated records as current-value averages.`;
}
import { resolveTestAiGradingCompany } from './testAiCriteria';
