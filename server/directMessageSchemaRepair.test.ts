import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("direct-message schema repair contract", () => {
  const migration = readFileSync(join(process.cwd(), "drizzle", "0027_p0_direct_message_item_link.sql"), "utf8");

  it("restores the nullable listing linkage, foreign key, and item index", () => {
    expect(migration).toContain("ADD COLUMN `itemId` int NULL");
    expect(migration).toContain("directMessageThreads_itemId_listings_id_fk");
    expect(migration).toContain("REFERENCES `listings`(`id`) ON DELETE SET NULL");
    expect(migration).toContain("CREATE INDEX `dmThreads_itemId_idx`");
  });

  it("contains only additive, data-preserving operations", () => {
    expect(migration).not.toMatch(/\b(DROP\s+TABLE|DROP\s+COLUMN|DELETE\s+FROM|TRUNCATE|RENAME\s+COLUMN)\b/i);
  });
});
