import type { MarketSale } from './testAiComparableEngine';

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

function normalizedDate(value: unknown, nowMs: number): { date: string | null; recency: NonNullable<MarketSale['recency']> } {
  const text = safeText(value, 120);
  if (!text) return { date: null, recency: 'undated' };
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || parsed > nowMs) return { date: null, recency: 'undated' };
  const ageDays = Math.floor((nowMs - parsed) / 86_400_000);
  return { date: new Date(parsed).toISOString(), recency: ageDays <= 365 ? 'recent' : 'historical' };
}

function knownCurrency(value: unknown): string {
  return safeText(value, 12)?.toUpperCase() || 'USD';
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
export function normalizeAnalysisMarketSale(input: MarketSale, now = new Date()): MarketEvidenceDecision {
  const nowMs = now.getTime();
  const sourceId = sourceKey(input.sourceId || input.marketplace);
  const sourceDefault = COMPLETED_SALE_SOURCE_DEFAULTS[sourceId];
  const dateInfo = normalizedDate(input.date, nowMs);
  const price = Number(input.price);
  const currency = knownCurrency(input.currency);
  const declaredStatus = input.saleStatus;
  const saleStatus: NonNullable<MarketSale['saleStatus']> = declaredStatus === 'completed' || declaredStatus === 'closed'
    ? 'completed'
    : declaredStatus === 'active'
      ? 'active'
      : sourceDefault
        ? 'completed'
        : 'unknown';
  const priceBasis = normalizedPriceBasis(input.priceBasis);
  const resolvedPriceBasis = priceBasis === 'unknown' && sourceDefault ? sourceDefault.priceBasis : priceBasis;
  const visualReviewStatus = normalizedVisualStatus(input.visualReviewStatus);
  const inputReasons = Array.isArray(input.evidenceReasons) ? input.evidenceReasons.map((reason) => safeText(reason, 300)).filter((reason): reason is string => Boolean(reason)) : [];
  const restrictiveInputDisposition = RESTRICTIVE_DISPOSITIONS.has(input.evidenceDisposition as NonNullable<MarketSale['evidenceDisposition']>)
    ? input.evidenceDisposition
    : null;
  const reasons = [...inputReasons];

  if (!safeText(input.title, 600)) reasons.push('missing marketplace title');
  if (!Number.isFinite(price) || price <= 0) reasons.push('missing or non-positive realized price');
  if (currency !== 'USD') reasons.push(`unsupported currency ${currency}; retained as context only`);
  if (saleStatus !== 'completed') reasons.push(saleStatus === 'active' ? 'active asking listing is not a completed sale' : 'completed-sale status is not verifiable for this source');
  if (resolvedPriceBasis === 'unknown') reasons.push('price basis is not verifiable as sold, closed, or realized');
  if (dateInfo.recency === 'undated') reasons.push('sale date is missing, invalid, or future-dated');
  if (dateInfo.recency === 'historical') reasons.push('sale date is older than one year');
  if (visualReviewStatus === 'mismatch') reasons.push(`visual comparison requires review${input.visualReviewRationale ? `: ${safeText(input.visualReviewRationale, 300)}` : ''}`);
  if (restrictiveInputDisposition) reasons.push(`source disposition retained: ${restrictiveInputDisposition}`);

  const valuationEligible = !restrictiveInputDisposition
    && Number.isFinite(price)
    && price > 0
    && currency === 'USD'
    && saleStatus === 'completed'
    && resolvedPriceBasis !== 'unknown'
    && dateInfo.recency === 'recent'
    && visualReviewStatus !== 'mismatch';
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
    title: safeText(input.title, 600),
    price: Number.isFinite(price) ? price : null,
    currency,
    date: dateInfo.date,
    recency: dateInfo.recency,
    marketplace: safeText(input.marketplace, 160),
    sourceId: sourceId || null,
    sourceLabel: safeText(input.sourceLabel, 160),
    saleId: safeText(input.saleId, 240),
    url: safeText(input.url, 1_500),
    saleStatus,
    completedStatusBasis: safeText(input.completedStatusBasis, 240) || sourceDefault?.statusBasis || null,
    priceBasis: resolvedPriceBasis,
    visualReviewStatus,
    visualReviewRationale: safeText(input.visualReviewRationale, 300),
    evidenceDisposition,
    evidenceReasons: uniqueReasons(reasons),
  };
  return { sale, valuationEligible, reasons: sale.evidenceReasons ?? [] };
}

export function normalizeAnalysisMarketSales(inputs: MarketSale[] | null | undefined, now = new Date()): MarketSale[] {
  return (inputs ?? []).map((input) => normalizeAnalysisMarketSale(input, now).sale);
}
