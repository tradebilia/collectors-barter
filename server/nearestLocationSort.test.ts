import { describe, expect, it } from "vitest";
import { filterListingsByOwnerDistance, getApproximateDistanceBand, orderListingsByOwnerDistance } from "../shared/nearestLocationSort";

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

  it("returns broad distance bands without exposing exact mileage", () => {
    expect(getApproximateDistanceBand(4.2)).toBe("Within 10 miles");
    expect(getApproximateDistanceBand(10.1)).toBe("10–25 miles away");
    expect(getApproximateDistanceBand(25.1)).toBe("25–50 miles away");
    expect(getApproximateDistanceBand(50.1)).toBe("50–100 miles away");
    expect(getApproximateDistanceBand(100.1)).toBe("100–250 miles away");
    expect(getApproximateDistanceBand(250.1)).toBe("250+ miles away");
    expect(getApproximateDistanceBand(null)).toBeNull();
    expect(getApproximateDistanceBand(undefined)).toBeNull();
  });

  it("labels a signed-in member’s own listing without revealing a distance", () => {
    expect(getApproximateDistanceBand(0, true)).toBe("Your listing");
  });
});
