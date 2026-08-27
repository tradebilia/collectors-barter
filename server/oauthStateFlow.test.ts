import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeOAuthState } from "../shared/const";

const mocks = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  exchangeCodeForToken: vi.fn(async () => ({ accessToken: "test-access-token" })),
  getUserInfo: vi.fn(async () => ({ openId: "oauth-test-user", name: "OAuth Test User", email: "oauth-test@example.test" })),
  createSessionToken: vi.fn(async () => "test-session-token"),
}));

vi.mock("./db", () => ({ upsertUser: mocks.upsertUser }));
vi.mock("./_core/sdk", () => ({
  sdk: {
    exchangeCodeForToken: mocks.exchangeCodeForToken,
    getUserInfo: mocks.getUserInfo,
    createSessionToken: mocks.createSessionToken,
  },
}));

import { registerOAuthRoutes } from "./_core/oauth";

describe("Manus OAuth state flow", () => {
  const originalPortalUrl = process.env.VITE_OAUTH_PORTAL_URL;
  const originalAppId = process.env.VITE_APP_ID;

  afterEach(() => {
    if (originalPortalUrl === undefined) delete process.env.VITE_OAUTH_PORTAL_URL;
    else process.env.VITE_OAUTH_PORTAL_URL = originalPortalUrl;
    if (originalAppId === undefined) delete process.env.VITE_APP_ID;
    else process.env.VITE_APP_ID = originalAppId;
    vi.clearAllMocks();
  });

  function makeApp() {
    const app = express();
    registerOAuthRoutes(app);
    return app;
  }

  it("sets a short-lived first-party state cookie before redirecting a live-domain sign-in", async () => {
    process.env.VITE_OAUTH_PORTAL_URL = "https://oauth.example.test";
    process.env.VITE_APP_ID = "tradebilia-test-app";

    const response = await request(makeApp())
      .get("/api/oauth/start")
      .set("Host", "tradebilia.manus.space")
      .set("X-Forwarded-Proto", "https")
      .redirects(0);

    expect(response.status).toBe(302);
    const redirect = new URL(response.headers.location);
    expect(`${redirect.origin}${redirect.pathname}`).toBe("https://oauth.example.test/app-auth");
    expect(redirect.searchParams.get("appId")).toBe("tradebilia-test-app");
    expect(redirect.searchParams.get("redirectUri")).toBe("https://tradebilia.manus.space/api/oauth/callback");
    const state = redirect.searchParams.get("state");
    expect(state).toBeTruthy();
    expect(decodeOAuthState(state!).nonce).toBeTruthy();
    expect(response.headers["set-cookie"]?.join(";")).toContain("__Host-oauth_state=");
    expect(response.headers["set-cookie"]?.join(";")).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.join(";")).toContain("SameSite=Lax");
    expect(response.headers["set-cookie"]?.join(";")).toContain("Secure");
  });

  it("accepts the nonce produced by start and clears it with the matching preview cookie policy", async () => {
    process.env.VITE_OAUTH_PORTAL_URL = "https://oauth.example.test";
    process.env.VITE_APP_ID = "tradebilia-test-app";
    const app = makeApp();
    const start = await request(app)
      .get("/api/oauth/start")
      .set("Host", "3000-preview.manus.computer")
      .set("X-Forwarded-Proto", "https")
      .redirects(0);
    const state = new URL(start.headers.location).searchParams.get("state");
    const cookie = start.headers["set-cookie"]?.[0]?.split(";")[0];

    const callback = await request(app)
      .get("/api/oauth/callback")
      .set("Host", "3000-preview.manus.computer")
      .set("X-Forwarded-Proto", "https")
      .set("Cookie", cookie!)
      .query({ code: "test-code", state })
      .redirects(0);

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe("/");
    expect(mocks.exchangeCodeForToken).toHaveBeenCalledWith("test-code", state);
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "oauth-test-user" }));
    expect(callback.headers["set-cookie"]?.join(";")).toContain("SameSite=None");
    expect(callback.headers["set-cookie"]?.join(";")).toContain("Secure");
  });

  it("rejects a callback without the state cookie before exchanging a code", async () => {
    const state = Buffer.from(JSON.stringify({ redirectUri: "https://tradebilia.manus.space/api/oauth/callback", nonce: "missing-cookie" })).toString("base64url");
    const response = await request(makeApp())
      .get("/api/oauth/callback")
      .set("Host", "tradebilia.manus.space")
      .query({ code: "test-code", state });

    expect(response.status).toBe(403);
    expect(mocks.exchangeCodeForToken).not.toHaveBeenCalled();
  });
});
