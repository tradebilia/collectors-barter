import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("mobile inventory upload and category hero repairs", () => {
  it("keeps the photo uploader in normal phone flow and its absolute desktop position", () => {
    const source = read("client/src/pages/AddInventory.tsx");
    expect(source).toContain("mt-8 w-full lg:absolute lg:top-12 lg:-right-4 lg:z-10 lg:w-80");
    expect(source).toContain("rounded-lg border border-white/20 bg-white/5 p-4 backdrop-blur sm:p-6");
  });

  it("normalizes Comics and Autographs Exchange typography only below the small-screen breakpoint", () => {
    const source = read("client/src/pages/CategoryPage.tsx");
    expect(source).toContain("@media (max-width: 639px)");
    expect(source).toContain(".category-hero-exchange-comics");
    expect(source).toContain(".category-hero-exchange-autographs");
    expect(source).toContain("font-family: 'Righteous', sans-serif !important");
    expect(source).toContain("fontFamily: getCategoryFont(slug)");
  });

  it("constrains Vintage Toys and Video Games title artwork only on phones while retaining desktop artwork styles", () => {
    const source = read("client/src/pages/CategoryPage.tsx");
    expect(source).toContain(".category-hero-title-shell-video_games");
    expect(source).toContain(".category-hero-title-shell-vintage_toys");
    expect(source).toContain("max-height: 170px !important");
    expect(source).toContain("video_games: { maxHeight: \"550px\"");
    expect(source).toContain("vintage_toys: { maxHeight: \"550px\"");
  });
});
