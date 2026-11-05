import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("LLM provider routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("omits temperature for GPT-6 Luna but preserves it for Forge models", async () => {
    const responses = [
      { id: "luna", model: "gpt-6-luna", choices: [{ message: { role: "assistant", content: "{}" } }] },
      { id: "forge", model: "gpt-5-mini", choices: [{ message: { role: "assistant", content: "{}" } }] },
    ];
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        body: null,
        json: async () => responses[requests.length - 1],
      } as Response;
    }));

    await invokeLLM({
      provider: "openai",
      model: "gpt-6-luna",
      messages: [{ role: "user", content: "test" }],
      temperature: 0,
    });
    await invokeLLM({
      provider: "manus_forge",
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "test" }],
      temperature: 0,
    });

    expect(requests[0]).not.toHaveProperty("temperature");
    expect(requests[1]).toHaveProperty("temperature", 0);
  });
});
