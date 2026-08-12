import { describe, expect, it } from "vitest";
import { getFacebookAuthUrl } from "./_core/facebook";
import { getLinkedInAuthUrl } from "./_core/linkedin";

describe("OAuth callback configuration", () => {
  it("uses the configured Facebook callback URL in the authorization request", () => {
    const url = new URL(getFacebookAuthUrl("test-state"));
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://tradebilia.manus.space/api/facebook/callback",
    );
  });

  it("uses the configured LinkedIn callback URL in the authorization request", () => {
    const url = new URL(getLinkedInAuthUrl("test-state"));
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://tradebilia.manus.space/api/linkedin/callback",
    );
  });
});
