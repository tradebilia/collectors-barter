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

  it("keeps browser credential inclusion and refreshes auth state after local sign-in", () => {
    const client = readFileSync(resolve(root, "client/src/main.tsx"), "utf8");
    const modal = readFileSync(resolve(root, "client/src/components/SignInModal.tsx"), "utf8");

    expect(client).toContain('credentials: "include"');
    expect(modal).toContain("await utils.auth.me.refetch()");
  });
});
