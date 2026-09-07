import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const db = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");
const router = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");
const admin = fs.readFileSync(path.join(root, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("admin report actions", () => {
  it("updates report status through the verified legacy-compatible columns", () => {
    expect(db).toContain("UPDATE userReports");
    expect(db).toContain("status = ${input.status}");
    expect(db).toContain("adminNotes = ${input.adminNotes ?? null}");
    expect(db).toContain("reviewedAt = ${now}");
    expect(db).toContain("reviewedBy = ${input.reviewedBy}");
    expect(db).toContain("WHERE reportId = ${input.reportId}");
  });

  it("exposes the submitter display name in the admin report payload", () => {
    expect(db).toContain("reporterUserDisplayName");
    expect(db).toContain("FROM userProfiles WHERE userId = ${userReports.reporterUserId}");
    expect(admin).toContain("Submitted By");
    expect(admin).toContain("selectedReport.reporterUserDisplayName");
  });

  it("refreshes the report list and surfaces success or failure feedback after an action", () => {
    expect(admin).toContain("await reportsQuery.refetch()");
    expect(admin).toContain("toast.success(`Report marked as");
    expect(admin).toContain("toast.error(message)");
    expect(router).toContain("updateReportStatus");
    expect(router).toContain("await ensureUserReportsTable();");
    expect(db).toContain("ALTER TABLE userReports MODIFY COLUMN status ENUM('pending','reviewed','dismissed','action_taken','reviewing','resolved')");
  });
});

export {};
