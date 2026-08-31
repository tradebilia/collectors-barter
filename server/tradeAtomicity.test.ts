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

  it("blocks the inquiry sender from submitting before the listing owner responds", () => {
    const counteroffer = source.slice(source.indexOf("sendTradeProposal:"), source.indexOf("acceptTradeProposal:"));
    expect(counteroffer).toContain("proposal.status === 'pending' && proposal.requesterId === userId");
    expect(counteroffer).toContain("Your inquiry is awaiting the listing owner’s response");
    expect(counteroffer).toContain("You can decline it");
  });

  it("blocks a member from submitting another proposal while their latest proposal awaits a response", () => {
    const counteroffer = source.slice(source.indexOf("sendTradeProposal:"), source.indexOf("acceptTradeProposal:"));
    expect(counteroffer).toContain("proposal.status === 'negotiating' && proposal.lastProposedBy === userId");
    expect(counteroffer).toContain("Your proposal is awaiting the other member’s response");
  });

  it("validates offered counteroffer items before replacing the active terms", () => {
    const proposalSchema = source.slice(source.indexOf("sendProposalSchema"), source.indexOf("acceptProposalSchema"));
    const counteroffer = source.slice(source.indexOf("sendTradeProposal:"), source.indexOf("acceptTradeProposal:"));
    expect(proposalSchema).toContain("offeredListingIds: z.array(z.number().int().positive()).max(50)");
    expect(proposalSchema).toContain("requestedListingIds: z.array(z.number().int().positive()).max(50).optional().default([])");
    expect(counteroffer).toContain("Each offered item may be included only once");
    expect(counteroffer).toContain("Every offered item must be an active listing you own");
    expect(counteroffer).toContain("ownerId = ${userId} AND isActive = 1 AND status = 'active'");
    expect(counteroffer).toContain("Every requested item must be an active listing owned by the other member");
    expect(counteroffer).toContain("ownerId = ${otherUserId} AND isActive = 1 AND status = 'active'");
  });

  it("serializes mutual acceptance and treats a completed retry as safe", () => {
    const acceptance = source.slice(source.indexOf("acceptTradeProposal:"), source.indexOf("rejectTradeProposal:"));
    expect(acceptance).toContain("db.transaction(async (tx)");
    expect(acceptance).toContain("SELECT * FROM tradeProposals WHERE id = ${input.proposalId} FOR UPDATE");
    expect(acceptance).toContain("SELECT userId FROM tradeReceiptConfirmation");
    expect(acceptance).toContain("proposal.status === 'accepted' || proposal.status === 'shipping'");
    expect(acceptance).toContain("alreadyAccepted: true");
    expect(acceptance).toContain("!acceptance.alreadyAccepted && acceptance.notification === 'mutual'");
  });

  it("locks every shared listing in deterministic order before mutual acceptance", () => {
    const acceptance = source.slice(source.indexOf("acceptTradeProposal:"), source.indexOf("rejectTradeProposal:"));
    expect(acceptance).toContain("const involvedListingIds = [...new Set([");
    expect(acceptance).toContain(".sort((left, right) => Number(left) - Number(right))");
    expect(acceptance).toContain("SELECT id FROM listings WHERE id IN");
    expect(acceptance).toContain("AND isActive = 1 AND status = 'active' ORDER BY id FOR UPDATE");
    expect(acceptance).toContain("UPDATE listings SET status = 'traded'");
    expect(acceptance).toContain("affectedRows ?? 0) !== involvedListingIds.length");
    expect(acceptance).toContain("One or more trade items are no longer available");
  });
});
