import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const routerPath = path.resolve(import.meta.dirname, "routers.ts");
const adminDashboardPath = path.resolve(import.meta.dirname, "../client/src/pages/AdminDashboard.tsx");

describe("Admin Trades participant display names", () => {
  it("returns and displays both display-name-first trade participants", async () => {
    const [routerSource, dashboardSource] = await Promise.all([
      readFile(routerPath, "utf8"),
      readFile(adminDashboardPath, "utf8"),
    ]);
    expect(routerSource).toContain("requesterDisplayName: sql<string>");
    expect(routerSource).toContain("recipientDisplayName: sql<string>");
    expect(routerSource).toContain("adminTradeRequesterProfiles");
    expect(routerSource).toContain("adminTradeRecipientProfiles");
    expect(dashboardSource).toContain("trade.requesterDisplayName");
    expect(dashboardSource).toContain("trade.recipientDisplayName");
  });
});
