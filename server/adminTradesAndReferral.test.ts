import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const routerPath = path.resolve(import.meta.dirname, "routers.ts");
const adminDashboardPath = path.resolve(import.meta.dirname, "../client/src/pages/AdminDashboard.tsx");
const referralPath = path.resolve(import.meta.dirname, "../client/src/pages/ReferralRequest.tsx");

async function readSources() {
  return Promise.all([
    readFile(routerPath, "utf8"),
    readFile(adminDashboardPath, "utf8"),
    readFile(referralPath, "utf8"),
  ]);
}

describe("Admin Trades and Refer a Collector refinements", () => {
  it("returns lifecycle details for every trade status without status filtering at the server boundary", async () => {
    const [routerSource, dashboardSource] = await readSources();
    expect(routerSource).toContain("getAllTrades: protectedProcedure");
    expect(routerSource).toContain("tradeProposals.status");
    expect(routerSource).toContain("tradeProposals.lastActivityAt");
    expect(routerSource).toContain("tradeProposals.shippingDeadline");
    expect(routerSource).toContain("tradeProposals.declineReason");
    expect(routerSource).toContain("tradeProposalItems offeredItems");
    expect(dashboardSource).toContain("SelectItem value=\"all\">All stages");
    expect(dashboardSource).toContain("setSelectedTrade(trade)");
    expect(dashboardSource).toContain("Lifecycle dates");
  });

  it("supports searchable, stage-filtered, and sortable Admin Trades data", async () => {
    const [, dashboardSource] = await readSources();
    expect(dashboardSource).toContain("filterAdminTrades");
    expect(dashboardSource).toContain("sortAdminTrades");
    expect(dashboardSource).toContain("Search trade ID, participant, item, or reference");
    expect(dashboardSource).toContain("Filter trades by status");
    expect(dashboardSource).toContain("Sort trades by");
    expect(dashboardSource).toContain("lastActivityAt");
    expect(dashboardSource).toContain("Show archived records");
  });

  it("uses the exact durable Referral Request SVG asset", async () => {
    const [, , referralSource] = await readSources();
    expect(referralSource).toContain("/manus-storage/ReferralRequest_89fadd07.svg");
    expect(referralSource).not.toContain("ReferralRequest_2e59ce3c.webp");
  });
});
