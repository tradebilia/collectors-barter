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

  it("shows accessible non-linking Facebook, Instagram, and X placeholders until official destinations are configured", () => {
    expect(homepageSource).toContain('aria-labelledby="tradebilia-social-heading"');
    expect(homepageSource).toContain('id="tradebilia-social-heading"');
    expect(homepageSource).toContain("Follow Tradebilia");
    expect(homepageSource).toContain("Official social links will be added here soon.");
    expect(homepageSource).toContain('aria-label="Facebook link coming soon"');
    expect(homepageSource).toContain('aria-label="Instagram link coming soon"');
    expect(homepageSource).toContain('aria-label="X link coming soon"');
    expect(homepageSource).toContain("<Facebook");
    expect(homepageSource).toContain("<Instagram");
    expect(homepageSource).toContain("<X");
    expect(homepageSource).not.toMatch(/(?:facebook|instagram|twitter|x)\.com/i);
  });
});
