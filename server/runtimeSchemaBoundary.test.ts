import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("runtime schema boundary", () => {
  it("keeps schema-definition SQL out of request-serving modules", () => {
    const db = read("server/db.ts");
    const router = read("server/routers.ts");

    for (const source of [db, router]) {
      expect(source).not.toMatch(/\bCREATE\s+TABLE\b/i);
      expect(source).not.toMatch(/\bALTER\s+TABLE\b/i);
      expect(source).not.toMatch(/\bDROP\s+TABLE\b/i);
    }
  });

  it("retains reviewed migration artifacts for each removed runtime bootstrap", () => {
    const musicMigration = read("drizzle/0024_p0_music_category_schema.sql");
    const reportsMigration = read("drizzle/0021_user_reports_runtime.sql");
    const reportsCompatibilityMigration = read("drizzle/0022_user_reports_status_compat.sql");
    const ticketsMigration = read("drizzle/0023_support_tickets_runtime.sql");
    const votesMigration = read("drizzle/0020_premium_random.sql");

    expect(musicMigration).toContain("ALTER TABLE `listings`");
    expect(musicMigration).toContain("ALTER TABLE `conventions`");
    expect(reportsMigration).toContain("CREATE TABLE IF NOT EXISTS `userReports`");
    expect(reportsCompatibilityMigration).toContain("ALTER TABLE userReports");
    expect(ticketsMigration).toContain("CREATE TABLE IF NOT EXISTS supportTickets");
    expect(votesMigration).toContain("CREATE TABLE `tradeShowcaseVotes`");
  });
});
