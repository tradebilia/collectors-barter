type TradeListing = { id: number };

type BuildTradeProposalItemPayloadInput = {
  myOfferedItems: TradeListing[];
  theirOfferedItems: TradeListing[];
  pendingMyItems: TradeListing[];
  pendingTheirItems: TradeListing[];
  removedItemIds: number[];
  originalRequestedListingId?: number;
};

const activeIds = (items: TradeListing[], removedIds: Set<number>) =>
  items.map((item) => item.id).filter((id) => !removedIds.has(id));

const uniqueIds = (ids: number[]) => Array.from(new Set(ids));

/**
 * Keeps a counterproposal's two item directions separate. The active member
 * offers only their own listings; selected counterparty listings are requests.
 */
export function buildTradeProposalItemPayload({
  myOfferedItems,
  theirOfferedItems,
  pendingMyItems,
  pendingTheirItems,
  removedItemIds,
  originalRequestedListingId,
}: BuildTradeProposalItemPayloadInput) {
  const removedIds = new Set(removedItemIds);
  const offeredListingIds = uniqueIds([
    ...activeIds(myOfferedItems, removedIds),
    ...activeIds(pendingMyItems, removedIds),
  ]);
  const offeredIds = new Set(offeredListingIds);
  const requestedListingIds = uniqueIds([
    ...activeIds(theirOfferedItems, removedIds),
    ...activeIds(pendingTheirItems, removedIds),
  ]).filter((id) => id !== originalRequestedListingId && !offeredIds.has(id));

  return { offeredListingIds, requestedListingIds };
}
