import { describe, expect, it } from "vitest";
import { buildTradeShowcaseExchange, buildTradeShowcaseMovements } from "../client/src/lib/tradeShowcaseMovements";

describe("buildTradeShowcaseMovements", () => {
  it("maps the requested listing from recipient to requester and offered listings the other way", () => {
    const movements = buildTradeShowcaseMovements({
      requestedListingId: 11,
      requestedListingTitle: "Recipient's coin",
      requesterDisplayName: "Administrator Profile",
      requesterUsername: "Administrator",
      requesterAvatarUrl: "https://example.com/admin.png",
      requesterAverageRating: "4.8",
      requesterReviewCount: 3,
      requesterEbayVerified: 1,
      requesterMerchantVerified: 1,
      recipientDisplayName: "Rtavani Profile",
      recipientUsername: "RTavani",
      recipientAvatarUrl: "https://example.com/rtavani.png",
      recipientAverageRating: 4.9,
      recipientReviewCount: 4,
      recipientEbayVerified: 1,
      offeredItems: [{ id: 22, title: "Administrator's card" }],
    });

    expect(movements).toEqual([
      expect.objectContaining({
        title: "Recipient's coin",
        originalOwner: expect.objectContaining({
          displayName: "Rtavani Profile",
          username: "RTavani",
          averageRating: 4.9,
          verificationLabels: ["eBay Verified"],
        }),
        receivingMember: expect.objectContaining({
          displayName: "Administrator Profile",
          username: "Administrator",
          averageRating: "4.8",
          verificationLabels: ["eBay Verified", "Tradebilia Verified"],
        }),
      }),
      expect.objectContaining({
        title: "Administrator's card",
        originalOwner: expect.objectContaining({
          displayName: "Administrator Profile",
          username: "Administrator",
          avatarUrl: "https://example.com/admin.png",
        }),
        receivingMember: expect.objectContaining({
          displayName: "Rtavani Profile",
          username: "RTavani",
          avatarUrl: "https://example.com/rtavani.png",
        }),
      }),
    ]);
  });

  it("groups all items from both sides into one trade-level exchange", () => {
    const exchange = buildTradeShowcaseExchange({
      requestedListingTitle: "Rtavani's coin",
      requesterDisplayName: "Administrator",
      recipientDisplayName: "Rtavani",
      offeredItems: [
        { title: "Administrator's card" },
        { title: "Administrator's comic" },
      ],
    });

    expect(exchange.left.member.displayName).toBe("Rtavani");
    expect(exchange.left.items.map((item) => item.title)).toEqual(["Rtavani's coin"]);
    expect(exchange.right.member.displayName).toBe("Administrator");
    expect(exchange.right.items.map((item) => item.title)).toEqual([
      "Administrator's card",
      "Administrator's comic",
    ]);
  });
});
