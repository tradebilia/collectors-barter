import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminDashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("Admin API Health specialist-source presentation", () => {
  it("visibly distinguishes activation-pending and owner-deferred sources without providing a probe control", () => {
    expect(adminDashboardSource).toContain('permission_pending: "border-violet-300 bg-violet-50 text-violet-900"');
    expect(adminDashboardSource).toContain('deferred: "border-slate-300 bg-slate-100 text-slate-700"');
    expect(adminDashboardSource).toContain('"Permission pending"');
    expect(adminDashboardSource).toContain('"Owner deferred"');
    expect(adminDashboardSource).toContain("Public-contract validation:");
    expect(adminDashboardSource).toContain("Activation:");
    expect(adminDashboardSource).toContain("Source reference →");
    expect(adminDashboardSource).toContain("permission-pending, and owner-deferred sources");
  });
});
