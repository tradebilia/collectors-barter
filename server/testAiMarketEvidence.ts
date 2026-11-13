import type { ComparableTarget, MarketSale } from './testAiComparableEngine';
import { isCompletedSaleCandidate, scoreComparable } from './testAiComparableEngine';
import { evaluateAdapterEconomicPolicy, hasMeaningfulTransactionIdentity, signedTransactionLotConflict, transactionIdentity } from './testAiEconomicIntegrity';
import { evaluateSoldCompPriceSafety } from '../shared/testAiSoldCompSafety';
import { nullableTestAiPrice } from '../shared/testAiEvidenceNormalization';
import { getVerifiedIdentityApproval, hasVerifiedMercariUndatedSale, transferVerifiedIdentityApproval, verifyCanonicalObservation,
  MERCARI_REPORTED_SOLD_PRICE_BASIS } from './testAiCanonicalObservation';
import { randomUUID } from 'node:crypto';
import { FINAL_VALUATION_USE_VERSION, boundedFinalSourceCorrelation, makeFinalAuditRef,
  boundedFinalDisplayCorrelation, boundedDiagnosticVisualExecution, retainServerNormalizationReport, type NormalizationBlockerCode, type ValuationUseSide } from '../shared/testAiValuationUse';

/**
 * The Test AI client may transport marketplace observations, but it never gets
 * to promote an observation into valuation evidence. This module is the
 * server-side admission decision used immediately before snapshot creation.
 */
export const COMPLETED_SALE_SOURCE_DEFAULTS: Record<string, { priceBasis: NonNullable<MarketSale['priceBasis']>; statusBasis: string }> = {
  sold_comps: { priceBasis: 'sold', statusBasis: 'Sold-Comps completed-sale endpoint' },
  mercari_sold_comps: { priceBasis: 'sold', statusBasis: MERCARI_REPORTED_SOLD_PRICE_BASIS },
  '130point': { priceBasis: 'sold', statusBasis: '130point completed-sale endpoint' },
  the_card_api: { priceBasis: 'sold', statusBasis: 'The Card API completed-sale endpoint' },
  cardsight_ai: { priceBasis: 'sold', statusBasis: 'Cardsight.ai completed-sale endpoint' },
  lelands: { priceBasis: 'realized', statusBasis: 'Lelands realized-auction endpoint' },
  pristine_auction: { priceBasis: 'realized', statusBasis: 'Pristine Auction realized-auction endpoint' },
  collect_auction: { priceBasis: 'realized', statusBasis: 'Collect Auctions completed-sale endpoint via Parse.bot' },
  sirius_sports_auctions: { priceBasis: 'realized', statusBasis: 'Sirius closed-lot prices-realized archive' },
  pcgs_auction_results: { priceBasis: 'realized', statusBasis: 'PCGS auction-prices-realized endpoint' },
  weiss: { priceBasis: 'closed', statusBasis: 'Weiss completed-lot endpoint with final leading bid' },
};

const RESTRICTIVE_DISPOSITIONS = new Set<NonNullable<MarketSale['evidenceDisposition']>>([
  'warning_review',
  'context_only',
  'rejected_objective_conflict',
  'omitted_by_cap',
  'not_visually_reviewed_window',
]);

function sourceKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function isAutographTarget(target: ComparableTarget | undefined): boolean {
  const category = sourceKey(target?.category);
  const itemType = sourceKey(target?.itemType);
  return category === 'autographs' || itemType === 'signed_item' || itemType === 'autograph';
}

function safeText(value: unknown, maximum = 600): string | null {
  const text = typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim();
  return text ? text.slice(0, maximum) : null;
}

const ILLIQUID_MARKET_EXTENSION_CATEGORIES = new Set([
  'stamps',
  'vintage_toys',
  'autographs',
  'movies',
  'music',
  'disney_pins',
  'coins',
  'comics',
]);

