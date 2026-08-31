export type LockedShipmentItem = {
  id: number;
  ownerId: number;
};

type ShipmentItemInput = {
  requestedListing: LockedShipmentItem | null | undefined;
  offeredListings: LockedShipmentItem[] | null | undefined;
  viewerUserId: number | null | undefined;
};

/**
 * Shipping must reflect the persisted, mutually accepted item set—not an
 * editable negotiation draft. The original requested listing and every
 * additional trade item are deduplicated and then grouped by current owner.
 */
export function getLockedShipmentItems({ requestedListing, offeredListings, viewerUserId }: ShipmentItemInput) {
  const byId = new Map<number, LockedShipmentItem>();
  for (const item of [requestedListing, ...(offeredListings ?? [])]) {
    if (item && Number.isInteger(item.id) && Number.isInteger(item.ownerId)) {
      byId.set(item.id, item);
    }
  }

  const allItems = [...byId.values()];
  return {
    allItems,
    myItems: viewerUserId == null ? [] : allItems.filter((item) => item.ownerId === viewerUserId),
    theirItems: viewerUserId == null ? allItems : allItems.filter((item) => item.ownerId !== viewerUserId),
  };
}
