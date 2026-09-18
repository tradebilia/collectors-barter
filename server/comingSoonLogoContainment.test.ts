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

  it("reflows the distinctive desktop visual language for mobile", () => {
    expect(source).toContain('aria-label="Tradebilia mobile launch signup"');
    expect(source).toContain("<TradebiliaWheel");
    expect(source).toContain("TRADEBILIA");
    expect(source).toContain("Why Buy or Sell");
    expect(source).toContain("When You Can Trade?");
    expect(source).toContain("mobileCategories.map");
    expect(source).toContain('aria-label="Tradebilia collector categories"');
    expect(source).toContain("Built for collectors");
  });

  it("keeps the mobile email action as a 48px direct gold signup bar", () => {
    expect(source).toContain('className="flex h-12 w-full"');
    expect(source).toContain('id={`${emailId}-mobile`}');
    expect(source).toContain('w-[31%]');
    expect(source).toContain('bg-[#e3ab5e]');
    expect(source).toContain('type="email"');
    expect(source).toContain('autoComplete="email"');
    expect(source).toContain('required');
  });
});
