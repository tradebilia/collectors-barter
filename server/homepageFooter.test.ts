import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage footer presentation", () => {
  it("uses compact spacing and white footer text without removing footer links", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(source).toContain('bg-black/50 px-4 py-4 sm:py-5');
    expect(source).toContain('flex flex-col items-center justify-center gap-3 text-center');
    expect(source).toContain('flex items-center justify-center gap-2');
    expect(source).toContain('text-sm font-medium text-white');
    expect(source).toContain('text-sm text-white hover:text-white/80 transition-colors');
    expect(source).toContain('How Tradebilia Works');
    expect(source).toContain('Privacy Policy');
    expect(source).toContain('Terms of Service');
    expect(source).toContain('Contact Us');
    expect(source).not.toContain('bg-black/50 py-12 px-4');
  });
});
