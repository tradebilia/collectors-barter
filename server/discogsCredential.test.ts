import { describe, expect, it } from "vitest";

const DISCOGS_API_BASE = "https://api.discogs.com";
const DISCOGS_USER_AGENT = "TradebiliaTestAI/1.0 (+https://tradebilia.manus.space)";

describe("Discogs credential", () => {
  it(
    "authenticates with the configured user token without exposing it",
    async () => {
      const token = process.env.DISCOGS_USER_TOKEN?.trim();
      expect(token, "DISCOGS_USER_TOKEN must be configured for this validation").toBeTruthy();

      const response = await fetch(`${DISCOGS_API_BASE}/oauth/identity`, {
        headers: {
          Authorization: `Discogs token=${token}`,
          "User-Agent": DISCOGS_USER_AGENT,
          Accept: "application/vnd.discogs.v2.discogs+json",
        },
      });

      expect(response.status, "Discogs rejected the configured credential").toBe(200);
      const payload = (await response.json()) as { username?: unknown };
      expect(typeof payload.username).toBe("string");
      expect(String(payload.username).length).toBeGreaterThan(0);
    },
    15_000,
  );
});
