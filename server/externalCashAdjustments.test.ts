import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const tradeFlowSource = readFileSync(resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/AccountSettings.tsx"), "utf8");
const setupSource = readFileSync(resolve(process.cwd(), "client/src/pages/AccountSetup.tsx"), "utf8");
const warRoomSource = readFileSync(resolve(process.cwd(), "client/src/pages/WarRoom.tsx"), "utf8");

describe("External cash-adjustment safeguards", () => {
  it("stores member-provided destinations and trade-level method status fields", () => {
    expect(schemaSource).toContain("venmoUsername");
    expect(schemaSource).toContain("cashAppCashtag");
    expect(schemaSource).toContain("zelleEmail");
    expect(schemaSource).toContain("zellePhone");
    expect(schemaSource).toContain("paymentMethod: mysqlEnum(['paypal','venmo','cash_app','zelle'])");
    expect(schemaSource).toContain("'method_selected','sent','received','disputed'");
    expect(schemaSource).toContain("requestedListingId: int().references(() => listings.id)");
  });

  it("treats Profile changes as future payment preferences and preserves accepted trade snapshots", () => {
    expect(routerSource).toContain("externalPaymentMethodsInputSchema");
    expect(routerSource).toContain("saveExternalPaymentMethods");
    expect(routerSource).toContain("preferencesChanged: methodChanged");
    expect(settingsSource).toContain("Accepted trade payment details are unchanged");
  });

  it("matches member-enabled methods in Step 2 and reveals destinations only to the payer after acceptance", () => {
    const context = routerSource.slice(routerSource.indexOf("getCashAdjustmentContext:"), routerSource.indexOf("selectCashAdjustmentMethod:", routerSource.indexOf("getCashAdjustmentContext:")));
    expect(context).toContain("getSharedExternalPaymentMethods");
    expect(context).toContain("mayRevealDestination");
    expect(context).toContain('proposal.status === "shipping" || proposal.status === "shipped"');
    expect(context).toContain("obligation.payerId === ctx.user.id ? payment.paymentIdentifier : null");
    expect(context).toContain("partnerDisplayName");
  });

  it("requires the cash recipient to select a shared method during negotiation", () => {
    const selection = routerSource.slice(routerSource.indexOf("selectCashAdjustmentMethod:"), routerSource.indexOf("markCashAdjustmentSent:", routerSource.indexOf("selectCashAdjustmentMethod:")));
    expect(selection).toContain('proposal.status !== "negotiating"');
    expect(selection).toContain("Only the trade participant receiving cash can choose the payment method");
    expect(selection).toContain("Both members must enable");
    expect(tradeFlowSource).toContain("has no payment method in common");
  });

  it("keeps provider claims accurate and separates sent from received confirmation", () => {
    expect(routerSource).toContain("markCashAdjustmentSent");
    expect(routerSource).toContain("confirmCashAdjustmentReceived");
    expect(routerSource).toContain('externalVerification: "not_available"');
    expect(routerSource).toContain('externalVerification: "member_confirmed"');
    expect(warRoomSource).toContain("Tradebilia does not process or verify this external payment");
  });

  it("provides checkbox-based private Profile and Account Setup method setup plus clear Step 2 compatibility guidance", () => {
    for (const source of [settingsSource, setupSource]) {
      expect(source).toContain("enabledMethods");
      expect(source).toContain("PayPal");
      expect(source).toContain("Venmo");
      expect(source).toContain("Cash App");
      expect(source).toContain("Zelle");
    }
    expect(warRoomSource).toContain("Cash payment method");
    expect(warRoomSource).toContain("No shared method");
    expect(warRoomSource).toContain("currently accepts");
    expect(warRoomSource).toContain("Shipping & Payment");
    expect(warRoomSource).toContain("I Received");
  });
});
