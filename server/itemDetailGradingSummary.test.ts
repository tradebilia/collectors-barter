import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ItemDetail.tsx", import.meta.url), "utf8");

describe("item-detail grading summary", () => {
  it("places Grading Company before Numerical Grade in the two-column summary", () => {
    const summaryStart = source.indexOf('className="mt-6 grid gap-4 text-lg text-gray-700 sm:grid-cols-2"');
    const summaryEnd = source.indexOf('<Separator className="my-8 bg-gray-200"', summaryStart);
    const summary = source.slice(summaryStart, summaryEnd);

    expect(summary.indexOf("Grading Company")).toBeGreaterThanOrEqual(0);
    expect(summary.indexOf("Numerical Grade")).toBeGreaterThanOrEqual(0);
    expect(summary.indexOf("Grading Company")).toBeLessThan(summary.indexOf("Numerical Grade"));
  });
});
