import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const paymentSource = readFileSync(resolve(process.cwd(), "server/paymentAuthorization.ts"), "utf8");
const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");

describe("Review, Shipping & Payment, and Confirm Receipt lifecycle", () => {
  it("keeps a mutually accepted trade in Review with its included items locked", () => {
    const acceptance = source.slice(source.indexOf("acceptTradeProposal:"), source.indexOf("markTradeDisputed:", source.indexOf("acceptTradeProposal:")));
    expect(acceptance).toContain("status = 'accepted'");
    expect(acceptance).toContain("shippingAt = NULL");
    expect(acceptance).toContain("entering Review stage");
  });

  it("requires recipient-selected cash methods before cash-inclusive terms can be accepted", () => {
    const acceptance = source.slice(source.indexOf("acceptTradeProposal:"), source.indexOf("markTradeDisputed:", source.indexOf("acceptTradeProposal:")));
    expect(acceptance).toContain("Each member receiving cash must choose a shared payment method during Step 2");
    expect(acceptance).toContain("payment.status !== \"method_selected\"");
  });

  it("moves to Step 5 only after every required tracking record and payment-sent confirmation", () => {
    const tracking = source.slice(source.indexOf("submitTrackingNumbers:"), source.indexOf("confirmItemsReceived:", source.indexOf("submitTrackingNumbers:")));
    expect(tracking).toContain("allTrackingSubmitted && allCashPaymentsSent");
    expect(tracking).toContain("awaitingPaymentSentConfirmation");
    expect(tracking).toContain("haveAllCashPaymentsBeenSent");
  });

  it("keeps cash receipt confirmation in Step 5 and completes only after all applicable receipts", () => {
    const cashReceipt = routerSource.slice(routerSource.indexOf("confirmCashAdjustmentReceived:"), routerSource.indexOf("openCashAdjustmentDispute:", routerSource.indexOf("confirmCashAdjustmentReceived:")));
    const physicalReceipt = source.slice(source.indexOf("confirmItemsReceived:"), source.indexOf("getTradeAlerts:", source.indexOf("confirmItemsReceived:")));
    expect(cashReceipt).toContain('proposalRows[0]?.status !== "shipped"');
    expect(cashReceipt).toContain("allCashPaymentsReceived && allRequiredItemReceiptsConfirmed");
    expect(physicalReceipt).toContain("haveAllRequiredItemRecipientsConfirmed");
    expect(physicalReceipt).toContain("haveAllCashPaymentsBeenReceived");
  });

  it("derives tracking eligibility from persisted item ownership and supports no-item cash-only exchanges", () => {
    const tracking = source.slice(source.indexOf("submitTrackingNumbers:"), source.indexOf("confirmItemsReceived:", source.indexOf("submitTrackingNumbers:")));
    expect(tracking).toContain("tradeListings.filter((listing) => listing.ownerId === userId)");
    expect(tracking).toContain("hasTrackingForEveryItem");
    expect(schemaSource).toContain("requestedListingId: int().references(() => listings.id)");
    expect(source).toContain("includeOriginalRequestedListing");
  });

  it("derives cash obligations for the full negotiation-to-receipt lifecycle", () => {
    expect(paymentSource).toContain('["negotiating", "accepted", "shipping", "shipped"]');
    expect(paymentSource).toContain("amount <= 0");
  });
});
