import { describe, expect, it, vi } from "vitest";

// This suite is authored for the parent's isolated harness, not unrestricted execution.
// Import the actual scorers; the only live-capable dependency is replaced before import.
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(() => { throw new Error("LLM forbidden in scorer tests"); }) }));
import { invokeLLM } from "./_core/llm";
import {
  annotatePreVisualComparableScores, autographMarketRelevanceScore, buildVisualTargetMetadata,
  buildMetadataFieldComparisons, withMetadataFieldComparisons,
  coinsSetVisualScore, coinsSingleVisualScore, comicsSingleVisualScore,
  disneyPinsIndividualVisualScore, disneyPinsSetVisualScore, filterVisualSourceCandidates,
  moviesBoxSetVisualScore, moviesIndividualVisualScore, musicVisualScore,
  originalArtMarketRelevanceScore, paperMoneyVisualScore, pokemonVisualScore,
  sportsCardSetVisualScore, sportsCardSingleVisualScore, sportsCardUnopenedVisualScore,
  stampsSetVisualScore, stampsSingleVisualScore, universalMetadataScore,
  videoGameAccessoryVisualScore, videoGameConsoleVisualScore, videoGameGameVisualScore,
  videoGameVisualCap, vintageToyVisualScore,
  type VisualSourceCandidate,
} from "./testAiVisualSourceFilter";
import {
  rankingAwardContribution, rankingAwardFieldKey, rankingAwardsForField,
  type MetadataScoreResult, type RankingAward,
} from "../shared/testAiRankingAwards";

