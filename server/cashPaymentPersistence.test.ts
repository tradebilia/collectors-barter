import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");
const sendProposal = source.slice(source.indexOf("sendTradeProposal:"), source.indexOf("acceptTradeProposal:"));

describe("cash payment selection persistence", () => {
  it("stores the selected shared method with the cash amount and resets the accepted payment state when the amount changes", () => {
    expect(sendProposal).toContain("const selectedCashMethodByPayer = new Map");
    expect(sendProposal).toContain("getExternalPaymentIdentifier(selectedMethod, payee ?? {})");
    expect(sendProposal).toContain("const amountChanged = Boolean(existingPayment && Number(existingPayment.amount) !== obligation.amount)");
    expect(sendProposal).toContain('eventType: "cash_payment_terms_reset"');
    expect(sendProposal).toContain('eventType: "cash_payment_method_selected"');
    expect(sendProposal).toContain('status: "method_selected" as const');
  });

  it("removes payment rows whose cash obligation no longer exists", () => {
    expect(sendProposal).toContain("if (!nextPayerIds.has(existingPayment.payerId))");
    expect(sendProposal).toContain("await tx.delete(tradePayments).where(eq(tradePayments.id, existingPayment.id));");
    expect(sendProposal).toContain("const nextPayerIds = new Set(nextCashObligations.map");
  });
});
