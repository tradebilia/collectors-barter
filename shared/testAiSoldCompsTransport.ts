export type ApprovalTargetItem = {
  title: string;
  category: string;
  itemType?: string | null;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
};

/** Declared target fields only. This is binding input, never browser authority. */
export function buildApprovalTargetInput(item: ApprovalTargetItem) {
  return {
    title: item.title,
    category: item.category,
    itemType: item.itemType ?? undefined,
    grade: item.grade ?? undefined,
    condition: item.condition ?? undefined,
    certificationCompany: item.certificationCompany ?? undefined,
    itemDetails: item.itemDetails ?? undefined,
  };
}

/**
 * One canonical target boundary for every source that can issue final visual
 * approval. Search fields are only the fallback; an explicitly supplied
 * inventory target wins and is reduced to the signed field contract.
 */
export function buildEffectiveApprovalTarget(
  searchItem: ApprovalTargetItem,
  explicitTarget?: ApprovalTargetItem | null,
) {
  return buildApprovalTargetInput(explicitTarget ?? searchItem);
}

/**
 * Resolve the one image reference that visual review and final approval must
 * both use. An explicit binding reference is authoritative; the ordinary
 * image URL is only a backwards-compatible fallback.
 */
export function resolveApprovalTargetImageReference(input: {
  imageUrl?: string | null;
  approvalTargetImageReference?: string | null;
}) {
  const explicit = typeof input.approvalTargetImageReference === 'string'
    ? input.approvalTargetImageReference.trim() : '';
  if (explicit) return explicit;
  const fallback = typeof input.imageUrl === 'string' ? input.imageUrl.trim() : '';
  return fallback || undefined;
}

/** The server-side safe form of the same shared image-reference decision. */
export function normalizeApprovalTargetImageReference(input: {
  imageUrl?: string | null;
  approvalTargetImageReference?: string | null;
}) {
  const reference = resolveApprovalTargetImageReference(input);
  if (!reference) return null;
  try {
    const protocol = new URL(reference).protocol;
    return protocol === 'https:' || protocol === 'http:' ? reference : null;
  } catch {
    return null;
  }
}

/** Visual review uses the image actually submitted for this request. */
export function normalizeVisualTargetImageReference(input: { imageUrl?: string | null }) {
  const reference = typeof input.imageUrl === 'string' ? input.imageUrl.trim() : '';
  if (!reference) return null;
  try {
    const protocol = new URL(reference).protocol;
    return protocol === 'https:' || protocol === 'http:' ? reference : null;
  } catch {
    return null;
  }
}

/** Final signing must require the independently carried binding reference. */
export function normalizeRequiredApprovalTargetImageReference(input: {
  approvalTargetImageReference?: string | null;
}) {
  return normalizeApprovalTargetImageReference({ approvalTargetImageReference: input.approvalTargetImageReference });
}

/** Keep the existing search and reviewed image selection; add binding only. */
export function buildSoldCompsApprovalInput<T extends { imageUrl?: string }>(
  input: T,
  effectiveItem: ApprovalTargetItem,
) {
  return {
    ...input,
    approvalTarget: buildApprovalTargetInput(effectiveItem),
    approvalTargetImageReference: resolveApprovalTargetImageReference(input),
  };
}

/** Disabling final image analysis must not discard the primary binding reference. */
export function buildApprovalTargetImageInput(
  item: { primaryPhotoUrl?: string },
  useImageAnalyzer: boolean,
) {
  return {
    imageUrl: useImageAnalyzer ? item.primaryPhotoUrl : undefined,
    approvalTargetImageReference: item.primaryPhotoUrl,
  };
}

export type SoldCompsTransportListing = {
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  date?: string | null;
  endedAt?: string | null;
  saleId?: string | null;
  sourceRecordId?: string | null;
  itemId?: string | null;
  lotId?: string | null;
  id?: string | null;
  url?: string | null;
  itemUrl?: string | null;
  itemWebUrl?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  marketplace?: string | null;
  [field: string]: unknown;
};

const hasField = (record: object, field: string) => Object.prototype.hasOwnProperty.call(record, field);

/**
 * One lossless eBay Sold-Comps handoff for both analysis sides. Preserve every
 * supplied field (including explicit null/unknown and nested approval/audit).
 * Only absent canonical aliases are filled from existing provider facts; the
 * endpoint label identifies transport, not verification or valuation eligibility.
 * Do not infer currency, completion, visual approval, form, quantity or economics.
 */
export function buildSoldCompsAnalysisSales<T extends SoldCompsTransportListing>(
  data: { listings?: T[] | null } | null | undefined,
  enabled: boolean,
): Array<T & SoldCompsTransportListing> {
  if (!enabled || !Array.isArray(data?.listings)) return [];
  return data.listings.map((sale) => {
    const projected = { ...sale };
    if (!hasField(sale, 'date') && hasField(sale, 'endedAt')) projected.date = sale.endedAt;
    if (!hasField(sale, 'url')) {
      const url = sale.itemUrl ?? sale.itemWebUrl;
      if (url !== undefined) projected.url = url;
    }
    if (!hasField(sale, 'saleId')) {
      const saleId = sale.sourceRecordId ?? sale.itemId ?? sale.lotId ?? sale.id ?? sale.url ?? sale.itemUrl ?? sale.itemWebUrl;
      if (saleId !== undefined) projected.saleId = saleId;
    }
    if (!hasField(sale, 'sourceId')) projected.sourceId = 'sold_comps';
    if (!hasField(sale, 'sourceLabel')) projected.sourceLabel = 'eBay Sold-Comps';
    if (!hasField(sale, 'marketplace')) projected.marketplace = sale.sourceLabel ?? 'eBay Sold-Comps';
    return projected;
  });
}
