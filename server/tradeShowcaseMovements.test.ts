import { describe, expect, it } from "vitest";
import { buildTradeShowcaseMovements } from "../client/src/lib/tradeShowcaseMovements";

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
});
