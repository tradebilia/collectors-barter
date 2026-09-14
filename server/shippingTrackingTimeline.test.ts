import { describe, expect, it } from "vitest";
import { formatTrackingEventLocation, normalizeTrackingTimeline } from "./shippingTrackingTimeline";

describe("shipping tracking timeline", () => {
  it("returns every meaningful event in chronological order", () => {
    const events = normalizeTrackingTimeline([
      { type: "Delivered", timestamp: "2026-09-14T18:00:00Z", city: "New York", state: "NY", country: "US" },
      { type: "Picked up", timestamp: "2026-09-10T09:00:00Z", city: "Memphis", state: "TN", country: "US" },
      { type: "In transit", timestamp: "2026-09-12T12:00:00Z", city: "Louisville", state: "KY", country: "US" },
    ]);

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.type)).toEqual(["Picked up", "In transit", "Delivered"]);
    expect(formatTrackingEventLocation(events[1])).toBe("Louisville, KY, US");
  });

  it("does not expose empty events or private address fields", () => {
    const events = normalizeTrackingTimeline([
      { type: "", timestamp: null, city: null, state: null, country: null },
      { type: "Arrived", timestamp: "2026-09-12T12:00:00Z", city: "Bonn", state: null, country: "DE" },
    ]);

    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain("postal");
    expect(JSON.stringify(events)).not.toContain("recipient");
  });
});
