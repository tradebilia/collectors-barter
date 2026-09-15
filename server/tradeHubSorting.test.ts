import { describe, expect, it } from "vitest";
import { sortTradeHubTrades } from "../client/src/pages/TradeHub";

const trades = [
  {
    tradeReferenceNumber: "TR-000003",
    createdAt: "2026-09-03T10:00:00.000Z",
    lastActivityAt: "2026-09-04T10:00:00.000Z",
    otherUser: { displayName: "Zelda" },
  },
  {
    tradeReferenceNumber: "TR-000001",
    createdAt: "2026-09-01T10:00:00.000Z",
    lastActivityAt: "2026-09-06T10:00:00.000Z",
    otherUser: { displayName: "Alex" },
  },
  {
    tradeReferenceNumber: "TR-000002",
    createdAt: "2026-09-02T10:00:00.000Z",
    lastActivityAt: "2026-09-05T10:00:00.000Z",
    otherUser: { username: "Morgan" },
  },
];

describe("Trade Hub sorting", () => {
  it("keeps Last Active as the descending default order", () => {
    expect(sortTradeHubTrades(trades, "lastActive").map((trade) => trade.tradeReferenceNumber)).toEqual(["TR-000001", "TR-000002", "TR-000003"]);
  });

  it("sorts accurately by creation date, partner, and trade reference", () => {
    expect(sortTradeHubTrades(trades, "newest").map((trade) => trade.tradeReferenceNumber)).toEqual(["TR-000003", "TR-000002", "TR-000001"]);
    expect(sortTradeHubTrades(trades, "oldest").map((trade) => trade.tradeReferenceNumber)).toEqual(["TR-000001", "TR-000002", "TR-000003"]);
    expect(sortTradeHubTrades(trades, "partner").map((trade) => trade.tradeReferenceNumber)).toEqual(["TR-000001", "TR-000002", "TR-000003"]);
    expect(sortTradeHubTrades(trades, "reference").map((trade) => trade.tradeReferenceNumber)).toEqual(["TR-000001", "TR-000002", "TR-000003"]);
  });
});
