import { describe, expect, it } from "vitest";

describe("DHL API credentials", () => {
  it.skipIf(!process.env.DHL_API_KEY)("authenticates the DHL Unified Tracking endpoint without exposing credentials", async () => {
    const response = await fetch(
      "https://api-eu.dhl.com/track/shipments?trackingNumber=0000000000",
      {
        headers: {
          "DHL-API-Key": process.env.DHL_API_KEY,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      },
    );

    expect([401, 403]).not.toContain(response.status);
  }, 20_000);
});
