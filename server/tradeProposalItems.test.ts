import { describe, expect, it } from "vitest";
import { buildTradeProposalItemPayload } from "../client/src/lib/tradeProposalItems";

describe("Trade Room two-sided item payload", () => {
  it("lets Rtavani request an Administrator item without serializing it as Rtavani's offer", () => {
    const payload = buildTradeProposalItemPayload({
      myOfferedItems: [{ id: 201 }],
      theirOfferedItems: [],
      pendingMyItems: [],
      pendingTheirItems: [{ id: 101 }],
      removedItemIds: [],
      originalRequestedListingId: 99,
    });

    expect(payload.offeredListingIds).toEqual([201]);
    expect(payload.requestedListingIds).toEqual([101]);
  });

  it("does not resubmit the original requested listing or locally removed items", () => {
    const payload = buildTradeProposalItemPayload({
      myOfferedItems: [{ id: 201 }, { id: 202 }],
      theirOfferedItems: [{ id: 99 }, { id: 101 }],
      pendingMyItems: [],
      pendingTheirItems: [{ id: 102 }],
      removedItemIds: [202, 102],
      originalRequestedListingId: 99,
    });

    expect(payload.offeredListingIds).toEqual([201]);
    expect(payload.requestedListingIds).toEqual([101]);
  });
});
