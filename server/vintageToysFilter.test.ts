import { describe, expect, it } from "vitest";
import {
  applyDeclaredIdentityFilter,
  buildDeclaredIdentityReviews,
  buildVisualTargetMetadata,
  vintageToyVisualCap,
  vintageToyVisualScore,
} from "./testAiVisualSourceFilter";

describe("Vintage Toys item-type filters", () => {
  const cases = [
    {
      itemType: "action_figure___doll",
      target: { toyNameCharacter: "Star Wars Luke Skywalker", brand: "Kenner", franchise: "Star Wars", year: 1978, packagingType: "carded", complete: "Yes", accessoriesIncluded: "Yes" },
      candidate: { itemType: "action_figure___doll", toyNameCharacter: "Star Wars Luke Skywalker", brand: "Kenner", title: "Star Wars Luke Skywalker Kenner 1978 carded" },
      mismatch: { itemType: "action_figure___doll", toyNameCharacter: "Star Wars Darth Vader", brand: "Kenner", title: "Star Wars Darth Vader Kenner 1978 carded" },
    },
    {
      itemType: "board_game___puzzle",
      target: { gamePuzzleName: "Monopoly", publisherBrand: "Parker Brothers", year: 1965, complete: "Yes" },
      candidate: { itemType: "board_game___puzzle", gamePuzzleName: "Monopoly", publisherBrand: "Parker Brothers", title: "1965 Parker Brothers Monopoly complete" },
      mismatch: { itemType: "board_game___puzzle", gamePuzzleName: "Risk", publisherBrand: "Parker Brothers", title: "1965 Parker Brothers Risk complete" },
    },
    {
      itemType: "electronic_toy",
      target: { toyName: "Speak & Spell", brand: "Texas Instruments", year: 1978, tested: "Yes", workingCondition: "Working" },
      candidate: { itemType: "electronic_toy", toyName: "Speak & Spell", brand: "Texas Instruments", tested: "yes", workingCondition: "Working", title: "Texas Instruments Speak & Spell working" },
      mismatch: { itemType: "electronic_toy", toyName: "Speak & Read", brand: "Texas Instruments", tested: "yes", workingCondition: "Working", title: "Texas Instruments Speak & Read working" },
    },
    {
      itemType: "lego",
      target: { setNumber: "6285", theme: "Pirates", releaseYear: 1989, complete: "Yes" },
      candidate: { itemType: "lego", setNumber: "6285", theme: "Pirates", title: "LEGO 6285 Pirates complete" },
      mismatch: { itemType: "lego", setNumber: "6277", theme: "Pirates", title: "LEGO 6277 Pirates complete" },
    },
    {
      itemType: "model___kit",
      target: { modelKitName: "P-51 Mustang", brand: "Monogram", scale: "1:48", builtOrUnbuilt: "Unbuilt" },
      candidate: { itemType: "model___kit", modelKitName: "P-51 Mustang", brand: "Monogram", scale: "1:48", title: "Monogram P-51 Mustang 1:48 unbuilt kit" },
      mismatch: { itemType: "model___kit", modelKitName: "Spitfire", brand: "Monogram", scale: "1:48", title: "Monogram Spitfire 1:48 unbuilt kit" },
    },
    {
      itemType: "playset",
      target: { playsetName: "Ewok Village", brand: "Kenner", franchise: "Star Wars", year: 1983, complete: "Yes" },
      candidate: { itemType: "playset", playsetName: "Ewok Village", brand: "Kenner", franchise: "Star Wars", title: "Kenner Star Wars Ewok Village complete" },
      mismatch: { itemType: "playset", playsetName: "Death Star", brand: "Kenner", franchise: "Star Wars", title: "Kenner Star Wars Death Star complete" },
    },
    {
      itemType: "plush___stuffed_toy",
      target: { toyNameCharacter: "Mickey Mouse", brand: "Steiff", year: 1932, tagsAttached: "Yes" },
      candidate: { itemType: "plush___stuffed_toy", toyNameCharacter: "Mickey Mouse", brand: "Steiff", tagsAttached: "yes", title: "Steiff Mickey Mouse with tags" },
      mismatch: { itemType: "plush___stuffed_toy", toyNameCharacter: "Donald Duck", brand: "Steiff", tagsAttached: "yes", title: "Steiff Donald Duck with tags" },
    },
    {
      itemType: "vehicle",
      target: { vehicleName: "Batmobile", brand: "Corgi", franchise: "Batman", year: 1966, vehicleType: "die-cast" },
      candidate: { itemType: "vehicle", vehicleName: "Batmobile", brand: "Corgi", franchise: "Batman", title: "Corgi Batman Batmobile die-cast" },
      mismatch: { itemType: "vehicle", vehicleName: "Batboat", brand: "Corgi", franchise: "Batman", title: "Corgi Batman Batboat die-cast" },
    },
  ] as const;

  it.each(cases)("keeps matching $itemType candidates and holds identity mismatches", ({ itemType, target, candidate, mismatch }) => {
    const targetMetadata = buildVisualTargetMetadata({
      title: String(target.toyNameCharacter ?? target.gamePuzzleName ?? target.toyName ?? target.setNumber ?? target.modelKitName ?? target.playsetName ?? target.vehicleName),
      category: "vintage_toys",
      itemType,
      ...target,
    });
    expect(buildDeclaredIdentityReviews([candidate], targetMetadata)).toHaveLength(0);
    const reviews = buildDeclaredIdentityReviews([mismatch], targetMetadata);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.rationale).toMatch(/Vintage Toys/);
  });

  it("does not apply a Vintage Toys item-type filter to Collection/Lot", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Vintage Toy Collection",
      category: "vintage_toys",
      itemType: "collection_lot",
      approximateItemCount: 20,
    });
    const candidate = { itemType: "action_figure___doll", title: "Star Wars action figure" };
    expect(buildDeclaredIdentityReviews([candidate], targetMetadata)).toHaveLength(0);
  });

  it("leaves missing candidate metadata eligible instead of guessing a mismatch", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "LEGO 6285 Pirates",
      category: "vintage_toys",
      itemType: "lego",
      setNumber: "6285",
      theme: "Pirates",
    });
    expect(applyDeclaredIdentityFilter([{ title: "Vintage building set", itemType: "lego" }], targetMetadata).listings).toHaveLength(1);
  });

  it.each([
    ["action_figure___doll", { toyNameCharacter: "Star Wars Luke Skywalker", brand: "Kenner", franchise: "Star Wars", year: 1978, packagingType: "carded", complete: "Yes", accessoriesIncluded: "Yes" }],
    ["board_game___puzzle", { gamePuzzleName: "Monopoly", publisherBrand: "Parker Brothers", year: 1965, complete: "Yes", numberOfPieces: 100, instructionsIncluded: "Yes", boxIncluded: "Yes" }],
    ["electronic_toy", { toyName: "Speak & Spell", brand: "Texas Instruments", year: 1978, tested: "Yes", workingCondition: "Working", batteryCompartmentCondition: "Clean" }],
    ["lego", { setNumber: "6285", theme: "Pirates", complete: "Yes", packagingType: "Boxed", releaseYear: 1989, pieceCount: 592, minifiguresIncluded: "Yes", retiredStatus: "Retired" }],
    ["model___kit", { modelKitName: "P-51 Mustang", brand: "Monogram", scale: "1:48", builtOrUnbuilt: "Unbuilt", complete: "Yes", instructionsIncluded: "Yes", year: 1980 }],
    ["playset", { playsetName: "Ewok Village", brand: "Kenner", franchise: "Star Wars", year: 1983, complete: "Yes", missingPieces: "No", originalBoxIncluded: "Yes" }],
    ["plush___stuffed_toy", { toyNameCharacter: "Mickey Mouse", brand: "Steiff", franchise: "Disney", year: 1932, tagsAttached: "Yes" }],
    ["vehicle", { vehicleName: "Batmobile", brand: "Corgi", franchise: "Batman", year: 1966, vehicleType: "die-cast", packagingType: "boxed", workingFeatures: "Yes" }],
  ] as const)("scores a strong $0 candidate for $1", (itemType, details) => {
    const title = String(Object.values(details)[0]);
    const targetMetadata = buildVisualTargetMetadata({ title, category: "vintage_toys", itemType, fullItemDetails: details });
    const score = vintageToyVisualScore({ title, itemType, imageUrl: "https://example.com/toy.jpg", itemDetails: JSON.stringify(details) }, targetMetadata);
    expect(score.score).toBeGreaterThanOrEqual(60);
    expect(score.matched.length).toBeGreaterThan(0);
    expect(vintageToyVisualCap(score.score)).toBeGreaterThan(0);
  });

  it("uses the approved score bands for Vintage Toys visual caps", () => {
    expect(vintageToyVisualCap(95)).toBe(8);
    expect(vintageToyVisualCap(85)).toBe(6);
    expect(vintageToyVisualCap(75)).toBe(4);
    expect(vintageToyVisualCap(65)).toBe(2);
    expect(vintageToyVisualCap(59)).toBe(0);
  });

  it("does not score or cap Collection/Lot targets", () => {
    const targetMetadata = buildVisualTargetMetadata({ title: "Vintage Toy Collection", category: "vintage_toys", itemType: "collection_lot" });
    const score = vintageToyVisualScore({ title: "Vintage Toy Collection Lot", imageUrl: "https://example.com/lot.jpg" }, targetMetadata);
    expect(score.score).toBe(0);
    expect(vintageToyVisualCap(score.score)).toBe(0);
  });
});
