import {
  buildP0EvidenceSufficiency,
  buildTestAiP0Identity,
  evidenceRoleForSourceKind,
  type EvidenceSourceRole,
  type P0EvidenceSufficiency,
  type TestAiP0Identity,
} from './testAiP0Evidence';
import { extractCandidateStructuredMetadata, meaningfulMetadataText, readMetadataValue } from './testAiMetadataValues';
import { compareComparableGrades } from './testAiGradeComparison';

export type EvidenceSourceStatus = 'success' | 'partial' | 'not_found' | 'error' | 'idle';

export type EvidenceSourceKind = 'market_current' | 'market_completed' | 'market_historical' | 'certification' | 'reference';

/** Browser diagnostics only: measured listing populations confer no sale authority. */
export type EvidenceMarketPopulationDiagnostics = {
  requestedMode?: 'sold' | 'active';
  /** Provider-returned population; distinct from the retained first-ID union. */
  returnedRecordCount?: number;
  /** Full retained union, including held, active, and unknown listings. */
  retainedListingCount?: number;
  /** Retained provider-sold listing partition, not completed-sale credit. */
  providerSoldListingCount?: number;
  activeListingCount?: number;
  unknownListingCount?: number;
};

export type AnalyzerRecordDetail = {
  id: string;
  title: string;
  price: number | null;
  currency?: string | null;
  date?: string | null;
  url?: string | null;
  bucket: 'current_value' | 'historical_trend' | 'guide' | 'context';
  note?: string | null;
};

export type EvidenceSourceObservation = {
  id: string;
  label: string;
  kind: EvidenceSourceKind;
  /** Used only where a mixed source returns both completed and contextual records. */
  role?: EvidenceSourceRole;
  status: EvidenceSourceStatus;
  fields?: Record<string, unknown>;
  market?: EvidenceMarketPopulationDiagnostics & {
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
    analyzerRecords?: AnalyzerRecordDetail[];
  };
  /** False for market-range workflows such as Autographs that never use visual analysis. */
  visualAnalysisRequired?: boolean;
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
  sources: (Omit<EvidenceMarketPopulationDiagnostics, 'returnedRecordCount'> & { id: string; label: string; kind: EvidenceSourceKind; role: EvidenceSourceRole; status: EvidenceSourceStatus; message?: string | null })[];
};

export type EvidenceSourceDecision = EvidenceMarketPopulationDiagnostics & {
  id: string;
  label: string;
  status: EvidenceSourceStatus;
  kind: EvidenceSourceKind;
  /** Legacy market total; for Mercari, measured provider returns only (not necessarily priced). */
  returned?: number;
  completed: number;
  accepted: number;
  /** Completed records held out of source-level valuation eligibility. */
  excludedFromValuation: number;
  currentValue: number;
  historicalTrend: number;
  /** Mercari uses measured retained/returned totals; absent measures remain undefined. */
  context?: number;
  acceptedPrices: number[];
  analyzerRecords: AnalyzerRecordDetail[];
  treatment: 'valuation_candidate' | 'valuation_guide' | 'current_value' | 'historical_trend' | 'context_only' | 'certification_context' | 'unavailable';
  analyzerWeightPct: number | null;
  treatmentReason: string;
  visualAnalysisRequired: boolean;
  message?: string | null;
};

export type TestAiSourceRunOutcome = EvidenceMarketPopulationDiagnostics & {
  id: string;
  label: string;
  status: EvidenceSourceStatus;
  returned?: number;
  completed: number;
  accepted: number;
  currentValue: number;
  historicalTrend: number;
  excludedFromValuation: number;
  context?: number;
  visualAnalysisRequired: boolean;
  timedOut: boolean;
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
  /** Transport only: trust is established exclusively by the server verifier. */
  currency?: string;
  retrievedAt?: string;
  expiresAt?: string;
  sourceQuery?: string;
  sourceRecordId?: string;
  form?: string;
  provenanceToken?: string | null;
};

