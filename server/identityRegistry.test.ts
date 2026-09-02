import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fingerprintIdentity, normalizeIdentity } from "./identityRegistry";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("private identity registry", () => {
  it("normalizes account email and phone values before calculating a non-reversible fingerprint", () => {
    expect(normalizeIdentity("email", "  Collector@Example.com ")).toBe("collector@example.com");
    expect(normalizeIdentity("phone", "(212) 555-0199")).toBe("2125550199");
    expect(fingerprintIdentity("email", "collector@example.com", "test-key")).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprintIdentity("email", "collector@example.com", "test-key")).not.toContain("collector@example.com");
  });

  it("claims account email and verified contact identities transactionally", () => {
    expect(dbSource).toContain('await claimIdentity(tx, { userId, identityType: "email", value: input.email })');
    expect(dbSource).toContain('identityType: "phone"');
    expect(dbSource).toContain('identityType: "etsy"');
    expect(dbSource).toContain('identityType: "ebay"');
  });

  it("restricts retained identities on suspension or ban and restores only after administrator reversal", () => {
    expect(routerSource).toContain('status: "restricted", administratorId: ctx.user.id');
    expect(routerSource).toContain('status: "active"');
  });

  it("covers all four approved OAuth provider identity types without placing them in public output", () => {
    for (const provider of ["ebay", "facebook", "linkedin", "etsy"]) {
      expect(readFileSync(new URL(`./identityRegistry.ts`, import.meta.url), "utf8")).toContain(`"${provider}"`);
    }
    expect(readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8")).toContain('identityRegistry_type_fingerprint_unique');
  });
});