function normalizedDate(value: unknown, nowMs: number, options?: { category?: string | null; allowIlliquidExtension?: boolean }): { date: string | null; recency: NonNullable<MarketSale['recency']> } {
  const text = safeText(value, 120);
  if (!text) return { date: null, recency: 'undated' };
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || parsed > nowMs) return { date: null, recency: 'undated' };
  const ageDays = Math.floor((nowMs - parsed) / 86_400_000);
  if (ageDays <= 365) return { date: new Date(parsed).toISOString(), recency: 'recent' };
  const category = sourceKey(options?.category);
  const canExtend = Boolean(options?.allowIlliquidExtension && ILLIQUID_MARKET_EXTENSION_CATEGORIES.has(category) && ageDays <= 730);
  return { date: new Date(parsed).toISOString(), recency: canExtend ? 'extended' : 'historical' };
}

function knownCurrency(value: unknown): string | null {
  const currency = safeText(value, 12)?.toUpperCase() ?? null;
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizedPriceBasis(value: unknown): NonNullable<MarketSale['priceBasis']> {
  const basis = safeText(value, 32)?.toLowerCase();
  return basis === 'realized' || basis === 'sold' || basis === 'closed' ? basis : 'unknown';
}

function normalizedVisualStatus(value: unknown): NonNullable<MarketSale['visualReviewStatus']> {
  return value === 'match' || value === 'rough_match' || value === 'mismatch' || value === 'unreadable' || value === 'not_reviewed'
    ? value
    : 'not_reviewed';
}

function uniqueReasons(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].slice(0, 20);
}

export type MarketEvidenceDecision = {
  sale: MarketSale;
  valuationEligible: boolean;
  reasons: string[];
};

export type MarketNormalizationOptions = {
  signingKey?: string; category?: string | null; target?: ComparableTarget; allowIlliquidExtension?: boolean;
  side?: ValuationUseSide; analysisRunId?: string; intakeOrdinal?: number;
};

/**
 * Fail closed for valuation while preserving every supplied row for the audit.
 * A known trusted completed-sale adapter may supply its fixed semantics, but an
 * arbitrary client record cannot self-attest its status, price basis, or date.
 */
