import type { VisualExecution, VisualExecutionAttempt, VisualExecutionFailureCode } from './testAiVisualExecution';
import type { CandidateDisplayRow, CandidateDisplayScope } from './testAiCandidateLedger';
import { sanitizeVisualExecutionAttemptDiagnostics } from './testAiVisualFailure';

export type CandidateDisplayFact = { label: string; className: string; code: string; reason?: string };
const neutral = 'text-gray-300', amber = 'text-amber-300', red = 'text-red-300', green = 'text-emerald-300';
const executionReasons: Record<string, string> = {
  workflow_context_only: 'Workflow context only', universal_pre_visual_hold: 'Pre-image evidence hold',
  universal_duplicate_hold: 'Duplicate source hold', multi_item_hold: 'Multi-item hold',
  declared_identity_conflict: 'Deterministic identity conflict', selection_excluded: 'Below score / review cap',
  target_image_unavailable: 'Target image unavailable', candidate_image_unavailable: 'Candidate image unavailable',
  adaptive_window_limit: 'Adaptive review window stopped', adaptive_match_target: 'Match target reached',
  overall_deadline: 'Overall review deadline reached', selected_not_dispatched: 'Selected but not dispatched',
  outer_identity_filter: 'Outer identity filter hold', outer_metadata_hold: 'Outer metadata hold', outer_replica_hold: 'Outer replica hold',
  review_returned: 'Usable response returned', no_usable_decision: 'No usable decision returned',
  candidate_timeout: 'Candidate call timed out', provider_error: 'Provider failure', legacy_unknown: 'Execution provenance unavailable',
};
export const visualExecutionFailureLabels: Record<VisualExecutionFailureCode, string> = {
  empty_content: 'Empty response content', provider_refusal: 'Provider refusal recorded',
  response_truncated: 'Response truncated — output limit reached', invalid_json: 'Invalid JSON response',
  invalid_response_shape: 'JSON response is not an object', missing_reviews: 'Reviews field missing',
  invalid_reviews: 'Reviews field is not an array', empty_reviews: 'Reviews array empty',
  invalid_verdict: 'Invalid review verdict', invalid_confidence: 'Invalid review confidence',
  invalid_candidate_binding: 'Invalid dispatched candidate binding', missing_rationale: 'Review rationale missing or empty',
  provider_request_failed: 'Provider request failed', candidate_timeout: 'Candidate call timed out',
  reason_not_recorded: 'Failure reason not recorded',
};
function safeLabel(labels: Record<string, string>, value: unknown, fallback: string): string {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(labels, value) ? labels[value] : fallback;
}
/** No provider body, error message, image URL or arbitrary enum value is rendered. */
export function candidateAttemptFailureFact(attempt: VisualExecutionAttempt): CandidateDisplayFact {
  const diagnostic = sanitizeVisualExecutionAttemptDiagnostics(attempt);
  if (diagnostic.failureCode) return { label: visualExecutionFailureLabels[diagnostic.failureCode], code: diagnostic.failureCode, className: amber };
  return { label: attempt.failureCode === undefined ? 'Legacy detail not recorded' : 'Failure reason not recorded',
    code: attempt.failureCode === undefined ? 'legacy_detail_not_recorded' : 'reason_not_recorded', className: amber };
}
export function candidateExecutionAttemptFacts(row: CandidateDisplayRow) {
  return (candidateExecutionReceipt(row)?.attempts ?? []).map((attempt, index) => {
    const diagnostic = sanitizeVisualExecutionAttemptDiagnostics(attempt);
    const failed = ['no_decision', 'timed_out', 'error'].includes(attempt.outcome);
    const metadata = [
      diagnostic.finishReason && safeLabel({ stop: 'Finish: normal stop', length: 'Finish: output limit reached', content_filter: 'Finish: content filter',
        tool_calls: 'Finish: tool calls', function_call: 'Finish: function call', other: 'Finish: other recorded reason', not_recorded: 'Finish reason not recorded' }, diagnostic.finishReason, 'Finish reason not recorded'),
      diagnostic.refusal && safeLabel({ present: 'Provider refusal recorded', absent: 'No explicit refusal recorded', not_recorded: 'Refusal detail not recorded' }, diagnostic.refusal, 'Refusal detail not recorded'),
      diagnostic.candidateBinding && safeLabel({ bound_to_request: 'Bound to dispatched candidate', rebound_to_request: 'Model index rebound to dispatched candidate', not_recorded: 'Candidate binding detail not recorded' }, diagnostic.candidateBinding, 'Candidate binding detail not recorded'),
    ].filter((value): value is string => Boolean(value));
    return {
      ordinal: Number.isInteger(attempt.ordinal) && attempt.ordinal > 0 && attempt.ordinal <= 100 ? attempt.ordinal : index + 1,
      stage: safeLabel({ initial: 'Initial review', high_resolution_retry: 'High-resolution retry', disney_third_confirmation: 'Disney third confirmation' }, attempt.stage, 'Stage not recorded'),
      format: safeLabel({ json_schema: 'JSON schema', json_object: 'JSON object' }, attempt.format, 'Format not recorded'),
      outcome: safeLabel({ started: 'Started — terminal result not recorded', usable_review: 'Usable review returned', no_decision: 'No usable review returned', timed_out: 'Timed out', error: 'Attempt ended with error' }, attempt.outcome, 'Outcome not recorded'),
      failure: failed ? candidateAttemptFailureFact(attempt) : undefined,
      metadata,
    };
  });
}
export function candidateExecutionReceipt(row: CandidateDisplayRow): VisualExecution | undefined {
  const value = row.visualExecution;
  return value?.version === 1 && Array.isArray(value.attempts) ? value as VisualExecution : undefined;
}
/** A requirement, model name, audit shape or verdict is NOT an invocation receipt. */
export function hasActualVisualDispatch(row: CandidateDisplayRow): boolean {
  return Boolean(candidateExecutionReceipt(row)?.attempts.some((attempt) => attempt.stage === 'initial'));
}
export function hasActualVisualResponse(row: CandidateDisplayRow): boolean {
  return hasActualVisualDispatch(row) && Boolean(candidateExecutionReceipt(row)?.attempts.some((attempt) => attempt.outcome === 'usable_review'));
}
export function isHardCandidateDisplayException(row: CandidateDisplayRow): boolean {
  if (row.valuationUse) return row.valuationUse.use?.code === 'FINAL_HARD_EXCLUDED'
    && row.valuationUse.sourceAdmission?.verification === 'verified';
  return candidateExecutionReceipt(row)?.hardExclusion === true || row.evidenceDisposition === 'rejected_objective_conflict';
}
export function candidateExecutionFact(row: CandidateDisplayRow, scope: CandidateDisplayScope = {}): CandidateDisplayFact {
  const receipt = candidateExecutionReceipt(row);
  if (!receipt || receipt.state === 'unknown') return { label: 'Legacy / unknown', code: 'legacy_unknown', className: neutral };
  const reason = safeLabel(executionReasons, receipt.reasonCode, 'Execution reason not recorded');
  const code = Object.prototype.hasOwnProperty.call(executionReasons, receipt.reasonCode) ? receipt.reasonCode : 'legacy_unknown';
  if (!hasActualVisualDispatch(row)) {
    if (receipt.selectedForReview || receipt.state === 'selected_pending') return {
      label: scope.activeRequest ? 'Selected — active request' : 'Not reviewed — selected but not dispatched',
      code, className: amber, reason,
    };
    return { label: receipt.hardExclusion ? 'Not dispatched — hard exclusion' : 'Not dispatched', code, className: receipt.hardExclusion ? red : amber, reason };
  }
  const last = receipt.attempts[receipt.attempts.length - 1];
  const hasResponse = hasActualVisualResponse(row);
  const failure = last && ['no_decision', 'timed_out', 'error'].includes(last.outcome) ? candidateAttemptFailureFact(last) : undefined;
  const retryFailed = hasResponse && last?.stage !== 'initial' && Boolean(failure);
  if (retryFailed) return { label: `Response retained; retry ${last.outcome === 'timed_out' ? 'timed out' : 'failed'}`, code, className: amber, reason: failure?.label };
  if (hasResponse) return { label: receipt.attempts.some((attempt) => attempt.outcome === 'timed_out') ? 'Completed response — recovered timeout'
    : receipt.attempts.some((attempt) => ['no_decision', 'error'].includes(attempt.outcome)) ? 'Completed response — recovered failed attempt' : 'Completed response', code, className: green, reason };
  if (receipt.state === 'timed_out' || last?.outcome === 'timed_out') return { label: 'Timed out — no usable response', code, className: amber, reason: failure?.label ?? reason };
  const knownFailure = last && sanitizeVisualExecutionAttemptDiagnostics(last).failureCode;
  if (failure && knownFailure && knownFailure !== 'reason_not_recorded') return { label: `Dispatched — ${failure.label}`, code, className: amber, reason: 'No usable response returned' };
  if (receipt.reasonCode === 'provider_error' || last?.outcome === 'error') return { label: 'Provider failure — dispatched', code, className: amber, reason: failure?.label ?? reason };
  return { label: scope.activeRequest && last?.outcome === 'started' ? 'Dispatched — active request' : 'Dispatched — no usable response', code, className: amber, reason: failure?.label ?? reason };
}
export function candidateIdentityFact(row: CandidateDisplayRow): CandidateDisplayFact {
  const receipt = candidateExecutionReceipt(row);
  const identity = receipt?.identity;
  let fact: CandidateDisplayFact = { label: receipt ? 'Not image reviewed' : 'Unknown / legacy image execution', code: 'not_image_reviewed', className: neutral };
  if (identity?.origin === 'deterministic' && identity.result === 'mismatch') fact = { label: 'Deterministic metadata conflict', code: 'deterministic_conflict', className: red };
  else if (identity?.origin === 'visual') {
    const verdict = identity.reviewVerdict;
    if (verdict === 'rough_match') fact = { label: 'Rough / unconfirmed match', code: 'rough_match', className: amber };
    else if (verdict === 'unreadable') fact = { label: 'Unreadable / unconfirmed', code: 'unreadable', className: amber };
    else if (identity.result === 'match') fact = { label: 'Image match', code: 'match', className: green };
    else if (identity.result === 'mismatch') fact = { label: 'Image mismatch', code: 'mismatch', className: red };
    else fact = { label: 'Image identity unconfirmed', code: 'manual_unknown', className: amber };
  }
  const finalIdentity = row.valuationUse?.identityAdmission;
  if (row.valuationUse?.use?.code === 'HISTORIC_MARKET_CONTEXT' && finalIdentity?.accepted === true) return {
    label: 'Final identity match — historic market context', code: 'final_historic_identity_match', className: green,
  };
  if (finalIdentity?.serverFinalApprovalVerified === true) return { ...fact,
    label: `${fact.label} · final server identity approved`, code: 'server_final_visual', className: green };
  if (finalIdentity?.accepted === true && finalIdentity.basis === 'title_evidence') return { ...fact,
    label: `${fact.label} · final title identity admitted`, code: 'title_evidence' };
  return fact;
}
export const finalPricingUseLabels: Record<string, string> = {
  CURRENT_SALES_PRIMARY: 'Used to support primary sales valuation',
  CURRENT_SALES_DIAGNOSTIC_ONLY: 'Current-sales diagnostics only',
  HISTORIC_MARKET_CONTEXT: 'Historic market context',
  HISTORICAL_DIAGNOSTIC_ONLY: 'Historical diagnostics only', SOURCE_ELIGIBLE_NOT_SELECTED: 'Source eligible — not selected',
  OMITTED_BY_CAP: 'Matched but omitted by cap', EXACT_DUPLICATE: 'Exact duplicate excluded', PROBABLE_DUPLICATE: 'Probable duplicate excluded',
  OUTLIER_EXCLUDED: 'Outlier excluded', SECONDARY_ONLY: 'Secondary evidence only', REVIEW_REQUIRED: 'Submitted — held for verification / review',
  CONTEXT_ONLY: 'Context only', FINAL_HARD_EXCLUDED: 'Final hard exclusion', UNSUPPORTED_CURRENCY: 'Unsupported currency — context only',
  NOT_SUBMITTED_NOT_ASSESSED: 'Not submitted / not assessed',
};
export const economicPricingReasonLabels: Record<string, string> = {
  TRANSACTION_IDENTITY_MISSING: 'Observed transaction ID or listing URL is unavailable',
  TRANSACTION_LOT_CONFLICT: 'Transaction price covers a lot/bundle, not the single target product',
  AUCTION_AMOUNT_UNRESOLVED: 'Auction amount has no compatible confirmed buyer-premium convention',
  HIGH_VALUE_PRICE_TOO_LOW: 'Sale price is below the approved high-value owner-reference safety range',
  HIGH_VALUE_PRICE_TOO_HIGH: 'Sale price is above the approved high-value owner-reference safety range',
};
export function candidatePricingFact(row: CandidateDisplayRow): CandidateDisplayFact {
  const use = row.valuationUse?.use;
  if (use?.code === 'HISTORIC_MARKET_CONTEXT') return {
    label: finalPricingUseLabels.HISTORIC_MARKET_CONTEXT, code: use.code, className: 'text-sky-300',
    reason: 'A matching completed sale over one year ago; context only, not today’s value.',
  };
  if (use?.code) return { label: finalPricingUseLabels[use.code] ?? `Final use: ${use.code}`, code: use.code,
    className: use.code === 'CURRENT_SALES_PRIMARY' ? green : use.code === 'FINAL_HARD_EXCLUDED' ? red : amber,
    reason: (use.reasonCodes ?? []).map((code: string) => economicPricingReasonLabels[code] ?? code).join(' · ') || undefined };
  const link = row.candidatePricingLink;
  if (link === 'not_submitted') return { label: finalPricingUseLabels.NOT_SUBMITTED_NOT_ASSESSED, code: 'NOT_SUBMITTED_NOT_ASSESSED', className: neutral };
  if (link === 'unresolved' || link === 'submitted_unresolved') return { label: link === 'submitted_unresolved' ? 'Submitted — unresolved final audit link' : 'Unresolved final audit link', code: 'UNRESOLVED_AUDIT_LINK', className: amber };
  if (row.evidenceDisposition === 'valuation_eligible') return { label: 'Source eligible — final analysis not run', code: 'SOURCE_ELIGIBLE_BEFORE_ANALYSIS', className: neutral };
  return { label: 'Source context / review — final analysis not run', code: 'SOURCE_CONTEXT_BEFORE_ANALYSIS', className: neutral };
}
/** Report-only date from the reconciled final decision; never infer historic membership from a source date. */
export function candidateHistoricSaleDate(row: CandidateDisplayRow): string | null {
  if (row.valuationUse?.use?.code !== 'HISTORIC_MARKET_CONTEXT') return null;
  const value = row.valuationUse.use.historicSaleDate;
  if (typeof value !== 'string' || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null;
}
/** Final normalized economics only; no asking-price or provider-value fallback. */
export function candidateHistoricPrice(row: CandidateDisplayRow): number | null {
  const use = row.valuationUse?.use;
  if (use?.code !== 'HISTORIC_MARKET_CONTEXT' || use.historicCurrency !== 'USD') return null;
  return typeof use.historicPrice === 'number' && Number.isFinite(use.historicPrice) && use.historicPrice > 0
    ? use.historicPrice : null;
}
export function formatCandidateDisplayPrice(row: CandidateDisplayRow): string {
  if (row.valuationUse?.use?.code === 'HISTORIC_MARKET_CONTEXT') {
    const historicPrice = candidateHistoricPrice(row);
    return historicPrice === null ? 'Price unavailable' : `USD ${historicPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  const raw = row.price ?? row.soldPrice ?? row.salePrice ?? row.finalPrice ?? row.currentPrice ?? row.current_price;
  const amount = Number(typeof raw === 'object' ? raw?.value : raw);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price unavailable';
  const currency = String(row.currency ?? row.soldCurrency ?? (typeof raw === 'object' ? raw?.currency : null) ?? '').trim().toUpperCase();
  return `${currency || 'Currency unknown'} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
