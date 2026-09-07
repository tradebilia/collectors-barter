import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Traders Showcase voting contracts", () => {
  it("uses an additive vote table with one vote per member per completed trade", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/0020_premium_random.sql");

    expect(schema).toContain('export const tradeShowcaseVotes = mysqlTable("tradeShowcaseVotes"');
    expect(schema).toContain("uniqueIndex(\"tradeShowcaseVotes_proposal_voter_unique\").on(table.proposalId, table.voterId)");
    expect(schema).toContain("mysqlEnum(['good', 'bad'])");
    expect(migration).toContain("CREATE TABLE `tradeShowcaseVotes`");
    expect(migration).toContain("UNIQUE(`proposalId`,`voterId`)");
    expect(migration).toContain("DEFAULT CURRENT_TIMESTAMP");
    expect(migration).not.toContain("DROP TABLE");
    expect(migration).not.toContain("ALTER TABLE `tradeShowcaseVotes` ADD CONSTRAINT");
  });

  it("returns real vote summaries and the current member vote from the Showcase query", () => {
    const router = read("server/routers.ts");

    const db = read("server/db.ts");

    expect(db).toContain("export async function ensureTradeShowcaseVotesTable");
    expect(db).toContain("CREATE TABLE IF NOT EXISTS tradeShowcaseVotes");
    expect(router).toContain("await ensureTradeShowcaseVotesTable()");
    expect(router).toContain("FROM tradeShowcaseVotes");
    expect(router).toContain("SUM(CASE WHEN vote = 'good' THEN 1 ELSE 0 END) AS goodVotes");
    expect(router).toContain("SUM(CASE WHEN vote = 'bad' THEN 1 ELSE 0 END) AS badVotes");
    expect(router).toContain("viewerVote");
    expect(router).toContain("voteOnCompletedTrade: protectedProcedure");
    expect(router).toContain("ON DUPLICATE KEY UPDATE vote = VALUES(vote)");
  });

  it("renders accessible Good Trade and Bad Trade controls without fake counts", () => {
    const page = read("client/src/pages/TradeShowcase.tsx");

    expect(page).toContain("TradeVoteControls");
    expect(page).toContain("Good Trade");
    expect(page).toContain("Bad Trade");
    expect(page).toContain("aria-pressed={trade.viewerVote === \"good\"}");
    expect(page).toContain("aria-pressed={trade.viewerVote === \"bad\"}");
    expect(page).toContain("No community votes yet");
    expect(page).toContain("Sign in to vote");
    expect(page).not.toContain("83% Good Trade");
    expect(page).not.toContain("12 votes");
  });
});
