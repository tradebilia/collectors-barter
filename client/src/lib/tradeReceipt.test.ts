import { describe, expect, it } from "vitest";
import { buildTradeReceiptLines, deriveShippingDeadline } from "./tradeReceipt";

describe("Trade Room receipt", () => {
  it("includes participant, item, cash, and tracking information", () => {
    const text = buildTradeReceiptLines({
      tradeReference: "TR-000001", status: "shipped", acceptedAt: "2026-08-01T00:00:00.000Z", shippingDeadline: "2026-08-04T00:00:00.000Z",
      mySide: { name: "Administrator", contactName: "Rich Tavani", items: [{ title: "Rickey Henderson Rookie", estimatedValue: "1200" }], cash: 0, tracking: [{ carrier: "DHL", trackingNumber: "0145265648" }] },
      theirSide: { name: "Rtavani", contactName: "Dylan Rhoads", items: [{ title: "Barry Sanders Rookie", estimatedValue: 900 }], cash: 25, tracking: [] },
    }).join("\n");
    expect(text).toContain("Rich Tavani");
    expect(text).toContain("Rickey Henderson Rookie");
    expect(text).toContain("DHL 0145265648");
    expect(text).toContain("Cash contribution: $25.00");
  });
  it("uses the stored deadline before the established three-day fallback", () => {
    expect(deriveShippingDeadline(null, "2026-08-01T12:00:00.000Z")?.toISOString()).toBe("2026-08-04T12:00:00.000Z");
    expect(deriveShippingDeadline("2026-08-05T12:00:00.000Z", "2026-08-01T12:00:00.000Z")?.toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });
});