/** Lossless browser transport, not a trust decision or valuation admission. */
export function guideAnchorFields(anchor: GuideValueAnchor | null | undefined): Record<string, unknown> {
  if (!anchor) return {};
  return {
    guideValue: anchor.value, guideGrade: anchor.grade, guideSelectedGrade: anchor.selectedGrade,
    guideMatchType: anchor.matchType, guideSourceLabel: anchor.sourceLabel,
    guideCurrency: anchor.currency, guideRetrievedAt: anchor.retrievedAt, guideExpiresAt: anchor.expiresAt,
    guideSourceQuery: anchor.sourceQuery, guideSourceRecordId: anchor.sourceRecordId, guideForm: anchor.form,
    guideProvenanceToken: anchor.provenanceToken, guideRecordedSales: anchor.recordedSales,
    guideLastSaleDate: anchor.lastSaleDate, guideTotalRecordedSales: anchor.totalRecordedSales,
  };
}

/**
 * Select one allowed guide reference. The server must first verify authority
 * and applicability before using this preference for a fallback. Exact-grade
 * PriceCharting precedes Numista; arbitrary/context-only sources never win.
 */
export function selectPreferredGuideAnchor(anchors: GuideValueAnchor[]): GuideValueAnchor | null {
  return anchors.find((anchor) => anchor.sourceId === 'pricecharting')
    ?? anchors.find((anchor) => anchor.sourceId === 'numista')
    ?? null;
}

type DetailRecord = Record<string, unknown>;

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  player: 'Player',
  cardName: 'Card name',
  set: 'Set',
  cardNumber: 'Card #',
  variant: 'Variant',
  finish: 'Finish',
  cardType: 'Card type / mechanic',
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
  pokemon: ['cardName', 'set', 'cardNumber', 'finish', 'cardType', 'variant', 'year', 'certificationCompany', 'grade'],
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
  pokemon: ['cardName', 'set', 'cardNumber', 'finish', 'cardType', 'variant', 'certificationCompany', 'grade'],
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
  if (typeof value === 'object' && !Array.isArray(value)) return { ...value, ...extractCandidateStructuredMetadata({ itemDetails: value }) };
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...parsed, ...extractCandidateStructuredMetadata({ itemDetails: parsed }) }
      : {};
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
  return readMetadataValue(details, keys);
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

/** Harmless numeric formatting is equivalent; plus signs and qualifiers are not. */
export function normalizeGuideGrade(value: unknown): string {
  return String(value ?? '').trim().toUpperCase()
    .replace(/(\d+(?:\.\d+)?)/g, (number) => String(Number(number)))
    .replace(/[\s_/-]+/g, '');
}

/** The existing Numista provider's documented associations, without dropping qualifiers. */
export function mapNumistaGuideGradeBand(value: unknown): string | null {
  const grade = normalizeGuideGrade(value);
  const bands: Readonly<Record<string, string>> = {
    VERYGOOD: 'VG', AG3: 'G', G4: 'G', G6: 'G', VG8: 'VG', VG10: 'VG',
    F12: 'F', F15: 'F', VF20: 'VF', VF25: 'VF', VF30: 'VF', VF35: 'VF',
    XF40: 'XF', XF45: 'XF', AU50: 'AU', AU53: 'AU', AU55: 'AU', AU58: 'AU',
    NEARMINT: 'UNC', MS60: 'UNC', MS61: 'UNC', MS62: 'UNC', MS63: 'UNC',
    MS64: 'UNC', MS65: 'UNC', MS66: 'UNC', MS67: 'UNC',
  };
  return bands[grade] ?? null;
}

