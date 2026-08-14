import { describe, expect, it } from "vitest";
import { formatDhlTrackingResult, normalizeDhlTrackingNumber } from "./dhlTracking";

describe("DHL Express MyDHL tracking", () => {
  it("normalizes an Express tracking number without exposing formatting", () => {
    expect(normalizeDhlTrackingNumber(" 1234-5678-90 ")).toBe("1234567890");
  });

  it("rejects clearly invalid DHL tracking input", () => {
    expect(() => normalizeDhlTrackingNumber("123")).toThrow("valid DHL tracking number");
  });

  it("returns only delivery-safe tracking fields", () => {
    const result = formatDhlTrackingResult({
      shipments: [{
        shipmentTrackingNumber: "1234567890",
        status: {
          status: "Delivered",
          statusCode: "delivered",
          description: "Delivered to the shipment recipient",
          location: { address: { addressLocality: "Bonn", postalCode: "53113", countryCode: "DE" } },
        },
        details: { product: { productName: "DHL Express Worldwide" }, estimatedDeliveryDate: "2026-08-14" },
        events: [{
          timestamp: "2026-08-14T09:30:00Z",
          description: "Delivered",
          location: { address: { addressLocality: "Bonn", postalCode: "53113", countryCode: "DE" } },
        }],
      }],
    }, "1234567890");

    expect(result).toMatchObject({
      trackingNumber: "1234567890",
      status: "Delivered",
      service: "DHL Express Worldwide",
      events: [{ type: "DHL update", city: "Bonn", country: "DE" }],
    });
    expect(JSON.stringify(result)).not.toContain("53113");
    expect(JSON.stringify(result)).not.toContain("recipient");
  });
});
