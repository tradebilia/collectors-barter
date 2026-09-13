import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Trade Room carrier tracking controls", () => {
  const warRoomSource = readFileSync(join(process.cwd(), "client/src/pages/WarRoom.tsx"), "utf8");
  const routerSource = readFileSync(join(process.cwd(), "server/shippingTrackingRouter.ts"), "utf8");

  it("uses automated validation for supported API carriers and an official USPS manual fallback", () => {
    expect(warRoomSource).toContain("trpc.shippingTracking.validateForTrade.useMutation()");
    expect(warRoomSource).toContain("Expected delivery:");
    expect(warRoomSource).toContain("Check tracking");
    expect((warRoomSource.match(/\['UPS', 'FEDEX', 'DHL'\]/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(warRoomSource).toContain("lookupCarrierTracking");
    expect(warRoomSource).toContain("formatTrackingDate");
    expect(warRoomSource).toContain("buildUspsTrackingUrl(trackingNumber)");
    expect(warRoomSource).toContain("Verify on USPS.com →");
    expect(warRoomSource).toContain("USPS tracking submitted — verify on USPS.com");
    expect(warRoomSource).toContain("normalizedCarrier === 'USPS'");
    expect(warRoomSource).toContain("Valid Tracking Number has been submitted");
    expect(warRoomSource).toContain("Invalid Tracking Number submitted");
    expect(warRoomSource).toContain("getTradeDetails.invalidate");
    expect(warRoomSource).toContain("const myTrackingValidated");
    expect(warRoomSource).toContain("const theirTrackingValidated");
    expect(warRoomSource).toContain("myTrackingValidated ? 'Valid Tracking Number has been submitted'");
    expect(warRoomSource).toContain("theirTrackingValidated ? 'Valid Tracking Number has been submitted'");
    expect(warRoomSource).not.toContain("myItemsShipped ? 'Valid Tracking Number has been submitted'");
  });

  it("keeps the lookup protected and limits it to the supported carrier adapters", () => {
    expect(routerSource).toContain("protectedProcedure");
    expect(routerSource).toContain('z.enum(["USPS", "UPS", "FedEx", "DHL"])');
    expect(routerSource).toContain("validateForTrade");
    expect(routerSource).toContain("lookupUspsTracking");
    expect(routerSource).toContain("lookupUpsTracking");
    expect(routerSource).toContain("lookupFedexTracking");
    expect(routerSource).toContain("lookupDhlTracking");
    expect(routerSource).toContain("tracking_validation:");
    expect(routerSource).toContain("validationStatus: valid ? 'valid' : 'invalid'");
  });
});
