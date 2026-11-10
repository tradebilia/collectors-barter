import type { CandidateDisplayRow } from '../../../../shared/testAiCandidateLedger';
import { candidateExecutionFact, candidateExecutionReceipt, candidateIdentityFact, candidatePricingFact, hasActualVisualDispatch, hasActualVisualResponse, isHardCandidateDisplayException } from '../../../../shared/testAiCandidateStatus';
import { hasMercariUndatedSoldAdmission, mercariPriceContextLabel } from '../../../../shared/testAiMercariTransport';

export type CandidateFinalDecision = { label: string; reason: string; code: string; className: string };
const neutral = 'border-slate-600/60 bg-slate-900/60 text-slate-200';
const amber = 'border-amber-600/50 bg-amber-950/30 text-amber-200';
const red = 'border-red-600/50 bg-red-950/30 text-red-200';
const green = 'border-emerald-600/50 bg-emerald-950/30 text-emerald-200';
const finalLabels: Record<string, string> = {
  CURRENT_SALES_DIAGNOSTIC_ONLY: 'NOT USED — SALES DIAGNOSTICS ONLY',
  HISTORICAL_DIAGNOSTIC_ONLY: 'NOT USED — HISTORICAL DIAGNOSTICS ONLY',
  SOURCE_ELIGIBLE_NOT_SELECTED: 'NOT USED — NOT SELECTED',
  OMITTED_BY_CAP: 'NOT USED — OMITTED BY CAP', EXACT_DUPLICATE: 'NOT USED — EXACT DUPLICATE',
  PROBABLE_DUPLICATE: 'NOT USED — PROBABLE DUPLICATE', OUTLIER_EXCLUDED: 'NOT USED — OUTLIER',
  SECONDARY_ONLY: 'NOT USED — SECONDARY EVIDENCE', REVIEW_REQUIRED: 'NOT USED — REVIEW REQUIRED',
  CONTEXT_ONLY: 'NOT USED — CONTEXT ONLY', FINAL_HARD_EXCLUDED: 'NOT USED — HARD EXCLUSION',
  UNSUPPORTED_CURRENCY: 'NOT USED — UNSUPPORTED CURRENCY', NOT_SUBMITTED_NOT_ASSESSED: 'NOT USED — NOT ASSESSED',
};
function evidenceReasons(row: CandidateDisplayRow): string {
  return Array.isArray(row.evidenceReasons) ? row.evidenceReasons.filter((reason: unknown) => typeof reason === 'string' && reason.trim()).join('; ') : '';
}
function explicitContextReason(row: CandidateDisplayRow): string | undefined {
  if (hasMercariUndatedSoldAdmission(row)) return undefined;
  if (row.sourceId === 'mercari_sold_comps' && row.requestedMode !== 'active' && row.mercariObservation?.requestedMode !== 'active'
    && (row.requestedMode === 'sold' || row.mercariObservation?.requestedMode === 'sold')) {
    return 'Sold-mode Mercari listing; the final transaction amount and sale-event date are unverified, so the reported price remains context only.';
  }
  if (row.requestedMode === 'active' || row.mercariObservation?.requestedMode === 'active'
    || row.saleStatus === 'active' || row.sourceEconomics?.convention === 'active_ask'
    || row.mercariObservation?.priceContext === 'active_asking' || row.priceBasis === 'asking'
    || row.sourceRelevance?.role === 'asking_price_context' || row.sourceRole === 'asking_price_context') {
    return 'Active asking-price context only; this is not a confirmed completed sale.';
  }
  if (row.sourceEconomics?.finalContextOnly === true) return 'Recorded source economics restrict this amount to context only.';
  if (['reference_context', 'catalog_context'].includes(row.sourceRelevance?.role ?? row.sourceRole)) {
    return 'Recorded source role is reference context, not primary completed-sale evidence.';
  }
  return undefined;
}
/** Presentation only. Call after the existing current-request ledger reconciliation. */
export function candidateFinalDecision(row: CandidateDisplayRow): CandidateFinalDecision {
  const pricing = candidatePricingFact(row);
  const execution = candidateExecutionFact(row); // Never invent an active worker from a missing receipt.
  const identity = candidateIdentityFact(row);
  const receipt = candidateExecutionReceipt(row);
  const evidence = evidenceReasons(row);
  const contextReason = explicitContextReason(row);
  if (row.valuationUse?.use?.code) {
    const primary = pricing.code === 'CURRENT_SALES_PRIMARY';
    const hard = pricing.code === 'FINAL_HARD_EXCLUDED';
    const details = [pricing.reason, hard ? evidence || (receipt?.hardExclusion ? execution.reason : undefined) : undefined,
      pricing.code === 'CONTEXT_ONLY' ? contextReason : undefined,
      hasMercariUndatedSoldAdmission(row) ? mercariPriceContextLabel(row) : undefined].filter(Boolean).join(' · ');
    return { label: primary ? 'USED IN VALUATION' : finalLabels[pricing.code] ?? 'NOT USED — FINAL DECISION RECORDED',
      reason: `${pricing.label}${details ? ` · ${details}` : ''}`, code: pricing.code,
      className: primary ? green : hard ? red : amber };
  }
  if (isHardCandidateDisplayException(row)) return { label: 'NOT USED — HARD EXCLUSION',
    reason: evidence || execution.reason || 'Hard exclusion recorded; supporting reason was not recorded.', code: 'HARD_EXCLUDED', className: red };
  if (pricing.code === 'UNRESOLVED_AUDIT_LINK') return { label: 'NOT USED — REVIEW UNRESOLVED',
    reason: `${pricing.label}; no verified final valuation-use decision is available for this occurrence.`, code: pricing.code, className: amber };
  if (pricing.code === 'NOT_SUBMITTED_NOT_ASSESSED') return { label: 'NOT USED — NOT ASSESSED',
    reason: 'Not submitted / not assessed by the final valuation analysis.', code: pricing.code, className: neutral };
  if (hasActualVisualResponse(row) && ['mismatch', 'deterministic_conflict'].includes(identity.code)) {
    return { label: 'NOT USED — IDENTITY MISMATCH', reason: evidence || row.visualReviewRationale || identity.label,
      code: identity.code, className: red };
  }
  if (!hasActualVisualResponse(row) && hasActualVisualDispatch(row)) return { label: 'NOT USED — REVIEW UNRESOLVED',
    reason: `${execution.label}${execution.reason ? ` · ${execution.reason}` : ''}; no usable identity decision is recorded.`, code: execution.code, className: amber };
  if (hasActualVisualResponse(row) && ['rough_match', 'unreadable', 'manual_unknown'].includes(identity.code)) return {
    label: 'NOT USED — REVIEW UNRESOLVED', reason: `${identity.label}; identity is not confirmed and final valuation has not run.`, code: identity.code, className: amber };
  if (contextReason) return { label: 'VALUATION NOT RUN', reason: `${contextReason} No final valuation-use decision is recorded.`, code: 'CONTEXT_BEFORE_ANALYSIS', className: neutral };
  if (hasMercariUndatedSoldAdmission(row)) return { label: 'VALUATION NOT RUN',
    reason: `Image-confirmed, source-eligible Mercari sold comp under the date exception. ${mercariPriceContextLabel(row)}. Final valuation analysis has not run; source eligibility is not a final valuation-use decision.`,
    code: 'MERCARI_DATE_EXCEPTION_BEFORE_ANALYSIS', className: neutral };
  if (hasActualVisualResponse(row) && identity.code === 'match') return { label: 'VALUATION NOT RUN',
    reason: 'Image match recorded; final valuation analysis has not run. Matching and source eligibility do not mean used in valuation.', code: 'MATCH_BEFORE_ANALYSIS', className: neutral };
  if (row.evidenceDisposition === 'valuation_eligible') return { label: 'VALUATION NOT RUN',
    reason: 'Source eligible — final analysis not run. Eligibility is not a final valuation-use decision.', code: pricing.code, className: neutral };
  return { label: 'NOT USED — REVIEW UNRESOLVED', reason: receipt && receipt.state !== 'unknown'
    ? `${execution.label}${execution.reason ? ` · ${execution.reason}` : ''}. Final valuation has not run.`
    : 'Execution provenance unavailable; no verified image decision or final valuation-use decision is recorded.',
    code: receipt ? execution.code : 'EXECUTION_UNAVAILABLE', className: amber };
}