export function normalizeAnalysisMarketSale(input: MarketSale, now = new Date(), options?: MarketNormalizationOptions): MarketEvidenceDecision {
  const nowMs = now.getTime();
  // A browser may carry an observation back from a source panel for display,
  // but it may not establish completed-sale facts. Rebuild the trusted facts
  // only when the short-lived server provenance reference verifies.
  const verification = verifyCanonicalObservation(input, { now, signingKey: options?.signingKey });
  const trustedInput = verification.verified ? verification.sale : input;
  const sourceId = sourceKey(trustedInput.sourceId || trustedInput.marketplace);
  const sourceDefault = COMPLETED_SALE_SOURCE_DEFAULTS[sourceId];
  // PCGS Auction Prices Realized has an intentionally narrower policy than the
  // general illiquid-market extension. Exact-grade PCGS rows older than one
  // year are useful for movement/trend context, but never become a current
  // value merely because no newer sale is available.
  const isPcgsAuctionResult = sourceId === 'pcgs_auction_results';
  const dateInfo = normalizedDate(trustedInput.date, nowMs, {
    ...options,
    allowIlliquidExtension: Boolean(options?.allowIlliquidExtension && !isPcgsAuctionResult),
  });
  const price = nullableTestAiPrice(trustedInput.price);
  const currency = knownCurrency(trustedInput.currency);
  const declaredStatus = trustedInput.saleStatus;
  const saleStatus: NonNullable<MarketSale['saleStatus']> = declaredStatus === 'completed' || declaredStatus === 'closed'
    ? 'completed'
    : declaredStatus === 'active'
      ? 'active'
      : 'unknown';
  const priceBasis = normalizedPriceBasis(trustedInput.priceBasis);
  const resolvedPriceBasis = priceBasis;
  const buyerPremium = trustedInput.buyerPremium === 'included' || trustedInput.buyerPremium === 'excluded'
    ? trustedInput.buyerPremium
    : 'unknown';
  const visualReviewStatus = normalizedVisualStatus(trustedInput.visualReviewStatus);
  // Autographs use broad market-range context, not exact-image identity. The
  // source filter marks these rows as not required; do not re-enable a
  // Mercari visual approval requirement at the final audit boundary.
  const autographNoVisual = isAutographTarget(options?.target) && sourceId === 'mercari_sold_comps';
  const visualRequirement = autographNoVisual ? 'not_required'
    : sourceId === 'mercari_sold_comps' || trustedInput.visualRequirement === 'required' ? 'required' : 'not_required';
  const identityApproval = verification.verified && options?.target
    ? getVerifiedIdentityApproval(trustedInput, options.target, options.target.approvalTargetImageReference)
    : null;
  const mercariUndated = Boolean(identityApproval && options?.target
    && hasVerifiedMercariUndatedSale(trustedInput, options.target, options.target.approvalTargetImageReference));
  const mercariAutographUndated = Boolean(autographNoVisual && verification.verified
    && trustedInput.saleDatePolicy === 'mercari_undated_sold_v1'
    && trustedInput.date === null && trustedInput.saleStatus === 'completed'
    && trustedInput.priceBasis === 'sold' && trustedInput.evidenceDisposition === 'valuation_eligible');
  const transactionLotConflict = verification.verified && signedTransactionLotConflict(options?.target, trustedInput);
  const transactionIdentityPresent = verification.verified && hasMeaningfulTransactionIdentity(trustedInput);
  const economics = evaluateAdapterEconomicPolicy({ ...trustedInput, sourceAdapter: sourceId, priceBasis: resolvedPriceBasis,
    buyerPremium, recency: dateInfo.recency });
  const statedTradeValue = options?.target?.statedTradeValue;
  const priceSafety = evaluateSoldCompPriceSafety(typeof statedTradeValue === 'number' && Number.isFinite(statedTradeValue)
    && statedTradeValue >= 0 ? statedTradeValue : undefined, price ?? NaN);
  const highValuePriceConflict = priceSafety.applies && priceSafety.status !== 'accepted';
  const inputReasons = Array.isArray(trustedInput.evidenceReasons) ? trustedInput.evidenceReasons.map((reason) => safeText(reason, 300)).filter((reason): reason is string => Boolean(reason)) : [];
  const restrictiveInputDisposition = RESTRICTIVE_DISPOSITIONS.has(trustedInput.evidenceDisposition as NonNullable<MarketSale['evidenceDisposition']>)
    ? trustedInput.evidenceDisposition
    : null;
  const reasons = [...inputReasons, ...verification.reasons];

  if (!verification.verified) reasons.push('server provenance is not verified; browser-carried source facts cannot influence valuation');
  if (!safeText(trustedInput.title, 600)) reasons.push('missing marketplace title');
  if (price === null || !Number.isFinite(price) || price <= 0) reasons.push('missing or non-positive realized price');
  if (!currency) reasons.push('sale currency is unknown; retained as context only');
  else if (currency !== 'USD') reasons.push(`unsupported currency ${currency}; retained as context only`);
  if (saleStatus !== 'completed') reasons.push(saleStatus === 'active' ? 'active asking listing is not a completed sale' : 'completed-sale status is not verifiable for this source');
  if (resolvedPriceBasis === 'unknown') reasons.push('price basis is not verifiable as sold, closed, or realized');
  if (economics.reason) reasons.push(economics.reason);
  if (!transactionIdentityPresent) reasons.push('meaningful observed provider record ID or valid listing/transaction URL is missing; retained as context only');
  if (highValuePriceConflict && priceSafety.reason) reasons.push(priceSafety.reason);
  if (mercariUndated) reasons.push('Qualified undated Mercari exception: sale date remains Unknown; timing is unverified and sold=true reported sold price is used as reported, not proof of a recent sale or a private accepted-offer amount.');
  if (mercariAutographUndated) reasons.push('Qualified Autographs market-context exception: exact visual review is not required; the verified sold=true reported price remains usable market evidence while sale date remains Unknown.');
  if (dateInfo.recency === 'undated' && !mercariUndated && !mercariAutographUndated) reasons.push('sale date is missing, invalid, or future-dated');
  if (dateInfo.recency === 'historical') reasons.push('sale date is older than one year');
  if (dateInfo.recency === 'extended') reasons.push('sale date is older than one year and is admitted only under the labeled illiquid-market extension policy');
  if (visualReviewStatus === 'mismatch') reasons.push(`visual comparison requires review${trustedInput.visualReviewRationale ? `: ${safeText(trustedInput.visualReviewRationale, 300)}` : ''}`);
  if (visualRequirement === 'required' && (visualReviewStatus !== 'match' || !identityApproval)) reasons.push('a required visual identity review has no valid server-final target/source/image-bound approval; retained for review');
  if (transactionLotConflict) reasons.push('signed transaction quantity or explicit lot/bundle sale form is not a single retail product; no guessed unit price is used');
  if (restrictiveInputDisposition) reasons.push(`source disposition retained: ${restrictiveInputDisposition}`);

  // Age changes the destination, not the authenticity of a completed sale.
  // Preserve every other existing financial, source and visual safeguard.
  const financiallyEligible = verification.verified
    && !restrictiveInputDisposition
    && price !== null
    && Number.isFinite(price)
    && price > 0
    && currency === 'USD'
    && saleStatus === 'completed'
    && resolvedPriceBasis !== 'unknown'
    && economics.eligible
    && transactionIdentityPresent
    && !highValuePriceConflict
    && visualReviewStatus !== 'mismatch'
    && !transactionLotConflict
    && (visualRequirement !== 'required' || (visualReviewStatus === 'match' && Boolean(identityApproval)));
  const valuationEligible = financiallyEligible
    && (sourceId === 'mercari_sold_comps' ? (mercariUndated || mercariAutographUndated) : dateInfo.recency === 'recent' || dateInfo.recency === 'extended');
  const historicMarketContextEligible = financiallyEligible
    && (dateInfo.recency === 'historical' || dateInfo.recency === 'extended');
  // Mirror the actual terms above, not free-form provider/visual rationale.
  // Missing title is deliberately not a term of the existing eligibility gate.
  const blockerCodes: NormalizationBlockerCode[] = [];
  if (!verification.verified) blockerCodes.push('PROVENANCE_UNVERIFIED');
  if (restrictiveInputDisposition) blockerCodes.push('SOURCE_DISPOSITION_RESTRICTIVE');
  if (price === null || !Number.isFinite(price) || price <= 0) blockerCodes.push('INVALID_PRICE');
  if (!currency) blockerCodes.push('UNKNOWN_CURRENCY');
  else if (currency !== 'USD') blockerCodes.push('UNSUPPORTED_CURRENCY');
  if (saleStatus !== 'completed') blockerCodes.push('NOT_COMPLETED');
  if (resolvedPriceBasis === 'unknown') blockerCodes.push('UNKNOWN_PRICE_BASIS');
  if (economics.blocker) blockerCodes.push(economics.blocker);
  if (!transactionIdentityPresent) blockerCodes.push('TRANSACTION_IDENTITY_MISSING');
  if (priceSafety.applies && priceSafety.status === 'too_low') blockerCodes.push('HIGH_VALUE_PRICE_TOO_LOW');
  if (priceSafety.applies && priceSafety.status === 'too_high') blockerCodes.push('HIGH_VALUE_PRICE_TOO_HIGH');
  if (dateInfo.recency === 'undated' && !mercariUndated && !mercariAutographUndated) blockerCodes.push('INVALID_DATE');
  if (dateInfo.recency === 'historical') blockerCodes.push('HISTORICAL_DATE');
  if (visualReviewStatus === 'mismatch') blockerCodes.push('VISUAL_MISMATCH');
  if (transactionLotConflict) blockerCodes.push('TRANSACTION_LOT_CONFLICT');
  if (transactionLotConflict && identityApproval) blockerCodes.push('APPROVED_LOT_CONFLICT');
  if (visualRequirement === 'required' && (visualReviewStatus !== 'match' || !identityApproval)) blockerCodes.push('REQUIRED_APPROVAL_MISSING');
  const warningCodes: string[] = [];
  if (!safeText(trustedInput.title, 600)) warningCodes.push('MISSING_TITLE');
  if (economics.warning) warningCodes.push(economics.warning);
  if (verification.verified && !transactionIdentity(trustedInput).providerRecordId && transactionIdentity(trustedInput).listingUrl) warningCodes.push('LISTING_REFERENCE_EVENT_AMBIGUITY');
  if (dateInfo.recency === 'extended') warningCodes.push('ILLIQUID_EXTENSION_DIAGNOSTIC');
  if (mercariUndated) warningCodes.push('MERCARI_UNDATED_TIMING_UNVERIFIED', 'MERCARI_SOLD_TRUE_PRICE_AS_REPORTED');
  const sourceCorrelation = boundedFinalSourceCorrelation(input);
  const analysisIntake = {
    version: FINAL_VALUATION_USE_VERSION,
    auditRef: makeFinalAuditRef({ side: options?.side, analysisRunId: options?.analysisRunId ?? randomUUID(),
      intakeOrdinal: options?.intakeOrdinal ?? 0, sourceCorrelation,
      displayCorrelation: boundedFinalDisplayCorrelation(input.displayCorrelation),
      verifiedObservationId: verification.verified ? trustedInput.observationId : null,
      verifiedCanonicalTransactionId: verification.verified ? trustedInput.canonicalTransactionId : null }),
    sourceAdmission: {
      reportedDisposition: safeText(input.evidenceDisposition, 80),
      reportedVisualReviewStatus: safeText(input.visualReviewStatus, 40),
      verifiedSourceId: verification.verified ? sourceId || null : null,
      verifiedSourceDisposition: verification.verified ? safeText(trustedInput.evidenceDisposition, 80) : null,
      verification: verification.verified ? 'verified' as const : 'unverified' as const,
      normalizationEligible: valuationEligible, historicMarketContextEligible, blockerCodes, warningCodes,
      reasonDetails: uniqueReasons(reasons).slice(0, 40),
    },
  };
  const evidenceDisposition: NonNullable<MarketSale['evidenceDisposition']> = valuationEligible
    ? 'valuation_eligible'
    : restrictiveInputDisposition === 'rejected_objective_conflict'
      ? 'rejected_objective_conflict'
      : restrictiveInputDisposition === 'omitted_by_cap'
        ? 'omitted_by_cap'
        : restrictiveInputDisposition === 'not_visually_reviewed_window'
          ? 'not_visually_reviewed_window'
          : restrictiveInputDisposition === 'warning_review' || visualReviewStatus === 'mismatch'
            ? 'warning_review'
            : 'context_only';

  const sale: MarketSale = {
    title: safeText(trustedInput.title, 600),
    price,
    currency,
    date: dateInfo.date,
    recency: dateInfo.recency,
    ...(verification.verified && trustedInput.saleDatePolicy ? { saleDatePolicy: trustedInput.saleDatePolicy } : {}),
    marketplace: safeText(trustedInput.marketplace, 160),
    originMarketplace: safeText(trustedInput.originMarketplace, 160),
    sourceId: verification.verified ? sourceId || null : null,
    sourceAdapter: verification.verified ? (trustedInput.sourceAdapter ?? sourceId ?? null) : null,
    sourceLabel: verification.verified ? safeText(trustedInput.sourceLabel, 160) : 'Unverified client observation',
    saleId: safeText(trustedInput.saleId, 240),
    url: safeText(trustedInput.url, 1_500),
    saleStatus,
    completedStatusBasis: safeText(trustedInput.completedStatusBasis, 240) || sourceDefault?.statusBasis || null,
    priceBasis: resolvedPriceBasis,
    visualRequirement,
    visualReviewStatus,
    visualReviewRationale: safeText(trustedInput.visualReviewRationale, 300),
    buyerPremium,
    shipping: trustedInput.shipping ?? 'unknown',
    tax: trustedInput.tax ?? 'unknown',
    saleForm: safeText(trustedInput.saleForm, 80),
    lotQuantity: Number.isInteger(Number(trustedInput.lotQuantity)) && Number(trustedInput.lotQuantity) > 0 ? Number(trustedInput.lotQuantity) : null,
    observationId: verification.verified ? trustedInput.observationId ?? null : null,
    canonicalTransactionId: verification.verified ? trustedInput.canonicalTransactionId ?? null : null,
    duplicateStatus: trustedInput.duplicateStatus ?? 'unique',
    provenance: verification.verified ? trustedInput.provenance ?? null : null,
    evidenceDisposition,
    evidenceReasons: uniqueReasons(reasons),
    ...(identityApproval ? { identityApproval } : {}),
    ...(identityApproval ? { visualEvidence: identityApproval.decidingEvidence } : {}),
    ...(identityApproval?.candidateIdentityFields !== undefined ? { normalizedStructuredMetadata: trustedInput.normalizedStructuredMetadata } : {}),
    // These remain display diagnostics from the transported source row. They
    // never mint authority, change economic facts, or supply scoring points.
    visualAudit: input.visualAudit,
    visualDifferences: Array.isArray(input.visualDifferences) ? input.visualDifferences.slice(0, 30) : null,
    metadataMatchScore: Number.isFinite(input.metadataMatchScore) ? input.metadataMatchScore : null,
    metadataMatchRank: Number.isInteger(input.metadataMatchRank) ? input.metadataMatchRank : null,
    metadataMatchReasons: Array.isArray(input.metadataMatchReasons) ? input.metadataMatchReasons.slice(0, 40) : null,
    metadataFieldComparisons: Array.isArray(input.metadataFieldComparisons) ? input.metadataFieldComparisons.slice(0, 40) : null,
    metadataRanking: sourceCorrelation.metadataRanking,
    metadataOriginOccurrenceKey: sourceCorrelation.metadataOriginOccurrenceKey,
    metadataUnknownFields: Array.isArray(input.metadataUnknownFields) ? input.metadataUnknownFields.slice(0, 40) : null,
    metadataScoreAwards: Array.isArray(input.metadataScoreAwards) ? input.metadataScoreAwards.slice(0, 40) : null,
    metadataMatchLabel: safeText(input.metadataMatchLabel, 160),
    reportedVisualExecution: boundedDiagnosticVisualExecution(input.visualExecution),
    displayCorrelation: analysisIntake.auditRef.displayCorrelation,
    analysisIntake,
  };
  retainServerNormalizationReport(sale, analysisIntake);
  if ((valuationEligible || historicMarketContextEligible) && identityApproval) transferVerifiedIdentityApproval(trustedInput, sale);
  return { sale, valuationEligible, reasons: sale.evidenceReasons ?? [] };
}

