import { describe, expect, it } from "vitest";
import { getLockedShipmentItems } from "../client/src/lib/shippingItems";

describe("locked Shipping item grouping", () => {
  it("shows every persisted counterparty item even when the original request and added items share that owner", () => {
    const result = getLockedShipmentItems({
      viewerUserId: 60003,
      requestedListing: { id: 1170010, ownerId: 60003 },
      offeredListings: [
        { id: 690002, ownerId: 30002 },
        { id: 690006, ownerId: 30002 },
      ],
    });

    expect(result.myItems.map((item) => item.id)).toEqual([1170010]);
    expect(result.theirItems.map((item) => item.id)).toEqual([690002, 690006]);
    expect(result.allItems).toHaveLength(3);
  });

  it("deduplicates the original requested listing if it is also present in additional trade items", () => {
    const result = getLockedShipmentItems({
      viewerUserId: 30002,
      requestedListing: { id: 1170010, ownerId: 60003 },
      offeredListings: [
        { id: 1170010, ownerId: 60003 },
        { id: 690002, ownerId: 30002 },
      ],
    });

    expect(result.allItems.map((item) => item.id)).toEqual([1170010, 690002]);
  });
});
