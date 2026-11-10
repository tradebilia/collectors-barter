export type MercariRequestedMode = 'sold' | 'active';
export type MercariListingStatus = 'sold' | 'active' | 'unknown';
export type MercariObservedField = Readonly<{ present: boolean; type: string; value?: unknown }>;
/** Transportable diagnostics only: this report is not provenance, signing or admission authority. */
export type MercariObservationReport = Readonly<{
  version: 1;
  requestedMode: MercariRequestedMode;
  observedStatus: MercariListingStatus;
  listingStatus: MercariListingStatus;
  statusIssues: readonly string[];
  economicIssues: readonly string[];
  priceContext: 'sold_listing_reported' | 'active_asking' | 'unknown';
  fields: Readonly<Record<string, MercariObservedField>>;
  originalMetadata?: Readonly<Record<string, unknown>>;
  responseScrapedAt?: MercariObservedField;
}>;

/** Limits apply to copied diagnostics, not the existing scalar transport validator or query budget. */
export const MERCARI_OBSERVATION_LIMITS = Object.freeze({ maxDepth: 5, maxNodes: 600, maxEntries: 80, maxKeyLength: 256, maxStringLength: 4096, maxIssues: 40 });
export const MERCARI_OBSERVATION_FIELDS = Object.freeze([
  'status', 'saleStatus', 'listingStatus', 'sold', 'completed', 'confirmed', 'isSold', 'isCompleted', 'isConfirmed',
  'active', 'isActive', 'cancelled', 'canceled', 'isCancelled', 'isCanceled', 'cancellationStatus', 'verified',
  'price', 'originalPrice', 'currency', 'soldPrice', 'soldCurrency', 'finalPrice', 'salePrice', 'transactionPrice',
  'acceptedOfferPrice', 'acceptedOfferAmount', 'offerPrice', 'acceptedOffer', 'offerAccepted', 'priceBasis',
  'completedStatusBasis', 'soldAt', 'soldDate', 'date', 'endedAt', 'saleDate', 'completedAt', 'createdAt', 'updatedAt',
  'listedAt', 'scrapedAt', 'itemId', 'id', 'saleId', 'providerRecordId', 'url', 'itemUrl', 'itemWebUrl', 'marketplace',
  'originMarketplace', 'title', 'itemTitle', 'listingTitle', 'productName', 'name', 'canonicalTitle',
  'imageUrl', 'thumbnailUrl', 'imageUrls', 'images', 'photos', 'gallery', 'galleryImages', 'galleryUrls',
  'metadata', 'providerMetadata', 'itemSpecifics', 'item_specifics', 'aspects', 'specifics', 'itemDetails',
  'fullItemDetails', 'details', 'condition', 'marketplaceCondition', 'conditionEvidence', 'description',
  'categoryId', 'categoryName', 'brand', 'itemType', 'productType', 'form', 'saleForm', 'lotQuantity', 'quantity',
  'itemCount', 'numberOfItems', 'numberOfPins', 'buyerPremium', 'shipping', 'tax', 'shippingPrice',
] as const);

