import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(root, "drizzle/0009_admin_activity_log.sql"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");

describe("administrator activity audit trail", () => {
  it("defines an additive, privacy-safe operational audit schema", () => {
    expect(schema).toContain('mysqlTable("adminActivityLog"');
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS `adminActivityLog`");
    expect(migration).not.toContain("DROP ");
    expect(migration).not.toContain("stripe");
    expect(migration).not.toContain("`payload`");
  });

  it("records approved reviews and exports while rendering aggregated timeline events", () => {
    expect(router).toContain("adminActivityLog");
    expect(router).toContain("account_approval_reviewed");
    expect(router).toContain("operational_csv_exported");
    expect(router).toContain("Administrator activity");
  });
});
