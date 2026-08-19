import { describe, expect, it } from "vitest";
import { filterListingsByOwnerDistance, orderListingsByOwnerDistance } from "../shared/nearestLocationSort";

const listings = [
  { id: 101, ownerId: 11 },
  { id: 102, ownerId: 12 },
  { id: 103, ownerId: 13 },
  { id: 104, ownerId: 11 },
];

describe("privacy-safe category distance helpers", () => {
  it("orders listings by the owner’s distance and keeps same-distance items deterministic", () => {
    const ordered = orderListingsByOwnerDistance(listings, new Map([
      [11, 42.2],
      [12, 8.4],
      [13, null],
    ]));

    expect(ordered.map(listing => listing.id)).toEqual([102, 104, 101, 103]);
  });

  it("includes only listings with a resolved owner distance inside the selected range", () => {
    const filtered = filterListingsByOwnerDistance(listings, new Map([
      [11, 42.2],
      [12, 8.4],
      [13, null],
    ]), 25);

    expect(filtered.map(listing => listing.id)).toEqual([102]);
  });
});
