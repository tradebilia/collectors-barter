import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatPublicFieldValue } from "../shared/publicFieldValues";

describe("public categorical field formatting", () => {
  it("uses polished display labels for supported categorical values without changing free-form text", () => {
    expect(formatPublicFieldValue("excellent")).toBe("Excellent");
    expect(formatPublicFieldValue("near_mint")).toBe("Near Mint");
    expect(formatPublicFieldValue("very good")).toBe("Very Good");
    expect(formatPublicFieldValue("not working")).toBe("Not Working");
    expect(formatPublicFieldValue("yes")).toBe("Yes");
    expect(formatPublicFieldValue("O-Pee-Chee")).toBe("O-Pee-Chee");
    expect(formatPublicFieldValue("Todd McFarlane")).toBe("Todd McFarlane");
    expect(formatPublicFieldValue("Power Set")).toBe("Power Set");
  });

  it("uses the shared categorical formatter for all public item-detail fields", () => {
    const source = readFileSync(new URL("../client/src/pages/ItemDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain('import { formatPublicFieldValue } from "@shared/publicFieldValues"');
    expect(source).toContain("value: formatPublicFieldValue(String(value))");
    expect(source).toContain("formatPublicFieldValue(listing.condition)");
  });
});
