import { buildTestAiP0Identity } from '../shared/testAiP0Evidence';
import { classifyStampFormat, stampFormatsCompatible } from './stampFormat';
import { extractIdentityState, identityStateConflicts } from './testAiIdentityState';

export type EvidenceState =
  | 'no_market_evidence'
  | 'poor_item_identification'
  | 'sparse_market_evidence'
  | 'conflicting_market_evidence'
  | 'stale_market_evidence'
  | 'strong_recent_market_evidence';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ComparableTarget {
  title: string;
  category: string;
  itemType?: string;
  grade?: string;
  condition?: string;
  certificationCompany?: string;
  itemDetails?: string;
}

export interface MarketSale {
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  date?: string | null;
  marketplace?: string | null;
  /** The venue where the transaction occurred, distinct from the data adapter. */
  originMarketplace?: string | null;
  sourceLabel?: string | null;
  recency?: 'recent' | 'extended' | 'historical' | 'undated' | null;
  sourceId?: string | null;
  /** Server-known adapter ID; browser input may not establish this fact. */
  sourceAdapter?: string | null;
  saleId?: string | null;
  url?: string | null;
  saleStatus?: 'completed' | 'closed' | 'active' | 'unknown' | null;
  /** Provider wording such as realized, sold, or finalized closed. */
  completedStatusBasis?: string | null;
  /** Provider price semantics. Asking prices never enter this completed-sale contract. */
  priceBasis?: 'realized' | 'sold' | 'closed' | 'unknown' | null;
  /** Visual candidate review is a matching aid only, never authentication. */
  visualReviewStatus?: 'match' | 'rough_match' | 'mismatch' | 'unreadable' | 'not_reviewed' | null;
  visualReviewRationale?: string | null;
  /** Source-level disposition preserves uncertainty without admitting it to value. */
  evidenceDisposition?: 'valuation_eligible' | 'warning_review' | 'context_only' | 'rejected_objective_conflict' | 'omitted_by_cap' | 'not_visually_reviewed_window' | null;
  evidenceReasons?: string[] | null;
  /** Whether a visual check is necessary for this record's direct use. */
  visualRequirement?: 'not_required' | 'required' | null;
  /** Specific price-economics facts prevent incomparable hammer and all-in prices from mixing. */
  buyerPremium?: 'included' | 'excluded' | 'unknown' | null;
  shipping?: 'included' | 'excluded' | 'unknown' | null;
  tax?: 'included' | 'excluded' | 'unknown' | null;
  saleForm?: string | null;
  lotQuantity?: number | null;
  /** Server-issued reference required before a browser-carried record can affect value. */
  provenanceToken?: string | null;
  provenance?: unknown;
  observationId?: string | null;
  canonicalTransactionId?: string | null;
  duplicateStatus?: 'unique' | 'exact_duplicate' | 'probable_duplicate' | 'possible_duplicate' | null;
}

export type ComparableClassification = 'exact' | 'near' | 'contextual' | 'rejected';
export type IdentityRelationship =
  | 'exact_identity'
  | 'same_object_different_state'
  | 'related_variant'
  | 'related_object'
  | 'insufficient_identity'
  | 'conflict';
export type ValuationRelationship =
  | 'direct_comparable'
  | 'grade_adjacent_comparable'
  | 'condition_adjacent'
  | 'variant_comparable'
  | 'reference_only'
  | 'not_usable';
export type ComparableCategoryGateStatus = 'direct_confirmed' | 'needs_review' | 'objective_conflict' | 'not_applicable';
export interface ComparableCategoryIdentity {
  category: string;
  status: ComparableCategoryGateStatus;
  confirmedFields: string[];
  unconfirmedFields: string[];
  conflicts: string[];
}
export interface ComparableMatch {
  title: string;
  price: number;
  date: string | null;
  currency: string;
  score: number;
  accepted: boolean;
  reasons: string[];
  exclusionReason?: string;
  weight: number;
  classification: ComparableClassification;
  identityRelationship: IdentityRelationship;
  valuationRelationship: ValuationRelationship;
  categoryIdentity: ComparableCategoryIdentity;
  sourceId?: string | null;
  sourceLabel?: string | null;
  marketplace?: string | null;
  originMarketplace?: string | null;
  sourceAdapter?: string | null;
  saleId?: string | null;
  url?: string | null;
  saleStatus?: string | null;
  completedStatusBasis?: string | null;
  priceBasis?: string | null;
  buyerPremium?: string | null;
  shipping?: string | null;
  tax?: string | null;
  saleForm?: string | null;
  lotQuantity?: number | null;
  observationId?: string | null;
  canonicalTransactionId?: string | null;
  duplicateStatus?: MarketSale['duplicateStatus'];
  provenance?: unknown;
  visualReviewStatus?: string | null;
  visualReviewRationale?: string | null;
  evidenceDisposition?: string | null;
  evidenceReasons?: string[] | null;
  duplicateOf?: string;
}

export type ComparableSourceDiagnostic = {
  sourceId: string;
  sourceLabel: string;
  received: number;
  duplicate: number;
  eligibleCompleted: number;
  acceptedIdentity: number;
  selectedForValuation: number;
  omittedByCap: number;
};

export type SourceReliabilityLevel = 'high' | 'medium' | 'low' | 'unavailable';

export type CategoryEvidenceThresholds = {
  category: string;
  minimumSelectedSales: number;
  minimumIndependentMarketplaces: number;
  maximumSpreadPct: number;
  rationale: string;
};

export type AdapterReliabilityHistory = {
  adapterId: string;
  receivedCount: number;
  selectedCount: number;
  duplicateCount: number;
  attributedCount: number;
  currentWindowCount: number;
  selectionRatePct: number;
  reliability: SourceReliabilityLevel;
};

export type MarketEvidenceCoverage = {
  receivedCount: number;
  selectedCount: number;
  attributedCount: number;
  serverAttributedCount: number;
  independentMarketplaceCount: number;
  currentWindowCount: number;
  duplicatePressurePct: number | null;
  sourceReliability: SourceReliabilityLevel;
  sourceReliabilityScore: number | null;
  sourceReliabilityReasons: string[];
};

export type ComparableSelectionDiagnostics = {
  cap: number;
  received: number;
  deduplicated: number;
  eligibleCompleted: number;
  acceptedIdentity: number;
  selectedForValuation: number;
  omittedByCap: number;
  sources: ComparableSourceDiagnostic[];
};

export interface MarketProfile {
  /** Only populated when a preliminary completed-sale range is defensible. */
  marketRange: { low: number | null; mid: number | null; high: number | null; supported: boolean };
  /** Middle 50% of the accepted sale population; supplementary to the observed range. */
  typicalBand: { low: number | null; high: number | null; supported: boolean };
  /** Robust primary center: median of the accepted, post-policy sale population. */
  primaryValue: number | null;
  /** Kept as a recency-sensitive diagnostic; never the primary valuation center. */
  weightedValue: number | null;
  median: number | null;
  minimum: number | null;
  maximum: number | null;
  interquartileRange: number | null;
  spreadPct: number | null;
  evidenceState: EvidenceState;
  evidenceQuality: ConfidenceLevel;
  itemIdentificationConfidence: ConfidenceLevel;
  marketStability: ConfidenceLevel;
  liquidity: ConfidenceLevel;
  gradeConditionConfidence: ConfidenceLevel;
  salesVelocity: { sevenDay: number; thirtyDay: number; ninetyDay: number };
  daysSinceLastAuthoritativeSale: number | null;
  authoritativeSaleCount: number;
  recentSaleCount: number;
  oldestSaleAgeDays: number | null;
  comparableCount: number;
  rejectedComparableCount: number;
  exactMatchCount: number;
  nearMatchCount: number;
  directComparableCount: number;
  gradeAdjacentComparableCount: number;
  contextualComparableCount: number;
  duplicateSaleCount: number;
  possibleDuplicateCount: number;
  outlierExcludedCount: number;
  outlierFlaggedCount: number;
  outlierPolicy: 'iqr_applied' | 'flagged_small_sample' | 'not_applied_insufficient_sample' | 'not_applied_no_candidates';
  outlierEligibleSampleCount: number;
  independentMarketplaceCount: number;
  unknownMarketplaceCount: number;
  largestMarketplaceShare: number | null;
  marketplaceConcentration: 'diversified' | 'concentrated' | 'single_marketplace' | 'unavailable';
  sourceReliability: SourceReliabilityLevel;
  sourceReliabilityScore: number | null;
  sourceReliabilityReasons: string[];
  evidenceCoverage: MarketEvidenceCoverage;
  categoryEvidenceThresholds: CategoryEvidenceThresholds;
  adapterReliabilityHistory: AdapterReliabilityHistory[];
  confidenceReasons: string[];
  identityReadiness: 'ready' | 'limited' | 'missing_critical';
  valuationMethod: string;
  majorAssumptions: string[];
  missingInformation: string[];
  valuationWarnings: string[];
  comparables: ComparableMatch[];
  selectionDiagnostics: ComparableSelectionDiagnostics;
}

export interface ComparableIdentityGate {
  materialReviewRequired?: boolean;
  materialFlags?: string[];
  sourceAlignmentStatus?: 'aligned' | 'conflicted' | 'unavailable';
}

export type RangeRelationship = 'overlap' | 'item_a_higher_band' | 'item_b_higher_band' | 'unsupported';
export interface DeterministicTradeComparison {
  leftValue: number;
  rightValue: number;
  difference: number;
  differencePercentage: number;
  verdict: 'Insufficient Evidence' | 'Ranges Overlap — Evidence is Indeterminate' | 'Item A Worth More' | 'Item B Worth More';
  rangeRelationship: RangeRelationship;
  overlapBand: { low: number; high: number } | null;
  overlapAmount: number | null;
  overlapRatio: number | null;
  midpointDifference: number | null;
  typicalBandOverlap: { low: number; high: number } | null;
  rangeGap: number | null;
  decisionBasis: string;
}

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'this', 'that', 'item', 'card', 'graded', 'grade',
  'authentic', 'authenticated', 'original', 'new', 'used', 'near', 'mint', 'rookie',
]);

