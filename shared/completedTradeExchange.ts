export type CompletedTradeExchangeItem = {
  id: number | null;
  title: string | null;
  category: string | null;
  value: string;
  image: string | null;
};

/**
 * A proposal requester offers their own items in exchange for the recipient's
 * requested listing. The Trade Hub uses this member-relative view so a
 * completed preview clearly distinguishes what the signed-in member sent from
 * what they received.
 */
export function buildCompletedTradeExchange(
  direction: string,
  requestedItem: CompletedTradeExchangeItem[],
  offeredItems: CompletedTradeExchangeItem[],
) {
  return direction === "outgoing"
    ? { received: requestedItem, sent: offeredItems }
    : { received: offeredItems, sent: requestedItem };
}
