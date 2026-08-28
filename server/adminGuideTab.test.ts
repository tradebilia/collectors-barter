import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const adminSource = readFileSync(resolve(root, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("administrator guide tab", () => {
  const visibleTabs = [
    "Stats", "Billing", "Users", "Listings", "Trades", "Settings", "Deleted", "Closure Requests",
    "Reports", "Referrals", "Pre-Launch Email", "Media Storage", "Conventions", "Mod Log", "Tickets",
    "Flagged", "Approvals", "API Health", "Operations",
  ];

  it("adds an administrator dashboard guide tab using the existing accessible accordion component", () => {
    expect(adminSource).toContain('<TabsTrigger value="admin-guide"');
    expect(adminSource).toContain("Admin Guide");
    expect(adminSource).toContain('<TabsContent value="admin-guide"');
    expect(adminSource).toContain("<AdminGuideTab />");
    expect(adminSource).toContain('type="multiple"');
    expect(adminSource).toContain("What it does");
    expect(adminSource).toContain("When to use it");
    expect(adminSource).toContain("Before you act");
  });

  it("explains every currently visible administrator workspace in plain language", () => {
    expect(adminSource).toContain("There are {adminGuideEntries.length} current administrator workspaces");
    for (const tab of visibleTabs) expect(adminSource).toContain(`tab: "${tab}"`);
    expect(adminSource).toContain("Fee Mode is only a planning switch");
    expect(adminSource).toContain("Clear removes only the selected diagnostic records after confirmation");
    expect(adminSource).toContain("retained trade, report, and safety history is not erased");
    expect(adminSource).toContain("A flag identifies something to review; it is not an automatic conclusion");
  });

  it("documents quick tools without turning the guide into a new data-action surface", () => {
    expect(adminSource).toContain("Quick tools above the tabs");
    expect(adminSource).toContain("Test AI Sandbox");
    expect(adminSource).toContain("Coming Soon Preview");
    expect(adminSource).not.toContain("trpc.admin.getAdminGuide");
    expect(adminSource).not.toContain("trpc.admin.updateAdminGuide");
  });
});
