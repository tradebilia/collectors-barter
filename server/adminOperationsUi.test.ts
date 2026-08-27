import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const uiSource = readFileSync(resolve(root, "client/src/components/AdminOperationsTab.tsx"), "utf8");

describe("administrator operations workspace", () => {
  it("keeps operations, lifecycle, timeline, and exports behind administrator router contracts", () => {
    expect(routerSource).toContain("getOperationsSnapshot");
    expect(routerSource).toContain("getActiveTradeLifecycle");
    expect(routerSource).toContain("getOperationalTimeline");
    expect(routerSource).toContain("exportOperationalCsv");
    expect(routerSource).toContain("/^[=+\\-@]/.test(raw)");
    expect(routerSource).toContain('callbackPath === "/api/scheduled/tradeReminders"');
    expect(routerSource).not.toContain('callbackPath === "/api/scheduled/shipment-reminders"');
    expect(routerSource).toMatch(/getOperationsSnapshot:[\s\S]{0,240}ctx\.user\.role !== 'admin'/);
  });

  it("keeps the client workspace privacy-safe and data-oriented", () => {
    expect(uiSource).toContain("Admin Action Queue");
    expect(uiSource).toContain("Active Trade Lifecycle");
    expect(uiSource).toContain("Operational Timeline");
    expect(uiSource).toContain("Internal CSV Exports");
    expect(uiSource).toContain("payment data");
    expect(uiSource).not.toContain("trackingNumber");
  });
});
