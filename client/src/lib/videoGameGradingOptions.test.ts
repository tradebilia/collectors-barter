import { describe, expect, it } from "vitest";
import { getGradingCompanyNamesForCategory } from "@shared/gradingCompanyConfig";
import { ALL_FIELD_DEFINITIONS } from "./fieldDefinitionsComplete";

describe("Video Games grading-company options", () => {
  it("includes PSA and WATA in every active Video Games grading dropdown", () => {
    const videoGameDefinitions = Object.values(ALL_FIELD_DEFINITIONS.video_games ?? {}).flat();
    const gradingFields = videoGameDefinitions.filter(field => field.name === "gradingCompany");

    expect(gradingFields.length).toBeGreaterThan(0);
    gradingFields.forEach(field => {
      expect(field.dropdownOptions).toEqual(expect.arrayContaining(["PSA", "WATA", "Other"]));
      expect(field.dropdownOptions).not.toContain("WATA Games (PSA Video Games)");
    });
  });

  it("keeps the canonical Video Games catalog aligned with the form", () => {
    const names = getGradingCompanyNamesForCategory("video_games");
    expect(names).toEqual(expect.arrayContaining(["PSA", "WATA"]));
    expect(names).not.toContain("WATA Games");
  });
});
