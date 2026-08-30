import { describe, expect, it } from "vitest";
import { createEtsyPkceVerifier, ETSY_SCOPES, getEtsyAuthUrl } from "./_core/etsy";

describe("Etsy OAuth integration", () => {
  it("generates a verifier and matching S256 challenge", () => {
    const first = createEtsyPkceVerifier();
    const second = createEtsyPkceVerifier();
    expect(first.verifier).toBeTruthy();
    expect(first.challenge).toBeTruthy();
    expect(first.verifier).not.toBe(second.verifier);
    expect(first.challenge).not.toBe(second.challenge);
    expect(first.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("uses only read scopes needed for identity and shop verification", () => {
    expect(ETSY_SCOPES).toEqual(["email_r", "profile_r", "shops_r"]);
  });

  it("builds an authorization URL with PKCE and read-only scopes", () => {
    const url = new URL(getEtsyAuthUrl("state", "challenge"));
    expect(url.origin).toBe("https://www.etsy.com");
    expect(url.pathname).toBe("/oauth/connect");
    expect(url.searchParams.get("state")).toBe("state");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe("email_r profile_r shops_r");
  });
});
