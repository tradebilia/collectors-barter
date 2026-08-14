import { describe, expect, it } from "vitest";
import { formatUpsTrackingResult, normalizeUpsTrackingNumber } from "./upsTracking";

describe("UPS tracking helpers", () => {
  it("normalizes valid UPS tracking numbers and rejects unsafe input", () => {
    expect(normalizeUpsTrackingNumber("1Z 999-AA1 01 2345 6784")).toBe("1Z999AA10123456784");
    expect(() => normalizeUpsTrackingNumber("1Z<script>")).toThrow("valid UPS tracking number");
  });

  it("returns derived shipment information without exposing postal or recipient details", () => {
    const result = formatUpsTrackingResult({
      trackResponse: { shipment: [{
        inquiryNumber: "1Z999AA10123456784",
        package: [{
          currentStatus: { description: "On the Way", simplifiedTextDescription: "In Transit", statusCode: "005" },
          service: { description: "UPS Ground" },
          deliveryDate: [{ type: "DEL", date: "20260820" }],
          activity: [{
            gmtDate: "20260814",
            gmtTime: "120000",
            status: { description: "Departed from Facility" },
            location: { address: { city: "HUNTINGTON", stateProvince: "NY", countryCode: "US", postalCode: "11743", recipientName: "Private Recipient" } as any },
          }],
        }],
      }] },
    } as any, "1Z999AA10123456784");

    expect(result).toMatchObject({
      status: "On the Way",
      service: "UPS Ground",
      events: [{ type: "Departed from Facility", city: "HUNTINGTON", state: "NY" }],
    });
    expect(JSON.stringify(result)).not.toContain("11743");
    expect(JSON.stringify(result)).not.toContain("Private Recipient");
  });
});
