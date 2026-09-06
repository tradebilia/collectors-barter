import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("post-reset sign-in navigation", () => {
  it("opens the sign-in modal on the clean homepage from both recovery screens", () => {
    const constants = read("client/src/const.ts");
    const forgot = read("client/src/pages/ForgotPassword.tsx");
    const reset = read("client/src/pages/ResetPassword.tsx");
    expect(constants).toContain('export const getHomeLoginUrl = () => "/?signin=1";');
    expect(forgot).toContain('window.location.href = getHomeLoginUrl()');
    expect(reset).toContain('window.location.href = getHomeLoginUrl()');
    expect(forgot).not.toContain("getLoginUrl");
    expect(reset).not.toContain("getLoginUrl");
  });

  it("keeps the generic sign-in helper route-preserving for non-recovery pages", () => {
    const constants = read("client/src/const.ts");
    expect(constants).toContain('location.searchParams.set("signin", "1")');
    expect(constants).toContain("return `${location.pathname}${location.search}${location.hash}`");
  });
});
