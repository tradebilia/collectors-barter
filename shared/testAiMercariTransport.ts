import { deriveMercariObservedCurrency, type MercariObservationReport, type MercariListingStatus, type MercariRequestedMode } from './testAiMercariObservation';

export type MercariTransportListing = {
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  saleId?: string | null;
  itemId?: string | number | null;
  url?: string | null;
  itemUrl?: string | null;
  itemWebUrl?: string | null;
  sourceLabel?: string | null;
  marketplace?: string | null;
  mercariObservation?: MercariObservationReport | null;
  listingStatus?: MercariListingStatus | null;
  [field: string]: unknown;
};

export type MercariAnalysisSale = MercariTransportListing & {
  sourceId: 'mercari_sold_comps'; sourceAdapter: 'mercari_sold_comps' | null; originMarketplace: 'mercari';
  saleStatus: 'completed' | 'active' | 'unknown'; priceBasis: 'sold' | 'unknown'; completedStatusBasis: string | null;
  date: null; endedAt: null; recency: 'undated';
  saleDatePolicy: 'mercari_undated_sold_v1' | null;
  buyerPremium: unknown; shipping: unknown; tax: unknown;
  evidenceDisposition: 'valuation_eligible' | 'context_only' | 'warning_review' | 'rejected_objective_conflict' | 'omitted_by_cap' | 'not_visually_reviewed_window' | null;
  evidenceReasons: string[] | null;
  provenanceToken: string | null; provenance: unknown; identityApproval: unknown;
  observationId: unknown; canonicalTransactionId: unknown;
};

const own = (record: object, field: string) => Object.prototype.hasOwnProperty.call(record, field);
const isStatus = (value: unknown): value is MercariListingStatus => value === 'sold' || value === 'active' || value === 'unknown';

const objectFields = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
export const MERCARI_UNDATED_SOLD_POLICY = 'mercari_undated_sold_v1' as const;

/** Shape recognition for lossless handoff/presentation ONLY, not authentication.
 * The server must verify the token and its signed facts/identity target. Never
 * generate a token, approval, completion overlay or date from browser flags.
 */
export function hasMercariUndatedSoldAdmission(sale: MercariTransportListing, requestedMode?: unknown): sale is MercariAnalysisSale {
  if (requestedMode === 'active' || sale.requestedMode === 'active' || sale.mercariObservation?.requestedMode === 'active') return false;
  const provenance = objectFields(sale.provenance);
  const approval = objectFields(sale.identityApproval);
  const basis = sale.completedStatusBasis;
  return sale.sourceId === 'mercari_sold_comps' && sale.sourceAdapter === 'mercari_sold_comps'
    && sale.originMarketplace === 'mercari' && sale.saleDatePolicy === MERCARI_UNDATED_SOLD_POLICY
    && sale.date === null && sale.endedAt === null && sale.recency === 'undated'
    && sale.saleStatus === 'completed' && sale.priceBasis === 'sold'
    && typeof sale.price === 'number' && Number.isFinite(sale.price) && sale.price > 0 && sale.currency === 'USD'
    && typeof basis === 'string' && /Sold[- ]Comps/i.test(basis) && /Mercari/i.test(basis)
    && /sold\s*=\s*true/i.test(basis) && /reported sold price/i.test(basis)
    && sale.visualRequirement === 'required' && sale.visualReviewStatus === 'match'
    && sale.evidenceDisposition === 'valuation_eligible'
    && typeof sale.provenanceToken === 'string' && Boolean(sale.provenanceToken.trim())
    && provenance?.adapterId === 'mercari_sold_comps' && provenance.originMarketplace === 'mercari'
    && approval?.status === 'approved' && approval.origin === 'server_final_visual' && approval.verdict === 'match'
    && approval.adapterId === 'mercari_sold_comps' && approval.originMarketplace === 'mercari';
}

/** Provider status conflicts stay diagnostic in sold mode. Actual active-mode
 * requests remain active context, regardless of a contradictory sold row. */
export function mercariTransportStatus(sale: MercariTransportListing): MercariListingStatus {
  if (sale.requestedMode === 'active' || sale.mercariObservation?.requestedMode === 'active') return 'active';
  if (hasMercariUndatedSoldAdmission(sale)) return 'sold';
  const mode = sale.requestedMode ?? sale.mercariObservation?.requestedMode;
  if (mode === 'sold') return 'sold';
  const reportStatus = sale.mercariObservation?.version === 1 ? sale.mercariObservation.listingStatus : undefined;
  const observedStatus = sale.mercariObservation?.version === 1 ? sale.mercariObservation.observedStatus : undefined;
  if (observedStatus === 'active' || reportStatus === 'active' || sale.listingStatus === 'active' || sale.saleStatus === 'active') return 'active';
  if (!isStatus(observedStatus) || observedStatus === 'unknown') return 'unknown';
  if (!isStatus(reportStatus) || reportStatus === 'unknown' || sale.listingStatus === 'unknown') return 'unknown';
  return reportStatus;
}

