import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ComingSoon.tsx", import.meta.url), "utf8");

describe("Coming Soon responsive layout", () => {
  it("retains the supplied artwork and compact overlay form on desktop", () => {
    expect(source).toContain("SUPPLIED_COMING_SOON_HTML_URL");
    expect(source).toContain('hidden aspect-[1815/867] w-full sm:block');
    expect(source).toContain('top-[65.5%] h-[5.6%] w-[27%]');
    expect(source).toContain('id={`${emailId}-desktop`}');
  });

  it("uses a full-height, vertical mobile composition instead of shrinking the desktop canvas", () => {
    expect(source).toContain('min-h-[100svh] flex-col overflow-hidden px-5 pb-6 pt-8');
    expect(source).toContain('aria-label="Tradebilia mobile launch signup"');
    expect(source).toContain('id={`${emailId}-mobile`}');
    expect(source).toContain('h-12 w-full rounded-lg');
    expect(source).toContain("Why Buy or Sell");
    expect(source).toContain("When You Can Trade?");
    expect(source).toContain("Discover rare finds · Trade with confidence · No trading fees · Trade across categories");
  });

  it("keeps the mobile email field and action at accessible touch sizes", () => {
    expect(source).toContain('type="email"');
    expect(source).toContain('autoComplete="email"');
    expect(source).toContain('required');
    expect(source).toContain('aria-label={subscribeMutation.isPending ? "Saving email" : "Notify me for launch updates"}');
  });
});
