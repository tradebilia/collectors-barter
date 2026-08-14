import { describe, expect, it } from "vitest";

describe.runIf(process.env.RUN_LIVE_RESEND_CONTACTS_TESTS === "1")("Resend Contacts credential", () => {
  it("can read the contacts endpoint without creating or changing a contact", async () => {
    const apiKey = process.env.RESEND_CONTACTS_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.resend.com/contacts?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.ok, `Resend Contacts returned HTTP ${response.status}`).toBe(true);
  }, 15_000);
});
