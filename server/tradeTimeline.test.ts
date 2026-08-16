import { describe, expect, it } from "vitest";
import { buildLegacyTradeTimeline, isMissingTradeActivityLogError } from "./tradeTimeline";

describe("legacy trade timeline fallback", () => {
  it("reconstructs historical milestones and messages in chronological order without an activity-log table", () => {
    const events = buildLegacyTradeTimeline({ id: 120003, requesterId: 30002, requesterName: "Administrator", recipientName: "Rtavani", status: "shipping", createdAt: "2026-08-01 09:00:00", negotiatingAt: "2026-08-02 09:00:00", acceptedAt: "2026-08-03 09:00:00", shippingAt: "2026-08-04 09:00:00", initiatorMessage: "Interested in your card" }, [{ id: 7, senderId: 60003, actorName: "Rtavani", message: "How about this?", createdAt: "2026-08-02 12:00:00" }]);
    expect(events.map((event) => event.eventType)).toEqual(["trade_created", "proposal_sent", "message_sent", "proposal_accepted", "tracking_submitted"]);
    expect(events[0]).toMatchObject({ actorName: "Administrator", details: "Interested in your card" });
    expect(events[2]).toMatchObject({ actorName: "Rtavani", details: "How about this?" });
  });
  it("recognizes only an absent activity-log table as a fallback condition", () => {
    expect(isMissingTradeActivityLogError(new Error("Table 'tradeActivityLog' doesn't exist"))).toBe(true);
    expect(isMissingTradeActivityLogError(new Error("Unknown column 'actorName' in 'field list'"))).toBe(false);
  });
});