function equivalentCoinGuideGrade(left: string, right: string): boolean {
  return normalizeGuideGrade(left) === normalizeGuideGrade(right);
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
  if (key === 'grade') {
    return compareComparableGrades(listingValue, sourceValue, { allowBareNumeric: true, category }) === 'match';
  }
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
    title: meaningfulMetadataText(input.title),
    grade: meaningfulMetadataText(input.grade) || firstText(details, ['grade']),
    certificationCompany: meaningfulMetadataText(input.certificationCompany) || readMetadataValue(details, ['certificationCompany', 'gradingCompany', 'grader']),
  };

  const mappings: Record<string, string[]> = {
    player: ['player', 'athlete', 'subject'],
    cardName: ['cardName', 'pokemonName', 'name'],
    set: ['setName', 'set', 'cardSet'],
    cardNumber: ['cardNumber', 'cardNo', 'number'],
    finish: ['finish', 'finishVariant'],
    cardType: ['cardType', 'mechanic', 'variant', 'variation'],
    variant: ['variant', 'variation', 'cardType', 'mechanic', 'editionEra'],
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
  if (category === 'pokemon' && !base.cardName) base.cardName = base.title;
  if (category === 'video_games' && !base.title) base.title = firstText(details, ['gameTitle', 'videoGameTitle', 'title']);
  if (category === 'music' && !base.releaseTitle) base.releaseTitle = base.title;
  return base;
}