function unsupported(reason: string): Readonly<Record<string, string>> {
  return Object.freeze({ $unsupported: reason });
}
function sensitiveKey(key: string): boolean {
  const normalized = key.replace(/[\s_-]+/g, '').toLowerCase();
  return /authorization|credential|secret|password|passwd|token|apikey|cookie|privatekey|clientkey/.test(normalized)
    || /^(?:authentication|authenticate|auth|authheader|authheaders|authenticationheader|authenticationheaders|session|sessionid|sessionkey)$/.test(normalized);
}
type SnapshotBudget = { nodes: number; path: WeakSet<object> };
function snapshotValue(value: unknown, budget: SnapshotBudget, depth = 0): unknown {
  if (typeof value === 'string') {
    if (value.length > MERCARI_OBSERVATION_LIMITS.maxStringLength) return Object.freeze({ $unsupported: 'string_limit', length: value.length });
    // JSON metadata wrappers keep their string type but pass through the same
    // bounded credential-key redaction as object wrappers. Never parse arbitrary
    // prose, coerce objects or invoke conversion hooks to discover identity.
    if (/^\s*[\[{]/.test(value)) {
      let parsed: unknown;
      try { parsed = JSON.parse(value); } catch { return value; }
      const copied = snapshotValue(parsed, budget, depth + 1);
      const serialized = JSON.stringify(copied);
      return serialized === JSON.stringify(parsed) ? value : serialized;
    }
    return value;
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'undefined') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : unsupported('non_finite_number');
  if (typeof value !== 'object') return unsupported(typeof value);
  if (depth >= MERCARI_OBSERVATION_LIMITS.maxDepth) return unsupported('depth_limit');
  if (budget.nodes >= MERCARI_OBSERVATION_LIMITS.maxNodes) return unsupported('node_limit');
  if (budget.path.has(value)) return unsupported('cyclic');
  let keys: string[];
  let array: boolean;
  let arrayLength = 0;
  try {
    array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (!array && prototype !== null && prototype !== Object.prototype) return unsupported('non_plain_object');
    if (array) {
      const length = Object.getOwnPropertyDescriptor(value, 'length');
      if (!length || !('value' in length) || typeof length.value !== 'number') return unsupported('unreadable_array');
      arrayLength = length.value;
      keys = Array.from({ length: Math.min(arrayLength, MERCARI_OBSERVATION_LIMITS.maxEntries) }, (_, index) => String(index));
    } else keys = Object.keys(value);
  } catch { return unsupported('unreadable_object'); }
  budget.nodes += 1;
  budget.path.add(value);
  // Plain frozen data records interoperate with existing metadata readers.
  // Own accessors/prototype keys are still never copied or invoked below.
  const copy: Record<string, unknown> | unknown[] = array ? [] : {};
  let count = 0;
  for (const key of keys) {
    if (key.length > MERCARI_OBSERVATION_LIMITS.maxKeyLength) {
      if (!Object.hasOwn(copy, '$omittedKeys')) Object.defineProperty(copy, '$omittedKeys', { value: unsupported('key_limit'), enumerable: true });
      continue;
    }
    // Do not retrieve a descriptor/value for reflected credential fields.
    if (sensitiveKey(key) || key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    if (count >= MERCARI_OBSERVATION_LIMITS.maxEntries || budget.nodes >= MERCARI_OBSERVATION_LIMITS.maxNodes) {
      Object.defineProperty(copy, array ? String((copy as unknown[]).length) : '$truncated',
        { value: unsupported('entry_or_node_limit'), enumerable: true });
      break;
    }
    count += 1;
    budget.nodes += 1;
    let copied: unknown;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      copied = descriptor ? 'value' in descriptor ? snapshotValue(descriptor.value, budget, depth + 1) : unsupported('accessor')
        : unsupported('array_hole');
    } catch { copied = unsupported('unreadable_property'); }
    Object.defineProperty(copy, key, { value: copied, enumerable: true });
  }
  if (array && arrayLength > MERCARI_OBSERVATION_LIMITS.maxEntries) {
    Object.defineProperty(copy, String((copy as unknown[]).length), { value: unsupported('array_entry_limit'), enumerable: true });
  }
  budget.path.delete(value);
  return Object.freeze(copy);
}
function captureField(row: unknown, key: string, budget: SnapshotBudget): MercariObservedField {
  if (row === null || typeof row !== 'object') return Object.freeze({ present: false, type: 'undefined', value: undefined });
  try {
    const descriptor = Object.getOwnPropertyDescriptor(row, key);
    if (!descriptor) return Object.freeze({ present: false, type: 'undefined', value: undefined });
    if (!('value' in descriptor)) return Object.freeze({ present: true, type: 'accessor', value: unsupported('accessor') });
    const value: unknown = descriptor.value;
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    return Object.freeze({ present: true, type, value: snapshotValue(value, budget) });
  } catch { return Object.freeze({ present: true, type: 'unreadable', value: unsupported('unreadable_property') }); }
}

/** The one wire encoder; invocation options, not returned rows, own the requested mode. */
export function encodeMercariRequestedMode(mode: MercariRequestedMode): 'true' | 'false' {
  return mode === 'active' ? 'false' : 'true';
}
/** Top-level retrieval context only. This never supplies a row sale date. */
export function captureMercariResponseScrapedAt(responseBody: unknown): MercariObservedField {
  return captureField(responseBody, 'scrapedAt', { nodes: 0, path: new WeakSet() });
}

const AFFIRMATIVE_FLAGS = ['sold', 'completed', 'confirmed', 'isSold', 'isCompleted', 'isConfirmed'] as const;
const OPPOSING_FLAGS = ['active', 'isActive', 'cancelled', 'canceled', 'isCancelled', 'isCanceled'] as const;
function classifyFields(fields: Readonly<Record<string, MercariObservedField>>, requestedMode: MercariRequestedMode) {
  const direct = fields.status;
  const observedStatus: MercariListingStatus = direct?.type === 'string' && direct.value === 'sold' ? 'sold'
    : direct?.type === 'string' && direct.value === 'active' ? 'active' : 'unknown';
  const issues: string[] = [];
  let uncertain = false;
  const issue = (code: string) => { uncertain = true; issues.push(code); };
  if (observedStatus === 'unknown') issues.push(direct?.present ? 'direct_status_unrecognized' : 'direct_status_missing');
  for (const key of ['saleStatus', 'listingStatus', 'cancellationStatus', 'priceBasis'] as const) {
    const field = fields[key];
    if (!field?.present) continue;
    const value = field.value;
    const positive = key === 'priceBasis' ? value === 'sold' || value === 'realized'
      : value === 'sold' || value === 'completed' || value === 'confirmed';
    const negative = key === 'priceBasis' ? value === 'asking'
      : value === 'active' || value === 'listed' || value === 'cancelled' || value === 'canceled';
    // A negative cancellation assertion and an unknown price basis do not assert a status.
    const neutral = (key === 'cancellationStatus' && (value === 'none' || value === 'not_cancelled' || value === 'not_canceled'))
      || (key === 'priceBasis' && value === 'unknown');
    if (field.type !== 'string' || (!positive && !negative && !neutral)) issue(`status_assertion_malformed:${key}`);
    else if ((observedStatus === 'sold' && negative) || (observedStatus === 'active' && positive)) issue(`status_conflict:${key}`);
  }
  for (const key of [...AFFIRMATIVE_FLAGS, ...OPPOSING_FLAGS]) {
    const field = fields[key];
    if (!field?.present) continue;
    if (field.type !== 'boolean') { issue(`status_assertion_malformed:${key}`); continue; }
    if (key !== 'active' && key !== 'isActive' && (OPPOSING_FLAGS as readonly string[]).includes(key)) {
      if (observedStatus !== 'unknown' && field.value === true) issue(`status_conflict:${key}`);
      continue; // Not cancelled is neutral, not proof of sold status.
    }
    const positive = (AFFIRMATIVE_FLAGS as readonly string[]).includes(key) ? field.value === true : field.value === false;
    if ((observedStatus === 'sold' && !positive) || (observedStatus === 'active' && positive)) issue(`status_conflict:${key}`);
  }
  const listingStatus: MercariListingStatus = observedStatus === 'sold' && uncertain ? 'unknown' : observedStatus;
  if (observedStatus !== 'unknown' && observedStatus !== requestedMode) issues.push('requested_mode_row_mismatch');
  return { observedStatus, listingStatus, statusIssues: Object.freeze(issues.slice(0, MERCARI_OBSERVATION_LIMITS.maxIssues)) };
}

/** No trimming, case folding, endpoint inference, fallback or alias repair. */
export function deriveMercariObservedCurrency(report: Pick<MercariObservationReport, 'fields'>): string | null {
  const currency = report.fields.currency;
  if (!currency?.present || currency.type !== 'string' || typeof currency.value !== 'string' || !/^[A-Za-z]{3}$/.test(currency.value)) return null;
  const alias = report.fields.soldCurrency;
  if (alias?.present && (alias.type !== 'string' || alias.value !== currency.value)) return null;
  return currency.value;
}
/** Parent/UI API: explicit original currency only; null reports stay unknown. */
export function mercariObservedCurrency(report: MercariObservationReport | null | undefined): string | null {
  return report ? deriveMercariObservedCurrency(report) : null;
}
function economicIssues(fields: Readonly<Record<string, MercariObservedField>>): readonly string[] {
  const issues = ['final_price_basis_unverified', 'sale_date_unknown'];
  const currency = fields.currency;
  if (!currency.present) issues.push('currency_missing');
  else if (currency.type !== 'string' || typeof currency.value !== 'string' || !/^[A-Za-z]{3}$/.test(currency.value)) issues.push('currency_invalid');
  else if (currency.value !== 'USD') issues.push('documented_currency_not_usd');
  if (fields.soldCurrency.present && (!currency.present || fields.soldCurrency.type !== 'string'
    || fields.soldCurrency.value !== currency.value)) issues.push('currency_conflict:soldCurrency');
  const decimal = (field: MercariObservedField): number | null => {
    if (field.type !== 'string' || typeof field.value !== 'string' || !/^\d+(?:\.\d+)?$/.test(field.value)) return null;
    const amount = Number(field.value);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  };
  const price = decimal(fields.price);
  if (fields.price.type !== 'string') issues.push('documented_price_type_mismatch');
  if (price === null) issues.push('reported_price_decimal_invalid');
  for (const key of ['soldPrice', 'finalPrice', 'salePrice', 'transactionPrice', 'acceptedOfferPrice', 'acceptedOfferAmount', 'offerPrice']) {
    const field = fields[key];
    if (!field.present) continue;
    const alias = decimal(field);
    // Numeric aliases are observable context, not a documented final-price convention.
    const numeric = field.type === 'number' && typeof field.value === 'number' && Number.isFinite(field.value) && field.value > 0 ? field.value : alias;
    if (numeric === null) issues.push(`price_alias_invalid:${key}`);
    else if (price !== null && numeric !== price) issues.push(`price_conflict:${key}`);
  }
  // originalPrice is pre-discount context. A difference (or null) is not a final-price conflict.
  if (['soldAt', 'soldDate', 'date', 'endedAt', 'saleDate', 'completedAt'].some((key) => fields[key].present)) issues.push('original_date_event_semantics_unverified');
  if (fields.itemId.type !== 'string') issues.push('documented_identity_type_mismatch');
  if (fields.marketplace.present && (fields.marketplace.type !== 'string' || fields.marketplace.value !== 'mercari')) issues.push('marketplace_conflict');
  return Object.freeze(issues.slice(0, MERCARI_OBSERVATION_LIMITS.maxIssues));
}

/** Independently owned, bounded, immutable copy of named original fields before overlays. */
export function captureMercariObservation(row: unknown, requestedMode: MercariRequestedMode = 'sold', responseScrapedAt?: MercariObservedField): MercariObservationReport {
  const fields: Record<string, MercariObservedField> = Object.create(null);
  const budget: SnapshotBudget = { nodes: 0, path: new WeakSet() };
  for (const key of MERCARI_OBSERVATION_FIELDS) fields[key] = captureField(row, key, budget);
  // Provider-specific identity fields (including custom fields and alternate
  // metadata wrapper names) cannot be lost because they are absent from the
  // status/economics list. They remain diagnostics, never classification input.
  let keys: string[] = [];
  try { if (row && typeof row === 'object') keys = Object.keys(row); } catch { /* unreadable row stays represented by named descriptors */ }
  let extras = 0;
  for (const key of keys) {
    if (Object.hasOwn(fields, key) || sensitiveKey(key) || key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (key.length > MERCARI_OBSERVATION_LIMITS.maxKeyLength) continue;
    if (extras >= MERCARI_OBSERVATION_LIMITS.maxEntries || budget.nodes >= MERCARI_OBSERVATION_LIMITS.maxNodes) {
      fields.$omittedMetadata = Object.freeze({ present: true, type: 'unsupported', value: unsupported('entry_or_node_limit') }); break;
    }
    extras += 1;
    fields[key] = captureField(row, key, budget);
  }
  Object.freeze(fields);
  const classification = classifyFields(fields, requestedMode);
  // Copy even an externally supplied retrieval descriptor; never share mutable caller ownership.
  const context = responseScrapedAt === undefined ? undefined : copyResponseField(responseScrapedAt);
  return Object.freeze({ version: 1, requestedMode, ...classification, economicIssues: economicIssues(fields),
    priceContext: classification.listingStatus === 'sold' ? 'sold_listing_reported'
      : classification.listingStatus === 'active' ? 'active_asking' : 'unknown',
    fields, originalMetadata: mercariOriginalMetadata({ fields }), ...(context === undefined ? {} : { responseScrapedAt: context }) });
}
function copyResponseField(field: MercariObservedField): MercariObservedField {
  try {
    const present = Object.getOwnPropertyDescriptor(field, 'present');
    const type = Object.getOwnPropertyDescriptor(field, 'type');
    const value = Object.getOwnPropertyDescriptor(field, 'value');
    if (!present || !('value' in present) || typeof present.value !== 'boolean'
      || !type || !('value' in type) || typeof type.value !== 'string' || (value && !('value' in value))) {
      return Object.freeze({ present: true, type: 'unreadable', value: unsupported('unreadable_context') });
    }
    return Object.freeze({ present: present.value, type: type.value,
      value: snapshotValue(value?.value, { nodes: 0, path: new WeakSet() }) });
  } catch { return Object.freeze({ present: true, type: 'unreadable', value: unsupported('unreadable_context') }); }
}
/** Convenient pure classifier for fixtures or display; never reconstructs private adapter ownership. */
export function classifyMercariListingStatus(row: unknown, requestedMode: MercariRequestedMode = 'sold') {
  const report = captureMercariObservation(row, requestedMode);
  return Object.freeze({ observedStatus: report.observedStatus, listingStatus: report.listingStatus, statusIssues: report.statusIssues });
}
/** Separate original namespace, not normalized economics. Accessors remain safe descriptors. */
export function mercariOriginalMetadata(report: Pick<MercariObservationReport, 'fields'>): Record<string, unknown> {
  const original: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(report.fields)) {
    const field = report.fields[key];
    if (field?.present) Object.defineProperty(original, key, { value: field.value, enumerable: true });
  }
  return Object.freeze(original);
}
