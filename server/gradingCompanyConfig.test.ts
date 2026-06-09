import { describe, it, expect } from "vitest";
import {
  getGradingCompanyByName,
  isValidGradeForCompany,
  getGradingCompaniesForCategory,
  getValidGradesForCompany,
} from "../shared/gradingCompanyConfig";

describe("Grading Company Configuration", () => {
  describe("getGradingCompanyByName", () => {
    it("should return PSA company with correct properties", () => {
      const psa = getGradingCompanyByName("PSA");
      expect(psa).toBeDefined();
      expect(psa?.name).toBe("PSA");
      expect(psa?.categories).toContain("sports_cards");
      expect(psa?.categories).toContain("pokemon");
      expect(psa?.validGrades).toContain("1");
      expect(psa?.validGrades).toContain("10");
    });

    it("should return CGC Comics with correct properties", () => {
      const cgc = getGradingCompanyByName("CGC Comics");
      expect(cgc).toBeDefined();
      expect(cgc?.name).toBe("CGC Comics");
      expect(cgc?.categories).toContain("comics");
      expect(cgc?.validGrades).toContain("0.5");
      expect(cgc?.validGrades).toContain("9.8");
    });

    it("should return undefined for non-existent company", () => {
      const fake = getGradingCompanyByName("Fake Grader");
      expect(fake).toBeUndefined();
    });
  });

  describe("isValidGradeForCompany", () => {
    it("should validate PSA grades correctly", () => {
      expect(isValidGradeForCompany("PSA", "1")).toBe(true);
      expect(isValidGradeForCompany("PSA", "5")).toBe(true);
      expect(isValidGradeForCompany("PSA", "10")).toBe(true);
      expect(isValidGradeForCompany("PSA", "1.5")).toBe(true);
      expect(isValidGradeForCompany("PSA", "11")).toBe(false);
      expect(isValidGradeForCompany("PSA", "0")).toBe(false);
    });

    it("should validate CGC Comics grades with 0.2 increments", () => {
      expect(isValidGradeForCompany("CGC Comics", "0.5")).toBe(true);
      expect(isValidGradeForCompany("CGC Comics", "0.7")).toBe(true);
      expect(isValidGradeForCompany("CGC Comics", "1.0")).toBe(true);
      expect(isValidGradeForCompany("CGC Comics", "9.8")).toBe(true);
      expect(isValidGradeForCompany("CGC Comics", "10.0")).toBe(true);
      expect(isValidGradeForCompany("CGC Comics", "0.6")).toBe(false);
      expect(isValidGradeForCompany("CGC Comics", "11")).toBe(false);
    });

    it("should validate coin grader PCGS grades", () => {
      expect(isValidGradeForCompany("PCGS", "1")).toBe(true);
      expect(isValidGradeForCompany("PCGS", "70")).toBe(true);
      expect(isValidGradeForCompany("PCGS", "60")).toBe(true);
      expect(isValidGradeForCompany("PCGS", "65")).toBe(true);
      expect(isValidGradeForCompany("PCGS", "71")).toBe(false);
    });

    it("should return false for invalid company", () => {
      expect(isValidGradeForCompany("Fake Grader", "5")).toBe(false);
    });
  });

  describe("getGradingCompaniesForCategory", () => {
    it("should return comic grading companies for comics category", () => {
      const companies = getGradingCompaniesForCategory("comics");
      const names = companies.map((c) => c.name);
      expect(names).toContain("CGC Comics");
      expect(names).toContain("CBCS");
      expect(names).toContain("PGX Comics");
      expect(names).not.toContain("PSA");
      expect(names).not.toContain("PCGS");
    });

    it("should return coin grading companies for coins category", () => {
      const companies = getGradingCompaniesForCategory("coins");
      const names = companies.map((c) => c.name);
      expect(names).toContain("PCGS");
      expect(names).toContain("NGC");
      expect(names).toContain("ANACS");
      expect(names).toContain("ICG");
      expect(names).not.toContain("PSA");
      expect(names).not.toContain("CGC Comics");
    });

    it("should return sports card grading companies for sports_cards category", () => {
      const companies = getGradingCompaniesForCategory("sports_cards");
      const names = companies.map((c) => c.name);
      expect(names).toContain("PSA");
      expect(names).toContain("Beckett Grading Services (BGS)");
      expect(names).toContain("SGC");
      expect(names).not.toContain("PCGS");
      expect(names).not.toContain("CGC Comics");
    });

    it("should return empty array for invalid category", () => {
      const companies = getGradingCompaniesForCategory("invalid_category" as any);
      expect(companies).toEqual([]);
    });
  });

  describe("getValidGradesForCompany", () => {
    it("should return PSA valid grades", () => {
      const grades = getValidGradesForCompany("PSA");
      expect(grades).toContain("1");
      expect(grades).toContain("5");
      expect(grades).toContain("10");
      expect(grades).toContain("1.5");
      expect(grades.length).toBeGreaterThan(0);
    });

    it("should return CGC Comics valid grades with 0.2 increments", () => {
      const grades = getValidGradesForCompany("CGC Comics");
      expect(grades).toContain("0.5");
      expect(grades).toContain("0.7");
      expect(grades).toContain("1.0");
      expect(grades).toContain("9.8");
      expect(grades).toContain("10.0");
      expect(grades).not.toContain("0.6");
    });

    it("should return PCGS Sheldon scale grades", () => {
      const grades = getValidGradesForCompany("PCGS");
      expect(grades).toContain("1");
      expect(grades).toContain("70");
      expect(grades).toContain("60");
      expect(grades).toContain("65");
      expect(grades).not.toContain("71");
    });

    it("should return empty array for invalid company", () => {
      const grades = getValidGradesForCompany("Fake Grader");
      expect(grades).toEqual([]);
    });
  });

  describe("Grade increment verification", () => {
    it("should have correct PSA increment (0.5 with restrictions)", () => {
      const psa = getGradingCompanyByName("PSA");
      expect(psa?.validGrades).toContain("1");
      expect(psa?.validGrades).toContain("1.5");
      expect(psa?.validGrades).toContain("2");
      expect(psa?.validGrades).toContain("9");
      expect(psa?.validGrades).toContain("10");
    });

    it("should have correct CGC Comics increment (0.2)", () => {
      const cgc = getGradingCompanyByName("CGC Comics");
      const grades = cgc?.validGrades || [];
      // Check for 0.2 increment pattern
      expect(grades).toContain("0.5");
      expect(grades).toContain("0.7");
      expect(grades).toContain("0.9");
      expect(grades).toContain("1.0");
      expect(grades).toContain("1.2");
    });

    it("should have correct AFA increment (5-point for vintage toys)", () => {
      const afa = getGradingCompanyByName("AFA");
      const grades = afa?.validGrades || [];
      expect(grades).toContain("10");
      expect(grades).toContain("20");
      expect(grades).toContain("30");
      expect(grades).toContain("85");
      expect(grades).toContain("90");
      expect(grades).toContain("100");
    });
  });

  describe("Category coverage", () => {
    it("should have grading companies for all major categories", () => {
      const categories = [
        "comics",
        "sports_cards",
        "coins",
        "pokemon",
        "video_games",
        "stamps",
        "autographs",
        "vintage_toys",
        "movies",
        "disney_pins",
      ];

      for (const category of categories) {
        const companies = getGradingCompaniesForCategory(category as any);
        expect(companies.length).toBeGreaterThan(0);
      }
    });
  });
});
