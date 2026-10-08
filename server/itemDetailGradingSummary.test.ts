import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/ItemDetail.tsx", import.meta.url), "utf8");

describe("item-detail grading summary", () => {
  it("places Grading Company before Numerical Grade in the two-column summary", () => {
    const summaryStart = source.indexOf('className="mt-5 grid min-w-0 gap-4 text-base text-gray-700 sm:mt-6 sm:grid-cols-2 sm:text-lg"');
    const summaryEnd = source.indexOf('<Separator className="my-8 bg-gray-200"', summaryStart);
    const summary = source.slice(summaryStart, summaryEnd);

    expect(summary.indexOf("Grading Company")).toBeGreaterThanOrEqual(0);
    expect(summary.indexOf("Numerical Grade")).toBeGreaterThanOrEqual(0);
    expect(summary.indexOf("Grading Company")).toBeLessThan(summary.indexOf("Numerical Grade"));
  });

  it("recovers an alphanumeric PCGS grade when the legacy numeric column is empty", () => {
    expect(source).toContain("recoverPcgsCoinGradeFromTitle(listing.title, listing.category, listing.certificationCompany)");
    expect(source).toContain("if (displayGrade) allFields.push({ label: String(displayGrade)");
  });

  it("uses shared alphanumeric grade resolution for NGC and keeps graded items out of Condition fallback", () => {
    expect(source).toContain("resolvePublicGradeValue(");
    expect(source).toContain("const itemDetailsGrade = listing.itemDetails?.grade");
    expect(source).toContain("const isGradedListing = Boolean(displayGrade) || Boolean(listing.certificationCompany)");
    expect(source).toContain("{displayGrade || isGradedListing ? (");
  });
});
