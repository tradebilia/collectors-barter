import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const router = readFileSync(join(root, "server/routers.ts"), "utf8");
const tradeRouter = readFileSync(join(root, "server/tradeFlowRouter.ts"), "utf8");

function between(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("fourth deep-audit P0 regression contract", () => {
  it("accepts only known categories and parameterizes the public completed-trade category predicate", () => {
    const completedTrades = between(router, "getCompletedTrades: publicProcedure", "onlineStatus: router");

    expect(completedTrades).toContain('category: z.enum(["all", ...collectibleCategories]).optional()');
    expect(completedTrades).toContain("l.category = ${category}");
    expect(completedTrades).toContain("ol.category = ${category}");
    expect(completedTrades).not.toContain("sql.raw(categoryFilter)");
    expect(completedTrades).toContain("${isPublicMemberEligible(sql`tp.requesterId`)}");
    expect(completedTrades).toContain("${isPublicMemberEligible(sql`tp.recipientId`)}");
  });

  it("does not allow rated or completed-trade public views to bypass shared member eligibility", () => {
    const topRated = between(router, "getTopRatedTraders: publicProcedure", "getCompletedTrades: publicProcedure");
    const completedTrades = between(router, "getCompletedTrades: publicProcedure", "onlineStatus: router");

    expect(topRated).toContain("WHERE ${isPublicMemberEligible(sql`u.id`)}");
    expect(topRated).not.toContain("WHERE u.isBanned = 0 AND u.isSuspended = 0");
    expect(completedTrades).toContain("${isPublicMemberEligible(sql`tp.requesterId`)}");
    expect(completedTrades).toContain("${isPublicMemberEligible(sql`tp.recipientId`)}");
  });

  it("invalidates every earlier acceptance inside the locked counterproposal transaction when terms change", () => {
    const counterproposal = between(tradeRouter, "sendTradeProposal: protectedProcedure", "acceptTradeProposal: protectedProcedure");

    expect(counterproposal).toContain("SELECT * FROM tradeProposals WHERE id = ${input.proposalId} FOR UPDATE");
    expect(counterproposal).toContain("const offeredItemsChanged");
    expect(counterproposal).toContain("const cashTermsChanged");
    expect(counterproposal).toContain("const termsChanged = offeredItemsChanged || cashTermsChanged");
    expect(counterproposal).toContain("if (termsChanged)");
    expect(counterproposal).toContain("DELETE FROM tradeReceiptConfirmation WHERE proposalId = ${input.proposalId} AND confirmationType = 'accepted'");
    expect(counterproposal).toContain("'acceptance_reset'");
    expect(counterproposal.indexOf("if (termsChanged)")).toBeLessThan(counterproposal.indexOf("'proposal_sent'"));
  });

  it("does not reset acceptance merely because a counterproposal sends a message without changed terms", () => {
    const counterproposal = between(tradeRouter, "sendTradeProposal: protectedProcedure", "acceptTradeProposal: protectedProcedure");

    expect(counterproposal).toContain("const termsChanged = offeredItemsChanged || cashTermsChanged");
    expect(counterproposal).toContain("if (termsChanged) {");
    expect(counterproposal).toContain("if (input.message)");
  });
});
