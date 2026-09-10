import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeListingGrade } from "./db";

describe("Video Games Console listing compatibility", () => {
  it("normalizes display-only grade suffixes before decimal persistence", () => {
    expect(normalizeListingGrade("80+")).toBe("80");
    expect(normalizeListingGrade("9.5")).toBe("9.5");
    expect(normalizeListingGrade("ungraded")).toBe("0");
    expect(normalizeListingGrade("raw")).toBe("0");
    expect(normalizeListingGrade("Gem Mint")).toBe("0");
  });

  it("rejects display-only grade suffixes before submission with clear guidance", () => {
    const source = readFileSync(new URL("../client/src/hooks/useAddInventoryForm.ts", import.meta.url), "utf8");
    expect(source).toContain("!/^\\d+(?:\\.\\d+)?$/.test(String(value).trim())");
    expect(source).toContain("do not include + or other symbols");
  });

  it("keeps numeric form values as raw strings while typing multiple characters", () => {
    const source = readFileSync(new URL("../client/src/components/DynamicFieldRenderer.tsx", import.meta.url), "utf8");
    expect(source).toContain('inputMode="numeric"');
    expect(source).toContain("value={value ?? ''}");
    expect(source).toContain("onChange={(e) => onChange(e.target.value)}");
    expect(source).not.toContain("onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}");
  });
});
