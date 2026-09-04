import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homepageSource = readFileSync(new URL("../pages/Home.tsx", import.meta.url), "utf8");

describe("homepage social links", () => {
  it("keeps the supplied official Facebook, Instagram, and X destinations", () => {
    expect(homepageSource).toContain("https://www.facebook.com/tradebilia");
    expect(homepageSource).toContain("https://www.instagram.com/tradebilia");
    expect(homepageSource).toContain("https://x.com/Tradebilia66");
  });

  it("shows YouTube without fabricating a Tradebilia channel URL", () => {
    expect(homepageSource).toContain("<Youtube");
    expect(homepageSource).toContain("Tradebilia YouTube channel link coming soon");
    expect(homepageSource).not.toContain("youtube.com/@Tradebilia");
  });
});
