import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("UPS OAuth callback readiness", () => {
  const source = readFileSync(join(process.cwd(), "server/_core/providerOAuthCallbacks.ts"), "utf8");

  it("reserves the deployed production callback route without exchanging credentials before UPS is configured", () => {
    expect(source).toContain('app.get("/api/ups/callback"');
    expect(source).toContain("ups=error&reason=not_configured&tab=integrations");
  });
});
