import { describe, expect, it } from "vitest";
import { findMaterialMetadataConflicts } from "../shared/testAiMetadataConflict";
import { buildVisualTargetMetadata } from "./testAiVisualSourceFilter";

describe("shared metadata conflict comparison", () => {
  const target = buildVisualTargetMetadata({
    title: "1903-S Morgan Silver Dollar PCGS MS63",
    category: "coins",
    itemType: "single_coin",
    grade: "MS63",
    certificationCompany: "PCGS",
    fullItemDetails: {
      country: "United States",
      year: "1903",
      denomination: "1 Dollar",
      mintMark: "S",
      variety: "Morgan",
    },
  });

  it("does not conflict when structured country metadata matches even if the title omits the country", () => {
    const conflicts = findMaterialMetadataConflicts(target, {
      title: "1903-S Morgan Silver Dollar PCGS MS63",
      itemDetails: JSON.stringify({
        country: "United States",
        year: "1903",
        denomination: "1 Dollar",
        mintMark: "S",
        variety: "Morgan",
      }),
    });

    expect(conflicts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "country" }),
    ]));
  });

  it("still flags a different explicitly structured country", () => {
    const conflicts = findMaterialMetadataConflicts(target, {
      title: "1903-S Morgan Silver Dollar PCGS MS63",
      itemDetails: JSON.stringify({ country: "Canada" }),
    });

    expect(conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "country", targetValue: "United States", candidateValue: "Canada" }),
    ]));
  });
});
