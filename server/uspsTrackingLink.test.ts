import { describe, expect, it } from "vitest";
import { buildUspsTrackingUrl } from "../shared/uspsTrackingLink";

describe("buildUspsTrackingUrl", () => {
  it("uses the official USPS tracking endpoint and encodes member-supplied tracking input", () => {
    expect(buildUspsTrackingUrl(" 9400 1000/1234 ")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400%201000%2F1234",
    );
  });
});
