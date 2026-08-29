import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const schema = fs.readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "drizzle/0010_p1_unique_integrity_indexes.sql"), "utf8");
const database = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");

describe("P1 database integrity protections", () => {
  it("declares and migrates the five approved unique constraints", () => {
    expect(schema).toContain('uniqueIndex("users_username_unique").on(table.username)');
    expect(schema).toContain('uniqueIndex("userProfiles_userId_unique").on(table.userId)');
    expect(schema).toContain('uniqueIndex("userReports_reportId_unique").on(table.reportId)');
    expect(schema).toContain('uniqueIndex("watchlistEntries_unique_user_listing").on(table.userId, table.listingId)');
    expect(schema).toContain('uniqueIndex("favorites_user_listing_unique").on(table.userId, table.listingId)');
    expect(migration.match(/ADD UNIQUE INDEX/g)).toHaveLength(5);
  });

  it("uses duplicate-safe profile and watchlist writes and retries report reference allocation", () => {
    expect(database).toContain('onDuplicateKeyUpdate({ set: { userId: sql`${userProfiles.userId}` } })');
    expect(database).toContain('onDuplicateKeyUpdate({ set: { id: sql`${watchlistEntries.id}` } })');
    expect(database).toContain('onDuplicateKeyUpdate({ set: { id: sql`${favorites.id}` } })');
    expect(database).toContain('for (let attempt = 0; attempt < 3; attempt += 1)');
    expect(database).toContain('if (isDuplicateKeyError(error)) throw new Error("Username already taken")');
  });
});
