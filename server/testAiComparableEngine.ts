import { buildTestAiP0Identity } from '../shared/testAiP0Evidence';
import { classifyStampFormat, stampFormatsCompatible } from './stampFormat';
import { extractIdentityState, identityStateConflicts } from './testAiIdentityState';
import { isVerifiedGuideAnchor } from './testAiGuideEvidence';
import { TEST_AI_VALUE_UNAVAILABLE_MESSAGE, nullableTestAiPrice, type GuideValueAnchor } from '../shared/testAiEvidenceNormalization';
import { hasVerifiedHistoricSaleEconomics } from './testAiHistoricMarketContext';
import { videoGameGradersEquivalent } from '../shared/videoGameGraderEquivalence';
import { autographAuthenticationCompaniesEquivalent } from '../shared/testAiMetadataConflict';
import { normalizeAutographAuthenticator, findAutographAuthenticatorInText } from '../shared/testAiAutographAuthentication';
import { getVerifiedIdentityApproval, hasVerifiedMercariUndatedSale, transferVerifiedIdentityApproval, verifyCanonicalObservation } from './testAiCanonicalObservation';
import { resolveTestAiGradingCompany } from '../shared/testAiCriteria';
import { signedTransactionLotConflict, transactionIdentity, type TransactionIdentity } from './testAiEconomicIntegrity';
import { autographMarketExclusionReason, autographMarketRelevanceScore, autographValuationEligibility,
  buildVisualTargetMetadata, disneyPinsTitleDerivedPinNameEvidence, type VisualEvidence } from './testAiVisualSourceFilter';
import { randomUUID } from 'node:crypto';
import { FINAL_VALUATION_USE_VERSION, boundedFinalSourceCorrelation, makeFinalAuditRef,
  readServerNormalizationReport, retainServerNormalizationReport, finalUsePopulation,
  type FinalIntakeReport, type FinalIdentityAdmission, type FinalValuationUse, type FinalUseReport, type FinalRejectionReason,
  boundedFinalDisplayCorrelation, boundedDiagnosticVisualExecution, type FinalDisplayCorrelation, type FinalUsePriceGroup, type ValuationUseOptions } from '../shared/testAiValuationUse';
import type { MetadataRankingBinding } from '../shared/testAiRankingPopulation';
import { comparePokemonCardNumbers, parsePokemonCardNumber, readPokemonCardNumbersFromTitle,
  type PokemonCardNumberComparison } from '../shared/testAiPokemonCardNumber';
import { classifyDisneyPinForm, disneyPinFormsConflict } from '../shared/testAiDisneyPinForm';

import { getCategoryEvidenceThresholds, type CategoryEvidenceThresholds } from '../shared/testAiSalesEvidencePolicy';
export { getCategoryEvidenceThresholds } from '../shared/testAiSalesEvidencePolicy';
export type { CategoryEvidenceThresholds } from '../shared/testAiSalesEvidencePolicy';

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
  /** Binding-only primary-image reference, independent of final vision dispatch. */
  approvalTargetImageReference?: string;
  /** Explicit entered/estimated reference only; not collectible identity proof. */
  statedTradeValue?: number;
}

export interface MarketSale {
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  date?: string | null;
  /** Signed server-only Mercari policy; the string alone never grants admission. */
  saleDatePolicy?: 'mercari_undated_sold_v1' | null;
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
  /** Signed diagnostic payload only; server-only authority is not this property. */
  identityApproval?: unknown;
  visualEvidence?: VisualEvidence;
  visualAudit?: unknown;
  visualDifferences?: unknown[] | null;
  normalizedStructuredMetadata?: Readonly<Record<string, string>>;
  metadataMatchScore?: number | null;
  metadataMatchRank?: number | null;
  metadataMatchReasons?: string[] | null;
  metadataFieldComparisons?: unknown[] | null;
  metadataRanking?: MetadataRankingBinding | null;
  metadataOriginOccurrenceKey?: string | null;
  metadataUnknownFields?: unknown[] | null;
  metadataScoreAwards?: unknown[] | null;
  metadataMatchLabel?: string | null;
  visualExecution?: unknown;
  reportedVisualExecution?: unknown;
  displayCorrelation?: FinalDisplayCorrelation | null;
  /** Inbound JSON never establishes this server-owned reporting receipt. */
  analysisIntake?: FinalIntakeReport;
  /** Structured server-final rejection; reporting only and never an approval input. */
  approvalFailure?: FinalRejectionReason;
  valuationUse?: FinalValuationUse;
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
  price: number | null;
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
  identityApproval?: unknown;
  identityAdmissionBasis?: 'server_final_visual' | 'server_autograph_market_relevance' | 'title_evidence';
  visualEvidence?: VisualEvidence;
  visualAudit?: unknown;
  visualDifferences?: unknown[] | null;
  normalizedStructuredMetadata?: Readonly<Record<string, string>>;
  metadataMatchScore?: number | null;
  metadataMatchRank?: number | null;
  metadataMatchReasons?: string[] | null;
  metadataFieldComparisons?: unknown[] | null;
  /** Unmodified title-only assessment remains available beside final approval. */
  titleCategoryIdentity?: ComparableCategoryIdentity;
  /** Stable machine-readable reason for direct analyzer admission or exclusion. */
  admissionCode?: 'USED_DIRECT' | 'OMITTED_BY_CAP' | 'SECONDARY_EVIDENCE' | 'CONTEXT_ONLY' | 'REVIEW_REQUIRED' | 'REJECTED_IDENTITY';
  duplicateOf?: string;
  metadataRanking?: MetadataRankingBinding | null;
  metadataOriginOccurrenceKey?: string | null;
  metadataUnknownFields?: unknown[] | null;
  metadataScoreAwards?: unknown[] | null;
  metadataMatchLabel?: string | null;
  visualExecution?: unknown;
  reportedVisualExecution?: unknown;
  approvalFailure?: FinalRejectionReason;
  /** Raw branch result before financial ledger context/cap/duplicate wrapping. */
  identityAdmission?: FinalIdentityAdmission;
  valuationUse?: FinalValuationUse;
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
  /** Sufficient dated-window sales plus qualified undated Mercari; otherwise guide fallback. */
  primaryValue: number | null;
  valuationBasis: 'market_sales' | 'guide_fallback' | 'insufficient_evidence';
  valuationBasisReason: string;
  /** Median of the dated-window/qualified-undated valuation pool, never a timing assertion. */
  saleMedianValue: number | null;
  /** Actual dated-window proof excludes undated exceptions. */
  currentWindowSaleCount: number;
  currentWindowIndependentMarketplaceCount: number;
  /** Sufficiency population; existing floors apply without reducing requirements. */
  valuationEligibleSaleCount?: number;
  valuationEligibleIndependentMarketplaceCount?: number;
  qualifiedUndatedMercariSaleCount?: number;
  /** Verified applicable guide, used only as fallback; never a sale or range midpoint. */
  guideAnchorValue: number | null;
  guideAnchorSourceId: string | null;
  guideAnchorSourceLabel: string | null;
  guideAnchorGrade: string | null;
  guideAnchorMatchType: 'exact' | 'mapped' | null;
  guideAnchorWeightPct: number;
  guideAdjustedValue: number | null;
  guideProvisional: boolean;
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
  finalUseReport?: FinalUseReport;
}

export interface ComparableIdentityGate {
  materialReviewRequired?: boolean;
  materialFlags?: string[];
  sourceAlignmentStatus?: 'aligned' | 'conflicted' | 'unavailable';
}

