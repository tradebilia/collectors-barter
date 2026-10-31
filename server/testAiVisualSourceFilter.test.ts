import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "./_core/llm";
import {
  applyVisualSourceReviews,
  applyDeclaredIdentityFilter,
  buildVisualTargetMetadata,
  buildDeclaredIdentityReviews,
  coinAdmissionReason,
  conservativeComicVisualReviews,
  conservativeCoinVisualReviews,
  conservativeGradedVisualReviews,
  gradedIdentifierInstruction,
  disneyPinsVisualInstruction,
  embedPromotedEbayImageForReview,
  enforceDisneyPinsExactEvidence,
  hasCompletedDisneyPinsAdjudication,
  hasCompletedCoinAdjudication,
  hasUnavailableDisneyPinsAdjudication,
  hasExplicitlyUngradedTarget,
  hasTitleDeclaredGradeVisualRawConflict,
  isMultiItemLot,
  multiItemLotReason,
  isDisneyPinsMetadata,
  isCoinMetadata,
  enforceCoinExactEvidence,
  filterVisualSourceCandidates,
  reconcileCoinPrimaryReviewForAdjudication,
  normalizeCompactCoinAdjudicationReview,
  normalizeExplicitUngradedVisualReviews,
  normalizeSingleCandidateVisualReview,
  normalizeVisualSourceReviews,
  normalizeVisualSourceCandidate,
  prepareUniversalVisualCandidates,
  promoteEbayImageUrl,
  prioritizeVisualSourceCandidates,
  coinsSingleVisualCap,
  coinsSingleVisualScore,
  coinsSetVisualCap,
  coinsSetVisualScore,
  paperMoneyVisualCap,
  paperMoneyVisualScore,
  videoGameGameVisualScore,
  videoGameConsoleVisualScore,
  videoGameAccessoryVisualScore,
  videoGameVisualCap,
  moviesIndividualVisualScore,
  moviesBoxSetVisualScore,
  moviesVisualCap,
  musicVisualScore,
  musicVisualCap,
  disneyPinsIndividualVisualScore,
  disneyPinsSetVisualScore,
  disneyPinsVisualCap,
  stampsSingleVisualCap,
  stampsSingleVisualScore,
	  stampsSetVisualCap,
	  stampsSetVisualScore,
	  autographMarketRelevanceScore,
	  autographIdentityConflictReason,
	  autographMultiSignatureReason,
	  autographValuationEligibility,
	  autographObjectTypeMismatchReason,
	  autographReplicaReason,
	  isAutographSignedItemTarget,
	  pokemonVisualCap,
	  pokemonVisualScore,
	  comicsSingleVisualCap,
  comicsSingleVisualScore,
  sportsCardSetVisualCap,
  sportsCardSetVisualScore,
  sportsCardUnopenedVisualCap,
  sportsCardUnopenedVisualScore,
  sportsCardSingleVisualCap,
  sportsCardSingleVisualScore,
  shouldReviewAdditionalVisualImages,
  sportsCardSetInstruction,
  VISUAL_REVIEW_MAX_CANDIDATES,
  VISUAL_REVIEW_BATCH_SIZE,
  VISUAL_REVIEW_TARGET_MATCHES,
  VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS,
  VISUAL_REVIEW_OVERALL_DEADLINE_MS,
} from "./testAiVisualSourceFilter";

const mockedInvokeLLM = vi.mocked(invokeLLM);
const structuredVisualResponse = (value: unknown) => ({
  choices: [{ message: { content: JSON.stringify(value) } }],
});

