import { selectPreferredGuideAnchor, TEST_AI_VALUE_UNAVAILABLE_MESSAGE, type NormalizedEvidenceSummary } from '../shared/testAiEvidenceNormalization';
import { verifyGuideAnchors } from './testAiGuideEvidence';
import type { FinalUseReport, ValuationUseSide } from '../shared/testAiValuationUse';
import {
  buildMarketProfile,
  deterministicTradeComparison,
  hasDefensibleCurrentSaleValue,
  type ComparableIdentityGate,
  type ComparableTarget,
  type MarketProfile,
  type MarketSale,
  type ConfidenceLevel,
} from './testAiComparableEngine';

export const ANALYZER_SNAPSHOT_VERSION = '2.12.0';

export type AnalysisCashAdjustment = {
  amount: number;
  paidBy: 'item_a' | 'item_b';
};

export type AnalysisSnapshot = {
  version: typeof ANALYZER_SNAPSHOT_VERSION;
  generatedAt: string;
  item: { title: string; category: string };
  profile: MarketProfile;
  finalUseReport: FinalUseReport;
  evidence: {
    identityReadiness: string | null;
    sourceStatuses: Array<{
      id: string;
      label: string;
      kind: string;
      role: string;
      status: string;
      message: string | null;
    }>;
    reviewFlags: string[];
    visualReview: {
      match: number;
      roughMatch: number;
      mismatch: number;
      unreadable: number;
      notReviewed: number;
    };
    visualReviewPopulation: {
      population: 'normalized_submitted_attached_visual_status_observations';
      unit: 'submitted_intake_occurrence';
      coverage: 'submitted_intake_only';
      label: string;
      provesExecutionOrIdentityApproval: false;
    };
  };
};

export type CashAwareTradeTerms = {
  evidenceStrength: 'strong' | 'moderate' | 'weak' | 'unavailable';
  baseVerdict: string;
  termsStatus: 'not_provided' | 'within_overlap_band' | 'remaining_imbalance' | 'insufficient_evidence';
  cashAdjustment: AnalysisCashAdjustment | null;
  rawMidpointDifference: number | null;
  adjustedMidpointDifference: number | null;
  adjustedRangeOverlap: boolean | null;
  suggestedCashRange: {
    payer: 'item_a' | 'item_b';
    low: number;
    midpoint: number;
    high: number;
  } | null;
  summary: string;
  warnings: string[];
};

function evidenceStrength(profile: MarketProfile): ConfidenceLevel {
  if (!profile.marketRange.supported) return 'low';
  return profile.evidenceQuality;
}

function sourceReviewCounts(sales: MarketSale[]) {
  const counts = { match: 0, roughMatch: 0, mismatch: 0, unreadable: 0, notReviewed: 0 };
  for (const sale of sales) {
    switch (sale.visualReviewStatus) {
      case 'match': counts.match += 1; break;
      case 'rough_match': counts.roughMatch += 1; break;
      case 'mismatch': counts.mismatch += 1; break;
      case 'unreadable': counts.unreadable += 1; break;
      default: counts.notReviewed += 1;
    }
  }
  return counts;
}

/**
 * The snapshot is the server-side handoff used by the profile, prompt, and
 * result UI. It intentionally contains no raw provider credentials, no asking
 * prices treated as sales, and no persistence side effects.
 */
