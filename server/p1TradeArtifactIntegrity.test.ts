import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const schema = readFileSync(join(root, "drizzle/schema.ts"), "utf8");
const migration = readFileSync(join(root, "drizzle/0012_p1_trade_artifact_integrity.sql"), "utf8");
const tradeRouter = readFileSync(join(root, "server/tradeFlowRouter.ts"), "utf8");

describe("second deep-audit trade artifact integrity", () => {
  it("declares and migrates every approved one-time trade artifact constraint", () => {
    for (const name of [
      "tradePrivateNotes_proposal_user_unique",
      "tradeProposalItems_proposal_listing_unique",
      "tradeReceiptConfirmation_proposal_user_unique",
      "tradeReviews_proposal_reviewer_unique",
      "tradeTrackingNumbers_proposal_user_listing_unique",
      "tradeVotes_link_voter_unique",
      "tradeVotingLinks_proposal_unique",
      "tradeVotingLinks_token_unique",
    ]) {
      expect(schema).toContain(`uniqueIndex(\"${name}\")`);
      expect(migration).toContain(`UNIQUE INDEX \`${name}\``);
    }
  });

  it("retains the oldest duplicate review deterministically before applying uniqueness", () => {
    expect(migration).toContain("newer.`id` > older.`id`");
    expect(migration).toContain("DELETE newer");
  });

  it("keeps one-time trade artifact writes participant-bound and conflict-safe", () => {
    expect(tradeRouter).toContain("randomBytes(32).toString('base64url')");
    expect(tradeRouter).toContain("Both members must complete Review before tracking can be submitted.");
    expect(tradeRouter).toContain("Receipt confirmation is available after both members have submitted tracking.");
    expect(tradeRouter).toContain("ON DUPLICATE KEY UPDATE id = id");
    expect(tradeRouter).toContain("You have already submitted a review for this trade.");
    expect(tradeRouter).toContain("You have already voted on this trade.");
    expect(tradeRouter).toContain("Only trade participants can save private notes.");
    expect(tradeRouter).toContain("Only trade participants can view private notes.");
    expect(tradeRouter).toContain("AND status = 'accepted'");
  });
});
