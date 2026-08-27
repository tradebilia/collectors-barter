export type TradeShowcaseParty = {
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type TradeShowcaseItem = {
  id?: number | null;
  title?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  estimatedValue?: string | number | null;
};

export type TradeShowcaseTrade = {
  requestedListingId?: number | null;
  requestedListingTitle?: string | null;
  requestedListingCategory?: string | null;
  requestedListingImage?: string | null;
  requestedListingValue?: string | number | null;
  offeredItems?: TradeShowcaseItem[] | null;
  requesterDisplayName?: string | null;
  requesterAvatarUrl?: string | null;
  recipientDisplayName?: string | null;
  recipientAvatarUrl?: string | null;
};

export type TradeShowcaseMovement = TradeShowcaseItem & {
  originalOwner: TradeShowcaseParty;
  receivingMember: TradeShowcaseParty;
};

export type TradeShowcaseExchangeSide = {
  member: TradeShowcaseParty;
  items: TradeShowcaseItem[];
};

export type TradeShowcaseExchange = {
  left: TradeShowcaseExchangeSide;
  right: TradeShowcaseExchangeSide;
};

/**
 * The requested listing belongs to the proposal recipient and moves to the
 * requester. Every offered listing belongs to the requester and moves to the
 * recipient. These directions are derived from the persisted proposal roles.
 */
export function buildTradeShowcaseMovements(trade: TradeShowcaseTrade): TradeShowcaseMovement[] {
  const requester = {
    displayName: trade.requesterDisplayName,
    avatarUrl: trade.requesterAvatarUrl,
  };
  const recipient = {
    displayName: trade.recipientDisplayName,
    avatarUrl: trade.recipientAvatarUrl,
  };

  const requestedMovement: TradeShowcaseMovement[] =
    trade.requestedListingImage || trade.requestedListingTitle
      ? [{
          id: trade.requestedListingId,
          title: trade.requestedListingTitle,
          category: trade.requestedListingCategory,
          imageUrl: trade.requestedListingImage,
          estimatedValue: trade.requestedListingValue,
          originalOwner: recipient,
          receivingMember: requester,
        }]
      : [];

  const offeredMovements = (trade.offeredItems ?? []).map((item) => ({
    ...item,
    originalOwner: requester,
    receivingMember: recipient,
  }));

  return [...requestedMovement, ...offeredMovements];
}

/**
 * Groups the two sides of a completed exchange for a single trade-level
 * presentation. The recipient originally owns the requested listing; the
 * requester originally owns every offered listing.
 */
export function buildTradeShowcaseExchange(trade: TradeShowcaseTrade): TradeShowcaseExchange {
  const requester = {
    displayName: trade.requesterDisplayName,
    avatarUrl: trade.requesterAvatarUrl,
  };
  const recipient = {
    displayName: trade.recipientDisplayName,
    avatarUrl: trade.recipientAvatarUrl,
  };

  const recipientItems: TradeShowcaseItem[] =
    trade.requestedListingImage || trade.requestedListingTitle
      ? [{
          id: trade.requestedListingId,
          title: trade.requestedListingTitle,
          category: trade.requestedListingCategory,
          imageUrl: trade.requestedListingImage,
          estimatedValue: trade.requestedListingValue,
        }]
      : [];

  return {
    left: { member: recipient, items: recipientItems },
    right: { member: requester, items: trade.offeredItems ?? [] },
  };
}
