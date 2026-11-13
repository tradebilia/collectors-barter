import type { CandidateDisplayRow } from '../../../../shared/testAiCandidateLedger';
import { candidateExecutionAttemptFacts, candidateExecutionFact, candidateExecutionReceipt, candidateHistoricSaleDate, candidateIdentityFact, candidatePricingFact, formatCandidateDisplayPrice, hasActualVisualDispatch, hasActualVisualResponse, isHardCandidateDisplayException } from '../../../../shared/testAiCandidateStatus';
import { hasMercariUndatedSoldAdmission, mercariPriceContextLabel } from '../../../../shared/testAiMercariTransport';
import { isCurrentMarketContextSource } from '../../../../shared/testAiMarketContext';

export type CandidateFinalDecision = { label: string; reason: string; code: string; className: string };
const neutral = 'border-slate-600/60 bg-slate-900/60 text-slate-200';
const amber = 'border-amber-600/50 bg-amber-950/30 text-amber-200';
const red = 'border-red-600/50 bg-red-950/30 text-red-200';
const green = 'border-emerald-600/50 bg-emerald-950/30 text-emerald-200';
const historic = 'border-sky-600/50 bg-sky-950/30 text-sky-200';
const finalLabels: Record<string, string> = {
  CURRENT_SALES_DIAGNOSTIC_ONLY: 'NOT USED — SALES DIAGNOSTICS ONLY',
  HISTORIC_MARKET_CONTEXT: 'HISTORIC MARKET CONTEXT',
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
  AUTOGRAPH_MARKET_POLICY_BLOCKED: 'The listing did not meet the signed-item market-evidence requirements.',
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
const finalBlockerPriority = [
  'SOURCE_DISPOSITION_RESTRICTIVE', 'VISUAL_MISMATCH', 'REQUIRED_APPROVAL_MISSING', 'PROVENANCE_UNVERIFIED',
  'TRANSACTION_IDENTITY_MISSING', 'INVALID_PRICE', 'UNKNOWN_CURRENCY', 'UNSUPPORTED_CURRENCY', 'NOT_COMPLETED',
  'UNKNOWN_PRICE_BASIS', 'PREMIUM_NOT_INCLUDED', 'AUCTION_AMOUNT_UNRESOLVED', 'TRANSACTION_LOT_CONFLICT',
  'APPROVED_LOT_CONFLICT', 'HIGH_VALUE_PRICE_TOO_LOW', 'HIGH_VALUE_PRICE_TOO_HIGH', 'INVALID_DATE', 'HISTORICAL_DATE',
  'CATALOG_NUMBER_CONFLICT', 'CATEGORY_IDENTITY_CONFLICT', 'UNIVERSAL_IDENTITY_CONFLICT', 'VARIANT_CONFLICT',
  'GRADE_ADJACENT', 'CERTIFICATION_ADJACENT', 'CATEGORY_REVIEW_REQUIRED', 'UNIVERSAL_REVIEW_REQUIRED',
  'VARIANT_REVIEW_REQUIRED', 'SIGNED_FORM_CONFLICT', 'APPROVED_STATE_CONFLICT', 'TARGET_IDENTITY_INCOMPLETE',
  'AUTOGRAPH_MARKET_POLICY_BLOCKED', 'IDENTITY_SCORE_BELOW_THRESHOLD', 'MATERIAL_IDENTITY_HOLD', 'GUIDE_FALLBACK_PRIMARY', 'SOURCE_BALANCED_CAP',
  'IQR_EXCLUDED_N_GE_10', 'EXACT_DUPLICATE_POLICY', 'PROBABLE_DUPLICATE_POLICY',
] as const;
function terminalFinalBlocker(row: CandidateDisplayRow, reasonCodes: Set<string>): string | undefined {
  const mercariDateException = row.sourceId === 'mercari_sold_comps'
    && (hasMercariUndatedSoldAdmission(row) || reasonCodes.has('MERCARI_UNDATED_QUALIFIED_EXCEPTION'));
  const ignored = mercariDateException ? new Set(['INVALID_DATE', 'MERCARI_UNDATED_TIMING_UNVERIFIED', 'MERCARI_SOLD_TRUE_PRICE_AS_REPORTED']) : new Set<string>();
  return finalBlockerPriority.find((code) => reasonCodes.has(code) && !ignored.has(code) && finalAnalysisBlockerLabels[code]);
}
function plainIdentityConflict(detail: string): string {
  const reason = detail.trim().replace(/^identity state conflict:\s*/i, '');
  if (reason === 'sale declares an autograph/signature not declared by target') {
    return 'The final check did not recognize the target as autographed, while the listing states that it is signed.';
  }
  if (reason === 'single item versus lot/bundle differs') {
    return 'One record describes a single item and the other describes a lot or bundle. They are not the same transaction type.';
  }
  const difference = reason.match(/^(.+?) differs \((.+) vs (.+)\)$/i);
  if (difference) {
    const labels: Record<string, string> = {
      'raw/graded state': 'Grading status', 'grading company': 'Grading company',
      grade: 'Grade', 'parallel/variant': 'Variant',
      'signature name': 'Signer', 'signature name set': 'Signers',
    };
    const label = labels[difference[1].toLowerCase()] ?? difference[1];
    return `${label} does not match: target “${difference[3]}”; listing “${difference[2]}”.`;
  }
  const negativeSignal = reason.match(/^negative listing signal:\s*(.+)$/i);
  if (negativeSignal) {
    const descriptions: Record<string, string> = {
      'custom/reprint/proxy': 'The listing describes a custom item, reprint, or proxy rather than an original item.',
      'case-break spot': 'The listing sells a place in a case break, not the item itself.',
      'lot/bundle': 'The listing describes multiple items rather than one comparable item.',
      'condition alteration': 'The listing contains wording indicating damage or alteration.',
    };
    return descriptions[negativeSignal[1]] ?? `The listing was flagged for: ${negativeSignal[1]}.`;
  }
  return `The recorded identity conflict is: ${reason}${/[.!?]$/.test(reason) ? '' : '.'}`;
}
function plainFinalReason(row: CandidateDisplayRow, code: string, exactReasons: string[]): string | undefined {
  if (code === 'CURRENT_SALES_PRIMARY') return row.valuationUse?.identityAdmission?.basis === 'server_autograph_market_relevance'
    ? `This reported sold price was used as Autographs market evidence. Exact image review is not required.${row.sourceId === 'mercari_sold_comps' ? ' Sale date remains Unknown under the Mercari date exception.' : ''}` : undefined;
  if (code === 'FINAL_HARD_EXCLUDED') {
    const specificHardReason = hardExclusionReason(row);
    if (/^Hard exclusion: .+ differs — target “.+”; candidate “.+”\.$/.test(specificHardReason)) return specificHardReason;
  }
  const reasonCodes = new Set([
    ...(row.valuationUse?.sourceAdmission?.blockerCodes ?? []),
    ...(row.valuationUse?.use?.reasonCodes ?? []),
  ]);
  const visualResponse = hasActualVisualResponse(row);
  const visualDispatched = hasActualVisualDispatch(row);
  const autographNoVisual = row.visualRequirement === 'not_required'
    || typeof row.visualRequirement === 'string' && row.visualRequirement.startsWith('not_required_autograph')
    || row.metadataRanking?.scorerRole === 'signed_item_relevance';
  const hasSourceHoldDetails = reasonCodes.has('SOURCE_DISPOSITION_RESTRICTIVE') && sourceDispositionBlockerDetails(row).length > 0;
  if (autographNoVisual && row.evidenceDisposition !== 'valuation_eligible' && !hasSourceHoldDetails) {
    const sourceReason = Array.isArray(row.evidenceReasons) ? row.evidenceReasons.find((reason: unknown) =>
      typeof reason === 'string' && /^(?:signer is|signed object type|market relevance score|Autograph candidate)/i.test(reason)) : undefined;
    if (sourceReason) return `The signed-item check stopped this listing: ${sourceReason}`;
    const score = Number(row.metadataMatchScore);
    if (Number.isFinite(score) && score < 70) return `The signed-item market relevance score was ${score}/100, below the required minimum of 70/100. Image review is not required for Autographs.`;
  }
  // Final economic, provenance, source, and identity blockers are more
  // authoritative than a missing visual response. Visual wording is only a
  // fallback when final analysis has no stronger recorded reason.
  const hasAuthoritativeFinalBlocker = terminalFinalBlocker(row, reasonCodes) !== undefined;
  if (row.sourceId === 'mercari_sold_comps' && !visualResponse && !autographNoVisual && !hasAuthoritativeFinalBlocker) {
    const execution = candidateExecutionFact(row);
    const attemptFacts = candidateExecutionAttemptFacts(row);
    const attemptFailure = attemptFacts.at(-1)?.failure?.label;
    const detail = attemptFailure || execution.reason ? ` (${attemptFailure || execution.reason})` : '';
    return visualDispatched
      ? `The visual AI was called but did not return a usable review${detail}. Because no visual match was confirmed, this candidate could not proceed to valuation.`
      : 'The visual AI review was not completed for this candidate. Because no visual match was confirmed, this candidate could not proceed to valuation.';
  }
  if (reasonCodes.has('INSUFFICIENT_CURRENT_SUPPORT') || code === 'SOURCE_ELIGIBLE_NOT_SELECTED' && !hasAuthoritativeFinalBlocker) {
    const supportReason = row.valuationUse?.use?.supportReasonDetails?.find((reason: unknown) =>
      typeof reason === 'string' && Boolean(reason.trim()));
    return supportReason
      ? `The item is a confirmed match, but its price was not used. ${supportReason}`
      : 'The item is a confirmed match, but this run was withheld by a separate evidence-support check. One qualifying sale is sufficient during sandbox testing. The final analysis did not supply the specific reason for this hold.';
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
  const blocker = terminalFinalBlocker(row, reasonCodes);
  const identity = row.valuationUse?.identityAdmission;
  if (blocker === 'UNIVERSAL_IDENTITY_CONFLICT') {
    const detail = identity?.reasonDetails?.find((reason: unknown): reason is string => typeof reason === 'string'
      && /raw\/graded state differs|single item versus lot\/bundle differs|negative listing signal|parallel\/variant differs|sale declares an autograph|signature name(?: set)? differs/.test(reason));
    return detail ? plainIdentityConflict(detail)
      : 'The final analysis recorded an identity conflict but did not preserve the specific conflicting field. The detailed exclusion reason is missing.';
  }
  if (blocker === 'CATEGORY_IDENTITY_CONFLICT') {
    const detail = identity?.categoryIdentity?.conflicts?.find((reason: unknown): reason is string => typeof reason === 'string' && Boolean(reason.trim()));
    return detail ? plainIdentityConflict(detail)
      : 'The final analysis recorded an item-specific conflict but did not preserve the specific field or values. The detailed exclusion reason is missing.';
  }
  if (blocker === 'UNIVERSAL_REVIEW_REQUIRED') {
    const detail = identity?.reasonDetails?.find((reason: unknown) => typeof reason === 'string' && reason.includes('not stated'));
    if (detail === 'autograph status is not stated') return 'The listing title does not state that the item is signed or autographed; the final signed-item market-evidence approval was not established.';
    if (detail === 'signature name is not stated') return 'The listing does not identify who signed the item.';
  }
  if (blocker === 'CATEGORY_REVIEW_REQUIRED' && identity?.categoryIdentity?.unconfirmedFields?.length) {
    return `The listing does not confirm the required ${identity.categoryIdentity.unconfirmedFields.join(', ')} information.`;
  }
  if (blocker === 'AUTOGRAPH_MARKET_POLICY_BLOCKED' && identity?.reasonDetails?.length) {
    return `The signed-item check stopped this listing: ${identity.reasonDetails[0]}.`;
  }
  if (blocker) return `The item looks like a match, but ${finalAnalysisBlockerLabels[blocker]}`;
  if (code === 'REVIEW_REQUIRED') return 'The item looks like a match, but a required verification step was not completed, so it cannot be used for the value yet.';
  if (code === 'UNSUPPORTED_CURRENCY') return 'The item matched, but the sale is not reported in US dollars, so it cannot be used in the value calculation.';
  if (code === 'FINAL_HARD_EXCLUDED') return hardExclusionReason(row)
    || 'The final analysis recorded a hard exclusion but did not preserve its specific reason. The detailed exclusion reason is missing.';
  return exactReasons.length ? 'The item was not used because a final valuation rule prevented this sale from contributing to the value.' : undefined;
}
function isInformationalAgeReason(detail: string): boolean {
  // An age observation is not itself an exclusion. Keep actual age/date blocker
  // codes and specific restrictive explanations authoritative for other decisions.
  return /^sale date is older than one year(?: and is admitted only under the labeled illiquid-market extension policy)?\.?$/i.test(detail.trim());
}
function finalAnalysisReasons(row: CandidateDisplayRow): string[] {
  const codes = [...(row.valuationUse?.sourceAdmission?.blockerCodes ?? []), ...(row.valuationUse?.use?.reasonCodes ?? [])];
  const details = (row.valuationUse?.sourceAdmission?.reasonDetails ?? []).filter((reason: unknown) =>
    typeof reason === 'string' && reason.trim() && !isInformationalAgeReason(reason));
  return [...new Set(codes)].map((code) => `${code}: ${finalAnalysisBlockerLabels[code] ?? 'Final analysis recorded this code as a reason the candidate was not used.'}`).concat(details);
}
function structuredFinalBlockerExplanation(row: CandidateDisplayRow): string[] {
  const admission = row.valuationUse?.sourceAdmission;
  const reasons: string[] = [];
  const approval = admission?.approvalFailure;
  if (approval?.plainEnglish) reasons.push(`Final approval failed because ${approval.plainEnglish}${approval.detail ? ` (${approval.detail})` : ''}`);
  const sourceBlockers = (admission?.sourceBlockers ?? [])
    .map((blocker: any) => typeof blocker?.plainEnglish === 'string' ? blocker.plainEnglish : '')
    .filter(Boolean);
  if (sourceBlockers.length) reasons.push(`Separate source-admission blocker: ${sourceBlockers[0]}`);
  return reasons;
}
function sourceDispositionBlockerDetails(row: CandidateDisplayRow): string[] {
  // These describe successful or qualified checks, not reasons for a hold.
  // Keep the exclusion list narrow: unknown details may still be real blockers.
  const informationalDetails = [
    /^source disposition retained:/i,
    /^Autographs \/ Signed Item passed the signer, object-type, and 70-point valuation gate\.?$/i,
    /^Autographs \/ Signed Item market-range workflow does not use visual analysis\.?$/i,
    /^Best Offer accepted amount was verified by Sold-Comps price hydration\.?$/i,
    /^Qualified undated Mercari exception: sale date remains Unknown; timing is unverified and sold=true reported sold price is used as reported, not proof of a recent sale or a private accepted-offer amount\.?$/i,
  ];
  return (row.valuationUse?.sourceAdmission?.reasonDetails ?? [])
    .filter((detail: unknown): detail is string => typeof detail === 'string' && Boolean(detail.trim()))
    .map((detail: string) => detail.trim())
    .filter((detail: string) => !isInformationalAgeReason(detail) && !informationalDetails.some((pattern) => pattern.test(detail)));
}
function sourceDispositionExplanation(row: CandidateDisplayRow): string {
  const details = sourceDispositionBlockerDetails(row);
  const specificDetails = details.map((specific: string) => specific
    .replace(/^Final approval rejected:\s*APPROVAL_TARGET_BINDING_INVALID:.*$/i, 'the target information changed between the item review and the final approval check')
    .replace(/^Final approval rejected:\s*APPROVAL_REVIEW_METADATA_BINDING_INVALID:.*$/i, 'the metadata sent to visual review did not exactly match the target metadata used for final approval')
    .replace(/^Final approval rejected:\s*APPROVAL_TARGET_IMAGE_BINDING_INVALID:.*$/i, 'the target image used for visual review did not match the target image used for final approval')
    .replace(/^Final approval rejected:\s*APPROVAL_FACTS_OR_REVIEW_INVALID:.*$/i, 'the sale record or visual review did not contain all required verified facts for approval')
    .replace(/^Final approval rejected:\s*APPROVAL_SOURCE_UNSUPPORTED:.*$/i, 'this source is not authorized to issue a signed visual approval')
    .replace(/^Final approval rejected:\s*APPROVAL_ADAPTER_CONFLICT:.*$/i, 'the source identifier and source adapter did not agree')
    .replace(/^Final approval rejected:\s*APPROVAL_IMAGE_COUNT_MISSING:.*$/i, 'the final review did not record a submitted image')
    .replace(/^Final approval rejected:\s*APPROVAL_CONFIDENCE_INSUFFICIENT:.*$/i, 'the visual match did not have enough confidence for final approval')
    .replace(/^Final approval rejected:\s*APPROVAL_RETRY_NOT_CONFIRMED:.*$/i, 'the high-resolution review did not finish as a confirmed match')
    .replace(/^Final approval rejected:\s*APPROVAL_ADJUDICATION_UNAVAILABLE:.*$/i, 'the required independent confirmation did not return usable evidence')
    .replace(/^Final approval rejected:\s*APPROVAL_DECIDING_PASS_INVALID:.*$/i, 'the server could not identify a valid deciding visual-review pass')
    .replace(/^Final approval rejected:\s*APPROVAL_DECIDING_VERDICT_NOT_MATCH:.*$/i, 'the deciding visual-review pass was not a confirmed match')
    .replace(/^Final approval rejected:\s*APPROVAL_DECIDING_EVIDENCE_MISSING:.*$/i, 'the visual review did not preserve the evidence needed to prove the match')
    .replace(/^Final approval rejected:\s*APPROVAL_EVIDENCE_CONFLICT:.*$/i, 'the final visual evidence disagreed with the evidence returned by the review')
    .replace(/^Final approval rejected:\s*APPROVAL_IDENTITY_NOT_CONFIRMED:.*$/i, 'the visual evidence did not confirm the candidate was the same product identity')
    .replace(/^Final approval rejected:\s*APPROVAL_PIN_IDENTITY_INCOMPLETE:.*$/i, 'the visual evidence did not confirm all required Disney Pin identity details')
    .replace(/^Final approval rejected:\s*APPROVAL_GRADED_EVIDENCE_INCOMPLETE:.*$/i, 'the visual evidence did not confirm all required grading details')
    .replace(/^Final approval rejected:\s*APPROVAL_UNGRADED_STATE_UNCONFIRMED:.*$/i, 'the visual evidence did not confirm that this target and candidate were both ungraded')
    .replace(/^Final approval rejected:\s*APPROVAL_CANDIDATE_FIELDS_CONFLICT:.*$/i, 'the candidate metadata conflicted with the target identity')
    .replace(/^Final approval rejected:\s*APPROVAL_TRANSACTION_FORM_CONFLICT:.*$/i, 'the candidate was identified as a lot, bundle, or incomplete product rather than one comparable item')
    .replace(/^Final approval rejected:\s*APPROVAL_VISUAL_IDENTITY_CONFLICT:\s*deciding evidence reports false for (.+)$/i, 'the visual evidence reported a conflict in $1')
    .replace(/^Final approval rejected:\s*APPROVAL_CONSERVATIVE_REVIEW_NOT_MATCH:.*$/i, 'the final safety check did not retain the visual result as a match')
    .replace(/^Final approval rejected:\s*APPROVAL_MATERIAL_VISUAL_DIFFERENCE:\s*(.+)$/i, 'the visual review found a material difference in $1')
    .replace(/^Final approval rejected:\s*APPROVAL_VISUAL_DIFFERENCES?_(?:LIMIT|LENGTH):.*$/i, 'the visual differences returned by the review were not valid for final approval')
    .replace(/^APPROVAL_VISUAL_IDENTITY_CONFLICT:\s*deciding evidence reports false for dateMatches\.?$/i, 'the final identity check did not confirm that the candidate date matched the target')
    .replace(/^APPROVAL_VISUAL_IDENTITY_CONFLICT:\s*/i, 'the final identity check found a conflict: ')
    .replace(/^meaningful observed provider record ID or valid listing\/transaction URL is missing; retained as context only$/i, 'the listing did not include a verified provider ID or valid listing URL')
    .replace(/^completed-sale status is not verifiable for this source$/i, 'the source did not verify that this was a completed sale')
    .replace(/^price basis is not verifiable as sold, closed, or realized$/i, 'the source did not verify that the amount was a completed-sale price')
    .replace(/^sale currency is unknown; retained as context only$/i, 'the sale currency was not identified')
    .replace(/^unsupported currency (.+); retained as context only$/i, 'the sale was reported in $1 instead of USD')
    .replace(/^missing or non-positive realized price$/i, 'the reported sale amount was missing or not positive'));
  // The decision label already says whether the row was used. Once a candidate
  // has a blocking reason, listing every downstream consequence (price excluded,
  // date excluded, retained as context, etc.) obscures the one fact an operator
  // needs to investigate. Show only the first actionable reason in source order.
  // The Sold-Comps unverified Best Offer amount explanation is already plain
  // English; preserve it directly rather than converting it to a technical code.
  const primaryDetail = specificDetails[0];
  return primaryDetail
    ? `The primary reason this candidate was stopped is: ${primaryDetail}${/[.!?]$/.test(primaryDetail) ? '' : '.'} The record remains context only.`
    : 'The source did not provide the verified evidence required for final valuation. The record remains context only.';
}
function lowScoreReviewDecision(row: CandidateDisplayRow): CandidateFinalDecision | undefined {
  if (isHardCandidateDisplayException(row) === true || hasActualVisualResponse(row) || hasActualVisualDispatch(row)) return undefined;
  const score = Number(row.metadataMatchScore);
  if (!Number.isFinite(score)) return undefined;
  const execution = candidateExecutionFact(row);
  const text = [row.visualReviewRationale, execution.reason, ...(row.evidenceReasons ?? [])]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join(' · ');
  const threshold = text.match(/below (?:the )?(?:visual-review )?minimum(?: of)?\s*\(?\s*(\d+)/i)?.[1]
    ?? text.match(/below minimum\s*\(?\s*(\d+)/i)?.[1];
  if (!threshold || score >= Number(threshold)) return undefined;
  return {
    label: 'NOT USED — SCORE TOO LOW',
    reason: `Not sent to visual review: metadata score was ${score}/100, below the required minimum of ${threshold}/100. Because visual review was not completed, this candidate could not proceed to valuation.`,
    code: 'PRE_VISUAL_SCORE_EXCLUDED',
    className: amber,
  };
}
function evidenceReasons(row: CandidateDisplayRow): string {
  return Array.isArray(row.evidenceReasons) ? row.evidenceReasons.filter((reason: unknown) => typeof reason === 'string' && reason.trim()).join('; ') : '';
}
function hardExclusionReason(row: CandidateDisplayRow): string {
  const raw = [
    ...(Array.isArray(row.preVisionExclusionReasons) ? row.preVisionExclusionReasons : []),
    ...(Array.isArray(row.evidenceReasons) ? row.evidenceReasons : []),
    ...(Array.isArray(row.valuationUse?.sourceAdmission?.reasonDetails) ? row.valuationUse.sourceAdmission.reasonDetails : []),
    ...(Array.isArray(row.valuationUse?.identityAdmission?.reasonDetails) ? row.valuationUse.identityAdmission.reasonDetails : []),
    row.valuationUse?.sourceAdmission?.approvalFailure?.detail,
    row.visualReviewRationale,
  ].find((reason: unknown) => typeof reason === 'string' && reason.trim()
    && !/^(?:outer_metadata_hold|outer identity filter|excluded before visual review)/i.test(reason.trim()));
  if (typeof raw !== 'string') return evidenceReasons(row) || row.visualReviewRationale || '';
  const conflict = raw.match(/Metadata conflict:\s*([^()]+?)\s*\((?:target\s+)?([^=]+)=([^;]+);\s*candidate=([^)]*)\)/i);
  if (conflict) {
    const fieldKey = conflict[2].trim();
    const field = ({ recordLabel: 'Record label', format: 'Format', genre: 'Genre', edition: 'Edition',
      gradingCompany: 'Grading company', certificationCompany: 'Grading company', grade: 'Grade' } as Record<string, string>)[fieldKey]
      ?? fieldKey.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase()).trim();
    return `Hard exclusion: ${field} differs — target “${conflict[3].trim()}”; candidate “${conflict[4].trim()}”.`;
  }
  return `Hard exclusion: ${raw.trim()}`;
}
function explicitContextReason(row: CandidateDisplayRow): string | undefined {
  // A reconciled final source-admission report supersedes browser economics and
  // source-role diagnostics. Do not append a second, potentially stale reason.
  if (row.valuationUse?.use?.code && row.valuationUse?.sourceAdmission) return undefined;
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
  // Only the reconciled final code authorizes this display group. Date, source
  // eligibility, and stale asking-price fields cannot promote or demote a row.
  if (row.valuationUse?.use?.code === 'HISTORIC_MARKET_CONTEXT') {
    const amount = formatCandidateDisplayPrice(row);
    const saleDate = candidateHistoricSaleDate(row);
    return { label: finalLabels.HISTORIC_MARKET_CONTEXT,
      reason: `This matching item sold${amount === 'Price unavailable' ? '; the sold amount is unavailable' : ` for ${amount}`}${saleDate ? ` on ${saleDate}` : '; sale date Unknown'}. Final analysis retained it as a completed sale over one year ago (older than 365 days). It provides historic market context, not today’s value, and does not set the current valuation.`,
      code: 'HISTORIC_MARKET_CONTEXT', className: historic };
  }
  const execution = candidateExecutionFact(row); // Never invent an active worker from a missing receipt.
  const identity = candidateIdentityFact(row);
  const receipt = candidateExecutionReceipt(row);
  const evidence = evidenceReasons(row);
  const contextReason = explicitContextReason(row);
  const activeContextMatch = isActiveMarketContext(row) && hasActualVisualResponse(row) && identity.code === 'match';
  const activeContextPrice = formatCandidateDisplayPrice(row);
  const activeContextListing = isActiveMarketContext(row)
    && activeContextPrice !== 'Price unavailable'
    && !isHardCandidateDisplayException(row)
    && !['mismatch', 'deterministic_conflict'].includes(identity.code)
    && row.evidenceDisposition !== 'pre_vision_score_excluded';
  if (activeContextMatch && pricing.code !== 'CURRENT_SALES_PRIMARY') {
    return { label: 'MATCH CONFIRMED — CURRENT MARKET CONTEXT',
      reason: `Image match confirmed. This eBay active listing is current asking-price activity at ${activeContextPrice}, not a completed sale. It is retained for current-market context and commentary, but it is not used to set the primary sold-comps value.`,
      code: 'ACTIVE_MARKET_CONTEXT_MATCH', className: green };
  }
  if (activeContextListing && pricing.code !== 'CURRENT_SALES_PRIMARY') {
    const reviewed = hasActualVisualResponse(row);
    return { label: reviewed ? 'CURRENT MARKET CONTEXT' : 'CURRENT MARKET CONTEXT — NOT VISUALLY REVIEWED',
      reason: reviewed
        ? `This active listing shows current asking-price activity at ${activeContextPrice}, not a completed sale. It is retained as market context and is not used to set the primary sold-comps value.`
        : `This active listing shows current asking-price activity at ${activeContextPrice}. It was not sent for image review, so it is context only and is not used to set the primary sold-comps value.`,
      code: 'ACTIVE_MARKET_CONTEXT', className: reviewed ? green : amber };
  }
  if (row.valuationUse?.use?.code) {
    const lowScore = lowScoreReviewDecision(row);
    if (lowScore) return lowScore;
    const primary = pricing.code === 'CURRENT_SALES_PRIMARY';
    const hard = pricing.code === 'FINAL_HARD_EXCLUDED';
    const exactFinalReasons = finalAnalysisReasons(row);
    const structuredReasons = structuredFinalBlockerExplanation(row);
    const plainReason = plainFinalReason(row, pricing.code, exactFinalReasons);
    const fieldLevelHardReason = hard ? hardExclusionReason(row) : undefined;
    const specificHardReason = fieldLevelHardReason && /^Hard exclusion: .+ differs — target “.+”; candidate “.+”\.$/.test(fieldLevelHardReason)
      ? fieldLevelHardReason : undefined;
    const details = [specificHardReason ?? (structuredReasons.length ? structuredReasons.join(' · ') : plainReason ?? pricing.reason),
      hard && !plainReason ? evidence || (receipt?.hardExclusion ? execution.reason : undefined) : undefined,
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
    reason: hardExclusionReason(row) || evidence || execution.reason || 'Hard exclusion recorded; supporting reason was not recorded.', code: 'HARD_EXCLUDED', className: red };
  if (row.evidenceDisposition === 'pre_vision_score_excluded') {
    const rationale = String(row.visualReviewRationale ?? '');
    const threshold = rationale.match(/below (?:the )?(?:visual-review )?minimum(?: of)?\s*\(?\s*(\d+)/i)?.[1]
      ?? rationale.match(/below minimum\s*\(?\s*(\d+)/i)?.[1];
    const score = Number(row.metadataMatchScore);
    if (threshold && Number.isFinite(score)) {
      return { label: 'NOT USED — SCORE TOO LOW',
        reason: `Not sent to visual review: metadata score was ${score}/100, below the required minimum of ${threshold}/100.`,
        code: 'PRE_VISUAL_SCORE_EXCLUDED', className: amber };
    }
    return { label: 'NOT USED — PRE-REVIEW EXCLUSION',
      reason: rationale || 'Not sent to visual review because it did not meet the pre-review requirements.',
      code: 'PRE_VISUAL_EXCLUDED', className: amber };
  }
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
