import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const adminSource = readFileSync(resolve(root, "client/src/pages/AdminDashboard.tsx"), "utf8");
const preLaunchUiSource = readFileSync(resolve(root, "client/src/components/PreLaunchEmailTab.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const preLaunchSource = readFileSync(resolve(root, "server/preLaunchEmail.ts"), "utf8");

describe("Admin dashboard repairs", () => {
  it("returns both participants for Admin trade records", () => {
    expect(routerSource).toContain('alias(users, "adminTradeRecipients")');
    expect(routerSource).toContain("recipientUsername: recipientUsers.username");
    expect(adminSource).toContain("/trade-room/${trade.id}");
  });

  it("places convention refresh in Settings and removes it from the visible tab list", () => {
    expect(adminSource).toContain("<ConventionsAdminTab />");
    expect(adminSource).not.toContain('<TabsTrigger value="conventions"');
  });

  it("uses bounded referral delivery and safer support-ticket deletion", () => {
    expect(routerSource).toContain("const concurrency = 5");
    expect(adminSource).toContain("Delete this support ticket and all of its replies permanently?");
  });

  it("exposes honest Pre-Launch broadcast handoff status", () => {
    expect(preLaunchSource).toContain("getPreLaunchBroadcastStatuses");
    expect(preLaunchUiSource).toContain("Recent delivery handoff");
    expect(preLaunchUiSource).toContain("Resend accepted the broadcast");
  });
});
