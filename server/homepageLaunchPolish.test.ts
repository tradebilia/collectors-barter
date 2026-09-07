import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homepageSource = readFileSync(join(process.cwd(), "client/src/pages/Home.tsx"), "utf-8");

describe("homepage launch polish", () => {
  it("does not render a Member Growth metric", () => {
    expect(homepageSource).not.toContain("Member Growth");
    expect(homepageSource).toContain("grid-cols-2 items-center gap-0 sm:grid-cols-4");
  });

  it("does not render the Shipping Supplies Coming soon placeholder", () => {
    expect(homepageSource).not.toContain("Shipping Supplies");
  });

  it("extends the Follow Tradebilia background through the homepage bottom padding", () => {
    expect(homepageSource).toContain('className="relative z-10 -mb-24 border-t border-white/10 bg-[#0b102b] px-4 pb-32 pt-8 text-white sm:pt-10"');
  });

  it("links Facebook, Instagram, and X icons to Rich's supplied official Tradebilia destinations", () => {
    expect(homepageSource).toContain('aria-labelledby="tradebilia-social-heading"');
    expect(homepageSource).toContain('id="tradebilia-social-heading"');
    expect(homepageSource).toContain("Follow Tradebilia");
    expect(homepageSource).toContain("Find Tradebilia across the collector community.");
    expect(homepageSource).toContain('href="https://www.facebook.com/tradebilia"');
    expect(homepageSource).toContain('href="https://www.instagram.com/tradebilia"');
    expect(homepageSource).toContain('href="https://x.com/Tradebilia66"');
    expect(homepageSource).toContain('aria-label="Follow Tradebilia on Facebook (opens in a new tab)"');
    expect(homepageSource).toContain('aria-label="Follow Tradebilia on Instagram (opens in a new tab)"');
    expect(homepageSource).toContain('aria-label="Follow Tradebilia on X (opens in a new tab)"');
    expect(homepageSource).toContain('target="_blank" rel="noopener noreferrer"');
    expect(homepageSource).toContain("/manus-storage/facebook_a1c8ae7d.svg");
    expect(homepageSource).toContain("/manus-storage/instagram_27917c8e.svg");
    expect(homepageSource).toContain("/manus-storage/x_bddf13f5.svg");
    expect(homepageSource).not.toContain('href="https://www.youtube.com');
  });
});