export type RangeRelationship = 'overlap' | 'item_a_higher_band' | 'item_b_higher_band' | 'unsupported';
export interface DeterministicTradeComparison {
  leftValue: number | null;
  rightValue: number | null;
  difference: number | null;
  differencePercentage: number | null;
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

function pokemonStructuredNumbers(record: Readonly<Record<string, unknown>> | undefined): string[] {
  return Object.entries(record ?? {})
    .filter(([field]) => ['cardnumber', 'cardno', 'number'].includes(field.toLowerCase().replace(/[^a-z0-9]/g, '')))
    .flatMap(([, value]) => Array.isArray(value) ? value : [value])
    .flatMap(value => {
      const parsed = parsePokemonCardNumber(value);
      return parsed ? [parsed.raw] : [];
    });
}

/** Whether one observation includes every explicit component of another. */
function pokemonNumberCovers(expected: string, observed: string): boolean {
  const left = parsePokemonCardNumber(expected), right = parsePokemonCardNumber(observed);
  if (!left || !right || comparePokemonCardNumbers(expected, observed) === 'different') return false;
  return ([['numerator', left.numerator], ['denominator', left.denominator]] as const).every(([role, part]) => {
    if (!part) return true;
    const candidate = right[role];
    return Boolean(candidate && part.number === candidate.number
      && (!part.prefix || part.prefix === candidate.prefix) && (!part.suffix || part.suffix === candidate.suffix));
  });
}

/** Title witnesses can confirm; declared structured numbers can only contradict. */
function pokemonComparableNumberStatus(target: ComparableTarget, details: Record<string, unknown>, title: string,
  declaredNumbers: readonly string[] = []): {
    targetValue: string | null; observedNumber: string | null;
    comparison: PokemonCardNumberComparison; conflicts: string[];
  } {
  const targetTitle = readPokemonCardNumbersFromTitle(target.title);
  const sourceTitle = readPokemonCardNumbersFromTitle(title);
  const targets = [...new Set([...pokemonStructuredNumbers(details), ...targetTitle.observations.map(value => value.raw)])];
  const titleNumbers = sourceTitle.observations.map(value => value.raw);
  const candidates = [...new Set([...titleNumbers, ...declaredNumbers])];
  const conflicts: string[] = [];
  const addConflict = (value: string) => {
    // Keep the existing exact #3 diagnostic while retaining full namespace/fraction.
    const diagnostic = parsePokemonCardNumber(value)?.canonical ?? value;
    if (!conflicts.includes(diagnostic)) conflicts.push(diagnostic);
  };
  for (const values of [targets, candidates]) {
    values.forEach((value, index) => values.slice(index + 1).forEach(other => {
      if (comparePokemonCardNumbers(value, other) === 'different') addConflict(other);
    }));
  }
  for (const expected of targets) {
    for (const candidate of candidates) {
      if (comparePokemonCardNumbers(expected, candidate) === 'different') addConflict(candidate);
    }
  }
  if ((targetTitle.ambiguous || sourceTitle.ambiguous) && !conflicts.length) addConflict('ambiguous title numbers');
  // Keep the most complete target witnesses, without combining incomparable
  // fragments or inferring absent components. A lone #4 vs 4/102 stays partial.
  const completeTargets = targets.filter(expected => !targets.some(other =>
    comparePokemonCardNumbers(expected, other) === 'partial' && pokemonNumberCovers(expected, other)));
  const fullMatch = titleNumbers.some(value => targets.length > 0
    && completeTargets.every(expected => comparePokemonCardNumbers(expected, value) === 'match'));
  const partialMatch = titleNumbers.some(value => targets.some(expected =>
    ['match', 'partial'].includes(comparePokemonCardNumbers(expected, value))));
  const observed = sourceTitle.observations.find(value => value.denominator) ?? sourceTitle.observations[0];
  return {
    targetValue: targets[0] ?? null,
    observedNumber: observed?.raw ?? null,
    comparison: conflicts.length ? 'different' : fullMatch ? 'match' : partialMatch ? 'partial' : 'unknown',
    conflicts,
  };
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

function possibleTransactionKey(sale: MarketSale): string | null {
  const origin = normalizeFingerprintText(sale.originMarketplace || sale.marketplace);
  const title = normalizeFingerprintText(sale.title);
  const date = String(sale.date ?? '').slice(0, 10);
  return origin && title && date ? `possible:${origin}|${title}|${date}` : null;
}

function sameTransaction(left: TransactionIdentity, right: TransactionIdentity): boolean {
  if (left.origin !== right.origin || !left.date || left.date !== right.date) return false;
  // Distinct known IDs in the same provider namespace are separate even if a
  // reusable listing URL, title, date and price happen to agree.
  if (left.adapter === right.adapter && left.providerRecordId && right.providerRecordId
    && left.providerRecordId !== right.providerRecordId) return false;
  return Boolean(left.recordKey && left.recordKey === right.recordKey
    || left.urlKey && left.urlKey === right.urlKey);
}

/** Repeated signed undated Mercari records are not independent sufficiency credit. */
function sameQualifiedUndatedTransaction(left: MarketSale, right: MarketSale): boolean {
  if (!hasVerifiedMercariUndatedSale(left) || !hasVerifiedMercariUndatedSale(right)) return false;
  const a = transactionIdentity(left), b = transactionIdentity(right);
  if (a.providerRecordId && b.providerRecordId && a.providerRecordId !== b.providerRecordId) return false;
  return Boolean(a.providerRecordId && a.providerRecordId === b.providerRecordId
    || a.listingUrl && a.listingUrl === b.listingUrl);
}

export function deduplicateMarketSales(sales: MarketSale[], captureIdentity?: (sale: MarketSale) => FinalIdentityAdmission,
  usableForTarget?: (sale: MarketSale, identity: FinalIdentityAdmission | undefined) => boolean): { unique: MarketSale[]; duplicates: Array<{ sale: MarketSale; duplicateOf: string; originalSale: MarketSale; originalIdentityAdmission?: FinalIdentityAdmission }>; possibleDuplicates: MarketSale[]; inputOrdinals: Map<MarketSale, number> } {
  const entries = sales.map((sale, ordinal) => ({ sale, ordinal, transaction: transactionIdentity(sale), identity: captureIdentity?.(sale) }));
  type Entry = typeof entries[number];
  const authorityPriority = (entry: Entry): number[] => {
    const receipt = readServerNormalizationReport(entry.sale);
    const verified = receipt?.sourceAdmission.verification === 'verified';
    const financial = receipt ? receipt.sourceAdmission.normalizationEligible === true || hasVerifiedHistoricSaleEconomics(entry.sale)
      : entry.sale.evidenceDisposition === 'valuation_eligible';
    const usable = financial && (usableForTarget ? usableForTarget(entry.sale, entry.identity)
      : !entry.identity || entry.identity.accepted);
    return [Number(verified && usable), Number(verified && financial), Number(verified),
      Number(usable), Number(entry.identity?.serverFinalApprovalVerified === true)];
  };
  const preferred = (left: Entry, right: Entry): Entry => {
    const a = authorityPriority(left), b = authorityPriority(right);
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return a[index]! > b[index]! ? left : right;
    }
    return left.ordinal <= right.ordinal ? left : right;
  };
  const groups: Array<{ members: Entry[]; winner: Entry }> = [];
  for (const entry of entries) {
    const group = groups.find((candidate) => candidate.members.some((member) => sameTransaction(member.transaction, entry.transaction)
      || sameQualifiedUndatedTransaction(member.sale, entry.sale))
      && candidate.members.every((member) => member.transaction.adapter !== entry.transaction.adapter
        || !member.transaction.providerRecordId || !entry.transaction.providerRecordId
        || member.transaction.providerRecordId === entry.transaction.providerRecordId));
    if (group) { group.members.push(entry); group.winner = preferred(group.winner, entry); }
    else groups.push({ members: [entry], winner: entry });
  }
  const unique: MarketSale[] = [];
  const duplicates: Array<{ sale: MarketSale; duplicateOf: string; originalSale: MarketSale; originalIdentityAdmission?: FinalIdentityAdmission }> = [];
  const possibleDuplicates: MarketSale[] = [];
  const inputOrdinals = new Map<MarketSale, number>();
  for (const group of groups) {
    const { sale, transaction, ordinal } = group.winner;
    const possibleKey = possibleTransactionKey(sale);
    const possible = entries.some((entry) => !group.members.includes(entry) && (
      possibleKey && possibleTransactionKey(entry.sale) === possibleKey
      || transaction.origin === entry.transaction.origin && (
        transaction.adapter === entry.transaction.adapter && transaction.providerRecordId
          && transaction.providerRecordId === entry.transaction.providerRecordId
        || transaction.listingUrl && transaction.listingUrl === entry.transaction.listingUrl)));
    const retained: MarketSale = { ...sale, duplicateStatus: possible ? 'possible_duplicate' : 'unique' };
    const receipt = readServerNormalizationReport(sale);
    if (receipt) retainServerNormalizationReport(retained, receipt);
    transferVerifiedIdentityApproval(sale, retained);
    if (possible) possibleDuplicates.push(retained);
    unique.push(retained);
    inputOrdinals.set(retained, ordinal);
    for (const member of group.members) {
      if (member === group.winner) continue;
      // Raw admission and the private receipt belong to the suppressed original;
      // duplicate diagnostic copies intentionally receive no approval authority.
      const duplicateSale: MarketSale = { ...member.sale, duplicateStatus: 'exact_duplicate' };
      const duplicateReceipt = readServerNormalizationReport(member.sale);
      if (duplicateReceipt) retainServerNormalizationReport(duplicateSale, duplicateReceipt);
      duplicates.push({ sale: duplicateSale, duplicateOf: transaction.recordKey || transaction.urlKey
        || sale.canonicalTransactionId || `record:${transaction.adapter}:${transaction.providerRecordId}`,
        originalSale: member.sale, originalIdentityAdmission: member.identity });
      inputOrdinals.set(duplicateSale, member.ordinal);
    }
  }
  return { unique, duplicates, possibleDuplicates, inputOrdinals };
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
  '130point', 'sold_comps', 'mercari_sold_comps', 'the_card_api', 'cardsight_ai', 'lelands', 'pristine_auction', 'collect_auction', 'sirius_sports_auctions', 'sirius_sports_auctions',
  'pcgs_auction_results', 'comicconnect', 'goldin', 'weiss', 'nate_sanders',
  'ngc', 'hakes', 'morphy', 'theriaults', 'bertoia', 'rumsey',
  'cherrystone', 'raritan', 'poster_auctions', 'hipstamp', 'pricecharting', 'lcg',
]);

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

