import { describe, expect, it } from "vitest";

const HIPSTAMP_API_BASE = "https://www.hipstamp.com/api";

describe("HIPStamp API credential", () => {
  it(
    "authenticates against the read-only active-listings endpoint",
    async () => {
      const apiKey = process.env.HIPSTAMP_API_KEY;
      expect(apiKey, "HIPSTAMP_API_KEY must be configured for this smoke test").toBeTruthy();

      const response = await fetch(
        `${HIPSTAMP_API_BASE}/listings?limit=1&page=1`,
        {
          headers: {
            Accept: "application/json",
            "X-ApiKey": apiKey as string,
          },
        },
      );

      const responseBody = await response.text();
      expect(response.status, responseBody).toBe(200);
      const payload = JSON.parse(responseBody);
      expect(payload).toBeDefined();
    },
    15_000,
  );
});
