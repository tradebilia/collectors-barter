import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homepageSource = readFileSync(new URL("../pages/Home.tsx", import.meta.url), "utf8");

describe("homepage social links", () => {
  it("keeps the supplied official Facebook, Instagram, and X destinations", () => {
    expect(homepageSource).toContain("/manus-storage/facebook_a1c8ae7d.svg");
    expect(homepageSource).toContain("/manus-storage/instagram_27917c8e.svg");
    expect(homepageSource).toContain("/manus-storage/x_bddf13f5.svg");
    expect(homepageSource).toContain("https://www.facebook.com/tradebilia");
    expect(homepageSource).toContain("https://www.instagram.com/tradebilia");
    expect(homepageSource).toContain("https://x.com/Tradebilia66");
  });

  it("shows YouTube without fabricating a Tradebilia channel URL", () => {
    expect(homepageSource).toContain("/manus-storage/youtube_40b8f30b.svg");
    expect(homepageSource).toContain("Tradebilia YouTube channel link coming soon");
    expect(homepageSource).not.toContain("youtube.com/@Tradebilia");
  });
});
