import { describe, expect, it } from "vitest";

describe("PCGS live credential", () => {
  it(
    "accepts the configured token for a bounded read-only certification request",
    async () => {
      const token = process.env.PCGS_API_TOKEN;
      if (!token) return;

      const response = await fetch(
        "https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/00000000?retrieveAllData=true",
        {
          headers: {
            Accept: "application/json",
            Authorization: `bearer ${token}`,
          },
          signal: AbortSignal.timeout(15_000),
        },
      );

      // The certificate is deliberately non-listing; this test validates only
      // that PCGS accepts the credential, not that a coin record exists.
      expect([401, 403, 500]).not.toContain(response.status);
    },
    20_000,
  );
});
