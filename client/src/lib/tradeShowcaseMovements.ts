export type TradeShowcaseParty = {
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  averageRating?: string | number | null;
  reviewCount?: string | number | null;
  verificationLabels?: string[];
};

export type TradeShowcaseItem = {
  id?: number | null;
  title?: string | null;
  category?: string | null;
  condition?: string | null;
  grade?: string | number | null;
  certificationCompany?: string | null;
  imageUrl?: string | null;
  estimatedValue?: string | number | null;
};

export type TradeShowcaseTrade = {
  requestedListingId?: number | null;
  requestedListingTitle?: string | null;
  requestedListingCategory?: string | null;
  requestedListingCondition?: string | null;
  requestedListingGrade?: string | number | null;
  requestedListingCertificationCompany?: string | null;
  requestedListingImage?: string | null;
  requestedListingValue?: string | number | null;
  offeredItems?: TradeShowcaseItem[] | null;
  requesterDisplayName?: string | null;
  requesterUsername?: string | null;
  requesterAvatarUrl?: string | null;
  requesterAverageRating?: string | number | null;
  requesterReviewCount?: string | number | null;
  requesterEbayVerified?: boolean | number | null;
  requesterFacebookVerified?: boolean | number | null;
  requesterLinkedinVerified?: boolean | number | null;
  requesterPaypalVerified?: boolean | number | null;
  requesterMerchantVerified?: boolean | number | null;
  recipientDisplayName?: string | null;
  recipientUsername?: string | null;
  recipientAvatarUrl?: string | null;
  recipientAverageRating?: string | number | null;
  recipientReviewCount?: string | number | null;
  recipientEbayVerified?: boolean | number | null;
  recipientFacebookVerified?: boolean | number | null;
  recipientLinkedinVerified?: boolean | number | null;
  recipientPaypalVerified?: boolean | number | null;
  recipientMerchantVerified?: boolean | number | null;
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

function buildVerificationLabels(trade: TradeShowcaseTrade, role: "requester" | "recipient") {
  const isVerified = (key: keyof TradeShowcaseTrade) => Boolean(trade[key]);
  const labels: string[] = [];
  if (isVerified(`${role}EbayVerified` as keyof TradeShowcaseTrade)) labels.push("eBay Verified");
  if (isVerified(`${role}FacebookVerified` as keyof TradeShowcaseTrade)) labels.push("Facebook Verified");
  if (isVerified(`${role}LinkedinVerified` as keyof TradeShowcaseTrade)) labels.push("LinkedIn Verified");
  if (isVerified(`${role}PaypalVerified` as keyof TradeShowcaseTrade)) labels.push("PayPal Verified");
  if (isVerified(`${role}MerchantVerified` as keyof TradeShowcaseTrade)) labels.push("Tradebilia Verified");
  return labels;
}

function buildParty(trade: TradeShowcaseTrade, role: "requester" | "recipient"): TradeShowcaseParty {
  const prefix = role === "requester" ? "requester" : "recipient";
  return {
    displayName: trade[`${prefix}DisplayName`],
    username: trade[`${prefix}Username`],
    avatarUrl: trade[`${prefix}AvatarUrl`],
    averageRating: trade[`${prefix}AverageRating`],
    reviewCount: trade[`${prefix}ReviewCount`],
    verificationLabels: buildVerificationLabels(trade, role),
  };
}

/**
 * The requested listing belongs to the proposal recipient and moves to the
 * requester. Every offered listing belongs to the requester and moves to the
 * recipient. These directions are derived from the persisted proposal roles.
 */
export function buildTradeShowcaseMovements(trade: TradeShowcaseTrade): TradeShowcaseMovement[] {
  const requester = buildParty(trade, "requester");
  const recipient = buildParty(trade, "recipient");

  const requestedMovement: TradeShowcaseMovement[] =
    trade.requestedListingImage || trade.requestedListingTitle
      ? [{
          id: trade.requestedListingId,
          title: trade.requestedListingTitle,
          category: trade.requestedListingCategory,
          condition: trade.requestedListingCondition,
          grade: trade.requestedListingGrade,
          certificationCompany: trade.requestedListingCertificationCompany,
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
  const requester = buildParty(trade, "requester");
  const recipient = buildParty(trade, "recipient");

  const recipientItems: TradeShowcaseItem[] =
    trade.requestedListingImage || trade.requestedListingTitle
      ? [{
          id: trade.requestedListingId,
          title: trade.requestedListingTitle,
          category: trade.requestedListingCategory,
          condition: trade.requestedListingCondition,
          grade: trade.requestedListingGrade,
          certificationCompany: trade.requestedListingCertificationCompany,
          imageUrl: trade.requestedListingImage,
          estimatedValue: trade.requestedListingValue,
        }]
      : [];

  return {
    left: { member: recipient, items: recipientItems },
    right: { member: requester, items: trade.offeredItems ?? [] },
  };
}
