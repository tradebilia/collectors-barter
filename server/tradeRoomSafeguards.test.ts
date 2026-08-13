import { describe, expect, it } from "vitest";
import { getReviewSubmissionBlocker, resolveTradeContactName } from "./tradeRoomSafeguards";

describe("Trade Room safeguards", () => {
  it("uses the saved legal first and last name before legacy account-name fallbacks", () => {
    expect(resolveTradeContactName({
      contactFullName: null,
      firstName: "Rich",
      lastName: "Tavani",
      name: "rtavani",
      username: "AdminTavani",
    })).toBe("Rich Tavani");
  });

  it("retains a complete saved contact name when one is available", () => {
    expect(resolveTradeContactName({
      contactFullName: "Dylan Rhoads",
      firstName: "Dylan",
      lastName: "Rhoads",
      name: "rtavani",
    })).toBe("Dylan Rhoads");
  });

  it("rejects review resubmission while allowing a first completed-trade review", () => {
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "completed", alreadyReviewed: false })).toBeNull();
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "completed", alreadyReviewed: true })).toBe("already-reviewed");
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "shipped", alreadyReviewed: false })).toBe("trade-not-completed");
    expect(getReviewSubmissionBlocker({ isParticipant: false, tradeStatus: "completed", alreadyReviewed: false })).toBe("not-participant");
  });
});
