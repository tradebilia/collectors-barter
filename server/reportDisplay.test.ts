import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const myReportsSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/MyReports.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");
const dbSource = fs.readFileSync(path.join(projectRoot, "server/db.ts"), "utf8");

describe("report display contracts", () => {
  it("returns submitted description and evidence for the reporter", () => {
    expect(dbSource).toContain("export async function getReportsByReporter");
    expect(dbSource).toContain("description: userReports.description");
    expect(dbSource).toContain("evidence: userReports.evidence");
  });

  it("renders reporter-facing member, concern, details, and evidence state visibly", () => {
    expect(myReportsSource).toContain('className="grid gap-3 text-sm text-white/90"');
    expect(myReportsSource).toContain('report.reportedMember || "Member information unavailable"');
    expect(myReportsSource).toContain('report.reason || "Concern not specified"');
    expect(myReportsSource).toContain("report.description");
    expect(myReportsSource).toContain("Supporting evidence was included with this report.");
  });

  it("shows submitted details and evidence state in the admin reports table", () => {
    expect(dbSource).toContain("description: userReports.description");
    expect(dbSource).toContain("evidence: userReports.evidence");
    expect(adminSource).toContain("Submitted Details");
    expect(adminSource).toContain("report.description || \"No description provided\"");
    expect(adminSource).toContain("report.evidence ? \"Included\" : \"None\"");
  });
});

export {};
