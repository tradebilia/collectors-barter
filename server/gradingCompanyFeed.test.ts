import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCustomGradingCompany } from "./db";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("feed grading-company metadata", () => {
  it("extracts PSA from parsed itemDetails objects", () => {
    expect(getCustomGradingCompany({ customGradingCompany: "PSA" })).toBe("PSA");
  });

  it("extracts PSA from serialized itemDetails and legacy key names", () => {
    expect(getCustomGradingCompany(JSON.stringify({ customGradingCompany: "PSA" }))).toBe("PSA");
    expect(getCustomGradingCompany(JSON.stringify({ "Custom Grading Company": "PSA" }))).toBe("PSA");
  });

  it("does not treat an unusable Other sentinel as a company name", () => {
    expect(getCustomGradingCompany({ customGradingCompany: "Other" })).toBeNull();
    expect(getCustomGradingCompany({ customGradingCompany: "" })).toBeNull();
    expect(getCustomGradingCompany("not-json")).toBeNull();
  });

  it("projects itemDetails in the marketplace feed before resolving custom grading", () => {
    const feedProjection = dbSource.slice(dbSource.indexOf("let listingRows = await db"), dbSource.indexOf("const locationSort", dbSource.indexOf("let listingRows = await db")));
    expect(feedProjection).toContain("itemDetails: listings.itemDetails");
  });
});
