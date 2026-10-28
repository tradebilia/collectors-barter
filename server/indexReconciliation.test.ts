import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("secondary-index reconciliation migration", () => {
  const migration = readFileSync(join(process.cwd(), "drizzle", "0028_p0_secondary_index_reconciliation.sql"), "utf8");
  const statements = migration.split(";").filter((statement) => statement.trim().startsWith("CREATE INDEX"));

  it("contains 105 distinct additive index statements", () => {
    expect(statements).toHaveLength(105);
    expect(new Set(statements.map((statement) => statement.replace(/CREATE INDEX `[^`]+`/, "CREATE INDEX"))).size).toBe(105);
  });

  it("contains no destructive or uniqueness-changing SQL", () => {
    const executableSql = migration.replaceAll(/--[^\n]*/g, "");
    expect(executableSql).not.toMatch(/\b(DROP|DELETE|TRUNCATE|ALTER)\b/i);
    expect(executableSql).not.toMatch(/CREATE\s+UNIQUE\s+INDEX/i);
  });
});
