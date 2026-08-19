import { describe, expect, it } from "vitest";
import { buildCompletedTradeExchange } from "../shared/completedTradeExchange";

const requestedItem = [{ id: 1, title: "Recipient item", category: "comics", value: "100", image: null }];
const offeredItems = [{ id: 2, title: "Requester item", category: "sports_cards", value: "50", image: null }];

describe("buildCompletedTradeExchange", () => {
  it("shows the requested item as received and offered items as sent for the requester", () => {
    expect(buildCompletedTradeExchange("outgoing", requestedItem, offeredItems)).toEqual({
      received: requestedItem,
      sent: offeredItems,
    });
  });

  it("shows offered items as received and the requested item as sent for the recipient", () => {
    expect(buildCompletedTradeExchange("incoming", requestedItem, offeredItems)).toEqual({
      received: offeredItems,
      sent: requestedItem,
    });
  });
});
