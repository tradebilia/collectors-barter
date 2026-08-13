import { describe, expect, it } from "vitest";
import { buildTradeShowcaseExchange, buildTradeShowcaseMovements } from "../client/src/lib/tradeShowcaseMovements";

describe("buildTradeShowcaseMovements", () => {
  it("maps the requested listing from recipient to requester and offered listings the other way", () => {
    const movements = buildTradeShowcaseMovements({
      requestedListingId: 11,
      requestedListingTitle: "Recipient's coin",
      requesterDisplayName: "Administrator",
      recipientDisplayName: "Rtavani",
      offeredItems: [{ id: 22, title: "Administrator's card" }],
    });

    expect(movements).toEqual([
      expect.objectContaining({
        title: "Recipient's coin",
        originalOwner: expect.objectContaining({ displayName: "Rtavani" }),
        receivingMember: expect.objectContaining({ displayName: "Administrator" }),
      }),
      expect.objectContaining({
        title: "Administrator's card",
        originalOwner: expect.objectContaining({ displayName: "Administrator" }),
        receivingMember: expect.objectContaining({ displayName: "Rtavani" }),
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
