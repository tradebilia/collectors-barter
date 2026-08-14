import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Test AI carrier tracking controls", () => {
  const source = readFileSync(join(process.cwd(), "client/src/pages/TestAI.tsx"), "utf8");

  it("offers active USPS, UPS, FedEx, and DHL selection while keeping carrier checks read-only", () => {
    expect(source).toContain("Carrier Tracking Test");
    expect(source).toContain('<option value="USPS">USPS</option>');
    expect(source).toContain('<option value="UPS">UPS</option>');
    expect(source).toContain('<option value="FedEx">FedEx</option>');
    expect(source).toContain('<option value="DHL">DHL</option>');
    expect(source).toContain("lookupFedexTracking");
    expect(source).toContain("lookupDhlTracking");
    expect(source).toContain("No Tradebilia shipment, trade, or notification data is changed.");
  });
});
