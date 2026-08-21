import { describe, expect, it } from "vitest";
import {
  createProviderOauthState,
  isValidProviderOauthState,
  providerOauthStateCookieName,
} from "./_core/providerOauthState";

describe("provider OAuth state", () => {
  it("creates distinct high-entropy states and validates only the matching value", () => {
    const state = createProviderOauthState();
    expect(state).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(createProviderOauthState()).not.toBe(state);
    expect(isValidProviderOauthState(state, state)).toBe(true);
    expect(isValidProviderOauthState(state, `${state}x`)).toBe(false);
    expect(isValidProviderOauthState(undefined, state)).toBe(false);
  });

  it("isolates state cookies by provider", () => {
    expect(providerOauthStateCookieName("ebay")).not.toBe(providerOauthStateCookieName("facebook"));
    expect(providerOauthStateCookieName("linkedin")).toBe("tradebilia_linkedin_oauth_state");
  });
});
