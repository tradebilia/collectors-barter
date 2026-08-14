import { describe, expect, it } from "vitest";
import { formatFedexTrackingResult, normalizeFedexTrackingNumber } from "./fedexTracking";

describe("FedEx tracking", () => {
  it("normalizes tracking numbers without exposing input formatting", () => {
    expect(normalizeFedexTrackingNumber("  1234-5678 9012  ")).toBe("123456789012");
  });

  it("formats a privacy-safe tracking response without recipient fields", () => {
    const result = formatFedexTrackingResult({
      output: {
        completeTrackResults: [{
          trackResults: [{
            trackingNumberInfo: { trackingNumber: "123456789012" },
            latestStatusDetail: { statusByLocale: "In transit", description: "Package is moving", code: "IT" },
            serviceDetail: { description: "FedEx Ground" },
            dateAndTimes: [{ type: "ESTIMATED_DELIVERY", dateTime: "2026-08-16T12:00:00Z" }],
            scanEvents: [{ date: "2026-08-14T09:00:00Z", eventDescription: "Arrived", scanLocation: { city: "Memphis", stateOrProvinceCode: "TN", countryCode: "US" } }],
          }],
        }],
      },
    }, "123456789012");

    expect(result).toMatchObject({ status: "In transit", service: "FedEx Ground", expectedDeliveryDate: "2026-08-16T12:00:00Z" });
    expect(JSON.stringify(result)).not.toContain("recipient");
    expect(JSON.stringify(result)).not.toContain("addressLine");
  });
});
