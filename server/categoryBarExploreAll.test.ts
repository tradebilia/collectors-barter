import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "../client/src/components/CategoryBar.tsx"), "utf8");

describe("Category Bar Explore All navigation", () => {
  it("links the leading all-category entry to Global Search and highlights it on that route", () => {
    expect(source).toContain('const isGlobalSearchPage = useRoute("/search")[0];');
    expect(source).toContain('href="/search"');
    expect(source).toContain("Explore All");
    expect(source).toContain('className={linkClass(isGlobalSearchPage === true)}');
    expect(source).toContain('active ? "rounded-md bg-gradient-to-b from-[#7132e8] to-[#3f1a9f] text-white');
    expect(source).toContain('href={`/category/${category.value}`}');
  });

  it("preserves the spacious reference treatment for category navigation", () => {
    expect(source).toContain("min-h-[72px]");
    expect(source).toContain("h-5 w-5");
    expect(source).toContain("border-y border-[#4238cf]");
    expect(source).toContain("bg-gradient-to-b from-[#7132e8] to-[#3f1a9f]");
  });
});