type Scorer = (listing: VisualSourceCandidate, target: string) => MetadataScoreResult;
type Fixture = {
  name: string; category: string; itemType: string; title: string;
  details: Record<string, unknown>; scorer: Scorer; weights: Record<string, number>;
  grade?: string; grader?: string; isGraded?: string;
  candidateTitle?: string; expected?: number;
};
const fixtureTarget = (fixture: Fixture) => buildVisualTargetMetadata({
  title: fixture.title, category: fixture.category, itemType: fixture.itemType,
  fullItemDetails: fixture.details, grade: fixture.grade, certificationCompany: fixture.grader,
  isGraded: fixture.isGraded,
});
const fixtureCandidate = (fixture: Fixture): VisualSourceCandidate => ({
  title: fixture.candidateTitle ?? fixture.title,
  itemDetails: JSON.stringify(fixture.details),
  ...(fixture.grade ? { grade: fixture.grade } : {}),
  ...(fixture.grader ? { gradingCompany: fixture.grader } : {}),
  ...(fixture.isGraded ? { isGraded: fixture.isGraded } : {}),
});
function expectAccounting(result: MetadataScoreResult, weights?: Record<string, number>) {
  expect(result.awards.reduce((total, award) => total + award.awardedPoints, 0)).toBe(result.score);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
  expect(new Set(result.awards.map((award) => award.field)).size).toBe(result.awards.length);
  for (const award of result.awards) {
    expect(award.awardedPoints).toBeGreaterThan(0);
    expect(["structured", "title", "mixed", "combined", "rule"]).toContain(award.source);
    const identifier = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    expect(result.matched.some((label) => identifier(label) === identifier(award.field)
      || award.field === "titleOverlap" && label.startsWith("title overlap (")
      || award.field === "gradingCompany" && label.startsWith("grading company")
      || award.field === "grade" && label.startsWith("grade ("))).toBe(true);
    expect(result.unknown ?? []).not.toContain(award.field);
    if (weights) expect(award.awardedPoints).toBe(weights[award.field]);
  }
}
const fixture = (value: Fixture) => value;
const fixtures: Fixture[] = [
  fixture({ name: "Sports single", category: "sports_cards", itemType: "single_card", scorer: sportsCardSingleVisualScore,
    title: "1989 Upper Deck Ken Griffey Jr #1 Rookie Autograph Relic Serial 1/10 PSA 10", grade: "10", grader: "PSA",
    details: { player: "Ken Griffey Jr", year: "1989", manufacturer: "Upper Deck", setName: "Upper Deck", cardNumber: "1", rookieStatus: "Yes", autographStatus: "Yes", relicStatus: "Yes", serialNumberedStatus: "Yes" },
    weights: { player: 20, year: 15, manufacturerOrSet: 15, cardNumber: 15, gradingCompany: 10, grade: 10, singleCardForm: 5, rookieStatus: 3, autographStatus: 3, relicStatus: 2, serialNumberedStatus: 2 } }),
  fixture({ name: "Sports set", category: "sports_cards", itemType: "set", scorer: sportsCardSetVisualScore,
    title: "1986 Fleer Football Complete Factory Sealed Set",
    details: { setName: "Fleer", year: "1986", manufacturer: "Fleer", setType: "factory_set", missingCards: "No", factorySealed: "Yes", sport: "Football" },
    weights: { setName: 25, year: 15, manufacturer: 15, setType: 15, missingCards: 15, factorySealed: 10, sport: 5 } }),
  fixture({ name: "Sports unopened", category: "sports_cards", itemType: "unopened_product", scorer: sportsCardUnopenedVisualScore,
    title: "1989 Topps BBCE FASC Hobby Box Factory Sealed",
    details: { productName: "Topps", productFormat: "Box", productType: "Hobby", manufacturer: "Topps", year: "1989", authenticationCompany: "BBCE", factorySealed: "Yes", fromASealedCase: "Yes" },
    weights: { productName: 20, productFormat: 20, productType: 15, manufacturerOrSet: 15, year: 10, authenticationCompany: 10, factorySealed: 5, fromASealedCase: 5 } }),
  fixture({ name: "Pokémon single", category: "pokemon", itemType: "single_card", scorer: pokemonVisualScore,
    title: "Charizard Base Set #4/102 English Holo Regular Holo Rare Wizards PSA 10", grade: "10", grader: "PSA",
    details: { cardName: "Charizard", setName: "Base Set", cardNumber: "4/102", language: "English", finish: "Holo", cardType: "Regular", rarity: "Holo Rare", editionEra: "Wizards" },
    weights: { cardName: 20, setName: 15, cardNumber: 15, language: 10, finish: 10, cardType: 10, rarity: 5, editionEra: 5, gradingCompany: 5, grade: 5 } }),
  fixture({ name: "Pokémon set", category: "pokemon", itemType: "set", scorer: pokemonVisualScore,
    title: "1999 Pokémon Base Set English Complete Set 102 Cards Boxed PSA 10", grade: "10", grader: "PSA",
    details: { setName: "Base Set", language: "English", setType: "Complete Set", numberOfCardsInSet: "102", year: "1999", packaging: "Boxed" },
    weights: { setName: 30, language: 15, setType: 20, cardCount: 15, year: 5, packaging: 5, gradingCompany: 5, grade: 5 } }),
  fixture({ name: "Pokémon unopened", category: "pokemon", itemType: "unopened_product", scorer: pokemonVisualScore,
    title: "1999 Pokémon Base Set English Booster Box Factory Sealed BBCE FASC PSA 10", grade: "10", grader: "PSA",
    details: { productName: "Booster Box", setName: "Base Set", productType: "Booster Box", language: "English", releaseYear: "1999", factorySealed: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" },
    weights: { productName: 15, setName: 15, productType: 20, language: 10, year: 10, factorySealed: 10, authentication: 5, fromASealedCase: 5, gradingCompany: 5, grade: 5 } }),
  fixture({ name: "Comics", category: "comics", itemType: "single_comic", scorer: comicsSingleVisualScore,
    title: "Amazing Spider-Man #300 Marvel 1988 Direct Regular Cover Original Unsigned CGC 9.6", grade: "9.6", grader: "CGC",
    details: { comicTitle: "Amazing Spider-Man", issueNumber: "300", publisher: "Marvel", distributionType: "Direct", variantDescription: "Regular Cover", publicationYear: "1988", facsimile: "No", signed: "No" },
    weights: { comicTitle: 20, issueNumber: 20, grade: 15, gradingCompany: 10, variant: 10, publisher: 10, publicationYear: 5, distributionType: 5, facsimile: 3, signed: 2 } }),
  fixture({ name: "Coin single", category: "coins", itemType: "single_coin", scorer: coinsSingleVisualScore,
    title: "1903-S Morgan Silver Dollar PCGS MS63 First Strike", grade: "MS63", grader: "PCGS",
    details: { series: "Morgan Dollar", year: "1903", denomination: "1 Dollar", mintMark: "S", variety: "Morgan", designation: "First Strike", composition: "Silver", country: "United States" },
    weights: { coinTitleSeriesType: 20, yearDate: 15, denomination: 15, mintMark: 10, variety: 10, numericGrade: 12, gradingCompany: 8, designationStrikeFinish: 5, compositionMetal: 3, countryIssuingAuthority: 2 } }),
  fixture({ name: "Coin set", category: "coins", itemType: "coin_set", scorer: coinsSetVisualScore,
    title: "1999 United States Silver Proof Set of 5 Coins Original Packaging",
    details: { setName: "Silver Proof Set", country: "United States", year: "1999", setType: "Proof Set", numberOfCoins: "5", originalPackagingIncluded: "Yes" },
    weights: { setNameSeries: 25, yearDate: 20, countryIssuingAuthority: 15, setType: 15, numberOfCoins: 15, originalPackagingIncluded: 10 } }),
  fixture({ name: "Paper Money", category: "coins", itemType: "paper_money", scorer: paperMoneyVisualScore,
    title: "1934A United States $1,000 Federal Reserve Note PMG 64 Unsigned", grade: "64", grader: "PMG",
    details: { country: "United States", denomination: "$1,000", year: "1934", series: "Federal Reserve Note", signed: "No", condition: "excellent" },
    weights: { country: 20, denomination: 20, yearDate: 15, titleSeries: 15, numericGrade: 12, gradingCompany: 8, signature: 5, condition: 5 } }),
  fixture({ name: "Stamp single", category: "stamps", itemType: "single_stamp", scorer: stampsSingleVisualScore,
    title: "United States Scott C1 1918 24c Airmail MNH Never Hinged Perforated 12 Single line watermark",
    details: { country: "United States", scottNumber: "C1", year: "1918", denomination: "24c", mintOrUsed: "Mint", hinged: "Never Hinged", gum: "Original Gum", perforation: "12", watermark: "Single line", overprintSurcharge: "Airmail", format: "single stamp" },
    weights: { scottNumber: 25, country: 15, year: 15, denomination: 10, format: 10, mintOrUsed: 10, hingeStatus: 3, gumType: 2, perforation: 5, watermark: 3, overprintSurcharge: 2 } }),
  fixture({ name: "Stamp set", category: "stamps", itemType: "stamp_set___sheet", scorer: stampsSetVisualScore,
    title: "1976 United States Bicentennial Mint Set 4 Stamps PSE 95", grade: "95", grader: "PSE",
    details: { country: "United States", setNameDescription: "Bicentennial", year: "1976", sheetType: "Set", numberOfStamps: "4", mintOrUsed: "Mint", format: "set" },
    weights: { setName: 25, country: 15, year: 15, sheetType: 15, numberOfStamps: 10, mintOrUsed: 8, grade: 5, gradingCompany: 4, format: 3 } }),
  fixture({ name: "Video game", category: "video_games", itemType: "game", scorer: videoGameGameVisualScore,
    title: "Super Mario Bros. 3 NES 1990 NTSC-U Standard Sealed PSA 9.8", grade: "9.8", grader: "PSA", isGraded: "Yes",
    details: { gameTitle: "Super Mario Bros. 3", platform: "NES", releaseYear: "1990", region: "NTSC-U", edition: "Standard", sealed: "Yes", upc: "123456789012" },
    weights: { gameTitle: 20, platform: 20, releaseYear: 15, region: 10, edition: 10, productForm: 5, isGraded: 5, gradingCompany: 5, grade: 5, upcEan: 5 } }),
  fixture({ name: "Video console", category: "video_games", itemType: "console", scorer: videoGameConsoleVisualScore,
    title: "Nintendo NES NES-001 Working NTSC-U", isGraded: "No",
    details: { consoleName: "NES", modelNumber: "NES-001", region: "NTSC-U", workingCondition: "Working", originalBoxIncluded: "Yes", cablesIncluded: "Yes", controllersIncluded: "Yes" },
    weights: { consoleName: 25, modelNumber: 20, region: 15, workingCondition: 15, originalBoxIncluded: 10, cablesIncluded: 5, controllersIncluded: 5, isGraded: 5 } }),
  fixture({ name: "Video accessory", category: "video_games", itemType: "accessory", scorer: videoGameAccessoryVisualScore,
    title: "Nintendo NES Controller Working", isGraded: "No",
    details: { accessoryType: "Controller", accessoryName: "NES Controller", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working", originalPackaging: "Yes" },
    weights: { accessoryType: 20, accessoryName: 25, compatiblePlatform: 20, manufacturer: 10, workingCondition: 10, originalPackaging: 10, isGraded: 5 } }),
  fixture({ name: "Movie individual", category: "movies", itemType: "individual_movie", scorer: moviesIndividualVisualScore,
    title: "The Matrix Blu-ray 1999 Standard Region 1 Opened CGC 9.8", grade: "9.8", grader: "CGC",
    details: { title: "The Matrix", format: "Blu-ray", releaseYear: "1999", edition: "Standard", region: "Region 1", sealed: "No" },
    weights: { movieTitle: 25, format: 25, releaseYear: 15, edition: 15, region: 5, sealed: 5, gradingCompany: 5, grade: 5 } }),
  fixture({ name: "Movie box", category: "movies", itemType: "box_set", scorer: moviesBoxSetVisualScore,
    title: "Lord of the Rings Trilogy 3 Movie Blu-ray Box Set Standard Sealed CGC 9.8", grade: "9.8", grader: "CGC",
    details: { boxSetName: "Lord of the Rings Trilogy", format: "Blu-ray", numberOfMovies: "3", edition: "Standard", sealed: "Yes" },
    weights: { boxSetName: 30, format: 20, numberOfMovies: 15, edition: 15, sealed: 10, gradingDetails: 10 } }),
  fixture({ name: "Pin individual", category: "disney_pins", itemType: "individual_pin", scorer: disneyPinsIndividualVisualScore,
    title: "Mickey Mouse Sorcerer Pin D23 2024 Limited Edition",
    details: { pinName: "Mickey Mouse Sorcerer Pin", character: "Mickey Mouse", series: "Sorcerer", year: "2024", pinTradingEvent: "D23", limitedEdition: "yes", openEdition: "no", artistProof: "no", preProduction: "no", backstampInformation: "Disney D23" },
    weights: { pinName: 25, character: 15, series: 15, year: 10, pinTradingEvent: 10, limitedEdition: 10, openEdition: 5, artistProof: 4, preProduction: 3, backstampInformation: 3 } }),
  fixture({ name: "Pin set", category: "disney_pins", itemType: "pin_set", scorer: disneyPinsSetVisualScore,
    title: "Villains Collection Complete Set of 5 Pins Limited Edition",
    details: { setName: "Villains Collection", completeSet: "yes", numberOfPins: "5", series: "Villains", charactersIncluded: "Maleficent Ursula", limitedEdition: "yes", missingPins: "none" },
    weights: { setName: 25, completeSet: 20, numberOfPins: 15, series: 15, charactersIncluded: 10, limitedEdition: 10, missingPins: 5 } }),
];
const musicWeights = { artist: 20, releaseTitle: 15, format: 15, recordLabel: 10, catalogNumber: 10, releaseYear: 8, country: 5, edition: 5, packagingIncluded: 2, gradingCompany: 5, grade: 5 };
for (const itemType of ["vinyl_record", "cassette_tape", "compact_disc", "8_track_tape", "other_music_format"]) {
  fixtures.push(fixture({ name: `Music ${itemType}`, category: "music", itemType, scorer: musicVisualScore,
    title: "Miles Davis Kind of Blue Columbia CL 1355 1959 First Pressing CGC 9.8", grade: "9.8", grader: "CGC",
    details: { artist: "Miles Davis", releaseTitle: "Kind of Blue", format: itemType, recordLabel: "Columbia", catalogNumber: "CL 1355", releaseYear: "1959", country: "United States", edition: "First Pressing", packagingIncluded: "yes" }, weights: musicWeights }));
}
const toys: Array<[string, Record<string, unknown>, Record<string, number>, number?]> = [
  ["action_figure", { toyNameCharacter: "Man-At-Arms", brand: "Mattel", franchise: "Masters of the Universe", year: "1983", packagingType: "Carded", complete: "Yes", accessoriesIncluded: "Yes" }, { toyNameCharacter: 25, brand: 15, franchise: 15, year: 5, packagingType: 10, complete: 10, accessoriesIncluded: 10, gradingCompany: 5, grade: 5 }],
  ["board_game", { gamePuzzleName: "Monopoly", publisherBrand: "Parker", year: "1983", complete: "Yes", numberOfPieces: "100", instructionsIncluded: "Yes", boxIncluded: "Yes" }, { gamePuzzleName: 25, publisherBrand: 15, year: 5, complete: 15, numberOfPieces: 10, instructionsIncluded: 10, boxIncluded: 10, gradingCompany: 5, grade: 5 }, 100],
  ["electronic_toy", { toyName: "Speak and Spell", brand: "Texas Instruments", year: "1983", tested: "Yes", workingCondition: "Working", batteryCompartmentCondition: "Clean", soundWorks: "Yes", lightsWork: "Yes" }, { toyName: 25, brand: 15, year: 5, tested: 15, workingCondition: 15, batteryCompartmentCondition: 10, soundOrLights: 5, gradingCompany: 5, grade: 5 }],
  ["lego", { setNumber: "6285", theme: "Pirates", complete: "Yes", packagingType: "Boxed", releaseYear: "1989", pieceCount: "909", minifiguresIncluded: "Yes", retiredStatus: "Yes" }, { setNumber: 25, theme: 20, complete: 15, packagingType: 10, releaseYear: 5, pieceCount: 5, minifiguresIncluded: 5, retiredStatus: 5, gradingCompany: 5, grade: 5 }, 100],
  ["model/kit", { modelKitName: "Mustang", brand: "Monogram", scale: "1/48", builtOrUnbuilt: "Yes", complete: "Yes", instructionsIncluded: "Yes", year: "1983" }, { modelKitName: 25, brand: 10, scale: 15, builtOrUnbuilt: 15, complete: 10, instructionsIncluded: 10, year: 5, gradingCompany: 5, grade: 5 }],
  ["playset", { playsetName: "Castle Grayskull", brand: "Mattel", franchise: "Masters of the Universe", year: "1983", complete: "Yes", missingPieces: "No", originalBoxIncluded: "Yes" }, { playsetName: 25, brand: 15, franchise: 15, year: 5, complete: 15, missingPieces: 10, originalBoxIncluded: 5, gradingCompany: 5, grade: 5 }],
  ["plush_stuffed_toy", { toyNameCharacter: "Teddy", brand: "Steiff", franchise: "Bears", year: "1983", tagsAttached: "Yes", cleanlinessOdorNotes: "Clean" }, { toyNameCharacter: 30, brand: 20, franchise: 10, year: 5, tagsAttached: 15, cleanlinessOdorNotes: 10, gradingCompany: 5, grade: 5 }],
  ["vehicle", { vehicleName: "Mustang", brand: "Mattel", franchise: "Hot Wheels", year: "1983", vehicleType: "Car", packagingType: "Carded", workingFeatures: "Rolling Wheels" }, { vehicleName: 25, brand: 15, franchise: 10, year: 5, vehicleType: 15, packagingType: 10, workingFeatures: 10, gradingCompany: 5, grade: 5 }],
];
for (const [itemType, details, weights, expected] of toys) fixtures.push(fixture({
  name: `Toy ${itemType}`, category: "vintage_toys", itemType, scorer: vintageToyVisualScore,
  title: "Vintage collectible AFA 7.5", grade: "7.5", grader: "AFA", details, weights, expected,
}));

describe("actual category awards and unchanged model arithmetic", () => {
  it.each(fixtures)("$name earns only positive terms and matches actual dispatch", (row) => {
    const target = fixtureTarget(row);
    const positive = row.scorer(fixtureCandidate(row), target);
    const negative = row.scorer({}, target);
    expect(Object.values(row.weights).reduce((sum, points) => sum + points, 0)).toBe(100);
    expectAccounting(positive, row.weights);
    expectAccounting(negative, row.weights);
    expect(positive.score).toBe(row.expected ?? 100);
    expect(negative.score).toBe(row.scorer === sportsCardSingleVisualScore ? 5 : 0);
    // These are real dispatch outputs, not a duplicate model in the test.
    const dispatched = annotatePreVisualComparableScores([fixtureCandidate(row), {}], target);
    expect(dispatched[0].metadataMatchScore).toBe(positive.score);
    expect(dispatched[0].metadataScoreAwards).toEqual(positive.awards);
    expect(dispatched[0].metadataMatchReasons).toEqual(positive.matched);
    expect(dispatched[1].metadataMatchScore).toBe(negative.score);
    expect(dispatched[1].metadataScoreAwards).toEqual(negative.awards);
  });

  it("uses the actual universal fallback and preserves its explicit 100-point clamp", () => {
    const target = buildVisualTargetMetadata({ title: "Atlas Artifact", category: "other", grade: "7.50", certificationCompany: "CGC" });
    const positive = universalMetadataScore({ title: "Atlas Artifact CGC 7.5" }, target);
    expectAccounting(positive);
    expect(positive.score).toBe(100);
    expect(positive.awards).toEqual([
      { field: "titleOverlap", source: "combined", awardedPoints: 60 },
      { field: "grade", source: "title", awardedPoints: 25 },
      { field: "gradingCompany", source: "title", awardedPoints: 15 },
    ]);
    expect(universalMetadataScore({}, target)).toMatchObject({ score: 0, awards: [] });
    expect(rankingAwardContribution(positive.awards, "title")).toMatchObject({ matched: true, structured: false, titleDerived: false });
  });

  it("carries the actual universal fallback through public no-image dispatch", async () => {
    // Stamp Block has no dedicated scorer; the existing inner dispatch uses universal.
    vi.mocked(invokeLLM).mockClear();
    const target = buildVisualTargetMetadata({ title: "Atlas Stamp", category: "stamps", itemType: "stamp_block", grade: "7.50", certificationCompany: "CGC" });
    const listing = { title: "Atlas Stamp CGC 7.5" };
    const direct = universalMetadataScore(listing, target);
    const annotated = annotatePreVisualComparableScores([listing, {}], target);
    expect(annotated[0]).toMatchObject({ metadataMatchScore: direct.score, metadataScoreAwards: direct.awards, metadataUnknownFields: [] });
    expect(annotated[1]).toMatchObject({ metadataMatchScore: 0, metadataScoreAwards: [] });
    const output = await filterVisualSourceCandidates({ sourceRole: "marketplace", sourceLabel: "Synthetic fallback", targetMetadata: target, listings: [listing] });
    expect(output.contextListings?.[0]).toMatchObject({ metadataMatchScore: direct.score, metadataScoreAwards: direct.awards });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("accounts honestly for absence/default branches without fabricated source columns", () => {
    const sports = sportsCardSingleVisualScore({}, fixtureTarget(fixtures[0]));
    expect(sports.awards).toEqual([{ field: "singleCardForm", source: "rule", awardedPoints: 5 }]);
    const target = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemType: "game", isGraded: "No" });
    const game = videoGameGameVisualScore({ title: "Super Mario Bros. 3" }, target);
    expectAccounting(game);
    expect(game.awards.find((award) => award.field === "isGraded")).toBeUndefined();
    expect(rankingAwardContribution(game.awards, "isGraded")).toMatchObject({ matched: false, structured: false, titleDerived: false });
    expect(game.unknown).toContain('isGraded');
  });

  it("Pin individual annotation uses the Pin scorer, not the broad individual Movie classifier", () => {
    const row = fixtures.find((entry) => entry.name === "Pin individual")!;
    const target = fixtureTarget(row);
    const direct = row.scorer(fixtureCandidate(row), target);
    const annotated = annotatePreVisualComparableScores([fixtureCandidate(row)], target)[0];
    expect(direct.score).toBe(100);
    expect(annotated.metadataMatchScore).toBe(100);
    expect(annotated.metadataScoreAwards).toEqual(direct.awards);
    expect(annotated.metadataScoreAwards?.some((award) => award.field === "movieTitle")).toBe(false);
  });

  it("preserves lower-weight branches without redistributing absent grade points", () => {
    for (const name of ["Movie individual", "Movie box", "Music vinyl_record", "Toy action_figure"]) {
      const original = fixtures.find((entry) => entry.name === name)!;
      const row = { ...original, grade: undefined, grader: undefined };
      const candidate = fixtureCandidate(row);
      // Remove title grading evidence as well as structured grading evidence.
      candidate.title = String(candidate.title).replace(/(?:CGC|AFA)\s+\d+(?:\.\d+)?/g, "");
      const result = row.scorer(candidate, fixtureTarget(row));
      expectAccounting(result, row.weights);
      expect(result.score).toBe(90);
      expect(result.awards.some((award) => ["grade", "gradingCompany", "gradingDetails"].includes(award.field))).toBe(false);
    }
  });

  it('never displays title-derived MATCH with potential points but no earned award', () => {
    for (const row of fixtures) {
      const target = fixtureTarget(row);
      const candidate = fixtureCandidate(row);
      delete candidate.itemDetails;
      const score = row.scorer(candidate, target);
      const projected = withMetadataFieldComparisons(target, {
        ...candidate,
        metadataMatchScore: score.score,
        metadataScoreAwards: score.awards,
      });
      const displayed = projected.metadataFieldComparisons ?? buildMetadataFieldComparisons(target, projected);
      const missingAwardRows = displayed.filter((comparison) => comparison.titleDerivedStatus === 'match'
        && Number(comparison.rankingContribution?.potentialPoints ?? 0) > 0
        && Number(comparison.rankingContribution?.awardedPoints ?? 0) === 0);
      expect(missingAwardRows, `${row.name}: title-derived match lost its score`).toEqual([]);
      const titleAwardFields = new Set(score.awards.filter((award) => award.source === 'title').map((award) => award.field));
      const contradictoryTitleRows = displayed.filter((comparison) => titleAwardFields.has(comparison.fieldKey)
        && String(comparison.targetValue).trim().toLowerCase() !== 'unknown'
        && (comparison.titleDerivedStatus !== 'match' || String(comparison.titleDerivedValue).trim().toLowerCase() === 'unknown'));
      expect(contradictoryTitleRows.map((comparison) => ({ field: comparison.fieldKey, value: comparison.titleDerivedValue, status: comparison.titleDerivedStatus })),
        `${row.name}: title-scored evidence is not visibly parsed as a matching value`).toEqual([]);
    }
  });

  it("ordinary targets may keep a returned lot candidate's diagnostic awards without changing form credit", () => {
    const target = fixtureTarget(fixtures[0]);
    const lot = { ...fixtureCandidate(fixtures[0]), title: `${fixtures[0].title} Lot of 2 Cards` };
    const result = sportsCardSingleVisualScore(lot, target);
    expectAccounting(result, fixtures[0].weights);
    expect(result.score).toBe(95);
    expect(result.awards.some((award) => award.field === "singleCardForm")).toBe(false);
    const annotated = annotatePreVisualComparableScores([lot], target)[0];
    expect(annotated.metadataScoreAwards).toEqual(result.awards);
    expect(annotated.metadataMatchScore).toBe(result.score);
  });

  it.each([49, 50, 69, 70, 79, 80, 89, 90])("preserves Video Games cap boundary %i", (score) => {
    const expected: Record<number, number> = { 49: 0, 50: 2, 69: 2, 70: 4, 79: 4, 80: 6, 89: 6, 90: 8 };
    expect(videoGameVisualCap(score)).toBe(expected[score]);
  });
});

describe("source-specific positive awards", () => {
  it("Is Graded alone never earns or colors numeric Grade or grader", () => {
    const target = buildVisualTargetMetadata({ title: "NES", category: "video_games", itemType: "console", isGraded: "Yes" });
    const result = videoGameConsoleVisualScore({ title: "NES", isGraded: "Yes" }, target);
    expectAccounting(result);
    expect(result.awards.find((award) => award.field === "isGraded")).toMatchObject({ source: "structured", awardedPoints: 5 });
    expect(rankingAwardsForField(result.awards, "Grade")).toEqual([]);
    expect(rankingAwardsForField(result.awards, "gradingCompany")).toEqual([]);
    expect(rankingAwardContribution(result.awards, "Is Graded")).toMatchObject({ matched: true, structured: true, titleDerived: false });
  });

  it("provider productName is a title observation, not structured product identity", () => {
    const target = buildVisualTargetMetadata({ title: "Booster Box", category: "pokemon", itemType: "unopened_product", fullItemDetails: { productName: "Booster Box" } });
    const result = pokemonVisualScore({ productName: "Booster Box" }, target);
    expect(result.awards.find((award) => award.field === "productName")).toMatchObject({ source: "title", awardedPoints: 15 });
    expect(rankingAwardContribution(result.awards, "productName", "pokemon")).toMatchObject({ matched: true, structured: false, titleDerived: true });
  });

  it("None is explicit absence only for Missing Pins and never blanket identity agreement", () => {
    const target = buildVisualTargetMetadata({ title: "Villains Collection", category: "disney_pins", itemType: "pin_set", fullItemDetails: { setName: "none", series: "none", missingPins: "none" } });
    const candidate = { title: "none", itemDetails: JSON.stringify({ setName: "none", series: "none", missingPins: "none" }) };
    const result = disneyPinsSetVisualScore(candidate, target);
    expectAccounting(result);
    expect(result.awards).toEqual([{ field: "missingPins", source: "structured", awardedPoints: 5, evidence: [{ field: "missingPins", source: "structured", value: "none" }] }]);
    expect(rankingAwardContribution(result.awards, "missingPins")).toMatchObject({ matched: true, structured: true, titleDerived: false });
    const named = disneyPinsSetVisualScore({ itemSpecifics: [{ Name: "Missing Pins", Value: "None" }] }, target);
    expect(named.awards.find((award) => award.field === "missingPins")).toMatchObject({ source: "structured", awardedPoints: 5 });
    for (const listing of [{}, { title: "None complete set" }, { itemDetails: JSON.stringify({ missingPins: "Unknown" }) }, { missingPins: "Ursula", itemDetails: JSON.stringify({ missingPins: "none" }) }]) {
      expect(disneyPinsSetVisualScore(listing, target).awards.some((award) => award.field === "missingPins")).toBe(false);
    }
    expect(disneyPinsSetVisualScore(candidate, buildVisualTargetMetadata({ title: "Villains", category: "disney_pins", itemType: "pin_set", fullItemDetails: { missingPins: "Unknown" } })).awards.some((award) => award.field === "missingPins")).toBe(false);
  });

  it.each([
    { scorer: disneyPinsSetVisualScore, category: "disney_pins", itemType: "pin_set", field: "numberOfPins", alias: "pinCount", count: "5", title: "Set of 5 Pins", points: 15 },
    { scorer: stampsSetVisualScore, category: "stamps", itemType: "stamp_set___sheet", field: "numberOfStamps", alias: "stampCount", count: "4", title: "Set 4 Stamps", points: 10 },
  ])("$field preserves its actual structured or title count witness", ({ scorer, category, itemType, field, alias, count, title, points }) => {
    const target = buildVisualTargetMetadata({ title: "Example", category, itemType, fullItemDetails: { [field]: count } });
    const structured = scorer({ title: "Example", itemDetails: JSON.stringify({ [alias]: count }) }, target);
    expectAccounting(structured);
    expect(structured.awards.find((award) => award.field === field)).toMatchObject({ source: "structured", awardedPoints: points, evidence: [{ field: alias, source: "structured", value: count }] });
    const fromTitle = scorer({ title }, target);
    expectAccounting(fromTitle);
    expect(fromTitle.awards.find((award) => award.field === field)).toMatchObject({ source: "title", awardedPoints: points, evidence: [{ field, source: "title", value: count }] });
    expect(scorer({ title, itemDetails: JSON.stringify({ [alias]: "9" }) }, target).awards.some((award) => award.field === field)).toBe(false);
    expect(scorer({}, target).awards.some((award) => award.field === field)).toBe(false);
  });

  it("does not award Pin Name points from character-only evidence", () => {
    const target = buildVisualTargetMetadata({ title: "Around the World Eeyore Pin", category: "disney_pins", itemType: "individual_pin", fullItemDetails: { pinName: "Around the World Eeyore", character: "Eeyore" } });
    for (const [listing, source] of [
      [{ title: "Disney trading pin", itemDetails: JSON.stringify({ character: "Eeyore" }) }, "structured"],
      [{ title: "Eeyore From Winnie The Pooh Disneyland D Fantasy Pin (LE 200)" }, "title"],
    ] as const) {
      const result = disneyPinsIndividualVisualScore(listing, target);
      expectAccounting(result);
      expect(result.score).toBe(15);
      expect(result.awards.some((award) => award.field === "pinName")).toBe(false);
      expect(rankingAwardContribution(result.awards, "pinName", "disney_pins")).toMatchObject({ matched: false, structured: false, titleDerived: false });
      expect(rankingAwardContribution(result.awards, "character", "disney_pins").awards.map((award) => award.field)).toEqual(["character"]);
      expect(rankingAwardContribution(result.awards, "character", "disney_pins")).toMatchObject({ structured: source === "structured", titleDerived: source === "title" });
      expect(annotatePreVisualComparableScores([listing], target)[0].metadataScoreAwards).toEqual(result.awards);
    }
    const exact = disneyPinsIndividualVisualScore({ itemDetails: JSON.stringify({ pinName: "Around the World Eeyore", character: "Eeyore" }) }, target);
    expect(exact.awards.find((award) => award.field === "pinName")).toMatchObject({ awardedPoints: 25, evidence: [{ field: "pinName", source: "structured" }] });
    expect(rankingAwardContribution(exact.awards, "pinName", "disney_pins")).toMatchObject({ structured: true, titleDerived: false });
  });

  it("title-first Accessory award does not credit conflicting structured identity", () => {
    const target = buildVisualTargetMetadata({ title: "NES Power Glove", category: "video_games", itemType: "accessory", fullItemDetails: { accessoryType: "Controller", accessoryName: "Power Glove", manufacturer: "Nintendo", platform: "NES" } });
    const listing = { title: "Nintendo NES Power Glove Controller", itemDetails: JSON.stringify({ accessoryName: "Generic Joystick", accessoryType: "Keyboard", manufacturer: "Acme", platform: "NES" }) };
    const result = videoGameAccessoryVisualScore(listing, target);
    expectAccounting(result);
    for (const field of ["accessoryType", "accessoryName", "manufacturer"]) {
      expect(result.awards.find((award) => award.field === field)).toMatchObject({ source: "title" });
      expect(rankingAwardContribution(result.awards, field, "video_games", "accessory")).toMatchObject({ matched: true, structured: false, titleDerived: true });
    }
    expect(JSON.parse(listing.itemDetails)).toEqual({ accessoryName: "Generic Joystick", accessoryType: "Keyboard", manufacturer: "Acme", platform: "NES" });
  });

  it("skips placeholder candidate values but retains a contrary structured grade", () => {
    const target = buildVisualTargetMetadata({ title: "Example Game", category: "video_games", itemType: "game", grade: "7.50", certificationCompany: "PSA", fullItemDetails: { platform: "NES" } });
    const recovered = videoGameGameVisualScore({ title: "Example Game NES WATA 7.5", grade: "Unknown", gradingCompany: "Other", platform: "N/A" }, target);
    expectAccounting(recovered);
    for (const field of ["platform", "grade", "gradingCompany"]) expect(recovered.awards.find((award) => award.field === field)?.source).toBe("title");
    const contrary = videoGameGameVisualScore({ title: "Example Game NES PSA 7.5", grade: "7.0", gradingCompany: "VGA", platform: "SNES" }, target);
    for (const field of ["platform", "grade", "gradingCompany"]) expect(contrary.awards.some((award) => award.field === field)).toBe(false);
  });

  it("mixed-case Other/custom and false remain real structured facts at the scoring read", () => {
    const target = buildVisualTargetMetadata({ title: "NES", category: "video_games", itemType: "console", isGraded: "No", fullItemDetails: { originalBoxIncluded: "No" } });
    const listing = { title: "NES", itemSpecifics: [
      { Name: "Original Box Included", Value: false },
      { Name: "Is Graded", Value: false },
    ] };
    const result = videoGameConsoleVisualScore(listing, target);
    expectAccounting(result);
    expect(result.awards.find((award) => award.field === "originalBoxIncluded")).toMatchObject({ source: "structured", awardedPoints: 10 });
    expect(result.awards.find((award) => award.field === "isGraded")).toMatchObject({ source: "structured", awardedPoints: 5 });
    const gameTarget = buildVisualTargetMetadata({ title: "Example Game", category: "video_games", itemType: "game", fullItemDetails: { platform: "NES" } });
    const custom = videoGameGameVisualScore({ title: "Example Game", fullItemDetails: { PLATFORM: "Other", customPlatform: "NES" } }, gameTarget);
    expect(custom.awards.find((award) => award.field === "platform")).toMatchObject({ source: "structured", awardedPoints: 20 });
  });

  it("Unknown and Other targets do not earn identity agreement from the same words", () => {
    const cases: Array<[Scorer, string, string, Record<string, unknown>, string[]]> = [
      [coinsSingleVisualScore, "coins", "single_coin", { series: "Unknown", year: "Other", denomination: "N/A" }, ["coinTitleSeriesType", "yearDate", "denomination"]],
      [stampsSingleVisualScore, "stamps", "single_stamp", { country: "Unknown", scottNumber: "Other", watermark: "Unknown" }, ["country", "scottNumber", "watermark"]],
      [comicsSingleVisualScore, "comics", "single_comic", { comicTitle: "Unknown", issueNumber: "Other", publisher: "Unknown" }, ["comicTitle", "issueNumber", "publisher"]],
      [sportsCardSetVisualScore, "sports_cards", "set", { missingCards: "Unknown", factorySealed: "Other" }, ["missingCards", "factorySealed"]],
      [disneyPinsIndividualVisualScore, "disney_pins", "individual_pin", { pinName: "Unknown", character: "Other", series: "Unknown" }, ["pinName", "character", "series"]],
      [musicVisualScore, "music", "compact_disc", { artist: "Unknown", releaseTitle: "Other", recordLabel: "N/A" }, ["artist", "releaseTitle", "recordLabel"]],
      [originalArtMarketRelevanceScore, "comics", "original_art", { artType: "Other", artistName: "Unknown", publisher: "Unknown" }, ["artType", "artistName", "publisher"]],
      [autographMarketRelevanceScore, "autographs", "signed_item", { signer: "Unknown", autographCategory: "Other", inscription: "Unknown" }, ["signer", "autographCategory", "inscription"]],
    ];
    for (const [scorer, category, itemType, details, fields] of cases) {
      const target = buildVisualTargetMetadata({ title: "Unknown", category, itemType, fullItemDetails: details });
      const result = scorer({ title: "Unknown Other N/A opened complete set", itemDetails: JSON.stringify(details) }, target);
      expectAccounting(result);
      for (const field of fields) expect(result.awards.some((award) => award.field === field)).toBe(false);
    }
  });

  it("Movie gradingDetails is counted once and carries the actual two source witnesses", () => {
    const row = fixtures.find((entry) => entry.name === "Movie box")!;
    const target = fixtureTarget(row);
    const listing = { title: "Lord of the Rings Trilogy CGC 9.8", grade: "9.80", gradingCompany: "Unknown" };
    const result = moviesBoxSetVisualScore(listing, target);
    expectAccounting(result);
    const composite = result.awards.filter((award) => award.field === "gradingDetails");
    expect(composite).toHaveLength(1);
    expect(composite[0]).toMatchObject({ source: "mixed", awardedPoints: 10, evidence: [
      { field: "grade", source: "structured", value: "9.80" },
      { field: "gradingCompany", source: "title", value: "CGC" },
    ] });
    expect(rankingAwardContribution(result.awards, "Grade")).toMatchObject({ structured: true, titleDerived: false });
    expect(rankingAwardContribution(result.awards, "certificationCompany")).toMatchObject({ structured: false, titleDerived: true });
    expect(moviesBoxSetVisualScore({ ...listing, grade: "9.6" }, target).awards.some((award) => award.field === "gradingDetails")).toBe(false);
    expect(moviesBoxSetVisualScore({ title: "Lord of the Rings Trilogy", grade: "9.8" }, target).awards.some((award) => award.field === "gradingDetails")).toBe(false);
  });

  it.each([sportsCardSingleVisualScore, sportsCardUnopenedVisualScore])("card OR composite records only the selected winning branch", (scorer) => {
    const target = buildVisualTargetMetadata({ title: "Example Card", category: "sports_cards", itemType: "single_card", fullItemDetails: { manufacturer: "Topps", setName: "Heritage" } });
    const both = scorer({ title: "Topps Heritage" }, target);
    expectAccounting(both);
    expect(both.awards.filter((award) => award.field === "manufacturerOrSet")).toEqual([
      { field: "manufacturerOrSet", source: "title", awardedPoints: 15, evidence: [{ field: "manufacturer", source: "title", value: "Topps" }] },
    ]);
    expect(rankingAwardsForField(both.awards, "setName")).toEqual([]);
    const fallback = scorer({ title: "Heritage", itemDetails: JSON.stringify({ manufacturer: "Acme" }) }, target);
    expect(fallback.awards.find((award) => award.field === "manufacturerOrSet")?.evidence?.[0].field).toBe("setName");
    expect(rankingAwardContribution(fallback.awards, "manufacturer")).toMatchObject({ matched: false });
    const structured = scorer({ title: "Example", itemDetails: JSON.stringify({ manufacturer: "Topps", setName: "Heritage" }) }, target);
    expect(structured.awards.find((award) => award.field === "manufacturerOrSet")).toMatchObject({ source: "structured", evidence: [{ field: "manufacturer", source: "structured", value: "Topps" }] });
  });

  it("toy sound/light OR counts once, including title evidence, without crediting the loser", () => {
    const target = buildVisualTargetMetadata({ title: "Robot", category: "vintage_toys", itemType: "electronic_toy", fullItemDetails: { soundWorks: "Yes", lightsWork: "Yes" } });
    const both = vintageToyVisualScore({ title: "Robot", itemDetails: JSON.stringify({ soundWorks: "Yes", lightsWork: "Yes" }) }, target);
    expectAccounting(both);
    expect(both.awards.filter((award) => award.field === "soundOrLights")).toEqual([
      { field: "soundOrLights", source: "structured", awardedPoints: 5, evidence: [{ field: "soundWorks", source: "structured", value: "yes" }] },
    ]);
    expect(rankingAwardsForField(both.awards, "lightsWork")).toEqual([]);
    const titleWinner = vintageToyVisualScore({ title: "Robot lights work", itemDetails: JSON.stringify({ soundWorks: "No" }) }, target);
    expect(titleWinner.awards.find((award) => award.field === "soundOrLights")).toMatchObject({ source: "title", awardedPoints: 5, evidence: [{ field: "lightsWork", source: "title", value: "Robot lights work" }] });
    expect(rankingAwardContribution(titleWinner.awards, "soundWorks")).toMatchObject({ matched: false });
    expect(rankingAwardContribution(titleWinner.awards, "lightsWork")).toMatchObject({ matched: true, structured: false, titleDerived: true });
    expect(vintageToyVisualScore({ title: "Robot", itemDetails: JSON.stringify({ soundWorks: "No", lightsWork: "No" }) }, target).awards.some((award) => award.field === "soundOrLights")).toBe(false);
  });
});

describe("exact grade normalization in real scoring branches", () => {
  const gradeCases: Array<[Scorer, string, string, number]> = [
    [videoGameGameVisualScore, "video_games", "game", 5],
    [moviesIndividualVisualScore, "movies", "individual_movie", 5],
    [coinsSingleVisualScore, "coins", "single_coin", 12],
    [paperMoneyVisualScore, "coins", "paper_money", 12],
    [stampsSetVisualScore, "stamps", "stamp_set___sheet", 5],
    [sportsCardSingleVisualScore, "sports_cards", "single_card", 10],
    [comicsSingleVisualScore, "comics", "single_comic", 15],
    [pokemonVisualScore, "pokemon", "single_card", 5],
    [musicVisualScore, "music", "compact_disc", 5],
    [vintageToyVisualScore, "vintage_toys", "action_figure", 5],
    [universalMetadataScore, "other", "other", 25],
  ];
  it.each([
    { scorer: pokemonVisualScore, category: "pokemon", itemType: "single_card", grade: "9.8", grader: "PSA", title: "1999 Pokémon Charizard Base Set #4/102 PSA 9.8", field: "grade", points: 5 },
    { scorer: stampsSetVisualScore, category: "stamps", itemType: "stamp_set___sheet", grade: "95", grader: "PSE", title: "1976 United States Bicentennial Mint Set 4 Stamps PSE 95", field: "grade", points: 5 },
    { scorer: coinsSingleVisualScore, category: "coins", itemType: "single_coin", grade: "MS63", grader: "PCGS", title: "1903-S Morgan Silver Dollar PCGS MS63 First Strike", field: "numericGrade", points: 12 },
  ])("$category year-leading title retains its complete grade evidence", ({ scorer, category, itemType, grade, grader, title, field, points }) => {
    const target = buildVisualTargetMetadata({ title: "Example", category, itemType, grade, certificationCompany: grader });
    const listing = { title };
    const result = scorer(listing, target);
    expectAccounting(result);
    expect(result.awards.find((award) => award.field === field)).toMatchObject({ source: "title", awardedPoints: points });
    expect(annotatePreVisualComparableScores([listing], target)[0].metadataScoreAwards).toEqual(result.awards);
    expect(scorer({ title: title.replace(new RegExp(`${grader}.*$`), "") }, target).awards.some((award) => award.field === field)).toBe(false);
  });

  it("bare Coin grade cannot borrow a missing prefix from the target or a matching title", () => {
    const target = buildVisualTargetMetadata({ title: "1903-S Dollar", category: "coins", itemType: "single_coin", grade: "MS65", certificationCompany: "PCGS" });
    for (const listing of [{ title: "1903-S Dollar PCGS 65" }, { title: "1903-S Dollar PCGS MS65", grade: "65" }]) {
      const result = coinsSingleVisualScore(listing, target);
      expectAccounting(result);
      expect(result.awards.some((award) => award.field === "numericGrade")).toBe(false);
      expect(result.unknown).toContain("numericGrade");
    }
    for (const listing of [{ title: "1903-S Dollar PCGS MS65" }, { title: "1903-S Dollar", grade: "MS65" }]) {
      expect(coinsSingleVisualScore(listing, target).awards.find((award) => award.field === "numericGrade")).toMatchObject({ awardedPoints: 12 });
    }
  });

  it.each(gradeCases)("%s: 7.50 equals 7.5 without rounding identity", (scorer, category, itemType, points) => {
    const target = buildVisualTargetMetadata({ title: "Example", category, itemType, grade: "7.50", certificationCompany: "CGC" });
    const result = scorer({ title: "Example CGC 7.5", grade: "7.5", gradingCompany: "CGC" }, target);
    const award = result.awards.find((entry) => rankingAwardFieldKey(entry.field) === "grade");
    expect(award).toMatchObject({ source: "structured", awardedPoints: points });
    expectAccounting(result);
    const different = scorer({ title: "Example CGC 7.5", grade: "7.51", gradingCompany: "CGC" }, target);
    expect(different.awards.some((entry) => rankingAwardFieldKey(entry.field) === "grade")).toBe(false);
  });

  it.each([["MS65+", "MS65"], ["MS65", "PR65"], ["MS65 PL", "MS65 DMPL"], ["PR65 CAM", "PR65 DCAM"], ["MS65 PL", "MS65"]])("does not erase %s versus %s", (grade, observed) => {
    const target = buildVisualTargetMetadata({ title: "Dollar", category: "coins", itemType: "single_coin", grade, certificationCompany: "PCGS" });
    const result = coinsSingleVisualScore({ title: `Dollar PCGS ${grade}`, grade: observed, gradingCompany: "PCGS" }, target);
    expect(result.awards.some((award) => award.field === "numericGrade")).toBe(false);
    expectAccounting(result);
  });

  it("preserves card qualifiers and the category-scoped Video Games sealed-label exception", () => {
    const cardTarget = buildVisualTargetMetadata({ title: "Example", category: "sports_cards", itemType: "single_card", grade: "7.5 OC", certificationCompany: "PSA" });
    expect(sportsCardSingleVisualScore({ title: "Example PSA 7.5 OC", grade: "7.5 MC" }, cardTarget).awards.some((award) => award.field === "grade")).toBe(false);
    expect(sportsCardSingleVisualScore({ title: "Example PSA 7.5 OC", grade: "7.5" }, cardTarget).awards.some((award) => award.field === "grade")).toBe(false);
    const gameTarget = buildVisualTargetMetadata({ title: "Example", category: "video_games", itemType: "game", grade: "9.8-A+", certificationCompany: "WATA" });
    const soft = videoGameGameVisualScore({ title: "Example CGC Graded (9.8-A++)" }, gameTarget);
    expect(soft.awards.find((award) => award.field === "grade")).toMatchObject({ source: "title", awardedPoints: 5 });
    expect(videoGameGameVisualScore({ title: "Example WATA 9.8+", grade: "9.8+" }, gameTarget).awards.some((award) => award.field === "grade")).toBe(false);
  });
});

describe("special relevance roles and highlight alias contract", () => {
  it.each([
    { category: "autographs", itemType: "signed_item", title: "Michael Jordan signed puck JSA", details: { signer: "Michael Jordan", signedItemType: "Puck", autographCategory: "Sports", authenticationCompany: "JSA", inscription: "Yes" }, scorer: autographMarketRelevanceScore, role: "signed_item_relevance", visual: "not_required_autograph_market_context" },
    { category: "comics", itemType: "original_art", title: "Jane Doe Spider-Man Cover Amazing Spider-Man #300 Marvel", details: { artistName: "Jane Doe", artworkTitle: "Spider-Man", artType: "Cover", comicTitle: "Amazing Spider-Man", issueNumber: "300", publisher: "Marvel" }, scorer: originalArtMarketRelevanceScore, role: "original_art_relevance", visual: "not_required_original_art" },
  ])("$role remains non-exact-visual and carries actual relevance awards", async (row) => {
    vi.mocked(invokeLLM).mockClear();
    const target = buildVisualTargetMetadata({ title: row.title, category: row.category, itemType: row.itemType, fullItemDetails: row.details });
    const listing = { title: row.title, itemDetails: JSON.stringify(row.details) };
    const direct = row.scorer(listing, target);
    expectAccounting(direct);
    expect(direct.score).toBe(100);
    const negative = row.scorer({}, target);
    expectAccounting(negative);
    expect(negative.score).toBe(0);
    const output = await filterVisualSourceCandidates({ sourceRole: "marketplace", sourceLabel: "Synthetic scorer role", targetMetadata: target, listings: [listing] });
    expect(output.listings).toEqual([]);
    expect(output.contextListings?.[0]).toMatchObject({ metadataMatchScore: direct.score, metadataScoreAwards: direct.awards, metadataRanking: { scorerRole: row.role }, visualRequirement: row.visual });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it.each(["pokemon", "sports_cards", "comics", "coins", "stamps", "video_games", "movies", "disney_pins", "music", "vintage_toys"])("%s Collection/Lot stays unscored in actual dispatch", (category) => {
    const target = buildVisualTargetMetadata({ title: "Mixed Collection", category, itemType: "collection_lot" });
    const output = annotatePreVisualComparableScores([{ title: "Mixed Collection" }], target)[0];
    expect(output.metadataMatchScore).toBeUndefined();
    expect(output.metadataScoreAwards).toEqual([]);
  });

  it.each([
    { category: "", itemType: "single_card" },
    { category: "Unknown", itemType: "single_card" },
    { category: "unrecognized_provider_category", itemType: "artifact" },
    { category: "stamps", itemType: "unrecognized_provider_item" },
    { category: "coins", itemType: "Unknown" },
    { category: "coins", itemType: "" },
    { category: "coins", itemType: "collection_lot" },
  ])("direct annotation clears foreign scores and awards for $category / $itemType", ({ category, itemType }) => {
    const target = buildVisualTargetMetadata({ title: "Example", category, itemType });
    const stale = { title: "Example", metadataMatchScore: 100, metadataMatchRank: 1,
      metadataMatchReasons: ["foreign score"], metadataUnknownFields: ["foreign unknown"], metadataMatchLabel: "Foreign",
      metadataScoreAwards: [{ field: "grade", source: "structured" as const, awardedPoints: 100 }] };
    const result = annotatePreVisualComparableScores([stale], target)[0];
    expect(result).toMatchObject({ metadataMatchReasons: [], metadataUnknownFields: [], metadataScoreAwards: [] });
    expect(result.metadataMatchScore).toBeUndefined();
    expect(result.metadataMatchRank).toBeUndefined();
    expect(result.metadataMatchLabel).toBeUndefined();
    expect(stale.metadataMatchScore).toBe(100);
  });

  it("final supported scoring replaces foreign awards, prose, and unknown fields together", () => {
    const target = buildVisualTargetMetadata({ title: "Atlas Stamp", category: "stamps", itemType: "stamp_block" });
    const listing = { title: "Atlas Stamp", metadataMatchScore: 100, metadataMatchRank: 17,
      metadataMatchReasons: ["grade"], metadataUnknownFields: ["foreign unknown"],
      metadataScoreAwards: [{ field: "grade", source: "structured" as const, awardedPoints: 100 }] };
    const direct = universalMetadataScore(listing, target);
    const once = annotatePreVisualComparableScores([listing], target)[0];
    const twice = annotatePreVisualComparableScores([once], target)[0];
    expect(once).toMatchObject({ metadataMatchScore: direct.score, metadataMatchReasons: direct.matched, metadataUnknownFields: [], metadataScoreAwards: direct.awards });
    expect(twice.metadataScoreAwards).toEqual(once.metadataScoreAwards);
    expect(twice.metadataUnknownFields).toEqual([]);
  });

  it("aliases are exact and reason prose/raw presence cannot invent a contribution", () => {
    const award: RankingAward = { field: "isGraded", source: "structured", awardedPoints: 5, evidence: [{ field: "grade", source: "structured", value: "7.5" }] };
    expect(rankingAwardsForField([award], "grade")).toEqual([]);
    expect(rankingAwardFieldKey("gradingCompany")).toBe(rankingAwardFieldKey("Certification Company"));
    expect(rankingAwardFieldKey("movieTitle", "movies")).toBe(rankingAwardFieldKey("title", "movies"));
    expect(rankingAwardFieldKey("movieTitle", "comics")).not.toBe(rankingAwardFieldKey("title", "comics"));
    expect(rankingAwardFieldKey("Finish", "pokemon")).not.toBe(rankingAwardFieldKey("designation", "pokemon"));
    expect(rankingAwardContribution(undefined, "Grade")).toEqual({ matched: false, structured: false, titleDerived: false, reasons: [], awards: [] });
    expect(rankingAwardsForField([{ field: "grade", source: "title", awardedPoints: 0 }], "Grade")).toEqual([]);
    expect(rankingAwardsForField([{ field: "upgradedItem", source: "title", awardedPoints: 5 }], "Grade")).toEqual([]);
    expect(rankingAwardContribution([{ field: "productForm", source: "combined", awardedPoints: 5 }], "productForm")).toMatchObject({ matched: true, structured: false, titleDerived: false });
  });
});