describe("visual source filter", () => {
  beforeEach(() => mockedInvokeLLM.mockReset());
  it("ranks Signed Item market evidence by signer, object, authentication, and inscription", () => {
    const target = buildVisualTargetMetadata({
      title: "Michael Jordan signed puck",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Michael Jordan", signedItemType: "Puck", autographCategory: "Sports", authenticationCompany: "JSA", inscription: "Yes" },
    });
    expect(isAutographSignedItemTarget(target)).toBe(true);
    const score = autographMarketRelevanceScore({
      title: "Michael Jordan signed puck JSA inscription",
      itemDetails: JSON.stringify({ signer: "Michael Jordan", signedItemType: "Puck", autographCategory: "Sports", authenticationCompany: "JSA", inscription: "Yes" }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining(["signer", "signed item type", "autograph category", "authentication company", "inscription"]));
  });

  it("normalizes equivalent signed sports-object wording before scoring", () => {
    const boxingGloveTarget = buildVisualTargetMetadata({
      title: "Muhammad Ali signed boxing glove",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Muhammad Ali", signedItemType: "Boxing Glove", authenticationCompany: "Beckett Authentication Services" },
    });
    const boxingGloveScore = autographMarketRelevanceScore({
      title: "Muhammad Ali Signed EVERLAST 10oz. Boxing Glove The GOAT Boxing HOFer",
    }, boxingGloveTarget);
    expect(boxingGloveScore.score).toBe(60);
    expect(boxingGloveScore.matched).toEqual(expect.arrayContaining(["signer", "signed item type"]));
    const crossCompanyBoxingGloveScore = autographMarketRelevanceScore({
      title: "Muhammad Ali Signed EVERLAST 10oz. Boxing Glove PSA/DNA",
    }, boxingGloveTarget);
    expect(crossCompanyBoxingGloveScore.score).toBe(70);
    expect(crossCompanyBoxingGloveScore.matched).toEqual(expect.arrayContaining(["authenticated"]));
    expect(crossCompanyBoxingGloveScore.matched).not.toContain("authentication company");
    expect(autographMarketRelevanceScore({ title: "Muhammad Ali signed boxing glove unauthenticated" }, boxingGloveTarget).score).toBe(60);

    const baseballGloveTarget = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball glove",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball Glove" },
    });
    const baseballMitt = { title: "Babe Ruth signed baseball mitt" };
    expect(autographMarketRelevanceScore(baseballMitt, baseballGloveTarget).matched).toContain("signed item type");
    expect(autographObjectTypeMismatchReason(baseballGloveTarget, baseballMitt)).toBeNull();
    expect(autographObjectTypeMismatchReason(baseballGloveTarget, { title: "Babe Ruth signed baseball" })).toContain("different signed object types");
  });

  it("requires core identity and a 70-point minimum before Autographs valuation", () => {
    const target = buildVisualTargetMetadata({
      title: "Muhammad Ali signed boxing glove",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Muhammad Ali", signedItemType: "Boxing Glove", authenticationCompany: "Beckett Authentication Services" },
    });
    expect(autographValuationEligibility({ title: "Muhammad Ali signed boxing glove" }, target)).toMatchObject({ eligible: false });
    expect(autographValuationEligibility({ title: "Muhammad Ali signed boxing glove PSA/DNA" }, target)).toMatchObject({ eligible: true });
    expect(autographValuationEligibility({ title: "Muhammad Ali signed boxing card PSA/DNA" }, target)).toMatchObject({ eligible: false });
  });

  it("keeps multi-signed candidates out of single-signer valuation", () => {
    const target = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", authenticationCompany: "BAS" },
    });
    const multiSigned = { title: "Signed (8) Sandlot Babe Ruth Baseball Guiry Leopardi Renna +5 w/ Character BAS" };
    expect(autographMultiSignatureReason(target, multiSigned)).toContain("8 signers");
    expect(autographValuationEligibility(multiSigned, target)).toMatchObject({ eligible: false });
    expect(autographValuationEligibility({ title: "Babe Ruth signed baseball BAS" }, target)).toMatchObject({ eligible: true });
  });

  it("does not treat Baseball's theme wording as a physical baseball", () => {
    const target = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", authenticationCompany: "BAS" },
    });
    const card = { title: "Babe Ruth signed Baseball's Greatest Players card BAS" };
    expect(autographValuationEligibility(card, target)).toMatchObject({ eligible: false });
    expect(autographValuationEligibility(card, target).reasons).toEqual(expect.arrayContaining([
      "signed object type is missing or does not match the target",
    ]));
  });

  it("keeps explicit country/version identity variants out of valuation", () => {
    const target = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", authenticationCompany: "BAS" },
    });
    const variant = { title: "Babe Ruth Japanese Version signed baseball BAS" };
    expect(autographIdentityConflictReason(target, variant)).toContain("Japanese Version");
    expect(autographValuationEligibility(variant, target)).toMatchObject({ eligible: false });
  });

  it("keeps Signed Item candidates as ranked market context and never calls vision", async () => {
    const target = buildVisualTargetMetadata({
      title: "Michael Jordan signed puck",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Michael Jordan", signedItemType: "Puck", authenticationCompany: "JSA" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "Autograph market range",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: target,
      listings: [
        { title: "Michael Jordan signed puck JSA", itemDetails: JSON.stringify({ signer: "Michael Jordan", signedItemType: "Puck", authenticationCompany: "JSA" }), imageUrl: "https://example.com/strong.jpg" },
        { title: "Michael Jordan signed puck PSA/DNA", itemDetails: JSON.stringify({ signer: "Michael Jordan", signedItemType: "Puck", authenticationCompany: "PSA/DNA" }), imageUrl: "https://example.com/weak.jpg" },
      ],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toEqual([]);
    expect(result.contextListings).toHaveLength(2);
    expect(result.contextListings?.[0].metadataMatchRank).toBe(1);
    expect(result.contextListings?.[0].metadataMatchScore).toBeGreaterThan(result.contextListings?.[1].metadataMatchScore as number);
    expect(result.contextListings?.every((listing) => listing.evidenceDisposition === "valuation_eligible")).toBe(true);
    expect(result.note).toContain("not sent to visual analysis");
  });

  it("excludes explicit Autographs replica candidates without excluding unknown authenticity", async () => {
    const target = buildVisualTargetMetadata({
      title: "Michael Jordan signed puck",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Michael Jordan", signedItemType: "Puck", authenticationCompany: "JSA" },
    });
    const replica = { title: "Michael Jordan signed replica puck JSA", imageUrl: "https://example.com/replica.jpg" };
    const structuredReplica = { title: "Michael Jordan signed puck JSA", itemDetails: JSON.stringify({ reproduction: "Yes" }), imageUrl: "https://example.com/reproduction.jpg" };
    const unknown = { title: "Michael Jordan signed puck JSA", imageUrl: "https://example.com/unknown.jpg" };
    expect(autographReplicaReason(replica)).toContain("replica");
    expect(autographReplicaReason(unknown)).toBeNull();
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "Autograph market range",
      targetMetadata: target,
      listings: [replica, structuredReplica, unknown],
    });
    expect(result.contextListings?.map((listing) => listing.title)).toEqual([unknown.title]);
    expect(result.removedCount).toBe(2);
    expect(result.preVisualExcludedCount).toBe(2);
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
  });

  it("does not let Autographs Collection/Lot enter the Signed Item market path", async () => {
    const target = buildVisualTargetMetadata({
      title: "Michael Jordan autograph collection",
      category: "autographs",
      itemType: "collection_lot",
      fullItemDetails: { numberOfSignedItems: "5" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "marketplace",
      sourceLabel: "Autograph collection lot",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: target,
      listings: [{ title: "Michael Jordan signed items lot", imageUrl: "https://example.com/lot.jpg" }],
    });
    expect(isAutographSignedItemTarget(target)).toBe(false);
    expect(result.listings).toEqual([]);
    expect(result.contextListings?.[0].evidenceDisposition).toBe("context_only");
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
  });

  it("excludes clearly different signed objects from a signed-baseball market range", async () => {
    const target = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", authenticationCompany: "JSA" },
    });
    const photo = { title: "Babe Ruth signed 8x10 photo JSA", imageUrl: "https://example.com/photo.jpg" };
    const card = { title: "Babe Ruth signed baseball card JSA", imageUrl: "https://example.com/card.jpg" };
    const baseball = { title: "Babe Ruth signed baseball JSA", imageUrl: "https://example.com/baseball.jpg" };
    const unknown = { title: "Babe Ruth signed autograph JSA", imageUrl: "https://example.com/unknown-object.jpg" };
    expect(autographObjectTypeMismatchReason(target, photo)).toContain("signed photo");
    expect(autographObjectTypeMismatchReason(target, card)).toContain("signed card");
    expect(autographObjectTypeMismatchReason(target, baseball)).toBeNull();
    expect(autographObjectTypeMismatchReason(target, unknown)).toBeNull();
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "Autograph market range",
      targetMetadata: target,
      listings: [photo, card, baseball, unknown],
    });
    expect(result.contextListings?.map((listing) => listing.title)).toEqual([baseball.title, unknown.title]);
    expect(result.removedCount).toBe(2);
    expect(result.preVisualExcludedCount).toBe(2);
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
  });

  it("applies Pokémon Single Card identity filters and ranking", () => {
    const target = buildVisualTargetMetadata({
      title: "1999 Pokémon Charizard #4/102",
      category: "pokemon",
      itemType: "single_card",
      fullItemDetails: { cardName: "Charizard", setName: "Base Set", cardNumber: "4/102", year: "1999", language: "English", finish: "Holo", cardType: "Regular", rarity: "Holo Rare", editionEra: "Wizards" },
    });
    const score = pokemonVisualScore({
      title: "1999 Pokémon Charizard Base Set #4/102 English Holo Regular Holo Rare Wizards",
      itemDetails: JSON.stringify({ cardName: "Charizard", setName: "Base Set", cardNumber: "4/102", language: "English", finish: "Holo", cardType: "Regular", rarity: "Holo Rare", editionEra: "Wizards" }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining(["cardName", "setName", "cardNumber", "language", "finish", "cardType"]));
    expect(pokemonVisualCap(score.score)).toBe(8);
    expect(buildDeclaredIdentityReviews([{ title: "1999 Pokémon Charizard Base Set #4/130 English Holo" }], target)[0]?.rationale).toContain("Card/catalog number differs");
    expect(buildDeclaredIdentityReviews([{ title: "1999 Pokémon Charizard Base Set #4/102" }], target)).toEqual([]);
  });

  it("uses the approved Pokémon visual-review cap bands", () => {
    expect(pokemonVisualCap(100)).toBe(8);
    expect(pokemonVisualCap(90)).toBe(8);
    expect(pokemonVisualCap(89)).toBe(6);
    expect(pokemonVisualCap(80)).toBe(6);
    expect(pokemonVisualCap(79)).toBe(4);
    expect(pokemonVisualCap(70)).toBe(4);
    expect(pokemonVisualCap(69)).toBe(2);
    expect(pokemonVisualCap(60)).toBe(2);
    expect(pokemonVisualCap(59)).toBe(0);
    expect(pokemonVisualCap(0)).toBe(0);
  });

  it("applies Pokémon Set and Unopened Product filters while preserving unknown fields", () => {
    const setTarget = buildVisualTargetMetadata({ title: "Pokémon Base Set Complete Set", category: "pokemon", itemType: "set", fullItemDetails: { setName: "Base Set", language: "English", setType: "Complete Set", numberOfCardsInSet: "102", year: "1999" } });
    const setScore = pokemonVisualScore({ title: "Pokémon Base Set English Complete Set of 102 Cards 1999" }, setTarget);
    expect(setScore.score).toBe(95);
    expect(buildDeclaredIdentityReviews([{ title: "Pokémon Jungle Complete Set English", itemDetails: JSON.stringify({ setName: "Jungle", numberOfCardsInSet: "64" }) }], setTarget)[0]?.rationale).toContain("set differs");

    const productTarget = buildVisualTargetMetadata({ title: "Pokémon Base Set Booster Box Factory Sealed", category: "pokemon", itemType: "unopened_product", fullItemDetails: { productName: "Booster Box", setName: "Base Set", productType: "Booster Box", language: "English", releaseYear: "1999", factorySealed: "Yes", authenticated: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" } });
    const productScore = pokemonVisualScore({ title: "Pokémon Base Set English Booster Box 1999 Factory Sealed BBCE FASC", itemDetails: JSON.stringify({ productName: "Booster Box", setName: "Base Set", productType: "Booster Box", language: "English", releaseYear: "1999", factorySealed: "Yes", authenticated: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" }) }, productTarget);
    expect(productScore.score).toBe(100);
    expect(buildDeclaredIdentityReviews([{ title: "Pokémon Base Set English Booster Box Opened", itemDetails: JSON.stringify({ productName: "Booster Box", setName: "Base Set", productType: "Booster Box", language: "English", releaseYear: "1999", factorySealed: "No", authenticated: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" }) }], productTarget)[0]?.rationale).toContain("seal status differs");
  });

  it("does not rank or compare Pokémon Collection/Lot targets", () => {
    const target = buildVisualTargetMetadata({ title: "Mixed Pokémon Collection", category: "pokemon", itemType: "collection_lot", fullItemDetails: { approximateItemCount: 100 } });
    expect(pokemonVisualScore({ title: "Charizard Base Set #4/102" }, target).score).toBe(0);
    expect(buildDeclaredIdentityReviews([{ title: "Charizard Base Set #4/102" }], target)).toEqual([]);
  });

  it("scores Stamps / Single Stamp on the approved identity signals", () => {
    const target = buildVisualTargetMetadata({
      title: "United States Scott C1 24c Mint Never Hinged",
      category: "stamps",
      itemType: "single_stamp",
      grade: "MNH",
      fullItemDetails: {
        country: "United States", scottNumber: "C1", year: "1918", denomination: "24c",
        mintOrUsed: "Mint", hinged: "Never Hinged", gum: "Original Gum", perforation: "12", watermark: "Single line",
        overprintSurcharge: "Airmail", format: "single stamp",
      },
    });
    const score = stampsSingleVisualScore({
      title: "United States Scott C1 1918 24c Airmail MNH Never Hinged Perforated 12 Single line watermark",
      imageUrl: "https://example.com/stamp.jpg",
      itemDetails: JSON.stringify({ denomination: "24c", mintOrUsed: "Mint", hinged: "Never Hinged", gum: "OG", perforation: "12", watermark: "Single line", overprintSurcharge: "Airmail" }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining(["scottNumber", "country", "year", "denomination", "format", "mintOrUsed", "hingeStatus", "gumType"]));
  });
  it("scores Hinge Status and Gum Type independently and identifies a gum mismatch", () => {
    const target = buildVisualTargetMetadata({
      title: "United States Scott C1 24c Mint Never Hinged Original Gum",
      category: "stamps",
      itemType: "single_stamp",
      fullItemDetails: { country: "United States", scottNumber: "C1", year: "1918", denomination: "24c", mintOrUsed: "Mint", hinged: "Never Hinged", gum: "Original Gum", format: "single stamp" },
    });
    const partial = stampsSingleVisualScore({ title: "United States Scott C1 1918 24c MNH", itemDetails: JSON.stringify({ gum: "Unknown" }) }, target);
    expect(partial.matched).toContain("hingeStatus");
    expect(partial.matched).not.toContain("gumType");
    expect(partial.unknown).toContain("gumType");
    const wrongGum = buildDeclaredIdentityReviews([{ title: "United States Scott C1 24c MNH No Gum", imageUrl: "https://example.com/stamp.jpg" }], target);
    expect(wrongGum[0]?.rationale).toContain("gum type differs");
  });
  it("scores Stamps / Stamp Set or Sheet on the approved identity signals", () => {
    const target = buildVisualTargetMetadata({
      title: "1976 United States Bicentennial Mint Set",
      category: "stamps",
      itemType: "stamp_set___sheet",
      grade: "95",
      certificationCompany: "PSE",
      fullItemDetails: {
        country: "United States", setNameDescription: "Bicentennial", year: "1976", sheetType: "Set",
        numberOfStamps: "4", mintOrUsed: "Mint", format: "set",
      },
    });
    const score = stampsSetVisualScore({
      title: "1976 United States Bicentennial Mint Set 4 Stamps PSE 95",
      imageUrl: "https://example.com/set.jpg",
      itemDetails: JSON.stringify({ setNameDescription: "Bicentennial", year: "1976", sheetType: "Set", numberOfStamps: 4, mintOrUsed: "Mint", format: "set" }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining(["setName", "country", "year", "sheetType", "numberOfStamps", "mintOrUsed"]));
  });
  it("uses the approved Stamps score-band caps", () => {
    expect(stampsSingleVisualCap(95)).toBe(8);
    expect(stampsSingleVisualCap(85)).toBe(6);
    expect(stampsSingleVisualCap(75)).toBe(4);
    expect(stampsSingleVisualCap(65)).toBe(2);
    expect(stampsSingleVisualCap(59)).toBe(0);
    expect(stampsSetVisualCap(95)).toBe(8);
    expect(stampsSetVisualCap(85)).toBe(6);
    expect(stampsSetVisualCap(75)).toBe(4);
    expect(stampsSetVisualCap(65)).toBe(2);
    expect(stampsSetVisualCap(59)).toBe(0);
  });
  it("pre-excludes wrong Scott numbers and individual stamps from set targets", () => {
    const singleTarget = buildVisualTargetMetadata({ title: "United States Scott C1 24c", category: "stamps", itemType: "single_stamp", fullItemDetails: { country: "United States", scottNumber: "C1", denomination: "24c" } });
    const wrongScott = buildDeclaredIdentityReviews([{ title: "United States Scott C2 6c", imageUrl: "https://example.com/a.jpg" }], singleTarget);
    expect(wrongScott[0]?.rationale).toContain("Scott/catalog number differs");
    const setTarget = buildVisualTargetMetadata({ title: "1976 United States Stamp Set", category: "stamps", itemType: "stamp_set___sheet", fullItemDetails: { country: "United States", setNameDescription: "1976", sheetType: "Set" } });
    const individual = buildDeclaredIdentityReviews([{ title: "1976 United States Scott C1 single stamp", imageUrl: "https://example.com/b.jpg" }], setTarget);
    expect(individual[0]?.rationale).toContain("format differs");
  });
  it("does not apply Stamps filters or ranking to Collection/Lot", () => {
    const target = buildVisualTargetMetadata({ title: "United States Stamp Collection", category: "stamps", itemType: "collection_lot", fullItemDetails: { approximateQuantity: 100 } });
    const candidate = { title: "United States Scott C1 single stamp", imageUrl: "https://example.com/c.jpg" };
    expect(buildDeclaredIdentityReviews([candidate], target)).toEqual([]);
    expect(stampsSingleVisualScore(candidate, target).score).toBe(0);
    expect(stampsSetVisualScore(candidate, target).score).toBe(0);
  });


  it("scores Movies / Individual Movie and Box Set independently", () => {
    const individualTarget = buildVisualTargetMetadata({ title: "The Matrix", category: "movies", itemType: "individual_movie", fullItemDetails: { title: "The Matrix", format: "Blu-ray", releaseYear: 1999, edition: "Standard", region: "Region 1", sealed: "No" } });
    const individualScore = moviesIndividualVisualScore({ title: "Matrix Blu-ray 1999 Standard Region 1 Opened", itemDetails: JSON.stringify({ format: "Blu-ray", releaseYear: 1999, edition: "Standard", region: "Region 1", sealed: "No" }) }, individualTarget);
    expect(individualScore.score).toBe(100);
    expect(individualScore.matched).toEqual(expect.arrayContaining(["movieTitle", "format", "releaseYear", "edition", "region", "sealed"]));

    const boxTarget = buildVisualTargetMetadata({ title: "The Lord of the Rings Trilogy", category: "movies", itemType: "box_set", fullItemDetails: { boxSetName: "The Lord of the Rings Trilogy", format: "Blu-ray", numberOfMovies: 3, edition: "Standard", sealed: "Yes" } });
    const boxScore = moviesBoxSetVisualScore({ title: "Lord of the Rings Trilogy 3 Movie Blu-ray Box Set Standard Sealed", itemDetails: JSON.stringify({ format: "Blu-ray", numberOfMovies: 3, edition: "Standard", sealed: "Yes" }) }, boxTarget);
    expect(boxScore.score).toBe(90);
    expect(boxScore.matched).toEqual(expect.arrayContaining(["boxSetName", "format", "numberOfMovies", "edition", "sealed"]));
  });

  it("uses the approved Movies score-band cap limits", () => {
    expect(moviesVisualCap(95)).toBe(8);
    expect(moviesVisualCap(85)).toBe(6);
    expect(moviesVisualCap(75)).toBe(4);
    expect(moviesVisualCap(65)).toBe(2);
    expect(moviesVisualCap(59)).toBe(0);
    const collectionTarget = buildVisualTargetMetadata({ title: "Movie Collection", category: "movies", itemType: "collection_lot" });
    expect(moviesIndividualVisualScore({ title: "The Matrix", imageUrl: "https://example.com/movie.jpg" }, collectionTarget).score).toBe(0);
    expect(moviesBoxSetVisualScore({ title: "Movie Box Set", imageUrl: "https://example.com/set.jpg" }, collectionTarget).score).toBe(0);
  });

  it("scores Video Games / Game, Console, and Accessory independently", () => {
    const gameTarget = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemType: "game", fullItemDetails: { gameTitle: "Super Mario Bros. 3", platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" } });
    const gameScore = videoGameGameVisualScore({ title: "Super Mario Bros. 3 NES 1990 NTSC-U Standard", itemDetails: JSON.stringify({ platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" }) }, gameTarget);
    expect(gameScore.score).toBe(90);
    expect(gameScore.matched).toEqual(expect.arrayContaining(["gameTitle", "platform", "releaseYear", "region", "edition", "upcEan"]));
    expect(gameScore.unknown).toContain("productForm");

    const consoleTarget = buildVisualTargetMetadata({ title: "Nintendo NES", category: "video_games", itemType: "console", fullItemDetails: { consoleName: "NES", modelNumber: "NES-001", region: "NTSC-U", workingCondition: "Working", originalBoxIncluded: "Yes", cablesIncluded: "Yes", controllersIncluded: "Yes" } });
    const consoleScore = videoGameConsoleVisualScore({ title: "Nintendo NES NES-001 Working NTSC-U", itemDetails: JSON.stringify({ modelNumber: "NES-001", region: "NTSC-U", workingCondition: "Working", originalBoxIncluded: "Yes", cablesIncluded: "Yes", controllersIncluded: "Yes" }) }, consoleTarget);
    expect(consoleScore.score).toBe(100);
    expect(consoleScore.matched).toEqual(expect.arrayContaining(["consoleName", "modelNumber", "region", "workingCondition", "originalBoxIncluded", "cablesIncluded", "controllersIncluded"]));

    const accessoryTarget = buildVisualTargetMetadata({ title: "NES Controller", category: "video_games", itemType: "accessory", fullItemDetails: { accessoryType: "Controller", accessoryName: "NES Controller", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working", originalPackaging: "Yes" } });
    const accessoryScore = videoGameAccessoryVisualScore({ title: "Nintendo NES Controller Working", itemDetails: JSON.stringify({ accessoryType: "Controller", accessoryName: "NES Controller", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working", originalPackaging: "Yes" }) }, accessoryTarget);
    expect(accessoryScore.score).toBe(100);
    expect(accessoryScore.matched).toEqual(expect.arrayContaining(["accessoryType", "accessoryName", "compatiblePlatform", "manufacturer", "workingCondition", "originalPackaging"]));
  });

  it("uses the approved Video Games score-band cap limits", () => {
    expect(videoGameVisualCap(95)).toBe(8);
    expect(videoGameVisualCap(85)).toBe(6);
    expect(videoGameVisualCap(75)).toBe(4);
    expect(videoGameVisualCap(65)).toBe(2);
    expect(videoGameVisualCap(59)).toBe(0);
  });

  it("promotes eBay thumbnails without rewriting non-eBay image URLs", () => {
    expect(promoteEbayImageUrl("https://i.ebayimg.com/images/g/abc/s-l500.jpg")).toBe("https://i.ebayimg.com/images/g/abc/s-l1600.jpg");
    expect(promoteEbayImageUrl("https://example.com/image-s-l500.jpg")).toBe("https://example.com/image-s-l500.jpg");
  });

  it("scores Comics / Single Comic candidates on the approved identity signals", () => {
    const target = buildVisualTargetMetadata({
      title: "The Amazing Spider-Man #300 Regular Cover",
      category: "comics",
      itemType: "single_comic",
      grade: "9.6",
      certificationCompany: "CGC",
      fullItemDetails: {
        comicTitle: "Amazing Spider-Man",
        issueNumber: "300",
        publisher: "Marvel",
        distributionType: "Direct",
        variantDescription: "Regular Cover",
        publicationYear: "1988",
        facsimile: "No",
        signed: "No",
      },
    });
    const score = comicsSingleVisualScore({
      title: "Amazing Spider-Man #300 Marvel 1988 Direct Regular Cover Original Unsigned CGC 9.6",
      imageUrl: "https://example.com/comic.jpg",
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining([
      "comicTitle", "issueNumber", "grade", "gradingCompany", "variant", "publisher",
      "publicationYear", "distributionType", "facsimile", "signed",
    ]));
  });

  it("uses the approved Comics / Single Comic score-band visual caps", () => {
    expect(comicsSingleVisualCap(95)).toBe(10);
    expect(comicsSingleVisualCap(85)).toBe(8);
    expect(comicsSingleVisualCap(75)).toBe(6);
    expect(comicsSingleVisualCap(65)).toBe(4);
    expect(comicsSingleVisualCap(55)).toBe(2);
    expect(comicsSingleVisualCap(49)).toBe(0);
  });

  it("scores Coins / Single Coin candidates on the approved identity signals", () => {
    const target = buildVisualTargetMetadata({
      title: "1903-S Morgan Silver Dollar PCGS MS63 First Strike",
      category: "coins",
      itemType: "single_coin",
      grade: "MS63",
      certificationCompany: "PCGS",
      fullItemDetails: {
        series: "Morgan Dollar",
        year: "1903",
        denomination: "1 Dollar",
        mintMark: "S",
        variety: "Morgan",
        designation: "First Strike",
        composition: "Silver",
        country: "United States",
      },
    });
    const score = coinsSingleVisualScore({
      title: "1903-S Morgan Silver Dollar PCGS MS63 First Strike",
      imageUrl: "https://example.com/coin.jpg",
      itemDetails: JSON.stringify({
        series: "Morgan Dollar",
        year: "1903",
        denomination: "1 Dollar",
        mintMark: "S",
        variety: "Morgan",
        designation: "First Strike",
        composition: "Silver",
        country: "United States",
      }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining([
      "coinTitleSeriesType", "yearDate", "denomination", "mintMark", "variety",
      "numericGrade", "gradingCompany", "designationStrikeFinish", "compositionMetal", "countryIssuingAuthority",
    ]));
  });

  it("uses the approved Coins / Single Coin score-band visual caps", () => {
    expect(coinsSingleVisualCap(95)).toBe(8);
    expect(coinsSingleVisualCap(85)).toBe(6);
    expect(coinsSingleVisualCap(75)).toBe(4);
    expect(coinsSingleVisualCap(65)).toBe(2);
    expect(coinsSingleVisualCap(59)).toBe(0);
  });

  it("scores Coins / Coin Set candidates on set identity and packaging signals", () => {
    const target = buildVisualTargetMetadata({
      title: "1999 United States Silver Proof Set",
      category: "coins",
      itemType: "coin_set",
      fullItemDetails: {
        setName: "Silver Proof Set",
        country: "United States",
        year: "1999",
        setType: "Proof Set",
        numberOfCoins: "5",
        originalPackagingIncluded: "Yes",
      },
    });
    const score = coinsSetVisualScore({
      title: "1999 United States Silver Proof Set of 5 Coins with Original Packaging",
      imageUrl: "https://example.com/coin-set.jpg",
      itemDetails: JSON.stringify({
        setName: "Silver Proof Set",
        country: "United States",
        year: "1999",
        setType: "Proof Set",
        numberOfCoins: "5",
        originalPackagingIncluded: "Yes",
      }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining([
      "setNameSeries", "yearDate", "countryIssuingAuthority", "setType", "numberOfCoins", "originalPackagingIncluded",
    ]));
  });

  it("uses the approved Coins / Coin Set score-band visual caps", () => {
    expect(coinsSetVisualCap(95)).toBe(8);
    expect(coinsSetVisualCap(85)).toBe(6);
    expect(coinsSetVisualCap(75)).toBe(4);
    expect(coinsSetVisualCap(65)).toBe(2);
    expect(coinsSetVisualCap(59)).toBe(0);
  });

  it("scores Coins / Paper Money candidates on the approved banknote signals", () => {
    const target = buildVisualTargetMetadata({
      title: "1934A $1,000 Federal Reserve Note PMG 64",
      category: "coins",
      itemType: "paper_money",
      grade: "64",
      certificationCompany: "PMG",
      fullItemDetails: {
        country: "United States",
        denomination: "$1,000",
        year: "1934",
        series: "Federal Reserve Note",
        signed: "No",
        condition: "excellent",
      },
    });
    const score = paperMoneyVisualScore({
      title: "1934A United States $1,000 Federal Reserve Note PMG 64 Unsigned",
      imageUrl: "https://example.com/note.jpg",
      itemDetails: JSON.stringify({ country: "United States", denomination: "$1,000", year: "1934", series: "Federal Reserve Note", signed: "No", condition: "excellent" }),
      gradingCompany: "PMG",
      grade: "64",
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining([
      "country", "denomination", "yearDate", "titleSeries", "numericGrade", "gradingCompany", "signature", "condition",
    ]));
  });

  it("uses the approved Coins / Paper Money score-band visual caps", () => {
    expect(paperMoneyVisualCap(95)).toBe(8);
    expect(paperMoneyVisualCap(85)).toBe(6);
    expect(paperMoneyVisualCap(75)).toBe(4);
    expect(paperMoneyVisualCap(65)).toBe(2);
    expect(paperMoneyVisualCap(59)).toBe(0);
  });

  it("holds an explicitly different Paper Money country, denomination, or year as context", () => {
    const target = buildVisualTargetMetadata({
      title: "1934A $1,000 Federal Reserve Note",
      category: "coins",
      itemType: "paper_money",
      fullItemDetails: { country: "United States", denomination: "$1,000", year: "1934" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1935A Canada $1,000 Banknote", imageUrl: "https://example.com/note.jpg" },
    ], target);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.rationale).toContain("Paper Money");
  });

  it("holds an individual graded coin as context when the target is a Coin Set", () => {
    const target = buildVisualTargetMetadata({
      title: "1999 United States Silver Proof Set",
      category: "coins",
      itemType: "coin_set",
      fullItemDetails: { setName: "Silver Proof Set", country: "United States", year: "1999", setType: "Proof Set" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1999-S Silver Dollar PCGS PR69", imageUrl: "https://example.com/coin.jpg" },
    ], target);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.rationale).toContain("individual coin");
  });

  it("ranks Coins / Single Coin candidates and retains low-score rows as context only", async () => {
    const target = buildVisualTargetMetadata({
      title: "1903 Morgan Silver Dollar PCGS MS63",
      category: "coins",
      itemType: "single_coin",
      grade: "MS63",
      certificationCompany: "PCGS",
      fullItemDetails: { series: "Morgan Dollar", year: "1903", denomination: "1 Dollar", variety: "Morgan" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "marketplace",
      sourceLabel: "Coin ranking test",
      targetMetadata: target,
      listings: [
        { title: "1903 Morgan Silver Dollar PCGS MS63", imageUrl: "https://example.com/strong.jpg" },
        { title: "Morgan Dollar", imageUrl: "https://example.com/weak.jpg" },
      ],
    });
    expect(result.listings).toEqual([]);
    expect(result.contextListings).toHaveLength(1);
    expect(result.contextListings?.[0]).toMatchObject({ metadataMatchRank: 2, metadataMatchScore: 45, visualReviewStatus: "not_reviewed" });
    expect(result.contextListings?.[0]?.visualReviewRationale).toContain("below the visual-review minimum of 60");
  });

  it("caps exact Coins / Single Coin candidates at eight visual-review requests and retains the ninth as ranked context", async () => {
    const target = buildVisualTargetMetadata({
      title: "1903-S Morgan Silver Dollar PCGS MS63 First Strike",
      category: "coins",
      itemType: "single_coin",
      grade: "MS63",
      certificationCompany: "PCGS",
      fullItemDetails: {
        series: "Morgan Dollar", year: "1903", denomination: "1 Dollar", mintMark: "S",
        variety: "Morgan", designation: "First Strike", composition: "Silver", country: "United States",
      },
    });
    mockedInvokeLLM.mockResolvedValue(structuredVisualResponse({
      reviews: [{
        candidateIndex: 0,
        verdict: "mismatch",
        confidence: "high",
        rationale: "The candidate does not show the same coin.",
        visualEvidence: { identityMatches: false, dateMatches: false, varietyMatches: false, denominationMatches: false, mintMarkMatches: false },
      }],
    }) as never);
    const itemDetails = JSON.stringify({
      series: "Morgan Dollar", year: "1903", denomination: "1 Dollar", mintMark: "S",
      variety: "Morgan", designation: "First Strike", composition: "Silver", country: "United States",
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "Coin cap test",
      targetImageUrl: "https://example.com/target-coin.jpg",
      targetMetadata: target,
      listings: Array.from({ length: 9 }, (_, index) => ({
        title: `1903-S Morgan Silver Dollar PCGS MS63 First Strike listing ${index + 1}`,
        itemDetails,
        imageUrl: `https://example.com/coin-${index}.jpg`,
      })),
    });
    expect(result.reviewedCount).toBe(8);
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(16);
    expect(result.contextListings).toEqual(expect.arrayContaining([
      expect.objectContaining({ metadataMatchRank: 9, metadataMatchScore: 100, visualReviewStatus: "not_reviewed" }),
    ]));
    expect(result.contextListings?.[0]?.visualReviewRationale).toContain("visual cap reached (8)");
  });

  it("ranks Comics / Single Comic candidates before applying the visual cap and preserves unknown fields", async () => {
    const target = buildVisualTargetMetadata({
      title: "Amazing Spider-Man #300",
      category: "comics",
      itemType: "single_comic",
      fullItemDetails: { comicTitle: "Amazing Spider-Man", issueNumber: "300", publisher: "Marvel" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "marketplace",
      sourceLabel: "Comics ranking test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: target,
      listings: [
        { title: "Amazing Spider-Man #300 Marvel", imageUrl: "https://example.com/strong.jpg" },
        { title: "Amazing Spider-Man", imageUrl: "https://example.com/weak.jpg" },
      ],
    });
    expect(result.listings[0]).toMatchObject({ metadataMatchRank: 1, metadataMatchScore: 50 });
    expect(result.listings[1]).toMatchObject({ metadataMatchRank: 2, metadataMatchScore: 20 });
    expect(result.listings).toHaveLength(2);
  });

  it("scores Sports Cards single-card candidates on explicit identity signals", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Upper Deck Ken Griffey Jr #1 PSA 10",
      category: "sports_cards",
      itemType: "single_card",
      grade: "10",
      certificationCompany: "PSA",
      fullItemDetails: {
        player: "Ken Griffey Jr",
        year: "1989",
        manufacturer: "Upper Deck",
        setName: "Upper Deck",
        cardNumber: "1",
        rookieStatus: "Yes",
      },
    });
    const score = sportsCardSingleVisualScore({
      title: "1989 Upper Deck Ken Griffey Jr #1 Rookie RC PSA 10",
      grade: "10",
      gradingCompany: "PSA",
      imageUrl: "https://example.com/card.jpg",
    }, target);
    expect(score.score).toBeGreaterThanOrEqual(90);
    expect(score.matched).toEqual(expect.arrayContaining(["player", "year", "manufacturerOrSet", "cardNumber", "gradingCompany", "grade", "singleCardForm", "rookieStatus"]));
  });

  it("uses the approved Sports Cards score-band visual caps", () => {
    expect(sportsCardSingleVisualCap(95)).toBe(10);
    expect(sportsCardSingleVisualCap(85)).toBe(8);
    expect(sportsCardSingleVisualCap(75)).toBe(6);
    expect(sportsCardSingleVisualCap(65)).toBe(4);
    expect(sportsCardSingleVisualCap(55)).toBe(2);
    expect(sportsCardSingleVisualCap(49)).toBe(0);
  });

  it("scores Sports Cards sets on set identity and condition signals", () => {
    const target = buildVisualTargetMetadata({
      title: "1986 Fleer Complete Factory Set",
      category: "sports_cards",
      itemType: "set",
      fullItemDetails: {
        setName: "Fleer",
        year: "1986",
        manufacturer: "Fleer",
        setType: "factory_set",
        missingCards: "No",
        factorySealed: "Yes",
        sport: "Football",
      },
    });
    const score = sportsCardSetVisualScore({
      title: "1986 Fleer Football Complete Factory Sealed Set",
      imageUrl: "https://example.com/set.jpg",
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining([
      "setName", "year", "manufacturer", "setType", "missingCards", "factorySealed", "sport",
    ]));
  });

  it("uses the approved Sports Cards / Set score-band visual caps", () => {
    expect(sportsCardSetVisualCap(90)).toBe(10);
    expect(sportsCardSetVisualCap(75)).toBe(6);
    expect(sportsCardSetVisualCap(65)).toBe(3);
    expect(sportsCardSetVisualCap(55)).toBe(2);
    expect(sportsCardSetVisualCap(49)).toBe(0);
  });

  it("scores Sports Cards / Unopened Product on product identity and condition signals", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps BBCE FASC Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: {
        productName: "Topps",
        productFormat: "Box",
        productType: "Hobby",
        manufacturer: "Topps",
        year: "1989",
        authenticationCompany: "BBCE",
        factorySealed: "Yes",
        fromASealedCase: "Yes",
      },
    });
    const score = sportsCardUnopenedVisualScore({
      title: "1989 Topps BBCE FASC Hobby Box Factory Sealed",
      imageUrl: "https://example.com/box.jpg",
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining([
      "productName", "productFormat", "productType", "manufacturerOrSet", "year",
      "authenticationCompany", "factorySealed", "fromASealedCase",
    ]));
  });

  it("uses the approved Sports Cards / Unopened Product score-band caps", () => {
    expect(sportsCardUnopenedVisualCap(95)).toBe(10);
    expect(sportsCardUnopenedVisualCap(80)).toBe(6);
    expect(sportsCardUnopenedVisualCap(70)).toBe(3);
    expect(sportsCardUnopenedVisualCap(60)).toBe(2);
    expect(sportsCardUnopenedVisualCap(54)).toBe(0);
  });

  it("ranks Unopened Product candidates before applying the visual cap", async () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps BBCE FASC Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: {
        productName: "Topps", productFormat: "Box", productType: "Hobby", manufacturer: "Topps",
        year: "1989", authenticationCompany: "BBCE", factorySealed: "Yes", fromASealedCase: "Yes",
      },
    });
    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Unopened Product ranking test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: target,
      listings: [
        { title: "1989 Topps BBCE FASC Hobby Box Factory Sealed", imageUrl: "https://example.com/strong.jpg" },
        { title: "1989 Topps Hobby Box", imageUrl: "https://example.com/weak.jpg" },
      ],
    });
    expect(result.listings.length).toBeGreaterThan(0);
    expect(result.listings[0]).toMatchObject({ metadataMatchRank: 1, metadataMatchScore: 100 });
  });

  it("filters Sports Cards / Unopened Product by format and product type", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps BBCE Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: { productFormat: "Box", productType: "Hobby", factorySealed: "Yes" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1989 Topps BBCE Hobby Pack", imageUrl: "https://example.com/pack.jpg" },
      { title: "1989 Topps BBCE Retail Box", imageUrl: "https://example.com/retail.jpg" },
    ], target);
    expect(reviews).toHaveLength(2);
    expect(reviews[0]?.rationale).toContain("product format differs");
    expect(reviews[1]?.rationale).toContain("product type differs");
  });

  it("filters opened or resealed product when the target is factory sealed", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps Factory Sealed Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: { productFormat: "Box", factorySealed: "Yes" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1989 Topps Hobby Box Opened", imageUrl: "https://example.com/opened.jpg" },
      { title: "1989 Topps Hobby Box Resealed", imageUrl: "https://example.com/resealed.jpg" },
    ], target);
    expect(reviews).toHaveLength(2);
    expect(reviews[0]?.rationale).toContain("sealed status differs");
    expect(reviews[1]?.rationale).toContain("sealed status differs");
  });

  it("requires the same authentication company when authentication is explicit", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps BBCE Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: { productFormat: "Box", factorySealed: "Yes", authenticated: "Yes", authenticationCompany: "BBCE" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1989 Topps PSA Authenticated Hobby Box", imageUrl: "https://example.com/psa.jpg" },
      { title: "1989 Topps Unauthenticated Hobby Box", imageUrl: "https://example.com/raw.jpg" },
    ], target);
    expect(reviews).toHaveLength(2);
    expect(reviews[0]?.rationale).toContain("authentication company differs");
    expect(reviews[1]?.rationale).toContain("authentication status differs");
  });

  it("recognizes FASC and filters an explicit FASC contradiction", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps BBCE FASC Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: { productFormat: "Box", factorySealed: "Yes", authenticated: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1989 Topps BBCE Hobby Box Not From a Sealed Case", imageUrl: "https://example.com/not-fasc.jpg" },
      { title: "1989 Topps BBCE FASC Hobby Box", imageUrl: "https://example.com/fasc.jpg" },
    ], target);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.rationale).toContain("FASC status differs");
  });

  it("excludes individual cards, sets, collections, and lots from an unopened-product target", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: { productFormat: "Box", factorySealed: "Yes" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1989 Topps Ken Griffey Jr #1 PSA 10", imageUrl: "https://example.com/card.jpg" },
      { title: "1989 Topps Complete Set", imageUrl: "https://example.com/set.jpg" },
      { title: "1989 Topps Card Collection Lot", imageUrl: "https://example.com/lot.jpg" },
    ], target);
    expect(reviews).toHaveLength(3);
    expect(reviews.every((review) => review?.rationale.includes("rather than unopened product"))).toBe(true);
  });

  it("keeps candidates with missing unopened-product metadata eligible", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Topps Hobby Box",
      category: "sports_cards",
      itemType: "unopened_product",
      fullItemDetails: { productFormat: "Box", factorySealed: "Yes", authenticated: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "1989 Topps Hobby Box", imageUrl: "https://example.com/unknown.jpg" },
    ], target)).toEqual([]);
  });

  it("embeds only a bounded promoted eBay image for a focused grading retry", async () => {
    const fetchCalls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      fetchCalls.push(String(input));
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/webp", "content-length": "4" },
      });
    };
    const embedded = await embedPromotedEbayImageForReview(
      "https://i.ebayimg.com/images/g/abc/s-l140.webp",
      fetchImpl,
    );
    expect(fetchCalls).toEqual(["https://i.ebayimg.com/images/g/abc/s-l1600.webp"]);
    expect(embedded).toBe("data:image/webp;base64,AQIDBA==");
    expect(await embedPromotedEbayImageForReview("https://example.com/s-l140.webp", fetchImpl)).toBeNull();
    expect(fetchCalls).toHaveLength(1);
  });

  it("classifies multi-item listings across categories but preserves multi-item targets", () => {
    const singleCoin = "title=1896 Morgan Silver Dollar; category=coins; fullItemDetails={\"year\":\"1896\"}";
    const singleCard = "title=1986 Fleer Michael Jordan; category=sports_cards; itemType=single";
    const singleComic = "title=Amazing Spider-Man 300; category=comics; itemType=single";
    expect(isMultiItemLot({ title: "AU/BU Morgan Silver Dollar Lot 3: 1878, 1880, 1896" }, singleCoin)).toBe(true);
    expect(multiItemLotReason({ title: "AU/BU Morgan Silver Dollar Lot 3: 1878, 1880, 1896" }, singleCoin)).toContain("context-only");
    expect(isMultiItemLot({ title: "1986 Fleer Michael Jordan Cards 1-10" }, singleCard)).toBe(true);
    expect(isMultiItemLot({ title: "Amazing Spider-Man 299 + 300 + 301" }, singleComic)).toBe(true);
    const setTarget = "title=1986 Fleer Michael Jordan Complete Set; category=sports_cards; itemType=set; fullItemDetails={\"itemType\":\"set\",\"quantity\":132}";
    expect(isMultiItemLot({ title: "1986 Fleer Michael Jordan Complete Set" }, setTarget)).toBe(false);
  });

  it("keeps pre-visual lots in context and makes no vision call when every candidate is a lot", async () => {
    const metadata = "title=1896 Morgan Silver Dollar; category=coins; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Mercari",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: metadata,
      listings: [
        { title: "AU/BU Morgan Silver Dollar Lot 3: 1878, 1880, 1896", imageUrl: "https://example.com/lot-1.jpg" },
        { title: "1896 + 1897 Morgan Silver Dollar Group", imageUrl: "https://example.com/lot-2.jpg" },
      ],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toHaveLength(0);
    expect(result.contextListings).toHaveLength(2);
    expect(result.preVisualExcludedCount).toBe(2);
    expect(result.contextListings?.every(item => item.evidenceDisposition === "context_only")).toBe(true);
    expect(result.contextListings?.every(item => String(item.visualReviewRationale).includes("Pre-visual lot filter"))).toBe(true);
  });

  it("normalizes provider aliases and suppresses only exact same-provider duplicates before vision", () => {
    const target = buildVisualTargetMetadata({ title: "Example Item", category: "movies" });
    const normalized = normalizeVisualSourceCandidate({
      title: "Example Item",
      listingId: "same-provider-record",
      image: { imageUrl: "https://example.com/primary.jpg" },
      galleryImages: [{ url: "https://example.com/gallery.jpg" }],
      itemDetails: JSON.stringify({ quantity: "1", gradingCompany: "CGC", grade: "9.0" }),
    });
    expect(normalized).toMatchObject({
      providerReference: "same-provider-record",
      quantity: 1,
      grader: "CGC",
      grade: "9.0",
      imageUrls: ["https://example.com/primary.jpg", "https://example.com/gallery.jpg"],
    });

    const prepared = prepareUniversalVisualCandidates([
      { title: "Example Item", saleId: "sale-1", imageUrl: "https://example.com/first.jpg" },
      { title: "Example Item duplicate provider row", saleId: "sale-1", imageUrl: "https://example.com/second.jpg" },
      { title: "Example Item separate sale", saleId: "sale-2", imageUrl: "https://example.com/third.jpg" },
      { title: "Example Item unknown source reference", imageUrl: "https://example.com/fourth.jpg" },
    ], target);
    expect(prepared.contextReasons.get(1)).toContain("same provider record reference");
    expect(prepared.contextReasons.has(2)).toBe(false);
    expect(prepared.contextReasons.has(3)).toBe(false);
    expect(prepared.listings[0].imageUrls).toEqual(["https://example.com/first.jpg", "https://example.com/second.jpg"]);
  });

  it("retains unusable-image candidates as context before vision without treating them as matches", async () => {
    const target = buildVisualTargetMetadata({ title: "Example Item", category: "movies" });
    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Cross-source image readiness test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: target,
      listings: [
        { title: "Example Item HTTP", imageUrl: "http://example.com/not-allowed.jpg" },
        { title: "Example Item missing" },
      ],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toEqual([]);
    expect(result.contextListings).toHaveLength(2);
    expect(result.contextListings?.every((item) => String(item.visualReviewRationale).includes("No candidate image"))).toBe(true);
  });

  it("ranks image-less Sports Cards before retaining them as context-only", async () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Upper Deck Ken Griffey Jr #1 PSA 10",
      category: "sports_cards",
      itemType: "single_card",
      grade: "10",
      certificationCompany: "PSA",
      fullItemDetails: { player: "Ken Griffey Jr", year: "1989", manufacturer: "Upper Deck", cardNumber: "1" },
    });
    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Goldin",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: target,
      listings: [
        { title: "1989 Upper Deck Ken Griffey Jr #1 PSA 10", grade: "10", gradingCompany: "PSA" },
        { title: "1989 Upper Deck Ken Griffey Jr #1 rookie card" },
      ],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toHaveLength(0);
    expect(result.contextListings).toHaveLength(2);
    expect(result.contextListings?.[0]).toMatchObject({ metadataMatchRank: 1, visualReviewStatus: "not_reviewed", evidenceDisposition: "context_only" });
    expect(result.contextListings?.[0].metadataMatchScore).toBeGreaterThan(result.contextListings?.[1].metadataMatchScore as number);
  });

  it("applies universal quantity and material-state rules only to explicit contradictions", () => {
    const singleTarget = buildVisualTargetMetadata({ title: "Target collectible", category: "movies" });
    const singlePrepared = prepareUniversalVisualCandidates([
      { title: "Target collectible", quantity: 2, imageUrl: "https://example.com/quantity.jpg" },
    ], singleTarget);
    expect(singlePrepared.contextReasons.get(0)).toContain("target quantity is 1");

    const multiTarget = buildVisualTargetMetadata({ title: "Target collectible", category: "movies", itemDetails: JSON.stringify({ quantity: 2 }) });
    expect(prepareUniversalVisualCandidates([
      { title: "Target collectible", quantity: 2, imageUrl: "https://example.com/multi.jpg" },
    ], multiTarget).contextReasons).toEqual(new Map());

    const cases = [
      [buildVisualTargetMetadata({ title: "Target Factory Sealed", category: "movies" }), "Target opened", "sealed state"],
      [buildVisualTargetMetadata({ title: "Target Complete", category: "movies" }), "Target for parts", "Material condition"],
      [buildVisualTargetMetadata({ title: "Signed Target", category: "autographs" }), "Unsigned Target", "Signature state"],
      [buildVisualTargetMetadata({ title: "Target", category: "comics", itemDetails: JSON.stringify({ facsimile: "No" }) }), "Target facsimile reproduction", "Original/reproduction"],
      [buildVisualTargetMetadata({ title: "Target game", category: "video_games" }), "Target game manual only", "Component-only"],
    ] as const;
    for (const [metadata, title, reason] of cases) {
      expect(prepareUniversalVisualCandidates([{ title, imageUrl: "https://example.com/candidate.jpg" }], metadata).contextReasons.get(0)).toContain(reason);
    }

    const explicitlyUnsealed = buildVisualTargetMetadata({
      title: "Target collectible",
      category: "movies",
      itemDetails: JSON.stringify({ sealedStatus: "No" }),
    });
    expect(prepareUniversalVisualCandidates([
      { title: "Target collectible factory sealed", imageUrl: "https://example.com/sealed.jpg" },
    ], explicitlyUnsealed).contextReasons.get(0)).toContain("sealed state");

    const explicitlyUnsigned = buildVisualTargetMetadata({
      title: "Target collectible",
      category: "autographs",
      itemDetails: JSON.stringify({ signed: "No" }),
    });
    expect(prepareUniversalVisualCandidates([
      { title: "Target collectible signed", imageUrl: "https://example.com/signed.jpg" },
    ], explicitlyUnsigned).contextReasons.get(0)).toContain("Signature state");

    const unknownTarget = buildVisualTargetMetadata({ title: "Target collectible", category: "movies" });
    expect(prepareUniversalVisualCandidates([
      { title: "Target collectible signed sealed reproduction", imageUrl: "https://example.com/unknown.jpg" },
    ], unknownTarget).contextReasons).toEqual(new Map());
  });

  it("hard-excludes raw-versus-graded, explicit grade, and grading-company conflicts before visual review", async () => {
    const gradedTarget = buildVisualTargetMetadata({
      title: "Target Coin",
      category: "coins",
      isGraded: "Yes",
      grade: "MS65",
      certificationCompany: "PCGS",
    });
    const prepared = prepareUniversalVisualCandidates([
      { title: "Target Coin raw ungraded", imageUrl: "https://example.com/raw.jpg" },
      { title: "Target Coin PCGS PR65", imageUrl: "https://example.com/pr65.jpg" },
      { title: "Target Coin CGC MS65", grade: "MS65", certificationCompany: "CGC", imageUrl: "https://example.com/same-grade.jpg" },
    ], gradedTarget);
    expect(prepared.contextReasons.get(0)).toContain("Grading state differs");
    expect(prepared.contextReasons.get(1)).toContain("Grade differs");
    expect(prepared.contextReasons.get(2)).toContain("Grading company differs");

    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Universal grade test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: gradedTarget,
      listings: [{ title: "Target Coin CGC MS65", grade: "MS65", certificationCompany: "CGC", imageUrl: "https://example.com/same-grade.jpg" }],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toEqual([]);
    expect(result.contextListings?.[0]?.visualReviewRationale).toContain("Grading company differs");

    const videoGameTarget = buildVisualTargetMetadata({
      title: "Example Game",
      category: "video_games",
      isGraded: "Yes",
      grade: "9.0",
      certificationCompany: "PSA",
    });
    expect(prepareUniversalVisualCandidates([
      { title: "Example Game WATA 9.0", imageUrl: "https://example.com/wata.jpg" },
    ], videoGameTarget).contextReasons).toEqual(new Map());

    const customGraderTarget = buildVisualTargetMetadata({
      title: "Custom graded item",
      category: "comics",
      isGraded: "Yes",
      grade: "9.8",
      certificationCompany: "Other",
      itemDetails: JSON.stringify({ customGradingCompany: "My Grader" }),
    });
    expect(prepareUniversalVisualCandidates([
      { title: "Custom graded item CGC 9.8", imageUrl: "https://example.com/cgc.jpg" },
    ], customGraderTarget).contextReasons.get(0)).toContain("Grading company differs");
  });

  it("does not treat a sports-card number as a grade when an explicit grader-adjacent grade matches", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Upper Deck Ken Griffey Jr. #1 PSA 10",
      category: "sports_cards",
      itemType: "single_card",
      isGraded: "Yes",
      grade: "10",
      certificationCompany: "PSA",
      itemDetails: JSON.stringify({ cardNumber: "1", player: "Ken Griffey Jr.", manufacturer: "Upper Deck" }),
    });
    const prepared = prepareUniversalVisualCandidates([
      { title: "1989 Upper Deck Ken Griffey Jr. #1 PSA 10", imageUrl: "https://example.com/psa10.jpg" },
      { title: "1989 Upper Deck Ken Griffey Jr. #1 PSA 9", imageUrl: "https://example.com/psa9.jpg" },
    ], target);

    expect(prepared.contextReasons.has(0)).toBe(false);
    expect(prepared.contextReasons.get(1)).toContain("Grade differs");
  });

  it("normalizes every source target into one conservative metadata contract", () => {
    const metadata = buildVisualTargetMetadata({
      title: "1999 Pokémon Charizard #4/102",
      category: "Pokemon",
      itemType: "single card",
      grade: "9",
      grader: "PSA",
      itemDetails: JSON.stringify({ cardNumber: "4/102", isGraded: "Yes", language: "English" }),
    });
    expect(metadata).toContain("category=pokemon");
    expect(metadata).toContain("itemType=single card");
    expect(metadata).toContain("certificationCompany=PSA");
    expect(metadata).toContain("isGraded=Yes");
    expect(metadata).toContain('"cardNumber":"4/102"');
  });

  it("holds explicit grading, product-form, and compound-number conflicts before vision", () => {
    const rawTarget = buildVisualTargetMetadata({
      title: "1986 Fleer Michael Jordan",
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: JSON.stringify({ isGraded: "No" }),
    });
    const rawConflict = buildDeclaredIdentityReviews([
      { title: "1986 Fleer Michael Jordan", itemDetails: JSON.stringify({ isGraded: "Yes" }) },
    ], rawTarget);
    expect(rawConflict[0]?.rationale).toContain("Grading state differs");

    const setTarget = buildVisualTargetMetadata({ title: "1986 Fleer Complete Set", category: "sports_cards", itemType: "card_set" });
    const setConflict = buildDeclaredIdentityReviews([{ title: "1986 Fleer Michael Jordan #57 PSA 10" }], setTarget);
    expect(setConflict[0]?.rationale).toContain("individual card");

    const sealedTarget = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemDetails: JSON.stringify({ sealedStatus: "Factory Sealed" }) });
    const sealedConflict = buildDeclaredIdentityReviews([{ title: "Super Mario Bros. 3 NES CIB" }], sealedTarget);
    expect(sealedConflict[0]?.rationale).toContain("Product form differs");

    const numberedTarget = buildVisualTargetMetadata({ title: "Charizard", category: "pokemon", itemDetails: JSON.stringify({ cardNumber: "4/102" }) });
    const numberedConflict = buildDeclaredIdentityReviews([{ title: "Charizard #4/130" }], numberedTarget);
    expect(numberedConflict[0]?.rationale).toContain("Card/catalog number differs");
  });

  it("filters explicit Sports Card single-card feature contradictions before vision", () => {
    const target = buildVisualTargetMetadata({
      title: "1986 Fleer Michael Jordan #57",
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: JSON.stringify({
        rookieCard: "no",
        autograph: "no",
        relicMemorabilia: "no",
        serialNumbered: "no",
      }),
    });

    const cases = [
      ["1986 Fleer Michael Jordan #57 RC", "Rookie-card status differs"],
      ["1986 Fleer Michael Jordan #57 AUTO", "Autograph status differs"],
      ["1986 Fleer Michael Jordan #57 Patch Relic", "Relic/memorabilia status differs"],
      ["1986 Fleer Michael Jordan #57 Numbered /100", "Serial-numbered status differs"],
    ] as const;
    for (const [title, reason] of cases) {
      expect(buildDeclaredIdentityReviews([{ title }], target)[0]?.rationale).toContain(reason);
    }

    expect(buildDeclaredIdentityReviews([{
      title: "1986 Fleer Michael Jordan #57",
      itemDetails: JSON.stringify({ serialNumber: "10/100" }),
    }], target)[0]?.rationale).toContain("Serial-numbered status differs");

    const targetWithFeatures = buildVisualTargetMetadata({
      title: "2001 Bowman Example #1",
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: JSON.stringify({
        rookieCard: "yes",
        autograph: "yes",
        relicMemorabilia: "yes",
        serialNumbered: "yes",
      }),
    });
    expect(buildDeclaredIdentityReviews([{ title: "2001 Bowman Example #1 RC Auto Patch 10/25" }], targetWithFeatures)).toEqual([]);
  });

  it("does not invent Sports Card feature conflicts when the target or candidate omits the field", () => {
    const target = buildVisualTargetMetadata({
      title: "1986 Fleer Michael Jordan #57",
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: JSON.stringify({ rookieCard: "unknown" }),
    });
    expect(buildDeclaredIdentityReviews([{ title: "1986 Fleer Michael Jordan #57 RC Auto Patch /100" }], target)).toEqual([]);
  });

  it("retains all explicit conflicts as context before the visual provider is called", async () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "1986 Fleer Michael Jordan",
      category: "sports_cards",
      itemType: "single_card",
      itemDetails: JSON.stringify({ isGraded: "No" }),
    });
    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Cross-source test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata,
      listings: [{ title: "1986 Fleer Michael Jordan PSA 9", itemDetails: JSON.stringify({ isGraded: "Yes" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toEqual([]);
    expect(result.contextListings).toHaveLength(1);
    expect(result.contextListings?.[0]).toMatchObject({ evidenceDisposition: "context_only", visualRequirement: "not_required_pre_visual" });
    expect(result.contextListings?.[0].visualReviewRationale).toContain("Grading state differs");
  });

  it("does not exclude an otherwise compatible candidate because specimen certificate IDs differ", () => {
    const metadata = buildVisualTargetMetadata({
      title: "Signed Baseball",
      category: "autographs",
      itemDetails: JSON.stringify({ signer: "Example Player", certificateNumber: "TARGET-100" }),
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "Signed Baseball", itemDetails: JSON.stringify({ signer: "Example Player", certificateNumber: "CANDIDATE-200" }) },
    ], metadata);
    expect(reviews).toEqual([]);
  });

  it("preserves direct product identifiers and print-run denominators through canonical pre-visual filtering", async () => {
    const upcResult = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Legacy metadata test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: "title=Super Mario Bros. 3; category=video_games; upc=123456789012",
      listings: [{ title: "Super Mario Bros. 3", itemDetails: JSON.stringify({ upc: "999999999999" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(upcResult.contextListings?.[0].visualReviewRationale).toContain("upc differs in explicit provider metadata");

    const printRunResult = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Legacy metadata test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: "title=2018 Topps Example; category=sports_cards; serialNumber=10/100",
      listings: [{ title: "2018 Topps Example", itemDetails: JSON.stringify({ serialNumber: "2/99" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(printRunResult.contextListings?.[0].visualReviewRationale).toContain("print-run denominator");

    const catalogResult = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Legacy metadata test",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: "title=Scott stamp; category=stamps; catalog=SCOTT-123",
      listings: [{ title: "Scott stamp", itemDetails: JSON.stringify({ catalog: "SCOTT-999" }), imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(catalogResult.contextListings?.[0].visualReviewRationale).toContain("catalogNumber differs");
  });

  it("ignores all holder specimen-ID aliases while retaining non-holder product identifiers", () => {
    const metadata = buildVisualTargetMetadata({
      title: "Graded Collectible",
      category: "sports_cards",
      itemDetails: JSON.stringify({ holderId: "TARGET-HOLDER", holderNumber: "100", slabId: "SLAB-TARGET", certificateId: "CERT-TARGET", trackingId: "TRACK-TARGET", certificateTrackingId: "CERT-TRACK-TARGET" }),
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "Graded Collectible", itemDetails: JSON.stringify({ holderId: "CANDIDATE-HOLDER", holderNumber: "200", slabId: "SLAB-CANDIDATE", certificateId: "CERT-CANDIDATE", trackingId: "TRACK-CANDIDATE", certificateTrackingId: "CERT-TRACK-CANDIDATE" }) },
    ], metadata);
    expect(reviews).toEqual([]);
  });

  it("holds plain sealed video-game titles and opened-vs-incomplete vintage toys before vision", () => {
    const cibTarget = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemDetails: JSON.stringify({ sealedStatus: "CIB" }) });
    expect(buildDeclaredIdentityReviews([{ title: "Super Mario Bros. 3 Sealed VGA 85" }], cibTarget)[0]?.rationale).toContain("Product form differs");

    const completeToyTarget = buildVisualTargetMetadata({ title: "Vintage Figure", category: "vintage_toys", itemDetails: JSON.stringify({ sealedStatus: "Opened", completeness: "Complete" }) });
    expect(buildDeclaredIdentityReviews([{ title: "Vintage Figure Opened Incomplete Missing Accessory" }], completeToyTarget)[0]?.rationale).toContain("Vintage-toy completeness differs");
  });

  it("keeps declared-review audit records on the provider-unavailable return path", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    const unavailablePath = source.slice(source.lastIndexOf('status: "provider_unavailable"') - 500);
    expect(unavailablePath).toContain("reviews: declaredReviews");
  });

  it("retains high-confidence visual mismatches as review evidence", () => {
    const rows = normalizeVisualSourceReviews(
      {
        reviews: [
          {
            candidateIndex: 0,
            verdict: "match",
            confidence: "high",
            rationale: "same object",
            visualAudit: {
              imageCount: 1,
              initialVerdict: "match",
              initialConfidence: "high",
              retryStatus: "not_needed",
              finalPass: "initial",
            },
          },
          {
            candidateIndex: 1,
            verdict: "mismatch",
            confidence: "high",
            rationale: "different object type",
          },
          {
            candidateIndex: 2,
            verdict: "mismatch",
            confidence: "medium",
            rationale: "unclear crop",
          },
        ],
      },
      3
    );
    const result = applyVisualSourceReviews(
      [{ title: "a" }, { title: "b" }, { title: "c" }],
      rows,
      3
    );
    expect(result.listings.map(item => item.title)).toEqual(["a", "b", "c"]);
    expect(result.listings[1]).toMatchObject({
      visualReviewStatus: "mismatch",
      evidenceDisposition: "warning_review",
    });
    expect(result.listings[0]).toMatchObject({
      visualAudit: {
        imageCount: 1,
        retryStatus: "not_needed",
        finalPass: "initial",
      },
    });
    expect(result.removedCount).toBe(0);
  });

  it("records that a graded-target mismatch requires a high-resolution retry", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Super Mario Bros. 3 NES PSA Graded 9.0 CIB",
      targetMetadata: "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: {
        verdict: "mismatch",
        confidence: "high",
        rationale: "The candidate image shows a loose, un-slabbed cartridge with no holder or visible grade.",
      },
    })).toBe(true);
  });

  it("treats Disney Pins as ungraded and does not escalate stale grading fields", () => {
    const metadata = "title=Disney Mickey D23 Pin; category=disney_pins; grade=9.8; certificationCompany=PSA";
    expect(isDisneyPinsMetadata(metadata)).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({
      title: "Disney Mickey D23 Pin PSA 9.8",
      targetMetadata: metadata,
      review: { verdict: "mismatch", confidence: "high", rationale: "The candidate appears raw and the holder is not visible." },
    })).toBe(false);
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Disney Mickey D23 Pin PSA 9.8",
      targetMetadata: metadata,
      review: { verdict: "mismatch", confidence: "high", rationale: "The candidate appears raw and the holder is not visible." },
    })).toBe(false);
    expect(disneyPinsVisualInstruction(metadata)).toContain("Ignore grader, certification-company, slab");
    expect(conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The pin artwork matches, but no numeric grade is visible." },
    ], [{ title: "Disney Mickey D23 Pin" }], metadata)[0]).toMatchObject({ verdict: "match" });
  });

  it("requires exact coin identity evidence and confirmed adjudication before admission", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    expect(isCoinMetadata(metadata)).toBe(true);
    const incomplete = enforceCoinExactEvidence({
      candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The slab and grade look similar.",
      visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: false },
    }, metadata);
    expect(incomplete.verdict).toBe("unreadable");
    const exactEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    const exact = { candidateIndex: 0, verdict: "match" as const, confidence: "high" as const, rationale: "The coin identity, date, variety, slab, grader, and grade match.", visualEvidence: exactEvidence, visualAudit: { imageCount: 1, initialVerdict: "match" as const, initialConfidence: "high" as const, retryStatus: "performed" as const, adjudicationStatus: "confirmed" as const, finalPass: "high_resolution_retry" as const, finalEvidence: exactEvidence } };
    expect(hasCompletedCoinAdjudication(exact, metadata)).toBe(true);
    expect(conservativeCoinVisualReviews([exact], [{ title: "1896 Morgan Silver Dollar PCGS MS63" }], metadata)[0]).toMatchObject({ verdict: "match" });
    const cropped = enforceCoinExactEvidence({
      candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "The crop does not show enough of the holder to determine raw-versus-graded status.",
      visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: true, identityMatches: false, dateMatches: false, varietyMatches: false },
    }, metadata, "1896 Morgan Silver Dollar PCGS MS63");
    expect(cropped).toMatchObject({ verdict: "match", confidence: "high" });
    const explicitRaw = enforceCoinExactEvidence({ ...cropped, rationale: "The listing is a raw ungraded coin with no slab." }, metadata, "1896 Morgan Silver Dollar PCGS MS63");
    expect(explicitRaw.verdict).not.toBe("match");
  });

  it("reconciles an exact Mercari coin title before deciding whether to run the required second review", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const firstPass = {
      candidateIndex: 0,
      verdict: "unreadable" as const,
      confidence: "low" as const,
      rationale: "The close crop does not show enough of the holder to independently classify the listing.",
      visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: false, identityMatches: false, dateMatches: false, varietyMatches: false, mintMarkMatches: false, denominationMatches: false },
    };

    const reconciled = reconcileCoinPrimaryReviewForAdjudication(firstPass, metadata, "1896 Morgan Silver Dollar PCGS MS63");
    expect(reconciled).toMatchObject({ verdict: "match", confidence: "high" });

    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("const reconciledPrimaryReviews = primaryReviews.map");
    expect(source).toContain("const needsCoinAdjudication = isCoinMetadata(targetMetadata);");
  });

  it("runs the independent second review for an exact-title Mercari coin holder crop before making an admission decision", async () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const cropEvidence = { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: false, identityMatches: false, dateMatches: false, varietyMatches: false, mintMarkMatches: false, denominationMatches: false };
    const finalEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    mockedInvokeLLM
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The first pass reports a visual match, but the close crop does not independently show enough of the holder to finalize the graded state.", visualEvidence: cropEvidence }],
      }) as any)
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The independent review confirms the matching coin identity, date, variety, grader, and grade.", visualEvidence: finalEvidence }],
      }) as any);

    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Mercari coin sold listings",
      targetImageUrl: "https://example.com/target-coin.jpg",
      targetMetadata: metadata,
      listings: [{ title: "1896 Morgan Silver Dollar PCGS MS63", imageUrl: "https://example.com/candidate-coin.jpg", imageUrls: ["https://example.com/candidate-coin.jpg"] }],
    });

    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mockedInvokeLLM.mock.calls[1]?.[0]?.messages ?? [])).toContain("INDEPENDENT COIN IDENTITY ADJUDICATION");
    expect(result.listings[0]).toMatchObject({
      visualReviewStatus: "match",
      visualAudit: { retryStatus: "performed", adjudicationStatus: "confirmed", finalPass: "high_resolution_retry" },
    });
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("retries the second coin-review response format when a nonempty reply omits the required review", async () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    mockedInvokeLLM
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The first review finds the matching graded coin.", visualEvidence: evidence }],
      }) as any)
      .mockResolvedValueOnce(structuredVisualResponse({ reviews: [] }) as any)
      .mockResolvedValueOnce(structuredVisualResponse({
        reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The fallback second review independently confirms the matching coin identity, date, variety, grader, and grade.", visualEvidence: evidence }],
      }) as any);

    const result = await filterVisualSourceCandidates({
              sourceRole: 'marketplace',
      sourceLabel: "Mercari coin sold listings",
      targetImageUrl: "https://example.com/target-coin.jpg",
      targetMetadata: metadata,
      listings: [{ title: "1896 Morgan Silver Dollar PCGS MS63", imageUrl: "https://example.com/candidate-coin.jpg", imageUrls: ["https://example.com/candidate-coin.jpg"] }],
    });

    expect(mockedInvokeLLM).toHaveBeenCalledTimes(3);
    expect(result.listings[0]).toMatchObject({
      visualReviewStatus: "match",
      visualAudit: { retryStatus: "performed", adjudicationStatus: "confirmed", finalPass: "high_resolution_retry" },
    });
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("normalizes the compact completed coin adjudication shape returned by the live vision provider", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const reviews = normalizeCompactCoinAdjudicationReview({
      candidate: 0,
      visualEvidence: {
        identityMatches: true,
        dateMatches: true,
        varietyMatches: true,
        mintMarkMatches: true,
        denominationMatches: true,
        notes: "Both images show the 1896 Morgan dollar in matching PCGS MS63 holders.",
      },
    }, 0, metadata, "1896 Morgan Silver Dollar PCGS MS63");

    expect(reviews).toMatchObject([{
      candidateIndex: 0,
      verdict: "match",
      confidence: "high",
      visualEvidence: { identityMatches: true, dateMatches: true, varietyMatches: true, denominationMatches: true },
    }]);
  });

  it("uses confirmed final coin evidence when the initial pass was incomplete", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const finalEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, dateMatches: true, varietyMatches: true, mintMarkMatches: false, denominationMatches: true };
    const review = {
      candidateIndex: 0,
      verdict: "match" as const,
      confidence: "medium" as const,
      rationale: "The title and second visual review confirm the same coin.",
      visualEvidence: { ...finalEvidence, varietyMatches: false },
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match" as const,
        initialConfidence: "low" as const,
        retryStatus: "performed" as const,
        adjudicationStatus: "confirmed" as const,
        finalPass: "high_resolution_retry" as const,
        initialEvidence: { ...finalEvidence, varietyMatches: false },
        finalEvidence,
      },
    };
    expect(hasCompletedCoinAdjudication(review, metadata, "1896 Morgan Silver Dollar PCGS MS63")).toBe(true);
    const result = applyVisualSourceReviews(
      [{ title: "1896 Morgan Silver Dollar PCGS MS63" }],
      [review],
      1,
      { requireCoinExactMatch: true, targetMetadata: metadata },
    );
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
    expect(coinAdmissionReason(review, metadata, "1896 Morgan Silver Dollar PCGS MS63")).toBeNull();
  });

  it("reports the exact coin admission blocker when adjudication is unavailable", () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const review = { candidateIndex: 0, verdict: "match" as const, confidence: "high" as const, rationale: "The coin appears to match.", visualAudit: { imageCount: 1, initialVerdict: "match" as const, initialConfidence: "high" as const, retryStatus: "failed" as const, adjudicationStatus: "unavailable" as const, retryReason: "The high-resolution visual-review call timed out before returning a structured decision.", finalPass: "initial" as const } };
    expect(coinAdmissionReason(review, metadata, "1896 Morgan Silver Dollar PCGS MS63")).toBe("The required independent high-resolution coin review did not complete: The high-resolution visual-review call timed out before returning a structured decision.");
  });

  it("requires completed independent high-resolution evidence before Disney Pins can enter analyzer evidence", () => {
    const listings = [{ title: "Disney Mickey D23 Pin" }, { title: "Disney Minnie D23 Pin" }, { title: "Disney Mickey D23 Pin" }];
    const reviews = [
      { candidateIndex: 0, verdict: "rough_match" as const, confidence: "high" as const, rationale: "Character and colors are plausible, but the pin artwork is partly obscured." },
      { candidateIndex: 1, verdict: "mismatch" as const, confidence: "high" as const, rationale: "Different character and pin silhouette." },
      { candidateIndex: 2, verdict: "match" as const, confidence: "high" as const, rationale: "The character, artwork, silhouette, colors, and backing card visibly match." },
    ];
    const result = applyVisualSourceReviews(listings, reviews, listings.length, { requireExactMatch: true });
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "rough_match", evidenceDisposition: "warning_review" });
    expect(result.listings[1]).toMatchObject({ visualReviewStatus: "mismatch", evidenceDisposition: "warning_review" });
    expect(result.listings[2]).toMatchObject({ visualReviewStatus: "match", evidenceDisposition: "warning_review" });

    const confirmed = applyVisualSourceReviews(listings, [{
      ...reviews[2]!,
      candidateIndex: 0,
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match",
        initialConfidence: "high",
        retryStatus: "performed",
        finalPass: "high_resolution_retry",
        finalEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: false, characterMatches: true, artworkMatches: true, silhouetteMatches: true, backingCardMatches: true, setDesignMatches: true },
      },
    }], 1, { requireExactMatch: true });
    expect(hasCompletedDisneyPinsAdjudication({ ...reviews[2]!, visualAudit: undefined })).toBe(false);
    expect(hasCompletedDisneyPinsAdjudication({ ...reviews[2]!, visualAudit: confirmed.listings[0]?.visualAudit })).toBe(true);
    expect(confirmed.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("preserves a complete primary Disney match when the independent retry is unavailable", () => {
    const exactEvidence = {
      slabVisible: false,
      gradingLabelVisible: false,
      graderVisible: false,
      numericGradeVisible: false,
      gradeMatches: false,
      rawOrLooseVisible: false,
      characterMatches: true,
      artworkMatches: true,
      silhouetteMatches: true,
      backingCardMatches: true,
      setDesignMatches: true,
    };
    const review = {
      candidateIndex: 0,
      verdict: "match" as const,
      confidence: "high" as const,
      rationale: "The primary visual review confirms the exact character, artwork, silhouette, backing card, and set design.",
      visualEvidence: exactEvidence,
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match" as const,
        initialConfidence: "high" as const,
        retryStatus: "failed" as const,
        adjudicationStatus: "unavailable" as const,
        retryReason: "The high-resolution retry did not return a usable structured decision.",
        finalPass: "initial" as const,
        initialEvidence: exactEvidence,
        finalEvidence: exactEvidence,
      },
    };
    expect(hasUnavailableDisneyPinsAdjudication(review)).toBe(true);
    const result = applyVisualSourceReviews(
      [{ title: "Disney Eeyore Around the World Pin" }],
      [review],
      1,
      { requireExactMatch: true },
    );
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match" });
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
    expect(result.listings[0]).toMatchObject({ visualAudit: { adjudicationStatus: "unavailable" } });
  });

  it("does not let generic raw/ungraded reconciliation promote a Disney Pin", () => {
    const metadata = "title=Disney Eeyore Pin; category=disney_pins; isGraded=No";
    const review = { candidateIndex: 0, verdict: "unreadable" as const, confidence: "medium" as const, rationale: "Both pins are raw and the artwork matches exactly." };
    expect(normalizeExplicitUngradedVisualReviews([review], metadata)[0]).toMatchObject({ verdict: "unreadable" });
  });

  it("fails closed when Disney Pin artwork or backing evidence is incomplete", () => {
    const metadata = "title=Disney Eeyore Around the World Pin; category=disney_pins";
    const baseEvidence = {
      slabVisible: false,
      gradingLabelVisible: false,
      graderVisible: false,
      numericGradeVisible: false,
      gradeMatches: false,
      rawOrLooseVisible: false,
      characterMatches: true,
      artworkMatches: false,
      silhouetteMatches: true,
      backingCardMatches: true,
      setDesignMatches: true,
    };
    const review = enforceDisneyPinsExactEvidence({
      candidateIndex: 0,
      verdict: "match",
      confidence: "high",
      rationale: "Same Eeyore character and colors, but the artwork differs.",
      visualEvidence: baseEvidence,
    }, metadata);
    expect(review).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(review.rationale).toContain("exact artwork");
    expect(enforceDisneyPinsExactEvidence({
      ...review,
      verdict: "match",
      confidence: "high",
      visualEvidence: { ...baseEvidence, artworkMatches: true },
    }, metadata)).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("requires an independent Disney Pins adjudication for every apparent match", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("needsDisneyAdjudication");
    expect(source).toContain("INDEPENDENT DISNEY PINS IDENTITY ADJUDICATION");
    expect(source).toContain("Disney Pins require an independent second visual adjudication");
    expect(disneyPinsVisualInstruction("category=disney_pins")).toContain("Same character, similar colors, or a shared series is never sufficient");
  });

  it("holds Disney Pins collections, lots, and wrong item forms before visual review", () => {
    const individualTarget = buildVisualTargetMetadata({
      title: "Mickey D23 Limited Edition Pin",
      category: "disney_pins",
      itemType: "individual_pin",
      fullItemDetails: { pinName: "Mickey D23", character: "Mickey Mouse", limitedEdition: "Yes" },
    });
    expect(buildDeclaredIdentityReviews([{ title: "Disney pin collection lot", imageUrl: "https://example.com/lot.jpg" }], individualTarget)[0]?.rationale).toContain("collection, lot");
    expect(buildDeclaredIdentityReviews([{ title: "Mickey D23 Pin Set", imageUrl: "https://example.com/set.jpg" }], individualTarget)[0]?.rationale).toContain("item type differs");

    const setTarget = buildVisualTargetMetadata({
      title: "Mickey D23 Pin Set",
      category: "disney_pins",
      itemType: "pin_set",
      fullItemDetails: { setName: "Mickey D23", completeSet: "Yes", numberOfPins: 4 },
    });
    expect(buildDeclaredIdentityReviews([{ title: "Mickey D23 Single Pin", imageUrl: "https://example.com/pin.jpg" }], setTarget)[0]?.rationale).toContain("item type differs");
    expect(buildDeclaredIdentityReviews([{ title: "Mickey D23 Complete Pin Set", imageUrl: "https://example.com/complete.jpg" }], setTarget)).toHaveLength(0);
  });

  it("holds explicit Disney Pins identity and edition conflicts but does not reject missing fields", () => {
    const target = buildVisualTargetMetadata({
      title: "Mickey D23 Limited Edition Pin",
      category: "disney_pins",
      itemType: "individual_pin",
      fullItemDetails: {
        pinName: "Mickey D23",
        character: "Mickey Mouse",
        series: "D23",
        year: "2024",
        limitedEdition: "Yes",
        artistProof: "No",
      },
    });
    expect(buildDeclaredIdentityReviews([{ title: "Minnie D23 Limited Edition Pin 2024", imageUrl: "https://example.com/mismatch.jpg" }], target)[0]?.rationale).toContain("pin name differs");
    expect(buildDeclaredIdentityReviews([{ title: "Mickey D23 Open Edition Pin 2024", imageUrl: "https://example.com/edition.jpg" }], target)[0]?.rationale).toContain("limited-edition status differs");
    expect(buildDeclaredIdentityReviews([{ title: "Disney Pin", imageUrl: "https://example.com/unknown.jpg" }], target)).toHaveLength(0);
  });

  it("requires a focused escalation for every initial mismatch against a graded target", () => {
    const args = {
      title: "Mario Bros. 3 NES Nintendo Game PSA Graded 9.0 CIB Complete In Box Oval Seal",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: {
        verdict: "mismatch" as const,
        confidence: "high" as const,
        rationale: "The preliminary image review calls the candidate loose and un-slabbed with no visible grade.",
      },
    };
    expect(hasTitleDeclaredGradeVisualRawConflict(args)).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({ ...args, title: "Mario Bros. 3 NES CIB" })).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({
      ...args,
      review: { ...args.review, rationale: "The preliminary image review reports a different cover treatment." },
    })).toBe(true);
    expect(hasTitleDeclaredGradeVisualRawConflict({
      ...args,
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; isGraded=No",
    })).toBe(false);
  });

  it("uses an independent high-resolution grading adjudication instead of anchoring on the first-pass result", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("INDEPENDENT HIGH-RESOLUTION GRADING ADJUDICATION");
    expect(source).toContain("Do not rely on or repeat any preliminary verdict");
    expect(source).toContain("A visible transparent slab plus a grading label and readable grade is graded—not raw");
    expect(source).toContain('model: needsFocusedGradeEscalation ? "gpt-5" : "gpt-5-mini"');
    expect(source).toContain('reasoning: needsFocusedGradeEscalation ? { effort: "low" } : undefined');
  });

  it("treats sealed and CIB graded video games as separate forms and fails closed on target-form conflict", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("item form is a mandatory identity gate: sealed, CIB/complete-in-box, boxed-only, loose/raw, and parts-only are distinct comparable cohorts");
    expect(source).toContain("A candidate label that visibly says CIB is not the same as a target label that visibly says Sealed");
    expect(source).toContain("target's structured title/details say CIB or Complete in Box while its visible holder label says Sealed");
    expect(source).toContain("${videoGameFormInstruction(targetMetadata)}");
    expect(source).toContain("VIDEO-GAME LABEL CHECK: read the printed form designation on each visible grading label before deciding");
    expect(source).toContain("A clear PSA slab whose label says CIB is a graded CIB game—not a raw or loose cartridge");
    expect(source).toContain("${focusedVideoGameLabelInstruction(targetMetadata)}");
  });

  it("pins a one-candidate model response to the candidate that was sent, not its returned index", () => {
    const reviews = normalizeSingleCandidateVisualReview(
      {
        reviews: [{
          // Simulates a malformed model index while reviewing the PSA 9.0
          // listing at index 13.
          candidateIndex: 999,
          verdict: "match",
          confidence: "high",
          rationale: "Visible PSA slab and readable 9.0 label match the target.",
          visualEvidence: {
            slabVisible: true,
            gradingLabelVisible: true,
            graderVisible: true,
            numericGradeVisible: true,
            gradeMatches: true,
            rawOrLooseVisible: false,
          },
        }],
      },
      14,
      13,
    );

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ candidateIndex: 13, verdict: "match" });
    const listings = Array.from({ length: 14 }, (_, index) => ({ title: `candidate ${index}` }));
    const result = applyVisualSourceReviews(listings, reviews, 14);
    expect(result.listings[0]).not.toHaveProperty("visualReviewStatus");
    expect(result.listings[13]).toMatchObject({ visualReviewStatus: "match" });
  });

  it("uses original listing indexes after candidates without images are removed from the vision queue", () => {
    const listings = [
      { title: "No provider image" },
      { title: "Mario Bros. 3 NES PSA Graded 9.0 CIB" },
    ];
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 1,
        verdict: "mismatch",
        confidence: "high",
        rationale: "Candidate appears raw and un-slabbed with no visible PSA label or numeric grade.",
      },
    ], listings, "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ candidateIndex: 1, verdict: "unreadable", confidence: "low" });
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("const universalPreparation = prepareUniversalVisualCandidates(args.listings, targetMetadata);");
    expect(source).toContain("const declaredReviews = buildDeclaredIdentityReviews(preparedListings, targetMetadata, {");
    expect(source).toContain("const preVisualExcludedIndexes = new Set([");
    expect(source).toContain("candidateIndex,");
  });

  it("downgrades broad comic visual matches when exact issue or cover evidence is absent", () => {
    const result = conservativeComicVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "Same Star Wars characters and CGC holder." },
    ], [{ title: "Star Wars #1 CGC 9.8" }], "title=Star Wars #1; category=comics");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("exact-issue or cover-art confirmation");
  });

  it("downgrades an unclear graded-comic mismatch to manual review when metadata declares a grade", () => {
    const result = conservativeComicVisualReviews([
      { candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "The low-resolution image appears raw and the holder is not visible." },
    ], [{ title: "X-Men #137 CGC 9.8 Newsstand" }], "title=X-Men #137; category=comics");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("rather than a definitive mismatch");
  });

  it("downgrades a graded visual match when the candidate grade is not readable", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "Both figures are in AFA holders and the character/package layout matches, but the candidate grade is not visible." },
    ], [{ title: "MOTU 1982 Vintage 8 Card Man-at-Arms AFA Graded RARE!" }], "title=MOTU 1982 Vintage 8 Card Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("numeric or descriptive grade is not clearly verified");
  });

  it("keeps a graded visual match only when the candidate grade is explicitly verified", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The AFA 8.0 grade is clearly readable on the candidate label and matches the target; the figure and packaging also match.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
    ], [{ title: "MOTU 1982 Man-at-Arms AFA 8.0" }], "title=MOTU 1982 Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("holds a graded-card match for manual review when the target qualifier is not explicitly verified", () => {
    const metadata = `title=2018 Topps; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ gradeQualifier: "OC" })}`;
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The PSA 8 grade is clearly readable and the card front matches." },
    ], [{ title: "2018 Topps PSA 8" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("grade qualifier");
  });

  it("rejects a graded match when the model omits structured visual evidence", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The PSA 9 label and grade appear visible and match." },
    ], [{ title: "Super Mario Bros. 3 NES PSA 9" }], "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("structured visual evidence");
  });

  it("rejects a graded match when structured evidence says the item is raw", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The title says PSA 9, but the candidate appears raw.", visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, gradeMatches: false, rawOrLooseVisible: true } },
    ], [{ title: "Super Mario Bros. 3 NES PSA 9" }], "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
  });

  it("accepts a visually confirmed WATA label as PSA-equivalent for video games", () => {
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "unreadable",
        confidence: "low",
        rationale: "The WATA 9.0 label and numeric grade are clearly visible, the sealed game identity and cover art match, there is no raw/loose signal, and the grader conflict is only PSA versus WATA.",
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false },
      },
    ], [{ title: "Super Mario Bros. 3 NES WATA 9.0 Sealed" }], "title=Super Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "medium" });
    expect(result[0].rationale).toContain("PSA and WATA labels are accepted as equivalent grader evidence");
  });

  it("accepts an explicitly confirmed equivalent target qualifier after visual review", () => {
    const metadata = `title=2018 Topps; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ gradeQualifier: "OC" })}`;
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The PSA 8 OC grade is clearly readable and the card front matches.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
    ], [{ title: "2018 Topps PSA 8 OC" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("holds a comic match for manual review when the target certification label status is not confirmed", () => {
    const metadata = `title=Amazing Spider-Man #300; category=comics; grade=9.8; certificationCompany=CGC; fullItemDetails=${JSON.stringify({ certificationLabelStatus: "Restored" })}`;
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The CGC 9.8 grade and cover art are clearly readable and match." },
    ], [{ title: "Amazing Spider-Man #300 CGC 9.8" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(result[0].rationale).toContain("comic certification label status");
  });

  it("treats structured Is graded = No as authoritative and skips graded-target enforcement", () => {
    const metadata = 'title=Monster High; category=vintage_toys; grade=unknown; certificationCompany=unknown; fullItemDetails={"isGraded":"No"}';
    expect(hasExplicitlyUngradedTarget(metadata)).toBe(true);
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The raw item artwork matches." },
    ], [{ title: "Monster High Draculaura raw" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("promotes a contradictory unreadable review when both raw items and identity match are explicitly confirmed", () => {
    const metadata = 'title=Monster High Draculaura; category=vintage_toys; fullItemDetails={"isGraded":"No"}';
    const result = normalizeExplicitUngradedVisualReviews([
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "Both target and candidate are raw/ungraded. The front artwork, packaging, and layout match, but the target is graded wording is not applicable." },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "medium" });
    expect(result[0].rationale).toContain("Is graded = No");
  });

  it("does not promote an ungraded review when a material identity conflict remains", () => {
    const metadata = 'title=Monster High Draculaura; category=vintage_toys; isGraded=No';
    const result = normalizeExplicitUngradedVisualReviews([
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "Both target and candidate are raw/ungraded, but this is a different edition and the artwork conflicts." },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
  });

  it("treats equivalent AFA plus-grade formats as the same numeric grade", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The AFA 75+ grade is clearly readable on the gallery label and matches the target.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
    ], [{ title: "MOTU Man-at-Arms AFA 75+ Masters of the Universe" }], "title=MOTU Man-at-Arms; category=vintage_toys; grade=75.0; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("blocks a graded loose vintage toy when the target is graded and carded", () => {
    const metadata = `title=G.I. Joe Snake Eyes; category=vintage_toys; grade=90; certificationCompany=AFA; fullItemDetails=${JSON.stringify({ packagingType: "carded" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "G.I. Joe Snake Eyes AFA 90 Loose Action Figure" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("packaging form differs");
  });

  it("blocks a graded carded vintage toy when the target is graded and loose", () => {
    const metadata = `title=G.I. Joe Snake Eyes; category=vintage_toys; grade=90; certificationCompany=AFA; fullItemDetails=${JSON.stringify({ packagingType: "loose" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "G.I. Joe Snake Eyes AFA 90 Carded" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("packaging form differs");
  });

  it("holds a sports-card candidate with an explicit parallel conflict before vision", () => {
    const metadata = `title=Mike Trout; category=sports_cards; fullItemDetails=${JSON.stringify({ player: "Mike Trout", year: "2011", manufacturer: "Topps", parallel: "Chrome Refractor" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "2011 Topps Mike Trout Chrome", itemDetails: JSON.stringify({ parallel: "Base" }) },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("parallel differs");
  });

  it("holds a video-game candidate with an explicit platform conflict before vision", () => {
    const metadata = `title=The Legend of Zelda; category=video_games; fullItemDetails=${JSON.stringify({ platform: "NES", edition: "Standard" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "The Legend of Zelda Nintendo Switch", platform: "Nintendo Switch" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("platform differs");
  });

  it("applies Video Games / Game identity filters and preserves unknown fields", () => {
    const metadata = `title=Super Mario Bros. 3; category=video_games; itemType=game; fullItemDetails=${JSON.stringify({ gameTitle: "Super Mario Bros. 3", platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", upc: "123456789012" })}`;
    const candidates = [
      { title: "Super Mario Bros. 3 Nintendo Switch", itemDetails: JSON.stringify({ platform: "Switch" }) },
      { title: "Super Mario Bros. 3 NES", itemDetails: JSON.stringify({ releaseYear: 1991 }) },
      { title: "Super Mario Bros. 3 NES", itemDetails: JSON.stringify({ region: "PAL" }) },
      { title: "Super Mario Bros. 3 NES CIB" },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, metadata);
    expect(reviews).toHaveLength(3);
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("platform differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("release year differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("region differs");
  });
  it("applies Video Games / Console identity filters", () => {
    const metadata = `title=Nintendo NES; category=video_games; itemType=console; fullItemDetails=${JSON.stringify({ consoleName: "NES", modelNumber: "NES-001", region: "NTSC-U", workingCondition: "Working" })}`;
    const candidates = [
      { title: "Nintendo NES Console", itemDetails: JSON.stringify({ modelNumber: "NES-101" }) },
      { title: "Nintendo NES Console", itemDetails: JSON.stringify({ region: "PAL" }) },
      { title: "Nintendo NES Console", itemDetails: JSON.stringify({ workingCondition: "Not Working" }) },
      { title: "Nintendo NES Game", itemType: "game" },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, metadata);
    expect(reviews).toHaveLength(4);
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("model number differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("working condition differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("item type differs");
  });
  it("applies Video Games / Accessory identity filters", () => {
    const metadata = `title=Nintendo NES Controller; category=video_games; itemType=accessory; fullItemDetails=${JSON.stringify({ accessoryType: "Controller", accessoryName: "NES Controller", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working", originalPackaging: "yes" })}`;
    const candidates = [
      { title: "Nintendo NES Controller", itemDetails: JSON.stringify({ platform: "Switch" }) },
      { title: "Nintendo NES Controller", itemDetails: JSON.stringify({ manufacturer: "Sony" }) },
      { title: "Nintendo NES Controller", itemDetails: JSON.stringify({ workingCondition: "Untested" }) },
      { title: "Nintendo NES Controller", itemDetails: JSON.stringify({ originalPackaging: "no" }) },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, metadata);
    expect(reviews).toHaveLength(4);
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("compatible platform differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("manufacturer differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("working condition differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("original packaging differs");
  });
  it("does not apply Video Games filters to Collection/Lot", () => {
    const metadata = `title=Video Game Collection; category=video_games; itemType=collection_lot; fullItemDetails=${JSON.stringify({ platformsIncluded: "NES, Switch", approximateItemCount: 20 })}`;
    expect(buildDeclaredIdentityReviews([{ title: "Nintendo Switch Console", itemType: "console", itemDetails: JSON.stringify({ platform: "Switch" }) }], metadata)).toEqual([]);
  });
  it("applies Movies / Individual Movie filters", () => {
    const metadata = buildVisualTargetMetadata({ title: "The Matrix", category: "movies", itemType: "individual_movie", fullItemDetails: { title: "The Matrix", format: "Blu-ray", releaseYear: 1999, edition: "Standard", region: "Region 1", sealed: "No" } });
    const candidates = [
      { title: "The Matrix DVD 1999", itemDetails: JSON.stringify({ format: "DVD", releaseYear: 1999 }) },
      { title: "The Matrix Blu-ray 2003", itemDetails: JSON.stringify({ format: "Blu-ray", releaseYear: 2003 }) },
      { title: "The Matrix Complete Box Set", itemType: "box_set" },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, metadata);
    expect(reviews).toHaveLength(3);
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("format differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("release year differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("individual movie");
  });

  it("applies Movies / Box Set filters and rejects individual movies", () => {
    const metadata = buildVisualTargetMetadata({ title: "The Lord of the Rings Trilogy", category: "movies", itemType: "box_set", fullItemDetails: { boxSetName: "The Lord of the Rings Trilogy", format: "Blu-ray", numberOfMovies: 3, sealed: "Yes" } });
    const candidates = [
      { title: "The Lord of the Rings Trilogy Blu-ray 3 Movie Box Set", itemDetails: JSON.stringify({ format: "Blu-ray", numberOfMovies: 3, sealed: "Yes" }) },
      { title: "The Lord of the Rings: The Fellowship of the Ring Blu-ray", itemType: "individual_movie" },
      { title: "The Lord of the Rings Trilogy DVD 6 Movie Box Set", itemDetails: JSON.stringify({ format: "DVD", numberOfMovies: 6 }) },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, metadata);
    expect(reviews).toHaveLength(2);
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("individual movie");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("format differs");
  });

  it("does not apply Movies filters to Collection/Lot", () => {
    const metadata = buildVisualTargetMetadata({ title: "Movie Collection", category: "movies", itemType: "collection_lot", fullItemDetails: { approximateQuantity: 50, formatsIncluded: "DVD, Blu-ray" } });
    expect(buildDeclaredIdentityReviews([{ title: "The Matrix Blu-ray", itemType: "individual_movie" }, { title: "Complete Movie Box Set", itemType: "box_set" }], metadata)).toEqual([]);
  });

  it("holds a coin candidate with an explicit mint-mark conflict before vision", () => {
    const metadata = `title=1903 Morgan Dollar; category=coins; fullItemDetails=${JSON.stringify({ year: "1903", denomination: "1", mintMark: "S", variety: "Morgan" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "1903 Morgan Dollar", itemDetails: JSON.stringify({ year: "1903", denomination: "1", mintMark: "O", variety: "Morgan" }) },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("mintMark differs");
  });

  it("applies the Coins / Single Coin identity filters while preserving unknown fields", () => {
    const metadata = `title=1903 Morgan Dollar; category=coins; itemType=single_coin; fullItemDetails=${JSON.stringify({
      country: "United States", year: "1903", denomination: "1 Dollar", mintMark: "S", composition: "Silver", strike: "Business Strike", variety: "Morgan", isOriginal: "Yes",
    })}`;
    const candidates = [
      { title: "1904 Morgan Dollar", itemDetails: JSON.stringify({ country: "United States", year: "1904" }) },
      { title: "1903 Morgan Dollar", itemDetails: JSON.stringify({ country: "Canada" }) },
      { title: "1903 Morgan Dollar", itemDetails: JSON.stringify({ denomination: "Half Dollar" }) },
      { title: "1903 Morgan Dollar", itemDetails: JSON.stringify({ mintMark: "O" }) },
      { title: "1903 Morgan Dollar", itemDetails: JSON.stringify({ composition: "Gold" }) },
      { title: "1903 Morgan Dollar Proof", itemDetails: JSON.stringify({ strike: "Proof" }) },
      { title: "1903 Morgan Dollar VAM 1", itemDetails: JSON.stringify({ variety: "VAM 1" }) },
      { title: "1903 Morgan Dollar Replica", itemDetails: JSON.stringify({}) },
      { title: "1903 Morgan Dollar", itemDetails: JSON.stringify({}) },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, metadata);
    expect(reviews).toHaveLength(8);
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Coin year/date differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Coin composition differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Coin authenticity differs");
    expect(reviews.every((review) => review.verdict === "mismatch" && review.confidence === "high")).toBe(true);
  });

  it("applies the Comics / Single Comic hard identity filters before visual review", () => {
    const metadata = `title=Amazing Spider-Man; category=comics; itemType=single_comic; fullItemDetails=${JSON.stringify({
      issueNumber: "300", publisher: "Marvel", distributionType: "Direct", variantDescription: "Regular Cover", facsimile: "No", signed: "No",
    })}`;
    const candidates = [
      { title: "Amazing Spider-Man #301", itemDetails: JSON.stringify({ publisher: "Marvel" }) },
      { title: "Amazing Spider-Man #300", itemDetails: JSON.stringify({ publisher: "DC" }) },
      { title: "Amazing Spider-Man #300 Newsstand Edition", itemDetails: JSON.stringify({ publisher: "Marvel" }) },
      { title: "Amazing Spider-Man #300 Variant", itemDetails: JSON.stringify({ publisher: "Marvel", variantDescription: "Variant" }) },
      { title: "Amazing Spider-Man #300", itemDetails: JSON.stringify({ publisher: "Marvel", facsimile: "Yes" }) },
      { title: "Amazing Spider-Man #300 Signed", itemDetails: JSON.stringify({ publisher: "Marvel" }) },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, metadata);
    expect(reviews).toHaveLength(6);
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(reviews.every((review) => review.verdict === "mismatch" && review.confidence === "high")).toBe(true);
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Comic issue number differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Comic publisher differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Comic distribution type differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Comic variant differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Comic original/facsimile status differs");
    expect(reviews.map((review) => review.rationale).join(" ")).toContain("Comic signature state differs");
  });

  it("does not apply the Comics / Single Comic gate to other comic item types or unknown candidate fields", () => {
    const collectionTarget = `title=Amazing Spider-Man; category=comics; itemType=collection_lot; fullItemDetails=${JSON.stringify({ issueNumber: "300", publisher: "Marvel" })}`;
    expect(buildDeclaredIdentityReviews([{ title: "Amazing Spider-Man" }], collectionTarget)).toEqual([]);
    const singleTarget = `title=Amazing Spider-Man; category=comics; itemType=single_comic; fullItemDetails=${JSON.stringify({ issueNumber: "300", publisher: "Marvel" })}`;
    expect(buildDeclaredIdentityReviews([{ title: "Amazing Spider-Man #300" }], singleTarget)).toEqual([]);
  });

  it("holds a comic candidate with an explicit issue-number conflict before vision", () => {
    const metadata = `title=Amazing Spider-Man; category=comics; fullItemDetails=${JSON.stringify({ series: "Amazing Spider-Man", issueNumber: "300", publisher: "Marvel" })}`;
    const result = buildDeclaredIdentityReviews([
      { title: "Amazing Spider-Man #301 CGC 9.8" },
    ], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(result[0].rationale).toContain("issueNumber");
  });

  it("does not reject a candidate merely because its provider omitted a target field", () => {
    const metadata = `title=The Legend of Zelda; category=video_games; fullItemDetails=${JSON.stringify({ platform: "NES", edition: "Standard" })}`;
    expect(buildDeclaredIdentityReviews([{ title: "The Legend of Zelda" }], metadata)).toEqual([]);
  });

  it("does not treat an ordinary Comics title as signed when the target is unsigned", () => {
    const metadata = `title=The Amazing Spider-Man #238 CGC 9.6; category=comics; itemType=single_comic; fullItemDetails=${JSON.stringify({ issueNumber: "238", publisher: "Marvel", signed: "No" })}`;
    expect(buildDeclaredIdentityReviews([{ title: "The Amazing Spider-Man #238 CGC 9.6" }], metadata)).toEqual([]);
    expect(buildDeclaredIdentityReviews([{ title: "The Amazing Spider-Man #238 Signed CGC 9.6" }], metadata)[0]?.rationale).toContain("signature state differs");
  });

  it("exposes the vintage-toy packaging-form gate in the vision prompt", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("packaging form is a mandatory identity gate");
    expect(source).toContain("carded/on-card/blister-card");
  });

  it("promotes an unreadable review only when title and gallery rationale explicitly confirm the grade", () => {
    const result = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "The AFA 75+ grade is clearly readable in the additional gallery image and matches the target; the holder and item also match.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false }, }
    ], [{ title: "MOTU Man-at-Arms AFA 75+" }], "title=MOTU Man-at-Arms; category=vintage_toys; grade=75; certificationCompany=AFA");
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "medium" });
  });

  it("requests additional gallery images when the primary review cannot verify a graded target", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 3,
      title: "MOTU Man-at-Arms AFA Graded RARE",
      targetMetadata: "title=MOTU Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA",
      review: { verdict: "match", confidence: "high", rationale: "The holder matches, but the candidate grade is not visible." },
    })).toBe(true);
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 3,
      title: "MOTU Man-at-Arms AFA 8.0",
      targetMetadata: "title=MOTU Man-at-Arms; category=vintage_toys; grade=8.0; certificationCompany=AFA",
      review: { verdict: "match", confidence: "high", rationale: "The AFA 8.0 grade is readable and matches." },
    })).toBe(false);
  });

  it("escalates a graded target when the first image is interpreted as raw", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 3,
      title: "Mario Bros. 3 NES PSA Graded 9.0 CIB",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: { verdict: "mismatch", confidence: "high", rationale: "Candidate appears loose and un-slabbed with no visible PSA label or grade." },
    })).toBe(true);
    const normalized = conservativeGradedVisualReviews([
      { candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "Candidate appears loose and un-slabbed with no visible PSA label or grade." },
    ], [{ title: "Mario Bros. 3 NES PSA Graded 9.0 CIB" }], "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA");
    expect(normalized[0]).toMatchObject({ verdict: "unreadable", confidence: "low" });
    expect(normalized[0].rationale).toContain("additional-image/manual review");
  });

  it("escalates a single-thumbnail graded candidate to the promoted high-resolution image", () => {
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Mario Bros. 3 NES Nintendo Game PSA Graded 9.0 CIB Complete In Box Oval Seal",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: { verdict: "mismatch", confidence: "high", rationale: "Candidate appears raw and un-slabbed; no PSA label or numeric grade is visible in the thumbnail." },
    })).toBe(true);
    expect(shouldReviewAdditionalVisualImages({
      imageCount: 1,
      title: "Mario Bros. 3 NES Nintendo Game",
      targetMetadata: "title=Mario Bros. 3 NES; category=video_games; grade=9.0; certificationCompany=PSA",
      review: { verdict: "mismatch", confidence: "high", rationale: "Candidate appears raw and un-slabbed." },
    })).toBe(true);
  });

  it("preserves long visual explanations instead of cutting them off at 240 characters", () => {
    const ending = "The candidate front art, packaging, and visible certification details require manual comparison before any valuation decision.";
    const longRationale = `${"The target and candidate were compared across packaging, orientation, visible holder details, and front artwork. ".repeat(8)}${ending}`;
    const rows = normalizeVisualSourceReviews({
      reviews: [{ candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: longRationale }],
    }, 1);

    expect(rows[0].rationale.length).toBeGreaterThan(240);
    expect(rows[0].rationale).toContain(ending);
  });

  it("flags declared regional, printing, and variant conflicts before AI uncertainty can hide them", () => {
    const reviews = buildDeclaredIdentityReviews(
      [
        { title: "Edge of Spider-Verse #2 Mexican Foil Reprint" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
        { title: "Edge of Spider-Verse #2 Fifth Printing Variant" },
      ],
      "title=Edge of Spider-Verse #2 CGC 9.8; category=comics; grade=9.8",
    );
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0, 2]);
    expect(reviews[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(reviews[0].rationale).toContain("Declared identity conflict");
  });

  it("flags explicit Newsstand candidates when the target is Direct before visual review", () => {
    const reviews = buildDeclaredIdentityReviews(
      [
        { title: "Edge of Spider-Verse #2 CGC 9.8 Newsstand Edition" },
        { title: "Edge of Spider-Verse #2 CGC 9.8 Direct Market" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
      ],
      `title=Edge of Spider-Verse #2 CGC 9.8; category=comics; itemDetails=${JSON.stringify({ distributionType: "Direct" })}`,
    );
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0]);
    expect(reviews[0].rationale).toContain("Distribution Type is Direct");
  });

  it("flags explicit facsimile or reprint candidates when the target Facsimile field is No", () => {
    const reviews = buildDeclaredIdentityReviews(
      [
        { title: "Edge of Spider-Verse #2 CGC 9.8 Facsimile" },
        { title: "Edge of Spider-Verse #2 CGC 9.8 Reprint" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
      ],
      `title=Edge of Spider-Verse #2 CGC 9.8; category=comics; fullItemDetails=${JSON.stringify({ facsimile: "No" })}`,
    );
    expect(reviews.map((review) => review.candidateIndex)).toEqual([0, 1]);
    expect(reviews[0].rationale).toContain("Facsimile is No");
  });

  it("keeps the new identity conflicts out of the initial vision queue", () => {
    const candidates = [
      { candidateIndex: 0, item: { title: "Edge of Spider-Verse #2 Newsstand Edition" }, imageUrl: "https://example.com/newsstand.jpg" },
      { candidateIndex: 1, item: { title: "Edge of Spider-Verse #2 Direct Market" }, imageUrl: "https://example.com/direct.jpg" },
    ];
    const metadata = `title=Edge of Spider-Verse #2; category=comics; fullItemDetails=${JSON.stringify({ distributionType: "Direct" })}`;
    const declared = buildDeclaredIdentityReviews(candidates.map((candidate) => candidate.item), metadata);
    const queue = prioritizeVisualSourceCandidates(candidates, metadata, declared);
    expect(queue.map((candidate) => candidate.candidateIndex)).toEqual([1]);
  });

  it("does not guess a distribution type when a marketplace title is silent", () => {
    const reviews = buildDeclaredIdentityReviews(
      [{ title: "Edge of Spider-Verse #2 CGC 9.8" }],
      `title=Edge of Spider-Verse #2 CGC 9.8; itemDetails=${JSON.stringify({ distributionType: "Direct" })}`,
    );
    expect(reviews).toEqual([]);
  });

  it("keeps the identity gate source-neutral for every shared marketplace caller", () => {
    const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
    const clientSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    expect(routerSource).toContain("sourceLabel: 'eBay active listings'");
    expect(routerSource).toContain("sourceLabel: '130point sold listings'");
    expect(routerSource).toContain("sourceLabel: 'PWCC / Fanatics Collect sold listings'");
    expect(routerSource).toContain("buildVisualTargetMetadata");
    expect(routerSource).toContain("category: input.category");
    expect(routerSource).toContain("itemDetails: input.itemDetails");
    expect(routerSource).toContain("getCardsightAiData");
    expect(routerSource).toContain("itemType: z.string().nullish()");
    expect(clientSource).toContain("const leftHipstampSoldQuery");
    expect(clientSource).toContain("itemType: leftSearchItem.itemType");
    expect(clientSource).toContain("const leftCardsightAiQuery");
    expect(clientSource).toContain("itemType: leftSearchItem.itemType ?? undefined");
  });

  it("removes explicit Facsimile titles before the initial listing display and retains context", () => {
    const result = applyDeclaredIdentityFilter(
      [
        { title: "Edge of Spider-Verse: Facsimile Edition #2 CGC 9.8" },
        { title: "Edge of Spider-Verse #2 CGC 9.8" },
      ],
      `title=Edge of Spider-Verse #2 CGC 9.8; fullItemDetails=${JSON.stringify({ facsimile: "No" })}`,
    );
    expect(result.listings.map((listing) => listing.title)).toEqual(["Edge of Spider-Verse #2 CGC 9.8"]);
    expect(result.contextListings.map((listing) => listing.title)).toEqual(["Edge of Spider-Verse: Facsimile Edition #2 CGC 9.8"]);
    expect(result.removedCount).toBe(1);
  });

  it("uses adaptive 20-item batches until three matches or the 30-image ceiling", () => {
    expect(VISUAL_REVIEW_BATCH_SIZE).toBe(20);
    expect(VISUAL_REVIEW_TARGET_MATCHES).toBe(3);
    expect(VISUAL_REVIEW_MAX_CANDIDATES).toBe(30);
    const reviews = buildDeclaredIdentityReviews(
      Array.from({ length: 40 }, (_, index) => ({ title: `Comic #2 Fifth Printing ${index}` })),
      "title=Comic #2 CGC 9.8",
    );
    expect(reviews).toHaveLength(40);
  });

  it("prioritizes a bounded initial queue while preserving explicit conflicts outside vision", () => {
    const candidates = Array.from({ length: 60 }, (_, candidateIndex) => ({
      candidateIndex,
      item: { title: candidateIndex === 59 ? "Edge of Spider-Verse #2 Fifth Printing" : `Edge of Spider-Verse #2 CGC 9.8 copy ${candidateIndex}` },
      imageUrl: `https://example.com/${candidateIndex}.jpg`,
    }));
    const metadata = "title=Edge of Spider-Verse #2 CGC 9.8; category=comics; grade=9.8";
    const declared = buildDeclaredIdentityReviews(candidates.map(candidate => candidate.item), metadata);
    const queue = prioritizeVisualSourceCandidates(candidates, metadata, declared);
    expect(VISUAL_REVIEW_MAX_CANDIDATES).toBe(30);
    expect(queue).toHaveLength(30);
    expect(queue.some(candidate => candidate.candidateIndex === 59)).toBe(false);
    expect(candidates).toHaveLength(60);
  });

  it("builds the full image-bearing queue before applying the bounded priority cap", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    const candidateStart = source.indexOf("let allCandidates");
    const queueStart = source.indexOf("const reviewQueue = prioritizeVisualSourceCandidates", candidateStart);
    expect(candidateStart).toBeGreaterThanOrEqual(0);
    expect(queueStart).toBeGreaterThan(candidateStart);
    expect(source.slice(candidateStart, queueStart)).not.toContain(".slice(0, VISUAL_REVIEW_MAX_CANDIDATES)");
    expect(source.slice(queueStart, queueStart + 700)).toContain("prioritizeVisualSourceCandidates(reviewCandidates");
    expect(source).toContain(".slice(0, VISUAL_REVIEW_MAX_CANDIDATES);");
  });

  it("marks image-bearing candidates outside the bounded review window as review-only", () => {
    const result = applyVisualSourceReviews(
      [{ title: "reviewed" }, { title: "unreviewed" }],
      [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "same item" }],
      1,
    );
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match" });
    // The integration function adds the explicit required/not-reviewed state
    // after adaptive window accounting; retain a source contract assertion so
    // it cannot regress to an implicit acceptance path.
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain('evidenceDisposition: "not_visually_reviewed_window"');
    expect(source).toContain('visualRequirement: "required"');
  });

  it("preserves eBay visual status fields in the response consumed by the image-check panel", () => {
    const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
    expect(routerSource).toContain("visualReviewStatus: s.visualReviewStatus ?? null");
    expect(routerSource).toContain("visualReviewRationale: s.visualReviewRationale ?? null");
    expect(routerSource).toContain("collectEbayImageUrls");
    expect(routerSource).toContain("const normalizedImageUrls = Array.isArray(s.imageUrls) && s.imageUrls.length > 0");
    expect(routerSource).toContain("imageUrls: normalizedImageUrls");
    expect(routerSource).toContain("item?.imageUrl");
    expect(routerSource).toContain("item?.thumbnailUrl");
    expect(routerSource).toContain("imageUrls = collectEbayImageUrls(item)");
  });

  it("does not allow Mercari sold records to bypass universal preparation when a target image is absent", () => {
    const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
    expect(routerSource).not.toContain("if (!['disney_pins', 'coins'].includes(normalizedCategory) && !input.imageUrl)");
    expect(routerSource).toContain("const visualSourceLabel = normalizedCategory === 'coins'");
    expect(routerSource).toContain("Mercari ${normalizedCategory.replace(/_/g, ' ')} sold listings");
    expect(routerSource).toContain("visualReviewRequired: true");
  });

  it.each([
    ["cassette_tape", "cassette"],
    ["compact_disc", "CD"],
    ["vinyl_record", "vinyl record"],
    ["eight_track_tape", "8-track tape"],
  ])("holds a Music Good %s target when a candidate title declares Factory Sealed", (itemType, formatLabel) => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      itemType,
      isGraded: "no",
      itemDetails: JSON.stringify({ condition: "good", format: itemType }),
    });
    const reviews = buildDeclaredIdentityReviews(
      [{ title: `Factory Sealed NIRVANA — NEVERMIND ${formatLabel}`, imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    );
    expect(reviews[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(reviews[0]?.rationale).toContain("Music media condition differs");
  });

  it("preserves a top-level Music condition when itemDetails does not contain it", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      condition: "good",
      itemType: "cassette_tape",
      itemDetails: JSON.stringify({ format: "cassette_tape", isGraded: "no" }),
    });
    expect(targetMetadata).toContain('"condition":"good"');
    expect(buildDeclaredIdentityReviews(
      [{ title: "Factory Sealed NIRVANA — NEVERMIND Cassette Tape", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )[0]?.rationale).toContain("Music media condition differs");
  });

  it("does not treat New / Sealed and Factory Sealed as conflicting Music conditions", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      itemType: "cassette_tape",
      isGraded: "no",
      itemDetails: JSON.stringify({ condition: "sealed", format: "cassette_tape" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: "Factory Sealed NIRVANA — NEVERMIND Cassette Tape", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )).toEqual([]);
  });

  it("scores comparable Music formats on the approved identity signals", () => {
    const target = buildVisualTargetMetadata({
      title: "Kind of Blue",
      category: "music",
      itemType: "vinyl_record",
      fullItemDetails: {
        artist: "Miles Davis", releaseTitle: "Kind of Blue", format: "vinyl_record", recordLabel: "Columbia",
        catalogNumber: "CL 1355", releaseYear: "1959", country: "United States", edition: "First Pressing", packagingIncluded: "yes",
      },
    });
    const score = musicVisualScore({
      title: "Miles Davis Kind of Blue Columbia CL 1355 1959 First Pressing Vinyl Record",
      itemDetails: JSON.stringify({ artist: "Miles Davis", releaseTitle: "Kind of Blue", format: "vinyl_record", recordLabel: "Columbia", catalogNumber: "CL 1355", releaseYear: "1959", country: "United States", edition: "First Pressing", packagingIncluded: "yes" }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining([
      "artist", "releaseTitle", "format", "recordLabel", "catalogNumber", "releaseYear", "country", "edition", "packagingIncluded",
    ]));
  });

  it("scores Disney Pins / Individual Pin on the approved identity signals", () => {
    const target = buildVisualTargetMetadata({
      title: "Mickey Mouse Sorcerer Pin",
      category: "disney_pins",
      itemType: "individual_pin",
      fullItemDetails: {
        pinName: "Mickey Mouse Sorcerer Pin", character: "Mickey Mouse", series: "Sorcerer",
        year: "2024", pinTradingEvent: "D23", limitedEdition: "yes", openEdition: "no",
        artistProof: "no", preProduction: "no", backstampInformation: "© Disney D23",
      },
    });
    const score = disneyPinsIndividualVisualScore({
      title: "Mickey Mouse Sorcerer Pin D23 2024 Limited Edition",
      itemDetails: JSON.stringify({ pinName: "Mickey Mouse Sorcerer Pin", character: "Mickey Mouse", series: "Sorcerer", year: "2024", pinTradingEvent: "D23", limitedEdition: "yes", openEdition: "no", artistProof: "no", preProduction: "no", backstampInformation: "© Disney D23" }),
    }, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining(["pinName", "character", "series", "year", "pinTradingEvent", "limitedEdition", "openEdition"]));
  });

  it("scores Disney Pins / Pin Set and excludes Collection/Lot from ranking", () => {
    const target = buildVisualTargetMetadata({
      title: "Villains Collection",
      category: "disney_pins",
      itemType: "pin_set",
      fullItemDetails: { setName: "Villains Collection", completeSet: "yes", numberOfPins: "5", series: "Villains", charactersIncluded: "Maleficent Ursula", limitedEdition: "yes", missingPins: "none" },
    });
    const score = disneyPinsSetVisualScore({ title: "Villains Collection Complete Set of 5 Pins Limited Edition", itemDetails: JSON.stringify({ setName: "Villains Collection", completeSet: "yes", numberOfPins: 5, series: "Villains", charactersIncluded: "Maleficent Ursula", limitedEdition: "yes", missingPins: "none" }) }, target);
    expect(score.score).toBe(100);
    expect(disneyPinsVisualCap(95)).toBe(8);
    expect(disneyPinsVisualCap(85)).toBe(6);
    expect(disneyPinsVisualCap(75)).toBe(4);
    expect(disneyPinsVisualCap(65)).toBe(2);
    expect(disneyPinsVisualCap(59)).toBe(0);
    const lotTarget = buildVisualTargetMetadata({ title: "Mixed Disney Pin Lot", category: "disney_pins", itemType: "collection_lot", fullItemDetails: { setName: "Mixed", format: "collection_lot" } });
    expect(disneyPinsSetVisualScore({ title: "Mixed Disney Pin Lot" }, lotTarget).score).toBe(0);
  });

  it("uses the approved Music score-band caps and excludes Collection/Lot", () => {
    expect(musicVisualCap(95)).toBe(8);
    expect(musicVisualCap(85)).toBe(6);
    expect(musicVisualCap(75)).toBe(4);
    expect(musicVisualCap(65)).toBe(2);
    expect(musicVisualCap(59)).toBe(0);
    const collectionTarget = buildVisualTargetMetadata({ title: "Mixed Music Collection", category: "music", itemType: "collection_lot", fullItemDetails: { artist: "Various Artists", format: "collection_lot" } });
    expect(musicVisualScore({ title: "Mixed Vinyl and CD Lot", imageUrl: "https://example.com/music.jpg" }, collectionTarget).score).toBe(0);
  });

  it("treats the literal New / Sealed target value as sealed", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Nevermind",
      category: "music",
      itemType: "cassette_tape",
      condition: "New / Sealed",
      itemDetails: JSON.stringify({ format: "cassette_tape" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: "Sealed NIRVANA — NEVERMIND Cassette Tape", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )).toEqual([]);
  });

  it.each([
    ["excellent", "Good condition"],
    ["good", "Excellent condition"],
    ["fair", "Good condition"],
  ])("does not pre-exclude a subjective Music condition difference: target %s and candidate %s", (targetCondition, candidateCondition) => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Purple Rain",
      category: "music",
      condition: targetCondition,
      itemType: "vinyl_record",
      itemDetails: JSON.stringify({ format: "vinyl_record" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: `Prince — Purple Rain ${candidateCondition}`, imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )).toEqual([]);
  });

  it("applies Music format and identity filters while preserving incomplete provider fields", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Kind of Blue",
      category: "music",
      itemType: "vinyl_record",
      itemDetails: JSON.stringify({
        artist: "Miles Davis", releaseTitle: "Kind of Blue", format: "vinyl_record",
        recordLabel: "Columbia", catalogNumber: "CL 1355", country: "United States", releaseYear: "1959", edition: "First Pressing",
      }),
    });
    const candidates = [
      { title: "Miles Davis Kind of Blue CD", itemDetails: JSON.stringify({ format: "compact_disc" }) },
      { title: "Miles Davis Kind of Blue", itemDetails: JSON.stringify({ artist: "John Coltrane" }) },
      { title: "Miles Davis Kind of Blue", itemDetails: JSON.stringify({ catalogNumber: "CL 1356" }) },
      { title: "Miles Davis Kind of Blue", itemDetails: JSON.stringify({ releaseYear: "1960" }) },
      { title: "Kind of Blue", itemDetails: JSON.stringify({}) },
    ];
    const reviews = buildDeclaredIdentityReviews(candidates, targetMetadata);
    expect(reviews).toHaveLength(4);
    expect(reviews.map(review => review.candidateIndex)).toEqual([0, 1, 2, 3]);
    expect(reviews[0].rationale).toContain("Music format differs");
    expect(reviews[1].rationale).toContain("Music artist differs");
    expect(reviews[2].rationale).toContain("Music catalog number differs");
    expect(reviews[3].rationale).toContain("Music release year differs");
  });

  it("applies format-specific Music filters to cassette, CD, and 8-track titles", () => {
    const cases = [
      ["cassette_tape", "compact_disc"],
      ["compact_disc", "eight_track_tape"],
      ["eight_track_tape", "vinyl_record"],
    ] as const;
    for (const [targetType, candidateType] of cases) {
      const targetMetadata = buildVisualTargetMetadata({
        title: "Rumours", category: "music", itemType: targetType,
        itemDetails: JSON.stringify({ artist: "Fleetwood Mac", releaseTitle: "Rumours", format: targetType }),
      });
      const reviews = buildDeclaredIdentityReviews([{ title: "Fleetwood Mac Rumours", itemType: candidateType }], targetMetadata);
      expect(reviews[0].rationale).toContain("Music format differs");
    }
  });

  it("does not apply Music identity filters to Collection/Lot targets", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Mixed Music Collection", category: "music", itemType: "collection_lot",
      itemDetails: JSON.stringify({ artist: "Various Artists", format: "collection_lot" }),
    });
    expect(buildDeclaredIdentityReviews([
      { title: "Mixed CD and Vinyl Lot", itemType: "compact_disc", itemDetails: JSON.stringify({ artist: "Various Artists" }) },
    ], targetMetadata)).toEqual([]);
  });

  it.each([
    "sports_cards",
    "pokemon",
    "coins",
    "comics",
    "video_games",
    "stamps",
    "movies",
    "autographs",
    "disney_pins",
    "vintage_toys",
    "music",
  ])("allows ordinary condition differences for Mercari visual review across %s", (category) => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Example collectible",
      category,
      condition: "excellent",
      itemDetails: JSON.stringify({ condition: "excellent" }),
    });
    const candidate = {
      title: "Example collectible",
      itemDetails: JSON.stringify({ condition: "good" }),
      imageUrl: "https://example.com/candidate.jpg",
    };
    expect(buildDeclaredIdentityReviews([candidate], targetMetadata)).toHaveLength(category === "music" ? 0 : 1);
    expect(buildDeclaredIdentityReviews(
      [candidate],
      targetMetadata,
      { ignoreSubjectiveConditionDifferences: true },
    )).toEqual([]);
  });

  it("still pre-excludes a normal Music target against For Parts", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "Purple Rain",
      category: "music",
      condition: "excellent",
      itemType: "vinyl_record",
      itemDetails: JSON.stringify({ format: "vinyl_record" }),
    });
    expect(buildDeclaredIdentityReviews(
      [{ title: "Prince — Purple Rain For Parts", imageUrl: "https://example.com/candidate.jpg" }],
      targetMetadata,
    )[0]?.rationale).toContain("Music media condition differs");
  });

  it("requires the visual reviewer to gate graded versus raw packaging first", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("graded/slabbed or raw/ungraded");
    expect(source).toContain("Graded-versus-raw status is a mandatory identity gate");
    expect(source).toContain("target is graded and the candidate is visibly raw");
    expect(source).toContain("candidate numeric or descriptive grade is also mandatory");
    expect(source).toContain("candidate grade is not clearly readable");
    expect(source).toContain("grading-evidence conflict");
    expect(source).toContain('detail: "high"');
    expect(source).toContain("grade qualifier, label designation, or comic certification label status");
    expect(source).toContain("structured metadata explicitly says Is graded = No");
    expect(source).toContain("Treat the target as raw/ungraded for this review");
  });

  it("requires the visual reviewer to gate sports-card set versus single-card form", () => {
    const instruction = sportsCardSetInstruction("title=1985 Topps Complete Set; category=sports_cards; itemType=card_set");
    expect(instruction).toContain("item form is a mandatory identity gate");
    expect(instruction).toContain("one individual card");
    expect(instruction).toContain("mark mismatch with high confidence");
    expect(sportsCardSetInstruction("title=1985 Topps #401; category=sports_cards; itemType=single_card")).toBe("");
  });

  it("pre-excludes an individual card from a Sports Cards / Set target", () => {
    const target = buildVisualTargetMetadata({
      title: "1985 Topps Complete Set",
      category: "sports_cards",
      itemType: "card_set",
      fullItemDetails: {
        setName: "Topps",
        setType: "Factory Set",
        missingCards: "no",
      },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "1985 Topps #401 PSA 10", imageUrl: "https://example.com/card.jpg" },
    ], target);
    expect(reviews[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(reviews[0]?.rationale).toContain("individual card");
  });

  it("does not reject an ambiguous set title solely because it says cards", () => {
    const target = buildVisualTargetMetadata({
      title: "1985 Topps Complete Set",
      category: "sports_cards",
      itemType: "card_set",
      fullItemDetails: { setType: "Factory Set", missingCards: "no" },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "1985 Topps Cards Collection", imageUrl: "https://example.com/set.jpg" },
    ], target)).toEqual([]);
  });

  it("ignores unique certificate IDs when visually comparing graded coins", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain('category === "coins" && isGraded');
    expect(source).toContain("certificate IDs/numbers are unique to each individual coin");
    expect(source).toContain("never mark a coin mismatch because the visible certificate ID differs");
    expect(source).toContain("never require the IDs to match");
  });

  it("ignores unique holder identifiers for graded items across every source", () => {
    const instruction = gradedIdentifierInstruction();
    expect(instruction).toContain("every graded or certified item");
    expect(instruction).toContain("certificate numbers");
    expect(instruction).toContain("serial numbers");
    expect(instruction).toContain("grading-holder barcodes");
    expect(instruction).toContain("QR codes");
    expect(instruction).toContain("never require them to match");
    expect(instruction).toContain("every marketplace and data source");
  });

  it("shows each reviewed candidate price beside its match or mismatch verdict", () => {
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    expect(pageSource).toContain("formatVisualReviewPrice");
    expect(pageSource).toContain("listing?.price ?? listing?.soldPrice");
    expect(pageSource).toContain("{formatVisualReviewPrice(listing)}");
  });

  it("keeps visual review bounded and fails closed when the provider times out", () => {
    expect(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS).toBe(20_000);
    expect(VISUAL_REVIEW_OVERALL_DEADLINE_MS).toBe(120_000);
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("completed_with_timeout");
    expect(source).toContain("Remaining candidates are retained for manual review and cannot enter valuation implicitly.");
    expect(source).toContain("controller.abort()");
  });

  it("explains timeout and partial-review states in the eBay Active UI", () => {
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    expect(pageSource).toContain("maximum 2 minutes");
    expect(pageSource).toContain("Only candidates with a completed visual result can support current-value evidence");
    expect(pageSource).toContain("cannot enter the analyzer implicitly");
  });
});
