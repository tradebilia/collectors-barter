import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Trade Room carrier tracking controls", () => {
  const warRoomSource = readFileSync(join(process.cwd(), "client/src/pages/WarRoom.tsx"), "utf8");
  const routerSource = readFileSync(join(process.cwd(), "server/shippingTrackingRouter.ts"), "utf8");

  it("uses automated validation for supported API carriers and a permissioned USPS evidence flow", () => {
    expect(warRoomSource).toContain("trpc.shippingTracking.validateForTrade.useMutation()");
    expect(warRoomSource).toContain("Expected delivery:");
    expect(warRoomSource).toContain("Check tracking");
    expect((warRoomSource.match(/\['UPS', 'FEDEX', 'DHL'\]/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(warRoomSource).toContain("lookupCarrierTracking");
    expect(warRoomSource).toContain("formatTrackingDate");
    expect(warRoomSource).toContain("trpc.shippingTracking.reviewUspsEvidenceForTrade.useMutation({");
    expect(warRoomSource).toContain("setUspsEvidenceTarget({ listingId: item.id, trackingNumber: inp.trackingNumber.trim() })");
    expect(warRoomSource).toContain("onKeyDown={(event) => {");
    expect(warRoomSource).toContain("USPS tracking verification");
    expect(warRoomSource).toContain("Capture and verify");
    expect(warRoomSource).toContain("navigator.mediaDevices.getDisplayMedia");
    expect(warRoomSource).toContain("The image remains hidden and AI review starts automatically.");
    expect(warRoomSource).toContain("Tradebilia cannot read USPS directly.");
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

  it("keeps carrier checking scoped to the signed-in participant in Step 4", () => {
    expect(warRoomSource).toContain('data-testid="shipping-counterparty-locked-items"');
    expect(warRoomSource).not.toContain("lookupCarrierTracking(lookupId, t.carrier, t.trackingNumber)");
    expect(warRoomSource).toContain("Track on {t.carrier} →");
  });

  it("refreshes API carrier status automatically on Step 5 entry and manually per tracking number", () => {
    expect(warRoomSource).toContain("trpc.shippingTracking.lookup.useMutation()");
    expect(warRoomSource).toContain("lookupStep5TrackingStatus");
    expect(warRoomSource).toContain("autoRefreshedTrackingKeyRef");
    expect(warRoomSource).toContain("Refresh status");
    expect(warRoomSource).toContain("Shipping status:");
    expect(warRoomSource).toContain("Shipment history");
    expect(warRoomSource).toContain("formatShipmentEventLocation");
    expect(warRoomSource).toContain("Current");
    expect(warRoomSource).toContain("currentStage === 'shipped'");
    expect(warRoomSource).toContain("USPS status is available on USPS.com.");
    expect(warRoomSource).toContain("buildUspsTrackingUrl(tracking.trackingNumber)");
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
    expect(routerSource).toContain("reviewUspsEvidenceForTrade");
    expect(routerSource).toContain("reviewUspsTrackingEvidence");
    expect(routerSource).toContain('classification === "tracking_not_available"');
    expect(routerSource).not.toContain("ON DUPLICATE KEY UPDATE");
    expect(routerSource).toContain('validationStatus: "valid" as const');
    expect(routerSource).not.toContain("storagePut(input.imageDataUrl");
  });
});
