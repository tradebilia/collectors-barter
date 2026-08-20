import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "../client/src/components/CategoryBar.tsx"), "utf8");

describe("Category Bar Explore All navigation", () => {
  it("links the leading all-category entry to Global Search and highlights it on that route", () => {
    expect(source).toContain('const isGlobalSearchPage = useRoute("/search")[0];');
    expect(source).toContain('href="/search"');
    expect(source).toContain("Explore All");
    expect(source).toContain('isGlobalSearchPage === true ? "bg-white text-slate-950" : "text-white"');
    expect(source).toContain('href={`/category/${category.value}`}');
  });
});
