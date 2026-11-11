import type { MetadataRankingBinding } from './testAiRankingPopulation';
import type { VisualExecution, VisualExecutionAttempt, VisualExecutionReasonCode } from './testAiVisualExecution';
import { sanitizeVisualExecutionAttemptDiagnostics } from './testAiVisualFailure';

/** Reporting only. None of these fields is a signing, identity or pricing input. */
export const FINAL_VALUATION_USE_VERSION = 'stage5-final-use-v1' as const;
export type ValuationUseSide = 'item_a' | 'item_b';
export type ValuationUseOptions = {
  side?: ValuationUseSide;
  analysisRunId?: string;
  /** Actual normalized objects selected by the existing historical formatter. */
  historicalPromptSales?: object[];
};
export type NormalizationBlockerCode =
  | 'PROVENANCE_UNVERIFIED' | 'SOURCE_DISPOSITION_RESTRICTIVE' | 'INVALID_PRICE'
  | 'UNKNOWN_CURRENCY' | 'UNSUPPORTED_CURRENCY' | 'NOT_COMPLETED' | 'UNKNOWN_PRICE_BASIS'
  | 'PREMIUM_NOT_INCLUDED' | 'INVALID_DATE' | 'HISTORICAL_DATE' | 'VISUAL_MISMATCH'
  | 'REQUIRED_APPROVAL_MISSING' | 'APPROVED_LOT_CONFLICT'
  | 'TRANSACTION_IDENTITY_MISSING' | 'TRANSACTION_LOT_CONFLICT' | 'AUCTION_AMOUNT_UNRESOLVED'
  | 'HIGH_VALUE_PRICE_TOO_LOW' | 'HIGH_VALUE_PRICE_TOO_HIGH';
export type FinalSourceCorrelation = {
  /** Supplied Stage 4 source/run/occurrence hints, explicitly display-only. */
  metadataRanking: MetadataRankingBinding | null;
  metadataOriginOccurrenceKey: string | null;
};
export type FinalDisplayCorrelation = {
  version: 'stage5-display-v1'; side: ValuationUseSide; sourceId: string; runId: string;
  occurrenceKey: string; requestOccurrenceRef: string;
  observationId?: string | null; canonicalTransactionId?: string | null;
};
export type FinalAuditRef = {
  side: ValuationUseSide | null;
  analysisRunId: string;
  intakeOrdinal: number;
  intakeRef: string;
  sourceCorrelation: FinalSourceCorrelation;
  displayCorrelation: FinalDisplayCorrelation | null;
  verifiedObservationId: string | null;
  verifiedCanonicalTransactionId: string | null;
};
export type FinalSourceAdmission = {
  reportedDisposition: string | null;
  reportedVisualReviewStatus: string | null;
  verifiedSourceId: string | null;
  verifiedSourceDisposition: string | null;
  verification: 'verified' | 'unverified' | 'unmeasured';
  normalizationEligible: boolean | null;
  blockerCodes: NormalizationBlockerCode[];
  /** Bounded server normalization explanations; reporting only, not admission input. */
  reasonDetails?: string[];
  warningCodes: string[];
};
export type FinalIntakeReport = {
  version: typeof FINAL_VALUATION_USE_VERSION;
  auditRef: FinalAuditRef;
  sourceAdmission: FinalSourceAdmission;
};
export type FinalCategoryIdentity = {
  category: string;
  status: 'direct_confirmed' | 'needs_review' | 'objective_conflict' | 'not_applicable';
  confirmedFields: string[];
  unconfirmedFields: string[];
  conflicts: string[];
};
export type FinalIdentityAdmission = {
  accepted: boolean;
  classification: 'exact' | 'near' | 'contextual' | 'rejected';
  score: number;
  identityRelationship: string;
  valuationRelationship: string;
  categoryIdentity: FinalCategoryIdentity;
  titleCategoryIdentity: FinalCategoryIdentity;
  serverFinalApprovalVerified: boolean;
  basis: 'server_final_visual' | 'title_evidence' | 'not_admitted';
  visualReviewStatus: string;
  blockerCodes: string[];
};
export type TerminalValuationUseCode =
  | 'CURRENT_SALES_PRIMARY' | 'CURRENT_SALES_DIAGNOSTIC_ONLY' | 'HISTORICAL_DIAGNOSTIC_ONLY'
  | 'SOURCE_ELIGIBLE_NOT_SELECTED' | 'OMITTED_BY_CAP' | 'EXACT_DUPLICATE' | 'PROBABLE_DUPLICATE'
  | 'OUTLIER_EXCLUDED' | 'SECONDARY_ONLY' | 'REVIEW_REQUIRED' | 'CONTEXT_ONLY'
  | 'FINAL_HARD_EXCLUDED' | 'UNSUPPORTED_CURRENCY';
