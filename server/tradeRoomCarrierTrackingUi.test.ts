import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Trade Room carrier tracking controls", () => {
  const warRoomSource = readFileSync(join(process.cwd(), "client/src/pages/WarRoom.tsx"), "utf8");
  const routerSource = readFileSync(join(process.cwd(), "server/shippingTrackingRouter.ts"), "utf8");

  it("offers read-only lookup controls for submitted UPS, FedEx, and DHL shipments", () => {
    expect(warRoomSource).toContain("trpc.shippingTracking.lookup.useMutation()");
    expect(warRoomSource).toContain("Expected delivery:");
    expect(warRoomSource).toContain("Check tracking");
    expect(warRoomSource).toContain("lookupCarrierTracking");
    expect(warRoomSource).toContain("formatTrackingDate");
    expect(warRoomSource).toContain("'UPS', 'FEDEX', 'DHL'");
  });

  it("keeps the lookup protected and limits it to the supported carrier adapters", () => {
    expect(routerSource).toContain("protectedProcedure");
    expect(routerSource).toContain('z.enum(["UPS", "FedEx", "DHL"])');
    expect(routerSource).toContain("lookupUpsTracking");
    expect(routerSource).toContain("lookupFedexTracking");
    expect(routerSource).toContain("lookupDhlTracking");
  });
});
