import { describe, expect, it } from "vitest";
import { formatPublicGradeValue } from "../shared/publicGradeValues";

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
});
