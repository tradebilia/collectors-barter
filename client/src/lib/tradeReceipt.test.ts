import { describe, expect, it } from "vitest";
import { buildTradeReceiptLines, deriveShippingDeadline } from "./tradeReceipt";

describe("Trade Room receipt", () => {
  it("creates a participant-facing receipt summary without omitting item or tracking details", () => {
    const lines = buildTradeReceiptLines({
      tradeReference: "TR-000001", status: "shipped", acceptedAt: "2026-08-01T00:00:00.000Z", shippingDeadline: "2026-08-04T00:00:00.000Z",
      mySide: { name: "Administrator", contactName: "Rich Tavani", items: [{ title: "Rickey Henderson Rookie", referenceNumber: "810001", estimatedValue: "1200" }], cash: 0, tracking: [{ carrier: "DHL", trackingNumber: "0145265648" }] },
      theirSide: { name: "Rtavani", contactName: "Dylan Rhoads", items: [{ title: "Barry Sanders Score Rookie", estimatedValue: 900 }], cash: 25, tracking: [] },
    });
    expect(lines.join("\n")).toContain("Rich Tavani");
    expect(lines.join("\n")).toContain("Rickey Henderson Rookie");
    expect(lines.join("\n")).toContain("DHL 0145265648");
    expect(lines.join("\n")).toContain("Cash contribution: $25.00");
  });

  it("derives the established three-day shipping window only when no stored deadline exists", () => {
    expect(deriveShippingDeadline(null, "2026-08-01T12:00:00.000Z")?.toISOString()).toBe("2026-08-04T12:00:00.000Z");
    expect(deriveShippingDeadline("2026-08-05T12:00:00.000Z", "2026-08-01T12:00:00.000Z")?.toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });
});
