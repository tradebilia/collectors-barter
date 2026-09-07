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

  it("groups the navigation by functional area and wraps responsively", () => {
    expect(adminSource).toContain('className="grid w-full grid-cols-1 items-start gap-4 rounded-xl border border-border/60 bg-muted/50 p-3 h-auto sm:grid-cols-2 lg:grid-cols-5"');
    expect(adminSource).toContain('className="flex flex-col gap-1.5 pt-1.5"');
    expect(adminSource).toContain('className="flex min-h-10 items-center px-2 text-sm font-bold uppercase tracking-[0.14em] text-foreground"');
    expect(adminSource).toContain("Overview &amp; Monitoring");
    expect(adminSource).toContain("Marketplace Management");
    expect(adminSource).toContain("Moderation &amp; Support");
    expect(adminSource).toContain("Communications &amp; Growth");
    expect(adminSource).toContain("Platform &amp; Reference Tools");
    expect(adminSource.indexOf('<TabsTrigger value="operations"')).toBeLessThan(adminSource.indexOf('<TabsTrigger value="billing"'));
    expect(adminSource).toContain('className="w-full justify-start flex items-center gap-1.5 rounded-lg px-3 text-xs font-medium py-2.5 whitespace-nowrap"');
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
