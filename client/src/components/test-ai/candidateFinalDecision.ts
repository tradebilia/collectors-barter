import type { CandidateDisplayRow } from '../../../../shared/testAiCandidateLedger';
import { candidateExecutionAttemptFacts, candidateExecutionFact, candidateExecutionReceipt, candidateIdentityFact, candidatePricingFact, formatCandidateDisplayPrice, hasActualVisualDispatch, hasActualVisualResponse, isHardCandidateDisplayException } from '../../../../shared/testAiCandidateStatus';
import { hasMercariUndatedSoldAdmission, mercariPriceContextLabel } from '../../../../shared/testAiMercariTransport';
import { isCurrentMarketContextSource } from '../../../../shared/testAiMarketContext';

export type CandidateFinalDecision = { label: string; reason: string; code: string; className: string };
const neutral = 'border-slate-600/60 bg-slate-900/60 text-slate-200';
const amber = 'border-amber-600/50 bg-amber-950/30 text-amber-200';
const red = 'border-red-600/50 bg-red-950/30 text-red-200';
const green = 'border-emerald-600/50 bg-emerald-950/30 text-emerald-200';
const finalLabels: Record<string, string> = {
  CURRENT_SALES_DIAGNOSTIC_ONLY: 'NOT USED — SALES DIAGNOSTICS ONLY',
  HISTORICAL_DIAGNOSTIC_ONLY: 'NOT USED — HISTORICAL DIAGNOSTICS ONLY',
  SOURCE_ELIGIBLE_NOT_SELECTED: 'MATCH CONFIRMED — NOT USED IN VALUE',
  OMITTED_BY_CAP: 'NOT USED — OMITTED BY CAP', EXACT_DUPLICATE: 'NOT USED — EXACT DUPLICATE',
  PROBABLE_DUPLICATE: 'NOT USED — PROBABLE DUPLICATE', OUTLIER_EXCLUDED: 'NOT USED — OUTLIER',
  SECONDARY_ONLY: 'NOT USED — SECONDARY EVIDENCE', REVIEW_REQUIRED: 'NOT USED — REVIEW REQUIRED',
  CONTEXT_ONLY: 'NOT USED — CONTEXT ONLY', FINAL_HARD_EXCLUDED: 'NOT USED — HARD EXCLUSION',
  UNSUPPORTED_CURRENCY: 'NOT USED — UNSUPPORTED CURRENCY', NOT_SUBMITTED_NOT_ASSESSED: 'NOT USED — NOT ASSESSED',
};
/** Exact server final-analysis gates, translated without hiding the machine code. */
const finalAnalysisBlockerLabels: Record<string, string> = {
  PROVENANCE_UNVERIFIED: 'Server provenance was not verified; the source record cannot affect valuation.',
  SOURCE_DISPOSITION_RESTRICTIVE: 'The source disposition remained restrictive at final analysis.',
  INVALID_PRICE: 'The reported price is missing, zero, or non-positive.',
  UNKNOWN_CURRENCY: 'The sale currency is unknown.', UNSUPPORTED_CURRENCY: 'The sale currency is not USD.',
  NOT_COMPLETED: 'The record was not verified as a completed sale.',
  UNKNOWN_PRICE_BASIS: 'The price basis was not verified as sold, closed, or realized.',
  PREMIUM_NOT_INCLUDED: 'Buyer premium treatment was not compatible with the source policy.',
  INVALID_DATE: 'The sale date is missing, invalid, or future-dated.', HISTORICAL_DATE: 'The sale is outside the current-date policy window.',
  VISUAL_MISMATCH: 'Visual review flagged the candidate as a mismatch.',
  REQUIRED_APPROVAL_MISSING: 'Required server-final identity approval is missing or not bound to this target and image.',
  APPROVED_LOT_CONFLICT: 'The approved transaction is a lot or bundle, not one comparable product.',
  TRANSACTION_IDENTITY_MISSING: 'No meaningful provider record ID or valid listing URL was verified.',
  TRANSACTION_LOT_CONFLICT: 'The transaction covers a lot or bundle, so no single-product price is used.',
  AUCTION_AMOUNT_UNRESOLVED: 'The auction amount could not be reconciled under the source premium policy.',
  HIGH_VALUE_PRICE_TOO_LOW: 'The price failed the high-value safety floor against the owner reference value.',
  HIGH_VALUE_PRICE_TOO_HIGH: 'The price failed the high-value safety ceiling against the owner reference value.',
  CATALOG_NUMBER_CONFLICT: 'The catalog, card, or issue number conflicts with the target.',
  CATEGORY_IDENTITY_CONFLICT: 'A category-critical identity field conflicts with the target.',
  UNIVERSAL_IDENTITY_CONFLICT: 'A universal identity field conflicts with the target.',
  VARIANT_CONFLICT: 'The candidate declares a different variant or release detail.',
  GRADE_ADJACENT: 'The candidate is the same underlying object in a different grade state.',
  CERTIFICATION_ADJACENT: 'The candidate is certification-adjacent to the target.',
  CATEGORY_REVIEW_REQUIRED: 'A category-critical identity field remains unresolved.',
  UNIVERSAL_REVIEW_REQUIRED: 'A universal identity field remains unresolved.',
  VARIANT_REVIEW_REQUIRED: 'A declared variant requires review before direct valuation use.',
  SIGNED_FORM_CONFLICT: 'The signed transaction form conflicts with the target.',
  APPROVED_STATE_CONFLICT: 'The approved transaction state conflicts with the target.',
  TARGET_IDENTITY_INCOMPLETE: 'The target is missing a critical identity field.',
  IDENTITY_SCORE_BELOW_THRESHOLD: 'The final identity score is below the admission threshold.',
  MATERIAL_IDENTITY_HOLD: 'A material identity review hold prevented primary valuation use.',
  INSUFFICIENT_CURRENT_SUPPORT: 'The current evidence did not meet the support floor for primary valuation.',
  GUIDE_FALLBACK_PRIMARY: 'Primary market-sales support was unavailable; guide fallback was selected instead.',
  SOURCE_BALANCED_CAP: 'The candidate was omitted by the source-balanced valuation cap.',
  IQR_EXCLUDED_N_GE_10: 'The candidate was excluded by the outlier policy.',
  EXACT_DUPLICATE_POLICY: 'An exact duplicate transaction was suppressed.',
  PROBABLE_DUPLICATE_POLICY: 'A probable duplicate transaction was suppressed.',
  MERCARI_UNDATED_QUALIFIED_EXCEPTION: 'Mercari qualified for the signed sold=true undated-sale exception.',
};
function plainFinalReason(row: CandidateDisplayRow, code: string, exactReasons: string[]): string | undefined {
  if (code === 'CURRENT_SALES_PRIMARY') return undefined;
  const visualResponse = hasActualVisualResponse(row);
  const visualDispatched = hasActualVisualDispatch(row);
  if (row.sourceId === 'mercari_sold_comps' && !visualResponse) {
    const execution = candidateExecutionFact(row);
    const attemptFacts = candidateExecutionAttemptFacts(row);
    const attemptFailure = attemptFacts.at(-1)?.failure?.label;
    const detail = attemptFailure || execution.reason ? ` (${attemptFailure || execution.reason})` : '';
    return visualDispatched
      ? `The visual AI was called but did not return a usable review${detail}. Because no visual match was confirmed, this candidate could not proceed to valuation.`
      : 'The visual AI review was not completed for this candidate. Because no visual match was confirmed, this candidate could not proceed to valuation.';
  }
  const reasonCodes = new Set([
    ...(row.valuationUse?.sourceAdmission?.blockerCodes ?? []),
    ...(row.valuationUse?.use?.reasonCodes ?? []),
  ]);
  if (code === 'SOURCE_ELIGIBLE_NOT_SELECTED' || reasonCodes.has('INSUFFICIENT_CURRENT_SUPPORT')) {
    const mercariDateNote = reasonCodes.has('MERCARI_UNDATED_TIMING_UNVERIFIED')
      ? ' This Mercari sale has no verified sale date, so it is kept as supporting evidence while more comparable sales are gathered.' : '';
    return `The item is a confirmed match, but this sale was not used to set the value because there is not enough reliable current sales evidence yet. One matching sale by itself is not enough to establish a dependable market value.${mercariDateNote}`;
  }
  if (code === 'CURRENT_SALES_DIAGNOSTIC_ONLY') {
    return 'The item is a confirmed match, but this sale is being shown for comparison only and was not used to calculate the primary value.';
  }
  if (code === 'HISTORICAL_DIAGNOSTIC_ONLY') {
    return 'The item is a confirmed match, but this sale is too old to set today’s primary value. It is retained as historical reference.';
  }
  if (code === 'GUIDE_FALLBACK_PRIMARY') {
    return 'This match did not provide enough usable recent sale evidence, so the system used a guide value instead.';
  }
  if (code === 'OUTLIER_EXCLUDED') return 'The item matched, but its price was unusually far from the other comparable sales, so it was left out of the value calculation.';
  if (code === 'EXACT_DUPLICATE' || code === 'PROBABLE_DUPLICATE') return 'The item matched, but this sale duplicates another sale already counted, so it was not counted twice.';
  if (code === 'OMITTED_BY_CAP') return 'The item matched, but the source limit was reached before it could be included in the final calculation.';
  if (reasonCodes.has('SOURCE_DISPOSITION_RESTRICTIVE')) return sourceDispositionExplanation(row);
  if (reasonCodes.has('INVALID_PRICE')) return 'The item looks like a match, but the reported sale price is missing, zero, or invalid, so it cannot be used in the value.';
  if (code === 'REVIEW_REQUIRED' || reasonCodes.has('REQUIRED_APPROVAL_MISSING')) return 'The item looks like a match, but a required verification step was not completed, so it cannot be used for the value yet.';
  if (code === 'UNSUPPORTED_CURRENCY') return 'The item matched, but the sale is not reported in US dollars, so it cannot be used in the value calculation.';
  if (code === 'FINAL_HARD_EXCLUDED') return 'The item was stopped because a required identity or transaction detail conflicts with the target.';
  return exactReasons.length ? 'The item was not used because a final valuation rule prevented this sale from contributing to the value.' : undefined;
}
function finalAnalysisReasons(row: CandidateDisplayRow): string[] {
  const codes = [...(row.valuationUse?.sourceAdmission?.blockerCodes ?? []), ...(row.valuationUse?.use?.reasonCodes ?? [])];
  const details = (row.valuationUse?.sourceAdmission?.reasonDetails ?? []).filter((reason: unknown) => typeof reason === 'string' && reason.trim());
  return [...new Set(codes)].map((code) => `${code}: ${finalAnalysisBlockerLabels[code] ?? 'Final analysis recorded this code as a reason the candidate was not used.'}`).concat(details);
}
function sourceDispositionExplanation(row: CandidateDisplayRow): string {
  const admission = row.valuationUse?.sourceAdmission;
  const disposition = admission?.verifiedSourceDisposition || admission?.reportedDisposition || 'restrictive';
  const details = (admission?.reasonDetails ?? []).filter((detail: unknown) => typeof detail === 'string' && detail.trim()
    && !/^source disposition retained:/i.test(detail)).map((detail: unknown) => String(detail).trim());
  const specificDetails = details.map((specific: string) => specific
    .replace(/^APPROVAL_VISUAL_IDENTITY_CONFLICT:\s*deciding evidence reports false for dateMatches\.?$/i, 'the final identity check did not confirm that the candidate date matched the target')
    .replace(/^APPROVAL_VISUAL_IDENTITY_CONFLICT:\s*/i, 'the final identity check found a conflict: ')
    .replace(/^meaningful observed provider record ID or valid listing\/transaction URL is missing; retained as context only$/i, 'the listing did not include a verified provider ID or valid listing URL')
    .replace(/^completed-sale status is not verifiable for this source$/i, 'the source did not verify that this was a completed sale')
    .replace(/^price basis is not verifiable as sold, closed, or realized$/i, 'the source did not verify that the amount was a completed-sale price')
    .replace(/^sale currency is unknown; retained as context only$/i, 'the sale currency was not identified')
    .replace(/^unsupported currency (.+); retained as context only$/i, 'the sale was reported in $1 instead of USD')
    .replace(/^missing or non-positive realized price$/i, 'the reported sale amount was missing or not positive')
    .replace(/^Qualified undated Mercari exception: sale date remains Unknown; timing is unverified and sold=true reported sold price is used as reported, not proof of a recent sale or a private accepted-offer amount\.?$/i, 'Mercari reported this as sold, but the sale date and final accepted amount were not independently verified'));
  return `The source classified this record as ${disposition.replace(/_/g, ' ')} rather than valuation-eligible${specificDetails.length ? ` because ${specificDetails.join('; ')}` : ''}. That is why the matching item was not allowed to affect the value.`;
}
function evidenceReasons(row: CandidateDisplayRow): string {
  return Array.isArray(row.evidenceReasons) ? row.evidenceReasons.filter((reason: unknown) => typeof reason === 'string' && reason.trim()).join('; ') : '';
}
function explicitContextReason(row: CandidateDisplayRow): string | undefined {
  if (hasMercariUndatedSoldAdmission(row)) return undefined;
  if (row.sourceId === 'mercari_sold_comps' && row.requestedMode !== 'active' && row.mercariObservation?.requestedMode !== 'active'
    && (row.requestedMode === 'sold' || row.mercariObservation?.requestedMode === 'sold')) {
    return Array.isArray(row.mercariAdmissionBlockers) && row.mercariAdmissionBlockers.length
      ? row.mercariAdmissionBlockers.join('; ')
      : 'Sold-mode Mercari listing (sold=true); sale date remains Unknown. No server-issued date-exception approval is attached; the Item A audit will report the remaining admission checks.';
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
function isActiveMarketContext(row: CandidateDisplayRow): boolean {
  return isCurrentMarketContextSource({ ...row, role: row.sourceRole ?? row.sourceRelevance?.role });
}
/** Presentation only. Call after the existing current-request ledger reconciliation. */
export function candidateFinalDecision(row: CandidateDisplayRow): CandidateFinalDecision {
  const pricing = candidatePricingFact(row);
  const execution = candidateExecutionFact(row); // Never invent an active worker from a missing receipt.
  const identity = candidateIdentityFact(row);
  const receipt = candidateExecutionReceipt(row);
  const evidence = evidenceReasons(row);
  const contextReason = explicitContextReason(row);
  const activeContextMatch = isActiveMarketContext(row) && hasActualVisualResponse(row) && identity.code === 'match';
  if (activeContextMatch && pricing.code !== 'CURRENT_SALES_PRIMARY') {
    return { label: 'MATCH CONFIRMED — CURRENT MARKET CONTEXT',
      reason: `Image match confirmed. This eBay active listing is current asking-price activity${formatCandidateDisplayPrice(row) !== 'Price unavailable' ? ` at ${formatCandidateDisplayPrice(row)}` : ''}, not a completed sale. It is retained for current-market context and commentary, but it is not used to set the primary sold-comps value.`,
      code: 'ACTIVE_MARKET_CONTEXT_MATCH', className: green };
  }
  if (row.valuationUse?.use?.code) {
    const primary = pricing.code === 'CURRENT_SALES_PRIMARY';
    const hard = pricing.code === 'FINAL_HARD_EXCLUDED';
    const exactFinalReasons = finalAnalysisReasons(row);
    const plainReason = plainFinalReason(row, pricing.code, exactFinalReasons);
    const details = [plainReason ?? pricing.reason,
      hard ? evidence || (receipt?.hardExclusion ? execution.reason : undefined) : undefined,
      pricing.code === 'CONTEXT_ONLY' ? contextReason : undefined,
      hasMercariUndatedSoldAdmission(row) && !plainReason ? mercariPriceContextLabel(row) : undefined].filter(Boolean).join(' · ');
    return { label: primary ? 'USED IN VALUATION' : finalLabels[pricing.code] ?? 'NOT USED — FINAL DECISION RECORDED',
      reason: `${pricing.label}${details ? ` · ${details}` : ''}`, code: pricing.code,
      className: primary ? green : hard ? red : amber };
  }
  if (row.auditOmittedByCap === true) return { label: 'NOT USED — AUDIT CAP',
    reason: 'Not submitted: the Item A audit transport limit is 120 retained candidates. No final decision was made for this row.',
    code: 'AUDIT_TRANSPORT_CAP', className: amber };
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
