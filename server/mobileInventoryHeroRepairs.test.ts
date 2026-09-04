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

  it("aligns the My Inventory hero, primary action, and visibility controls with the homepage system", () => {
    const source = read("client/src/pages/Inventory.tsx");
    expect(source).toContain('className="container relative flex h-[400px] items-center justify-center py-0"');
    expect(source).toContain('className="flex w-full max-w-6xl -translate-x-[5.56%] items-center justify-center px-4"');
    expect(source).toContain('className="h-auto w-full object-contain"');
    expect(source).toContain('</section>\n\n      <CategoryBar />');
    expect(source).toContain('Show only items listed for trade');
    expect(source).toContain('Show draft and unsaved items');
    expect(source).toContain('grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left');
    expect(source).toContain('min-h-12 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-8 py-3.5 text-base');
    expect(source).toContain('focus-visible:ring-offset-2 lg:mr-3');
  });
});