export function normalizeAnalysisMarketSales(inputs: MarketSale[] | null | undefined, now = new Date(), options?: Omit<MarketNormalizationOptions, 'allowIlliquidExtension' | 'intakeOrdinal'>): MarketSale[] {
  const analysisRunId = options?.analysisRunId ?? randomUUID();
  const strict = (inputs ?? []).map((input, intakeOrdinal) => normalizeAnalysisMarketSale(input, now, { ...options, analysisRunId, intakeOrdinal }).sale);
  // Reuse actual final admission: a recent wrong-target observation must not
  // suppress a permitted older exact comparable. Without a target, preserve
  // the existing conservative financial-only behavior for legacy callers.
  if (strict.some((sale) => isCompletedSaleCandidate(sale, now.getTime(), options?.target)
    && (!options?.target || scoreComparable(options.target, sale).accepted))) return strict;
  const category = sourceKey(options?.category);
  if (!ILLIQUID_MARKET_EXTENSION_CATEGORIES.has(category)) return strict;
  return (inputs ?? []).map((input, intakeOrdinal) => normalizeAnalysisMarketSale(input, now, {
    signingKey: options?.signingKey,
    category,
    target: options?.target,
    side: options?.side,
    analysisRunId,
    intakeOrdinal,
    allowIlliquidExtension: true,
  }).sale);
}
