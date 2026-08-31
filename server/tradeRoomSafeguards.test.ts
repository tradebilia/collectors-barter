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
    expect(warRoomSource).toContain("const canSubmitProposal = negotiationTurn.canSubmitProposal && !incomingProposalNotice;");
    expect(warRoomSource).toContain("Waiting for the listing owner to respond.");
    expect(warRoomSource).toContain("Your proposal is awaiting the other member’s response.");
    expect(warRoomSource).toContain("onClick={() => setShowDeclineModal(true)}");
  });
  it("keeps owned offers separate from counterparty requested items", () => {
    const theirInventory = warRoomSource.slice(warRoomSource.indexOf("Their Inventory Modal"), warRoomSource.indexOf("Item Detail Popup Modal"));
    expect(warRoomSource).toContain("buildTradeProposalItemPayload({");
    expect(warRoomSource).toContain("requestedListingIds,");
    expect(warRoomSource).toContain("The original requested item is already in this trade.");
    expect(theirInventory).toContain("Select additional items you want to request from");
    expect(theirInventory).toContain("Add Requested Items");
  });

  it("surfaces incoming terms safely and keeps both cash sides adjustable while negotiating", () => {
    expect(warRoomSource).toContain("getTradeProposalRevision");
    expect(warRoomSource).toContain("isIncomingProposalRevision");
    expect(warRoomSource).toContain("data-testid=\"incoming-proposal-notice\"");
    expect(warRoomSource).toContain("Load Updated Terms");
    expect(warRoomSource).toContain("Your unsent changes are protected");
    expect(warRoomSource).toContain("myCash > 0 ? 'Adjust Cash' : 'Add Cash'");
    expect(warRoomSource).toContain("theirCash > 0 ? 'Adjust Cash' : 'Add Cash'");
  });

  it("renders every Shipping-stage cash obligation separately before item receipt confirmation", () => {
    expect(warRoomSource).toContain("const obligations = (cashAdjustmentContextQuery.data?.obligations ?? [])");
    expect(warRoomSource).toContain("Cash Settlement During Shipping");
    expect(warRoomSource).toContain("Complete each cash confirmation during Shipping before the trade moves to item receipt confirmation.");
    expect(warRoomSource).toContain("transactionReferenceByPayer");
    expect(warRoomSource).toContain("payerId: context.payerId");
  });

  it("uses owner-derived tracking items and distinguishes payment loading from a cash-free trade", () => {
    expect(warRoomSource).toContain("getLockedShipmentItems({");
    expect(warRoomSource).toContain('data-testid="shipping-counterparty-locked-items"');
    expect(warRoomSource).toContain("Items {theirDisplayName} is sending");
    expect(warRoomSource).toContain("cashAdjustmentContextQuery.isLoading");
    expect(warRoomSource).toContain("cashAdjustmentContextQuery.isError");
    expect(warRoomSource).toContain("No direct cash settlement is required for this trade.");
  });

  it("places receipt, report, and dispute actions in the sticky footer from Review onward", () => {
    const footer = warRoomSource.slice(warRoomSource.indexOf("Sticky Footer Action Bar"), warRoomSource.indexOf("{/* MODALS */}"));
    expect(footer).toContain('aria-label="Trade documents and support actions"');
    expect(footer).toContain("Download Trade Receipt (PDF)");
    expect(footer).toContain("Report a Trade Issue");
    expect(footer).toContain("Request Dispute Review");
  });
  it("rejects review resubmission while allowing a first completed-trade review", () => {
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "completed", alreadyReviewed: false })).toBeNull();
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "completed", alreadyReviewed: true })).toBe("already-reviewed");
    expect(getReviewSubmissionBlocker({ isParticipant: true, tradeStatus: "shipped", alreadyReviewed: false })).toBe("trade-not-completed");
    expect(getReviewSubmissionBlocker({ isParticipant: false, tradeStatus: "completed", alreadyReviewed: false })).toBe("not-participant");
  });
});
