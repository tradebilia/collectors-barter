import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/components/TopBar.tsx"), "utf8");

describe("authenticated mobile top bar", () => {
  it("keeps a phone-only authenticated icon group visible beside a reserved search field", () => {
    const mobileSection = source.match(/<div className="flex min-h-14[\s\S]*?<div className="hidden min-h-14/);

    expect(mobileSection?.[0]).toContain("sm:hidden");
    expect(mobileSection?.[0]).toContain("w-[40vw]");
    expect(mobileSection?.[0]).toContain("max-w-[170px]");
    expect(mobileSection?.[0]).toContain("<TopRightIcons");
    expect(source).toContain('aria-label="Sign Out"');
  });

  it("retains the original desktop header behind the sm breakpoint", () => {
    expect(source).toContain('className="hidden min-h-14 items-center justify-center gap-4 px-2 py-2 sm:flex sm:pl-2 sm:pr-4 relative"');
  });
});
