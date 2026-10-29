export const COLLECTION_LOT_NOT_COMPARABLE_MESSAGE = 'Not comparable — Collection/Lot items cannot be analyzed because they may contain multiple different items';

/**
 * Collection/Lot is a deliberately non-comparable item type. Accept the
 * persisted key plus the labels that can arrive from older forms or clients.
 */
export function isCollectionLotItemType(value: unknown): boolean {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[\/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized === 'collection lot'
    || normalized === 'collection / lot'
    || normalized === 'collection/lot'
    || normalized === 'collection and lot';
}

export function collectionLotNotComparable<T extends Record<string, unknown> = Record<string, unknown>>(extra?: T): any {
  return {
    ...(extra ?? {}),
    status: 'not_comparable' as const,
    message: COLLECTION_LOT_NOT_COMPARABLE_MESSAGE,
    comparable: false as const,
  };
}

export function collectionLotGuard(input: { itemType?: unknown } | null | undefined): any {
  return isCollectionLotItemType(input?.itemType) ? collectionLotNotComparable() : null;
}
