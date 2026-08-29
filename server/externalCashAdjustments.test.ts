import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const tradeFlowSource = readFileSync(resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/AccountSettings.tsx"), "utf8");
const setupSource = readFileSync(resolve(process.cwd(), "client/src/pages/AccountSetup.tsx"), "utf8");
const warRoomSource = readFileSync(resolve(process.cwd(), "client/src/pages/WarRoom.tsx"), "utf8");
const adminSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("External cash-adjustment safeguards", () => {
  it("stores all approved private member destinations and trade-level status fields", () => {
    expect(schemaSource).toContain("venmoUsername");
    expect(schemaSource).toContain("cashAppCashtag");
    expect(schemaSource).toContain("zelleEmail");
    expect(schemaSource).toContain("zellePhone");
    expect(schemaSource).toContain("paymentMethod: mysqlEnum(['paypal','venmo','cash_app','zelle'])");
    expect(schemaSource).toContain("'method_selected','sent','received','disputed'");
    expect(schemaSource).toContain("paymentMethodSelectedAt");
    expect(schemaSource).toContain("disputeReason");
  });

  it("validates private member destinations and resets active terms when a payee changes them", () => {
    expect(routerSource).toContain("externalPaymentMethodsInputSchema");
    expect(routerSource).toContain("Use one Zelle destination");
    expect(routerSource).toContain("saveExternalPaymentMethods");
    expect(routerSource).toContain("cash_payment_terms_reset");
    expect(routerSource).toContain("Payee changed a direct-payment identifier");
  });

  it("reveals an external identifier only to an accepted-trade payer after payee selection", () => {
    const context = routerSource.slice(routerSource.indexOf("getCashAdjustmentContext:"), routerSource.indexOf("selectCashAdjustmentMethod:", routerSource.indexOf("getCashAdjustmentContext:")));
    expect(context).toContain('proposal.status !== "accepted"');
    expect(context).toContain('role === "payee"');
    expect(context).toContain("maskExternalPaymentIdentifier");
    expect(context).toContain("role !== \"payer\" || !ownObligation");
    expect(context).toContain("availableMethods: []");
  });

  it("requires member-confirmed sent and received statuses instead of claiming provider verification", () => {
    expect(routerSource).toContain("markCashAdjustmentSent");
    expect(routerSource).toContain("confirmCashAdjustmentReceived");
    expect(routerSource).toContain("openCashAdjustmentDispute");
    expect(routerSource).toContain("externalVerification: \"not_available\"");
    expect(routerSource).toContain("externalVerification: \"member_confirmed\"");
    expect(routerSource).toContain("REVEAL CASH PAYMENT IDENTIFIER");
  });

  it("blocks shipping until cash receipt confirmation and keeps disputes blocked", () => {
    const shipping = tradeFlowSource.slice(tradeFlowSource.indexOf("proceedToShipping:"), tradeFlowSource.indexOf("// ==========================================================================\n  // COMMUNICATION", tradeFlowSource.indexOf("proceedToShipping:")));
    expect(shipping).toContain("cashObligations");
    expect(shipping).toContain("paymentStatus === 'disputed'");
    expect(shipping).toContain("paymentStatus !== 'received' && paymentStatus !== 'verified'");
  });

  it("provides private setup and settings forms plus Trade Room and masked admin controls", () => {
    for (const source of [settingsSource, setupSource]) {
      expect(source).toContain("Venmo username");
      expect(source).toContain("Cash App $cashtag");
      expect(source).toContain("Zelle");
      expect(source).toContain("does not process, hold, insure, refund, or guarantee direct payments");
    }
    expect(warRoomSource).toContain("getCashAdjustmentContext");
    expect(warRoomSource).toContain("I sent it");
    expect(warRoomSource).toContain("Confirm receipt");
    expect(warRoomSource).toContain("Open dispute");
    expect(adminSource).toContain("External Cash Adjustments");
    expect(adminSource).toContain("Audited reveal");
  });
});
