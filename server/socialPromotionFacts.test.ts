import { describe, expect, it } from "vitest";
import { getSocialPromotionFacts, SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE } from "../shared/socialPromotionFacts";

const APPROVED_DISPLAY_LABELS: Record<string, { standard: string[]; graded?: string[]; authenticated?: string[] }> = {
  "autographs:collection_lot": { standard: ["Number of Signed Items", "Condition", "Signers Included"] },
  "autographs:signed_item": { standard: ["Signer", "Signed Item Type", "Authentication", "Authentication Company"] },
  "coins:coin_set": { standard: ["Year", "Set Name", "Set Type", "Condition"] },
  "coins:collection_lot": { standard: ["Coin Count", "Condition", "Country"] },
  "coins:paper_money": { standard: ["Year", "Denomination", "Country", "Condition"], graded: ["Year", "Denomination", "Grading Company", "Grade"] },
  "coins:single_coin": { standard: ["Year", "Denomination", "Country", "Condition"], graded: ["Country", "Denomination", "Grading Company", "Grade"] },
  "comics:collection_lot": { standard: ["Number of Comics", "Publishers", "Major Titles", "Years"] },
  "comics:original_art": { standard: ["Artist Name", "Art Type", "Signed By Artist", "COA Included"] },
  "comics:single_comic": { standard: ["Title", "Issue No.", "Publisher", "Condition"], graded: ["Title", "Issue No.", "Grading Company", "Grade"] },
  "disney_pins:collection_lot": { standard: ["Pin Count", "Condition", "Characters", "Limited Editions"] },
  "disney_pins:single_pin": { standard: ["Pin Name", "Condition", "Limited Edition", "Series"] },
  "disney_pins:pin_set": { standard: ["Set Name", "Complete Set", "Limited Edition", "Condition"] },
  "movies:box_set": { standard: ["Box Set", "Format", "Graded", "Sealed"], graded: ["Box Set", "Format", "Grading Company", "Grade"] },
  "movies:collection_lot": { standard: ["Quantity", "Notable Titles", "Sealed Items", "Condition"] },
  "movies:individual_movie": { standard: ["Title", "Format", "Edition", "Graded"], graded: ["Title", "Format", "Grading Company", "Grade"] },
  "music:cassette_tape": { standard: ["Artist / Performer", "Album", "Release Year", "Record Label"], graded: ["Artist / Performer", "Album", "Grading Company", "Grade"] },
  "music:compact_disc": { standard: ["Artist / Performer", "Album", "Release Year", "Record Label"], graded: ["Artist / Performer", "Album", "Grading Company", "Grade"] },
  "music:eight_track_tape": { standard: ["Artist / Performer", "Album", "Release Year", "Record Label"], graded: ["Artist / Performer", "Album", "Grading Company", "Grade"] },
  "music:other_music_format": { standard: ["Artist / Performer", "Album", "Release Year", "Record Label"], graded: ["Artist / Performer", "Album", "Grading Company", "Grade"] },
  "music:vinyl_record": { standard: ["Artist / Performer", "Album", "Release Year", "Record Label"], graded: ["Artist / Performer", "Album", "Grading Company", "Grade"] },
  "pokemon:collection_lot": { standard: ["Card Count", "Eras / Series", "Notable Cards", "Condition"] },
  "pokemon:set": { standard: ["Year", "Set Name", "Complete", "Condition"] },
  "pokemon:single_card": { standard: ["Card Name", "Set Name", "Card No.", "Condition"], graded: ["Card Name", "Set Name", "Grading Company", "Grade"] },
  "pokemon:unopened_product": { standard: ["Year", "Set Name", "Product Type", "Factory Sealed"] },
  "sports_cards:card_set": { standard: ["Year", "Manufacturer", "Sport", "Set Name"] },
  "sports_cards:collection_lot": { standard: ["Card Count", "Years", "Manufacturers", "Notable Cards"] },
  "sports_cards:single_card": { standard: ["Year", "Manufacturer", "Card No", "Graded"], graded: ["Year", "Manufacturer", "Grading Company", "Grade"] },
  "sports_cards:unopened_product": {
    standard: ["Year", "Manufacturer", "Sport", "Product Type"],
    authenticated: ["Year", "Manufacturer", "Sport", "Authenticated Company"],
  },
  "stamps:collection_lot": { standard: ["Quantity", "Countries", "Years", "Condition"] },
  "stamps:single_stamp": { standard: ["Year", "Country", "Scott No.", "Condition"], graded: ["Year", "Country", "Grading Company", "Grade"] },
  "stamps:stamp_set": { standard: ["Year", "Country", "Set Name", "Condition"], graded: ["Year", "Country", "Grading Company", "Grade"] },
  "video_games:accessory": { standard: ["Platform", "Accessory Name", "Accessory Type", "Condition"], graded: ["Platform", "Accessory Name", "Grading Company", "Grade"] },
  "video_games:collection_lot": { standard: ["Item Count", "Platforms", "Notable Items", "Condition"] },
  "video_games:console": { standard: ["Console Name", "Original Box Included", "Working Condition", "Condition"], graded: ["Console Name", "Working Condition", "Grading Company", "Grade"] },
  "video_games:game": { standard: ["Platform", "Release Year", "Complete in Box", "Condition"], graded: ["Platform", "Release Year", "Grading Company", "Grade"] },
  "vintage_toys:action_figure": { standard: ["Toy Name / Character", "Brand", "Year", "Condition"], graded: ["Toy Name / Character", "Packaging Type", "Grading Company", "Grade"] },
  "vintage_toys:board_game": { standard: ["Game / Puzzle Name", "Publisher / Brand", "Complete", "Condition"], graded: ["Game / Puzzle Name", "Publisher / Brand", "Grading Company", "Grade"] },
  "vintage_toys:collection_lot": { standard: ["Item Count", "Brands Included", "Franchises", "Condition"], graded: ["Item Count", "Brands", "Grading Company", "Grade"] },
  "vintage_toys:electronic_toy": { standard: ["Toy Name", "Tested", "Working Condition", "Condition"], graded: ["Toy Name", "Tested", "Grading Company", "Grade"] },
  "vintage_toys:lego": { standard: ["Set No.", "Theme", "Piece Count", "Complete"], graded: ["Set No.", "Theme", "Grading Company", "Grade"] },
  "vintage_toys:model_kit": { standard: ["Model / Kit Name", "Built or Unbuilt", "Brand", "Condition"], graded: ["Model / Kit Name", "Brand", "Grading Company", "Grade"] },
  "vintage_toys:playset": { standard: ["Playset Name", "Brand", "Year", "Condition"], graded: ["Playset Name", "Brand", "Grading Company", "Grade"] },
  "vintage_toys:plush_toy": { standard: ["Toy Name/ Character", "Brand", "Year", "Condition"], graded: ["Toy Name / Character", "Brand", "Grading Company", "Grade"] },
  "vintage_toys:vehicle": { standard: ["Vehicle Name", "Brand", "Year", "Condition"], graded: ["Vehicle", "Brand", "Grading Company", "Grade"] },
};

