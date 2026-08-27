import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";
import { buildBillingSummary, hasMembershipAccess } from "./membership";

const root = resolve(import.meta.dirname, "..");

describe("mobile credential sign-in session contract", () => {
  it("uses a secure first-party Lax cookie for HTTPS password sign-in", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      headers: {},
    } as any);

    expect(options).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("uses a secure third-party-capable cookie only for the embedded HTTPS WebDev preview host", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      hostname: "3000-example.us2.manus.computer",
      headers: {},
    } as any);

    expect(options).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("uses an immediate in-memory fallback and server-confirmed user snapshot for embedded previews", () => {
    const client = readFileSync(resolve(root, "client/src/main.tsx"), "utf8");
    const modal = readFileSync(resolve(root, "client/src/components/SignInModal.tsx"), "utf8");
    const session = readFileSync(resolve(root, "client/src/lib/previewSession.ts"), "utf8");
    const authHook = readFileSync(resolve(root, "client/src/_core/hooks/useAuth.ts"), "utf8");
    const topBar = readFileSync(resolve(root, "client/src/components/TopBar.tsx"), "utf8");
    const icons = readFileSync(resolve(root, "client/src/components/TopRightIcons.tsx"), "utf8");
    const context = readFileSync(resolve(root, "server/_core/context.ts"), "utf8");
    const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");

    expect(client).toContain('credentials: "include"');
    expect(client).toContain("getPreviewSessionToken()");
    expect(client).toContain('headers.set("authorization", `Bearer ${mobileSessionToken}`)');
    expect(session).toContain("let previewSessionToken: string | null = null");
    expect(session).toContain("let previewAuthenticatedUser: PreviewAuthenticatedUser | null = null");
    expect(session).toContain('PREVIEW_AUTH_CHANGED_EVENT = "tradebilia-preview-auth-changed"');
    expect(session).toContain("setPreviewAuthenticatedUser(user: PreviewAuthenticatedUser)");
    expect(session).toContain("return window.self !== window.top");
    expect(session).toContain("previewSessionToken = token");
    expect(session).toContain('sessionStorage.setItem("manus-cookie", token)');
    expect(authHook).toContain("clearPreviewSessionToken()");
    expect(modal).toContain("if (result.sessionToken && isEmbeddedPreview())");
    expect(modal).toContain("utils.auth.me.setData(undefined, result.user as any)");
    expect(modal).toContain("setPreviewAuthenticatedUser(result.user)");
    expect(modal.indexOf("utils.auth.me.setData(undefined, result.user as any)")).toBeLessThan(
      modal.indexOf("let authenticatedUser = await utils.auth.me.fetch()"),
    );
    expect(modal).toContain("let authenticatedUser = await utils.auth.me.fetch()");
    expect(modal).toContain("setPreviewSessionToken(result.sessionToken)");
    expect(modal).toContain("await utils.auth.me.invalidate()");
    expect(modal).toContain("Sign-in was accepted, but this browser did not establish a session");
    expect(context).toContain("const sessionToken = cookies.get(COOKIE_NAME) ?? bearerToken");
    expect(router).toContain("sessionToken,");
    expect(router).toContain("displayName:");
    expect(authHook).toContain("getPreviewAuthenticatedUser()");
    expect(authHook).toContain("PREVIEW_AUTH_CHANGED_EVENT");
    expect(authHook).toContain("const resolvedUser = meQuery.data ??");
    expect(topBar).toContain("const [embeddedPreviewUser, setEmbeddedPreviewUser]");
    expect(topBar).toContain("const visiblyAuthenticated = Boolean(visibleUser)");
    expect(topBar).toContain("onAuthenticated={setEmbeddedPreviewUser}");
    expect(icons).toContain("userOverride?: any");
    expect(icons).toContain("const user = authenticatedUser ?? userOverride ?? null");
  });
});

describe("Tradebilia Membership Free Launch safeguards", () => {
  it("keeps checkout, card collection, and payment enforcement inactive", () => {
    const summary = buildBillingSummary({ billingMode: "free_launch", paymentEnforcementEnabled: 0 });

    expect(summary.freeLaunchOverride).toBe(true);
    expect(summary.checkoutAvailable).toBe(false);
    expect(summary.cardCollectionAvailable).toBe(false);
    expect(summary.paymentRequired).toBe(false);
    expect(summary.futureSubscriptionTerms).toEqual([
      expect.objectContaining({ code: "monthly", priceCents: 100 }),
      expect.objectContaining({ code: "annual", priceCents: 1000 }),
    ]);
  });

  it("recognizes active, complimentary, and unexpired payment-grace access only", () => {
    expect(hasMembershipAccess("active")).toBe(true);
    expect(hasMembershipAccess("complimentary")).toBe(true);
    expect(hasMembershipAccess("past_due", new Date(Date.now() + 60_000).toISOString())).toBe(true);
    expect(hasMembershipAccess("past_due", new Date(Date.now() - 60_000).toISOString())).toBe(false);
    expect(hasMembershipAccess("unpaid")).toBe(false);
  });
});
