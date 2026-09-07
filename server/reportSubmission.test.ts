import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dbSource = readFileSync(resolve(__dirname, "db.ts"), "utf8");
const schemaSource = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf8");
const migrationSource = readFileSync(resolve(__dirname, "../drizzle/0021_user_reports_runtime.sql"), "utf8");
const routerSource = readFileSync(resolve(__dirname, "routers.ts"), "utf8");

describe("Report a Member submission contract", () => {
  it("uses the report ID and required report fields without relying on a missing database default", () => {
    expect(dbSource).toContain("export async function ensureUserReportsTable()");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS userReports");
    expect(dbSource).toContain("const reportId = await generateReportId();");
    expect(dbSource).toContain("reportId,");
    expect(dbSource).toContain("reporterId, reportedUserId, category, description, evidence, status");
    expect(dbSource).toContain("${input.reporterUserId}, ${input.reportedUserId}");
    expect(dbSource).toContain("reportCategoryForReason(input.reason)");
    expect(dbSource).toContain("'pending'");
    expect(schemaSource).toContain('export const userReports = mysqlTable("userReports"');
    expect(schemaSource).toContain("reportId: varchar({ length: 20 }).notNull()");
  });

  it("creates the missing runtime table additively with the required auto-increment and uniqueness contract", () => {
    expect(migrationSource).toContain("CREATE TABLE IF NOT EXISTS `userReports`");
    expect(migrationSource).toContain("`id` int AUTO_INCREMENT NOT NULL");
    expect(migrationSource).toContain("UNIQUE KEY `userReports_reportId_unique` (`reportId`)");
    expect(migrationSource).toContain("DEFAULT CURRENT_TIMESTAMP");
    expect(migrationSource).not.toMatch(/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i);
  });

  it("keeps the protected submitReport path bound to the safe helper and attachment ownership check", () => {
    expect(routerSource).toContain("submitReport: protectedProcedure");
    expect(routerSource).toContain("await ensureUserReportsTable();");
    expect(routerSource).toContain("ownsReportAttachment(ctx.user.id, attachment)");
    expect(routerSource).toContain("return submitUserReport({");
  });
});
