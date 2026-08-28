import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBillingSummary } from "./membership";

const root = resolve(import.meta.dirname, "..");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const membershipSource = readFileSync(resolve(root, "server/membership.ts"), "utf8");
const adminSource = readFileSync(resolve(root, "client/src/pages/AdminDashboard.tsx"), "utf8");
const operationsSource = readFileSync(resolve(root, "client/src/components/AdminOperationsTab.tsx"), "utf8");
const guideSource = readFileSync(resolve(root, "client/src/pages/HowTradebiliaWorks.tsx"), "utf8");

describe("recovered administrator and guide controls", () => {
  it("keeps Fee Mode off by default and treats On as a non-enforcing launch control", () => {
    const freeLaunch = buildBillingSummary({ billingMode: "free_launch", paymentEnforcementEnabled: 0 });
    const feeMode = buildBillingSummary({ billingMode: "membership_required", paymentEnforcementEnabled: 0 });
    expect(freeLaunch.feeModeEnabled).toBe(false);
    expect(feeMode.feeModeEnabled).toBe(true);
    expect(feeMode.statusMessage).toContain("checkout, card collection, and payment enforcement remain inactive");
    expect(membershipSource).toContain("updateFeeMode:");
    expect(membershipSource).toContain("verifyPassword(input.currentPassword, administrator.passwordHash)");
    expect(membershipSource).toContain("ENABLE TRADEBILIA FEE MODE");
    expect(membershipSource).toContain("paymentEnforcementEnabled: 0");
    expect(membershipSource).toContain("fee_mode_launch_control_changed");
    expect(adminSource).toContain("Fee Mode launch control");
    expect(adminSource).toContain("Current administrator password");
  });

  it("makes selected API Health clearing administrator-only, bounded, confirmed, and auditable", () => {
    expect(routerSource).toMatch(/clearApiHealthEvents:[\s\S]{0,300}ctx\.user\.role !== 'admin'/);
    expect(routerSource).toContain("eventIds: z.array(z.number().int().positive()).min(1).max(100)");
    expect(routerSource).toContain("api_health_events_cleared");
    expect(adminSource).toContain("Select all visible");
    expect(adminSource).toContain("Clear selected API health events?");
    expect(adminSource).toContain("Clear selected records");
  });

  it("routes each Operations review count to an equivalent visible administrator queue", () => {
    expect(routerSource).toContain("Member reports");
    expect(routerSource).toContain("Content flags");
    expect(routerSource).toContain("Feedback safety");
    expect(routerSource).toContain("getLowFeedbackFlags");
    expect(routerSource).toContain("reviewLowFeedbackFlag");
    expect(operationsSource).toContain("onNavigate(item.tab as AdminTab)");
    expect(adminSource).toContain("Feedback Safety");
    expect(adminSource).toContain("No pending feedback safety records.");
  });

  it("removes only administrator search and provides keyboard-accessible larger guide captures", () => {
    expect(adminSource).toContain("<TopBar hideSearch />");
    expect(guideSource).toContain("md:grid-cols-2");
    expect(guideSource).toContain("Select to enlarge");
    expect(guideSource).toContain("Enlarge ${title} Trade Room capture");
    expect(guideSource).toContain("selectedTradeRoomCapture");
    expect(guideSource).toContain("Development-only capture — fictional collectors and items");
  });
});
