import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getReviewSubmissionBlocker, resolveTradeContactName } from "./tradeRoomSafeguards";

const warRoomSource = readFileSync(resolve(process.cwd(), "client/src/pages/WarRoom.tsx"), "utf8");

describe("Trade Room safeguards", () => {
  it("uses the saved legal first and last name before legacy account-name fallbacks", () => {
    expect(resolveTradeContactName({ contactFullName: null, firstName: "Rich", lastName: "Tavani", name: "rtavani", username: "AdminTavani" })).toBe("Rich Tavani");
  });
  it("retains a complete saved contact name when one is available", () => {
    expect(resolveTradeContactName({ contactFullName: "Dylan Rhoads", firstName: "Dylan", lastName: "Rhoads", name: "rtavani" })).toBe("Dylan Rhoads");
  });
  it("shows a waiting state instead of a proposal action when the member must wait", () => {
    expect(warRoomSource).toContain("const canSubmitProposal = negotiationTurn.canSubmitProposal;");
    expect(warRoomSource).toContain("Waiting for the listing owner to respond.");
    expect(warRoomSource).toContain("Your proposal is awaiting the other member’s response.");
    expect(warRoomSource).toContain("onClick={() => setShowDeclineModal(true)}");
  });
  it("rejects review resubmission while allowing a first completed-trade review", () => {
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "completed", alreadyReviewed: false })).toBeNull();
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "completed", alreadyReviewed: true })).toBe("already-reviewed");
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "shipped", alreadyReviewed: false })).toBe("trade-not-completed");
    expect(getReviewSubmissionBlocker({ isParticipant: false, tradeStatus: "completed", alreadyReviewed: false })).toBe("not-participant");
  });
});
