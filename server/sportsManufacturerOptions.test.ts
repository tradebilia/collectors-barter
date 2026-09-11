import { describe, expect, it } from "vitest";
import {
  SPORTS_CARDS_SET_FIELDS,
  SPORTS_CARDS_SINGLE_CARD_FIELDS,
  SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS,
  SPORTS_CARDS_COLLECTION_LOT_FIELDS,
} from "../client/src/lib/fieldDefinitionsGenerated";

type Field = { name: string; inputType: string; dropdownOptions?: string[] };

function manufacturerField(fields: Field[]) {
  return fields.find((field) => field.name === "manufacturer");
}

describe("Sports Manufacturer options", () => {
  it("includes O-Pee-Chee in every Sports Manufacturer dropdown", () => {
    const sportsTypes = [
      SPORTS_CARDS_SET_FIELDS,
      SPORTS_CARDS_SINGLE_CARD_FIELDS,
      SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS,
    ];

    for (const fields of sportsTypes) {
      const manufacturer = manufacturerField(fields);
      expect(manufacturer?.inputType).toBe("dropdown");
      expect(manufacturer?.dropdownOptions).toContain("O-Pee-Chee");
    }
  });

  it("preserves the collection/lot Manufacturers Included field mapping", () => {
    const collectionField = SPORTS_CARDS_COLLECTION_LOT_FIELDS.find(
      (field) => field.name === "manufacturersIncluded",
    );
    expect(collectionField?.inputType).toBe("textarea");
    expect(collectionField?.label).toBe("Manufacturers Included");
  });
});
