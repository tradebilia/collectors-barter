import { describe, expect, it } from "vitest";

describe("direct OpenAI credential", () => {
  it("authenticates against the official OpenAI models endpoint", async () => {
    const apiKey = process.env.TRADEBILIA_OPENAI_API_KEY ?? "";
    expect(apiKey, "TRADEBILIA_OPENAI_API_KEY must be configured in the project environment").toBeTruthy();

    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    expect(new URL(baseUrl).origin).toBe("https://api.openai.com");

    const response = await fetch(`${baseUrl}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.ok, `OpenAI models endpoint returned HTTP ${response.status}`).toBe(true);
    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    const modelIds = Array.isArray(payload.data) ? payload.data.map((model) => model.id).filter(Boolean) : [];
    expect(modelIds.length, "OpenAI models endpoint returned no model IDs").toBeGreaterThan(0);
  });
});
