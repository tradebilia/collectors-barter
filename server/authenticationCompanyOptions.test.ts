import { describe, expect, it } from "vitest";
import { AUTOGRAPHS_SIGNED_ITEM_FIELDS, SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS } from "../client/src/lib/fieldDefinitionsGenerated";

describe("Authentication Company inventory options", () => {
  it("includes UDA for Autographs signed items", () => {
    const field = AUTOGRAPHS_SIGNED_ITEM_FIELDS.find(({ name }) => name === "authenticationCompany");

    expect(field?.label).toBe("Authentication Company");
    expect(field?.dropdownOptions).toContain("UDA");
  });

  it("does not add UDA to the separate sealed-product authentication list", () => {
    const field = SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS.find(({ name }) => name === "authenticationCompany");

    expect(field?.dropdownOptions).not.toContain("UDA");
  });
});