export type FinalValuationUse = FinalIntakeReport & {
  identityAdmission: FinalIdentityAdmission;
  selection: 'selected_pre_outlier' | 'omitted_by_cap' | 'not_selected';
  use: {
    code: TerminalValuationUseCode;
    reasonCodes: string[];
    postPolicySaleDiagnostics: boolean;
    currentSaleMedianDiagnostics: boolean;
    primaryMarketSales: boolean;
    historicalPromptIncluded: boolean | null;
    possibleDuplicateWarning: boolean;
    smallSampleOutlierWarning: boolean;
  };
};
export type FinalUsePopulation = {
  population: string;
  label: string;
  unit: 'submitted_intake_occurrence';
  count: number | null;
  memberRefs: string[];
  coverage: 'submitted_intake_only' | 'unmeasured';
  currency: 'USD' | null;
  priceRole: string | null;
};
export type FinalUsePriceGroup = {
  population: string;
  priceRole: string;
  currency: string | null;
  priceBasis: string | null;
  buyerPremium: string | null;
  shipping: string | null;
  tax: string | null;
  semantics: 'as_reported_no_fx_or_fee_recomputation';
  count: number;
  memberRefs: string[];
  prices: Array<number | null>;
};
export type FinalUseReport = {
  version: typeof FINAL_VALUATION_USE_VERSION;
  side: ValuationUseSide | null;
  analysisRunId: string;
  coverage: {
    population: 'actual_submitted_final_intake';
    unit: 'submitted_intake_occurrence';
    availableSourceIngress: 'unmeasured';
    retrievedObservations: 'unmeasured';
    notAllRetrievedReachIntake: true;
    ledgerOnlyFallbackCount: number;
  };
  valuationBasis: 'market_sales' | 'guide_fallback' | 'insufficient_evidence';
  primaryPricingReasonCodes: string[];
  populations: FinalUsePopulation[];
  sources: Array<{
    sourceId: string | null;
    diagnosticSourceId: string | null;
    sourceRunId: string | null;
    populations: FinalUsePopulation[];
  }>;
  priceGroups: FinalUsePriceGroup[];
};

function text(value: unknown, maximum: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maximum) : null;
}
/** Schema-limited source execution receipt. It remains untrusted display data. */
export function boundedDiagnosticVisualExecution(input: unknown): VisualExecution | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const row = input as Record<string, unknown>;
  const reasons: VisualExecutionReasonCode[] = ['workflow_context_only', 'universal_pre_visual_hold', 'universal_duplicate_hold',
    'multi_item_hold', 'declared_identity_conflict', 'selection_excluded', 'outer_identity_filter', 'outer_metadata_hold', 'outer_replica_hold',
    'target_image_unavailable', 'candidate_image_unavailable', 'adaptive_window_limit', 'adaptive_match_target', 'overall_deadline',
    'selected_not_dispatched', 'review_returned', 'no_usable_decision', 'candidate_timeout', 'provider_error', 'legacy_unknown'];
  const state = row.state as VisualExecution['state'];
  if (row.version !== 1 || !['not_dispatched', 'selected_pending', 'completed', 'dispatched_inconclusive', 'timed_out', 'unknown'].includes(state)
    || !reasons.includes(row.reasonCode as VisualExecutionReasonCode) || !Array.isArray(row.attempts)) return undefined;
  const identity = row.identity && typeof row.identity === 'object' && !Array.isArray(row.identity) ? row.identity as Record<string, unknown> : {};
  const result = identity.result as VisualExecution['identity']['result'];
  const origin = identity.origin as VisualExecution['identity']['origin'];
  if (!['match', 'mismatch', 'manual_unknown', 'not_established'].includes(result) || !['visual', 'deterministic', 'none', 'unknown'].includes(origin)) return undefined;
  const attempts: VisualExecutionAttempt[] = [];
  for (const value of row.attempts.slice(0, 12)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const attempt = value as Record<string, unknown>;
    const stage = attempt.stage as VisualExecutionAttempt['stage'];
    const format = attempt.format as VisualExecutionAttempt['format'];
    const outcome = attempt.outcome as VisualExecutionAttempt['outcome'];
    if (typeof attempt.ordinal !== 'number' || !Number.isInteger(attempt.ordinal) || attempt.ordinal < 1
      || !['initial', 'high_resolution_retry', 'disney_third_confirmation'].includes(stage)
      || !['json_schema', 'json_object'].includes(format) || !['started', 'usable_review', 'no_decision', 'timed_out', 'error'].includes(outcome)) continue;
    attempts.push({ ordinal: attempt.ordinal, stage, format, outcome,
      ...(attempt.errorCode === 'candidate_timeout' || attempt.errorCode === 'provider_error' ? { errorCode: attempt.errorCode } : {}),
      ...sanitizeVisualExecutionAttemptDiagnostics(attempt) });
  }
  const reviewVerdict = identity.reviewVerdict as VisualExecution['identity']['reviewVerdict'];
  return { version: 1, state, reasonCode: row.reasonCode as VisualExecutionReasonCode,
    selectedForReview: row.selectedForReview === true, hardExclusion: row.hardExclusion === true,
    identity: { result, origin, ...(['match', 'rough_match', 'mismatch', 'unreadable'].includes(reviewVerdict ?? '') ? { reviewVerdict } : {}) }, attempts };
}
export function boundedFinalDisplayCorrelation(input: unknown): FinalDisplayCorrelation | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const required = [['sourceId', 120], ['runId', 240], ['occurrenceKey', 1000], ['requestOccurrenceRef', 240]] as const;
  if (value.version !== 'stage5-display-v1' || (value.side !== 'item_a' && value.side !== 'item_b')
    || required.some(([key, limit]) => typeof value[key] !== 'string' || !(value[key] as string).trim() || (value[key] as string).length > limit)) return null;
  return { version: 'stage5-display-v1', side: value.side,
    sourceId: value.sourceId as string, runId: value.runId as string, occurrenceKey: value.occurrenceKey as string,
    requestOccurrenceRef: value.requestOccurrenceRef as string,
    observationId: text(value.observationId, 240), canonicalTransactionId: text(value.canonicalTransactionId, 1000) };
}
export function boundedFinalSourceCorrelation(input: {
  metadataRanking?: unknown; metadataOriginOccurrenceKey?: unknown;
}): FinalSourceCorrelation {
  const value = input.metadataRanking && typeof input.metadataRanking === 'object' && !Array.isArray(input.metadataRanking)
    ? input.metadataRanking as Record<string, unknown> : {};
  const populationId = text(value.populationId, 240);
  const sourceId = text(value.sourceId, 160);
  const occurrenceKey = text(value.occurrenceKey, 1_500);
  const ordinal = value.ordinal;
  const populationSize = value.populationSize;
  const role = value.scorerRole;
  const scorerRole = role === 'exact_comparable' || role === 'original_art_relevance' || role === 'signed_item_relevance' || role === 'unranked' ? role : null;
  const metadataRanking: MetadataRankingBinding | null = populationId && sourceId && occurrenceKey
    && typeof ordinal === 'number' && Number.isInteger(ordinal) && ordinal >= 0
    && typeof populationSize === 'number' && Number.isInteger(populationSize) && populationSize > ordinal
    && scorerRole ? {
      populationId, sourceId, occurrenceKey, ordinal, populationSize, scorerRole,
      score: typeof value.score === 'number' && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100 ? value.score : null,
      rank: typeof value.rank === 'number' && Number.isInteger(value.rank) && value.rank > 0 ? value.rank : null,
    } : null;
  return { metadataRanking, metadataOriginOccurrenceKey: text(input.metadataOriginOccurrenceKey, 1_500) };
}

