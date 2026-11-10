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
  sourceId: 'mercari_sold_comps'; sourceAdapter: null; originMarketplace: 'mercari';
  saleStatus: 'active' | 'unknown'; priceBasis: 'unknown'; completedStatusBasis: null;
  date: null; endedAt: null; recency: 'undated';
  buyerPremium: 'unknown'; shipping: 'unknown'; tax: 'unknown';
  evidenceDisposition: 'context_only' | 'warning_review' | 'rejected_objective_conflict' | 'omitted_by_cap' | 'not_visually_reviewed_window' | null;
  evidenceReasons: string[] | null;
  provenanceToken: null; provenance: null; identityApproval: null;
  observationId: null; canonicalTransactionId: null;
};

const own = (record: object, field: string) => Object.prototype.hasOwnProperty.call(record, field);
const isStatus = (value: unknown): value is MercariListingStatus => value === 'sold' || value === 'active' || value === 'unknown';

/** The report is diagnostic, not private adapter ownership or financial authority.
 * Do not reclassify provider aliases in the browser. Only restrictive status
 * projections may supplement the report; an active hold can never become sold.
 */
export function mercariTransportStatus(sale: MercariTransportListing): MercariListingStatus {
  const reportStatus = sale.mercariObservation?.version === 1 ? sale.mercariObservation.listingStatus : undefined;
  const observedStatus = sale.mercariObservation?.version === 1 ? sale.mercariObservation.observedStatus : undefined;
  if (observedStatus === 'active' || reportStatus === 'active' || sale.listingStatus === 'active' || sale.saleStatus === 'active') return 'active';
  if (!isStatus(observedStatus) || observedStatus === 'unknown') return 'unknown';
  if (!isStatus(reportStatus) || reportStatus === 'unknown' || sale.listingStatus === 'unknown') return 'unknown';
  return reportStatus;
}

export function mercariPriceContextLabel(sale: MercariTransportListing): string {
  const status = mercariTransportStatus(sale);
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
 * neutralize stale provider/browser economic and canonical approval overlays.
 * Neither sold mode, a sold label nor image success establishes a final sale.
 * This maps only the supplied operational listings subset: no union/partition
 * append, filtering, deduplication, reorder, cap or intake refill occurs here.
 */
export function buildMercariAnalysisSales(
  data: { listings?: readonly MercariTransportListing[] | null } | null | undefined,
  enabled: boolean,
): MercariAnalysisSale[] {
  if (!enabled || !Array.isArray(data?.listings)) return [];
  return data.listings.map((input) => {
    const sale = ownDataFields(input);
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
