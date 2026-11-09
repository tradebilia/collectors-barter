import type { VisualExecution } from './testAiVisualExecution';
import type { CandidateDisplayRow, CandidateDisplayScope } from './testAiCandidateLedger';

export type CandidateDisplayFact = { label: string; className: string; code: string; reason?: string };
const neutral = 'text-gray-300', amber = 'text-amber-300', red = 'text-red-300', green = 'text-emerald-300';
const executionReasons: Record<string, string> = {
  workflow_context_only: 'Workflow context only', universal_pre_visual_hold: 'Pre-image evidence hold',
  universal_duplicate_hold: 'Duplicate source hold', multi_item_hold: 'Multi-item hold',
  declared_identity_conflict: 'Deterministic identity conflict', selection_excluded: 'Below score / review cap',
  target_image_unavailable: 'Target image unavailable', candidate_image_unavailable: 'Candidate image unavailable',
  adaptive_window_limit: 'Adaptive review window stopped', adaptive_match_target: 'Match target reached',
  overall_deadline: 'Overall review deadline reached', selected_not_dispatched: 'Selected but not dispatched',
  review_returned: 'Usable response returned', no_usable_decision: 'No usable decision returned',
  candidate_timeout: 'Candidate call timed out', provider_error: 'Provider failure', legacy_unknown: 'Execution provenance unavailable',
};
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
  const reason = executionReasons[receipt.reasonCode] ?? receipt.reasonCode;
  if (!hasActualVisualDispatch(row)) {
    if (receipt.selectedForReview || receipt.state === 'selected_pending') return {
      label: scope.activeRequest ? 'Selected — active request' : 'Not reviewed — selected but not dispatched',
      code: receipt.reasonCode, className: amber, reason,
    };
    return { label: receipt.hardExclusion ? 'Not dispatched — hard exclusion' : 'Not dispatched', code: receipt.reasonCode, className: receipt.hardExclusion ? red : amber, reason };
  }
  const last = receipt.attempts[receipt.attempts.length - 1];
  const hasResponse = hasActualVisualResponse(row);
  const retryFailed = hasResponse && last?.stage !== 'initial' && ['timed_out', 'error'].includes(last?.outcome);
  if (retryFailed) return { label: `Response retained; retry ${last.outcome === 'timed_out' ? 'timed out' : 'failed'}`, code: receipt.reasonCode, className: amber, reason };
  if (hasResponse) return { label: receipt.attempts.some((attempt) => attempt.outcome === 'timed_out') ? 'Completed response — recovered timeout' : 'Completed response', code: receipt.reasonCode, className: green, reason };
  if (receipt.state === 'timed_out') return { label: 'Timed out — no usable response', code: receipt.reasonCode, className: amber, reason };
  if (receipt.reasonCode === 'provider_error' || last?.outcome === 'error') return { label: 'Provider failure — dispatched', code: receipt.reasonCode, className: amber, reason };
  return { label: scope.activeRequest && last?.outcome === 'started' ? 'Dispatched — active request' : 'Dispatched — no usable response', code: receipt.reasonCode, className: amber, reason };
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
  if (finalIdentity?.serverFinalApprovalVerified === true) return { ...fact,
    label: `${fact.label} · final server identity approved`, code: 'server_final_visual', className: green };
  if (finalIdentity?.accepted === true && finalIdentity.basis === 'title_evidence') return { ...fact,
    label: `${fact.label} · final title identity admitted`, code: 'title_evidence' };
  return fact;
}
export const finalPricingUseLabels: Record<string, string> = {
  CURRENT_SALES_PRIMARY: 'Used to support primary sales valuation',
  CURRENT_SALES_DIAGNOSTIC_ONLY: 'Current-sales diagnostics only',
  HISTORICAL_DIAGNOSTIC_ONLY: 'Historical diagnostics only', SOURCE_ELIGIBLE_NOT_SELECTED: 'Source eligible — not selected',
  OMITTED_BY_CAP: 'Matched but omitted by cap', EXACT_DUPLICATE: 'Exact duplicate excluded', PROBABLE_DUPLICATE: 'Probable duplicate excluded',
  OUTLIER_EXCLUDED: 'Outlier excluded', SECONDARY_ONLY: 'Secondary evidence only', REVIEW_REQUIRED: 'Submitted — held for verification / review',
  CONTEXT_ONLY: 'Context only', FINAL_HARD_EXCLUDED: 'Final hard exclusion', UNSUPPORTED_CURRENCY: 'Unsupported currency — context only',
  NOT_SUBMITTED_NOT_ASSESSED: 'Not submitted / not assessed',
};
export function candidatePricingFact(row: CandidateDisplayRow): CandidateDisplayFact {
  const use = row.valuationUse?.use;
  if (use?.code) return { label: finalPricingUseLabels[use.code] ?? `Final use: ${use.code}`, code: use.code,
    className: use.code === 'CURRENT_SALES_PRIMARY' ? green : use.code === 'FINAL_HARD_EXCLUDED' ? red : amber,
    reason: (use.reasonCodes ?? []).join(' · ') || undefined };
  const link = row.candidatePricingLink;
  if (link === 'not_submitted') return { label: finalPricingUseLabels.NOT_SUBMITTED_NOT_ASSESSED, code: 'NOT_SUBMITTED_NOT_ASSESSED', className: neutral };
  if (link === 'unresolved' || link === 'submitted_unresolved') return { label: link === 'submitted_unresolved' ? 'Submitted — unresolved final audit link' : 'Unresolved final audit link', code: 'UNRESOLVED_AUDIT_LINK', className: amber };
  if (row.evidenceDisposition === 'valuation_eligible') return { label: 'Source eligible — final analysis not run', code: 'SOURCE_ELIGIBLE_BEFORE_ANALYSIS', className: neutral };
  return { label: 'Source context / review — final analysis not run', code: 'SOURCE_CONTEXT_BEFORE_ANALYSIS', className: neutral };
}
export function formatCandidateDisplayPrice(row: CandidateDisplayRow): string {
  const raw = row.price ?? row.soldPrice ?? row.salePrice ?? row.finalPrice ?? row.currentPrice ?? row.current_price;
  const amount = Number(typeof raw === 'object' ? raw?.value : raw);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price unavailable';
  const currency = String(row.currency ?? row.soldCurrency ?? (typeof raw === 'object' ? raw?.currency : null) ?? '').trim().toUpperCase();
  return `${currency || 'Currency unknown'} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
