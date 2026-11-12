import { describe, expect, it } from "vitest";
import { findMaterialMetadataConflicts } from "../shared/testAiMetadataConflict";
import { buildVisualTargetMetadata } from "./testAiVisualSourceFilter";

describe("shared metadata conflict comparison", () => {
  it("treats UDA and Upper Deck as the same Autographs authentication company", () => {
    const autographTarget = buildVisualTargetMetadata({
      title: "Michael Jordan Autograph Signed Official Wilson Basketball UDA",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Michael Jordan", signedItemType: "Basketball", authenticationIncluded: "Yes", authenticationCompany: "UDA" },
    });
    const conflicts = findMaterialMetadataConflicts(autographTarget, {
      title: "Michael Jordan Autograph Signed Official Wilson Basketball Upper Deck",
      itemDetails: JSON.stringify({ authenticationCompany: "Upper Deck" }),
    });
    expect(conflicts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "authenticationCompany" }),
    ]));
  });

  it("still flags a genuinely different Autographs authentication company", () => {
    const autographTarget = buildVisualTargetMetadata({
      title: "Michael Jordan Autograph Signed Official Wilson Basketball UDA",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Michael Jordan", signedItemType: "Basketball", authenticationIncluded: "Yes", authenticationCompany: "UDA" },
    });
    const conflicts = findMaterialMetadataConflicts(autographTarget, {
      title: "Michael Jordan Autograph Signed Official Wilson Basketball PSA",
      itemDetails: JSON.stringify({ authenticationCompany: "PSA" }),
    });
    expect(conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "authenticationCompany", targetValue: "UDA", candidateValue: "PSA" }),
    ]));
  });

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

  it("does not treat a marketplace title echoed into brand as explicit brand metadata", () => {
    const vintageToyTarget = buildVisualTargetMetadata({
      title: "1998 Donkey Kong Nintendo AFA 7.5",
      category: "vintage_toys",
      itemType: "plush_stuffed_toy",
      fullItemDetails: { brand: "Other", customBrand: "Nintendo", toyName: "Donkey Kong" },
    });
    const candidateTitle = 'Nintendo Collectibles Talking Plush Character Donkey Kong 15" 1998 Graded AFA';
    const conflicts = findMaterialMetadataConflicts(vintageToyTarget, {
      title: candidateTitle,
      brand: candidateTitle,
    });

    expect(conflicts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "brand", candidateValue: candidateTitle }),
    ]));
  });

  it("still flags a genuinely different structured brand", () => {
    const vintageToyTarget = buildVisualTargetMetadata({
      title: "1998 Donkey Kong Nintendo AFA 7.5",
      category: "vintage_toys",
      itemType: "plush_stuffed_toy",
      fullItemDetails: { brand: "Other", customBrand: "Nintendo", toyName: "Donkey Kong" },
    });
    const conflicts = findMaterialMetadataConflicts(vintageToyTarget, {
      title: "Nintendo Collectibles Talking Plush Character Donkey Kong",
      brand: "Hasbro",
    });

    expect(conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "brand", candidateValue: "Hasbro" }),
    ]));
  });

  it("uses a candidate custom Brand when the provider stores Brand as Other", () => {
    const vintageToyTarget = buildVisualTargetMetadata({
      title: "Donkey Kong Nintendo plush",
      category: "vintage_toys",
      itemType: "plush_stuffed_toy",
      fullItemDetails: { brand: "Nintendo", toyName: "Donkey Kong" },
    });
    const conflicts = findMaterialMetadataConflicts(vintageToyTarget, {
      title: "Donkey Kong plush",
      brand: "Other",
      itemDetails: JSON.stringify({ brand: "Other", customBrand: "Nintendo", toyName: "Donkey Kong" }),
    });

    expect(conflicts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "brand" }),
    ]));
  });

  it("applies the same candidate custom-field fallback to another category field", () => {
    const sportsCardTarget = buildVisualTargetMetadata({
      title: "1989 Example Player Pinnacle card",
      category: "sports_cards",
      itemType: "single_card",
      fullItemDetails: { manufacturer: "Pinnacle", player: "Example Player", year: "1989", cardNumber: "1" },
    });
    const conflicts = findMaterialMetadataConflicts(sportsCardTarget, {
      title: "1989 Example Player card",
      itemDetails: JSON.stringify({ manufacturer: "Other", customManufacturer: "Pinnacle", player: "Example Player", year: "1989", cardNumber: "1" }),
    });

    expect(conflicts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "manufacturer" }),
    ]));
  });
});
