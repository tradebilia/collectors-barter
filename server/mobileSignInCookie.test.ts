import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

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

  it("uses the session-storage fallback only when the initial auth refresh has no user", () => {
    const client = readFileSync(resolve(root, "client/src/main.tsx"), "utf8");
    const modal = readFileSync(resolve(root, "client/src/components/SignInModal.tsx"), "utf8");
    const context = readFileSync(resolve(root, "server/_core/context.ts"), "utf8");
    const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");

    expect(client).toContain('credentials: "include"');
    expect(client).toContain('sessionStorage.getItem("manus-cookie")');
    expect(client).toContain('headers.set("authorization", `Bearer ${mobileSessionToken}`)');
    expect(modal).toContain("let authenticatedUser = await utils.auth.me.fetch()");
    expect(modal).toContain('sessionStorage.setItem("manus-cookie", result.sessionToken)');
    expect(modal).toContain("Sign-in was accepted, but this browser did not establish a session");
    expect(context).toContain("const sessionToken = cookies.get(COOKIE_NAME) ?? bearerToken");
    expect(router).toContain("return { success: true, userId: user.id, sessionToken }");
  });
});
