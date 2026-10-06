import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ItemDetail.tsx", import.meta.url), "utf8");

describe("ItemDetail responsive formatting", () => {
  it("uses a responsive two-column mobile details grid instead of a fixed four-column table", () => {
    expect(source).toContain('className="grid grid-cols-2 text-sm sm:grid-cols-4"');
    expect(source).not.toContain("<table className=\"w-full text-sm\">");
  });

  it("wraps long identity fields and titles rather than truncating them", () => {
    expect(source).toContain("break-words text-3xl");
    expect(source).toContain("[overflow-wrap:anywhere]");
    expect(source).toContain("break-words text-sm font-medium leading-5");
  });

  it("allows mobile action labels and verification badges to flow onto multiple lines", () => {
    expect(source).toContain("whitespace-normal sm:h-12");
    expect(source).toContain("w-full text-xs font-semibold uppercase tracking-wider");
    expect(source).toContain("flex flex-wrap items-center gap-2");
  });
});