export function buildAnalysisSnapshot(input: {
  target: ComparableTarget;
  sales?: MarketSale[];
  aggregateMetrics?: { median?: number; min?: number; max?: number; count?: number; confidence?: ConfidenceLevel } | null;
  identityGate?: ComparableIdentityGate | null;
  evidenceSummary?: NormalizedEvidenceSummary | null;
  now?: Date;
  side?: ValuationUseSide;
  analysisRunId?: string;
  historicalPromptSales?: MarketSale[];
}, guideVerificationOptions?: { signingKey?: string }): AnalysisSnapshot {
  const sales = input.sales ?? [];
  const now = input.now ?? new Date();
  // Source labels and applicability claims are not acquisition provenance.
  // Verify first, then retain one branded guide without copying away its trust.
  const verifiedGuides = verifyGuideAnchors(input.evidenceSummary?.guideAnchors ?? [], input.target,
    { ...guideVerificationOptions, now });
  const valuationGuideAnchor = selectPreferredGuideAnchor(verifiedGuides.trustedAnchors);
  const profile = buildMarketProfile(
    input.target,
    sales,
    input.aggregateMetrics,
    now,
    input.identityGate,
    valuationGuideAnchor,
    { side: input.side, analysisRunId: input.analysisRunId, historicalPromptSales: input.historicalPromptSales },
  );
  profile.valuationWarnings.push(...verifiedGuides.warnings);
  const summary = input.evidenceSummary;
  const sourceStatuses = (summary?.sources ?? []).map((source) => ({
    id: source.id, label: source.label, kind: source.kind, role: source.role,
    status: source.status, message: source.message ?? null,
  }));
  if (typeof profile.primaryValue !== 'number' || !Number.isFinite(profile.primaryValue) || profile.primaryValue <= 0) {
    const count = (status: string) => sourceStatuses.filter((source) => source.status === status).length;
    const coverage = sourceStatuses.length
      ? `Reported source outcomes: ${count('error')} failed/unavailable; ${count('partial')} partial; ${count('idle')} not searched or not completed; ${count('not_found')} without a usable result or requiring unresolved review. These reported outcomes do not prove zero marketplace matches or that every source was searched.`
      : 'No source outcomes were included in this analysis; search coverage is unknown, not proof of zero marketplace matches.';
    profile.valuationBasisReason = `${profile.valuationBasisReason} ${coverage}`;
  }
  return {
    version: ANALYZER_SNAPSHOT_VERSION,
    generatedAt: now.toISOString(),
    item: { title: input.target.title, category: input.target.category },
    profile,
    finalUseReport: profile.finalUseReport!,
    evidence: {
      identityReadiness: summary?.identityReadiness.readiness ?? null,
      sourceStatuses,
      reviewFlags: [...(summary?.reviewFlags ?? []).map((flag) => flag.message), ...verifiedGuides.warnings],
      visualReview: sourceReviewCounts(sales),
      visualReviewPopulation: { population: 'normalized_submitted_attached_visual_status_observations',
        unit: 'submitted_intake_occurrence', coverage: 'submitted_intake_only',
        label: 'Legacy attached-row visual status diagnostics; not dispatch, model responses, verified identity or pricing use',
        provesExecutionOrIdentityApproval: false },
    },
  };
}

function rounded(value: number): number {
  return Math.max(0, Math.round(value));
}

function profileStrength(left: MarketProfile, right: MarketProfile): CashAwareTradeTerms['evidenceStrength'] {
  if (!hasDefensibleCurrentSaleValue(left) || !hasDefensibleCurrentSaleValue(right)) return 'unavailable';
  if (left.evidenceQuality === 'high' && right.evidenceQuality === 'high') return 'strong';
  if (left.evidenceQuality === 'low' || right.evidenceQuality === 'low') return 'weak';
  return 'moderate';
}

/**
 * Computes range overlap and optional cash balancing transparently. It never
 * claims that a cash amount is required, guaranteed, or a payment instruction.
 */