function parseDetails(item: ComparableTarget): Record<string, unknown> {
  if (!item.itemDetails) return {};
  try {
    const parsed = JSON.parse(item.itemDetails);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function textTokens(value: unknown): string[] {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function firstString(details: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function numericGrade(value: string | null | undefined): number | null {
  const match = String(value ?? '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizePcgsCoinGrade(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim();
  if (!/^[A-Za-z]{1,8}\s*\d{1,3}(?:\+)?(?:\s*[A-Za-z]{1,12})?$/i.test(normalized)) return null;
  return normalized.replace(/\s+/g, '').toUpperCase();
}

function extractPcgsCoinGrade(title: string): string | null {
  const match = title.match(/\bpcgs\s+(?:graded?\s+)?((?:[A-Za-z]{1,8}\s*)?\d{1,3}(?:\+)?)/i);
  return match ? normalizePcgsCoinGrade(match[1]) : null;
}

function normalizeCompany(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized || null;
}

function extractComparableNumber(title: string, category?: string): string | null {
  const labeled = title.match(/\b(?:issue|no\.?|number|card|pin)\s*#?\s*(\d{1,6})\b/i);
  if (labeled) return labeled[1];
  const hash = title.match(/#\s*(\d{1,6})\b/);
  if (hash) return hash[1];
  // Comic marketplace titles routinely omit # before an issue number. Only
  // recognize a bare integer when it sits directly before a grading/provider
  // phrase, so years and decimal grades cannot become false issue numbers.
  if (category === 'comics') {
    const bareComicIssue = title.match(/\b(\d{1,4})\s+(?:(?:marvel|dc|image|dark\s+horse|idw|dynamite|boom)\s+)?(?=(?:cgc|cbcs|pgx|cbc?s|graded|first\s+print|second\s+print|third\s+print|fourth\s+print|fifth\s+print)\b)/i);
    if (bareComicIssue) return bareComicIssue[1];
  }
  return null;
}

function normalizeComparableNumber(value: string | null | undefined): string | null {
  const match = String(value ?? '').match(/\d{1,6}/);
  return match ? String(Number(match[0])) : null;
}

function daysOld(date: string | null | undefined, nowMs: number): number | null {
  if (!date) return null;
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp) || timestamp > nowMs) return null;
  return Math.floor((nowMs - timestamp) / 86_400_000);
}

function percentile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function recencyWeight(ageDays: number | null): number {
  if (ageDays === null) return 0.45;
  return Math.max(0.25, Math.exp(-ageDays / 180));
}

function normalizeFingerprintText(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Removes tracking-only URL differences so the same marketplace record can be
 * recognized when it is returned through different adapters or query paths.
 */
export function normalizeCanonicalSaleUrl(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    const trackingParams = /^(utm_|fbclid$|gclid$|mkcid$|mkrid$|campid$|tooldomain$|customid$|hash$)/i;
    for (const key of [...parsed.searchParams.keys()]) {
      if (trackingParams.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    const query = parsed.searchParams.toString();
    return `${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return normalizeFingerprintText(raw) || null;
  }
}

function canonicalMarketplaceItemKey(sale: MarketSale): string | null {
  if (sale.canonicalTransactionId) return sale.canonicalTransactionId;
  const url = normalizeCanonicalSaleUrl(sale.url);
  if (url) return `url:${url}`;
  const stableId = String(sale.saleId ?? '').trim();
  if (stableId) return `item:${normalizeFingerprintText(stableId)}`;
  return null;
}

function probableTransactionKey(sale: MarketSale): string | null {
  const origin = normalizeFingerprintText(sale.originMarketplace || sale.marketplace);
  const title = normalizeFingerprintText(sale.title);
  const price = Number(sale.price);
  const date = String(sale.date ?? '').slice(0, 10);
  return origin && title && Number.isFinite(price) && price > 0 && date ? `probable:${origin}|${title}|${price.toFixed(2)}|${date}` : null;
}

function possibleTransactionKey(sale: MarketSale): string | null {
  const origin = normalizeFingerprintText(sale.originMarketplace || sale.marketplace);
  const title = normalizeFingerprintText(sale.title);
  const date = String(sale.date ?? '').slice(0, 10);
  return origin && title && date ? `possible:${origin}|${title}|${date}` : null;
}

export function deduplicateMarketSales(sales: MarketSale[]): { unique: MarketSale[]; duplicates: Array<{ sale: MarketSale; duplicateOf: string }>; possibleDuplicates: MarketSale[] } {
  const seenExact = new Map<string, string>();
  const seenProbable = new Map<string, string>();
  const seenPossible = new Map<string, string>();
  const unique: MarketSale[] = [];
  const duplicates: Array<{ sale: MarketSale; duplicateOf: string }> = [];
  const possibleDuplicates: MarketSale[] = [];
  for (const sale of sales) {
    const exactKey = canonicalMarketplaceItemKey(sale);
    const probableKey = probableTransactionKey(sale);
    const possibleKey = possibleTransactionKey(sale);
    const knownExact = exactKey ? seenExact.get(exactKey) : null;
    const knownProbable = probableKey ? seenProbable.get(probableKey) : null;
    if (knownExact || knownProbable) {
      duplicates.push({ sale: { ...sale, duplicateStatus: knownExact ? 'exact_duplicate' : 'probable_duplicate' }, duplicateOf: knownExact ?? knownProbable! });
      continue;
    }
    const knownPossible = possibleKey ? seenPossible.get(possibleKey) : null;
    const retained = knownPossible ? { ...sale, duplicateStatus: 'possible_duplicate' as const } : { ...sale, duplicateStatus: 'unique' as const };
    if (knownPossible) possibleDuplicates.push(retained);
    if (exactKey) seenExact.set(exactKey, exactKey);
    if (probableKey) seenProbable.set(probableKey, probableKey);
    if (possibleKey && !seenPossible.has(possibleKey)) seenPossible.set(possibleKey, possibleKey);
    unique.push(retained);
  }
  return { unique, duplicates, possibleDuplicates };
}

export const MAX_VALUATION_COMPARABLES = 48;

function sourceKey(sale: MarketSale): string {
  return String(sale.sourceId || sale.marketplace || 'unattributed').trim().toLowerCase() || 'unattributed';
}

function sourceLabel(sale: MarketSale): string {
  return String(sale.sourceLabel || sale.marketplace || sale.sourceId || 'Unattributed source').trim() || 'Unattributed source';
}

function marketplaceKey(sale: MarketSale): string {
  return normalizeFingerprintText(sale.originMarketplace || sale.marketplace || sale.sourceId || 'unattributed') || 'unattributed';
}

const KNOWN_SERVER_ADAPTERS = new Set([
  '130point', 'sold_comps', 'the_card_api', 'cardsight_ai', 'lelands', 'pristine_auction',
  'pcgs_auction_results', 'comicconnect', 'goldin', 'weiss', 'stephen_album', 'nate_sanders',
  'ngc', 'cng', 'coin_archives', 'hakes', 'morphy', 'theriaults', 'bertoia', 'rumsey',
  'cherrystone', 'raritan', 'poster_auctions', 'bonhams', 'hipstamp', 'pricecharting',
]);

const CATEGORY_EVIDENCE_THRESHOLDS: Record<string, Omit<CategoryEvidenceThresholds, 'category'>> = {
  comics: { minimumSelectedSales: 5, minimumIndependentMarketplaces: 2, maximumSpreadPct: 75, rationale: 'Issue, grade, variant, and slab differences can materially change comic values.' },
  sports_cards: { minimumSelectedSales: 5, minimumIndependentMarketplaces: 2, maximumSpreadPct: 75, rationale: 'Grade, parallel, and certification differences can materially change card values.' },
  pokemon: { minimumSelectedSales: 5, minimumIndependentMarketplaces: 2, maximumSpreadPct: 75, rationale: 'Set, card number, language, and grade need multiple independent confirmations.' },
  coins: { minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Mint, denomination, grade, and variety evidence is often thinner but still requires source breadth.' },
  stamps: { minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Country, catalog number, denomination, and hinge/use state can fragment the market.' },
  video_games: { minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Platform, edition, completeness, and grading state drive condition-sensitive prices.' },
  music: { minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Pressing, format, release year, and autograph state can differ across records.' },
  movies: { minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Format, release year, region, and graded/raw state must be cross-checked.' },
  vintage_toys: { minimumSelectedSales: 4, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Completeness, edition, packaging, and condition vary substantially.' },
  disney_pins: { minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Release, edition, set, and authenticity details can affect comparability.' },
  autographs: { minimumSelectedSales: 3, minimumIndependentMarketplaces: 2, maximumSpreadPct: 100, rationale: 'Signer, item type, authentication, and inscription details require corroboration.' },
};

export function getCategoryEvidenceThresholds(category: string): CategoryEvidenceThresholds {
  const normalized = String(category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const thresholds = CATEGORY_EVIDENCE_THRESHOLDS[normalized] ?? { minimumSelectedSales: 5, minimumIndependentMarketplaces: 2, maximumSpreadPct: 75, rationale: 'Unmapped categories use the conservative general evidence standard.' };
  return { category: normalized || 'unknown', ...thresholds };
}

function adapterKey(sale: MarketSale): string {
  return normalizeFingerprintText(sale.sourceAdapter || sale.sourceId || sale.sourceLabel || sale.marketplace || 'unattributed') || 'unattributed';
}

function buildAdapterReliabilityHistory(
  receivedSales: MarketSale[],
  selectedSales: MarketSale[],
  duplicateSales: MarketSale[],
  nowMs: number,
): AdapterReliabilityHistory[] {
  const keys = new Set([...receivedSales, ...selectedSales].map(adapterKey));
  return [...keys].sort().map((adapterId) => {
    const received = receivedSales.filter((sale) => adapterKey(sale) === adapterId).length;
    const selected = selectedSales.filter((sale) => adapterKey(sale) === adapterId);
    const duplicates = duplicateSales.filter((sale) => adapterKey(sale) === adapterId).length;
    const attributed = selected.filter((sale) => marketplaceKey(sale) !== 'unattributed').length;
    const currentWindow = selected.filter((sale) => {
      const age = daysOld(sale.date, nowMs);
      return age !== null && age <= 365;
    }).length;
    const selectionRatePct = received ? Math.round((selected.length / received) * 100) : 0;
    const reliability: SourceReliabilityLevel = !selected.length
      ? 'low'
      : attributed === selected.length && currentWindow >= Math.max(1, Math.ceil(selected.length / 2)) && selectionRatePct >= 25
        ? 'high'
        : attributed > 0 && currentWindow > 0 ? 'medium' : 'low';
    return { adapterId, receivedCount: received, selectedCount: selected.length, duplicateCount: duplicates, attributedCount: attributed, currentWindowCount: currentWindow, selectionRatePct, reliability };
  });
}

function assessMarketEvidenceCoverage(
  receivedSales: MarketSale[],
  selectedSales: MarketSale[],
  duplicateCount: number,
  nowMs: number,
): MarketEvidenceCoverage {
  const attributed = selectedSales.filter((sale) => marketplaceKey(sale) !== 'unattributed');
  const serverAttributed = selectedSales.filter((sale) => {
    const adapter = normalizeFingerprintText(sale.sourceAdapter || sale.sourceId);
    return Boolean(sale.provenanceToken || sale.observationId || (adapter && KNOWN_SERVER_ADAPTERS.has(adapter.replace(/ /g, '_'))));
  });
  const independent = new Set(attributed.map((sale) => marketplaceKey(sale))).size;
  const currentWindowCount = selectedSales.filter((sale) => {
    const age = daysOld(sale.date, nowMs);
    return age !== null && age <= 365;
  }).length;
  const duplicatePressurePct = receivedSales.length ? Math.round((duplicateCount / receivedSales.length) * 100) : null;
  const attributionRate = selectedSales.length ? attributed.length / selectedSales.length : 0;
  const serverRate = selectedSales.length ? serverAttributed.length / selectedSales.length : 0;
  const diversityScore = selectedSales.length ? Math.min(1, independent / 3) : 0;
  const score = selectedSales.length ? Math.round((attributionRate * 0.35 + serverRate * 0.35 + diversityScore * 0.3) * 100) : null;
  const reasons: string[] = [];
  if (!selectedSales.length) reasons.push('No selected completed sales are available to assess source reliability.');
  else {
    reasons.push(`${attributed.length} of ${selectedSales.length} selected sales have an attributable marketplace.`);
    reasons.push(`${serverAttributed.length} of ${selectedSales.length} selected sales have a recognized server adapter or signed observation reference.`);
    reasons.push(`${independent} independent marketplace${independent === 1 ? '' : 's'} support the selected evidence.`);
    if (!currentWindowCount) reasons.push('No selected sale is within the current one-year evidence window.');
    if (duplicatePressurePct !== null && duplicatePressurePct >= 25) reasons.push(`Duplicate pressure is ${duplicatePressurePct}% of received records and may overstate source breadth.`);
  }
  const sourceReliability: SourceReliabilityLevel = !selectedSales.length
    ? 'unavailable'
    : score !== null && score >= 80 && independent >= 2 ? 'high'
      : score !== null && score >= 50 ? 'medium'
        : 'low';
  return {
    receivedCount: receivedSales.length,
    selectedCount: selectedSales.length,
    attributedCount: attributed.length,
    serverAttributedCount: serverAttributed.length,
    independentMarketplaceCount: independent,
    currentWindowCount,
    duplicatePressurePct,
    sourceReliability,
    sourceReliabilityScore: score,
    sourceReliabilityReasons: reasons,
  };
}

export function isCompletedSaleCandidate(sale: MarketSale, nowMs: number): boolean {
  if (sale.evidenceDisposition && sale.evidenceDisposition !== 'valuation_eligible') return false;
  if (sale.saleStatus && sale.saleStatus !== 'completed') return false;
  if (sale.priceBasis === 'unknown') return false;
  if (sale.recency === 'historical' || sale.recency === 'undated') return false;
  const age = daysOld(sale.date, nowMs);
  return age !== null && (age <= 365 || (sale.recency === 'extended' && age <= 730));
}

function compareValuationPriority(
  left: { match: ComparableMatch; ageDays: number | null },
  right: { match: ComparableMatch; ageDays: number | null },
): number {
  if (right.match.score !== left.match.score) return right.match.score - left.match.score;
  const leftAge = left.ageDays ?? Number.MAX_SAFE_INTEGER;
  const rightAge = right.ageDays ?? Number.MAX_SAFE_INTEGER;
  if (leftAge !== rightAge) return leftAge - rightAge;
  // Never use the outcome (sale price) to choose which comparable enters the
  // valuation set. Canonical transaction identity makes tie handling stable.
  const leftKey = left.match.canonicalTransactionId || left.match.observationId || left.match.url || left.match.saleId || left.match.title;
  const rightKey = right.match.canonicalTransactionId || right.match.observationId || right.match.url || right.match.saleId || right.match.title;
  return leftKey.localeCompare(rightKey);
}

function buildSelectionDiagnostics(
  sales: MarketSale[],
  deduplicated: ReturnType<typeof deduplicateMarketSales>,
  valuationCandidates: MarketSale[],
  valuationMatches: Array<{ sale: MarketSale; match: ComparableMatch; ageDays: number | null }>,
  selected: Set<ComparableMatch>,
  cap: number,
): ComparableSelectionDiagnostics {
  const bySource = new Map<string, ComparableSourceDiagnostic>();
  const ensure = (sale: MarketSale) => {
    const key = sourceKey(sale);
    const current = bySource.get(key);
    if (current) return current;
    const created: ComparableSourceDiagnostic = {
      sourceId: key,
      sourceLabel: sourceLabel(sale),
      received: 0,
      duplicate: 0,
      eligibleCompleted: 0,
      acceptedIdentity: 0,
      selectedForValuation: 0,
      omittedByCap: 0,
    };
    bySource.set(key, created);
    return created;
  };
  sales.forEach((sale) => { ensure(sale).received += 1; });
  deduplicated.duplicates.forEach(({ sale }) => { ensure(sale).duplicate += 1; });
  valuationCandidates.forEach((sale) => { ensure(sale).eligibleCompleted += 1; });
  valuationMatches.forEach(({ sale, match }) => {
    if (match.accepted) {
      const diagnostic = ensure(sale);
      diagnostic.acceptedIdentity += 1;
      if (selected.has(match)) diagnostic.selectedForValuation += 1;
      else diagnostic.omittedByCap += 1;
    }
  });
  const acceptedIdentity = valuationMatches.filter(({ match }) => match.accepted).length;
  const selectedForValuation = [...selected].length;
  return {
    cap,
    received: sales.length,
    deduplicated: deduplicated.unique.length,
    eligibleCompleted: valuationCandidates.length,
    acceptedIdentity,
    selectedForValuation,
    omittedByCap: Math.max(0, acceptedIdentity - selectedForValuation),
    sources: [...bySource.values()].sort((a, b) => a.sourceLabel.localeCompare(b.sourceLabel)),
  };
}

/**
 * Scores every eligible record, reserves one strongest match per source when
 * possible, then fills the remaining bounded set by match quality and recency.
 * This prevents first-arriving records or one prolific source from silently
 * displacing the rest of the evidence ledger.
 */
export function selectBalancedComparableSales(
  target: ComparableTarget,
  sales: MarketSale[],
  now = new Date(),
  cap = MAX_VALUATION_COMPARABLES,
) {
  const nowMs = now.getTime();
  const deduplicated = deduplicateMarketSales(sales);
  const valuationCandidates = deduplicated.unique.filter((sale) => isCompletedSaleCandidate(sale, nowMs));
  const valuationMatches = valuationCandidates
    .filter((sale) => String(sale.currency ?? 'UNKNOWN').toUpperCase() === 'USD')
    .map((sale) => ({ sale, match: scoreComparable(target, sale), ageDays: daysOld(sale.date, nowMs) }));
  const accepted = valuationMatches.filter(({ match }) => match.accepted);
  const perMarketplace = new Map<string, typeof accepted>();
  for (const candidate of accepted) {
    const key = marketplaceKey(candidate.sale);
    const bucket = perMarketplace.get(key) ?? [];
    bucket.push(candidate);
    perMarketplace.set(key, bucket);
  }
  const selected: typeof accepted = [];
  for (const bucket of [...perMarketplace.values()].sort((left, right) => compareValuationPriority(left[0]!, right[0]!))) {
    bucket.sort(compareValuationPriority);
    if (selected.length < cap) selected.push(bucket[0]!);
  }
  const selectedMatches = new Set(selected.map(({ match }) => match));
  for (const candidate of accepted.sort(compareValuationPriority)) {
    if (selected.length >= cap) break;
    if (!selectedMatches.has(candidate.match)) {
      selected.push(candidate);
      selectedMatches.add(candidate.match);
    }
  }
  return {
    deduplicated,
    valuationCandidates,
    valuationMatches,
    selected,
    selectedMatches,
    diagnostics: buildSelectionDiagnostics(sales, deduplicated, valuationCandidates, valuationMatches, selectedMatches, cap),
  };
}

function normalizedIdentityText(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function titleContainsExpectedPhrase(title: string, expected: string | null): boolean {
  const expectedTokens = textTokens(expected);
  if (!expectedTokens.length) return false;
  const titleTokens = new Set(textTokens(title));
  return expectedTokens.every((token) => titleTokens.has(token));
}

function titleYears(title: string): string[] {
  return [...new Set(title.match(/\b(?:18|19|20)\d{2}\b/g) ?? [])];
}

function knownBrandConflict(title: string, expected: string | null, brands: string[]): string | null {
  const normalizedTitle = ` ${normalizedIdentityText(title)} `;
  const normalizedExpected = normalizedIdentityText(expected);
  const observed = brands.find((brand) => normalizedTitle.includes(` ${brand} `));
  return observed && observed !== normalizedExpected ? observed : null;
}

function coinDenominationMatches(title: string, denomination: string | null): boolean {
  const normalizedTitle = normalizedIdentityText(title);
  const normalizedDenomination = normalizedIdentityText(denomination);
  if (!normalizedDenomination) return false;
  const numericFaceValue = /^\$?\d+(?:c|¢)?$/i.test(String(denomination ?? '').trim());
  if (!numericFaceValue && normalizedTitle.includes(normalizedDenomination)) return true;
  const aliases: Record<string, string[]> = {
    '1': ['dollar', 'one dollar'],
    '50c': ['half dollar'],
    '50': ['half dollar'],
    '25c': ['quarter'],
    '25': ['quarter'],
    '10c': ['dime'],
    '10': ['dime'],
    '5c': ['nickel'],
    '5': ['nickel'],
  };
  return (aliases[normalizedDenomination] ?? []).some((alias) => normalizedTitle.includes(alias));
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  us: ['us', 'usa', 'united states', 'united states of america'],
  canada: ['canada'],
  uk: ['uk', 'united kingdom', 'great britain', 'england'],
  france: ['france'],
  germany: ['germany', 'deutschland'],
  japan: ['japan'],
  australia: ['australia'],
  italy: ['italy'],
  spain: ['spain'],
  mexico: ['mexico'],
};

function canonicalCountry(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  return Object.entries(COUNTRY_ALIASES).find(([, aliases]) => aliases.includes(normalized))?.[0] ?? normalized;
}

function countryInTitle(title: string): string | null {
  const normalizedTitle = ` ${normalizedIdentityText(title)} `;
  const known = Object.entries(COUNTRY_ALIASES)
    .flatMap(([key, aliases]) => aliases.map((alias) => ({ key, alias })))
    .sort((left, right) => right.alias.length - left.alias.length)
    .find(({ alias }) => normalizedTitle.includes(` ${alias} `));
  return known?.key ?? null;
}

function countryStatus(title: string, expected: string | null): { matches: boolean; conflict: string | null } {
  const expectedCountry = canonicalCountry(expected);
  if (!expectedCountry) return { matches: false, conflict: null };
  const observedCountry = countryInTitle(title);
  if (observedCountry && observedCountry !== expectedCountry) return { matches: false, conflict: observedCountry };
  return { matches: observedCountry === expectedCountry || titleContainsExpectedPhrase(title, expected), conflict: null };
}

function normalizedCatalogCode(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized || null;
}

function titleContainsCatalogCode(title: string, expected: string | null): boolean {
  const target = normalizedCatalogCode(expected);
  if (!target) return false;
  const pattern = target.split('').map((character) => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s.-]*');
  return new RegExp(`(?:^|[^A-Z0-9])${pattern}(?:$|[^A-Z0-9])`, 'i').test(title);
}

function catalogCodesInTitle(title: string): string[] {
  const labeled = [...title.matchAll(/\b(?:scott|sc\.?|catalog(?:\s*(?:no\.?|number|#))?|upc|barcode|model(?:\s*(?:no\.?|number|#))?|product\s*code)\s*#?\s*([A-Za-z]{0,6}\s*-?\s*\d{1,14}[A-Za-z]?)/gi)]
    .map((match) => normalizedCatalogCode(match[1]));
  const compact = [...title.matchAll(/\b([A-Za-z]{1,5}\s*-?\s*\d{2,8}[A-Za-z]?)\b/g)]
    .map((match) => normalizedCatalogCode(match[1]));
  return [...new Set([...labeled, ...compact].filter((value): value is string => Boolean(value)))];
}

function catalogStatus(title: string, expected: string | null): { matches: boolean; conflict: string | null } {
  const target = normalizedCatalogCode(expected);
  if (!target) return { matches: false, conflict: null };
  if (titleContainsCatalogCode(title, target)) return { matches: true, conflict: null };
  const observed = catalogCodesInTitle(title).find((code) => code !== target);
  return { matches: false, conflict: observed ?? null };
}

function normalizedStampDenomination(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return null;
  const cents = raw.match(/^(\d+(?:\.\d+)?)(?:c|¢|cent|cents)$/);
  if (cents) return `${cents[1]}c`;
  const dollars = raw.match(/^\$?(\d+(?:\.\d+)?)(?:dollar|dollars)$/) || raw.match(/^\$(\d+(?:\.\d+)?)$/);
  if (dollars) return `$${dollars[1]}`;
  return raw;
}

function stampDenominationsInTitle(title: string): string[] {
  const matches = [...title.matchAll(/(?:\$\s*\d+(?:\.\d+)?|\b\d+(?:\.\d+)?\s*(?:c|¢|cents?|dollars?)\b)/gi)];
  return [...new Set(matches.map((match) => normalizedStampDenomination(match[0])).filter((value): value is string => Boolean(value)))];
}

function stampDenominationStatus(title: string, expected: string | null): { matches: boolean; conflict: string | null } {
  const target = normalizedStampDenomination(expected);
  if (!target) return { matches: false, conflict: null };
  const observed = stampDenominationsInTitle(title);
  if (observed.includes(target)) return { matches: true, conflict: null };
  return { matches: false, conflict: observed[0] ?? null };
}

type StampHingeState = 'hinged' | 'unhinged' | 'unknown';
type StampUseState = 'mint' | 'used' | 'cto' | 'unknown';

function stampHingeState(value: string | null | undefined): StampHingeState {
  const normalized = normalizedIdentityText(value);
  if (/\bmnh\b|never hinged|unhinged/.test(normalized)) return 'unhinged';
  if (/\bmh\b|\bhinged\b|previously hinged|^yes$/.test(normalized)) return 'hinged';
  if (/^no$/.test(normalized)) return 'unhinged';
  return 'unknown';
}

function stampUseState(value: string | null | undefined): StampUseState {
  const normalized = normalizedIdentityText(value);
  if (/\bcto\b|cancelled to order/.test(normalized)) return 'cto';
  if (/\bused\b|postally used/.test(normalized)) return 'used';
  if (/\bmint\b|\bmnh\b|\bmh\b|never hinged/.test(normalized)) return 'mint';
  return 'unknown';
}

type VideoGameObjectForm = 'game' | 'console' | 'accessory' | 'unknown';

function videoGameObjectForm(value: string | null | undefined): VideoGameObjectForm {
  const normalized = normalizedIdentityText(value);
  if (/\bconsole\b|system unit|hardware bundle/.test(normalized)) return 'console';
  if (/\baccessor(?:y|ies)\b|controller|memory card|manual only|case only|box only/.test(normalized)) return 'accessory';
  if (/\bgame\b|cartridge|disc|software|video game/.test(normalized)) return 'game';
  return 'unknown';
}

const PLATFORM_LABELS: Record<string, string[]> = {
  nes: ['nes', 'nintendo entertainment system'],
  snes: ['snes', 'super nintendo', 'super nintendo entertainment system'],
  n64: ['n64', 'nintendo 64'],
  gamecube: ['gamecube', 'game cube'],
  wii_u: ['wii u'],
  wii: ['wii'],
  switch: ['nintendo switch', 'switch'],
  gb: ['game boy', 'gb'],
  gba: ['game boy advance', 'gba'],
  ds: ['nintendo ds', 'ds'],
  '3ds': ['nintendo 3ds', '3ds'],
  ps1: ['ps1', 'ps one', 'playstation 1'],
  ps2: ['ps2', 'playstation 2'],
  ps3: ['ps3', 'playstation 3'],
  ps4: ['ps4', 'playstation 4'],
  ps5: ['ps5', 'playstation 5'],
  xbox_360: ['xbox 360'],
  xbox_one: ['xbox one'],
  xbox_series: ['xbox series'],
  xbox: ['xbox'],
  genesis: ['sega genesis', 'mega drive'],
  saturn: ['sega saturn', 'saturn'],
  dreamcast: ['dreamcast'],
  game_gear: ['game gear'],
  atari_2600: ['atari 2600'],
};

function platformKey(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  return Object.entries(PLATFORM_LABELS).find(([, aliases]) => aliases.includes(normalized))?.[0] ?? normalized;
}

function platformsInTitle(title: string): string[] {
  const normalizedTitle = ` ${normalizedIdentityText(title)} `;
  const matches = Object.entries(PLATFORM_LABELS)
    .filter(([key, aliases]) => {
      if (key === 'wii' && normalizedTitle.includes(' wii u ')) return false;
      if (key === 'xbox' && / xbox (?:360|one|series) /.test(normalizedTitle)) return false;
      return aliases.some((alias) => normalizedTitle.includes(` ${alias} `));
    })
    .map(([key]) => key);
  if (!matches.some((key) => key.startsWith('ps')) && normalizedTitle.includes(' playstation ') && !/ playstation [2-5] /.test(normalizedTitle)) matches.push('ps1');
  return [...new Set(matches)];
}

function videoGamePackageState(value: string | null | undefined): 'sealed' | 'cib' | 'loose' | 'unknown' {
  const normalized = normalizedIdentityText(value);
  if (/factory sealed|brand new sealed|\bsealed\b/.test(normalized)) return 'sealed';
  if (/complete in box|\bcib\b/.test(normalized)) return 'cib';
  if (/\bloose\b|cartridge only|disc only|game only/.test(normalized)) return 'loose';
  return 'unknown';
}

function videoGameEdition(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  if (/greatest hits/.test(normalized)) return 'greatest_hits';
  if (/platinum hits/.test(normalized)) return 'platinum_hits';
  if (/collector s edition|collectors edition/.test(normalized)) return 'collectors_edition';
  if (/deluxe edition/.test(normalized)) return 'deluxe_edition';
  if (/reissue|re release/.test(normalized)) return 'reissue';
  if (/original release|first release|launch edition/.test(normalized)) return 'original_release';
  return normalized;
}

const REGION_LABELS: Record<string, string[]> = {
  us: ['us', 'usa', 'united states', 'north america', 'ntsc u', 'ntsc'],
  japan: ['japan', 'japanese', 'ntsc j'],
  europe: ['europe', 'eu', 'pal', 'uk'],
  australia: ['australia', 'aus'],
  world: ['worldwide', 'global', 'world'],
};

function regionKey(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  return Object.entries(REGION_LABELS).find(([, aliases]) => aliases.includes(normalized))?.[0] ?? normalized;
}

function regionInTitle(title: string): string | null {
  const normalizedTitle = ` ${normalizedIdentityText(title)} `;
  return Object.entries(REGION_LABELS)
    .flatMap(([key, aliases]) => aliases.map((alias) => ({ key, alias })))
    .sort((left, right) => right.alias.length - left.alias.length)
    .find(({ alias }) => normalizedTitle.includes(` ${alias} `))?.key ?? null;
}

function musicFormat(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  if (/\bvinyl\b|\blp\b|\brecord\b/.test(normalized)) return 'vinyl';
  if (/\bcd\b|compact disc/.test(normalized)) return 'cd';
  if (/cassette|\btape\b/.test(normalized)) return 'cassette';
  if (/8 track|eight track/.test(normalized)) return '8_track';
  if (/reel to reel/.test(normalized)) return 'reel_to_reel';
  return normalized;
}

const RECORD_LABELS = ['columbia', 'blue note', 'capitol', 'emi', 'decca', 'atlantic', 'warner', 'rca', 'motown', 'verve', 'prestige', 'mercury', 'parlophone', 'island', 'virgin', 'def jam', 'a m'];

function recordLabelInTitle(title: string): string | null {
  const normalizedTitle = ` ${normalizedIdentityText(title)} `;
  return RECORD_LABELS.find((label) => normalizedTitle.includes(` ${label} `)) ?? null;
}

function musicPressing(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  if (/first pressing|original pressing/.test(normalized)) return 'first_pressing';
  if (/second pressing/.test(normalized)) return 'second_pressing';
  if (/reissue|re release/.test(normalized)) return 'reissue';
  if (/remaster/.test(normalized)) return 'remaster';
  if (/\bmono\b/.test(normalized)) return 'mono';
  if (/\bstereo\b/.test(normalized)) return 'stereo';
  return normalized;
}

function musicArtistAndReleaseFromTitle(title: string): { artist: string; release: string } | null {
  const separator = title.match(/^(.{2,100}?)\s+-\s+(.{2,160})$/);
  if (!separator) return null;
  return { artist: separator[1]!.trim(), release: separator[2]!.trim() };
}

type PinEdition = { kind: 'open' | 'limited'; size: string | null };

function pinEdition(value: string | null | undefined, size?: string | null): PinEdition | null {
  const normalized = normalizedIdentityText(value);
  const explicitSize = String(size ?? '').match(/\d{1,6}/)?.[0] ?? null;
  if (/open edition|\boe\b/.test(normalized)) return { kind: 'open', size: null };
  const embeddedSize = normalized.match(/(?:limited edition|\ble\b)\s*#?\s*(\d{1,6})/)?.[1] ?? normalized.match(/^\d{1,6}$/)?.[0] ?? null;
  if (/limited edition|\ble\b|^\d{1,6}$/.test(normalized) || explicitSize) return { kind: 'limited', size: explicitSize ?? embeddedSize };
  return null;
}

function pinEditionInTitle(title: string): PinEdition | null {
  return pinEdition(title);
}

type PinForm = 'single' | 'lot' | 'set' | 'unknown';

function pinForm(value: string | null | undefined): PinForm {
  const normalized = normalizedIdentityText(value);
  if (/\blot\b|\bbundle\b|\bcollection\b|additional disney pins|\d+\s+pins/.test(normalized)) return 'lot';
  if (/\bset\b/.test(normalized)) return 'set';
  if (/single pin|single|\bpin\b/.test(normalized)) return 'single';
  return 'unknown';
}

const DISNEY_CONTEXT_TERMS = ['d23', 'epcot', 'disneyland', 'disney world', 'walt disney world', 'disneyland paris', 'disney cruise line', 'disney store', 'disney auction', 'pin trading night', 'mickey s of glendale', 'cast member', 'wdi'];

function disneyContextInTitle(title: string): string | null {
  const normalizedTitle = ` ${normalizedIdentityText(title)} `;
  return DISNEY_CONTEXT_TERMS.find((term) => normalizedTitle.includes(` ${term} `)) ?? null;
}

type ToyPackagingState = 'sealed' | 'opened' | 'no_box' | 'unknown';
type ToyCompletenessState = 'complete' | 'incomplete' | 'unknown';

function toyPackagingState(value: string | null | undefined): ToyPackagingState {
  const normalized = normalizedIdentityText(value);
  if (/no box|without box|loose/.test(normalized)) return 'no_box';
  if (/sealed|unopened|new in box|new old stock/.test(normalized)) return 'sealed';
  if (/opened|open box|boxed/.test(normalized)) return 'opened';
  return 'unknown';
}

function toyCompletenessState(value: string | null | undefined): ToyCompletenessState {
  const normalized = normalizedIdentityText(value);
  if (/^yes$|complete|100 percent complete/.test(normalized)) return 'complete';
  if (/^no$|incomplete|missing parts|parts missing/.test(normalized)) return 'incomplete';
  return 'unknown';
}

type VintageToyForm = 'action_figure' | 'vehicle' | 'playset' | 'plush' | 'building_set' | 'model_kit' | 'board_game' | 'electronic_toy' | 'unknown';

function vintageToyForm(value: string | null | undefined): VintageToyForm {
  const normalized = normalizedIdentityText(value);
  if (/action figure|figure|doll/.test(normalized)) return 'action_figure';
  if (/vehicle|car|truck|ship|plane|train|bike/.test(normalized)) return 'vehicle';
  if (/playset|play set/.test(normalized)) return 'playset';
  if (/plush|stuffed|soft toy/.test(normalized)) return 'plush';
  if (/lego|building set|construction set/.test(normalized)) return 'building_set';
  if (/model kit|model\b/.test(normalized)) return 'model_kit';
  if (/board game|puzzle/.test(normalized)) return 'board_game';
  if (/electronic toy|electronic game|handheld game/.test(normalized)) return 'electronic_toy';
  return 'unknown';
}

function toyVariantKey(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  if (/first release|first issue|original release/.test(normalized)) return 'first_release';
  if (/second release|second issue/.test(normalized)) return 'second_release';
  if (/reissue|re release/.test(normalized)) return 'reissue';
  const colorVariant = normalized.match(/\b(red|blue|green|yellow|black|white|silver|gold)\s+(card|variant|version|edition)\b/);
  if (colorVariant) return `${colorVariant[1]}_${colorVariant[2]}`;
  const numberedVariant = normalized.match(/\b(?:variant|version|edition)\s*#?\s*(\d{1,4})\b/);
  if (numberedVariant) return `version_${numberedVariant[1]}`;
  return normalized.replace(/[^a-z0-9]/g, '') || null;
}

function toyVariantsInTitle(title: string): string[] {
  const matches = [
    ...title.matchAll(/\b(?:first|second)\s+(?:release|issue)|\boriginal release\b|\bre[-\s]?issue\b/gi),
    ...title.matchAll(/\b(?:red|blue|green|yellow|black|white|silver|gold)\s+(?:card|variant|version|edition)\b/gi),
    ...title.matchAll(/\b(?:variant|version|edition)\s*#?\s*\d{1,4}\b/gi),
  ].map((match) => toyVariantKey(match[0])).filter((value): value is string => Boolean(value));
  return [...new Set(matches)];
}

const TOY_BRANDS = ['hasbro', 'mattel', 'kenner', 'lego', 'mega bloks', 'fisher price', 'playmates', 'bandai', 'takara', 'mattel', 'mego', 'ideal', 'tonka'];

type AutographItemForm = 'jersey' | 'baseball' | 'football' | 'basketball' | 'hockey_puck' | 'helmet' | 'bat' | 'glove' | 'photo' | 'card' | 'guitar' | 'book' | 'poster' | 'unknown';

function autographItemForm(value: string | null | undefined): AutographItemForm {
  const normalized = normalizedIdentityText(value);
  if (/hockey puck|puck/.test(normalized)) return 'hockey_puck';
  if (/jersey/.test(normalized)) return 'jersey';
  if (/baseball/.test(normalized)) return 'baseball';
  if (/football/.test(normalized)) return 'football';
  if (/basketball/.test(normalized)) return 'basketball';
  if (/helmet/.test(normalized)) return 'helmet';
  if (/bat\b/.test(normalized)) return 'bat';
  if (/glove/.test(normalized)) return 'glove';
  if (/photo|photograph|8x10/.test(normalized)) return 'photo';
  if (/card\b/.test(normalized)) return 'card';
  if (/guitar/.test(normalized)) return 'guitar';
  if (/book\b/.test(normalized)) return 'book';
  if (/poster/.test(normalized)) return 'poster';
  return 'unknown';
}

const AUTOGRAPH_AUTH_COMPANIES: Record<string, string[]> = {
  jsa: ['jsa', 'james spence'],
  psa_dna: ['psa dna', 'psadna'],
  bas: ['bas', 'beckett', 'beckett authentication'],
  fanatics: ['fanatics'],
  steiner: ['steiner'],
  tristar: ['tristar'],
};

function autographAuthenticationCompany(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  return Object.entries(AUTOGRAPH_AUTH_COMPANIES)
    .find(([, aliases]) => aliases.some((alias) => normalized === alias || normalized.includes(alias)))?.[0] ?? normalized;
}

function autographAuthenticationInTitle(title: string): string | null {
  const normalizedTitle = ` ${normalizedIdentityText(title)} `;
  return Object.entries(AUTOGRAPH_AUTH_COMPANIES)
    .find(([, aliases]) => aliases.some((alias) => normalizedTitle.includes(` ${alias} `)))?.[0] ?? null;
}

function autographCertificateInTitle(title: string): string | null {
  const match = title.match(/\b(?:cert(?:ificate)?|authentication|hologram)\s*(?:no\.?|number|#|id)?\s*[:#-]?\s*([A-Za-z]{0,6}\d{3,20}[A-Za-z0-9-]*)\b/i);
  return match ? normalizedCatalogCode(match[1]) : null;
}

function declaredAutographSigner(title: string): string | null {
  const match = title.match(/\bsigned\s+by\s+([A-Za-z][A-Za-z .'-]{1,80}?)(?=\s+(?:autograph(?:ed)?|signed|jersey|helmet|baseball|football|basketball|puck|photo|poster|card|guitar|book|with|jsa|psa|beckett|bas|coa|cert)\b|$)/i);
  return match?.[1]?.trim() ?? null;
}

type AutographInscription = { state: 'present' | 'absent' | 'unknown'; key: string | null };

function autographInscription(value: string | null | undefined): AutographInscription {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return { state: 'unknown', key: null };
  if (/no inscription|without inscription|not inscribed|^no$/.test(normalized)) return { state: 'absent', key: null };
  const hof = normalized.match(/\bhof\s*['’]?\s*(\d{2,4})\b/);
  if (hof) return { state: 'present', key: `hof_${hof[1]}` };
  const personalized = normalized.match(/\bto\s+([a-z][a-z .'-]{1,48})\b/);
  if (personalized && /inscrib|personalized|signed/.test(normalized)) return { state: 'present', key: `to_${personalized[1].trim().replace(/[^a-z0-9]+/g, '_')}` };
  if (/inscrib|personalized|rookie|mvp|champion|goat|^yes$/.test(normalized)) return { state: 'present', key: null };
  return { state: 'unknown', key: null };
}

type MovieFormat = 'blu_ray' | '4k' | 'dvd' | 'vhs' | 'laserdisc' | 'digital' | 'unknown';
type MovieEdition = 'steelbook' | 'criterion' | 'directors_cut' | 'extended_cut' | 'collectors_edition' | '3d' | 'standard' | 'unknown';

function movieFormat(value: string | null | undefined): MovieFormat {
  const normalized = normalizedIdentityText(value);
  if (/4k|ultra hd|uhd/.test(normalized)) return '4k';
  if (/blu ray|bluray/.test(normalized)) return 'blu_ray';
  if (/dvd/.test(normalized)) return 'dvd';
  if (/vhs|videocassette/.test(normalized)) return 'vhs';
  if (/laserdisc|laser disc/.test(normalized)) return 'laserdisc';
  if (/digital|itunes|vudu/.test(normalized)) return 'digital';
  return 'unknown';
}

function movieEdition(value: string | null | undefined): MovieEdition {
  const normalized = normalizedIdentityText(value);
  if (/steelbook/.test(normalized)) return 'steelbook';
  if (/criterion/.test(normalized)) return 'criterion';
  if (/director s cut|directors cut/.test(normalized)) return 'directors_cut';
  if (/extended (?:edition|cut)|special extended/.test(normalized)) return 'extended_cut';
  if (/collector s edition|collectors edition|limited edition/.test(normalized)) return 'collectors_edition';
  if (/\b3d\b/.test(normalized)) return '3d';
  if (/standard edition|theatrical edition/.test(normalized)) return 'standard';
  return 'unknown';
}

function moviePackageState(value: string | null | undefined): 'sealed' | 'opened' | 'unknown' {
  const normalized = normalizedIdentityText(value);
  if (/sealed|unopened|new in shrink/.test(normalized)) return 'sealed';
  if (/opened|pre owned|used/.test(normalized)) return 'opened';
  return 'unknown';
}

type MovieCollectibleForm = 'media' | 'poster' | 'prop' | 'lobby_card' | 'unknown';
type MoviePosterFormat = 'one_sheet' | 'quad' | 'insert' | 'half_sheet' | 'lobby_card' | 'unknown';
type MoviePropType = 'costume' | 'script' | 'helmet' | 'weapon' | 'model' | 'mask' | 'prop' | 'unknown';

function movieCollectibleForm(value: string | null | undefined): MovieCollectibleForm {
  const normalized = normalizedIdentityText(value);
  if (/lobby card/.test(normalized)) return 'lobby_card';
  if (/poster|one sheet|quad|half sheet|insert/.test(normalized)) return 'poster';
  if (/screen used|screen worn|prop|costume|wardrobe|script|helmet|weapon|mask/.test(normalized)) return 'prop';
  if (movieFormat(normalized) !== 'unknown') return 'media';
  return 'unknown';
}

function moviePosterFormat(value: string | null | undefined): MoviePosterFormat {
  const normalized = normalizedIdentityText(value);
  if (/lobby card/.test(normalized)) return 'lobby_card';
  if (/one sheet|1 sheet|27\s*(?:x|by)\s*40/.test(normalized)) return 'one_sheet';
  if (/quad|30\s*(?:x|by)\s*40/.test(normalized)) return 'quad';
  if (/insert|14\s*(?:x|by)\s*36/.test(normalized)) return 'insert';
  if (/half sheet|22\s*(?:x|by)\s*28/.test(normalized)) return 'half_sheet';
  return 'unknown';
}

function moviePosterSize(value: string | null | undefined): string | null {
  const match = String(value ?? '').match(/\b(\d{1,3})\s*(?:x|×|by)\s*(\d{1,3})\b/i);
  return match ? `${match[1]}x${match[2]}` : null;
}

function moviePropType(value: string | null | undefined): MoviePropType {
  const normalized = normalizedIdentityText(value);
  if (/costume|wardrobe|screen worn/.test(normalized)) return 'costume';
  if (/script|screenplay/.test(normalized)) return 'script';
  if (/helmet/.test(normalized)) return 'helmet';
  if (/weapon|sword|blaster|gun/.test(normalized)) return 'weapon';
  if (/model|miniature/.test(normalized)) return 'model';
  if (/mask/.test(normalized)) return 'mask';
  if (/prop|screen used/.test(normalized)) return 'prop';
  return 'unknown';
}

function movieScreenUseState(value: string | null | undefined): 'screen_used' | 'replica' | 'unknown' {
  const normalized = normalizedIdentityText(value);
  if (/replica|reproduction|display replica/.test(normalized)) return 'replica';
  if (/^yes$|screen used|screen worn|production used|hero prop/.test(normalized)) return 'screen_used';
  return 'unknown';
}

function coinMintMark(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  return /^(?:P|D|S|O|CC|W)$/.test(normalized) ? normalized : null;
}

function coinMintMarksInTitle(title: string): string[] {
  const matches = [
    ...title.matchAll(/\b(?:18|19|20)\d{2}\s*[-/]\s*(P|D|S|O|CC|W)\b/gi),
    ...title.matchAll(/\b(?:18|19|20)\d{2}\s+(P|D|S|O|CC|W)\s+mint\b/gi),
    ...title.matchAll(/\b(?:mint\s*(?:mark)?|(?:P|D|S|O|CC|W)\s*mint)\s*[:#-]?\s*(P|D|S|O|CC|W)\b/gi),
  ].map((match) => coinMintMark(match[1] ?? match[2])).filter((value): value is string => Boolean(value));
  return [...new Set(matches)];
}

function coinVarietyKey(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  if (/doubled die obverse|\bddo\b/.test(normalized)) return 'ddo';
  if (/doubled die reverse|\bddr\b/.test(normalized)) return 'ddr';
  if (/repunched mint mark|\brpm\b/.test(normalized)) return 'rpm';
  if (/deep cameo|\bdcam\b/.test(normalized)) return 'dcam';
  if (/cameo|\bcam\b/.test(normalized)) return 'cam';
  if (/full bands|\bfb\b/.test(normalized)) return 'fb';
  if (/full bell lines|\bfbl\b/.test(normalized)) return 'fbl';
  if (/full head|\bfh\b/.test(normalized)) return 'fh';
  const vam = normalized.match(/\bvam\s*-?\s*(\d+[a-z]?)\b/);
  if (vam) return `vam${vam[1]}`;
  return normalized.replace(/[^a-z0-9]/g, '') || null;
}

function coinVarietiesInTitle(title: string): string[] {
  const tokens = [
    ...title.matchAll(/\bVAM\s*-?\s*\d+[A-Za-z]?\b/gi),
    ...title.matchAll(/\b(?:DDO|DDR|RPM|DCAM|CAM|FBL|FB|FH|DMPL|PL)\b/gi),
    ...title.matchAll(/\b(?:doubled die (?:obverse|reverse)|repunched mint mark|deep cameo|full bell lines|full bands|full head|small date|large date|overdate)\b/gi),
  ].map((match) => coinVarietyKey(match[0])).filter((value): value is string => Boolean(value));
  return [...new Set(tokens)];
}

/**
 * Category gates can only withhold a sale from direct valuation. They never
 * delete a returned record, so sparse marketplace wording remains visible in
 * the evidence ledger for administrator review.
 */
export function assessComparableCategoryIdentity(
  target: ComparableTarget,
  details: Record<string, unknown>,
  title: string,
  observedNumber: string | null,
): ComparableCategoryIdentity {
  const category = String(target.category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const confirmedFields: string[] = [];
  const unconfirmedFields: string[] = [];
  const conflicts: string[] = [];
  const targetYear = firstString(details, ['year', 'releaseYear', 'publicationYear', 'originalReleaseYear']);
  const targetNumber = firstString(details, ['cardNumber', 'issueNumber', 'catalogNumber', 'serialNumber']);
  const normalizedTargetNumber = normalizeComparableNumber(targetNumber);
  const record = (label: string, value: string | null, matches: boolean, explicitConflict?: string | null) => {
    if (!value) return;
    if (explicitConflict) conflicts.push(`${label} differs (${explicitConflict})`);
    else if (matches) confirmedFields.push(label);
    else unconfirmedFields.push(label);
  };
  const yearStatus = () => {
    if (!targetYear) return { matches: false, conflict: null as string | null };
    const years = titleYears(title);
    return { matches: years.includes(targetYear), conflict: years.length && !years.includes(targetYear) ? years.join(', ') : null };
  };
  const numberStatus = () => ({
    matches: Boolean(normalizedTargetNumber && observedNumber === normalizedTargetNumber),
    conflict: normalizedTargetNumber && observedNumber && observedNumber !== normalizedTargetNumber ? observedNumber : null,
  });

  if (category === 'sports_cards') {
    const player = firstString(details, ['player', 'athlete', 'subject']);
    const manufacturer = firstString(details, ['customManufacturer', 'manufacturer', 'brand']);
    const year = yearStatus();
    const brandConflict = knownBrandConflict(title, manufacturer, ['topps', 'panini', 'upper deck', 'bowman', 'donruss', 'fleer', 'score', 'leaf']);
    record('Player', player, titleContainsExpectedPhrase(title, player));
    // A different stated year may be a reissue, regional release, or listing
    // shorthand. Preserve it as review context rather than a hard rejection.
    record('Year', targetYear, year.matches);
    if (year.conflict) unconfirmedFields.push(`Year stated as ${year.conflict}`);
    record('Manufacturer', manufacturer, titleContainsExpectedPhrase(title, manufacturer), brandConflict);
    const number = numberStatus();
    record('Card #', targetNumber, number.matches, number.conflict);
  } else if (category === 'pokemon') {
    const cardName = firstString(details, ['cardName', 'pokemonName', 'name']);
    const setName = firstString(details, ['setName', 'set', 'cardSet']);
    const edition = firstString(details, ['editionEra', 'edition', 'era']);
    const finish = firstString(details, ['finishVariant', 'variant', 'variation']);
    record('Card name', cardName, titleContainsExpectedPhrase(title, cardName));
    record('Set', setName, titleContainsExpectedPhrase(title, setName));
    const number = numberStatus();
    record('Card #', targetNumber, number.matches, number.conflict);
    record('Edition / era', edition, titleContainsExpectedPhrase(title, edition));
    record('Finish / variant', finish, titleContainsExpectedPhrase(title, finish));
  } else if (category === 'comics') {
    const series = firstString(details, ['comicTitle', 'series', 'title']) || target.title;
    const publisher = firstString(details, ['publisher']);
    const year = yearStatus();
    const publisherConflict = knownBrandConflict(title, publisher, ['marvel', 'dc', 'image', 'dark horse', 'idw', 'dynamite', 'boom']);
    record('Series', series, titleContainsExpectedPhrase(title, series));
    const number = numberStatus();
    record('Issue #', targetNumber, number.matches, number.conflict);
    record('Publisher', publisher, titleContainsExpectedPhrase(title, publisher), publisherConflict);
    // Publication year differences are informative but commonly reflect
    // reprints, regional editions, or listing shorthand, so they stay review-only.
    if (targetYear && !year.matches && !year.conflict) unconfirmedFields.push('Publication year');
    if (targetYear && year.conflict) unconfirmedFields.push(`Publication year stated as ${year.conflict}`);
  } else if (category === 'coins') {
    const country = firstString(details, ['country', 'issuingCountry']);
    const denomination = firstString(details, ['denomination', 'faceValue']);
    const mintMark = firstString(details, ['mintMark', 'mint']);
    const variety = firstString(details, ['variety', 'varietyName', 'attribution']);
    const year = yearStatus();
    const isUnitedStates = normalizedIdentityText(country) === 'united states' || normalizedIdentityText(country) === 'usa' || normalizedIdentityText(country) === 'us';
    const countryMatch = countryStatus(title, country);
    const targetMintMark = coinMintMark(mintMark);
    const observedMintMarks = coinMintMarksInTitle(title);
    const targetVariety = coinVarietyKey(variety);
    const observedVarieties = coinVarietiesInTitle(title);
    record('Denomination', denomination, coinDenominationMatches(title, denomination));
    record('Year', targetYear, year.matches, year.conflict);
    if (country && isUnitedStates) {
      if (countryMatch.conflict) conflicts.push(`Country differs (${countryMatch.conflict})`);
      else if (countryMatch.matches) confirmedFields.push('Country');
    } else if (country) {
      record('Country', country, countryMatch.matches, countryMatch.conflict);
    }
    if (targetMintMark) {
      const mintConflict = observedMintMarks.length && !observedMintMarks.includes(targetMintMark) ? observedMintMarks.join(', ') : null;
      record('Mint mark', mintMark, observedMintMarks.includes(targetMintMark), mintConflict);
    }
    if (targetVariety) {
      const varietyConflict = observedVarieties.length && !observedVarieties.includes(targetVariety) ? observedVarieties.join(', ') : null;
      const varietyMatches = observedVarieties.includes(targetVariety) || titleContainsExpectedPhrase(title, variety);
      record('Variety', variety, varietyMatches, varietyConflict);
    }
  } else if (category === 'stamps') {
    const country = firstString(details, ['country', 'issuingCountry']);
    const catalogNumber = firstString(details, ['scottNumber', 'catalogNumber', 'catalogNo', 'number']);
    const denomination = firstString(details, ['denomination', 'faceValue']);
    const targetFormat = classifyStampFormat({ title: target.title, itemType: target.itemType, itemDetails: target.itemDetails, condition: target.condition });
    const candidateFormat = classifyStampFormat({ title });
    const targetHinge = stampHingeState(firstString(details, ['hinged', 'hingeStatus', 'gumCondition']) || target.condition);
    const candidateHinge = stampHingeState(title);
    const targetUse = stampUseState(firstString(details, ['mintOrUsed', 'condition', 'stampCondition']) || target.condition);
    const candidateUse = stampUseState(title);
    const countryMatch = countryStatus(title, country);
    const catalogMatch = catalogStatus(title, catalogNumber);
    const denominationMatch = stampDenominationStatus(title, denomination);

    record('Country', country, countryMatch.matches, countryMatch.conflict);
    record('Scott / catalog #', catalogNumber, catalogMatch.matches, catalogMatch.conflict);
    record('Denomination', denomination, denominationMatch.matches, denominationMatch.conflict);
    if (targetFormat.key !== 'unknown') {
      const formatConflict = candidateFormat.key !== 'unknown' && !stampFormatsCompatible(targetFormat, candidateFormat)
        ? candidateFormat.label
        : null;
      record('Stamp form', targetFormat.label, candidateFormat.key !== 'unknown' && stampFormatsCompatible(targetFormat, candidateFormat), formatConflict);
    }
    if (targetHinge !== 'unknown') record('Hinge state', targetHinge, candidateHinge === targetHinge);
    if (targetUse !== 'unknown') record('Mint / used state', targetUse, candidateUse === targetUse);
  } else if (category === 'video_games') {
    const gameTitle = firstString(details, ['gameTitle', 'videoGameTitle', 'title']) || target.title;
    const platform = firstString(details, ['platform', 'console', 'system']);
    const modelOrUpc = firstString(details, ['modelNumber', 'productCode', 'catalogNumber', 'upc', 'UPC', 'barcode', 'barCode']);
    const region = firstString(details, ['region']);
    const edition = firstString(details, ['edition', 'releaseType', 'version']);
    const objectType = firstString(details, ['objectType', 'productType', 'itemType']) || target.itemType || target.title;
    const targetForm = videoGameObjectForm(objectType);
    const candidateForm = videoGameObjectForm(title);
    const targetPlatform = platformKey(platform);
    const observedPlatforms = platformsInTitle(title);
    const targetRegion = regionKey(region);
    const observedRegion = regionInTitle(title);
    const targetEdition = videoGameEdition(edition);
    const observedEdition = videoGameEdition(title);
    const targetPackage = (firstString(details, ['sealed', 'factorySealed']) ?? '').toLowerCase() === 'yes'
      ? 'sealed'
      : (firstString(details, ['completeInBox']) ?? '').toLowerCase() === 'yes'
        ? 'cib'
        : videoGamePackageState(firstString(details, ['condition', 'packageCondition']) || target.condition);
    const candidatePackage = videoGamePackageState(title);
    const modelMatch = catalogStatus(title, modelOrUpc);

    record('Game / console', gameTitle, titleContainsExpectedPhrase(title, gameTitle));
    if (targetPlatform) {
      const platformConflict = observedPlatforms.length && !observedPlatforms.includes(targetPlatform) ? observedPlatforms.join(', ') : null;
      record('Platform', platform, observedPlatforms.includes(targetPlatform), platformConflict);
    }
    record('Model / UPC', modelOrUpc, modelMatch.matches, modelMatch.conflict);
    if (targetForm !== 'unknown') {
      const objectConflict = candidateForm !== 'unknown' && candidateForm !== targetForm ? candidateForm : null;
      record('Object form', targetForm, candidateForm === targetForm, objectConflict);
    }
    if (targetRegion) {
      const regionConflict = observedRegion && observedRegion !== targetRegion ? observedRegion : null;
      record('Region', region, observedRegion === targetRegion, regionConflict);
    }
    if (targetEdition) {
      const editionConflict = observedEdition && observedEdition !== targetEdition ? observedEdition : null;
      record('Edition', edition, observedEdition === targetEdition, editionConflict);
    }
    if (targetPackage !== 'unknown') {
      const packageConflict = candidatePackage !== 'unknown' && candidatePackage !== targetPackage ? candidatePackage : null;
      record('Package state', targetPackage, candidatePackage === targetPackage, packageConflict);
    }
  } else if (category === 'music') {
    const artist = firstString(details, ['artist', 'performer']);
    const releaseTitle = firstString(details, ['releaseTitle', 'albumTitle', 'album', 'title']) || target.title;
    const catalogNumber = firstString(details, ['catalogNumber', 'catno', 'catalogNo']);
    const label = firstString(details, ['recordLabel', 'label']);
    const country = firstString(details, ['country']);
    const format = firstString(details, ['format', 'mediaFormat']);
    const pressing = firstString(details, ['pressing', 'pressingDetails', 'edition', 'version']);
    const catalogMatch = catalogStatus(title, catalogNumber);
    const countryMatch = countryStatus(title, country);
    const targetFormat = musicFormat(format);
    const observedFormat = musicFormat(title);
    const targetPressing = musicPressing(pressing);
    const observedPressing = musicPressing(title);
    const observedLabel = recordLabelInTitle(title);
    const labelConflict = observedLabel && normalizedIdentityText(observedLabel) !== normalizedIdentityText(label) ? observedLabel : null;
    const parsedTitle = musicArtistAndReleaseFromTitle(title);
    const artistConflict = parsedTitle && artist && !titleContainsExpectedPhrase(parsedTitle.artist, artist) ? parsedTitle.artist : null;
    const releaseConflict = parsedTitle && releaseTitle && !titleContainsExpectedPhrase(parsedTitle.release, releaseTitle) ? parsedTitle.release : null;

    record('Artist', artist, titleContainsExpectedPhrase(title, artist), artistConflict);
    record('Release title', releaseTitle, titleContainsExpectedPhrase(title, releaseTitle), releaseConflict);
    record('Catalog #', catalogNumber, catalogMatch.matches, catalogMatch.conflict);
    record('Label', label, titleContainsExpectedPhrase(title, label), labelConflict);
    record('Country', country, countryMatch.matches, countryMatch.conflict);
    if (targetFormat) {
      const formatConflict = observedFormat && observedFormat !== targetFormat ? observedFormat : null;
      record('Format', format, observedFormat === targetFormat, formatConflict);
    }
    if (targetPressing) {
      const pressingConflict = observedPressing && observedPressing !== targetPressing ? observedPressing : null;
      record('Pressing / edition', pressing, observedPressing === targetPressing, pressingConflict);
    }
  } else if (category === 'disney_pins') {
    const pinName = firstString(details, ['pinName', 'name']) || target.title;
    const character = firstString(details, ['character']);
    const pinNumber = firstString(details, ['pinNumber', 'catalogNumber', 'number']);
    const series = firstString(details, ['series']);
    const event = firstString(details, ['pinTradingEvent', 'event']);
    const limitedEdition = firstString(details, ['limitedEdition', 'edition']);
    const editionSize = firstString(details, ['editionSize']);
    const number = normalizeComparableNumber(pinNumber);
    const observedPinNumber = extractComparableNumber(title);
    const targetEdition = pinEdition(limitedEdition, editionSize);
    const observedEdition = pinEditionInTitle(title);
    const expectedEvent = event || series || '';
    const targetEvent = disneyContextInTitle(expectedEvent);
    const observedEvent = disneyContextInTitle(title);
    const targetForm = pinForm(firstString(details, ['itemForm', 'format', 'pinFormat']) || target.itemType || target.title);
    const candidateForm = pinForm(title);

    record('Pin name', pinName, titleContainsExpectedPhrase(title, pinName));
    record('Character', character, titleContainsExpectedPhrase(title, character));
    if (number) {
      const pinConflict = observedPinNumber && observedPinNumber !== number ? observedPinNumber : null;
      record('Pin #', pinNumber, observedPinNumber === number, pinConflict);
    }
    record('Series', series, titleContainsExpectedPhrase(title, series));
    if (targetEvent) {
      const eventConflict = observedEvent && observedEvent !== targetEvent ? observedEvent : null;
      record('Event', expectedEvent, observedEvent === targetEvent || titleContainsExpectedPhrase(title, expectedEvent), eventConflict);
    }
    if (targetEdition) {
      const editionConflict = observedEdition && (observedEdition.kind !== targetEdition.kind || (targetEdition.size && observedEdition.size && observedEdition.size !== targetEdition.size))
        ? `${observedEdition.kind}${observedEdition.size ? ` ${observedEdition.size}` : ''}`
        : null;
      const editionMatches = Boolean(observedEdition && observedEdition.kind === targetEdition.kind && (!targetEdition.size || observedEdition.size === targetEdition.size));
      record('Edition', limitedEdition || editionSize, editionMatches, editionConflict);
    }
    if (targetForm !== 'unknown') {
      const formConflict = candidateForm !== 'unknown' && candidateForm !== targetForm ? candidateForm : null;
      record('Pin form', targetForm, candidateForm === targetForm, formConflict);
    }
  } else if (category === 'vintage_toys') {
    const toyName = firstString(details, ['toyName', 'toyNameCharacter', 'characterName', 'vehicleName', 'playsetName', 'gamePuzzleName', 'name']) || target.title;
    const brand = firstString(details, ['brand', 'manufacturer', 'publisherBrand']);
    const franchise = firstString(details, ['franchise', 'line', 'toyLine', 'theme']);
    const setNumber = firstString(details, ['setNumber', 'modelNumber', 'catalogNumber', 'productCode']);
    const packaging = firstString(details, ['packagingType', 'packageType']) || target.condition;
    const complete = firstString(details, ['complete', 'isComplete']);
    const objectType = firstString(details, ['objectType', 'productType', 'toyType']);
    const variant = firstString(details, ['variant', 'version', 'releaseVersion', 'releaseType', 'colorway', 'cardVariant']);
    const year = yearStatus();
    const brandConflict = knownBrandConflict(title, brand, TOY_BRANDS);
    const modelMatch = catalogStatus(title, setNumber);
    const targetPackaging = toyPackagingState(packaging);
    const candidatePackaging = toyPackagingState(title);
    const targetCompleteness = toyCompletenessState(complete);
    const candidateCompleteness = toyCompletenessState(title);
    const targetForm = vintageToyForm(objectType);
    const candidateForm = vintageToyForm(title);
    const targetVariant = toyVariantKey(variant);
    const candidateVariants = toyVariantsInTitle(title);

    record('Toy name', toyName, titleContainsExpectedPhrase(title, toyName));
    record('Brand', brand, titleContainsExpectedPhrase(title, brand), brandConflict);
    record('Franchise / line', franchise, titleContainsExpectedPhrase(title, franchise));
    record('Set / model #', setNumber, modelMatch.matches, modelMatch.conflict);
    record('Year', targetYear, year.matches);
    if (year.conflict) unconfirmedFields.push(`Year stated as ${year.conflict}`);
    if (targetPackaging !== 'unknown') {
      const packagingConflict = candidatePackaging !== 'unknown' && candidatePackaging !== targetPackaging ? candidatePackaging : null;
      record('Packaging', targetPackaging, candidatePackaging === targetPackaging, packagingConflict);
    }
    if (targetCompleteness !== 'unknown') {
      const completenessConflict = candidateCompleteness !== 'unknown' && candidateCompleteness !== targetCompleteness ? candidateCompleteness : null;
      record('Completeness', targetCompleteness, candidateCompleteness === targetCompleteness, completenessConflict);
    }
    if (targetForm !== 'unknown') {
      const formConflict = candidateForm !== 'unknown' && candidateForm !== targetForm ? candidateForm : null;
      record('Toy form', targetForm, candidateForm === targetForm, formConflict);
    }
    if (targetVariant) {
      const variantConflict = candidateVariants.length && !candidateVariants.includes(targetVariant) ? candidateVariants.join(', ') : null;
      record('Variant / release', variant, candidateVariants.includes(targetVariant), variantConflict);
    }
  } else if (category === 'autographs') {
    const signer = firstString(details, ['signer', 'athlete', 'celebrity', 'subject']) || target.title;
    const signedItem = firstString(details, ['signedItemType', 'itemType', 'autographItemType']) || target.itemType || target.title;
    const authenticationCompany = firstString(details, ['customAuthenticationCompany', 'authenticationCompany', 'authCompany']);
    const certificateNumber = firstString(details, ['certificateNumber', 'certificationNumber', 'certNumber', 'authenticationNumber', 'certId']);
    const targetForm = autographItemForm(signedItem);
    const candidateForm = autographItemForm(title);
    const targetAuth = autographAuthenticationCompany(authenticationCompany);
    const candidateAuth = autographAuthenticationInTitle(title);
    const targetCertificate = normalizedCatalogCode(certificateNumber);
    const candidateCertificate = autographCertificateInTitle(title);
    const declaredSigner = declaredAutographSigner(title);
    const signerConflict = declaredSigner && signer && !titleContainsExpectedPhrase(declaredSigner, signer) ? declaredSigner : null;
    const targetInscription = autographInscription(firstString(details, ['inscription', 'inscriptionText', 'inscriptionPresent', 'personalization']));
    const candidateInscription = autographInscription(title);

    record('Signer', signer, titleContainsExpectedPhrase(title, signer), signerConflict);
    if (targetForm !== 'unknown') {
      const formConflict = candidateForm !== 'unknown' && candidateForm !== targetForm ? candidateForm : null;
      record('Signed item form', targetForm, candidateForm === targetForm, formConflict);
    }
    if (targetAuth) {
      const authConflict = candidateAuth && candidateAuth !== targetAuth ? candidateAuth : null;
      record('Authentication company', authenticationCompany, candidateAuth === targetAuth, authConflict);
    }
    if (targetCertificate && candidateCertificate) {
      const certificateConflict = candidateCertificate !== targetCertificate ? candidateCertificate : null;
      record('Certificate', certificateNumber, candidateCertificate === targetCertificate, certificateConflict);
    }
    if (targetInscription.state !== 'unknown') {
      const inscriptionConflict = candidateInscription.state !== 'unknown' && targetInscription.state !== candidateInscription.state
        ? candidateInscription.state
        : candidateInscription.state !== 'unknown' && targetInscription.key && candidateInscription.key && targetInscription.key !== candidateInscription.key
          ? candidateInscription.key
          : null;
      const inscriptionMatches = targetInscription.state === candidateInscription.state
        && (!targetInscription.key || candidateInscription.key === targetInscription.key);
      record('Inscription', targetInscription.key || targetInscription.state, inscriptionMatches, inscriptionConflict);
    }
  } else if (category === 'movies') {
    const movieTitle = firstString(details, ['title', 'movieTitle', 'filmTitle']) || target.title;
    const format = firstString(details, ['customFormat', 'format', 'mediaFormat']);
    const edition = firstString(details, ['edition', 'version', 'releaseType']);
    const region = firstString(details, ['region']);
    const packaging = firstString(details, ['sealed', 'factorySealed', 'packageCondition']) || target.condition;
    const year = yearStatus();
    const targetFormat = movieFormat(format);
    const candidateFormat = movieFormat(title);
    const targetEdition = movieEdition(edition);
    const candidateEdition = movieEdition(title);
    const targetRegion = regionKey(region);
    const candidateRegion = regionInTitle(title);
    const targetPackaging = moviePackageState(packaging);
    const candidatePackaging = moviePackageState(title);
    const collectibleType = firstString(details, ['collectibleType', 'objectType', 'movieItemType', 'itemType']) || target.itemType || '';
    const targetForm = movieCollectibleForm(`${collectibleType} ${format ?? ''}`);
    const candidateForm = movieCollectibleForm(title);
    const posterFormat = firstString(details, ['posterFormat', 'format', 'posterType']);
    const targetPosterFormat = targetForm === 'poster' ? moviePosterFormat(posterFormat) : 'unknown';
    const candidatePosterFormat = moviePosterFormat(title);
    const posterSize = firstString(details, ['posterSize', 'dimensions', 'size']);
    const targetPosterSize = targetForm === 'poster' ? moviePosterSize(posterSize) : null;
    const candidatePosterSize = moviePosterSize(title);
    const propType = firstString(details, ['propType', 'memorabiliaType', 'collectibleType', 'objectType']);
    const targetPropType = targetForm === 'prop' ? moviePropType(propType || collectibleType) : 'unknown';
    const candidatePropType = moviePropType(title);
    const targetScreenUse = movieScreenUseState(firstString(details, ['screenUsed', 'screenWorn', 'provenance', 'propProvenance']));
    const candidateScreenUse = movieScreenUseState(title);

    record('Movie title', movieTitle, titleContainsExpectedPhrase(title, movieTitle));
    if (targetFormat !== 'unknown') {
      const formatConflict = candidateFormat !== 'unknown' && candidateFormat !== targetFormat ? candidateFormat : null;
      record('Format', format, candidateFormat === targetFormat, formatConflict);
    }
    if (targetEdition !== 'unknown') {
      const editionConflict = candidateEdition !== 'unknown' && candidateEdition !== targetEdition ? candidateEdition : null;
      record('Edition', edition, candidateEdition === targetEdition, editionConflict);
    }
    if (targetRegion) {
      const regionConflict = candidateRegion && candidateRegion !== targetRegion ? candidateRegion : null;
      record('Region', region, candidateRegion === targetRegion, regionConflict);
    }
    if (targetPackaging !== 'unknown') {
      const packagingConflict = candidatePackaging !== 'unknown' && candidatePackaging !== targetPackaging ? candidatePackaging : null;
      record('Package state', targetPackaging, candidatePackaging === targetPackaging, packagingConflict);
    }
    if (targetForm !== 'unknown') {
      const formConflict = candidateForm !== 'unknown' && candidateForm !== targetForm ? candidateForm : null;
      record('Movie collectible form', targetForm, candidateForm === targetForm, formConflict);
    }
    if (targetPosterFormat !== 'unknown') {
      const posterFormatConflict = candidatePosterFormat !== 'unknown' && candidatePosterFormat !== targetPosterFormat ? candidatePosterFormat : null;
      record('Poster format', targetPosterFormat, candidatePosterFormat === targetPosterFormat, posterFormatConflict);
    }
    if (targetPosterSize) {
      const posterSizeConflict = candidatePosterSize && candidatePosterSize !== targetPosterSize ? candidatePosterSize : null;
      record('Poster size', targetPosterSize, candidatePosterSize === targetPosterSize, posterSizeConflict);
    }
    if (targetPropType !== 'unknown') {
      const propTypeConflict = candidatePropType !== 'unknown' && candidatePropType !== targetPropType ? candidatePropType : null;
      record('Prop type', targetPropType, candidatePropType === targetPropType, propTypeConflict);
    }
    if (targetScreenUse !== 'unknown') {
      const screenUseConflict = candidateScreenUse !== 'unknown' && candidateScreenUse !== targetScreenUse ? candidateScreenUse : null;
      record('Screen-use state', targetScreenUse, candidateScreenUse === targetScreenUse, screenUseConflict);
    }
    record('Release year', targetYear, year.matches);
    if (year.conflict) unconfirmedFields.push(`Release year stated as ${year.conflict}`);
  } else {
    return { category, status: 'not_applicable', confirmedFields, unconfirmedFields, conflicts };
  }

  return {
    category,
    status: conflicts.length ? 'objective_conflict' : unconfirmedFields.length ? 'needs_review' : 'direct_confirmed',
    confirmedFields,
    unconfirmedFields,
    conflicts,
  };
}

export function scoreComparable(target: ComparableTarget, sale: MarketSale): ComparableMatch {
  const title = String(sale.title ?? '').trim();
  const price = Number(sale.price);
  const details = parseDetails(target);
  const targetIdentityState = extractIdentityState(target);
  const saleIdentityState = extractIdentityState({ title, grade: null, certificationCompany: null, itemDetails: null });
  const universalIdentityConflicts = identityStateConflicts(targetIdentityState, saleIdentityState);
  const identity = buildTestAiP0Identity(target);
  const targetTokens = new Set(textTokens(target.title));
  const saleTokens = new Set(textTokens(title));
  const overlap = [...targetTokens].filter((token) => saleTokens.has(token)).length;
  const tokenScore = targetTokens.size ? overlap / targetTokens.size : 0;
  const reasons: string[] = [];
  let identityRelationship: IdentityRelationship = 'insufficient_identity';
  let valuationRelationship: ValuationRelationship = 'reference_only';
  let score = Math.round(tokenScore * 55);

  if (tokenScore >= 0.8) reasons.push('strong title identity overlap');
  else if (tokenScore >= 0.5) reasons.push('partial title identity overlap');
  else reasons.push('weak title identity overlap');

  const targetYear = firstString(details, ['year', 'releaseYear', 'publicationYear', 'originalReleaseYear']);
  if (targetYear && title.includes(targetYear)) {
    score += 15;
    reasons.push(`year ${targetYear} matches`);
  } else if (targetYear && /\b(19|20)\d{2}\b/.test(title)) {
    score -= 12;
    reasons.push('sale title contains a different year');
  }

  const targetNumber = firstString(details, ['cardNumber', 'issueNumber', 'catalogNumber', 'serialNumber']);
  const normalizedTargetNumber = normalizeComparableNumber(targetNumber);
  const observedNumber = extractComparableNumber(title, String(target.category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_'));
  const categoryIdentity = assessComparableCategoryIdentity(target, details, title, observedNumber);
  let materialNumberConflict = false;
  if (normalizedTargetNumber && observedNumber === normalizedTargetNumber) {
    score += 12;
    reasons.push('catalog or issue number matches');
  } else if (normalizedTargetNumber && observedNumber && observedNumber !== normalizedTargetNumber) {
    score -= 24;
    materialNumberConflict = true;
    reasons.push('explicit catalog or issue number differs');
  } else if (normalizedTargetNumber) {
    reasons.push('catalog or issue number is not stated in the comparable title');
  }

  const targetVariant = firstString(details, ['variant', 'parallel', 'edition', 'pressing', 'releaseType', 'language']);
  let materialVariantConflict = false;
  let materialVariantReview = false;
  if (targetVariant && title.toLowerCase().includes(targetVariant.toLowerCase())) {
    score += 10;
    reasons.push('variant or release detail matches');
  } else if (targetVariant && ['parallel', 'refractor', 'variant', 'pressing', 'first pressing', 'limited edition', 'open edition'].some((term) => title.toLowerCase().includes(term))) {
    score -= 18;
    materialVariantConflict = true;
    reasons.push('explicit sale variant or release detail differs from the target');
  } else if (!targetVariant && ['parallel', 'refractor', 'variant', 'pressing', 'first pressing', 'limited edition', 'open edition'].some((term) => title.toLowerCase().includes(term))) {
    score -= 6;
    materialVariantReview = true;
    reasons.push('sale declares a variant or release detail that the target does not state');
  }
  const visualMismatch = sale.visualReviewStatus === 'mismatch';
  if (visualMismatch) {
    score -= 18;
    reasons.push('visual comparison flagged a mismatch; manual review required');
  }

  const targetCompany = normalizeCompany(target.certificationCompany || firstString(details, ['certificationCompany', 'gradingCompany', 'authenticationCompany']));
  const saleCompanyMatch = title.match(/\b(psa|cgc|bgs|sgc|pcgs|ngc|afa|wata|vga)\b/i)?.[1];
  const saleCompany = normalizeCompany(saleCompanyMatch);
  const isPcgsCoin = target.category === 'coins' && targetCompany === 'pcgs';
  const targetPcgsGrade = isPcgsCoin ? normalizePcgsCoinGrade(target.grade) : null;
  const salePcgsGrade = isPcgsCoin && saleCompany === 'pcgs' ? extractPcgsCoinGrade(title) : null;
  const targetGrade = numericGrade(target.grade);
  const saleGrade = numericGrade(title.match(/(?:psa|cgc|bgs|sgc|pcgs|ngc|afa|wata|vga)\s*(?:graded?\s*)?(?:[A-Za-z]{1,8}\s*)?(\d+(?:\.\d+)?)/i)?.[1]);
  let materialGradeConflict = false;
  let materialCompanyConflict = false;
  const hasKnownGradeState = targetGrade !== null || Boolean(target.grade) || Boolean(targetCompany);
  const hasObservedGradeState = saleGrade !== null || Boolean(saleCompany);
  if (isPcgsCoin && targetPcgsGrade) {
    if (salePcgsGrade === targetPcgsGrade) {
      score += 12;
      reasons.push('PCGS coin grade matches');
    } else if (salePcgsGrade) {
      score -= 18;
      materialGradeConflict = true;
      reasons.push('PCGS coin grade differs');
    } else {
      score -= 10;
      reasons.push('sale PCGS coin grade is not identifiable');
    }
  } else if (targetGrade !== null && saleGrade === targetGrade) {
    score += 12;
    reasons.push('grade matches');
  } else if (targetGrade !== null && saleGrade !== null) {
    score -= 18;
    materialGradeConflict = true;
    reasons.push('grade differs');
  } else if (targetGrade !== null) {
    score -= 10;
    reasons.push('sale grade is not identifiable');
  }
  if (targetCompany && saleCompany === targetCompany) {
    score += 6;
    reasons.push('grading or authentication company matches');
  } else if (targetCompany && saleCompany && saleCompany !== targetCompany) {
    score -= 10;
    materialCompanyConflict = true;
    reasons.push('grading or authentication company differs; retained as certification-adjacent evidence');
  }

  if (['stamps', 'video_games', 'music', 'disney_pins', 'vintage_toys', 'autographs', 'movies', 'coins'].includes(categoryIdentity.category) && categoryIdentity.status === 'direct_confirmed' && categoryIdentity.confirmedFields.length > 0) {
    score += Math.min(20, categoryIdentity.confirmedFields.length * 4);
    reasons.push(`${categoryIdentity.confirmedFields.length} category-critical identifiers match`);
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const priceIsUsable = Number.isFinite(price) && price > 0;
  const categoryHardConflict = categoryIdentity.status === 'objective_conflict';
  if (universalIdentityConflicts.length) {
    reasons.push(...universalIdentityConflicts.map((reason) => `identity state conflict: ${reason}`));
  }
  const universalHardConflict = universalIdentityConflicts.some((reason) =>
    /raw\/graded state differs|single item versus lot\/bundle differs|negative listing signal|parallel\/variant differs|sale declares an autograph/.test(reason),
  );
  const universalNeedsReview = universalIdentityConflicts.some((reason) => reason.includes('not stated'));
  const categoryNeedsReview = categoryIdentity.status === 'needs_review';
  const categoryDirectConfirmed = categoryIdentity.status === 'direct_confirmed' || categoryIdentity.status === 'not_applicable';
  if (materialNumberConflict || categoryHardConflict || universalHardConflict) {
    identityRelationship = 'conflict';
    valuationRelationship = 'not_usable';
  } else if (materialVariantConflict) {
    identityRelationship = 'related_variant';
    valuationRelationship = 'variant_comparable';
  } else if (materialGradeConflict || materialCompanyConflict) {
    identityRelationship = 'same_object_different_state';
    valuationRelationship = 'grade_adjacent_comparable';
  } else if (categoryDirectConfirmed && normalizedTargetNumber && observedNumber === normalizedTargetNumber) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (categoryDirectConfirmed && targetVariant && title.toLowerCase().includes(targetVariant.toLowerCase())) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (categoryDirectConfirmed && categoryIdentity.confirmedFields.length > 0) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (categoryDirectConfirmed && hasKnownGradeState && hasObservedGradeState && (!targetGrade || saleGrade === targetGrade) && (!targetCompany || saleCompany === targetCompany)) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (tokenScore >= 0.8) {
    identityRelationship = 'related_object';
    valuationRelationship = 'reference_only';
  }
  const adjacentState = materialGradeConflict || materialCompanyConflict;
  const classification: ComparableClassification = !priceIsUsable || materialNumberConflict || categoryHardConflict || universalHardConflict
    ? 'rejected'
    : materialVariantConflict
      ? 'contextual'
      : adjacentState
        ? 'contextual'
    : categoryNeedsReview || universalNeedsReview
      ? 'contextual'
    : visualMismatch || materialVariantReview || sale.evidenceDisposition === 'warning_review' || boundedScore < 48
      ? 'contextual'
    : identity.readiness !== 'ready'
      ? 'contextual'
      : boundedScore >= 80
        ? 'exact'
        : boundedScore >= 60
          ? 'near'
          : 'contextual';
  const accepted = classification === 'exact' || classification === 'near';
  const exclusionReason = accepted
    ? undefined
    : materialGradeConflict
      ? 'same underlying object is grade-adjacent; retained for secondary evidence, excluded from direct valuation'
      : materialCompanyConflict
          ? 'same underlying object is certification-adjacent; retained for secondary evidence, excluded from direct valuation'
            : universalHardConflict
              ? `universal identity conflict: ${universalIdentityConflicts.join('; ')}`
            : categoryHardConflict
            ? `category-specific identity conflict: ${categoryIdentity.conflicts.join('; ')}`
            : categoryNeedsReview
              ? `category-specific identity needs review: ${categoryIdentity.unconfirmedFields.join(', ')}`
          : materialVariantConflict
            ? 'explicit sale variant or release detail differs from target'
            : materialNumberConflict
              ? 'explicit catalog or issue number differs from target'
              : materialVariantReview
                ? 'sale declares a variant or release detail that requires review'
            : visualMismatch
              ? 'visual comparison flagged the record for manual review'
            : identity.readiness !== 'ready'
              ? `target is missing critical identifiers: ${identity.missingCriticalFields.join(', ')}`
              : classification === 'contextual'
                ? 'sale is only a contextual identity match and cannot support valuation'
            : boundedScore < 48
            ? 'identity evidence is incomplete and requires review'
            : 'insufficient comparable evidence';
  return {
    title: title || 'Untitled comparable',
    price: Number.isFinite(price) ? price : 0,
    date: sale.date ?? null,
    currency: String(sale.currency ?? 'UNKNOWN').toUpperCase(),
    score: boundedScore,
    accepted,
    reasons,
    exclusionReason,
    weight: 0,
    classification,
    identityRelationship,
    valuationRelationship,
    categoryIdentity,
    sourceId: sale.sourceId ?? sale.marketplace ?? null,
    sourceLabel: sale.sourceLabel ?? sale.marketplace ?? sale.sourceId ?? null,
    marketplace: sale.marketplace ?? null,
    originMarketplace: sale.originMarketplace ?? null,
    sourceAdapter: sale.sourceAdapter ?? null,
    saleId: sale.saleId ?? null,
    url: sale.url ?? null,
    saleStatus: sale.saleStatus ?? null,
    completedStatusBasis: sale.completedStatusBasis ?? null,
    priceBasis: sale.priceBasis ?? null,
    buyerPremium: sale.buyerPremium ?? 'unknown',
    shipping: sale.shipping ?? 'unknown',
    tax: sale.tax ?? 'unknown',
    saleForm: sale.saleForm ?? null,
    lotQuantity: sale.lotQuantity ?? null,
    observationId: sale.observationId ?? null,
    canonicalTransactionId: sale.canonicalTransactionId ?? null,
    duplicateStatus: sale.duplicateStatus ?? 'unique',
    provenance: sale.provenance ?? null,
    visualReviewStatus: sale.visualReviewStatus ?? 'not_reviewed',
    visualReviewRationale: sale.visualReviewRationale ?? null,
    evidenceDisposition: sale.evidenceDisposition ?? 'valuation_eligible',
    evidenceReasons: sale.evidenceReasons ?? null,
  };
}

export function buildMarketProfile(
  target: ComparableTarget,
  sales: MarketSale[] = [],
  aggregateMetrics?: { median?: number; min?: number; max?: number; count?: number; confidence?: ConfidenceLevel } | null,
  now = new Date(),
  identityGate?: ComparableIdentityGate | null,
): MarketProfile {
  const nowMs = now.getTime();
  const selection = selectBalancedComparableSales(target, sales, now, MAX_VALUATION_COMPARABLES);
  const { deduplicated, valuationCandidates, valuationMatches, selected, selectedMatches } = selection;
  const contextualSales = deduplicated.unique.filter((sale) => !isCompletedSaleCandidate(sale, nowMs));
  const valuationMatchRecords = valuationMatches.map(({ sale, match }) => {
    if (selectedMatches.has(match)) return match;
    if (match.accepted) {
      return {
        ...match,
        accepted: false,
        exclusionReason: 'omitted from the bounded valuation set after source-balanced selection',
      };
    }
    return match;
  });
  const contextualMatches = contextualSales
    .map((sale) => {
      const match = scoreComparable(target, sale);
      const evidenceReason = sale.evidenceReasons?.filter(Boolean).join('; ');
      return {
        ...match,
        accepted: false,
        classification: 'contextual' as const,
        exclusionReason: evidenceReason || 'historical, undated, non-completed, or insufficiently verified record is context only',
        reasons: evidenceReason ? [...match.reasons, `server evidence gate: ${evidenceReason}`] : match.reasons,
      };
    });
  const duplicateMatches: ComparableMatch[] = deduplicated.duplicates.map(({ sale, duplicateOf }) => ({
    ...scoreComparable(target, sale),
    accepted: false,
    classification: 'rejected',
    exclusionReason: `duplicate sale observation; canonical record ${duplicateOf}`,
    duplicateOf,
    reasons: ['duplicate sale observation suppressed', `canonical record ${duplicateOf}`],
  }));
  const selectedAccepted = selected.map(({ match }) => match).filter((match) => match.price > 0);
  const selectedSales = selected.map(({ sale }) => sale);
  const evidenceCoverage = assessMarketEvidenceCoverage(sales, selectedSales, deduplicated.duplicates.length, nowMs);
  const categoryEvidenceThresholds = getCategoryEvidenceThresholds(target.category);
  const adapterReliabilityHistory = buildAdapterReliabilityHistory(sales, selectedSales, deduplicated.duplicates.map(({ sale }) => sale), nowMs);
  const selectedAcceptedWithAge = selectedAccepted.map((match) => ({ match, ageDays: daysOld(match.date, nowMs) }));
  const selectedMarketplaceCounts = new Map<string, number>();
  let unknownMarketplaceCount = 0;
  for (const { sale } of selected) {
    const key = marketplaceKey(sale);
    if (key === 'unknown marketplace' || key === 'unknown_marketplace' || key === 'unattributed') {
      unknownMarketplaceCount += 1;
      continue;
    }
    selectedMarketplaceCounts.set(key, (selectedMarketplaceCounts.get(key) ?? 0) + 1);
  }
  const independentMarketplaceCount = selectedMarketplaceCounts.size;
  const largestMarketplaceShare = selected.length
    ? Math.max(...selectedMarketplaceCounts.values()) / selected.length
    : null;
  const marketplaceConcentration: MarketProfile['marketplaceConcentration'] = unknownMarketplaceCount > 0 || independentMarketplaceCount === 0
    ? 'unavailable'
    : independentMarketplaceCount === 1
      ? 'single_marketplace'
      : largestMarketplaceShare !== null && largestMarketplaceShare > 0.75
        ? 'concentrated'
        : 'diversified';
  const prices = selectedAccepted.map((match) => match.price).sort((a, b) => a - b);
  const q1 = percentile(prices, 0.25);
  const q3 = percentile(prices, 0.75);
  const rawMedian = prices.length ? prices.length % 2 ? prices[Math.floor(prices.length / 2)] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2 : null;
  const iqr = prices.length ? q3 - q1 : null;
  // IQR is too fragile to delete evidence at small N. With 5–9 observations we
  // flag suspicious tails for review but preserve them; automatic exclusion is
  // permitted only at N >= 10 and is always ledger-visible.
  const canApplyIqr = selectedAcceptedWithAge.length >= 10 && iqr !== null;
  const canFlagSmallSampleOutliers = selectedAcceptedWithAge.length >= 5 && selectedAcceptedWithAge.length < 10 && iqr !== null;
  const filtered = canApplyIqr ? selectedAcceptedWithAge.filter(({ match }) => match.price >= q1 - 1.5 * iqr && match.price <= q3 + 1.5 * iqr) : selectedAcceptedWithAge;
  const outlierMatches = new Set(selectedAcceptedWithAge.filter(({ match }) => !filtered.some(({ match: kept }) => kept === match)).map(({ match }) => match));
  const flaggedSmallSampleOutliers = new Set(canFlagSmallSampleOutliers
    ? selectedAcceptedWithAge.filter(({ match }) => match.price < q1 - 1.5 * iqr || match.price > q3 + 1.5 * iqr).map(({ match }) => match)
    : []);
  const valuationMatchRecordsAfterOutliers = valuationMatchRecords.map((match) => outlierMatches.has(match)
    ? {
        ...match,
        accepted: false,
        classification: 'contextual' as const,
        exclusionReason: 'excluded from the deterministic value by the IQR outlier rule; retained in the evidence ledger',
        reasons: [...match.reasons, 'IQR outlier exclusion applied after identity and completed-sale checks'],
      }
    : match);
  const comparableMatches = [...valuationMatchRecordsAfterOutliers, ...contextualMatches, ...duplicateMatches];
  const accepted = filtered.map(({ match }) => match);
  const acceptedWithAge = filtered;
  const acceptedPrices = accepted.map((match) => match.price).sort((a, b) => a - b);
  const median = acceptedPrices.length ? acceptedPrices.length % 2 ? acceptedPrices[Math.floor(acceptedPrices.length / 2)] : (acceptedPrices[acceptedPrices.length / 2 - 1] + acceptedPrices[acceptedPrices.length / 2]) / 2 : null;
  const acceptedQ1 = acceptedPrices.length ? percentile(acceptedPrices, 0.25) : null;
  const acceptedQ3 = acceptedPrices.length ? percentile(acceptedPrices, 0.75) : null;
  const recentSales = acceptedWithAge.filter(({ ageDays }) => ageDays !== null && ageDays <= 90);
  const ages = acceptedWithAge.map(({ ageDays }) => ageDays).filter((age): age is number => age !== null);
  const outlierExcludedCount = outlierMatches.size;
  const weightedDenominator = filtered.reduce((sum, { match, ageDays }) => {
    match.weight = (0.5 + match.score / 100) * recencyWeight(ageDays);
    return sum + match.weight;
  }, 0);
  const weightedValue = weightedDenominator > 0 ? Math.round(filtered.reduce((sum, { match }) => sum + match.price * match.weight, 0) / weightedDenominator) : null;
  const primaryValue = median !== null ? Math.round(median) : null;
  const minimum = filtered.length ? Math.round(Math.min(...filtered.map(({ match }) => match.price))) : null;
  const maximum = filtered.length ? Math.round(Math.max(...filtered.map(({ match }) => match.price))) : null;
  const spreadPct = primaryValue && minimum !== null && maximum !== null ? Math.round(((maximum - minimum) / primaryValue) * 100) : null;
  const recentCount = recentSales.length;
  const salesVelocity = {
    sevenDay: acceptedWithAge.filter(({ ageDays }) => ageDays !== null && ageDays <= 7).length,
    thirtyDay: acceptedWithAge.filter(({ ageDays }) => ageDays !== null && ageDays <= 30).length,
    ninetyDay: recentCount,
  };
  const oldestSaleAgeDays = ages.length ? Math.max(...ages) : null;
  const daysSinceLastAuthoritativeSale = ages.length ? Math.min(...ages) : null;
  const exactMatchCount = accepted.filter((match) => match.classification === 'exact').length;
  const nearMatchCount = accepted.filter((match) => match.classification === 'near').length;
  const directComparableCount = comparableMatches.filter((match) => match.valuationRelationship === 'direct_comparable' && match.accepted).length;
  const gradeAdjacentComparableCount = comparableMatches.filter((match) => match.valuationRelationship === 'grade_adjacent_comparable').length;
  const contextualComparableCount = comparableMatches.filter((match) => match.classification === 'contextual').length;
  const identityReadiness = buildTestAiP0Identity(target).readiness;
  const itemIdentificationConfidence: ConfidenceLevel = exactMatchCount >= 3 ? 'high' : exactMatchCount >= 1 || accepted.length >= 3 ? 'medium' : 'low';
  const calculatedEvidenceQuality: ConfidenceLevel = accepted.length >= categoryEvidenceThresholds.minimumSelectedSales + 1 && exactMatchCount >= 2 && (spreadPct === null || spreadPct <= categoryEvidenceThresholds.maximumSpreadPct)
    ? 'high'
    : accepted.length >= Math.max(3, categoryEvidenceThresholds.minimumSelectedSales - 1) && (spreadPct === null || spreadPct <= categoryEvidenceThresholds.maximumSpreadPct + 25)
      ? 'medium'
      : 'low';
  const evidenceQuality: ConfidenceLevel = evidenceCoverage.sourceReliability === 'low' || evidenceCoverage.sourceReliability === 'unavailable'
    ? 'low'
    : evidenceCoverage.sourceReliability === 'medium' && calculatedEvidenceQuality === 'high'
      ? 'medium'
      : calculatedEvidenceQuality;
  const marketStability: ConfidenceLevel = spreadPct === null ? 'low' : spreadPct <= 35 ? 'high' : spreadPct <= 75 ? 'medium' : 'low';
  const liquidity: ConfidenceLevel = salesVelocity.thirtyDay >= 5 ? 'high' : salesVelocity.ninetyDay >= 3 ? 'medium' : 'low';
  const gradeConditionConfidence: ConfidenceLevel = target.grade || target.condition ? (accepted.some((match) => match.reasons.some((reason) => reason === 'grade matches')) ? 'high' : 'low') : 'medium';
  const missingInformation: string[] = [];
  const details = parseDetails(target);
  if (!target.title.trim()) missingInformation.push('item title');
  if (!target.category.trim()) missingInformation.push('category');
  if (identityReadiness !== 'ready') missingInformation.push(`critical identifiers (${buildTestAiP0Identity(target).missingCriticalFields.join(', ')})`);
  const valuationWarnings: string[] = [];
  if (aggregateMetrics && accepted.length === 0 && (aggregateMetrics.count ?? 0) > 0) valuationWarnings.push('Aggregate market data exists, but no individual comparable titles were available for identity matching.');
  if (spreadPct !== null && spreadPct > categoryEvidenceThresholds.maximumSpreadPct) valuationWarnings.push(`Authoritative comparable prices exceed the ${categoryEvidenceThresholds.maximumSpreadPct}% ${categoryEvidenceThresholds.category} spread threshold.`);
  if (accepted.length < categoryEvidenceThresholds.minimumSelectedSales) valuationWarnings.push(`Fewer than ${categoryEvidenceThresholds.minimumSelectedSales} accepted completed sales are available for ${categoryEvidenceThresholds.category}; treat the range as preliminary review evidence.`);
  if (selectedAcceptedWithAge.length > 0 && selectedAcceptedWithAge.length < 5) valuationWarnings.push('IQR outlier filtering was not applied because fewer than five selected completed sales are available.');
  if (flaggedSmallSampleOutliers.size > 0) valuationWarnings.push(`${flaggedSmallSampleOutliers.size} suspicious price tail${flaggedSmallSampleOutliers.size === 1 ? '' : 's'} was flagged for review but retained because the selected sample has fewer than ten completed sales.`);
  if (outlierExcludedCount > 0) valuationWarnings.push(`${outlierExcludedCount} identity-matched completed sale${outlierExcludedCount === 1 ? '' : 's'} was excluded from the deterministic value by the IQR outlier rule and remains visible in the audit ledger.`);
  if (primaryValue !== null && weightedValue !== null && Math.abs(weightedValue - primaryValue) / primaryValue > 0.15) valuationWarnings.push('The recency-weighted mean materially differs from the median primary value; review sale timing and price dispersion.');
  if (oldestSaleAgeDays !== null && oldestSaleAgeDays > 365) valuationWarnings.push('The oldest included authoritative sale is more than one year old.');
  if (contextualComparableCount > 0) valuationWarnings.push('Historical, undated, non-completed, or insufficiently identified records were retained as context but excluded from valuation.');
  if (gradeAdjacentComparableCount > 0) valuationWarnings.push(`${gradeAdjacentComparableCount} grade/certification-adjacent record${gradeAdjacentComparableCount === 1 ? '' : 's'} was retained as secondary evidence but excluded from direct valuation.`);
  if (deduplicated.duplicates.length > 0) valuationWarnings.push(`${deduplicated.duplicates.length} duplicate sale observation${deduplicated.duplicates.length === 1 ? '' : 's'} was excluded.`);
  if (deduplicated.possibleDuplicates.length > 0) valuationWarnings.push(`${deduplicated.possibleDuplicates.length} possible duplicate${deduplicated.possibleDuplicates.length === 1 ? '' : 's'} remains in valuation and is labeled for manual review because its transaction identity is not proven.`);
  if (selection.diagnostics.omittedByCap > 0) valuationWarnings.push(`${selection.diagnostics.omittedByCap} otherwise matched sale observation${selection.diagnostics.omittedByCap === 1 ? '' : 's'} was retained in the audit but omitted from the bounded valuation set after source-balanced selection.`);
  if (marketplaceConcentration === 'single_marketplace') valuationWarnings.push('All selected completed sales originate from one marketplace; independence is limited.');
  if (marketplaceConcentration === 'concentrated') valuationWarnings.push(`Selected evidence is concentrated in one marketplace (${Math.round((largestMarketplaceShare ?? 0) * 100)}% of selected sales).`);
  if (evidenceCoverage.sourceReliability === 'low') valuationWarnings.push('Source reliability is low because marketplace attribution, server provenance, or independent-source breadth is limited.');
  if (evidenceCoverage.sourceReliability === 'medium') valuationWarnings.push('Source reliability is moderate; review the evidence-coverage details before treating the result as broadly representative.');
  const evidenceState: EvidenceState = accepted.length === 0
    ? (comparableMatches.length ? 'poor_item_identification' : 'no_market_evidence')
    : recentCount >= 3 && evidenceQuality === 'high' ? 'strong_recent_market_evidence'
    : recentCount === 0 ? 'stale_market_evidence'
    : accepted.length < 3 ? 'sparse_market_evidence'
    : spreadPct !== null && spreadPct > 100 ? 'conflicting_market_evidence'
    : 'strong_recent_market_evidence';
  const materialReviewRequired = Boolean(identityGate?.materialReviewRequired || identityGate?.sourceAlignmentStatus === 'conflicted');
  if (materialReviewRequired) {
    valuationWarnings.push('Material identity evidence conflict requires review; completed-sale records are withheld from deterministic valuation.');
    if (identityGate?.materialFlags?.length) valuationWarnings.push(...identityGate.materialFlags.map((flag) => `Identity review: ${flag}`));
  }
  const evidenceIndependenceAdequate = independentMarketplaceCount >= categoryEvidenceThresholds.minimumIndependentMarketplaces || accepted.length >= categoryEvidenceThresholds.minimumSelectedSales + 2;
  if (!evidenceIndependenceAdequate && accepted.length > 0) valuationWarnings.push(`Marketplace independence is below the ${categoryEvidenceThresholds.category} evidence floor; at least ${categoryEvidenceThresholds.minimumIndependentMarketplaces} marketplaces or ${categoryEvidenceThresholds.minimumSelectedSales + 2} selected completed sales are required.`);
  if (unknownMarketplaceCount > 0) valuationWarnings.push(`${unknownMarketplaceCount} selected completed sale${unknownMarketplaceCount === 1 ? '' : 's'} has an unknown origin marketplace and does not establish independent-market evidence.`);
  // A preliminary range can be displayed from three accepted sales; the
  // category-specific floor is enforced later by deterministicTradeComparison
  // before a definitive trade verdict is allowed.
  const supported = Boolean(!materialReviewRequired && primaryValue !== null && accepted.length >= 3 && (spreadPct === null || spreadPct <= categoryEvidenceThresholds.maximumSpreadPct + 25));
  const confidenceReasons = [
    `${accepted.length} clean completed sale${accepted.length === 1 ? '' : 's'} selected after identity, source, visual, and outlier checks${accepted.length < 5 ? '; five are required for a definitive trade verdict' : ''}.`,
    `${independentMarketplaceCount} independent marketplace${independentMarketplaceCount === 1 ? '' : 's'}${unknownMarketplaceCount ? `; ${unknownMarketplaceCount} selected record${unknownMarketplaceCount === 1 ? '' : 's'} has an unknown marketplace` : ''}; ${evidenceIndependenceAdequate ? 'independence floor met' : 'independence floor not met for a definitive trade verdict'}.`,
    recentCount ? `${recentCount} selected sale${recentCount === 1 ? '' : 's'} occurred within the last 90 days.` : 'No selected sale occurred within the last 90 days.',
    spreadPct === null ? 'No stable price spread can be calculated from the selected evidence.' : `Selected-value spread is ${spreadPct}% (${marketStability} stability).`,
    `Source reliability is ${evidenceCoverage.sourceReliability}${evidenceCoverage.sourceReliabilityScore !== null ? ` (${evidenceCoverage.sourceReliabilityScore}/100)` : ''}; ${evidenceCoverage.attributedCount}/${evidenceCoverage.selectedCount} selected records are marketplace-attributed and ${evidenceCoverage.independentMarketplaceCount} independent marketplace${evidenceCoverage.independentMarketplaceCount === 1 ? '' : 's'} are represented.`,
    `${categoryEvidenceThresholds.category} threshold: ${categoryEvidenceThresholds.minimumSelectedSales} selected sales, ${categoryEvidenceThresholds.minimumIndependentMarketplaces} independent marketplaces, and no more than ${categoryEvidenceThresholds.maximumSpreadPct}% spread for strong evidence.`,
    outlierExcludedCount ? `${outlierExcludedCount} price outlier${outlierExcludedCount === 1 ? '' : 's'} was withheld from the deterministic value.` : flaggedSmallSampleOutliers.size ? `${flaggedSmallSampleOutliers.size} suspicious price tail${flaggedSmallSampleOutliers.size === 1 ? '' : 's'} remains in the small-sample review set.` : 'No selected price was withheld by the IQR outlier rule.',
  ];
  return {
    marketRange: supported ? { low: minimum!, mid: primaryValue!, high: maximum!, supported: true } : { low: null, mid: null, high: null, supported: false },
    typicalBand: supported && acceptedQ1 !== null && acceptedQ3 !== null ? { low: Math.round(acceptedQ1), high: Math.round(acceptedQ3), supported: true } : { low: null, high: null, supported: false },
    primaryValue,
    weightedValue,
    median: primaryValue ?? aggregateMetrics?.median ?? null,
    minimum,
    maximum,
    interquartileRange: iqr !== null ? Math.round(iqr) : null,
    spreadPct,
    evidenceState,
    evidenceQuality,
    itemIdentificationConfidence,
    marketStability,
    liquidity,
    gradeConditionConfidence,
    salesVelocity,
    daysSinceLastAuthoritativeSale,
    authoritativeSaleCount: accepted.length,
    recentSaleCount: recentCount,
    oldestSaleAgeDays,
    comparableCount: accepted.length,
    rejectedComparableCount: comparableMatches.length - accepted.length,
    exactMatchCount,
    nearMatchCount,
    directComparableCount,
    gradeAdjacentComparableCount,
    contextualComparableCount,
    duplicateSaleCount: deduplicated.duplicates.length,
    possibleDuplicateCount: deduplicated.possibleDuplicates.length,
    outlierExcludedCount,
    outlierFlaggedCount: flaggedSmallSampleOutliers.size,
    outlierPolicy: selectedAcceptedWithAge.length === 0 ? 'not_applied_no_candidates' : canApplyIqr ? 'iqr_applied' : flaggedSmallSampleOutliers.size > 0 ? 'flagged_small_sample' : 'not_applied_insufficient_sample',
    outlierEligibleSampleCount: selectedAcceptedWithAge.length,
    independentMarketplaceCount,
    unknownMarketplaceCount,
    largestMarketplaceShare,
    marketplaceConcentration,
    sourceReliability: evidenceCoverage.sourceReliability,
    sourceReliabilityScore: evidenceCoverage.sourceReliabilityScore,
    sourceReliabilityReasons: evidenceCoverage.sourceReliabilityReasons,
    evidenceCoverage,
    categoryEvidenceThresholds,
    adapterReliabilityHistory,
    confidenceReasons,
    identityReadiness,
    valuationMethod: supported ? `median primary value from exact or near identity-matched completed sales; recency-weighted mean retained as a diagnostic, with duplicate suppression, ${independentMarketplaceCount} independent marketplace${independentMarketplaceCount === 1 ? '' : 's'}, and ${canApplyIqr ? 'IQR outlier filtering' : flaggedSmallSampleOutliers.size ? 'small-sample outlier flagging without automatic exclusion' : 'no automatic outlier filtering because fewer than ten selected sales are available'}` : materialReviewRequired ? 'no verified valuation; material identity evidence conflict requires review' : aggregateMetrics?.median ? 'no verified valuation; aggregate market median shown as unverified context because completed identity-matched sales are insufficient' : 'no verified valuation; insufficient completed-sale evidence',
    majorAssumptions: ['Only USD observations with positive prices were considered.', 'Only completed, dated records within one year and classified exact or near may influence valuation, except a labeled 366–730-day illiquid-market extension when no current verified sale exists.', 'Active asking prices, historical or undated records outside that explicit extension, certification, population, reference data, and RSS remain context only.', 'Exact and documented-probable duplicates are excluded; possible duplicates remain visible for review; grade, condition, variant, and release mismatches reject the result.'],
    missingInformation,
    valuationWarnings,
    comparables: comparableMatches,
    selectionDiagnostics: selection.diagnostics,
  };
}

export function deterministicTradeComparison(
  left: MarketProfile,
  right: MarketProfile,
  leftFallback = 0,
  rightFallback = 0,
): DeterministicTradeComparison {
  const leftValue = left.primaryValue ?? left.weightedValue ?? left.median ?? leftFallback;
  const rightValue = right.primaryValue ?? right.weightedValue ?? right.median ?? rightFallback;
  const difference = rightValue - leftValue;
  const leftThresholds = left.categoryEvidenceThresholds;
  const rightThresholds = right.categoryEvidenceThresholds;
  const hasDefensibleLeftValue = left.marketRange.supported && left.marketRange.low !== null && left.marketRange.mid !== null && left.marketRange.high !== null && left.authoritativeSaleCount >= leftThresholds.minimumSelectedSales && left.evidenceQuality !== 'low' && (left.spreadPct === null || left.spreadPct <= leftThresholds.maximumSpreadPct) && (left.independentMarketplaceCount >= leftThresholds.minimumIndependentMarketplaces || left.authoritativeSaleCount >= leftThresholds.minimumSelectedSales + 2);
  const hasDefensibleRightValue = right.marketRange.supported && right.marketRange.low !== null && right.marketRange.mid !== null && right.marketRange.high !== null && right.authoritativeSaleCount >= rightThresholds.minimumSelectedSales && right.evidenceQuality !== 'low' && (right.spreadPct === null || right.spreadPct <= rightThresholds.maximumSpreadPct) && (right.independentMarketplaceCount >= rightThresholds.minimumIndependentMarketplaces || right.authoritativeSaleCount >= rightThresholds.minimumSelectedSales + 2);
  const hasSufficientEvidence = hasDefensibleLeftValue && hasDefensibleRightValue;
  if (!hasSufficientEvidence) {
    return {
      leftValue,
      rightValue,
      difference,
      differencePercentage: leftValue > 0 ? Math.round((difference / leftValue) * 1000) / 10 : 0,
      verdict: 'Insufficient Evidence',
      rangeRelationship: 'unsupported',
      overlapBand: null,
      overlapAmount: null,
      overlapRatio: null,
      midpointDifference: null,
      typicalBandOverlap: null,
      rangeGap: null,
      decisionBasis: 'One or both sides lack a defensible completed-sale range, so the analyzer cannot make a range-based trade conclusion.',
    };
  }
  // The defensive clause above proves these values are present; bind them once
  // so unsupported null ranges can never enter trade-comparison arithmetic.
  const leftLow = left.marketRange.low!;
  const leftHigh = left.marketRange.high!;
  const rightLow = right.marketRange.low!;
  const rightHigh = right.marketRange.high!;
  const overlapLow = Math.max(leftLow, rightLow);
  const overlapHigh = Math.min(leftHigh, rightHigh);
  const rangesOverlap = overlapLow <= overlapHigh;
  const itemBHigherBand = leftHigh < rightLow;
  const rangeGap = rangesOverlap
    ? 0
    : itemBHigherBand
      ? rightLow - leftHigh
      : leftLow - rightHigh;
  const rangeRelationship: RangeRelationship = rangesOverlap
    ? 'overlap'
    : itemBHigherBand
      ? 'item_b_higher_band'
      : 'item_a_higher_band';
  const verdict: DeterministicTradeComparison['verdict'] = rangesOverlap
    ? 'Ranges Overlap — Evidence is Indeterminate'
    : itemBHigherBand
      ? 'Item B Worth More'
      : 'Item A Worth More';
  const overlapAmount = rangesOverlap ? overlapHigh - overlapLow : 0;
  const smallestObservedRange = Math.min(leftHigh - leftLow, rightHigh - rightLow);
  const overlapRatio = rangesOverlap && smallestObservedRange > 0 ? Math.round((overlapAmount / smallestObservedRange) * 1000) / 1000 : rangesOverlap ? 1 : 0;
  const midpointDifference = right.marketRange.mid! - left.marketRange.mid!;
  const leftTypicalLow = left.typicalBand.low;
  const leftTypicalHigh = left.typicalBand.high;
  const rightTypicalLow = right.typicalBand.low;
  const rightTypicalHigh = right.typicalBand.high;
  const typicalBandOverlap = left.typicalBand.supported && right.typicalBand.supported && leftTypicalLow !== null && leftTypicalHigh !== null && rightTypicalLow !== null && rightTypicalHigh !== null
    ? Math.max(leftTypicalLow, rightTypicalLow) <= Math.min(leftTypicalHigh, rightTypicalHigh)
      ? { low: Math.max(leftTypicalLow, rightTypicalLow), high: Math.min(leftTypicalHigh, rightTypicalHigh) }
      : null
    : null;
  return {
    leftValue,
    rightValue,
    difference,
    differencePercentage: leftValue > 0 ? Math.round((difference / leftValue) * 1000) / 10 : 0,
    verdict,
    rangeRelationship,
    overlapBand: rangesOverlap ? { low: overlapLow, high: overlapHigh } : null,
    overlapAmount,
    overlapRatio,
    midpointDifference,
    typicalBandOverlap,
    rangeGap,
    decisionBasis: rangesOverlap
      ? `The completed-sale ranges overlap from $${overlapLow.toLocaleString()} to $${overlapHigh.toLocaleString()} (${Math.round((overlapRatio ?? 0) * 100)}% of the narrower observed range), so the midpoint difference of $${Math.abs(midpointDifference).toLocaleString()} is not treated as proof that either side is worth more.`
      : itemBHigherBand
        ? `Item B's completed-sale range begins $${rangeGap.toLocaleString()} above Item A's range, so the evidence bands do not overlap.`
        : `Item A's completed-sale range begins $${rangeGap.toLocaleString()} above Item B's range, so the evidence bands do not overlap.`,
  };
}

export function marketProfileForPrompt(label: string, profile: MarketProfile): string {
  return [
    `${label} DETERMINISTIC MARKET PROFILE:`,
    `- Evidence state: ${profile.evidenceState}; valuation method: ${profile.valuationMethod}`,
    `- Primary median value: ${profile.primaryValue === null ? 'unavailable' : `$${profile.primaryValue.toLocaleString()}`}; weighted mean diagnostic: ${profile.weightedValue === null ? 'unavailable' : `$${profile.weightedValue.toLocaleString()}`}`,
    `- Observed accepted sale range: ${profile.marketRange.supported && profile.marketRange.low !== null && profile.marketRange.high !== null ? `$${profile.marketRange.low.toLocaleString()}-$${profile.marketRange.high.toLocaleString()}` : 'no defensible range'}`,
    `- Confidence: evidence ${profile.evidenceQuality}, identification ${profile.itemIdentificationConfidence}, stability ${profile.marketStability}, liquidity ${profile.liquidity}, grade/condition ${profile.gradeConditionConfidence}`,
    `- Sales velocity: 7d ${profile.salesVelocity.sevenDay}, 30d ${profile.salesVelocity.thirtyDay}, 90d ${profile.salesVelocity.ninetyDay}; recent sales ${profile.recentSaleCount}; authoritative sales ${profile.authoritativeSaleCount}`,
    `- Comparables: ${profile.comparableCount} accepted (${profile.directComparableCount} direct; ${profile.exactMatchCount} exact, ${profile.nearMatchCount} near), ${profile.gradeAdjacentComparableCount} grade/certification-adjacent secondary, ${profile.contextualComparableCount} contextual, ${profile.rejectedComparableCount} excluded, ${profile.duplicateSaleCount} duplicates suppressed; identity readiness ${profile.identityReadiness}; warnings: ${profile.valuationWarnings.join(' ') || 'none'}`,
  ].join('\n');
}
