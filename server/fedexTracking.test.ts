import { describe, expect, it } from "vitest";
import { formatFedexTrackingResult, normalizeFedexExpectedDeliveryDate, normalizeFedexTrackingNumber } from "./fedexTracking";

describe("FedEx expected-delivery normalization", () => {
  it("reduces ISO timestamps to a stable date-only value", () => {
    expect(normalizeFedexExpectedDeliveryDate("2026-09-11T18:00:00-07:00")).toBe("2026-09-11");
  });

  it("normalizes month-first carrier dates", () => {
    expect(normalizeFedexExpectedDeliveryDate("09/11/2026")).toBe("2026-09-11");
  });

  it("returns null for missing delivery dates", () => {
    expect(normalizeFedexExpectedDeliveryDate(null)).toBeNull();
  });
});

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

    expect(result).toMatchObject({ status: "In transit", service: "FedEx Ground", expectedDeliveryDate: "2026-08-16" });
    expect(JSON.stringify(result)).not.toContain("recipient");
    expect(JSON.stringify(result)).not.toContain("addressLine");
  });
});
