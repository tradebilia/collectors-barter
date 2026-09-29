import type { MarketSale } from './testAiComparableEngine';
import { verifyCanonicalObservation } from './testAiCanonicalObservation';

/**
 * The Test AI client may transport marketplace observations, but it never gets
 * to promote an observation into valuation evidence. This module is the
 * server-side admission decision used immediately before snapshot creation.
 */
const COMPLETED_SALE_SOURCE_DEFAULTS: Record<string, { priceBasis: NonNullable<MarketSale['priceBasis']>; statusBasis: string }> = {
  sold_comps: { priceBasis: 'sold', statusBasis: 'Sold-Comps completed-sale endpoint' },
  '130point': { priceBasis: 'sold', statusBasis: '130point completed-sale endpoint' },
  the_card_api: { priceBasis: 'sold', statusBasis: 'The Card API completed-sale endpoint' },
  cardsight_ai: { priceBasis: 'sold', statusBasis: 'Cardsight.ai completed-sale endpoint' },
  lelands: { priceBasis: 'realized', statusBasis: 'Lelands realized-auction endpoint' },
  pristine_auction: { priceBasis: 'realized', statusBasis: 'Pristine Auction realized-auction endpoint' },
  pcgs_auction_results: { priceBasis: 'realized', statusBasis: 'PCGS auction-prices-realized endpoint' },
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

/**
 * Fail closed for valuation while preserving every supplied row for the audit.
 * A known trusted completed-sale adapter may supply its fixed semantics, but an
 * arbitrary client record cannot self-attest its status, price basis, or date.
 */
export function normalizeAnalysisMarketSale(input: MarketSale, now = new Date(), options?: { signingKey?: string; category?: string | null; allowIlliquidExtension?: boolean }): MarketEvidenceDecision {
  const nowMs = now.getTime();
  // A browser may carry an observation back from a source panel for display,
  // but it may not establish completed-sale facts. Rebuild the trusted facts
  // only when the short-lived server provenance reference verifies.
  const verification = verifyCanonicalObservation(input, { now, signingKey: options?.signingKey });
  const trustedInput = verification.verified ? verification.sale : input;
  const sourceId = sourceKey(trustedInput.sourceId || trustedInput.marketplace);
  const sourceDefault = COMPLETED_SALE_SOURCE_DEFAULTS[sourceId];
  const dateInfo = normalizedDate(trustedInput.date, nowMs, options);
  const price = Number(trustedInput.price);
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
  const visualRequirement = trustedInput.visualRequirement === 'required' ? 'required' : 'not_required';
  const inputReasons = Array.isArray(trustedInput.evidenceReasons) ? trustedInput.evidenceReasons.map((reason) => safeText(reason, 300)).filter((reason): reason is string => Boolean(reason)) : [];
  const restrictiveInputDisposition = RESTRICTIVE_DISPOSITIONS.has(trustedInput.evidenceDisposition as NonNullable<MarketSale['evidenceDisposition']>)
    ? trustedInput.evidenceDisposition
    : null;
  const reasons = [...inputReasons, ...verification.reasons];

  if (!verification.verified) reasons.push('server provenance is not verified; browser-carried source facts cannot influence valuation');
  if (!safeText(trustedInput.title, 600)) reasons.push('missing marketplace title');
  if (!Number.isFinite(price) || price <= 0) reasons.push('missing or non-positive realized price');
  if (!currency) reasons.push('sale currency is unknown; retained as context only');
  else if (currency !== 'USD') reasons.push(`unsupported currency ${currency}; retained as context only`);
  if (saleStatus !== 'completed') reasons.push(saleStatus === 'active' ? 'active asking listing is not a completed sale' : 'completed-sale status is not verifiable for this source');
  if (resolvedPriceBasis === 'unknown') reasons.push('price basis is not verifiable as sold, closed, or realized');
  if (resolvedPriceBasis === 'realized' && buyerPremium !== 'included') reasons.push('auction buyer premium is not confirmed included in the realized price; retained as context only');
  if (dateInfo.recency === 'undated') reasons.push('sale date is missing, invalid, or future-dated');
  if (dateInfo.recency === 'historical') reasons.push('sale date is older than one year');
  if (dateInfo.recency === 'extended') reasons.push('sale date is older than one year and is admitted only under the labeled illiquid-market extension policy');
  if (visualReviewStatus === 'mismatch') reasons.push(`visual comparison requires review${trustedInput.visualReviewRationale ? `: ${safeText(trustedInput.visualReviewRationale, 300)}` : ''}`);
  if (visualRequirement === 'required' && visualReviewStatus !== 'match' && visualReviewStatus !== 'rough_match') reasons.push('a required visual identity review is not confirmed');
  if (restrictiveInputDisposition) reasons.push(`source disposition retained: ${restrictiveInputDisposition}`);

  const valuationEligible = verification.verified
    && !restrictiveInputDisposition
    && Number.isFinite(price)
    && price > 0
    && currency === 'USD'
    && saleStatus === 'completed'
    && resolvedPriceBasis !== 'unknown'
    && (resolvedPriceBasis !== 'realized' || buyerPremium === 'included')
    && (dateInfo.recency === 'recent' || dateInfo.recency === 'extended')
    && visualReviewStatus !== 'mismatch'
    && (visualRequirement !== 'required' || visualReviewStatus === 'match' || visualReviewStatus === 'rough_match');
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
    price: Number.isFinite(price) ? price : null,
    currency,
    date: dateInfo.date,
    recency: dateInfo.recency,
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
  };
  return { sale, valuationEligible, reasons: sale.evidenceReasons ?? [] };
}

export function normalizeAnalysisMarketSales(inputs: MarketSale[] | null | undefined, now = new Date(), options?: { signingKey?: string; category?: string | null }): MarketSale[] {
  const strict = (inputs ?? []).map((input) => normalizeAnalysisMarketSale(input, now, { signingKey: options?.signingKey, category: options?.category }).sale);
  // The extension is intentionally a second, explicit pass. Any available
  // current-window valuation record prevents older evidence from entering.
  if (strict.some((sale) => sale.evidenceDisposition === 'valuation_eligible')) return strict;
  const category = sourceKey(options?.category);
  if (!ILLIQUID_MARKET_EXTENSION_CATEGORIES.has(category)) return strict;
  return (inputs ?? []).map((input) => normalizeAnalysisMarketSale(input, now, {
    signingKey: options?.signingKey,
    category,
    allowIlliquidExtension: true,
  }).sale);
}
