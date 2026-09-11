import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage footer presentation", () => {
  it("uses compact spacing and white footer text without removing footer links", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(source).toContain('bg-black/50 py-12 px-4');
    expect(source).toContain('flex flex-col md:flex-row justify-between items-center gap-8');
    expect(source).toContain('text-white/40 text-sm font-medium');
    expect(source).toContain('text-white/40 hover:text-white/80 text-sm transition-colors');
    expect(source).toContain('How Tradebilia Works');
    expect(source).toContain('Privacy Policy');
    expect(source).toContain('Terms of Service');
    expect(source).toContain('Contact Us');
    expect(source).not.toContain('bg-black/50 px-4 py-4 sm:py-5');
  });
});