describe("item-type-specific high-value social facts", () => {
  it("matches every item type and display order in the approved field workbook", () => {
    expect(Object.keys(SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE).sort()).toEqual(Object.keys(APPROVED_DISPLAY_LABELS).sort());

    for (const [itemType, expected] of Object.entries(APPROVED_DISPLAY_LABELS)) {
      const actual = SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE[itemType];
      expect(actual.facts.map((field) => field.label), `${itemType} standard display fields`).toEqual(expected.standard);
      expect(actual.gradedFacts?.map((field) => field.label), `${itemType} graded display fields`).toEqual(expected.graded);
      expect(actual.authenticatedFacts?.map((field) => field.label), `${itemType} authenticated display fields`).toEqual(expected.authenticated);
    }
  });

  it("uses the approved standard Sports Cards Unopened Product fields when not authenticated", () => {
    const facts = getSocialPromotionFacts({
      category: "sports_cards",
      itemType: "unopened_product",
      itemDetails: {
        sport: "Hockey",
        year: "1987",
        manufacturer: "O-Pee-Chee",
        productType: "Hobby Box",
        productFormat: "Box",
        factorySealed: "yes",
        authenticated: "no",
        isGraded: "no",
      },
      condition: "mint",
      certificationCompany: "PSA",
      grade: "0.00",
    });

    expect(facts).toEqual([
      { label: "Year", value: "1987" },
      { label: "Manufacturer", value: "O-Pee-Chee" },
      { label: "Sport", value: "Hockey" },
      { label: "Product Type", value: "Hobby Box" },
    ]);
    expect(facts.map((fact) => fact.label)).not.toContain("Grade");
    expect(facts.map((fact) => fact.value)).not.toContain("0.00");
  });

  it("replaces Product Type with Authenticated Company for authenticated unopened Sports Cards", () => {
    expect(getSocialPromotionFacts({
      category: "sports_cards",
      itemType: "unopened_product",
      itemDetails: {
        year: "1986",
        manufacturer: "O-Pee-Chee",
        sport: "Hockey",
        productType: "Hobby",
        authenticated: "yes",
        authenticationCompany: "BBCE",
      },
    })).toEqual([
      { label: "Year", value: "1986" },
      { label: "Manufacturer", value: "O-Pee-Chee" },
      { label: "Sport", value: "Hockey" },
      { label: "Authenticated Company", value: "BBCE" },
    ]);
  });

  it("displays Graded as Yes or No whenever the approved standard rule includes it", () => {
    expect(getSocialPromotionFacts({
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: { isGraded: "no", year: "1986", manufacturer: "Fleer", cardNumber: "57" },
    })).toEqual([
      { label: "Year", value: "1986" },
      { label: "Manufacturer", value: "Fleer" },
      { label: "Card No", value: "57" },
      { label: "Graded", value: "No" },
    ]);
  });

  it("title-cases every public yes/no fact value without changing ordinary text", () => {
    expect(getSocialPromotionFacts({
      category: "comics",
      itemType: "original_art",
      itemDetails: {
        artistName: "Todd McFarlane",
        artType: "Cover Art",
        signedByArtist: "yes",
        coaIncluded: "TRUE",
      },
    })).toEqual([
      { label: "Artist Name", value: "Todd McFarlane" },
      { label: "Art Type", value: "Cover Art" },
      { label: "Signed By Artist", value: "Yes" },
      { label: "COA Included", value: "Yes" },
    ]);

    expect(getSocialPromotionFacts({
      category: "pokemon",
      itemType: "unopened_product",
      itemDetails: { releaseYear: "1999", setName: "Base Set", productType: "Booster Box", factorySealed: "no" },
    }).at(-1)).toEqual({ label: "Factory Sealed", value: "No" });
  });

  it("uses polished capitalization for categorical fact values without changing item names", () => {
    expect(getSocialPromotionFacts({
      category: "video_games",
      itemType: "accessory",
      itemDetails: {
        platform: "NES",
        accessoryName: "Power Set",
        accessoryType: "Power Set",
      },
      condition: "excellent",
    })).toEqual([
      { label: "Platform", value: "NES" },
      { label: "Accessory Name", value: "Power Set" },
      { label: "Accessory Type", value: "Power Set" },
      { label: "Condition", value: "Excellent" },
    ]);
  });

  it("uses the approved grading-specific set only for an explicitly graded item", () => {
    expect(getSocialPromotionFacts({
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: { isGraded: "yes", year: "1986", manufacturer: "Fleer", cardNumber: "57" },
      certificationCompany: "PSA",
      grade: "10",
    })).toEqual([
      { label: "Year", value: "1986" },
      { label: "Manufacturer", value: "Fleer" },
      { label: "Grading Company", value: "PSA" },
      { label: "Grade", value: "10" },
    ]);
  });

  it("uses the approved comics and Pokemon rules, including graded comic suppression of condition", () => {
    expect(getSocialPromotionFacts({
      category: "comics",
      itemType: "single_comic",
      itemDetails: { isGraded: "yes", comicTitle: "Amazing Fantasy", issueNumber: "15", publisher: "Marvel" },
      condition: "near_mint",
      certificationCompany: "CGC",
      grade: "9.80",
    })).toEqual([
      { label: "Title", value: "Amazing Fantasy" },
      { label: "Issue No.", value: "15" },
      { label: "Grading Company", value: "CGC" },
      { label: "Grade", value: "9.8" },
    ]);

    expect(getSocialPromotionFacts({
      category: "pokemon",
      itemType: "unopened_product",
      itemDetails: { setName: "Base Set", productType: "Booster Box", releaseYear: "1999", factorySealed: "yes" },
    })).toEqual([
      { label: "Year", value: "1999" },
      { label: "Set Name", value: "Base Set" },
      { label: "Product Type", value: "Booster Box" },
      { label: "Factory Sealed", value: "Yes" },
    ]);
  });
});
