import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("mobile-only responsive layout contracts", () => {
  it("keeps Category Page desktop filters while providing a phone drawer and Explore All-style two-column cards", () => {
    const source = read("client/src/pages/CategoryPage.tsx");
    expect(source).toContain("mobileFiltersOpen");
    expect(source).toContain("md:static");
    expect(source).toContain("grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-6");
    expect(source).toContain("aspect-[7/9] sm:aspect-[4/5]");
    expect(source).toContain("h-7 min-w-0 flex-1 rounded-full");
    expect(source).toContain("md:grid-cols-6");
  });

  it("uses the same compact two-column card treatment for My Inventory on phone widths while retaining richer desktop controls", () => {
    const source = read("client/src/pages/Inventory.tsx");
    expect(source).toContain("grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-6");
    expect(source).toContain("aspect-[7/9] items-center justify-center");
    expect(source).toContain("grid grid-cols-2 gap-1 rounded-md border border-current/10 bg-black/5 p-1 text-[0.5rem] sm:hidden");
    expect(source).toContain("hidden space-y-2 text-sm sm:block");
    expect(source).toContain("Edit");
  });

  it("keeps Member Directory desktop sidebar while providing a mobile drawer", () => {
    const source = read("client/src/pages/MemberSearch.tsx");
    expect(source).toContain("mobileFiltersOpen");
    expect(source).toContain("xl:sticky");
    expect(source).toContain("xl:translate-x-0");
    expect(source).toContain("xl:hidden");
  });

  it("uses a phone-only Conventions title fallback and preserves desktop artwork", () => {
    const source = read("client/src/pages/Conventions.tsx");
    expect(source).toContain('sm:hidden">Conventions');
    expect(source).toContain("hidden h-auto w-full object-contain sm:block");
  });

  it("keeps desktop homepage ranking columns while compacting phone ranking modules", () => {
    const source = read("client/src/pages/Home.tsx");
    expect(source).toContain("grid grid-cols-2 gap-3");
    expect(source).toContain("xl:grid-cols-4");
  });

  it("adds mobile category navigation scroll snapping without desktop displacement", () => {
    const source = read("client/src/components/CategoryBar.tsx");
    expect(source).toContain("snap-x");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("function PostageStampIcon");
    expect(source).toContain("stamps: PostageStampIcon");
    expect(source).toContain("function PokemonSilhouetteIcon");
    expect(source).toContain("pokemon: PokemonSilhouetteIcon");
    expect(source).toContain("autographs: PenLine");
    expect(source).not.toContain("stamps: PenLine");
  });
});
