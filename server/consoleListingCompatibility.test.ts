import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeListingGrade, normalizeListingGradeForStorage } from "./db";

describe("Video Games Console listing compatibility", () => {
  it("normalizes legacy numeric grades and ungraded values", () => {
    expect(normalizeListingGrade("80+")).toBe("80");
    expect(normalizeListingGrade("9.5")).toBe("9.5");
    expect(normalizeListingGrade("ungraded")).toBe("0");
    expect(normalizeListingGrade("raw")).toBe("0");
    expect(normalizeListingGrade("Gem Mint")).toBe("0");
  });

  it("stores the complete alphanumeric coin grade", () => {
    expect(normalizeListingGradeForStorage("MS65", "coins", "PCGS")).toBe("MS65");
    expect(normalizeListingGradeForStorage("MS65+", "coins", "PCGS")).toBe("MS65+");
    expect(normalizeListingGradeForStorage("85", "coins", "NGC")).toBe("85");
  });

  it("uses the requested Console controllers label without changing its stored key", () => {
    const source = readFileSync(new URL("../client/src/lib/fieldDefinitionsGenerated.ts", import.meta.url), "utf8");
    expect(source).toContain("name: 'controllersIncluded'");
    expect(source).toContain("label: 'Number of Controllers Included'");
    expect(source).not.toContain("label: 'Controllers Included'");
  });

  it("rejects display-only grade suffixes before submission with clear guidance", () => {
    const source = readFileSync(new URL("../client/src/hooks/useAddInventoryForm.ts", import.meta.url), "utf8");
    expect(source).toContain("const validGrade = allowsAlphanumericCoinGrade");
    expect(source).toContain("isAlphanumericCoinGrade(normalizedGrade)");
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
