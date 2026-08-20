import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("mobile-only responsive layout contracts", () => {
  it("keeps Category Page desktop filters while providing a phone drawer and one-column cards", () => {
    const source = read("client/src/pages/CategoryPage.tsx");
    expect(source).toContain("mobileFiltersOpen");
    expect(source).toContain("md:static");
    expect(source).toContain("grid-cols-1");
    expect(source).toContain("md:grid-cols-6");
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
  });
});
