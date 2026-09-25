import { describe, expect, it } from "vitest";
import {
  formatPublicGradeValue,
  normalizePcgsCoinGrade,
  recoverPcgsCoinGradeFromTitle,
} from "../shared/publicGradeValues";

describe("public grade formatting", () => {
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

  it("preserves valid PCGS coin labels for storage and recovers legacy title labels", () => {
    expect(normalizePcgsCoinGrade("MS65")).toBe("MS65");
    expect(normalizePcgsCoinGrade("MS 65+")).toBe("MS65+");
    expect(normalizePcgsCoinGrade("AFA 85")).toBeNull();
    expect(recoverPcgsCoinGradeFromTitle("1945-S Walking Liberty PCGS MS65", "coins", "PCGS")).toBe("MS65");
    expect(recoverPcgsCoinGradeFromTitle("1945-S Walking Liberty PCGS MS65", "coins", "NGC")).toBeNull();
  });
});
