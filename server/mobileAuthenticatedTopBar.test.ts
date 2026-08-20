import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(__dirname, "../client/src/components/TopBar.tsx"), "utf8");

describe("authenticated mobile top bar", () => {
  it("keeps a phone-only authenticated icon group visible beside a reserved search field", () => {
    expect(source).toContain('className="flex min-h-14 items-center gap-2 px-2 py-2 sm:hidden"');
    expect(source).toContain('className="flex w-[40vw] max-w-[170px] flex-none items-center gap-0 rounded-lg bg-white px-3 py-2"');
    expect(source).toContain('<TopRightIcons className="flex items-center gap-1" iconColor="text-white/70" />');
    expect(source).toContain('aria-label="Sign Out"');
  });

  it("retains the original desktop header behind the sm breakpoint", () => {
    expect(source).toContain('className="hidden min-h-14 items-center justify-center gap-4 px-2 py-2 sm:flex sm:pl-2 sm:pr-4 relative"');
  });
});
