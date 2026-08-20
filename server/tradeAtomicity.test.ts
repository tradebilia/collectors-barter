import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "server/tradeFlowRouter.ts"), "utf8");

describe("Trade Room atomicity and retry-safety contracts", () => {
  it("wraps counteroffer replacement in a database transaction", () => {
    const counteroffer = source.slice(source.indexOf("sendTradeProposal:"), source.indexOf("acceptTradeProposal:"));
    expect(counteroffer).toContain("db.transaction(async (tx)");
    expect(counteroffer).toContain("FOR UPDATE");
    expect(counteroffer).toContain("DELETE FROM tradeProposalItems");
    expect(counteroffer).toContain("await tx.insert(tradeProposalItems)");
  });

  it("validates offered counteroffer items before replacing the active terms", () => {
    const proposalSchema = source.slice(source.indexOf("sendProposalSchema"), source.indexOf("acceptProposalSchema"));
    const counteroffer = source.slice(source.indexOf("sendTradeProposal:"), source.indexOf("acceptTradeProposal:"));
    expect(proposalSchema).toContain("offeredListingIds: z.array(z.number().int().positive()).max(50)");
    expect(counteroffer).toContain("Each offered item may be included only once");
    expect(counteroffer).toContain("Every offered item must be an active listing you own");
    expect(counteroffer).toContain("ownerId = ${userId} AND isActive = 1 AND status = 'active'");
  });

  it("serializes mutual acceptance and treats a completed retry as safe", () => {
    const acceptance = source.slice(source.indexOf("acceptTradeProposal:"), source.indexOf("rejectTradeProposal:"));
    expect(acceptance).toContain("db.transaction(async (tx)");
    expect(acceptance).toContain("SELECT * FROM tradeProposals WHERE id = ${input.proposalId} FOR UPDATE");
    expect(acceptance).toContain("SELECT userId FROM tradeReceiptConfirmation");
    expect(acceptance).toContain("if (proposal.status === 'shipping')");
    expect(acceptance).toContain("alreadyAccepted: true");
    expect(acceptance).toContain("!acceptance.alreadyAccepted && acceptance.notification === 'mutual'");
  });
});
