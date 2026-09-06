import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");
const sendProposal = source.slice(source.indexOf("sendTradeProposal:"), source.indexOf("acceptTradeProposal:"));

describe("cash payment selection persistence", () => {
  it("preserves a compatible payment row when cash terms change", () => {
    expect(sendProposal).toContain("const existingPayments = await tx.select");
    expect(sendProposal).toContain("const methodStillCompatible = Boolean(");
    expect(sendProposal).toContain("status = ${methodStillCompatible ? 'method_selected' : 'pending'}");
    expect(sendProposal).toContain("amount = ${obligation.amount.toFixed(2)}");
  });

  it("removes payment rows whose cash obligation no longer exists", () => {
    expect(sendProposal).toContain("await tx.delete(tradePayments).where(eq(tradePayments.id, existingPayment.id));");
    expect(sendProposal).toContain("const nextObligationByPayer = new Map(nextCashObligations.map");
  });
});
