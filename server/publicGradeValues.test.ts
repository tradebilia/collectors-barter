import { describe, expect, it } from "vitest";
import {
  formatPublicGradeValue,
  hasPublicGradeValue,
  normalizeNumericGrade,
  normalizePcgsCoinGrade,
  numericGradesEquivalent,
  recoverCoinGradeFromTitle,
  recoverPcgsCoinGradeFromTitle,
  resolvePublicGradeValue,
} from "../shared/publicGradeValues";

describe("public grade formatting", () => {
  it("normalizes equivalent numeric grades across marketplace formats", () => {
    expect(normalizeNumericGrade("9.60")).toBe("9.6");
    expect(numericGradesEquivalent("9", "9.0")).toBe(true);
    expect(numericGradesEquivalent("9.6", "9.4")).toBe(false);
    expect(numericGradesEquivalent("MS65", "65")).toBe(false);
  });

  it("uses a maximum of one decimal place without changing the stored value", () => {
    expect(formatPublicGradeValue("9.80")).toBe("9.8");
    expect(formatPublicGradeValue(9.85)).toBe("9.9");
    expect(formatPublicGradeValue("10.0")).toBe("10");
  });

  it("preserves nonnumeric grades and suppresses ungraded or zero values", () => {
    expect(formatPublicGradeValue("AFA 85")).toBe("AFA 85");
    expect(formatPublicGradeValue("ungraded")).toBe("");
    expect(formatPublicGradeValue("0.00")).toBe("");
  });

  it("adds a separator to compact PCGS-style labels without changing stored values", () => {
    expect(formatPublicGradeValue("MS65")).toBe("MS-65");
    expect(formatPublicGradeValue("MS65+")).toBe("MS-65+");
    expect(formatPublicGradeValue("MS-65")).toBe("MS-65");
  });

  it("recognizes alphanumeric coin grades as grades instead of conditions", () => {
    expect(hasPublicGradeValue("MS69")).toBe(true);
    expect(hasPublicGradeValue("AU58")).toBe(true);
    expect(hasPublicGradeValue("ungraded")).toBe(false);
    expect(hasPublicGradeValue("raw")).toBe(false);
    expect(hasPublicGradeValue("0")).toBe(false);
  });

  it("recovers a missing coin grade from a recognizable title label", () => {
    expect(recoverCoinGradeFromTitle("2026 American Eagle S$1 MS69", "coins")).toBe("MS69");
    expect(resolvePublicGradeValue(null, "2015-W American Silver Eagle PCGS PR70", "coins")).toBe("PR70");
    expect(resolvePublicGradeValue(null, "Raw 2026 American Eagle", "coins")).toBeNull();
  });

  it("preserves valid PCGS coin labels for storage and recovers legacy title labels", () => {
    expect(normalizePcgsCoinGrade("MS65")).toBe("MS65");
    expect(normalizePcgsCoinGrade("MS 65+")).toBe("MS65+");
    expect(normalizePcgsCoinGrade("AFA 85")).toBeNull();
    expect(recoverPcgsCoinGradeFromTitle("1945-S Walking Liberty PCGS MS65", "coins", "PCGS")).toBe("MS65");
    expect(recoverPcgsCoinGradeFromTitle("1945-S Walking Liberty PCGS MS65", "coins", "NGC")).toBeNull();
  });
});
