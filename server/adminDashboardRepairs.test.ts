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
    expect(routerSource).toContain("requesterDisplayName:");
    expect(routerSource).toContain("recipientDisplayName:");
    expect(adminSource).toContain("trade.requesterDisplayName");
    expect(adminSource).toContain("trade.recipientDisplayName");
    expect(adminSource).toContain("/trade-room/${trade.id}");
  });

  it("places convention refresh in Settings and removes it from the visible tab list", () => {
    expect(adminSource).toContain("<ConventionsAdminTab />");
    expect(adminSource).not.toContain('<TabsTrigger value="conventions"');
  });

  it("uses successful-delivery-aware referral sending and safer support-ticket deletion", () => {
    expect(routerSource).toContain("for (const referral of unEmailedReferrals)");
    expect(routerSource).toContain("sentIds.push(referral.id)");
    expect(routerSource).toContain("markReferralsAsEmailed(sentIds)");
    expect(adminSource).toContain("Delete this support ticket and all of its replies permanently?");
  });

  it("exposes explicit review and opt-in-only Pre-Launch broadcast controls", () => {
    expect(preLaunchSource).toContain("getPreLaunchRecipients");
    expect(preLaunchUiSource).toContain("setConfirmOpen(true)");
    expect(preLaunchUiSource).toContain("`Send to ${recipients.length}`");
    expect(preLaunchUiSource).toContain("Unsubscribed contacts are excluded automatically.");
  });
});
