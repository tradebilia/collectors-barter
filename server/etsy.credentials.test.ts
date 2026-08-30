import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("Etsy configured credentials", () => {
  it("authenticates the application against Etsy shop search", async () => {
    expect(ENV.etsyApiKeystring).toBeTruthy();
    expect(ENV.etsySharedSecret).toBeTruthy();
    const response = await fetch("https://openapi.etsy.com/v3/application/shops?shop_name=Etsy&limit=1", {
      headers: { "x-api-key": `${ENV.etsyApiKeystring}:${ENV.etsySharedSecret}` },
    });
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  }, 15000);
});
