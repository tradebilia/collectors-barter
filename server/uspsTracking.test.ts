import { describe, expect, it } from "vitest";
import { formatUspsTrackingResult, normalizeUspsTrackingNumber } from "./uspsTracking";

describe("USPS tracking helpers", () => {
  it("normalizes a user-entered tracking number without accepting unsafe characters", () => {
    expect(normalizeUspsTrackingNumber(" 9400-1000 0000 ")).toBe("940010000000");
    expect(() => normalizeUspsTrackingNumber("9400<script>")).toThrow("valid USPS tracking number");
  });

  it("returns useful tracking status while excluding postal codes and recipient data", () => {
    const result = formatUspsTrackingResult({
      trackingNumber: "940010000000",
      status: "In Transit",
      statusSummary: "Moving through network",
      deliveryDateExpectation: { expectedDeliveryDate: "2026-08-20" },
      trackingEvents: [{
        eventType: "Departed USPS Facility",
        GMTTimestamp: "2026-08-13T12:00:00.000Z",
        eventCity: "HUNTINGTON",
        eventState: "NY",
        eventZIPCode: "11743",
        recipientName: "Private Recipient",
      }],
    } as any, "940010000000");

    expect(result).toMatchObject({
      status: "In Transit",
      expectedDeliveryDate: "2026-08-20",
      events: [{ type: "Departed USPS Facility", city: "HUNTINGTON", state: "NY" }],
    });
    expect(JSON.stringify(result)).not.toContain("11743");
    expect(JSON.stringify(result)).not.toContain("Private Recipient");
  });
});
