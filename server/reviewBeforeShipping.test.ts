import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");
const paymentSource = readFileSync(resolve(process.cwd(), "server/paymentAuthorization.ts"), "utf8");
const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");

describe("Review-before-Shipping trade lifecycle", () => {
  it("keeps a mutually accepted trade in the Review status with its items locked", () => {
    const acceptance = source.slice(source.indexOf("acceptTradeProposal:"), source.indexOf("markTradeDisputed:", source.indexOf("acceptTradeProposal:")));

    expect(acceptance).toContain("status = 'accepted'");
    expect(acceptance).toContain("shippingAt = NULL");
    expect(acceptance).toContain("shippingDeadline = NULL");
    expect(acceptance).toContain("UPDATE listings SET status = 'traded'");
    expect(acceptance).toContain("entering Review stage");
  });

  it("starts Shipping and the deadline only after both members confirm Review", () => {
    const shipping = source.slice(source.indexOf("proceedToShipping:"), source.indexOf("// ==========================================================================\n  // COMMUNICATION", source.indexOf("proceedToShipping:")));

    expect(shipping).toContain("proposal.status as string) !== 'accepted'");
    expect(shipping).toContain("status = 'shipping'");
    expect(shipping).toContain("shippingDeadline = COALESCE(shippingDeadline, DATE_ADD");
  });

  it("maps payment payer and payee fields to the established live database columns", () => {
    expect(schemaSource).toContain('payerId: int("payerUserId")');
    expect(schemaSource).toContain('payeeId: int("payeeUserId")');
    expect(source).toContain("tradePayments.payerId");
    expect(source).toContain("tradePayments.status");
  });

  it("keeps server-derived PayPal verification available during the accepted Review stage", () => {
    expect(paymentSource).toContain('proposal.status !== "accepted"');
    expect(paymentSource).toContain("amount <= 0");
  });
});
