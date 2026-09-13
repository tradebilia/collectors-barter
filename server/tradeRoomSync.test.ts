import { describe, expect, it } from "vitest";
import { getTradeProposalRevision, getTradeVideoRoomRevision, isIncomingProposalRevision } from "../client/src/lib/tradeRoomSync";

describe("Trade Room incoming proposal synchronization", () => {
  it("detects a newer proposal sent by the other member", () => {
    const previousRevision = getTradeProposalRevision({ id: 81, updatedAt: "2026-08-31T15:00:00.000Z", lastProposedBy: 10 });
    const nextRevision = getTradeProposalRevision({ id: 81, updatedAt: "2026-08-31T15:10:00.000Z", lastProposedBy: 20 });

    expect(isIncomingProposalRevision({
      previousRevision,
      nextRevision,
      lastProposedBy: 20,
      myUserId: 10,
      isNegotiating: true,
    })).toBe(true);
  });

  it("does not flag the current member’s proposal or a non-negotiating stage", () => {
    const previousRevision = "81:1:10";
    const nextRevision = "81:2:10";

    expect(isIncomingProposalRevision({ previousRevision, nextRevision, lastProposedBy: 10, myUserId: 10, isNegotiating: true })).toBe(false);
    expect(isIncomingProposalRevision({ previousRevision, nextRevision: "81:3:20", lastProposedBy: 20, myUserId: 10, isNegotiating: false })).toBe(false);
  });

  it("ignores generic proposal timestamp changes caused by video-room state updates", () => {
    const beforeVideoExit = getTradeProposalRevision({ id: 81, updatedAt: "2026-09-12T21:00:00.000Z", lastProposedBy: 20 });
    const afterVideoExit = getTradeProposalRevision({ id: 81, updatedAt: "2026-09-12T21:05:00.000Z", lastProposedBy: 20 });

    expect(afterVideoExit).toBe(beforeVideoExit);
    expect(isIncomingProposalRevision({
      previousRevision: beforeVideoExit,
      nextRevision: afterVideoExit,
      lastProposedBy: 20,
      myUserId: 10,
      isNegotiating: true,
    })).toBe(false);
  });

  it("identifies Daily room lifecycle changes independently from proposal terms", () => {
    const callActive = getTradeVideoRoomRevision({ id: 81, dailyRoomName: "trade-81", dailyRoomUrl: "https://daily.example/trade-81", dailyRoomStartedBy: 20 });
    const callEnded = getTradeVideoRoomRevision({ id: 81, dailyRoomName: "trade-81", dailyRoomUrl: "https://daily.example/trade-81", dailyRoomStartedBy: null });

    expect(callActive).not.toBe(callEnded);
    expect(getTradeProposalRevision({ id: 81, updatedAt: "2026-09-12T21:00:00.000Z", lastProposedBy: 20 }))
      .toBe(getTradeProposalRevision({ id: 81, updatedAt: "2026-09-12T21:05:00.000Z", lastProposedBy: 20 }));
  });
});
