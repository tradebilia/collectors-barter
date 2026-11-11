import { describe, expect, it } from "vitest";
import { AUTOGRAPHS_SIGNED_ITEM_FIELDS, SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS } from "../client/src/lib/fieldDefinitionsGenerated";
import { autographMarketRelevanceScore } from "./testAiVisualSourceFilter";
import { buildVisualTargetMetadata } from "./testAiVisualSourceFilter";

describe("Authentication Company inventory options", () => {
  it("includes UDA for Autographs signed items", () => {
    const field = AUTOGRAPHS_SIGNED_ITEM_FIELDS.find(({ name }) => name === "authenticationCompany");

    expect(field?.label).toBe("Authentication Company");
    expect(field?.dropdownOptions).toContain("UDA");
  });

  it("includes Steiner for Autographs signed items", () => {
    const field = AUTOGRAPHS_SIGNED_ITEM_FIELDS.find(({ name }) => name === "authenticationCompany");

    expect(field?.dropdownOptions).toContain("Steiner");
  });

  it("parses Steiner from an Autographs listing title as the authentication company", () => {
    const target = buildVisualTargetMetadata({
      title: "Barry Bonds Autographed Baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: {
        signer: "Barry Bonds",
        signedItemType: "Baseball",
        autographCategory: "Sports",
        authenticationIncluded: "yes",
        authenticationCompany: "Steiner",
      },
    });
    const score = autographMarketRelevanceScore(
      { title: "Barry Bonds Autographed Baseball Steiner Sports Memorabilia Original Signed" },
      target,
    );

    expect(score.awards).toContainEqual(expect.objectContaining({ field: "authenticationCompany", source: "title", awardedPoints: 10 }));
  });

  it("does not add UDA to the separate sealed-product authentication list", () => {
    const field = SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS.find(({ name }) => name === "authenticationCompany");

    expect(field?.dropdownOptions).not.toContain("UDA");
  });
});
