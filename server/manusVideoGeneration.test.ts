import { describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { createTradeVideoTask } from "./manusVideoGeneration";

describe("Manus API configuration", () => {
  it("authenticates the configured server-side API key with the read-only user endpoint", async () => {
    expect(ENV.manusApiKey, "MANUS_API_KEY must be configured for this integration test").toBeTruthy();
    const response = await fetch("https://api.manus.ai/v2/user.me", {
      headers: { "x-manus-api-key": ENV.manusApiKey },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => null) as { ok?: boolean; error?: { message?: string } } | null;
    expect(response.ok, body?.error?.message || `Manus user.me returned HTTP ${response.status}`).toBe(true);
    expect(body?.ok).toBe(true);
  });

  it("uses documented file content parts for trade-item image references", async () => {
    const response = {
      ok: true,
      json: async () => ({ ok: true, task_id: "task_test", task_url: "https://manus.im/app/task_test" }),
    } as Response;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    try {
      await createTradeVideoTask({
        script: "BREAKING NEWS. Alex is trading a collectible to Jordan. This is Tradebilia.",
        itemTitle: "Test collectible",
        requesterName: "Alex",
        recipientName: "Jordan",
        commentary: "A notable collector exchange.",
        logoUrl: "https://tradebilia.manus.space/logo.png",
        imageUrls: ["https://tradebilia.manus.space/item.jpg"],
      });
      const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
      expect(body.message.content[1]).toMatchObject({ type: "file", file_url: "https://tradebilia.manus.space/item.jpg", mime_type: "image/jpeg" });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
