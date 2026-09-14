import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Test AI carrier tracking controls", () => {
  const source = readFileSync(join(process.cwd(), "client/src/pages/TestAI.tsx"), "utf8");

  it("offers an authenticated read-only USPS API test alongside UPS, FedEx, and DHL", () => {
    expect(source).toContain("Carrier Tracking Test");
    expect(source).toContain('<option value="USPS">USPS</option>');
    expect(source).toContain('<option value="UPS">UPS</option>');
    expect(source).toContain('<option value="FedEx">FedEx</option>');
    expect(source).toContain('<option value="DHL">DHL</option>');
    expect(source).toContain("lookupUspsTracking.useMutation");
    expect(source).toContain("configured server-side consumer credentials");
    expect(source).toContain("lookupFedexTracking");
    expect(source).toContain("lookupDhlTracking");
    expect(source).toContain("USPS, UPS, FedEx, and DHL return read-only carrier results.");
    expect(source).toContain("No Tradebilia shipment, trade, or notification data is changed.");
  });

  it("provides a consented Test AI-only USPS screenshot review experiment without Trade Room persistence", () => {
    expect(source).toContain("reviewUspsTrackingScreenshot.useMutation");
    expect(source).toContain("navigator.mediaDevices.getDisplayMedia");
    expect(source).toContain("preferCurrentTab: true");
    expect(source).toContain("Open USPS results");
    expect(source).toContain("View USPS result in Tradebilia");
    expect(source).toContain('title="Official USPS tracking result"');
    expect(source).toContain("Capture this Tradebilia view");
    expect(source).toContain("Open USPS.com in new tab");
    expect(source).toContain("Click here and paste a USPS result screenshot.");
    expect(source).toContain("not stored by Tradebilia");
    expect(source).toContain("Color alone is never used as a result.");
  });
});