/** Independent server intake identity, never a recovered provider transaction. */
export function makeFinalAuditRef(input: {
  side?: ValuationUseSide; analysisRunId: string; intakeOrdinal: number;
  sourceCorrelation: FinalSourceCorrelation;
  displayCorrelation?: FinalDisplayCorrelation | null;
  verifiedObservationId?: string | null; verifiedCanonicalTransactionId?: string | null;
}): FinalAuditRef {
  const side = input.side ?? null;
  const analysisRunId = text(input.analysisRunId, 240) ?? 'unscoped';
  return { side, analysisRunId, intakeOrdinal: input.intakeOrdinal,
    intakeRef: `final:${encodeURIComponent(analysisRunId)}:${side ?? 'unscoped'}:occ:${input.intakeOrdinal}`,
    sourceCorrelation: input.sourceCorrelation,
    displayCorrelation: input.displayCorrelation ?? null,
    verifiedObservationId: input.verifiedObservationId ?? null,
    verifiedCanonicalTransactionId: input.verifiedCanonicalTransactionId ?? null };
}

// Diagnostic receipts are exact-object server observations, not inbound JSON.
// This WeakMap is entirely separate from the canonical approval WeakMap.
const normalizationReceipts = new WeakMap<object, FinalIntakeReport>();
export function retainServerNormalizationReport(sale: object, report: FinalIntakeReport): void {
  const receipt = JSON.parse(JSON.stringify(report)) as FinalIntakeReport;
  freezeReport(receipt);
  normalizationReceipts.set(sale, receipt);
}
export function readServerNormalizationReport(sale: object): FinalIntakeReport | undefined {
  return normalizationReceipts.get(sale);
}
function freezeReport(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const nested of Object.values(value)) freezeReport(nested);
}

export function finalUsePopulation(population: string, label: string, rows: FinalValuationUse[] | null,
  currency: 'USD' | null = null, priceRole: string | null = null): FinalUsePopulation {
  return { population, label, unit: 'submitted_intake_occurrence', count: rows?.length ?? null,
    memberRefs: rows?.map((row) => row.auditRef.intakeRef) ?? [],
    coverage: rows === null ? 'unmeasured' : 'submitted_intake_only', currency, priceRole };
}