export function buildCashAwareTradeTerms(
  left: MarketProfile,
  right: MarketProfile,
  cashAdjustment?: AnalysisCashAdjustment | null,
): CashAwareTradeTerms {
  const comparison = deterministicTradeComparison(left, right);
  const strength = profileStrength(left, right);
  const cash = cashAdjustment && Number.isFinite(cashAdjustment.amount) && cashAdjustment.amount > 0
    ? { amount: Math.round(cashAdjustment.amount), paidBy: cashAdjustment.paidBy }
    : null;
  const warnings = [
    ...left.valuationWarnings,
    ...right.valuationWarnings,
  ];
  if (!hasDefensibleCurrentSaleValue(left) || !hasDefensibleCurrentSaleValue(right)
    || left.valuationBasis !== 'market_sales' || right.valuationBasis !== 'market_sales'
    || comparison.rangeRelationship === 'unsupported') {
    const missingSides = [
      typeof left.primaryValue !== 'number' || !Number.isFinite(left.primaryValue) || left.primaryValue <= 0 ? 'Item A' : null,
      typeof right.primaryValue !== 'number' || !Number.isFinite(right.primaryValue) || right.primaryValue <= 0 ? 'Item B' : null,
    ].filter((side): side is string => side !== null);
    const notice = missingSides.length ? `${missingSides.join(' and ')}: ${TEST_AI_VALUE_UNAVAILABLE_MESSAGE}. ` : '';
    return {
      evidenceStrength: 'unavailable',
      baseVerdict: comparison.verdict,
      termsStatus: 'insufficient_evidence',
      cashAdjustment: cash,
      rawMidpointDifference: null,
      adjustedMidpointDifference: null,
      adjustedRangeOverlap: null,
      suggestedCashRange: null,
      summary: `${notice}Cash guidance is withheld because one or both sides lack a defensible completed-sale range meeting the existing definitive category evidence requirements. Guide fallback and preliminary sale evidence do not authorize cash suggestions. Entered cash remains a proposed term without a fairness evaluation.`,
      warnings,
    };
  }

  const rawMidpointDifference = right.marketRange.mid - left.marketRange.mid;
  const leftCash = cash?.paidBy === 'item_a' ? cash.amount : 0;
  const rightCash = cash?.paidBy === 'item_b' ? cash.amount : 0;
  const leftLow = left.marketRange.low + leftCash;
  const leftHigh = left.marketRange.high + leftCash;
  const leftMid = left.marketRange.mid + leftCash;
  const rightLow = right.marketRange.low + rightCash;
  const rightHigh = right.marketRange.high + rightCash;
  const rightMid = right.marketRange.mid + rightCash;
  const adjustedMidpointDifference = rightMid - leftMid;
  const adjustedRangeOverlap = Math.max(leftLow, rightLow) <= Math.min(leftHigh, rightHigh);

  const payer: 'item_a' | 'item_b' = rawMidpointDifference >= 0 ? 'item_a' : 'item_b';
  const proposedLow = rawMidpointDifference >= 0
    ? rounded(right.marketRange.low - left.marketRange.high)
    : rounded(left.marketRange.low - right.marketRange.high);
  const proposedHigh = rawMidpointDifference >= 0
    ? rounded(right.marketRange.high - left.marketRange.low)
    : rounded(left.marketRange.high - right.marketRange.low);
  const suggestedCashRange = {
    payer,
    low: proposedLow,
    midpoint: rounded(Math.abs(rawMidpointDifference)),
    high: proposedHigh,
  };

  const termsStatus: CashAwareTradeTerms['termsStatus'] = cash
    ? (adjustedRangeOverlap ? 'within_overlap_band' : 'remaining_imbalance')
    : 'not_provided';
  const summary = cash
    ? adjustedRangeOverlap
      ? `The recorded cash adjustment places the two completed-sale ranges in an overlap band. This is a transparency aid, not a fairness guarantee.`
      : `The recorded cash adjustment does not create an overlap between the completed-sale ranges; the midpoint difference remains about $${Math.abs(adjustedMidpointDifference).toLocaleString()}.`
    : `No cash adjustment was entered. A range-based balancing reference would have ${payer === 'item_a' ? 'Item A' : 'Item B'} contribute about $${suggestedCashRange.low.toLocaleString()}–$${suggestedCashRange.high.toLocaleString()} (midpoint $${suggestedCashRange.midpoint.toLocaleString()}), subject to the evidence limits shown.`;

  return {
    evidenceStrength: strength,
    baseVerdict: comparison.verdict,
    termsStatus,
    cashAdjustment: cash,
    rawMidpointDifference,
    adjustedMidpointDifference,
    adjustedRangeOverlap,
    suggestedCashRange,
    summary,
    warnings,
  };
}
