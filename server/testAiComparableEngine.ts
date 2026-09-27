import { buildTestAiP0Identity } from '../shared/testAiP0Evidence';

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
  sourceLabel?: string | null;
  recency?: 'recent' | 'historical' | 'undated' | null;
  sourceId?: string | null;
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
}

export type ComparableClassification = 'exact' | 'near' | 'contextual' | 'rejected';

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
  sourceId?: string | null;
  sourceLabel?: string | null;
  marketplace?: string | null;
  saleId?: string | null;
  url?: string | null;
  saleStatus?: string | null;
  completedStatusBasis?: string | null;
  priceBasis?: string | null;
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
  marketRange: { low: number; mid: number; high: number; supported: boolean };
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
  contextualComparableCount: number;
  duplicateSaleCount: number;
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

function extractComparableNumber(title: string): string | null {
  const labeled = title.match(/\b(?:issue|no\.?|number|card)\s*#?\s*(\d{1,6})\b/i);
  if (labeled) return labeled[1];
  const hash = title.match(/#\s*(\d{1,6})\b/);
  return hash ? hash[1] : null;
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

function saleFingerprint(sale: MarketSale): string {
  const source = normalizeFingerprintText(sale.sourceId || sale.marketplace || 'unknown');
  const stableId = normalizeFingerprintText(sale.saleId || sale.url || '');
  if (stableId) return `${source}|id:${stableId}`;
  const price = Number(sale.price);
  const amount = Number.isFinite(price) ? price.toFixed(2) : 'unknown';
  const date = String(sale.date ?? '').slice(0, 10) || 'undated';
  return `${source}|${normalizeFingerprintText(sale.title)}|${amount}|${date}`;
}

export function deduplicateMarketSales(sales: MarketSale[]): { unique: MarketSale[]; duplicates: Array<{ sale: MarketSale; duplicateOf: string }> } {
  const seen = new Map<string, string>();
  const unique: MarketSale[] = [];
  const duplicates: Array<{ sale: MarketSale; duplicateOf: string }> = [];
  for (const sale of sales) {
    const fingerprint = saleFingerprint(sale);
    const known = seen.get(fingerprint);
    if (known) duplicates.push({ sale, duplicateOf: known });
    else {
      seen.set(fingerprint, fingerprint);
      unique.push(sale);
    }
  }
  return { unique, duplicates };
}

export const MAX_VALUATION_COMPARABLES = 48;

function sourceKey(sale: MarketSale): string {
  return String(sale.sourceId || sale.marketplace || 'unattributed').trim().toLowerCase() || 'unattributed';
}

function sourceLabel(sale: MarketSale): string {
  return String(sale.sourceLabel || sale.marketplace || sale.sourceId || 'Unattributed source').trim() || 'Unattributed source';
}

export function isCompletedSaleCandidate(sale: MarketSale, nowMs: number): boolean {
  if (sale.evidenceDisposition && sale.evidenceDisposition !== 'valuation_eligible') return false;
  if (sale.saleStatus && sale.saleStatus !== 'completed') return false;
  if (sale.priceBasis === 'unknown') return false;
  if (sale.recency === 'historical' || sale.recency === 'undated') return false;
  const age = daysOld(sale.date, nowMs);
  return age !== null && age <= 365;
}

function compareValuationPriority(
  left: { match: ComparableMatch; ageDays: number | null },
  right: { match: ComparableMatch; ageDays: number | null },
): number {
  if (right.match.score !== left.match.score) return right.match.score - left.match.score;
  const leftAge = left.ageDays ?? Number.MAX_SAFE_INTEGER;
  const rightAge = right.ageDays ?? Number.MAX_SAFE_INTEGER;
  if (leftAge !== rightAge) return leftAge - rightAge;
  return right.match.price - left.match.price;
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
    .filter((sale) => String(sale.currency ?? 'USD').toUpperCase() === 'USD')
    .map((sale) => ({ sale, match: scoreComparable(target, sale), ageDays: daysOld(sale.date, nowMs) }));
  const accepted = valuationMatches.filter(({ match }) => match.accepted);
  const perSource = new Map<string, typeof accepted>();
  for (const candidate of accepted) {
    const key = sourceKey(candidate.sale);
    const bucket = perSource.get(key) ?? [];
    bucket.push(candidate);
    perSource.set(key, bucket);
  }
  const selected: typeof accepted = [];
  for (const bucket of [...perSource.values()].sort((left, right) => compareValuationPriority(left[0]!, right[0]!))) {
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

export function scoreComparable(target: ComparableTarget, sale: MarketSale): ComparableMatch {
  const title = String(sale.title ?? '').trim();
  const price = Number(sale.price);
  const details = parseDetails(target);
  const identity = buildTestAiP0Identity(target);
  const targetTokens = new Set(textTokens(target.title));
  const saleTokens = new Set(textTokens(title));
  const overlap = [...targetTokens].filter((token) => saleTokens.has(token)).length;
  const tokenScore = targetTokens.size ? overlap / targetTokens.size : 0;
  const reasons: string[] = [];
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
  const observedNumber = extractComparableNumber(title);
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
    reasons.push('grading or authentication company differs');
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const hardIdentityConflict = materialNumberConflict || materialVariantConflict || materialGradeConflict || materialCompanyConflict;
  const priceIsUsable = Number.isFinite(price) && price > 0;
  const classification: ComparableClassification = !priceIsUsable || hardIdentityConflict
    ? 'rejected'
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
      ? 'known grade differs from target'
        : materialCompanyConflict
          ? 'known grading or authentication company differs from target'
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
    currency: String(sale.currency ?? 'USD').toUpperCase(),
    score: boundedScore,
    accepted,
    reasons,
    exclusionReason,
    weight: 0,
    classification,
    sourceId: sale.sourceId ?? sale.marketplace ?? null,
    sourceLabel: sale.sourceLabel ?? sale.marketplace ?? sale.sourceId ?? null,
    marketplace: sale.marketplace ?? null,
    saleId: sale.saleId ?? null,
    url: sale.url ?? null,
    saleStatus: sale.saleStatus ?? null,
    completedStatusBasis: sale.completedStatusBasis ?? null,
    priceBasis: sale.priceBasis ?? null,
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
    .filter((sale) => String(sale.currency ?? 'USD').toUpperCase() === 'USD')
    .map((sale) => ({
      ...scoreComparable(target, sale),
      accepted: false,
      classification: 'contextual' as const,
      exclusionReason: 'historical, undated, or non-completed record is context only',
    }));
  const duplicateMatches: ComparableMatch[] = deduplicated.duplicates.map(({ sale, duplicateOf }) => ({
    ...scoreComparable(target, sale),
    accepted: false,
    classification: 'rejected',
    exclusionReason: 'duplicate sale observation',
    duplicateOf,
    reasons: ['duplicate sale observation suppressed'],
  }));
  const comparableMatches = [...valuationMatchRecords, ...contextualMatches, ...duplicateMatches];
  const accepted = selected.map(({ match }) => match).filter((match) => match.price > 0);
  const acceptedWithAge = accepted.map((match) => ({ match, ageDays: daysOld(match.date, nowMs) }));
  const recentSales = acceptedWithAge.filter(({ ageDays }) => ageDays !== null && ageDays <= 90);
  const ages = acceptedWithAge.map(({ ageDays }) => ageDays).filter((age): age is number => age !== null);
  const prices = accepted.map((match) => match.price).sort((a, b) => a - b);
  const q1 = percentile(prices, 0.25);
  const q3 = percentile(prices, 0.75);
  const median = prices.length ? prices.length % 2 ? prices[Math.floor(prices.length / 2)] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2 : null;
  const iqr = prices.length ? q3 - q1 : null;
  const filtered = iqr !== null ? acceptedWithAge.filter(({ match }) => match.price >= q1 - 1.5 * iqr && match.price <= q3 + 1.5 * iqr) : acceptedWithAge;
  const weightedDenominator = filtered.reduce((sum, { match, ageDays }) => {
    match.weight = (0.5 + match.score / 100) * recencyWeight(ageDays);
    return sum + match.weight;
  }, 0);
  const weightedValue = weightedDenominator > 0 ? Math.round(filtered.reduce((sum, { match }) => sum + match.price * match.weight, 0) / weightedDenominator) : null;
  const minimum = filtered.length ? Math.round(Math.min(...filtered.map(({ match }) => match.price))) : null;
  const maximum = filtered.length ? Math.round(Math.max(...filtered.map(({ match }) => match.price))) : null;
  const spreadPct = weightedValue && minimum !== null && maximum !== null ? Math.round(((maximum - minimum) / weightedValue) * 100) : null;
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
  const contextualComparableCount = comparableMatches.filter((match) => match.classification === 'contextual').length;
  const identityReadiness = buildTestAiP0Identity(target).readiness;
  const itemIdentificationConfidence: ConfidenceLevel = exactMatchCount >= 3 ? 'high' : exactMatchCount >= 1 || accepted.length >= 3 ? 'medium' : 'low';
  const evidenceQuality: ConfidenceLevel = accepted.length >= 6 && exactMatchCount >= 2 ? 'high' : accepted.length >= 3 ? 'medium' : 'low';
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
  if (spreadPct !== null && spreadPct > 75) valuationWarnings.push('Authoritative comparable prices are widely dispersed.');
  if (oldestSaleAgeDays !== null && oldestSaleAgeDays > 365) valuationWarnings.push('The oldest included authoritative sale is more than one year old.');
  if (contextualComparableCount > 0) valuationWarnings.push('Historical, undated, non-completed, or insufficiently identified records were retained as context but excluded from valuation.');
  if (deduplicated.duplicates.length > 0) valuationWarnings.push(`${deduplicated.duplicates.length} duplicate sale observation${deduplicated.duplicates.length === 1 ? '' : 's'} was excluded.`);
  if (selection.diagnostics.omittedByCap > 0) valuationWarnings.push(`${selection.diagnostics.omittedByCap} otherwise matched sale observation${selection.diagnostics.omittedByCap === 1 ? '' : 's'} was retained in the audit but omitted from the bounded valuation set after source-balanced selection.`);
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
  const supported = Boolean(!materialReviewRequired && weightedValue !== null && accepted.length >= 2);
  return {
    marketRange: supported ? { low: minimum!, mid: weightedValue!, high: maximum!, supported: true } : { low: 0, mid: weightedValue ?? aggregateMetrics?.median ?? 0, high: 0, supported: false },
    weightedValue,
    median: median !== null ? Math.round(median) : aggregateMetrics?.median ?? null,
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
    contextualComparableCount,
    duplicateSaleCount: deduplicated.duplicates.length,
    identityReadiness,
    valuationMethod: supported ? 'recency-weighted completed-sale value using exact or near identity matches, duplicate suppression, and IQR outlier filtering' : materialReviewRequired ? 'no verified valuation; material identity evidence conflict requires review' : aggregateMetrics?.median ? 'no verified valuation; aggregate market median shown as unverified context because completed identity-matched sales are insufficient' : 'no verified valuation; insufficient completed-sale evidence',
    majorAssumptions: ['Only USD observations with positive prices were considered.', 'Only completed, dated records within one year and classified exact or near may influence valuation.', 'Active asking prices, historical or undated records, certification, population, reference data, and RSS remain context only.', 'Duplicate observations are excluded; grade, condition, variant, and release mismatches reject the result.'],
    missingInformation,
    valuationWarnings,
    comparables: comparableMatches,
    selectionDiagnostics: selection.diagnostics,
  };
}

export function deterministicTradeComparison(left: MarketProfile, right: MarketProfile, leftFallback = 0, rightFallback = 0) {
  const leftValue = left.weightedValue ?? left.median ?? leftFallback;
  const rightValue = right.weightedValue ?? right.median ?? rightFallback;
  const difference = rightValue - leftValue;
  const hasDefensibleLeftValue = left.marketRange.supported && left.authoritativeSaleCount >= 2;
  const hasDefensibleRightValue = right.marketRange.supported && right.authoritativeSaleCount >= 2;
  const hasSufficientEvidence = hasDefensibleLeftValue && hasDefensibleRightValue;
  return {
    leftValue,
    rightValue,
    difference,
    differencePercentage: leftValue > 0 ? Math.round((difference / leftValue) * 1000) / 10 : 0,
    verdict: !hasSufficientEvidence ? 'Insufficient Evidence' : Math.abs(difference) < Math.max(1, leftValue * 0.05) ? 'Roughly Equal' : difference > 0 ? 'Item B Worth More' : 'Item A Worth More',
  } as const;
}

export function marketProfileForPrompt(label: string, profile: MarketProfile): string {
  return [
    `${label} DETERMINISTIC MARKET PROFILE:`,
    `- Evidence state: ${profile.evidenceState}; valuation method: ${profile.valuationMethod}`,
    `- Weighted value: ${profile.weightedValue === null ? 'unavailable' : `$${profile.weightedValue.toLocaleString()}`}; median: ${profile.median === null ? 'unavailable' : `$${profile.median.toLocaleString()}`}`,
    `- Range supported: ${profile.marketRange.supported ? `$${profile.marketRange.low.toLocaleString()}-$${profile.marketRange.high.toLocaleString()}` : 'no defensible range'}`,
    `- Confidence: evidence ${profile.evidenceQuality}, identification ${profile.itemIdentificationConfidence}, stability ${profile.marketStability}, liquidity ${profile.liquidity}, grade/condition ${profile.gradeConditionConfidence}`,
    `- Sales velocity: 7d ${profile.salesVelocity.sevenDay}, 30d ${profile.salesVelocity.thirtyDay}, 90d ${profile.salesVelocity.ninetyDay}; recent sales ${profile.recentSaleCount}; authoritative sales ${profile.authoritativeSaleCount}`,
    `- Comparables: ${profile.comparableCount} accepted (${profile.exactMatchCount} exact, ${profile.nearMatchCount} near), ${profile.contextualComparableCount} contextual, ${profile.rejectedComparableCount} excluded, ${profile.duplicateSaleCount} duplicates suppressed; identity readiness ${profile.identityReadiness}; warnings: ${profile.valuationWarnings.join(' ') || 'none'}`,
  ].join('\n');
}