export function mercariPriceContextLabel(sale: MercariTransportListing): string {
  if (hasMercariUndatedSoldAdmission(sale)) return 'Reported sold price · Sale date: Unknown · Mercari date exception';
  const status = mercariTransportStatus(sale);
  if (status !== 'sold' && (sale.requestedMode === 'sold' || sale.mercariObservation?.requestedMode === 'sold')
    && sale.requestedMode !== 'active' && sale.mercariObservation?.requestedMode !== 'active') return 'Sold-mode Mercari listing; reported price, final amount unverified';
  return status === 'sold' ? 'Provider-labeled sold listing; reported price, final amount unverified'
    : status === 'active' ? 'Active asking-price context' : 'Status unknown/conflicting';
}

function projectedCurrency(sale: MercariTransportListing): string | null {
  // An explicit null is not repaired from any alias, endpoint or report.
  if (own(sale, 'currency') && sale.currency === null) return null;
  const report = sale.mercariObservation;
  // Without the original report, a legacy USD overlay is not an observation.
  const currency = report?.version === 1 && report.fields && typeof report.fields === 'object' ? deriveMercariObservedCurrency(report) : null;
  if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency)) return null;
  if (own(sale, 'currency') && sale.currency !== currency) return null;
  // Route/transport deliberately clear economic aliases to null. Original
  // presence/conflicts were already checked from report.fields, so a neutral
  // generated null cannot erase the separately observed listing currency.
  if (own(sale, 'soldCurrency') && sale.soldCurrency !== null && sale.soldCurrency !== currency) return null;
  return currency;
}

function ownDataFields(row: MercariTransportListing): MercariTransportListing {
  const copy: MercariTransportListing = {};
  for (const key of Object.keys(row)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const descriptor = Object.getOwnPropertyDescriptor(row, key);
    if (descriptor && 'value' in descriptor) Object.defineProperty(copy, key, { value: descriptor.value, enumerable: true, writable: true, configurable: true });
  }
  return copy;
}

/**
 * One Mercari handoff for A and B. Copy diagnostics/metadata/ranks/images and
 * occurrence bindings, preserve the original typed observation report, and
 * preserve only the new policy-bearing receipt shape for server verification.
 * Legacy rows still neutralize stale provider/browser approval overlays.
 * This maps only the supplied operational listings subset: no union/partition
 * append, filtering, deduplication, reorder, cap or intake refill occurs here.
 */
