import { describe, expect, it } from "vitest";

describe("IPQS credential", () => {
  const runLiveCredentialProbe = process.env.RUN_EXTERNAL_CREDENTIAL_TESTS === "true" && Boolean(process.env.IPQS_API_KEY);

  it.skipIf(!runLiveCredentialProbe)("authenticates a lightweight server-side email validation request when live provider checks are enabled", async () => {
    const apiKey = process.env.IPQS_API_KEY;

    const response = await fetch(
      `https://www.ipqualityscore.com/api/json/email/${encodeURIComponent(apiKey!)}/noreply%40ipqualityscore.com?fast=true`,
      { signal: AbortSignal.timeout(15_000) },
    );

    expect(response.ok).toBe(true);
    const payload = await response.json() as { success?: boolean; message?: string };
    expect(payload.success).toBe(true);
  }, 20_000);
});
