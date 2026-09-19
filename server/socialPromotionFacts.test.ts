import { describe, expect, it } from "vitest";
import { getSocialPromotionFacts, SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE } from "../shared/socialPromotionFacts";

describe("item-type-specific high-value social facts", () => {
  it("covers every currently supported category and item-type combination", () => {
    expect(Object.keys(SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE)).toHaveLength(44);
    expect(SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE).toHaveProperty("sports_cards:unopened_product");
    expect(SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE).toHaveProperty("pokemon:unopened_product");
    expect(SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE).toHaveProperty("vintage_toys:lego");
    expect(SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE).toHaveProperty("music:vinyl_record");
  });

  it("uses Unopened Product fields for sports cards and never shows a grade", () => {
    const facts = getSocialPromotionFacts({
      category: "sports_cards",
      itemType: "unopened_product",
      itemDetails: {
        sport: "Hockey",
        year: "1987",
        manufacturer: "O-Pee-Chee",
        productName: "OPC Hockey Box",
        productFormat: "Box",
        factorySealed: "yes",
        isGraded: "no",
      },
      condition: "mint",
      certificationCompany: "PSA",
      grade: "0.00",
    });

    expect(facts).toEqual([
      { label: "Year", value: "1987" },
      { label: "Manufacturer", value: "O-Pee-Chee" },
      { label: "Product Format", value: "Box" },
      { label: "Factory Sealed", value: "yes" },
    ]);
    expect(facts.map((fact) => fact.label)).not.toContain("Grade");
    expect(facts.map((fact) => fact.value)).not.toContain("0.00");
  });

  it("uses the fixed graded-card facts only for an explicitly graded sports single card", () => {
    expect(getSocialPromotionFacts({
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: { isGraded: "yes", year: "1986", manufacturer: "Fleer", setName: "Fleer Basketball" },
      certificationCompany: "PSA",
      grade: "10",
    })).toEqual([
      { label: "Year", value: "1986" },
      { label: "Manufacturer", value: "Fleer" },
      { label: "Grading Company", value: "PSA" },
      { label: "Grade", value: "10" },
    ]);
  });

  it("uses the appropriate comic rule and omits condition when the comic is graded", () => {
    expect(getSocialPromotionFacts({
      category: "comics",
      itemType: "single_comic",
      itemDetails: { isGraded: "yes", comicTitle: "Amazing Fantasy", issueNumber: "15", publisher: "Marvel" },
      condition: "near_mint",
      certificationCompany: "CGC",
      grade: "9.6",
    })).toEqual([
      { label: "Title", value: "Amazing Fantasy" },
      { label: "Issue No.", value: "15" },
      { label: "Grading Company", value: "CGC" },
      { label: "Grade", value: "9.6" },
    ]);
  });

  it("uses product-specific fields for Pokemon unopened products", () => {
    expect(getSocialPromotionFacts({
      category: "pokemon",
      itemType: "unopened_product",
      itemDetails: { setName: "Base Set", productType: "Booster Box", releaseYear: "1999", factorySealed: "yes" },
    })).toEqual([
      { label: "Set Name", value: "Base Set" },
      { label: "Product Type", value: "Booster Box" },
      { label: "Year", value: "1999" },
      { label: "Factory Sealed", value: "yes" },
    ]);
  });
});