export function buildMercariAnalysisSales(
  data: { listings?: readonly MercariTransportListing[] | null; requestedMode?: unknown } | null | undefined,
  enabled: boolean,
): MercariAnalysisSale[] {
  if (!enabled || !Array.isArray(data?.listings)) return [];
  return data.listings.map((input) => {
    const sale = ownDataFields(input);
    if (data?.requestedMode === 'active') sale.requestedMode = 'active';
    if (hasMercariUndatedSoldAdmission(sale, data?.requestedMode)) {
      const projected: MercariAnalysisSale = { ...sale, listingStatus: 'sold',
        // Do not claim browser verification or carry stale final-use overlays.
        verified: false, trusted: false, approved: false, serverFinalApprovalVerified: false,
        approval: null, serverFinalApproval: null, trustedIdentityApproval: null, serverFinalIdentityApproval: null,
        valuationUse: null, economicAdmission: null,
      };
      // The signed exception is undated. Retrieval timestamps remain diagnostics,
      // never a sale date; legacy date aliases cannot repair canonical nulls.
      for (const field of ['soldAt', 'soldDate', 'saleDate', 'completedAt']) {
        if (own(sale, field)) projected[field] = null;
      }
      return projected;
    }
    const listingStatus = mercariTransportStatus(sale);
    const report = sale.mercariObservation;
    const observedPrice = report?.version === 1 ? report.fields?.price : undefined;
    const price = own(sale, 'price') && sale.price === null ? null
      : report?.version === 1 ? observedPrice?.present ? observedPrice.value : null : sale.price;
    const held = sale.evidenceDisposition;
    const disposition = held === null || held === 'context_only' || held === 'warning_review' || held === 'rejected_objective_conflict' || held === 'omitted_by_cap' || held === 'not_visually_reviewed_window' ? held : 'context_only';
    const projected: MercariAnalysisSale = {
      ...sale,
      mercariObservation: own(sale, 'mercariObservation') ? sale.mercariObservation : null,
      listingStatus,
      price: typeof price === 'string' || typeof price === 'number' ? price : null,
      currency: projectedCurrency(sale),
      sourceId: 'mercari_sold_comps',
      sourceAdapter: null,
      sourceLabel: own(sale, 'sourceLabel') ? sale.sourceLabel : 'Mercari listing context',
      marketplace: own(sale, 'marketplace') ? sale.marketplace : 'Mercari',
      originMarketplace: 'mercari',
      saleStatus: listingStatus === 'active' ? 'active' : 'unknown',
      priceBasis: 'unknown',
      completedStatusBasis: null,
      date: null,
      endedAt: null,
      recency: 'undated',
      saleDatePolicy: null,
      completed: false,
      confirmed: false,
      sold: false,
      isCompleted: false,
      isConfirmed: false,
      isSold: false,
      verified: false,
      trusted: false,
      approved: false,
      serverFinalApprovalVerified: false,
      evidenceDisposition: disposition,
      evidenceReasons: Array.isArray(sale.evidenceReasons) ? sale.evidenceReasons.filter((reason: unknown): reason is string => typeof reason === 'string').slice(0, 20) : null,
      buyerPremium: 'unknown',
      shipping: 'unknown',
      tax: 'unknown',
      canonicalCandidate: null,
      canonicalObservation: null,
      canonical: null,
      sourceEconomics: null,
      economics: null,
      provenanceToken: null,
      provenance: null,
      identityApproval: null,
      approval: null,
      serverFinalApproval: null,
      trustedIdentityApproval: null,
      serverFinalIdentityApproval: null,
      valuationUse: null,
      economicAdmission: null,
      observationId: null,
      canonicalTransactionId: null,
    };
    // Stop null-coalescing legacy presentation from repairing authoritative
    // unknown price/currency/date with favorable aliases. Originals are retained
    // under mercariObservation.fields, never rewritten into sale-event facts.
    for (const field of ['soldPrice', 'salePrice', 'finalPrice', 'transactionPrice', 'currentPrice', 'current_price', 'amount', 'soldCurrency', 'soldAt', 'soldDate', 'saleDate', 'completedAt']) {
      if (own(sale, field)) projected[field] = null;
    }
    if (!own(sale, 'url')) {
      const url = own(sale, 'itemUrl') ? sale.itemUrl : sale.itemWebUrl;
      if (url !== undefined) projected.url = url;
    }
    if (!own(sale, 'saleId')) {
      const saleId = sale.sourceRecordId ?? sale.itemId ?? sale.id ?? sale.url ?? sale.itemUrl ?? sale.itemWebUrl;
      if (typeof saleId === 'string' || saleId === null) projected.saleId = saleId;
    }
    return projected;
  });
}

export type MercariMeasuredPopulation = {
  requestedMode?: MercariRequestedMode;
  returnedRecordCount?: number;
  retainedListingCount?: number;
  providerSoldListingCount?: number;
  activeListingCount?: number;
  unknownListingCount?: number;
};

const measured = (value: unknown): number | undefined => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

/** Measured server ledger counts only. Legacy subsets are not population counts;
 * absent, null or malformed measurements remain undefined, never fabricated 0.
 */
export function mercariMeasuredPopulation(data: {
  requestedMode?: unknown;
  statusCounts?: Partial<MercariMeasuredPopulation> | null;
  sourcePopulation?: { queryReturnedObservationCount?: unknown } | null;
  returnedPopulations?: { soldListings?: readonly unknown[]; activeListings?: readonly unknown[]; unknownListings?: readonly unknown[] } | null;
} | null | undefined): MercariMeasuredPopulation {
  const partitions = data?.returnedPopulations;
  const sold = measured(data?.statusCounts?.providerSoldListingCount) ?? (Array.isArray(partitions?.soldListings) ? partitions.soldListings.length : undefined);
  const active = measured(data?.statusCounts?.activeListingCount) ?? (Array.isArray(partitions?.activeListings) ? partitions.activeListings.length : undefined);
  const unknown = measured(data?.statusCounts?.unknownListingCount) ?? (Array.isArray(partitions?.unknownListings) ? partitions.unknownListings.length : undefined);
  const retained = measured(data?.statusCounts?.retainedListingCount)
    ?? (sold !== undefined && active !== undefined && unknown !== undefined ? sold + active + unknown : undefined);
  return {
    requestedMode: data?.requestedMode === 'sold' || data?.requestedMode === 'active' ? data.requestedMode : undefined,
    // Complete measured query observations may overlap. Do not replace missing
    // or partial raw totals with the deduplicated retained union.
    returnedRecordCount: measured(data?.sourcePopulation?.queryReturnedObservationCount),
    retainedListingCount: retained,
    providerSoldListingCount: sold,
    activeListingCount: active,
    unknownListingCount: unknown,
  };
}
