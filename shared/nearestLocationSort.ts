export type NearestLocationSortReason =
  | "sign_in_required"
  | "saved_town_required"
  | "location_unavailable";

export type LocationDistanceStatus = {
  requested: boolean;
  applied: boolean;
  reason: NearestLocationSortReason | null;
};

export type NearestLocationSortStatus = LocationDistanceStatus;

type DistanceSortableListing = {
  id: number;
  ownerId: number;
};

/**
 * Keeps exact locations server-only. Listings with an unavailable owner town
 * are retained, but are ordered after listings with a calculated distance.
 */
export function orderListingsByOwnerDistance<T extends DistanceSortableListing>(
  listings: T[],
  milesByOwnerId: ReadonlyMap<number, number | null>,
): T[] {
  const distanceFor = (listing: T) => milesByOwnerId.get(listing.ownerId) ?? Number.POSITIVE_INFINITY;

  return [...listings].sort((left, right) => {
    const distanceDifference = distanceFor(left) - distanceFor(right);
    return distanceDifference || right.id - left.id;
  });
}

export function filterListingsByOwnerDistance<T extends DistanceSortableListing>(
  listings: T[],
  milesByOwnerId: ReadonlyMap<number, number | null>,
  maximumMiles: number,
): T[] {
  return listings.filter(listing => {
    const miles = milesByOwnerId.get(listing.ownerId);
    return miles !== null && miles !== undefined && miles <= maximumMiles;
  });
}