/** Do not coerce strings, booleans, nulls, accessors, or unsafe/fractional counts. */
function measuredMercariMarketValue(source: EvidenceSourceObservation, key: keyof EvidenceMarketPopulationDiagnostics): unknown {
  if (source.id !== 'mercari_sold_comps' || !source.market || typeof source.market !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(source.market, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function measuredMercariCount(source: EvidenceSourceObservation, key: Exclude<keyof EvidenceMarketPopulationDiagnostics, 'requestedMode'>): number | undefined {
  const value = measuredMercariMarketValue(source, key);
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function mercariPopulationDiagnostics(source: EvidenceSourceObservation): EvidenceMarketPopulationDiagnostics {
  if (source.id !== 'mercari_sold_comps') return {};
  const requestedMode = measuredMercariMarketValue(source, 'requestedMode');
  return {
    requestedMode: requestedMode === 'sold' || requestedMode === 'active' ? requestedMode : undefined,
    returnedRecordCount: measuredMercariCount(source, 'returnedRecordCount'),
    retainedListingCount: measuredMercariCount(source, 'retainedListingCount'),
    providerSoldListingCount: measuredMercariCount(source, 'providerSoldListingCount'),
    activeListingCount: measuredMercariCount(source, 'activeListingCount'),
    unknownListingCount: measuredMercariCount(source, 'unknownListingCount'),
  };
}

function compactMercariMarketSummary(source: EvidenceSourceObservation): string {
  const population = mercariPopulationDiagnostics(source);
  const count = (value: number | undefined) => value === undefined ? 'not measured' : String(value);
  const mode = population.requestedMode === undefined ? 'requested mode not reported' : `${population.requestedMode} mode requested`;
  const base = `${source.label.slice(0, 60)}: ${mode}; provider returned records: ${count(population.returnedRecordCount)}; retained listings: ${count(population.retainedListingCount)}; retained provider-sold listings: ${count(population.providerSoldListingCount)}, active listings: ${count(population.activeListingCount)}, unknown listings: ${count(population.unknownListingCount)}; 0 admitted completed-sale credit. Retained context/identity review only: final amounts and sale dates unverified; active asking context; unknown-status basis unknown. Retrieval status: ${source.status}.`;
  // The final summary-schema narrative limit remains 600. Context/credit and
  // population facts take precedence over verbose duplicate source messages.
  const message = typeof source.message === 'string' ? source.message.slice(0, Math.max(0, 600 - base.length - 3)) : '';
  return `${base}${message ? ` — ${message}` : ''}`.slice(0, 600);
}

function compactMarketSummary(source: EvidenceSourceObservation): string | null {
  if (source.id === 'mercari_sold_comps') return compactMercariMarketSummary(source);
  if (!['success', 'partial'].includes(source.status) || !source.market) return null;
  const market = source.market;
  const parts: string[] = [];
  if (market.currentListingCount) parts.push(`${market.currentListingCount} current asking listing${market.currentListingCount === 1 ? '' : 's'}`);
  if (market.completedSaleCount) parts.push(`${market.completedSaleCount} completed sale${market.completedSaleCount === 1 ? '' : 's'}`);
  if (market.analyzerSubmittedSaleCount != null) parts.push(`${market.analyzerSubmittedSaleCount} source-stage eligible (not request receipts)`);
  const currentValueCount = market.currentValueSaleCount ?? market.recentSaleCount;
  const historicalTrendCount = market.historicalTrendSaleCount ?? market.historicalSaleCount;
  if (currentValueCount != null || historicalTrendCount != null) parts.push(`${currentValueCount ?? 0} ${source.kind === 'market_current' ? 'asking-price context' : 'current-window source candidates'}, ${historicalTrendCount ?? 0} historical source candidates`);
  if (market.recentSaleCount) parts.push(`${market.recentSaleCount} recent sale${market.recentSaleCount === 1 ? '' : 's'}`);
  if (market.historicalSaleCount) parts.push(`${market.historicalSaleCount} historical record${market.historicalSaleCount === 1 ? '' : 's'}`);
  if (market.undatedSaleCount) parts.push(`${market.undatedSaleCount} undated record${market.undatedSaleCount === 1 ? '' : 's'}`);
  return parts.length ? `${source.label}: ${parts.join(', ')}.` : null;
}

function compactSubmittedPriceSummary(source: EvidenceSourceObservation): string | null {
  if (source.id === 'mercari_sold_comps') {
    const records = source.market?.analyzerRecords;
    const measured = Array.isArray(records);
    const recordCount = measured ? String(records.length) : 'not measured';
    const priceCount = measured ? String(records.filter((record) => typeof record.price === 'number' && Number.isFinite(record.price) && record.price > 0).length) : 'not measured';
    return `${source.label.slice(0, 60)}: retained context-detail records: ${recordCount}; priced context observations: ${priceCount}; final-price/currency basis unresolved — aggregate not shown; 0 admitted completed-sale credit. These source details are not final-request submission receipts; operational submission and final pricing use are separate.`;
  }
  const currentPrices = source.market?.currentValuePrices;
  const historicalPrices = source.market?.historicalTrendPrices;
  const withholding = 'currency/basis unresolved — aggregate not shown; anonymous source observations, not final-price statistics';
  const observationCount = (values: number[]) => values.filter((price) => Number.isFinite(price) && price > 0).length;
  if (currentPrices || historicalPrices) {
    return `${source.label}: source-stage price observations — ${source.kind === 'market_current' ? 'asking context' : 'current-window source candidates'}: ${observationCount(currentPrices ?? [])} priced observations; historical source candidates: ${observationCount(historicalPrices ?? [])} priced observations · ${withholding}.`;
  }
  if (!source.market) return null;
  return `${source.label}: source-stage price observations — ${observationCount(source.market.analyzerSubmittedPrices ?? [])} priced observations · ${withholding}.`;
}

function compactSelectedSourceSummary(source: EvidenceSourceObservation): string {
  if (source.id === 'mercari_sold_comps') return compactMercariMarketSummary(source);
  if (source.status === 'error') return `${source.label}: unavailable${source.message ? ` — ${source.message}` : '.'}`;
  if (source.status === 'not_found') return `${source.label}: no record returned; returned no record; source/final populations not measured.`;
  if (source.market) {
    return compactMarketSummary(source) ?? `${source.label}: source-stage completed/eligible counts not reported.`;
  }
  return `${source.label}: selected ${source.kind.replace(/_/g, ' ')} source; completed-sales and analyzer-price summary not applicable.`;
}

function buildSourceDecision(source: EvidenceSourceObservation): EvidenceSourceDecision {
  const market = source.market;
  if (source.id === 'mercari_sold_comps') {
    const population = mercariPopulationDiagnostics(source);
    const context = population.retainedListingCount ?? population.returnedRecordCount;
    return {
      id: source.id, label: source.label, status: source.status, kind: source.kind,
      ...population,
      returned: population.returnedRecordCount,
      completed: 0, accepted: 0, excludedFromValuation: 0, currentValue: 0, historicalTrend: 0,
      context,
      acceptedPrices: [],
      analyzerRecords: Array.isArray(market?.analyzerRecords)
        ? market.analyzerRecords.map((record) => ({ ...record, bucket: 'context' as const }))
        : [],
      treatment: context !== undefined && context > 0
        ? 'context_only'
        : source.status === 'error' || source.status === 'not_found' ? 'unavailable' : 'context_only',
      analyzerWeightPct: null,
      treatmentReason: 'Mercari requested mode and provider-sold/active/unknown listing populations are browser diagnostics only. The measured retained union (or provider returns when retention is unmeasured) remains context/identity review, including partial/error retrieval; sold labels, reported prices, and browser completion fields confer no completed-sale or valuation credit. Final server provenance, economics, timing, and identity gates are unchanged.',
      visualAnalysisRequired: source.visualAnalysisRequired !== false,
      message: source.message,
    };
  }
  const completed = Number(market?.completedSaleCount ?? 0);
  const accepted = Number(market?.analyzerSubmittedSaleCount ?? 0);
  const currentValue = Number(market?.currentValueSaleCount ?? market?.recentSaleCount ?? 0);
  const historicalTrend = Number(market?.historicalTrendSaleCount ?? market?.historicalSaleCount ?? 0);
  const currentListings = Number(market?.currentListingCount ?? 0);
  const excludedFromValuation = Math.max(0, completed - accepted);
  // A completed record can be eligible for source-level analyzer review and
  // still fall into a current-value or historical-trend bucket. Those are
  // overlapping classifications, so only explicitly held-out completed
  // records and asking listings contribute to the context/review count.
  const context = market ? Math.max(0, currentListings - currentValue) + excludedFromValuation : 0;
  const providerReportedReturned = Number(market?.returnedRecordCount);
  const returned = Number.isFinite(providerReportedReturned)
    ? Math.max(0, providerReportedReturned)
    : Math.max(0, currentListings) + Math.max(0, completed);
  const hasGuideValue = source.status === 'success' && Number.isFinite(Number(source.fields?.guideValue)) && Number(source.fields?.guideValue) > 0;
  const guideSource = source.id === 'numista' || source.id === 'pricecharting';
  const treatment = source.status === 'error' || source.status === 'not_found'
    ? 'unavailable'
    : hasGuideValue && guideSource
      ? 'valuation_guide'
      : accepted > 0
        ? 'valuation_candidate'
        : currentValue > 0
          ? 'current_value'
        : historicalTrend > 0
          ? 'historical_trend'
          : source.kind === 'certification'
            ? 'certification_context'
            : 'context_only';
  const treatmentReason = treatment === 'valuation_guide'
    ? source.id === 'pricecharting'
      ? 'PriceCharting coin guide is a fallback candidate only after server provenance and exact-grade applicability verification; sufficient recent completed sales use sale-only value.'
      : 'Numista USD catalogue guide is a fallback candidate only after server provenance and documented grade applicability verification; it is not a completed sale.'
    : treatment === 'valuation_candidate'
      ? 'Completed, identity-compatible candidates are eligible at source stage; actual request receipts and final comparable use are reported separately.'
    : treatment === 'current_value'
      ? source.kind === 'market_current'
        ? 'Source-stage active listings remain asking-price context; they are not completed-sale records or primary-sales contributors.'
        : 'Current-window completed-sale source candidates; actual submission and final pricing use are reported separately.'
      : treatment === 'historical_trend'
        ? 'Retained for historical movement only; excluded from current valuation.'
        : treatment === 'certification_context'
          ? 'Certification or population evidence supports identity/grading review; it contributes 0% to valuation.'
          : treatment === 'unavailable'
            ? 'No usable result was returned; it contributes 0%.'
            : 'Reference, asking-price, or otherwise non-sale evidence; it contributes 0% to valuation.';
  return {
    id: source.id,
    label: source.label,
    status: source.status,
    kind: source.kind,
    returned,
    completed,
    accepted,
    excludedFromValuation,
    currentValue,
    historicalTrend,
    context,
    acceptedPrices: (market?.analyzerSubmittedPrices ?? []).filter((price) => Number.isFinite(price) && price > 0),
    analyzerRecords: market?.analyzerRecords ?? [],
    treatment,
    analyzerWeightPct: treatment === 'valuation_guide' ? 0 : null,
    treatmentReason,
    visualAnalysisRequired: source.visualAnalysisRequired !== false,
    message: source.message,
  };
}

/**
 * A deliberately current-run-only diagnostic. It derives from the same
 * normalized evidence ledger that reaches the analyzer and never persists a
 * listing, request, certificate, provider payload, or user identifier.
 */
export function summarizeTestAiSourceRunOutcomes(decisions: EvidenceSourceDecision[]): TestAiSourceRunOutcome[] {
  return decisions.map((decision) => ({
    id: decision.id,
    label: decision.label,
    status: decision.status,
    returned: decision.returned,
    completed: decision.completed,
    accepted: decision.accepted,
    currentValue: decision.currentValue,
    historicalTrend: decision.historicalTrend,
    excludedFromValuation: decision.excludedFromValuation,
    context: decision.context,
    ...(decision.id === 'mercari_sold_comps' ? {
      requestedMode: decision.requestedMode,
      returnedRecordCount: decision.returnedRecordCount,
      retainedListingCount: decision.retainedListingCount,
      providerSoldListingCount: decision.providerSoldListingCount,
      activeListingCount: decision.activeListingCount,
      unknownListingCount: decision.unknownListingCount,
    } : {}),
    visualAnalysisRequired: decision.visualAnalysisRequired,
    timedOut: decision.status === 'error' && /\b(?:timeout|timed out|aborted)\b/i.test(String(decision.message ?? '')),
    message: decision.message,
  }));
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
    // Copy a server-issued transport object intact in meaning, not in trust.
    // Numeric-only legacy observations remain reference context; neither a
    // provider label nor a browser `trusted` flag establishes fallback authority.
    const transported = source.fields?.guideAnchor;
    const transportedAnchor = transported && typeof transported === 'object' && !Array.isArray(transported)
      ? transported as GuideValueAnchor
      : typeof source.fields?.guideProvenanceToken === 'string'
        ? {
          sourceId: source.id, sourceLabel: text(source.fields.guideSourceLabel) || source.label,
          grade: text(source.fields.guideGrade), selectedGrade: text(source.fields.guideSelectedGrade),
          matchType: text(source.fields.guideMatchType) === 'mapped' ? 'mapped' as const : 'exact' as const,
          value: guideValue,
          recordedSales: source.fields.guideRecordedSales == null ? null : Number(source.fields.guideRecordedSales),
          lastSaleDate: source.fields.guideLastSaleDate == null ? null : text(source.fields.guideLastSaleDate),
          totalRecordedSales: source.fields.guideTotalRecordedSales == null ? null : Number(source.fields.guideTotalRecordedSales),
          currency: text(source.fields.guideCurrency), retrievedAt: text(source.fields.guideRetrievedAt),
          expiresAt: text(source.fields.guideExpiresAt), sourceQuery: text(source.fields.guideSourceQuery),
          sourceRecordId: text(source.fields.guideSourceRecordId), form: text(source.fields.guideForm),
          provenanceToken: source.fields.guideProvenanceToken,
        } satisfies GuideValueAnchor : null;
    if (source.status === 'success' && (source.id === 'pricecharting' || source.id === 'numista')
      && transportedAnchor?.sourceId === source.id && typeof transportedAnchor.provenanceToken === 'string') {
      guideAnchors.push({
        sourceId: transportedAnchor.sourceId, sourceLabel: transportedAnchor.sourceLabel,
        grade: transportedAnchor.grade, selectedGrade: transportedAnchor.selectedGrade,
        matchType: transportedAnchor.matchType, value: transportedAnchor.value,
        recordedSales: transportedAnchor.recordedSales, lastSaleDate: transportedAnchor.lastSaleDate,
        totalRecordedSales: transportedAnchor.totalRecordedSales, currency: transportedAnchor.currency,
        retrievedAt: transportedAnchor.retrievedAt, expiresAt: transportedAnchor.expiresAt,
        sourceQuery: transportedAnchor.sourceQuery, sourceRecordId: transportedAnchor.sourceRecordId,
        form: transportedAnchor.form, provenanceToken: transportedAnchor.provenanceToken,
      });
    }
    if (source.status === 'success' && source.id === 'comic_book_realm' && Number.isFinite(guideValue) && guideValue > 0) {
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
    if (!transportedAnchor?.provenanceToken && source.status === 'success' && source.id === 'numista' && Number.isFinite(guideValue) && guideValue > 0) {
      guideAnchors.push({
        sourceId: source.id,
        sourceLabel: source.label,
        grade: text(source.fields?.guideGrade),
        selectedGrade: text(source.fields?.guideSelectedGrade) || text(source.fields?.guideGrade),
        matchType: text(source.fields?.guideMatchType) === 'mapped' ? 'mapped' : 'exact',
        value: guideValue,
        recordedSales: 0,
        lastSaleDate: null,
        totalRecordedSales: 0,
      });
      reviewFlags.push({
        kind: 'context',
        sourceId: source.id,
        sourceLabel: source.label,
        message: `${source.label} returned a catalogue estimate. Server provenance and USD grade applicability must be verified before guide fallback; it is not a completed sale and never blends with sufficient recent sales.`,
      });
    }
    const selectedGuideGrade = text(source.fields?.guideSelectedGrade);
    const exactPriceChartingGuide = source.status === 'success'
      && source.id === 'pricecharting'
      && category === 'coins'
      && text(source.fields?.guideMatchType) === 'exact'
      && Boolean(listingValues.grade)
      && equivalentCoinGuideGrade(selectedGuideGrade, listingValues.grade)
      && Number.isFinite(guideValue)
      && guideValue > 0;
    if (exactPriceChartingGuide && !transportedAnchor?.provenanceToken) {
      guideAnchors.push({
        sourceId: source.id,
        sourceLabel: source.label,
        grade: text(source.fields?.guideGrade),
        selectedGrade: selectedGuideGrade,
        matchType: 'exact',
        value: guideValue,
        recordedSales: null,
        lastSaleDate: null,
        totalRecordedSales: null,
      });
      reviewFlags.push({
        kind: 'context',
        sourceId: source.id,
        sourceLabel: source.label,
        message: `${source.label} returned an exact certified-grade coin guide. It is the preferred fallback candidate only after server provenance verification, never an individual dated completed sale or a completed-sale count.`,
      });
    }
    if (source.status === 'partial') reviewFlags.push({ kind: 'coverage', sourceId: source.id, sourceLabel: source.label, message: `${source.label} has partial/error retrieval; known observations are retained${source.message ? `: ${source.message}` : '.'}` });
    if (source.status === 'error') {
      reviewFlags.push({ kind: 'coverage', sourceId: source.id, sourceLabel: source.label, message: `${source.label} could not be checked${source.message ? `: ${source.message}` : '.'}` });
      continue;
    }
    if (source.status === 'not_found') {
      reviewFlags.push({ kind: 'coverage', sourceId: source.id, sourceLabel: source.label, message: `${source.label} returned no record for the selected lookup.` });
      continue;
    }
    if (!['success', 'partial'].includes(source.status) || !source.fields) continue;

    const alignedFields: string[] = [];
    for (const key of materialFields) {
      const listingValue = listingValues[key];
      const sourceValue = readMetadataValue(source.fields, [key]);
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

    const globalReleaseYear = readMetadataValue(source.fields, ['globalReleaseYear']);
    if (globalReleaseYear && listingValues.releaseYear && !equivalent(globalReleaseYear, listingValues.releaseYear)) {
      reviewFlags.push({ kind: 'context', sourceId: source.id, sourceLabel: source.label, field: 'Release year', message: `${source.label} records a global first-release year of ${globalReleaseYear}; the listing records ${listingValues.releaseYear}. This may be a regional-release difference and is not resolved automatically.` });
    }
    if (alignedFields.length) alignedSources.push({ id: source.id, label: source.label, fields: alignedFields });
  }

  const marketEvidence = sources.map(compactMarketSummary).filter((entry): entry is string => Boolean(entry));
  const marketEvidencePriceSummaries = sources.map(compactSubmittedPriceSummary).filter((entry): entry is string => Boolean(entry));
  const selectedSourceSummaries = sources.map(compactSelectedSourceSummary);
  const evidenceSufficiency = buildP0EvidenceSufficiency({
    completedSaleCount: sources.reduce((count, source) => count + (source.id !== 'mercari_sold_comps' && ['success', 'partial'].includes(source.status) ? Number(source.market?.completedSaleCount ?? 0) : 0), 0),
    askingListingCount: sources.reduce((count, source) => count + (source.id === 'mercari_sold_comps'
      ? measuredMercariCount(source, 'activeListingCount') ?? 0
      : ['success', 'partial'].includes(source.status) ? Number(source.market?.currentListingCount ?? 0) : 0), 0),
    historicalRecordCount: sources.reduce((count, source) => count + (source.id !== 'mercari_sold_comps' && ['success', 'partial'].includes(source.status) ? Number(source.market?.recentSaleCount ?? 0) + Number(source.market?.historicalSaleCount ?? 0) + Number(source.market?.undatedSaleCount ?? 0) : 0), 0),
    unavailableSourceCount: sources.filter((source) => source.status === 'error' || source.status === 'not_found').length,
  });
  if (evidenceSufficiency.completedSaleCount === 0 && sources.some((source) => source.id === 'mercari_sold_comps'
    && (measuredMercariCount(source, 'retainedListingCount') ?? measuredMercariCount(source, 'returnedRecordCount') ?? 0) > 0)) {
    evidenceSufficiency.message = 'No completed-sale evidence is selected. Measured Mercari listings remain context/identity review only; provider-sold labels and unknown-status records do not establish final prices or completed-sale support.';
  }
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
    sources: sources.map((source) => {
      const { returnedRecordCount: _returnedRecordCount, ...population } = mercariPopulationDiagnostics(source);
      return {
        id: source.id, label: source.label, kind: source.kind,
        role: source.id === 'mercari_sold_comps' ? 'reference_context' as const : source.role ?? evidenceRoleForSourceKind(source.kind),
        status: source.status, message: source.message,
        ...population,
      };
    }),
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
Rule: Sufficient valid recent completed sales determine sale-only value without a guide blend. With insufficient recent sales, only a server-authenticated applicable Coin guide may supply an explicitly labeled guide fallback; without it, no primary value is invented. A guide never counts as a completed sale or establishes market support. Do not resolve a discrepancy silently, do not use factual reference metadata as value except for this verified guide-fallback contract, and do not use historical or undated records as current-value averages.`;
}