export function isCompletedSaleCandidate(sale: MarketSale, nowMs: number, target?: ComparableTarget): boolean {
  if (sale.evidenceDisposition && sale.evidenceDisposition !== 'valuation_eligible') return false;
  if (sale.saleStatus !== 'completed') return false;
  if (!sale.priceBasis || !['realized', 'sold', 'closed'].includes(sale.priceBasis)) return false;
  if (hasVerifiedMercariUndatedSale(sale, target)) return true;
  if (sale.sourceAdapter === 'mercari_sold_comps' || sale.sourceId === 'mercari_sold_comps') return false;
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
  const deduplicated = deduplicateMarketSales(sales, (sale) => scoreComparable(target, sale).identityAdmission!,
    (sale, identity) => (isCompletedSaleCandidate(sale, nowMs, target) || hasVerifiedHistoricSaleEconomics(sale))
      && String(sale.currency ?? 'UNKNOWN').toUpperCase() === 'USD'
      && identity?.accepted === true);
  const valuationCandidates = deduplicated.unique.filter((sale) => isCompletedSaleCandidate(sale, nowMs, target));
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
  // PCGS View All commonly renders a face value literally (for example,
  // "2025 $1 Silver Eagle") instead of spelling out "dollar". Preserve the
  // explicit symbol match before punctuation is normalized away.
  const literalDollar = String(denomination ?? '').trim().match(/^\$(\d+(?:\.\d+)?)$/);
  if (literalDollar && new RegExp(`\\$\\s*${literalDollar[1]}\\b`).test(title)) return true;
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
function musicLabelComparable(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  if (/\b(?:capital|capitol) records?\b/.test(normalized)) return 'capitol';
  if (/\b(?:dgc|dgcc|geffen)(?: records?)?\b/.test(normalized)) return 'geffen';
  return normalized.replace(/\s+records?$/, '').trim();
}
function musicPressing(value: string | null | undefined): string | null {
  const normalized = normalizedIdentityText(value);
  if (!normalized) return null;
  if (/first (?:edition|pressing)|original (?:edition|pressing)/.test(normalized)) return 'first_pressing';
  if (/second pressing/.test(normalized)) return 'second_pressing';
  if (/reissue|re release/.test(normalized)) return 'reissue';
  if (/remaster/.test(normalized)) return 'remaster';
  if (/\bmono\b/.test(normalized)) return 'mono';
  if (/\bstereo\b/.test(normalized)) return 'stereo';
  return normalized;
}
function musicEditionComparable(value: string | null | undefined): string | null {
  return musicPressing(value);
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

function disneyPinsTargetEdition(
  limitedEdition: string | null | undefined,
  openEdition: string | null | undefined,
  editionSize: string | null | undefined,
): PinEdition | null {
  const open = pinEdition(openEdition);
  if (open) return open;
  const limited = pinEdition(limitedEdition, editionSize);
  if (limited) return limited;
  if (/^(?:yes|true)$/i.test(normalizedIdentityText(limitedEdition))) {
    return { kind: 'limited', size: String(editionSize ?? '').match(/\d{1,6}/)?.[0] ?? null };
  }
  return null;
}

function pinEditionInTitle(title: string): PinEdition | null {
  return pinEdition(title);
}

type PinForm = 'single' | 'lot' | 'set' | 'unknown';

function pinForm(value: string | null | undefined, targetItemType?: string | null): PinForm {
  return classifyDisneyPinForm({ title: value, itemType: value, targetItemType });
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

type AutographItemForm = 'jersey' | 'baseball' | 'football' | 'basketball' | 'hockey_puck' | 'helmet' | 'bat' | 'glove' | 'photo' | 'card' | 'guitar' | 'book' | 'poster' | 'paper' | 'unknown';

function autographItemForm(value: string | null | undefined): AutographItemForm {
  const normalized = normalizedIdentityText(value);
  // Envelope is a Paper signed object, not the baseball theme it depicts.
  // Keep this final identity boundary consistent with source classification.
  if (/\benvelopes?\b/.test(normalized)) return 'paper';
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
  if (/\bpaper\b|\bcut(?:\s+(?:signature|autograph))?\b/.test(normalized)) return 'paper';
  return 'unknown';
}

function autographAuthenticationCompany(value: string | null | undefined): string | null {
  const normalized = normalizeAutographAuthenticator(value);
  return normalized || null;
}

function autographAuthenticationInTitle(title: string): string | null {
  return findAutographAuthenticatorInText(title);
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
  const normalizedTargetNumber = category === 'pokemon' ? null : normalizeComparableNumber(targetNumber);
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
    const playerMatches = titleContainsExpectedPhrase(title, player);
    const brandAnchor = manufacturer?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Only an explicit personal-name-shaped declaration between a known
    // manufacturer and card#/grader anchor is treated as a different player.
    // Sparse or set/finish-only text remains Unknown, not an invented person.
    const namedPlayer = !playerMatches && brandAnchor ? title.match(new RegExp(`\\b${brandAnchor}\\s+([A-Z][A-Za-z'’.-]+(?:\\s+[A-Z][A-Za-z'’.-]+){1,3})\\s+(?=#?\\d|PSA\\b|BGS\\b|SGC\\b|CGC\\b)`, 'u'))?.[1] : null;
    const playerConflict = namedPlayer && !/\b(?:chrome|refractor|rookie|card|basketball|baseball|football|hockey|edition|insert|parallel|gold|silver|label|autograph|auto|collection|series)\b/i.test(namedPlayer)
      ? namedPlayer : null;
    record('Player', player, playerMatches, playerConflict);
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
    const finish = firstString(details, ['finish', 'finishVariant']);
    const cardType = firstString(details, ['cardType', 'mechanic', 'variant', 'variation']);
    record('Card name', cardName, titleContainsExpectedPhrase(title, cardName));
    record('Set', setName, titleContainsExpectedPhrase(title, setName));
    const number = pokemonComparableNumberStatus(target, details, title);
    record('Card #', number.targetValue, number.comparison === 'match', number.conflicts.join(', ') || null);
    if (!number.targetValue && number.conflicts.length) conflicts.push(`Card # differs (${number.conflicts.join(', ')})`);
    record('Edition / era', edition, titleContainsExpectedPhrase(title, edition));
    record('Finish', finish, titleContainsExpectedPhrase(title, finish));
    record('Card type / mechanic', cardType, titleContainsExpectedPhrase(title, cardType));
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
    const targetPressing = musicEditionComparable(pressing);
    const observedPressing = musicEditionComparable(title);
    const observedLabel = recordLabelInTitle(title);
    const targetLabel = musicLabelComparable(label);
    const candidateLabel = musicLabelComparable(observedLabel);
    const labelConflict = candidateLabel && targetLabel && candidateLabel !== targetLabel ? observedLabel : null;
    const parsedTitle = musicArtistAndReleaseFromTitle(title);
    const artistConflict = parsedTitle && artist && !titleContainsExpectedPhrase(parsedTitle.artist, artist) ? parsedTitle.artist : null;
    const releaseConflict = parsedTitle && releaseTitle && !titleContainsExpectedPhrase(parsedTitle.release, releaseTitle) ? parsedTitle.release : null;

    record('Artist', artist, titleContainsExpectedPhrase(title, artist), artistConflict);
    record('Release title', releaseTitle, titleContainsExpectedPhrase(title, releaseTitle), releaseConflict);
    record('Catalog #', catalogNumber, catalogMatch.matches, catalogMatch.conflict);
    record('Label', label, titleContainsExpectedPhrase(title, label), labelConflict);
    // Marketplace titles commonly omit pressing country. Missing country is
    // neutral for Music; an explicitly different country remains a conflict.
    if (countryMatch.conflict) record('Country', country, false, countryMatch.conflict);
    else if (countryMatch.matches) confirmedFields.push('Country');
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
    const openEdition = firstString(details, ['openEdition']);
    const editionSize = firstString(details, ['editionSize']);
    const number = normalizeComparableNumber(pinNumber);
    const observedPinNumber = extractComparableNumber(title);
    const targetEdition = disneyPinsTargetEdition(limitedEdition, openEdition, editionSize);
    const observedEdition = pinEditionInTitle(title);
    const expectedEvent = event || series || '';
    const targetEvent = disneyContextInTitle(expectedEvent);
    const observedEvent = disneyContextInTitle(title);
    const targetForm = pinForm(
      firstString(details, ['itemForm', 'format', 'pinFormat']) || target.itemType || target.title,
      target.itemType,
    );
    const candidateForm = pinForm(title, target.itemType);

    // The target's structured Pin Name being known is expected. The missing
    // fact is the candidate's provider Pin Name, so always evaluate the
    // candidate title with the same bounded parser used by the scorer.
    const titleDerivedPinName = disneyPinsTitleDerivedPinNameEvidence(pinName, character, title);
    record('Pin name', pinName, Boolean(titleDerivedPinName) || titleContainsExpectedPhrase(title, pinName));
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
      const formConflict = disneyPinFormsConflict(targetForm, candidateForm) ? candidateForm : null;
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
      // Marketplace titles usually do not state that a signed item has no
      // inscription. Treat target "No" plus candidate silence as nonblocking
      // unknown evidence; an explicit inscription still conflicts, while an
      // explicit matching absence remains confirmed.
      if (!(targetInscription.state === 'absent' && candidateInscription.state === 'unknown')) {
        record('Inscription', targetInscription.key || targetInscription.state, inscriptionMatches, inscriptionConflict);
      }
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

/** Only form labels are compared; form-only text cannot invent a player or edition conflict. */
export function signedComparableFormConflicts(target: ComparableTarget, saleForm: string | null | undefined): string[] {
  if (!saleForm?.trim()) return [];
  const assessment = assessComparableCategoryIdentity(target, parseDetails(target), saleForm.replace(/_/g, ' '), null);
  return assessment.conflicts.filter((conflict) => /^(?:Stamp form|Object form|Package state|Format|Pin form|Packaging|Toy form|Signed item form|Movie collectible form|Poster format) differs\b/.test(conflict));
}

export function scoreComparable(target: ComparableTarget, sale: MarketSale): ComparableMatch {
  const title = String(sale.title ?? '').trim();
  const price = nullableTestAiPrice(sale.price);
  const details = parseDetails(target);
  const categoryKey = String(target.category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const isDisneyPins = categoryKey === 'disney_pins';
  // Recompute the approved Autographs policy from signed canonical title facts
  // against this target. Browser score/awards and a not_required label alone
  // cannot grant admission. The private receipt survives token stripping.
  const autographTarget = categoryKey === 'autographs'
    && String(target.itemType ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_') === 'signed_item';
  const receipt = autographTarget ? readServerNormalizationReport(sale) : undefined;
  const verifiedHistoricFacts = hasVerifiedHistoricSaleEconomics(sale);
  const verifiedSource = receipt?.sourceAdmission.verification === 'verified'
    && (receipt.sourceAdmission.normalizationEligible === true || verifiedHistoricFacts)
    && receipt.sourceAdmission.verifiedSourceDisposition === 'valuation_eligible'
    && Boolean(receipt.auditRef.verifiedObservationId);
  const canonical = autographTarget && !receipt ? verifyCanonicalObservation(sale) : null;
  const canonicalAutographSale = verifiedSource ? sale : canonical?.verified ? canonical.sale : null;
  const autographMarketPolicy = canonicalAutographSale?.visualRequirement === 'not_required'
    && (canonicalAutographSale.evidenceDisposition === 'valuation_eligible' || verifiedHistoricFacts)
    ? (() => {
      const metadata = buildVisualTargetMetadata(target);
      const candidate = { title: canonicalAutographSale.title };
      const eligibility = autographValuationEligibility(candidate, metadata);
      const exclusion = autographMarketExclusionReason(metadata, candidate);
      return { eligible: eligibility.eligible && !exclusion,
        score: autographMarketRelevanceScore(candidate, metadata).score,
        reasons: [...eligibility.reasons, ...(exclusion ? [exclusion] : [])] };
    })() : null;
  // Disney Pins do not use a graded/raw state in this marketplace workflow.
  // Ignore both explicit stale fields and any grade-related itemDetails here;
  // their identity is adjudicated by the category-specific visual gate instead.
  const targetIdentityState = isDisneyPins ? null : extractIdentityState(target);
  const saleIdentityState = isDisneyPins ? null : extractIdentityState({ title, grade: null, certificationCompany: null, itemDetails: null });
  const universalIdentityConflicts = targetIdentityState && saleIdentityState
    ? identityStateConflicts(targetIdentityState, saleIdentityState, categoryKey === 'comics', categoryKey)
    : [];
  // The source-neutral signed-object policy already requires the same signer
  // and object. A title need not repeat signed/autographed for market relevance;
  // do not invent candidate authentication or an exact visual identity.
  const blockingUniversalConflicts = universalIdentityConflicts.filter(reason =>
    !(autographMarketPolicy?.eligible && reason === 'autograph status is not stated'));
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
  const normalizedTargetNumber = categoryKey === 'pokemon' ? null : normalizeComparableNumber(targetNumber);
  const identityApproval = getVerifiedIdentityApproval(sale, target, target.approvalTargetImageReference);
  // Inbound/browser metadata has no positive authority here. Even a signed
  // projection is used only to preserve declared contradictions to title/target.
  const pokemonNumber = categoryKey === 'pokemon' ? pokemonComparableNumberStatus(target, details, title, [
    ...pokemonStructuredNumbers(sale.normalizedStructuredMetadata),
    ...pokemonStructuredNumbers(identityApproval?.candidateIdentityFields),
  ]) : null;
  const observedNumber = pokemonNumber ? pokemonNumber.observedNumber : extractComparableNumber(title, categoryKey);
  const titleCategoryIdentity = assessComparableCategoryIdentity(target, details, title, observedNumber);
  const categoryIdentity = pokemonNumber?.conflicts.length ? {
    ...titleCategoryIdentity,
    status: 'objective_conflict' as const,
    confirmedFields: titleCategoryIdentity.confirmedFields.filter(field => field !== 'Card #'),
    unconfirmedFields: titleCategoryIdentity.unconfirmedFields.filter(field => field !== 'Card #'),
    conflicts: [...new Set([...titleCategoryIdentity.conflicts, `Card # differs (${pokemonNumber.conflicts.join(', ')})`])],
  } : titleCategoryIdentity;
  const requiredApprovalMissing = sale.visualRequirement === 'required' && !identityApproval;
  const transportedApprovalUnverified = Boolean(sale.identityApproval) && !identityApproval;
  const numberMatches = pokemonNumber ? pokemonNumber.comparison === 'match'
    : Boolean(normalizedTargetNumber && observedNumber === normalizedTargetNumber);
  let materialNumberConflict = false;
  if (numberMatches) {
    score += 12;
    reasons.push('catalog or issue number matches');
  } else if (pokemonNumber ? pokemonNumber.comparison === 'different'
    : normalizedTargetNumber && observedNumber && observedNumber !== normalizedTargetNumber) {
    score -= 24;
    materialNumberConflict = true;
    reasons.push('explicit catalog or issue number differs');
  } else if (pokemonNumber?.comparison === 'partial') {
    reasons.push('catalog or issue number partially matches; full Pokémon denominator or namespace is unconfirmed');
  } else if (pokemonNumber ? pokemonNumber.targetValue : normalizedTargetNumber) {
    reasons.push('catalog or issue number is not stated in the comparable title');
  }
  if (pokemonNumber) {
    // Original title captures/aliases are diagnostic facts, not first-digit tails.
    const captures = readPokemonCardNumbersFromTitle(title).observations.map(value => value.raw);
    if (captures.length) reasons.push(`Pokémon card numbers observed in title: ${captures.join(', ')}`);
    const declared = [...new Set([...pokemonStructuredNumbers(sale.normalizedStructuredMetadata),
      ...pokemonStructuredNumbers(identityApproval?.candidateIdentityFields)])];
    if (declared.length && materialNumberConflict) reasons.push(`Pokémon card numbers declared in metadata: ${declared.join(', ')}`);
    if (materialNumberConflict) reasons.push(`Pokémon target card numbers: ${[...new Set([
      ...pokemonStructuredNumbers(details), ...readPokemonCardNumbersFromTitle(target.title).observations.map(value => value.raw),
    ])].join(', ')}`);
  }

  const targetDisneyEdition = isDisneyPins
    ? disneyPinsTargetEdition(
      firstString(details, ['limitedEdition', 'edition']),
      firstString(details, ['openEdition']),
      firstString(details, ['editionSize']),
    )
    : null;
  const observedDisneyEdition = isDisneyPins ? pinEditionInTitle(title) : null;
  const targetVariant = isDisneyPins ? null : firstString(details, ['variant', 'parallel', 'edition', 'pressing', 'releaseType', 'language']);
  let materialVariantConflict = false;
  let materialVariantReview = false;
  if (isDisneyPins && targetDisneyEdition && observedDisneyEdition) {
    const editionMatches = observedDisneyEdition.kind === targetDisneyEdition.kind
      && (!targetDisneyEdition.size || observedDisneyEdition.size === targetDisneyEdition.size);
    const editionConflicts = observedDisneyEdition.kind !== targetDisneyEdition.kind
      || Boolean(targetDisneyEdition.size && observedDisneyEdition.size && observedDisneyEdition.size !== targetDisneyEdition.size);
    if (editionMatches) {
      score += 10;
      reasons.push('Disney Pins edition status matches');
    } else if (editionConflicts) {
      score -= 18;
      materialVariantConflict = true;
      reasons.push('Disney Pins edition status differs from the target');
    } else {
      materialVariantReview = true;
      reasons.push('Disney Pins edition status is not stated in the comparable title');
    }
  } else if (isDisneyPins && observedDisneyEdition) {
    materialVariantReview = true;
    reasons.push('sale declares a Disney Pins edition status that the target does not state');
  } else if (targetVariant && title.toLowerCase().includes(targetVariant.toLowerCase())) {
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

  const resolvedTargetCompany = resolveTestAiGradingCompany(details, target.certificationCompany || firstString(details, ['certificationCompany', 'gradingCompany', 'authenticationCompany']) || undefined);
  const targetCompany = isDisneyPins || /^(?:unknown|other|none|n\/?a|raw|ungraded)$/i.test(resolvedTargetCompany ?? '')
    ? '' : normalizeCompany(resolvedTargetCompany);
  const saleCompanyMatch = isDisneyPins ? undefined : title.match(/\b(psa|cgc|bgs|sgc|pcgs|ngc|afa|wata|vga)\b/i)?.[1];
  const saleCompany = normalizeCompany(saleCompanyMatch);
  // This legacy grader check also receives Autographs authentication companies.
  // Use the same aliases as source scoring and display instead of reopening
  // a PSA/DNA-versus-PSA conflict after the Autographs gate has accepted it.
  const companiesEquivalent = videoGameGradersEquivalent(categoryKey, targetCompany, saleCompany)
    || (categoryKey === 'autographs' && autographAuthenticationCompaniesEquivalent(targetCompany, saleCompany));
  const isPcgsCoin = target.category === 'coins' && targetCompany === 'pcgs';
  const targetPcgsGrade = isPcgsCoin ? normalizePcgsCoinGrade(target.grade) : null;
  const salePcgsGrade = isPcgsCoin && saleCompany === 'pcgs' ? extractPcgsCoinGrade(title) : null;
  const targetGrade = isDisneyPins ? null : numericGrade(target.grade);
  const saleGrade = isDisneyPins ? null : numericGrade(title.match(/(?:psa|cgc|bgs|sgc|pcgs|ngc|afa|wata|vga)\s*(?:graded?\s*)?(?:[A-Za-z]{1,8}\s*)?(\d+(?:\.\d+)?)/i)?.[1]);
  let materialGradeConflict = false;
  let materialCompanyConflict = false;
  const hasKnownGradeState = !isDisneyPins && (targetGrade !== null || Boolean(target.grade) || Boolean(targetCompany));
  const hasObservedGradeState = !isDisneyPins && (saleGrade !== null || Boolean(saleCompany));
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
  if (targetCompany && companiesEquivalent) {
    score += 6;
    reasons.push('grading or authentication company matches');
  } else if (targetCompany && saleCompany && !companiesEquivalent) {
    score -= 10;
    materialCompanyConflict = true;
    reasons.push('grading or authentication company differs; retained as certification-adjacent evidence');
  }

  if (['stamps', 'video_games', 'music', 'disney_pins', 'vintage_toys', 'autographs', 'movies', 'coins'].includes(categoryIdentity.category) && categoryIdentity.status === 'direct_confirmed' && categoryIdentity.confirmedFields.length > 0) {
    score += Math.min(20, categoryIdentity.confirmedFields.length * 4);
    reasons.push(`${categoryIdentity.confirmedFields.length} category-critical identifiers match`);
  }

  const boundedScore = Math.max(0, Math.min(100, autographMarketPolicy?.score ?? score));
  if (autographMarketPolicy) reasons.push(...(autographMarketPolicy.eligible
    ? [`Server-recomputed Autographs market relevance ${autographMarketPolicy.score}/100; no exact visual identity claimed.`]
    : autographMarketPolicy.reasons));
  const priceIsUsable = price !== null && Number.isFinite(price) && price > 0;
  const categoryHardConflict = categoryIdentity.status === 'objective_conflict';
  if (blockingUniversalConflicts.length) {
    reasons.push(...blockingUniversalConflicts.map((reason) => `identity state conflict: ${reason}`));
  }
  const universalHardConflict = blockingUniversalConflicts.some((reason) =>
    /raw\/graded state differs|single item versus lot\/bundle differs|negative listing signal|parallel\/variant differs|sale declares an autograph|signature name(?: set)? differs/.test(reason),
  );
  const universalNeedsReview = blockingUniversalConflicts.some((reason) => reason.includes('not stated'));
  const categoryNeedsReview = categoryIdentity.status === 'needs_review';
  const categoryDirectConfirmed = categoryIdentity.status === 'direct_confirmed' || categoryIdentity.status === 'not_applicable';
  // A date-only context downgrade does not invalidate verified matching facts.
  // The private historical receipt cannot clear any source or identity failure.
  const restrictiveSourceDisposition = Boolean(sale.evidenceDisposition && sale.evidenceDisposition !== 'valuation_eligible')
    && !verifiedHistoricFacts;
  const approvalHardStateConflict = universalIdentityConflicts.some((reason) => /grade differs|grading company differs/.test(reason));
  const signedFormConflicts = identityApproval ? signedComparableFormConflicts(target, sale.saleForm) : [];
  const transactionLotConflict = signedTransactionLotConflict(target, sale);
  const approvedIdentity = Boolean(identityApproval) && !materialNumberConflict && !categoryHardConflict
    && !universalHardConflict && !materialVariantConflict && !materialGradeConflict && !materialCompanyConflict
    && !approvalHardStateConflict && !signedFormConflicts.length && !transactionLotConflict && !visualMismatch
    && !materialVariantReview && !restrictiveSourceDisposition;
  if (approvedIdentity) reasons.push('identity confirmed by server-final target/source/image-bound visual approval; title omissions do not reopen identity');
  if (signedFormConflicts.length) reasons.push(...signedFormConflicts.map((conflict) => `signed structured form conflict: ${conflict}`));
  if (transactionLotConflict) reasons.push('explicit transaction lot/bundle cannot supply a single-product comparable price');
  if (requiredApprovalMissing || transportedApprovalUnverified) reasons.push('required or transported identity approval is not verified for this target/image; title-only admission is withheld');
  const finalCategoryIdentity = approvedIdentity ? {
    ...categoryIdentity,
    status: pokemonNumber?.comparison === 'partial' ? 'needs_review' as const : 'direct_confirmed' as const,
    confirmedFields: [...categoryIdentity.confirmedFields, 'Server-final visual identity'],
    // Visual approval may resolve title omissions, but an explicitly partial
    // card-number witness is still not a full number confirmation.
    unconfirmedFields: pokemonNumber?.comparison === 'partial'
      ? categoryIdentity.unconfirmedFields.filter(field => field === 'Card #') : [],
  } : categoryIdentity;
  if (materialNumberConflict || categoryHardConflict || universalHardConflict || transactionLotConflict) {
    identityRelationship = 'conflict';
    valuationRelationship = 'not_usable';
  } else if (materialVariantConflict) {
    identityRelationship = 'related_variant';
    valuationRelationship = 'variant_comparable';
  } else if (materialGradeConflict || materialCompanyConflict) {
    identityRelationship = 'same_object_different_state';
    valuationRelationship = 'grade_adjacent_comparable';
  } else if (approvedIdentity) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (autographMarketPolicy?.eligible) {
    identityRelationship = 'related_object';
    valuationRelationship = 'direct_comparable';
  } else if (categoryDirectConfirmed && numberMatches) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (categoryDirectConfirmed && targetVariant && title.toLowerCase().includes(targetVariant.toLowerCase())) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (categoryDirectConfirmed && categoryIdentity.confirmedFields.length > 0) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (categoryDirectConfirmed && hasKnownGradeState && hasObservedGradeState && (!targetGrade || saleGrade === targetGrade) && (!targetCompany || companiesEquivalent)) {
    identityRelationship = 'exact_identity';
    valuationRelationship = 'direct_comparable';
  } else if (tokenScore >= 0.8) {
    identityRelationship = 'related_object';
    valuationRelationship = 'reference_only';
  }
  const adjacentState = materialGradeConflict || materialCompanyConflict;
  const classification: ComparableClassification = !priceIsUsable || materialNumberConflict || categoryHardConflict || universalHardConflict || transactionLotConflict
    ? 'rejected'
    : materialVariantConflict
      ? 'contextual'
      : adjacentState
        ? 'contextual'
    : approvedIdentity
      ? 'exact'
    : identityApproval && (approvalHardStateConflict || signedFormConflicts.length || restrictiveSourceDisposition)
      ? 'rejected'
    : requiredApprovalMissing || transportedApprovalUnverified
      ? 'contextual'
    : categoryNeedsReview || universalNeedsReview
      ? 'contextual'
    : autographMarketPolicy && !autographMarketPolicy.eligible
      ? 'contextual'
    : visualMismatch || materialVariantReview || sale.evidenceDisposition === 'warning_review' || boundedScore < 48
      ? 'contextual'
    : identity.readiness !== 'ready'
      ? 'contextual'
    : autographMarketPolicy?.eligible
      ? 'near'
      : boundedScore >= 80
        ? 'exact'
        : boundedScore >= 60
          ? 'near'
          : 'contextual';
  const accepted = classification === 'exact' || classification === 'near';
  const exclusionReason = accepted
    ? undefined
    : transactionLotConflict
      ? 'explicit transaction lot/bundle is not a single-product comparable; no guessed unit price'
    : requiredApprovalMissing || transportedApprovalUnverified
      ? 'server-final identity approval is missing, unverified, or bound to a different target/image; review required'
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
    : universalNeedsReview
      ? `universal identity needs review: ${blockingUniversalConflicts.filter(reason => reason.includes('not stated')).join('; ')}`
    : autographMarketPolicy && !autographMarketPolicy.eligible
      ? `Autographs market-evidence requirements not met: ${autographMarketPolicy.reasons.join('; ')}`
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
  const admissionCode: ComparableMatch['admissionCode'] = accepted
    ? 'USED_DIRECT'
    : materialGradeConflict || materialCompanyConflict
      ? 'SECONDARY_EVIDENCE'
      : classification === 'rejected'
        ? (categoryNeedsReview || visualMismatch ? 'REVIEW_REQUIRED' : 'REJECTED_IDENTITY')
        : classification === 'contextual'
          ? 'CONTEXT_ONLY'
          : 'REVIEW_REQUIRED';
  const identityBlockerCodes: string[] = [];
  if (!priceIsUsable) identityBlockerCodes.push('INVALID_PRICE');
  if (materialNumberConflict) identityBlockerCodes.push('CATALOG_NUMBER_CONFLICT');
  if (categoryHardConflict) identityBlockerCodes.push('CATEGORY_IDENTITY_CONFLICT');
  if (universalHardConflict) identityBlockerCodes.push('UNIVERSAL_IDENTITY_CONFLICT');
  if (materialVariantConflict) identityBlockerCodes.push('VARIANT_CONFLICT');
  if (materialGradeConflict) identityBlockerCodes.push('GRADE_ADJACENT');
  if (materialCompanyConflict) identityBlockerCodes.push('CERTIFICATION_ADJACENT');
  if (requiredApprovalMissing || transportedApprovalUnverified) identityBlockerCodes.push('REQUIRED_APPROVAL_MISSING');
  if (categoryNeedsReview && !approvedIdentity) identityBlockerCodes.push('CATEGORY_REVIEW_REQUIRED');
  if (universalNeedsReview && !approvedIdentity) identityBlockerCodes.push('UNIVERSAL_REVIEW_REQUIRED');
  if (visualMismatch) identityBlockerCodes.push('VISUAL_MISMATCH');
  if (materialVariantReview) identityBlockerCodes.push('VARIANT_REVIEW_REQUIRED');
  if (identityApproval && signedFormConflicts.length) identityBlockerCodes.push('SIGNED_FORM_CONFLICT');
  if (transactionLotConflict) identityBlockerCodes.push('TRANSACTION_LOT_CONFLICT');
  if (identityApproval && transactionLotConflict) identityBlockerCodes.push('APPROVED_LOT_CONFLICT');
  if (identityApproval && approvalHardStateConflict) identityBlockerCodes.push('APPROVED_STATE_CONFLICT');
  if (autographMarketPolicy && !autographMarketPolicy.eligible) identityBlockerCodes.push('AUTOGRAPH_MARKET_POLICY_BLOCKED');
  if (restrictiveSourceDisposition) identityBlockerCodes.push('SOURCE_DISPOSITION_RESTRICTIVE');
  if (!approvedIdentity && identity.readiness !== 'ready') identityBlockerCodes.push('TARGET_IDENTITY_INCOMPLETE');
  if (!accepted && boundedScore < 48) identityBlockerCodes.push('IDENTITY_SCORE_BELOW_THRESHOLD');
  const identityAdmission: FinalIdentityAdmission = {
    accepted, classification, score: boundedScore, identityRelationship, valuationRelationship,
    categoryIdentity: { ...finalCategoryIdentity, confirmedFields: [...finalCategoryIdentity.confirmedFields],
      unconfirmedFields: [...finalCategoryIdentity.unconfirmedFields], conflicts: [...finalCategoryIdentity.conflicts] },
    titleCategoryIdentity: { ...titleCategoryIdentity, confirmedFields: [...titleCategoryIdentity.confirmedFields],
      unconfirmedFields: [...titleCategoryIdentity.unconfirmedFields], conflicts: [...titleCategoryIdentity.conflicts] },
    serverFinalApprovalVerified: Boolean(identityApproval),
    basis: accepted ? approvedIdentity ? 'server_final_visual' : autographMarketPolicy?.eligible ? 'server_autograph_market_relevance' : 'title_evidence' : 'not_admitted',
    reasonDetails: [...blockingUniversalConflicts, ...(autographMarketPolicy?.eligible === false ? autographMarketPolicy.reasons : [])].slice(0, 20),
    visualReviewStatus: sale.visualReviewStatus ?? 'not_reviewed', blockerCodes: identityBlockerCodes,
  };
  return {
    title: title || 'Untitled comparable',
    price,
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
    categoryIdentity: finalCategoryIdentity,
    titleCategoryIdentity,
    identityAdmissionBasis: approvedIdentity ? 'server_final_visual' : accepted && autographMarketPolicy?.eligible ? 'server_autograph_market_relevance' : 'title_evidence',
    ...(identityApproval ? { identityApproval } : {}),
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
    visualEvidence: identityApproval?.decidingEvidence,
    visualAudit: sale.visualAudit,
    visualDifferences: sale.visualDifferences,
    normalizedStructuredMetadata: identityApproval?.candidateIdentityFields,
    metadataMatchScore: sale.metadataMatchScore,
    metadataMatchRank: sale.metadataMatchRank,
    metadataMatchReasons: sale.metadataMatchReasons,
    metadataFieldComparisons: sale.metadataFieldComparisons,
    metadataRanking: boundedFinalSourceCorrelation(sale).metadataRanking,
    metadataOriginOccurrenceKey: boundedFinalSourceCorrelation(sale).metadataOriginOccurrenceKey,
    metadataUnknownFields: sale.metadataUnknownFields,
    metadataScoreAwards: sale.metadataScoreAwards,
    metadataMatchLabel: sale.metadataMatchLabel,
    reportedVisualExecution: boundedDiagnosticVisualExecution(sale.reportedVisualExecution ?? sale.visualExecution),
    evidenceDisposition: sale.evidenceDisposition ?? 'valuation_eligible',
    evidenceReasons: sale.evidenceReasons ?? null,
    admissionCode,
    identityAdmission,
  };
}

type SaleEvidenceSupport = Pick<MarketProfile,
  'marketRange' | 'categoryEvidenceThresholds' | 'currentWindowSaleCount' |
  'currentWindowIndependentMarketplaceCount' | 'evidenceQuality' | 'spreadPct'
> & Pick<MarketProfile, 'valuationEligibleSaleCount' | 'valuationEligibleIndependentMarketplaceCount'>;

/** One support predicate shared by pricing-basis selection, comparison, and cash. */
export function hasDefensibleCurrentSaleValue(profile: SaleEvidenceSupport): profile is SaleEvidenceSupport & {
  marketRange: { low: number; mid: number; high: number; supported: true };
} {
  const { low, mid, high, supported } = profile.marketRange;
  const floor = profile.categoryEvidenceThresholds;
  const saleCount = profile.valuationEligibleSaleCount ?? profile.currentWindowSaleCount;
  const marketplaceCount = profile.valuationEligibleIndependentMarketplaceCount ?? profile.currentWindowIndependentMarketplaceCount;
  return Boolean(supported && low !== null && mid !== null && high !== null
    && [low, mid, high].every((value) => Number.isFinite(value) && value > 0)
    && low <= mid && mid <= high
    && saleCount >= floor.minimumSelectedSales
    // During sandbox matching validation, the shared floor is intentionally
    // one sale, so low confidence remains visible as a warning rather than
    // preventing the candidate from reaching valuation.
    && (floor.minimumSelectedSales === 1 || profile.evidenceQuality !== 'low')
    && (marketplaceCount >= floor.minimumIndependentMarketplaces
      || saleCount >= floor.minimumSelectedSales + 2));
}

export function buildMarketProfile(
  target: ComparableTarget,
  sales: MarketSale[] = [],
  aggregateMetrics?: { median?: number; min?: number; max?: number; count?: number; confidence?: ConfidenceLevel } | null,
  now = new Date(),
  identityGate?: ComparableIdentityGate | null,
  guideAnchor?: GuideValueAnchor | null,
  reportingOptions?: ValuationUseOptions,
): MarketProfile {
  const nowMs = now.getTime();
  const selection = selectBalancedComparableSales(target, sales, now, MAX_VALUATION_COMPARABLES);
  const { deduplicated, valuationCandidates, valuationMatches, selected, selectedMatches } = selection;
  const contextualSales = deduplicated.unique.filter((sale) => !isCompletedSaleCandidate(sale, nowMs, target));
  const valuationMatchRecords = valuationMatches.map(({ sale, match }) => {
    if (selectedMatches.has(match)) return match;
    if (match.accepted) {
      return {
        ...match,
        accepted: false,
        exclusionReason: 'omitted from the bounded valuation set after source-balanced selection',
        admissionCode: 'OMITTED_BY_CAP' as const,
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
  const duplicateMatches: ComparableMatch[] = deduplicated.duplicates.map(({ sale, duplicateOf, originalIdentityAdmission }) => ({
    ...scoreComparable(target, sale),
    // Preserve reporting captured on the original object before duplicate status
    // invalidated its copy's authority. This cannot authorize duplicate pricing.
    identityAdmission: originalIdentityAdmission,
    accepted: false,
    classification: 'rejected',
    exclusionReason: `duplicate sale observation; canonical record ${duplicateOf}`,
    duplicateOf,
    reasons: ['duplicate sale observation suppressed', `canonical record ${duplicateOf}`],
  }));
  const selectedAccepted = selected.map(({ match }) => match)
    .filter((match): match is ComparableMatch & { price: number } => typeof match.price === 'number' && Number.isFinite(match.price) && match.price > 0);
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
  const outlierMatches = new Set<ComparableMatch>(selectedAcceptedWithAge.filter(({ match }) => !filtered.some(({ match: kept }) => kept === match)).map(({ match }) => match));
  const flaggedSmallSampleOutliers = new Set<ComparableMatch>(canFlagSmallSampleOutliers
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
  // Historical extension remains visible, but cannot establish current support
  // or suppress a guide fallback. Do not use the separate 90-day velocity count.
  const datedWindowSales = acceptedWithAge.filter(({ ageDays }) => ageDays !== null && ageDays >= 0 && ageDays <= 365);
  const qualifiedUndatedMatches = new Set(selected.filter(({ sale }) => hasVerifiedMercariUndatedSale(sale, target))
    .map(({ match }) => match));
  const qualifiedUndatedSales = acceptedWithAge.filter(({ match }) => qualifiedUndatedMatches.has(match));
  const qualifiedUndatedMercariSaleCount = qualifiedUndatedSales.length;
  const currentSales = acceptedWithAge.filter((entry) => datedWindowSales.includes(entry) || qualifiedUndatedMatches.has(entry.match));
  const currentPrices = currentSales.map(({ match }) => match.price).sort((a, b) => a - b);
  const currentWindowSaleCount = datedWindowSales.length;
  const valuationEligibleSaleCount = currentSales.length;
  const currentMedian = currentPrices.length ? currentPrices.length % 2
    ? currentPrices[Math.floor(currentPrices.length / 2)]
    : (currentPrices[currentPrices.length / 2 - 1] + currentPrices[currentPrices.length / 2]) / 2 : null;
  const saleMedianValue = currentMedian !== null ? Math.round(currentMedian) : null;
  const currentMinimum = currentPrices.length ? Math.round(currentPrices[0]) : null;
  const currentMaximum = currentPrices.length ? Math.round(currentPrices[currentPrices.length - 1]) : null;
  const currentQ1 = currentPrices.length ? percentile(currentPrices, 0.25) : null;
  const currentQ3 = currentPrices.length ? percentile(currentPrices, 0.75) : null;
  const currentSelectedSales = selected.filter(({ match }) => currentSales.some((entry) => entry.match === match)).map(({ sale }) => sale);
  const currentEvidenceCoverage = assessMarketEvidenceCoverage(sales, currentSelectedSales, deduplicated.duplicates.length, nowMs);
  const valuationEligibleIndependentMarketplaceCount = new Set(currentSelectedSales.map(marketplaceKey)
    .filter((key) => !['unknown marketplace', 'unknown_marketplace', 'unattributed'].includes(key))).size;
  const currentWindowIndependentMarketplaceCount = new Set(selected.filter(({ match }) => datedWindowSales.some((entry) => entry.match === match))
    .map(({ sale }) => marketplaceKey(sale))
    .filter((key) => !['unknown marketplace', 'unknown_marketplace', 'unattributed'].includes(key))).size;
  const recentSales = acceptedWithAge.filter(({ ageDays }) => ageDays !== null && ageDays <= 90);
  const ages = acceptedWithAge.map(({ ageDays }) => ageDays).filter((age): age is number => age !== null);
  const outlierExcludedCount = outlierMatches.size;
  const weightedDenominator = filtered.reduce((sum, { match, ageDays }) => {
    match.weight = (0.5 + match.score / 100) * recencyWeight(ageDays);
    return sum + match.weight;
  }, 0);
  const weightedValue = weightedDenominator > 0 ? Math.round(filtered.reduce((sum, { match }) => sum + match.price * match.weight, 0) / weightedDenominator) : null;
  const valuationGuideAnchor = isVerifiedGuideAnchor(guideAnchor, target, now) ? guideAnchor : null;
  const guideAnchorValue = valuationGuideAnchor && Number.isFinite(valuationGuideAnchor.value) && valuationGuideAnchor.value > 0 ? Math.round(valuationGuideAnchor.value) : null;
  const guideMatchDescription = valuationGuideAnchor?.matchType === 'mapped' ? 'mapped-grade-band' : 'exact-grade';
  const minimum = filtered.length ? Math.round(Math.min(...filtered.map(({ match }) => match.price))) : null;
  const maximum = filtered.length ? Math.round(Math.max(...filtered.map(({ match }) => match.price))) : null;
  const spreadPct = saleMedianValue && currentMinimum !== null && currentMaximum !== null ? Math.round(((currentMaximum - currentMinimum) / saleMedianValue) * 100) : null;
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
  const currentExactMatchCount = currentSales.filter(({ match }) => match.classification === 'exact').length;
  const calculatedEvidenceQuality: ConfidenceLevel = valuationEligibleSaleCount >= categoryEvidenceThresholds.minimumSelectedSales + 1 && currentExactMatchCount >= 2
    ? 'high'
    : valuationEligibleSaleCount >= categoryEvidenceThresholds.minimumSelectedSales
      ? 'medium'
      : 'low';
  const evidenceQuality: ConfidenceLevel = currentEvidenceCoverage.sourceReliability === 'low' || currentEvidenceCoverage.sourceReliability === 'unavailable'
    ? 'low'
    : currentEvidenceCoverage.sourceReliability === 'medium' && calculatedEvidenceQuality === 'high'
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
  const materialReviewRequired = Boolean(identityGate?.materialReviewRequired || identityGate?.sourceAlignmentStatus === 'conflicted');
  const preliminarySupported = Boolean(!materialReviewRequired && saleMedianValue !== null && valuationEligibleSaleCount >= categoryEvidenceThresholds.minimumSelectedSales
    && currentMinimum !== null && currentMaximum !== null
    && [currentMinimum, saleMedianValue, currentMaximum].every((value) => Number.isFinite(value) && value > 0)
    && currentMinimum <= saleMedianValue && saleMedianValue <= currentMaximum);
  const marketRange: MarketProfile['marketRange'] = preliminarySupported
    ? { low: currentMinimum!, mid: saleMedianValue!, high: currentMaximum!, supported: true }
    : { low: null, mid: null, high: null, supported: false };
  const sufficientCurrentSales = hasDefensibleCurrentSaleValue({ marketRange, categoryEvidenceThresholds,
    currentWindowSaleCount, currentWindowIndependentMarketplaceCount, valuationEligibleSaleCount,
    valuationEligibleIndependentMarketplaceCount, evidenceQuality, spreadPct });
  // Reporting only. Mirror the existing support checks; do not substitute a
  // generic sample-size explanation for independence or identity holds.
  // Price spread is descriptive only and must never veto matching sales.
  const supportReasonDetails: string[] = [];
  if (materialReviewRequired) supportReasonDetails.push('An unresolved target identity conflict stopped the valuation for this run.');
  if (valuationEligibleSaleCount < categoryEvidenceThresholds.minimumSelectedSales) {
    supportReasonDetails.push(`The run has ${valuationEligibleSaleCount} qualifying sale(s); the required minimum is ${categoryEvidenceThresholds.minimumSelectedSales}.`);
  }
  if (valuationEligibleIndependentMarketplaceCount < categoryEvidenceThresholds.minimumIndependentMarketplaces
    && valuationEligibleSaleCount < categoryEvidenceThresholds.minimumSelectedSales + 2) {
    supportReasonDetails.push(`The qualifying sales identify ${valuationEligibleIndependentMarketplaceCount} independent marketplace(s); ${categoryEvidenceThresholds.minimumIndependentMarketplaces} is required, or ${categoryEvidenceThresholds.minimumSelectedSales + 2} qualifying sales must be available.`);
  }
  if (categoryEvidenceThresholds.minimumSelectedSales !== 1 && evidenceQuality === 'low') {
    supportReasonDetails.push('The qualifying sale evidence did not meet the final evidence-quality requirement.');
  }
  if (!sufficientCurrentSales && supportReasonDetails.length === 0) {
    supportReasonDetails.push('The qualifying sales did not produce a valid supported price range for this run.');
  }
  const valuationBasis: MarketProfile['valuationBasis'] = sufficientCurrentSales ? 'market_sales'
    : !materialReviewRequired && guideAnchorValue !== null ? 'guide_fallback' : 'insufficient_evidence';
  const primaryValue = valuationBasis === 'market_sales' ? saleMedianValue
    : valuationBasis === 'guide_fallback' ? guideAnchorValue : null;
  const guideProvisional = valuationBasis === 'guide_fallback';
  // Compatibility fields now express an exclusive fallback, never a blend.
  const guideAnchorWeightPct = guideProvisional ? 100 : 0;
  const guideAdjustedValue = primaryValue;
  const valuationPopulationDescription = qualifiedUndatedMercariSaleCount
    ? `${valuationEligibleSaleCount} accepted valuation-pool sales (${currentWindowSaleCount} dated within 365 days and ${qualifiedUndatedMercariSaleCount} qualified undated Mercari exceptions; timing unverified)`
    : `${currentWindowSaleCount} accepted current-window sales`;
  const valuationBasisReason = materialReviewRequired ? `${TEST_AI_VALUE_UNAVAILABLE_MESSAGE}. An unresolved material identity conflict blocks pricing, including guide fallback.`
    : sufficientCurrentSales ? `${valuationPopulationDescription} meet the existing category quality and independence requirements; the value uses sales alone.`
    : guideProvisional ? `Guide fallback — limited market evidence: ${valuationPopulationDescription} do not meet the existing category evidence requirements; the verified applicable ${valuationGuideAnchor?.sourceLabel ?? 'guide'} value is used alone.`
    : `${TEST_AI_VALUE_UNAVAILABLE_MESSAGE}. Insufficient evidence: ${valuationPopulationDescription} do not meet the existing category evidence requirements and no verified applicable guide is available.`;
  const valuationWarnings: string[] = [];
  if (aggregateMetrics && accepted.length === 0 && (aggregateMetrics.count ?? 0) > 0) valuationWarnings.push('Aggregate market data exists, but no individual comparable titles were available for identity matching.');
  valuationWarnings.push(valuationBasisReason);
  if (qualifiedUndatedMercariSaleCount) valuationWarnings.push(`${qualifiedUndatedMercariSaleCount} qualified undated Mercari sale${qualifiedUndatedMercariSaleCount === 1 ? '' : 's'} included under mercari_undated_sold_v1: sale date remains Unknown, timing is unverified, and sold=true reported sold prices are used as reported; they are not verified recent sales or independently verified private accepted-offer amounts.`);
  if (guideAnchor && !valuationGuideAnchor) valuationWarnings.push('The supplied guide has no valid target-bound server verification; it remains reference only and cannot determine the value.');
  if (guideAnchorValue !== null && guideProvisional) valuationWarnings.push(`The ${guideMatchDescription} ${valuationGuideAnchor?.sourceLabel ?? 'guide'} estimate of $${guideAnchorValue.toLocaleString()} is a provisional guide fallback value, not a market-supported completed-sale valuation or automatic cash basis.`);
  else if (guideAnchorValue !== null) valuationWarnings.push(`The verified ${valuationGuideAnchor?.sourceLabel ?? 'guide'} value is reference only because sufficient ${qualifiedUndatedMercariSaleCount ? 'qualified valuation-pool' : 'current comparable'} sales are used alone; guide contribution is 0%.`);
  if (accepted.length < categoryEvidenceThresholds.minimumSelectedSales) valuationWarnings.push(`Fewer than ${categoryEvidenceThresholds.minimumSelectedSales} accepted completed sales are available for ${categoryEvidenceThresholds.category}; treat the range as preliminary review evidence.`);
  if (selectedAcceptedWithAge.length > 0 && selectedAcceptedWithAge.length < 5) valuationWarnings.push('IQR outlier filtering was not applied because fewer than five selected completed sales are available.');
  if (flaggedSmallSampleOutliers.size > 0) valuationWarnings.push(`${flaggedSmallSampleOutliers.size} suspicious price tail${flaggedSmallSampleOutliers.size === 1 ? '' : 's'} was flagged for review but retained because the selected sample has fewer than ten completed sales.`);
  if (outlierExcludedCount > 0) valuationWarnings.push(`${outlierExcludedCount} identity-matched completed sale${outlierExcludedCount === 1 ? '' : 's'} was excluded from the deterministic value by the IQR outlier rule and remains visible in the audit ledger.`);
  if (saleMedianValue !== null && weightedValue !== null && Math.abs(weightedValue - saleMedianValue) / saleMedianValue > 0.15) valuationWarnings.push(`The recency-weighted mean materially differs from the ${qualifiedUndatedMercariSaleCount ? 'qualified valuation-pool' : 'current-sale'} median diagnostic; review sale timing and price dispersion.`);
  if (oldestSaleAgeDays !== null && oldestSaleAgeDays > 365) valuationWarnings.push('The oldest included authoritative sale is more than one year old.');
  if (contextualComparableCount > 0) valuationWarnings.push(`Historical, ${qualifiedUndatedMercariSaleCount ? 'unqualified undated' : 'undated'}, non-completed, or insufficiently identified records were retained as context but excluded from valuation.`);
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
    : qualifiedUndatedMercariSaleCount > 0 && recentCount < 3 ? 'sparse_market_evidence'
    : recentCount >= 3 && evidenceQuality === 'high' ? 'strong_recent_market_evidence'
    : recentCount === 0 ? 'stale_market_evidence'
    : accepted.length < 3 ? 'sparse_market_evidence'
    : spreadPct !== null && spreadPct > 100 ? 'conflicting_market_evidence'
    : 'strong_recent_market_evidence';
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
  const supported = marketRange.supported;
  const confidenceReasons = [
    `${accepted.length} clean completed sale${accepted.length === 1 ? '' : 's'} selected after identity, source, visual, and outlier checks; ${currentWindowSaleCount} are within the current 365-day window${qualifiedUndatedMercariSaleCount ? ` and ${qualifiedUndatedMercariSaleCount} qualified undated Mercari exceptions have unverified timing` : ''} and ${categoryEvidenceThresholds.minimumSelectedSales} are required for the category's definitive evidence floor.`,
    `${independentMarketplaceCount} independent marketplace${independentMarketplaceCount === 1 ? '' : 's'}${unknownMarketplaceCount ? `; ${unknownMarketplaceCount} selected record${unknownMarketplaceCount === 1 ? '' : 's'} has an unknown marketplace` : ''}; ${evidenceIndependenceAdequate ? 'independence floor met' : 'independence floor not met for a definitive trade verdict'}.`,
    recentCount ? `${recentCount} selected sale${recentCount === 1 ? '' : 's'} occurred within the last 90 days.` : qualifiedUndatedMercariSaleCount ? 'No selected sale has a verified date within the last 90 days; Mercari timing is Unknown.' : 'No selected sale occurred within the last 90 days.',
    spreadPct === null ? 'No stable price spread can be calculated from the selected evidence.' : `Selected-value spread is ${spreadPct}% (${marketStability} stability).`,
    `Source reliability is ${evidenceCoverage.sourceReliability}${evidenceCoverage.sourceReliabilityScore !== null ? ` (${evidenceCoverage.sourceReliabilityScore}/100)` : ''}; ${evidenceCoverage.attributedCount}/${evidenceCoverage.selectedCount} selected records are marketplace-attributed and ${evidenceCoverage.independentMarketplaceCount} independent marketplace${evidenceCoverage.independentMarketplaceCount === 1 ? '' : 's'} are represented.`,
    `${categoryEvidenceThresholds.category} threshold: ${categoryEvidenceThresholds.minimumSelectedSales} selected sales and ${categoryEvidenceThresholds.minimumIndependentMarketplaces} independent marketplaces. Price spread does not restrict valuation admission.`,
    outlierExcludedCount ? `${outlierExcludedCount} price outlier${outlierExcludedCount === 1 ? '' : 's'} was withheld from the deterministic value.` : flaggedSmallSampleOutliers.size ? `${flaggedSmallSampleOutliers.size} suspicious price tail${flaggedSmallSampleOutliers.size === 1 ? '' : 's'} remains in the small-sample review set.` : 'No selected price was withheld by the IQR outlier rule.',
  ];
  // Everything below projects already-computed sets. It never feeds selection,
  // IQR, support, confidence, reliability, guide weighting or cash arithmetic.
  const existingReceipt = sales.map(readServerNormalizationReport).find(Boolean);
  const analysisRunId = reportingOptions?.analysisRunId ?? existingReceipt?.auditRef.analysisRunId ?? randomUUID();
  const side = reportingOptions?.side ?? existingReceipt?.auditRef.side ?? undefined;
  const historicalPromptKnown = reportingOptions?.historicalPromptSales !== undefined;
  const historicalPromptSet = new Set(reportingOptions?.historicalPromptSales ?? []);
  const postPolicySet = new Set<ComparableMatch>(filtered.map(({ match }) => match));
  const currentSet = new Set<ComparableMatch>(datedWindowSales.map(({ match }) => match));
  const valuationPoolSet = new Set<ComparableMatch>(currentSales.map(({ match }) => match));
  const representedSales = new Set([...valuationMatches.map(({ sale }) => sale), ...contextualSales]);
  const ledgerOnlySales = deduplicated.unique.filter((sale) => !representedSales.has(sale));
  // Direct-engine USD filtering can leave a raw non-USD candidate unrepresented.
  // Append it ONLY to the final reporting ledger, never financial populations or
  // existing financial/legacy counts calculated above.
  const ledgerOnlyMatches = ledgerOnlySales.map((sale) => ({ ...scoreComparable(target, sale),
    accepted: false, classification: 'contextual' as const,
    exclusionReason: 'unsupported currency; retained only for final ledger coverage' }));
  const rowInputs: Array<{ sale: MarketSale; match: ComparableMatch; rawMatch?: ComparableMatch; duplicate: boolean; ledgerOnly: boolean }> = [
    ...valuationMatchRecordsAfterOutliers.map((match, index) => ({ sale: valuationMatches[index].sale,
      match, rawMatch: valuationMatches[index].match, duplicate: false, ledgerOnly: false })),
    ...contextualMatches.map((match, index) => ({ sale: contextualSales[index], match, duplicate: false, ledgerOnly: false })),
    ...duplicateMatches.map((match, index) => ({ sale: deduplicated.duplicates[index].sale, match, duplicate: true, ledgerOnly: false })),
    ...ledgerOnlyMatches.map((match, index) => ({ sale: ledgerOnlySales[index], match, duplicate: false, ledgerOnly: true })),
  ];
  const hardIdentityCodes = new Set(['CATALOG_NUMBER_CONFLICT', 'CATEGORY_IDENTITY_CONFLICT', 'UNIVERSAL_IDENTITY_CONFLICT',
    'SIGNED_FORM_CONFLICT', 'APPROVED_LOT_CONFLICT', 'APPROVED_STATE_CONFLICT']);
  const finalComparableMatches = rowInputs.map(({ sale, match, rawMatch, duplicate, ledgerOnly }): ComparableMatch => {
    const intakeOrdinal = deduplicated.inputOrdinals.get(sale)!;
    const original = sales[intakeOrdinal];
    const receipt = readServerNormalizationReport(original);
    const sourceAdmission = receipt?.sourceAdmission ?? {
      reportedDisposition: typeof original.evidenceDisposition === 'string' ? original.evidenceDisposition.slice(0, 80) : null,
      reportedVisualReviewStatus: typeof original.visualReviewStatus === 'string' ? original.visualReviewStatus.slice(0, 40) : null,
      verifiedSourceId: null, verifiedSourceDisposition: null, verification: 'unmeasured' as const, normalizationEligible: null,
      blockerCodes: [], warningCodes: ['NORMALIZATION_NOT_MEASURED'],
    };
    const identityAdmission = match.identityAdmission!;
    const preselected = Boolean(rawMatch && selectedMatches.has(rawMatch));
    const omittedByCap = Boolean(rawMatch?.accepted && !preselected);
    const postPolicySaleDiagnostics = Boolean(rawMatch && postPolicySet.has(rawMatch));
    const currentSaleMedianDiagnostics = Boolean(rawMatch && currentSet.has(rawMatch));
    const qualifiedUndatedMercari = Boolean(rawMatch && postPolicySaleDiagnostics && qualifiedUndatedMatches.has(rawMatch));
    const valuationPoolDiagnostics = Boolean(rawMatch && valuationPoolSet.has(rawMatch));
    const primaryMarketSales = valuationPoolDiagnostics && valuationBasis === 'market_sales';
    const outlierExcluded = Boolean(rawMatch && outlierMatches.has(rawMatch));
    const unsupportedCurrency = sourceAdmission.blockerCodes.includes('UNSUPPORTED_CURRENCY')
      || (ledgerOnly && String(sale.currency ?? 'UNKNOWN').toUpperCase() !== 'USD');
    // `unmeasured` means the server did not obtain an authoritative receipt.
    // It must never be promoted to a verified terminal exclusion merely because
    // the inbound row carried a conflict-looking field.
    const hardExcluded = sourceAdmission.verification === 'verified' && (
      identityAdmission.blockerCodes.some((code) => hardIdentityCodes.has(code))
      || sourceAdmission.verifiedSourceDisposition === 'rejected_objective_conflict');
    const reviewRequired = sourceAdmission.blockerCodes.some((code) => ['PROVENANCE_UNVERIFIED', 'REQUIRED_APPROVAL_MISSING', 'VISUAL_MISMATCH'].includes(code))
      || identityAdmission.blockerCodes.some((code) => ['REQUIRED_APPROVAL_MISSING', 'CATEGORY_REVIEW_REQUIRED', 'UNIVERSAL_REVIEW_REQUIRED',
        'VISUAL_MISMATCH', 'VARIANT_REVIEW_REQUIRED', 'TARGET_IDENTITY_INCOMPLETE'].includes(code));
    const historicAgeDays = daysOld(sale.date, nowMs);
    const historicMarketContext = !duplicate && !outlierExcluded && !omittedByCap && !hardExcluded && !reviewRequired
      && hasVerifiedHistoricSaleEconomics(original) && identityAdmission.accepted
      && historicAgeDays !== null && historicAgeDays > 365;
    const code: FinalValuationUse['use']['code'] = duplicate
      ? sale.duplicateStatus === 'exact_duplicate' ? 'EXACT_DUPLICATE' : 'PROBABLE_DUPLICATE'
      : outlierExcluded ? 'OUTLIER_EXCLUDED'
      : omittedByCap ? 'OMITTED_BY_CAP'
      : primaryMarketSales ? 'CURRENT_SALES_PRIMARY'
      : historicMarketContext ? 'HISTORIC_MARKET_CONTEXT'
      : currentSaleMedianDiagnostics ? 'CURRENT_SALES_DIAGNOSTIC_ONLY'
      : qualifiedUndatedMercari ? 'SOURCE_ELIGIBLE_NOT_SELECTED'
      : postPolicySaleDiagnostics ? 'HISTORICAL_DIAGNOSTIC_ONLY'
      : hardExcluded ? 'FINAL_HARD_EXCLUDED'
      : unsupportedCurrency ? 'UNSUPPORTED_CURRENCY'
      : reviewRequired ? 'REVIEW_REQUIRED'
      : ['grade_adjacent_comparable', 'condition_adjacent', 'variant_comparable'].includes(identityAdmission.valuationRelationship) ? 'SECONDARY_ONLY'
      : sourceAdmission.normalizationEligible ? 'SOURCE_ELIGIBLE_NOT_SELECTED' : 'CONTEXT_ONLY';
    const reasonCodes = [...sourceAdmission.blockerCodes, ...identityAdmission.blockerCodes];
    if (duplicate) reasonCodes.push(sale.duplicateStatus === 'exact_duplicate' ? 'EXACT_DUPLICATE_POLICY' : 'PROBABLE_DUPLICATE_POLICY');
    if (outlierExcluded) reasonCodes.push('IQR_EXCLUDED_N_GE_10');
    if (omittedByCap) reasonCodes.push('SOURCE_BALANCED_CAP');
    if (qualifiedUndatedMercari) reasonCodes.push('MERCARI_UNDATED_QUALIFIED_EXCEPTION', 'MERCARI_UNDATED_TIMING_UNVERIFIED', 'MERCARI_SOLD_TRUE_PRICE_AS_REPORTED');
    if (valuationPoolDiagnostics && !primaryMarketSales) reasonCodes.push(materialReviewRequired ? 'MATERIAL_IDENTITY_HOLD'
      : valuationBasis === 'guide_fallback' ? 'GUIDE_FALLBACK_PRIMARY' : 'INSUFFICIENT_CURRENT_SUPPORT');
    if (postPolicySaleDiagnostics && !valuationPoolDiagnostics) reasonCodes.push('HISTORICAL_EXTENSION_NOT_CURRENT_PRIMARY');
    if (historicMarketContext) reasonCodes.push('VERIFIED_MATCHED_HISTORIC_SALE_CONTEXT_ONLY');
    if (ledgerOnly) reasonCodes.push('LEDGER_ONLY_COVERAGE_FALLBACK');
    const valuationUse: FinalValuationUse = {
      version: FINAL_VALUATION_USE_VERSION,
      auditRef: makeFinalAuditRef({ side, analysisRunId, intakeOrdinal,
        sourceCorrelation: receipt?.auditRef.sourceCorrelation ?? boundedFinalSourceCorrelation(original),
        displayCorrelation: receipt?.auditRef.displayCorrelation ?? boundedFinalDisplayCorrelation(original.displayCorrelation),
        verifiedObservationId: receipt?.auditRef.verifiedObservationId,
        verifiedCanonicalTransactionId: receipt?.auditRef.verifiedCanonicalTransactionId }),
      sourceAdmission, identityAdmission,
      selection: preselected ? 'selected_pre_outlier' : omittedByCap ? 'omitted_by_cap' : 'not_selected',
      use: { code, reasonCodes: [...new Set(reasonCodes)], postPolicySaleDiagnostics, currentSaleMedianDiagnostics, primaryMarketSales,
        historicMarketContext, historicSaleDate: historicMarketContext ? sale.date ?? null : null,
        historicPrice: historicMarketContext ? nullableTestAiPrice(sale.price) : null,
        historicCurrency: historicMarketContext ? 'USD' : null,
        supportReasonDetails: valuationPoolDiagnostics && !primaryMarketSales && valuationBasis === 'insufficient_evidence'
          ? supportReasonDetails : [],
        historicalPromptIncluded: historicalPromptKnown ? historicalPromptSet.has(original) : null,
        possibleDuplicateWarning: sale.duplicateStatus === 'possible_duplicate',
        smallSampleOutlierWarning: Boolean(rawMatch && flaggedSmallSampleOutliers.has(rawMatch)) },
    };
    return { ...match, valuationUse };
  });
  const allUseRows = finalComparableMatches.map((match) => match.valuationUse!).sort((a, b) => a.auditRef.intakeOrdinal - b.auditRef.intakeOrdinal);
  const financialUniqueRefs = new Set(deduplicated.unique.map((sale) => deduplicated.inputOrdinals.get(sale)));
  const consideredRefs = new Set(valuationMatches.map(({ sale }) => deduplicated.inputOrdinals.get(sale)));
  const populationDefinitions: Array<{ id: string; label: string; currency?: 'USD'; role?: string; includes: (row: FinalValuationUse) => boolean; unmeasured?: boolean }> = [
    { id: 'submitted_intake', label: 'Actual submitted final-intake occurrences', includes: () => true },
    { id: 'normalization_eligible', label: 'Final-normalization eligible occurrences before deduplication', includes: (row) => row.sourceAdmission.normalizationEligible === true,
      unmeasured: allUseRows.some((row) => row.sourceAdmission.normalizationEligible === null) },
    { id: 'financial_unique', label: 'Financial policy retained unique occurrences', includes: (row) => financialUniqueRefs.has(row.auditRef.intakeOrdinal) },
    { id: 'suppressed_duplicates', label: 'Financial exact/probable duplicate occurrences suppressed', includes: (row) => ['EXACT_DUPLICATE', 'PROBABLE_DUPLICATE'].includes(row.use.code) },
    { id: 'direct_identity_considered', label: 'USD completed-sale occurrences scored for direct identity before cap', currency: 'USD', includes: (row) => consideredRefs.has(row.auditRef.intakeOrdinal) },
    { id: 'direct_identity_admitted', label: 'Direct identity admitted in actual unique USD candidate set before cap', currency: 'USD', includes: (row) => consideredRefs.has(row.auditRef.intakeOrdinal) && row.identityAdmission.accepted },
    { id: 'selected_pre_iqr', label: 'Actual source-balanced selected occurrences before IQR', currency: 'USD', role: 'selected_before_iqr', includes: (row) => row.selection === 'selected_pre_outlier' },
    { id: 'post_policy_sale_diagnostics', label: 'Actual sale-statistics occurrences after outlier policy', currency: 'USD', role: 'post_policy_sale_diagnostic', includes: (row) => row.use.postPolicySaleDiagnostics },
    { id: 'current_sale_median_diagnostics', label: 'Actual current 365-day sale-median diagnostic occurrences', currency: 'USD', role: 'current_sale_median_diagnostic', includes: (row) => row.use.currentSaleMedianDiagnostics },
    { id: 'primary_market_sales', label: 'Actual contributors to primary market-sales valuation; zero for guide/hold', currency: 'USD', role: 'primary_market_sales', includes: (row) => row.use.primaryMarketSales },
    ...(qualifiedUndatedMercariSaleCount ? [
      { id: 'qualified_undated_mercari', label: 'Qualified undated Mercari exceptions; timing unverified', currency: 'USD' as const,
        role: 'qualified_undated_mercari_diagnostic', includes: (row: FinalValuationUse) => row.use.reasonCodes.includes('MERCARI_UNDATED_QUALIFIED_EXCEPTION') },
      { id: 'valuation_pool_median_diagnostics', label: 'Dated-window plus qualified-undated valuation-pool median occurrences', currency: 'USD' as const,
        role: 'valuation_pool_median_diagnostic', includes: (row: FinalValuationUse) => row.use.currentSaleMedianDiagnostics || row.use.reasonCodes.includes('MERCARI_UNDATED_QUALIFIED_EXCEPTION') },
    ] : []),
    { id: 'historical_diagnostics', label: 'Included post-policy historical-extension sale diagnostics, not current primary', currency: 'USD', role: 'historical_sale_diagnostic', includes: (row) => row.use.postPolicySaleDiagnostics && !row.use.currentSaleMedianDiagnostics && !row.use.reasonCodes.includes('MERCARI_UNDATED_QUALIFIED_EXCEPTION') },
    { id: 'historic_market_context', label: 'Verified matching completed sales older than one year; historical context, not current primary', currency: 'USD', role: 'historic_market_context', includes: (row) => row.use.code === 'HISTORIC_MARKET_CONTEXT' },
    { id: 'historical_prompt', label: 'Actual qualitative historical formatter inclusion, not model attention', role: 'qualitative_historical_prompt', includes: (row) => row.use.historicalPromptIncluded === true, unmeasured: !historicalPromptKnown },
  ];
  const populationsFor = (rows: FinalValuationUse[]) => populationDefinitions.map((definition) => finalUsePopulation(definition.id,
    definition.label, (definition.id === 'normalization_eligible' ? rows.some((row) => row.sourceAdmission.normalizationEligible === null) : definition.unmeasured)
      ? null : rows.filter(definition.includes), definition.currency ?? null, definition.role ?? null));
  const sourceGroups = new Map<string, { sourceId: string | null; diagnosticSourceId: string | null; sourceRunId: string | null; rows: FinalValuationUse[] }>();
  for (const row of allUseRows) {
    const sourceId = row.sourceAdmission.verifiedSourceId;
    const correlation = row.auditRef.displayCorrelation;
    const ranking = row.auditRef.sourceCorrelation.metadataRanking;
    const diagnosticSourceId = correlation?.sourceId ?? ranking?.sourceId ?? null;
    const sourceRunId = correlation?.runId ?? ranking?.populationId ?? null;
    const key = JSON.stringify([sourceId, diagnosticSourceId, sourceRunId]);
    const group: { sourceId: string | null; diagnosticSourceId: string | null; sourceRunId: string | null; rows: FinalValuationUse[] }
      = sourceGroups.get(key) ?? { sourceId, diagnosticSourceId, sourceRunId, rows: [] };
    group.rows.push(row); sourceGroups.set(key, group);
  }
  const priceGroups: FinalUsePriceGroup[] = [];
  for (const definition of populationDefinitions.filter((entry) => entry.role && !entry.unmeasured)) {
    const groups = new Map<string, FinalUsePriceGroup>();
    for (const match of finalComparableMatches) {
      if (!definition.includes(match.valuationUse!)) continue;
      const actualCurrency = match.currency === 'UNKNOWN' ? null : match.currency;
      const key = JSON.stringify([actualCurrency, match.priceBasis, match.buyerPremium, match.shipping, match.tax]);
      const group: FinalUsePriceGroup = groups.get(key) ?? { population: definition.id, priceRole: definition.role!, currency: actualCurrency,
        priceBasis: match.priceBasis ?? null, buyerPremium: match.buyerPremium ?? null, shipping: match.shipping ?? null,
        tax: match.tax ?? null, semantics: 'as_reported_no_fx_or_fee_recomputation', count: 0, memberRefs: [], prices: [] };
      const actualAmount = sales[match.valuationUse!.auditRef.intakeOrdinal].price;
      const reportedAmount = nullableTestAiPrice(actualAmount);
      group.count += 1; group.memberRefs.push(match.valuationUse!.auditRef.intakeRef); group.prices.push(reportedAmount); groups.set(key, group);
    }
    priceGroups.push(...groups.values());
  }
  const finalUseReport: FinalUseReport = {
    version: FINAL_VALUATION_USE_VERSION, side: side ?? null, analysisRunId,
    coverage: { population: 'actual_submitted_final_intake', unit: 'submitted_intake_occurrence', availableSourceIngress: 'unmeasured',
      retrievedObservations: 'unmeasured', notAllRetrievedReachIntake: true, ledgerOnlyFallbackCount: ledgerOnlyMatches.length },
    valuationBasis, primaryPricingReasonCodes: materialReviewRequired ? ['MATERIAL_IDENTITY_HOLD']
      : valuationBasis === 'guide_fallback' ? ['GUIDE_FALLBACK_PRIMARY'] : valuationBasis === 'insufficient_evidence' ? ['INSUFFICIENT_CURRENT_SUPPORT']
        : qualifiedUndatedMercariSaleCount ? ['MERCARI_UNDATED_QUALIFIED_EXCEPTION', 'MERCARI_UNDATED_TIMING_UNVERIFIED', 'MERCARI_SOLD_TRUE_PRICE_AS_REPORTED'] : [],
    populations: populationsFor(allUseRows), sources: [...sourceGroups.values()].map(({ rows, ...group }) => ({ ...group, populations: populationsFor(rows) })),
    priceGroups,
  };
  return {
    marketRange,
    typicalBand: supported && currentQ1 !== null && currentQ3 !== null ? { low: Math.round(currentQ1), high: Math.round(currentQ3), supported: true } : { low: null, high: null, supported: false },
    primaryValue,
    valuationBasis,
    valuationBasisReason,
    saleMedianValue,
    currentWindowSaleCount,
    currentWindowIndependentMarketplaceCount,
    valuationEligibleSaleCount,
    valuationEligibleIndependentMarketplaceCount,
    qualifiedUndatedMercariSaleCount,
    guideAnchorValue,
    guideAnchorSourceId: valuationGuideAnchor?.sourceId ?? null,
    guideAnchorSourceLabel: valuationGuideAnchor?.sourceLabel ?? null,
    guideAnchorGrade: valuationGuideAnchor?.grade ?? null,
    guideAnchorMatchType: valuationGuideAnchor?.matchType ?? null,
    guideAnchorWeightPct,
    guideAdjustedValue,
    guideProvisional,
    weightedValue,
    median: median !== null ? Math.round(median) : null,
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
    valuationMethod: valuationBasis === 'market_sales' ? qualifiedUndatedMercariSaleCount
      ? 'sale-only median from sufficient exact or near identity-matched completed sales, including the qualified undated Mercari exception (sale date Unknown, timing unverified, sold=true reported price); recency-weighted mean retained as a diagnostic, with existing duplicate/outlier/source policies'
      : `sale-only median from sufficient current exact or near identity-matched completed sales; recency-weighted mean retained as a diagnostic, with existing duplicate/outlier/source policies`
      : guideProvisional ? `verified ${guideMatchDescription} ${valuationGuideAnchor?.sourceLabel ?? 'guide'} fallback alone because ${qualifiedUndatedMercariSaleCount ? 'qualified valuation-pool' : 'current market'} evidence is insufficient; no blended sale value, fabricated sale range, or automatic guide-based cash` : materialReviewRequired ? 'no verified valuation; material identity evidence conflict requires review' : `no verified valuation; insufficient ${qualifiedUndatedMercariSaleCount ? 'qualified' : 'current'} completed-sale evidence and no verified applicable guide fallback`,
    majorAssumptions: ['Only USD observations with positive prices were considered.',
      qualifiedUndatedMercariSaleCount ? 'Sufficient exact or near completed sales within one year plus privately verified final-identity-approved undated Mercari records determine the sale-only median under mercari_undated_sold_v1. Mercari timing remains Unknown and sold=true prices are used as reported; no acquisition time becomes a sale date. Historical extension remains diagnostic only.' : 'Only sufficient completed, dated records within one year and classified exact or near determine the market valuation; a labeled 366–730-day illiquid-market extension remains diagnostic evidence and cannot alone establish current support.',
      qualifiedUndatedMercariSaleCount ? 'Active asking prices and unqualified undated or historical context do not determine value. A verified applicable guide is an exclusive provisional fallback; guides never enter observed-sale ranges or counts.' : 'Active asking prices, historical or undated context, certification, population, and RSS are not completed sales. A verified applicable guide may determine only an explicitly provisional fallback when current market evidence is insufficient; guides never enter observed-sale ranges or counts.',
      'Exact and documented-probable duplicates are excluded; possible duplicates remain visible for review; existing hard identity and source/financial safeguards remain in force.'],
    missingInformation,
    valuationWarnings,
    comparables: finalComparableMatches,
    selectionDiagnostics: selection.diagnostics,
    finalUseReport,
  };
}

/** Narrative and UI share the same final, deduplicated historical population. */
export function getHistoricMarketContextSales(
  target: ComparableTarget,
  sales: MarketSale[],
  now = new Date(),
  profile?: MarketProfile,
): MarketSale[] {
  const finalProfile = profile ?? buildMarketProfile(target, sales, undefined, now);
  return finalProfile.comparables
    .filter((match) => match.valuationUse?.use.code === 'HISTORIC_MARKET_CONTEXT')
    .map((match) => sales[match.valuationUse!.auditRef.intakeOrdinal])
    .filter((sale): sale is MarketSale => Boolean(sale && hasVerifiedHistoricSaleEconomics(sale)));
}

export function deterministicTradeComparison(
  left: MarketProfile,
  right: MarketProfile,
  leftFallback = 0,
  rightFallback = 0,
): DeterministicTradeComparison {
  // Keep each independently established value; missing or malformed primaries
  // never become zero, a range midpoint, a diagnostic, or a fallback argument.
  const leftValue = typeof left.primaryValue === 'number' && Number.isFinite(left.primaryValue) && left.primaryValue > 0 ? left.primaryValue : null;
  const rightValue = typeof right.primaryValue === 'number' && Number.isFinite(right.primaryValue) && right.primaryValue > 0 ? right.primaryValue : null;
  const hasDefensibleLeftValue = left.valuationBasis === 'market_sales' && hasDefensibleCurrentSaleValue(left);
  const hasDefensibleRightValue = right.valuationBasis === 'market_sales' && hasDefensibleCurrentSaleValue(right);
  const hasSufficientEvidence = hasDefensibleLeftValue && hasDefensibleRightValue;
  if (!hasSufficientEvidence || leftValue === null || rightValue === null) {
    return {
      leftValue,
      rightValue,
      difference: null,
      differencePercentage: null,
      verdict: 'Insufficient Evidence',
      rangeRelationship: 'unsupported',
      overlapBand: null,
      overlapAmount: null,
      overlapRatio: null,
      midpointDifference: null,
      typicalBandOverlap: null,
      rangeGap: null,
      decisionBasis: `One or both sides lack sufficient current completed-sale evidence for a definitive range-based trade conclusion. Item A uses ${left.valuationBasis}; Item B uses ${right.valuationBasis}. Any guide fallback is a provisional estimate, not market support.${leftValue === null ? ` Item A: ${TEST_AI_VALUE_UNAVAILABLE_MESSAGE}.` : ''}${rightValue === null ? ` Item B: ${TEST_AI_VALUE_UNAVAILABLE_MESSAGE}.` : ''}`,
    };
  }
  const difference = rightValue - leftValue;
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
    differencePercentage: Math.round((difference / leftValue) * 1000) / 10,
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
    `- Primary value: ${profile.primaryValue === null ? 'unavailable' : `$${profile.primaryValue.toLocaleString()}`}; guide anchor: ${profile.guideAnchorValue === null ? 'none' : `${profile.guideAnchorSourceLabel ?? 'guide'} $${profile.guideAnchorValue.toLocaleString()} at ${profile.guideAnchorWeightPct}% secondary weight`}; weighted mean diagnostic: ${profile.weightedValue === null ? 'unavailable' : `$${profile.weightedValue.toLocaleString()}`}`,
    `- Observed accepted sale range: ${profile.marketRange.supported && profile.marketRange.low !== null && profile.marketRange.high !== null ? `$${profile.marketRange.low.toLocaleString()}-$${profile.marketRange.high.toLocaleString()}` : 'no defensible range'}`,
    `- Confidence: evidence ${profile.evidenceQuality}, identification ${profile.itemIdentificationConfidence}, stability ${profile.marketStability}, liquidity ${profile.liquidity}, grade/condition ${profile.gradeConditionConfidence}`,
    `- Sales velocity: 7d ${profile.salesVelocity.sevenDay}, 30d ${profile.salesVelocity.thirtyDay}, 90d ${profile.salesVelocity.ninetyDay}; recent sales ${profile.recentSaleCount}; authoritative sales ${profile.authoritativeSaleCount}`,
    `- Comparables: ${profile.comparableCount} accepted (${profile.directComparableCount} direct; ${profile.exactMatchCount} exact, ${profile.nearMatchCount} near), ${profile.gradeAdjacentComparableCount} grade/certification-adjacent secondary, ${profile.contextualComparableCount} contextual, ${profile.rejectedComparableCount} excluded, ${profile.duplicateSaleCount} duplicates suppressed; identity readiness ${profile.identityReadiness}; warnings: ${profile.valuationWarnings.join(' ') || 'none'}`,
  ].join('\n');
}
