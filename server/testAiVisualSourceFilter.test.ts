import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "./_core/llm";
import { findMaterialMetadataConflicts } from "../shared/testAiMetadataConflict";
import { titleCompletenessState } from "../shared/testAiTitleEvidence";
import {
  applyVisualSourceReviews,
  applyDeclaredIdentityFilter,
  buildVisualTargetMetadata,
  buildMetadataFieldComparisons,
  withMetadataFieldComparisons,
  annotatePreVisualComparableScores,
  buildDeclaredIdentityReviews,
  coinAdmissionReason,
  conservativeComicVisualReviews,
  conservativeCoinVisualReviews,
  conservativeGradedVisualReviews,
  gradedIdentifierInstruction,
  disneyPinsVisualInstruction,
  disneyPinsEvidenceIsExact,
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
  vintageToyVisualScore,
  universalMetadataScore,
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
		  autographAuthenticationConflictReason,
		  autographMarketExclusionReason,
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
  it("uses provider title aliases consistently across category ranking models", () => {
    const coinTarget = buildVisualTargetMetadata({ title: "1999 United States Silver Dollar", category: "coins", itemType: "single_coin", fullItemDetails: { country: "United States", year: "1999", denomination: "Dollar" } });
    expect(coinsSingleVisualScore({ itemTitle: "1999 United States Silver Dollar", itemDetails: JSON.stringify({ country: "United States", year: "1999", denomination: "Dollar" }) }, coinTarget).score).toBeGreaterThan(0);

    const comicTarget = buildVisualTargetMetadata({ title: "Amazing Spider-Man 300", category: "comics", itemType: "single_comic", fullItemDetails: { comicTitle: "Amazing Spider-Man", issueNumber: "300" } });
    expect(comicsSingleVisualScore({ listingTitle: "Amazing Spider-Man 300", itemDetails: JSON.stringify({ comicTitle: "Amazing Spider-Man", issueNumber: "300" }) }, comicTarget).matched).toEqual(expect.arrayContaining(["comicTitle", "issueNumber"]));

    const pokemonTarget = buildVisualTargetMetadata({ title: "1999 Pokémon Charizard Base Set #4/102", category: "pokemon", itemType: "single_card", fullItemDetails: { cardName: "Charizard", setName: "Base Set", cardNumber: "4/102" } });
    expect(pokemonVisualScore({ productName: "1999 Pokémon Charizard Base Set #4/102", itemDetails: JSON.stringify({ cardName: "Charizard", setName: "Base Set", cardNumber: "4/102" }) }, pokemonTarget).score).toBeGreaterThan(0);

    const stampTarget = buildVisualTargetMetadata({ title: "1976 United States Bicentennial", category: "stamps", itemType: "single_stamp", fullItemDetails: { country: "United States", year: "1976" } });
    expect(stampsSingleVisualScore({ listingTitle: "1976 United States Bicentennial", itemDetails: JSON.stringify({ country: "United States", year: "1976" }) }, stampTarget).score).toBeGreaterThan(0);

    const musicTarget = buildVisualTargetMetadata({ title: "The Beatles Abbey Road", category: "music", itemType: "vinyl_record", fullItemDetails: { artist: "The Beatles", releaseTitle: "Abbey Road", format: "Vinyl" } });
    expect(musicVisualScore({ itemTitle: "The Beatles Abbey Road Vinyl LP", itemDetails: JSON.stringify({ artist: "The Beatles", releaseTitle: "Abbey Road", format: "Vinyl" }) }, musicTarget).score).toBeGreaterThan(0);

    const pinTarget = buildVisualTargetMetadata({ title: "Mickey Mouse 50th Anniversary Pin", category: "disney_pins", itemType: "individual_pin", fullItemDetails: { pinName: "Mickey Mouse", series: "50th Anniversary" } });
    expect(disneyPinsIndividualVisualScore({ productName: "Mickey Mouse 50th Anniversary Pin", itemDetails: JSON.stringify({ pinName: "Mickey Mouse", series: "50th Anniversary" }) }, pinTarget).score).toBeGreaterThan(0);
  });
  it("keeps category item-type routing consistent across nested metadata and legitimate product wording", () => {
    const nestedComic = buildVisualTargetMetadata({ title: "Amazing Spider-Man 300", category: "comics", fullItemDetails: { itemType: "single_issue", comicTitle: "Amazing Spider-Man", issueNumber: "300" } });
    expect(comicsSingleVisualScore({ title: "Amazing Spider-Man #300" }, nestedComic).matched).toEqual(expect.arrayContaining(["comicTitle", "issueNumber"]));

    const nestedStamp = buildVisualTargetMetadata({ title: "United States C1", category: "stamps", fullItemDetails: { itemType: "single_stamp", country: "United States", scottNumber: "C1" } });
    expect(stampsSingleVisualScore({ title: "United States C1" }, nestedStamp).score).toBeGreaterThan(0);

    const nestedSportsProduct = buildVisualTargetMetadata({ title: "1986 Topps Factory Box", category: "sports_cards", fullItemDetails: { itemType: "box_set", productName: "Factory Box", productFormat: "Factory Sealed", productType: "Box", manufacturer: "Topps", year: "1986" } });
    expect(sportsCardUnopenedVisualScore({ title: "1986 Topps Factory Box Sealed", itemDetails: JSON.stringify({ productName: "Factory Box", productFormat: "Factory Sealed", productType: "Box", manufacturer: "Topps", year: "1986" }) }, nestedSportsProduct).score).toBeGreaterThan(0);

    const pokemonSingle = buildVisualTargetMetadata({ title: "1999 Pokémon Charizard Base Set #4/102", category: "pokemon", itemType: "single_card" });
    expect(isMultiItemLot({ title: "1999 Pokémon Charizard Base Set #4/102" }, pokemonSingle)).toBe(false);
    const legoTarget = buildVisualTargetMetadata({ title: "LEGO 6285 Pirates", category: "vintage_toys", itemType: "lego" });
    expect(isMultiItemLot({ title: "LEGO 6285 Pirates Set Complete" }, legoTarget)).toBe(false);

    const pokemonProduct = buildVisualTargetMetadata({ title: "Pokémon Base Set Booster Bundle", category: "pokemon", itemType: "unopened_product", fullItemDetails: { productName: "Booster Bundle", setName: "Base Set", factorySealed: "Yes" } });
    expect(buildDeclaredIdentityReviews([{ title: "Pokémon Base Set Booster Bundle Factory Sealed" }], pokemonProduct)).toEqual([]);

    const autographTarget = buildVisualTargetMetadata({ title: "Jane Doe signed photo", category: "autographs", itemType: "signed_item", fullItemDetails: { signer: "Jane Doe", signedItemType: "Photo", authenticationCompany: "JSA" } });
    expect(autographMarketRelevanceScore({ title: "Jane Doe signed object JSA", itemDetails: JSON.stringify({ itemType: "Photo" }) }, autographTarget).matched).toContain("signed item type");

    const modelKitTarget = buildVisualTargetMetadata({ title: "P-51 Mustang model kit", category: "vintage_toys", itemType: "model/kit", fullItemDetails: { modelKitName: "P-51 Mustang", brand: "Monogram" } });
    expect(vintageToyVisualScore({ title: "Monogram P-51 Mustang model kit", itemType: "model/kit" }, modelKitTarget).score).toBeGreaterThan(0);
  });
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

  it("normalizes a signed Cut to the Paper signed-item type", () => {
    const paperTarget = buildVisualTargetMetadata({
      title: "Marlon Brando signed paper",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Marlon Brando", signedItemType: "Paper", authenticationCompany: "JSA" },
    });
    const cut = { title: "Marlon Brando Signed Cut Signature COA" };
    const score = autographMarketRelevanceScore(cut, paperTarget);
    expect(score.matched).toEqual(expect.arrayContaining(["signer", "signed item type", "authenticated"]));
    expect(score.score).toBe(70);
    expect(autographObjectTypeMismatchReason(paperTarget, cut)).toBeNull();
    expect(autographValuationEligibility(cut, paperTarget)).toMatchObject({ eligible: true });

    const baseballTarget = buildVisualTargetMetadata({
      title: "Marlon Brando signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Marlon Brando", signedItemType: "Baseball" },
    });
    expect(autographObjectTypeMismatchReason(baseballTarget, cut)).toContain("different signed object types");
  });

  it("does not infer Sports from a physical autograph object such as Paper or Photo", () => {
    const entertainmentPaperTarget = buildVisualTargetMetadata({
      title: "Marlon Brando signed paper",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Marlon Brando", signedItemType: "Paper", autographCategory: "Entertainment" },
    });
    const paperScore = autographMarketRelevanceScore(
      { title: "Marlon Brando Signed Autographed Paper" },
      entertainmentPaperTarget,
    );
    expect(paperScore.score).toBe(60);
    expect(paperScore.matched).toEqual(expect.arrayContaining(["signer", "signed item type"]));
    expect(paperScore.matched).not.toContain("autograph category");

    const entertainmentPhotoTarget = buildVisualTargetMetadata({
      title: "Marlon Brando signed photo",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Marlon Brando", signedItemType: "Photo", autographCategory: "Entertainment" },
    });
    const photoScore = autographMarketRelevanceScore(
      { title: "Marlon Brando Signed Autographed Photo" },
      entertainmentPhotoTarget,
    );
    expect(photoScore.matched).not.toContain("autograph category");

    const sportsTarget = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", autographCategory: "Sports" },
    });
    expect(autographMarketRelevanceScore({ title: "Babe Ruth Signed Baseball" }, sportsTarget).matched).toContain("autograph category");
  });

  it("recognizes generic COA wording as authentication evidence without awarding company-match points", () => {
    const target = buildVisualTargetMetadata({
      title: "Donald Trump signed photo",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Donald Trump", signedItemType: "Photo", authenticationCompany: "JSA" },
    });
    const genericCoa = autographMarketRelevanceScore({ title: "Donald Trump Signed Photo with Dual COAs" }, target);
    const certificatePhrase = autographMarketRelevanceScore({ title: "Donald Trump Signed Photo with Certificate of Authenticity" }, target);
    const missingCoa = autographMarketRelevanceScore({ title: "Donald Trump Signed Photo without COA" }, target);

    expect(genericCoa.score).toBe(70);
    expect(genericCoa.matched).toEqual(expect.arrayContaining(["authenticated"]));
    expect(genericCoa.matched).not.toContain("authentication company");
    expect(certificatePhrase.score).toBe(70);
    expect(certificatePhrase.matched).toContain("authenticated");
    expect(missingCoa.score).toBe(60);
    expect(missingCoa.matched).not.toContain("authenticated");
  });

  it("hard-excludes a certified Autographs candidate when the target explicitly says Authentication Included = No", async () => {
    const target = buildVisualTargetMetadata({
      title: "Barry Bonds Autographed Baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: {
        signer: "Barry Bonds",
        signedItemType: "Baseball",
        autographCategory: "Sports",
        authenticationIncluded: "no",
      },
    });
    const candidate = { title: "Barry Bonds Autographed Baseball Steiner Sports Memorabilia Original Signed", imageUrl: "https://example.com/steiner.jpg" };
    expect(autographAuthenticationConflictReason(target, candidate)).toMatch(/Steiner.*hard exclusion/i);
    expect(autographMarketExclusionReason(target, candidate)).toMatch(/certified\/authenticated.*Steiner.*hard exclusion/i);
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "Autograph market range",
      targetMetadata: target,
      listings: [candidate],
    });
    expect(result.listings).toHaveLength(0);
    expect(result.contextListings?.[0]).toMatchObject({ hardException: true, valuationEligible: false });
    expect(result.preVisualExcludedCount).toBe(1);
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
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

  it("does not treat a different person mentioned in a title as the target signer", () => {
    const target = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", authenticationCompany: "JSA" },
    });
    const otherSigner = { title: "Sadaharu Oh Yomiuri Giants Japan Babe Ruth Home Run Signed Autograph Baseball JSA" };
    expect(autographMarketRelevanceScore(otherSigner, target).matched).not.toContain("signer");
    expect(autographValuationEligibility(otherSigner, target)).toMatchObject({ eligible: false });
    expect(autographValuationEligibility(otherSigner, target).reasons).toContain("signer is missing or does not match the target");
    expect(autographValuationEligibility({ title: "Babe Ruth New York Yankees Single Signed Baseball JSA Authenticated" }, target)).toMatchObject({ eligible: true });
  });

  it("applies the shared autograph gate to Goldin-style wrong-object and wrong-signer lots", async () => {
    const target = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", authenticationCompany: "PSA/DNA" },
    });
    const goldinLots = [
      { title: "1929 R316 Kashin Publications Signed Babe Ruth PSA 9 MINT Autograph", completed: true },
      { title: "Historic New York Yankees Babe Ruth Sale to Yankees Payment Check Signed By Jacob Ruppert PSA/DNA", completed: true },
      { title: "June 12, 1939 First Day Cooperstown Envelope Signed by Ruth, Cobb, Wagner, Mack & Grove PSA/DNA", completed: true },
      { title: "1934 Tour Of Japan Multi-Signed Ball with Ruth, Gehrig, Foxx, Mack and Berg Beckett PSA/DNA", completed: true },
    ];

    const result = await filterVisualSourceCandidates({
      sourceRole: "marketplace",
      sourceLabel: "Goldin specialist auction records",
      targetMetadata: target,
      listings: goldinLots,
    });

    expect(result.listings).toHaveLength(0);
    expect(result.contextListings).toHaveLength(4);
    expect(result.contextListings?.every((listing) => listing.evidenceDisposition === "context_only")).toBe(true);
    expect(result.contextListings?.map((listing) => listing.evidenceReasons?.join(" ")).join(" ")).toMatch(/signer|signed object type|signers|score/i);
  });

  it("treats signer suffixes as distinct people for Autographs valuation", () => {
    const target = buildVisualTargetMetadata({
      title: "Donald Trump signed photo",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Donald Trump", signedItemType: "Photo", authenticationCompany: "JSA" },
    });
    const jrTitle = { title: "Donald Trump Jr Signed Photo JSA" };
    const jrStructured = { title: "Donald Trump signed photo JSA", itemDetails: JSON.stringify({ signer: "Donald Trump Jr", signedItemType: "Photo", authenticationCompany: "JSA" }) };

    expect(autographMarketRelevanceScore(jrTitle, target).matched).not.toContain("signer");
    expect(autographMarketRelevanceScore(jrStructured, target).matched).not.toContain("signer");
    expect(autographValuationEligibility(jrTitle, target)).toMatchObject({ eligible: false });
    expect(autographValuationEligibility(jrStructured, target)).toMatchObject({ eligible: false });
    expect(autographValuationEligibility({ title: "Donald Trump Signed Photo JSA" }, target)).toMatchObject({ eligible: true });
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
    expect(result.contextListings?.filter((listing) => !listing.hardException).map((listing) => listing.title)).toEqual([unknown.title]);
    expect(result.contextListings?.filter((listing) => listing.hardException)).toHaveLength(2);
    expect(result.contextListings?.filter((listing) => listing.hardException).every((listing) => listing.valuationEligible === false)).toBe(true);
    expect(result.removedCount).toBe(2);
    expect(result.preVisualExcludedCount).toBe(2);
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
  });

  it("excludes facsimile wording from the canonical provider title", () => {
    const target = buildVisualTargetMetadata({
      title: "Babe Ruth signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Babe Ruth", signedItemType: "Baseball", authenticationCompany: "JSA" },
    });
    const facsimile = {
      normalizedListingTitle: "Babe Ruth Facsimile Autographed Baseball & Authenticated",
      title: "Babe Ruth Autographed Baseball",
    };
    expect(autographReplicaReason(facsimile)).toContain("Facsimile");
    expect(autographValuationEligibility(facsimile, target)).toMatchObject({ eligible: false });
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
    expect(result.contextListings?.filter((listing) => !listing.hardException).map((listing) => listing.title)).toEqual([baseball.title, unknown.title]);
    expect(result.contextListings?.filter((listing) => listing.hardException)).toHaveLength(2);
    expect(result.contextListings?.filter((listing) => listing.hardException).every((listing) => listing.valuationEligible === false)).toBe(true);
    expect(result.removedCount).toBe(2);
    expect(result.preVisualExcludedCount).toBe(2);
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
  });

  it("excludes parenthesized multi-item Autographs lots from a single-item market range", () => {
    const target = buildVisualTargetMetadata({
      title: "Barry Bonds signed baseball",
      category: "autographs",
      itemType: "signed_item",
      fullItemDetails: { signer: "Barry Bonds", signedItemType: "Baseball", authenticationCompany: "BAS" },
    });
    expect(autographMarketExclusionReason(target, { title: "(36) Signed Baseballs" })).toMatch(/multi-item|lot filter|single item/i);
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
    expect(score.score).toBe(90);
    expect(score.matched).toEqual(expect.arrayContaining(["cardName", "setName", "cardNumber", "language", "finish", "cardType"]));
    expect(pokemonVisualCap(score.score)).toBe(8);

    const gradedTarget = buildVisualTargetMetadata({ title: "1999 Pokémon Charizard #4/102", category: "pokemon", itemType: "single_card", grade: "9.8", certificationCompany: "PSA", fullItemDetails: { cardName: "Charizard", setName: "Base Set", cardNumber: "4/102", language: "English", finish: "Holo", cardType: "Regular", rarity: "Holo Rare", editionEra: "Wizards" } });
    const gradedScore = pokemonVisualScore({ title: "1999 Pokémon Charizard Base Set #4/102 English Holo Regular Holo Rare Wizards PSA 9.8" , itemDetails: JSON.stringify({ cardName: "Charizard", setName: "Base Set", cardNumber: "4/102", language: "English", finish: "Holo", cardType: "Regular", rarity: "Holo Rare", editionEra: "Wizards" }) }, gradedTarget);
    expect(gradedScore.score).toBe(100);
    expect(gradedScore.matched).toEqual(expect.arrayContaining(["gradingCompany", "grade"]));
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
    expect(setScore.score).toBe(85);
    expect(buildDeclaredIdentityReviews([{ title: "Pokémon Jungle Complete Set English", itemDetails: JSON.stringify({ setName: "Jungle", numberOfCardsInSet: "64" }) }], setTarget)[0]?.rationale).toContain("set differs");

    const productTarget = buildVisualTargetMetadata({ title: "Pokémon Base Set Booster Box Factory Sealed", category: "pokemon", itemType: "unopened_product", fullItemDetails: { productName: "Booster Box", setName: "Base Set", productType: "Booster Box", language: "English", releaseYear: "1999", factorySealed: "Yes", authenticated: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" } });
    const productScore = pokemonVisualScore({ title: "Pokémon Base Set English Booster Box 1999 Factory Sealed BBCE FASC", itemDetails: JSON.stringify({ productName: "Booster Box", setName: "Base Set", productType: "Booster Box", language: "English", releaseYear: "1999", factorySealed: "Yes", authenticated: "Yes", authenticationCompany: "BBCE", fromASealedCase: "Yes" }) }, productTarget);
    expect(productScore.score).toBe(90);
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
    expect(individualScore.score).toBe(90);
    expect(individualScore.matched).toEqual(expect.arrayContaining(["movieTitle", "format", "releaseYear", "edition", "region", "sealed"]));

    const gradedIndividualTarget = buildVisualTargetMetadata({ title: "The Matrix", category: "movies", itemType: "individual_movie", grade: "9.8", certificationCompany: "CGC", fullItemDetails: { title: "The Matrix", format: "Blu-ray", releaseYear: 1999, edition: "Standard", region: "Region 1", sealed: "No" } });
    const gradedIndividualScore = moviesIndividualVisualScore({ title: "The Matrix Blu-ray 1999 Standard Region 1 Opened CGC 9.8" , itemDetails: JSON.stringify({ format: "Blu-ray", releaseYear: 1999, edition: "Standard", region: "Region 1", sealed: "No" }) }, gradedIndividualTarget);
    expect(gradedIndividualScore.score).toBe(100);
    expect(gradedIndividualScore.matched).toEqual(expect.arrayContaining(["gradingCompany", "grade"]));

    const boxTarget = buildVisualTargetMetadata({ title: "The Lord of the Rings Trilogy", category: "movies", itemType: "box_set", fullItemDetails: { boxSetName: "The Lord of the Rings Trilogy", format: "Blu-ray", numberOfMovies: 3, edition: "Standard", sealed: "Yes" } });
    const boxScore = moviesBoxSetVisualScore({ title: "Lord of the Rings Trilogy 3 Movie Blu-ray Box Set Standard Sealed", itemDetails: JSON.stringify({ format: "Blu-ray", numberOfMovies: 3, edition: "Standard", sealed: "Yes" }) }, boxTarget);
    expect(boxScore.score).toBe(90);
    expect(boxScore.matched).toEqual(expect.arrayContaining(["boxSetName", "format", "numberOfMovies", "edition", "sealed"]));
  });

  it("treats equivalent season wording as the same Movie box set", () => {
    const target = buildVisualTargetMetadata({
      title: "Moonlighting Season 1&2",
      category: "movies",
      itemType: "box_set",
      fullItemDetails: { boxSetName: "Moonlighting Season 1&2", format: "DVD", releaseYear: 1985 },
    });
    const candidates = [
      { title: "Moonlighting Seasons One and Two (DVD) COMPLETE", itemDetails: JSON.stringify({ format: "DVD", releaseYear: 1985, numberOfMovies: 2 }) },
      { title: "Moonlighting Seasons 1 & 2 (DVD) Cybill Shepherd Bruce Willis", itemDetails: JSON.stringify({ format: "DVD", releaseYear: 1985, numberOfMovies: 2 }) },
    ];

    for (const candidate of candidates) {
      const score = moviesBoxSetVisualScore(candidate, target);
      expect(score.score).toBe(65);
      expect(score.matched).toEqual(expect.arrayContaining(["boxSetName", "format", "numberOfMovies"]));
    }
  });
  it("sends a season-range Movie Box Set candidate to visual review instead of hiding it below the score minimum", async () => {
    mockedInvokeLLM.mockResolvedValue(structuredVisualResponse({
      reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The same Moonlighting box set is shown." }],
    }) as never);
    const target = buildVisualTargetMetadata({
      title: "Moonlighting Season 1 & 2",
      category: "movies",
      itemType: "box_set",
      fullItemDetails: { boxSetName: "Moonlighting Season 1 & 2", format: "DVD" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "eBay Sold-Comps",
      targetImageUrl: "https://example.com/moonlighting-target.jpg",
      targetMetadata: target,
      listings: [{ title: "Moonlighting Seasons 1 & 2 DVD Collection", itemType: "collection", imageUrl: "https://example.com/moonlighting-candidate.jpg" }],
    });
    expect(result.listings[0]?.metadataMatchScore).toBe(65);
    expect(result.listings).toHaveLength(1);
    expect(result.contextListings ?? []).toHaveLength(0);
    expect(mockedInvokeLLM).toHaveBeenCalled();
  });

  it("keeps the Hercules Blu-ray visual verdict attached to the reviewed candidate", async () => {
    mockedInvokeLLM.mockResolvedValue(structuredVisualResponse({
      reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The target and candidate show the same Hercules Blu-ray packaging." }],
    }) as never);
    const target = buildVisualTargetMetadata({
      title: "Hercules",
      category: "movies",
      itemType: "individual_movie",
      fullItemDetails: { title: "Hercules", format: "Blu-ray", releaseYear: 1997 },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "eBay Active Listings",
      targetImageUrl: "https://example.com/hercules-target.jpg",
      targetMetadata: target,
      listings: [{
        title: "Hercules (Blu-ray, 1997) No DVD Disc, Tested Disney",
        itemDetails: JSON.stringify({ format: "Blu-ray", releaseYear: 1997 }),
        imageUrl: "https://example.com/hercules-candidate.jpg",
      }],
    });
    expect(result.reviewedCount).toBe(1);
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({
      metadataMatchScore: 60,
      metadataMatchRank: 1,
      visualRequirement: "required",
      visualReviewStatus: "match",
    });
    expect(result.contextListings ?? []).toHaveLength(0);
    expect(result.listings[0]?.visualReviewRationale).toContain("same Hercules Blu-ray packaging");
  });

  it("treats a movie Special Edition label as a soft difference before visual review", async () => {
    mockedInvokeLLM.mockResolvedValue(structuredVisualResponse({
      reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The Hercules cover artwork and Blu-ray packaging match the target." }],
    }) as never);
    const target = buildVisualTargetMetadata({
      title: "Disney Hercules (1997) Blu-ray",
      category: "movies",
      itemType: "individual_movie",
      fullItemDetails: { title: "Disney Hercules", format: "Blu-ray", releaseYear: 1997 },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "eBay Active Listings",
      targetImageUrl: "https://example.com/hercules-target.jpg",
      targetMetadata: target,
      listings: [{
        title: "Hercules (Blu-ray + DVD, 1997) Special Edition",
        itemDetails: JSON.stringify({ format: "Blu-ray", releaseYear: 1997 }),
        imageUrl: "https://example.com/hercules-special-edition.jpg",
      }],
    });
    expect(result.reviewedCount).toBe(1);
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match", visualRequirement: "required" });
    expect(result.contextListings ?? []).toHaveLength(0);
    expect(mockedInvokeLLM).toHaveBeenCalled();
  });

  it("keeps generic Movie collections excluded even for a Box Set target", () => {
    const target = buildVisualTargetMetadata({
      title: "Moonlighting Season 1 & 2",
      category: "movies",
      itemType: "box_set",
      fullItemDetails: { boxSetName: "Moonlighting Season 1 & 2", format: "DVD" },
    });
    const candidate = { title: "Mixed Movie Collection DVD Lot", itemType: "collection", imageUrl: "https://example.com/generic-collection.jpg" };
    expect(buildDeclaredIdentityReviews([candidate], target)[0]?.rationale).toMatch(/collection or lot/i);
  });

  it("treats Arabic, written, and Roman numerals as equivalent title evidence", () => {
    const target = buildVisualTargetMetadata({
      title: "Rocky 5",
      category: "movies",
      itemType: "individual_movie",
      fullItemDetails: { title: "Rocky 5", format: "DVD" },
    });
    const written = moviesIndividualVisualScore({ title: "Rocky Five DVD" }, target);
    const roman = moviesIndividualVisualScore({ title: "Rocky V DVD" }, target);

    expect(written.score).toBe(45);
    expect(roman.score).toBe(written.score);
    expect(roman.matched).toEqual(expect.arrayContaining(["movieTitle", "format"]));
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
    const gameTarget = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemType: "game", isGraded: "No", fullItemDetails: { gameTitle: "Super Mario Bros. 3", platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" } });
    const gameScore = videoGameGameVisualScore({ title: "Super Mario Bros. 3 NES 1990 NTSC-U Standard", isGraded: "No", itemDetails: JSON.stringify({ platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" }) }, gameTarget);
    expect(gameScore.score).toBe(95);
    expect(gameScore.awards.find(award => award.field === 'isGraded')?.awardedPoints).toBe(15);
    expect(gameScore.awards.some(award => ['grade', 'gradingCompany'].includes(award.field))).toBe(false);
    expect(gameScore.matched).toEqual(expect.arrayContaining(["gameTitle", "platform", "releaseYear", "region", "edition", "isGraded", "upcEan"]));
    expect(gameScore.unknown).toContain("productForm");

    const gradedGameTarget = buildVisualTargetMetadata({ title: "Super Mario Bros. 3", category: "video_games", itemType: "game", isGraded: "Yes", grade: "9.8", certificationCompany: "PSA", fullItemDetails: { gameTitle: "Super Mario Bros. 3", platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" } });
    const gradedGameScore = videoGameGameVisualScore({ title: "Super Mario Bros. 3 NES 1990 NTSC-U Standard PSA 9.8", isGraded: "Yes", itemDetails: JSON.stringify({ platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" }) }, gradedGameTarget);
    expect(gradedGameScore.score).toBe(95);
    expect(gradedGameScore.matched).toEqual(expect.arrayContaining(["gradingCompany", "grade"]));

    const structuredGradedGameScore = videoGameGameVisualScore({ title: "Super Mario Bros. 3 NES", gradingCompany: "PSA", grade: "9.8", itemDetails: JSON.stringify({ platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" }) }, gradedGameTarget);
    expect(structuredGradedGameScore.score).toBe(95);

    const ungradedCandidateAgainstUngradedTarget = videoGameGameVisualScore({ title: "Super Mario Bros. 3 NES 1990 NTSC-U Standard", isGraded: "No", itemDetails: JSON.stringify({ platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" }) }, gameTarget);
    const gradedCandidateAgainstUngradedTarget = videoGameGameVisualScore({ title: "Super Mario Bros. 3 NES 1990 NTSC-U Standard PSA 9.8", isGraded: "Yes", itemDetails: JSON.stringify({ platform: "NES", releaseYear: 1990, region: "NTSC-U", edition: "Standard", sealed: "No", upc: "123456789012" }) }, gameTarget);
    expect(ungradedCandidateAgainstUngradedTarget.score).toBeGreaterThan(gradedCandidateAgainstUngradedTarget.score);

    const consoleTarget = buildVisualTargetMetadata({ title: "Nintendo NES", category: "video_games", itemType: "console", isGraded: "No", fullItemDetails: { consoleName: "NES", modelNumber: "NES-001", region: "NTSC-U", workingCondition: "Working", originalBoxIncluded: "Yes", cablesIncluded: "Yes", controllersIncluded: "Yes" } });
    const consoleScore = videoGameConsoleVisualScore({ title: "Nintendo NES NES-001 Working NTSC-U", isGraded: "No", itemDetails: JSON.stringify({ modelNumber: "NES-001", region: "NTSC-U", workingCondition: "Working", originalBoxIncluded: "Yes", cablesIncluded: "Yes", controllersIncluded: "Yes" }) }, consoleTarget);
    expect(consoleScore.score).toBe(100);
    expect(consoleScore.matched).toEqual(expect.arrayContaining(["consoleName", "modelNumber", "region", "workingCondition", "originalBoxIncluded", "cablesIncluded", "controllersIncluded"]));

    const accessoryTarget = buildVisualTargetMetadata({ title: "NES Controller", category: "video_games", itemType: "accessory", isGraded: "No", fullItemDetails: { accessoryType: "Controller", accessoryName: "NES Controller", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working", originalPackaging: "Yes" } });
    const accessoryScore = videoGameAccessoryVisualScore({ title: "Nintendo NES Controller Working", isGraded: "No", itemDetails: JSON.stringify({ accessoryType: "Controller", accessoryName: "NES Controller", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working", originalPackaging: "Yes" }) }, accessoryTarget);
    expect(accessoryScore.score).toBe(100);
    expect(accessoryScore.matched).toEqual(expect.arrayContaining(["accessoryType", "accessoryName", "compatiblePlatform", "manufacturer", "workingCondition", "originalPackaging"]));
    const cosmeticConditionScore = videoGameAccessoryVisualScore({ title: "Nintendo NES Controller", condition: "Like New", itemDetails: JSON.stringify({ accessoryType: "Controller", accessoryName: "NES Controller", platform: "NES", manufacturer: "Nintendo", originalPackaging: "Yes" }) }, accessoryTarget);
    expect(cosmeticConditionScore.matched).not.toContain("workingCondition");
    expect(cosmeticConditionScore.score).toBe(85);
    expect(cosmeticConditionScore.matched).not.toContain('isGraded');
    const powerGloveTarget = buildVisualTargetMetadata({ title: "NES Power Glove", category: "video_games", itemType: "accessory", fullItemDetails: { accessoryType: "Controller", accessoryName: "Power Glove", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working", originalPackaging: "Yes" } });
    for (const [title, expectedScore, expectedFields] of [
      ["VTG Nintendo NES Power Glove Controller Large Extremely RARE Sz L Original Box", 85, ["accessoryType", "accessoryName", "compatiblePlatform", "manufacturer", "originalPackaging"]],
      ["Nintendo NES Power Glove Large L New Open Box Complete w/ Manuals Mattel", 65, ["accessoryName", "compatiblePlatform", "manufacturer", "originalPackaging"]],
    ] as const) {
      const titleScore = videoGameAccessoryVisualScore({ title }, powerGloveTarget);
      expect(titleScore.score).toBe(expectedScore);
      expect(titleScore.matched).toEqual(expect.arrayContaining(expectedFields));
      expect(buildDeclaredIdentityReviews([{ title }], buildVisualTargetMetadata({ title: "NES Power Glove", category: "video_games", itemType: "accessory", fullItemDetails: { accessoryType: "Controller", accessoryName: "Power Glove", platform: "NES", manufacturer: "Nintendo", originalPackaging: "Yes" } }))).toEqual([]);
    }
    const providerGenericLabelCandidate = {
      title: "Nintendo NES Power Glove Large L New Open Box Complete w/ Manuals Mattel",
      itemDetails: JSON.stringify({ accessoryName: "Controller", accessoryType: "Controller", platform: "NES", manufacturer: "Nintendo", originalPackaging: "Yes" }),
    };
    const providerGenericLabelScore = videoGameAccessoryVisualScore(providerGenericLabelCandidate, powerGloveTarget);
    expect(providerGenericLabelScore.score).toBe(85);
    expect(providerGenericLabelScore.matched).toEqual(expect.arrayContaining(["accessoryType", "accessoryName", "compatiblePlatform", "manufacturer", "originalPackaging"]));
    expect(buildDeclaredIdentityReviews([providerGenericLabelCandidate], powerGloveTarget)).toEqual([]);
    const aliasedTitleCandidate = {
      itemTitle: "PAX Power Glove NES Famicom Controller Tested Working Boxed Vintage Japan",
      itemDetails: JSON.stringify({ accessoryName: "PAX Power Glove Nintendo Famicom NES Controller", accessoryType: "Controller", platform: "NES", manufacturer: "Nintendo", workingCondition: "Tested Working", originalPackaging: "Boxed" }),
    };
    expect(videoGameAccessoryVisualScore(aliasedTitleCandidate, powerGloveTarget).score).toBe(95);
    expect(buildDeclaredIdentityReviews([aliasedTitleCandidate], powerGloveTarget)).toEqual([]);
  });

  it("preserves the shared canonical title source and structured metadata at the visual boundary", () => {
    const candidate = normalizeVisualSourceCandidate({
      normalizedListingTitle: "PAX Power Glove NES Famicom Controller Tested Working Boxed",
      normalizedListingTitleSource: "itemTitle",
      normalizedListingTitleCandidates: [
        "PAX Power Glove NES Famicom Controller Tested Working Boxed",
        "Provider fallback name",
      ],
      normalizedStructuredMetadata: {
        itemSpecifics: { AccessoryType: "Controller", Platform: "NES" },
        aspects: { Brand: "Nintendo" },
      },
      itemTitle: "PAX Power Glove NES Famicom Controller Tested Working Boxed",
      name: "Provider fallback name",
    });

    expect(candidate.title).toBe("PAX Power Glove NES Famicom Controller Tested Working Boxed");
    expect(candidate.titleSource).toBe("itemTitle");
    expect(candidate.titleCandidates).toEqual([
      "PAX Power Glove NES Famicom Controller Tested Working Boxed",
      "Provider fallback name",
    ]);
    expect(candidate.details).toEqual({
      accessoryType: "Controller",
      platform: "NES",
      brand: "Nintendo",
    });
  });

  it("uses marketplace aspects and accessory aliases for Video Games / Accessory", () => {
    const target = buildVisualTargetMetadata({
      title: "NES Power Glove",
      category: "video_games",
      itemType: "accessory",
      isGraded: "No",
      fullItemDetails: {
        accessoryType: "Controller",
        accessoryName: "Power Glove",
        platform: "NES",
        manufacturer: "Nintendo",
        workingCondition: "Working",
        originalPackaging: "Yes",
      },
    });
    const candidate = {
      title: "Nintendo Power Glove Tested Working Original Box",
      itemSpecifics: [
        { name: "Type", value: "Game Controller" },
        { name: "Model Name", value: "Power Glove" },
        { name: "Compatible System", value: "NES" },
        { name: "Brand", value: "Nintendo" },
        { name: "Condition", value: "Tested Working" },
        { name: "Packaging", value: "Original Box" },
        { name: "Is Graded", value: "No" },
      ],
    };
    const score = videoGameAccessoryVisualScore(candidate, target);
    expect(score.score).toBe(100);
    expect(score.matched).toEqual(expect.arrayContaining(["accessoryType", "accessoryName", "compatiblePlatform", "manufacturer", "workingCondition", "originalPackaging"]));
    expect(buildDeclaredIdentityReviews([candidate], target)).toEqual([]);
  });

  it("uses the approved Video Games score-band cap limits", () => {
    expect(videoGameVisualCap(95)).toBe(8);
    expect(videoGameVisualCap(85)).toBe(6);
    expect(videoGameVisualCap(75)).toBe(4);
    expect(videoGameVisualCap(65)).toBe(2);
    expect(videoGameVisualCap(50)).toBe(2);
    expect(videoGameVisualCap(49)).toBe(0);
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
    expect(result.contextListings).toHaveLength(2);
    expect(result.contextListings?.[0]).toMatchObject({ metadataMatchRank: 1, visualReviewStatus: "not_reviewed", visualRequirement: "not_required_no_target_image" });
    expect(result.contextListings?.[1]).toMatchObject({ metadataMatchRank: 2, metadataMatchScore: 45, visualReviewStatus: "not_reviewed" });
    expect(result.contextListings?.[1]?.visualReviewRationale).toContain("below the visual-review minimum of 60");
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
    expect(result.contextListings?.[0]).toMatchObject({ metadataMatchRank: 2, metadataMatchScore: 20, evidenceDisposition: "context_only" });
    expect(result.listings).toHaveLength(1);
    expect(result.contextListings).toHaveLength(1);
    expect(result.contextListings?.[0]?.visualExecution?.attempts).toHaveLength(0);
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

  it("requires the full Sports Cards player identity instead of surname-only credit", () => {
    const target = buildVisualTargetMetadata({
      title: "1989 Upper Deck Ken Griffey Jr #1 PSA 10",
      category: "sports_cards",
      itemType: "single_card",
      grade: "10",
      certificationCompany: "PSA",
      fullItemDetails: { player: "Ken Griffey Jr", year: "1989", manufacturer: "Upper Deck", cardNumber: "1" },
    });
    const exact = sportsCardSingleVisualScore({ title: "1989 Upper Deck Ken Griffey Jr #1 PSA 10" }, target);
    const missingSuffix = sportsCardSingleVisualScore({ title: "1989 Upper Deck Ken Griffey #1 PSA 10" }, target);
    const differentPlayer = sportsCardSingleVisualScore({ title: "1989 Upper Deck Fred Griffey Jr #1 PSA 10" }, target);
    expect(exact.matched).toContain("player");
    expect(missingSuffix.matched).not.toContain("player");
    expect(differentPlayer.matched).not.toContain("player");
    expect(exact.score).toBeGreaterThan(missingSuffix.score);
    expect(exact.score).toBeGreaterThan(differentPlayer.score);
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

    const movieBoxSetTarget = buildVisualTargetMetadata({
      title: "Moonlighting Season 1 & 2",
      category: "movies",
      itemType: "box_set",
      fullItemDetails: { boxSetName: "Moonlighting Season 1 & 2", format: "DVD" },
    });
    expect(isMultiItemLot({ title: "Moonlighting Seasons 1 & 2 DVD Bundle" }, movieBoxSetTarget)).toBe(false);
    const individualMovieTarget = buildVisualTargetMetadata({ title: "Moonlighting Season 1", category: "movies", itemType: "individual_movie" });
    expect(isMultiItemLot({ title: "Moonlighting Seasons 1 & 2 DVD Bundle" }, individualMovieTarget)).toBe(true);
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

  it("keeps the top-ranked video-game candidates visible when no target image exists", async () => {
    const target = buildVisualTargetMetadata({
      title: "NES Nintendo Power Glove",
      category: "video_games",
      itemType: "accessory",
      fullItemDetails: { accessoryType: "controller", accessoryName: "Power Glove", platform: "NES" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: 'ebay',
      sourceLabel: "eBay Active Listings",
      targetMetadata: target,
      listings: [
        { title: "NES Nintendo Power Glove", accessoryType: "controller", accessoryName: "Power Glove", platform: "NES", imageUrl: "https://example.com/rank-1.jpg" },
        { title: "NES Nintendo Power Glove controller", accessoryType: "controller", accessoryName: "Power Glove", platform: "NES", imageUrl: "https://example.com/rank-2.jpg" },
        { title: "Nintendo NES Power Glove replacement parts", imageUrl: "https://example.com/rank-3.jpg" },
      ],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.listings).toEqual([]);
    expect(result.contextListings?.slice(0, 2).map((item) => item.metadataMatchRank)).toEqual([1, 2]);
    expect(result.contextListings?.slice(0, 2).every((item) => item.visualRequirement === "not_required_no_target_image")).toBe(true);
    expect(result.contextListings?.slice(0, 2).every((item) => String(item.visualReviewRationale).includes("target item has no usable image"))).toBe(true);
  });

  it("keeps one item-type score on comparable pre-vision holdouts", async () => {
    const target = buildVisualTargetMetadata({
      title: "NES Nintendo Power Glove",
      category: "video_games",
      itemType: "accessory",
      fullItemDetails: { accessoryType: "controller", accessoryName: "Power Glove", platform: "NES" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "eBay Active Listings",
      targetImageUrl: "https://example.com/target.jpg",
      targetMetadata: target,
      listings: [{
        title: "NES Nintendo Power Glove Large L New Open Box Complete w/ Manuals Mattel",
        imageUrl: "https://example.com/candidate.jpg",
      }],
    });
    const holdout = result.contextListings?.[0];
    expect(holdout?.evidenceDisposition).toBe("context_only");
    expect(holdout?.metadataMatchScore).toEqual(expect.any(Number));
    expect(holdout?.metadataMatchReasons).toEqual(expect.any(Array));
    expect(holdout?.visualRequirement).toBe("not_required_pre_visual");
    expect(holdout?.visualReviewStatus).not.toBe("match");
  });

  it("accepts a browser-visible HTTP target image for visual review", async () => {
    mockedInvokeLLM.mockResolvedValue(structuredVisualResponse({
      reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The target and candidate show the same item." }],
    }) as never);
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "eBay Active Listings",
      targetImageUrl: "http://example.com/target.jpg",
      targetMetadata: buildVisualTargetMetadata({ title: "NES Nintendo Power Glove", category: "video_games", itemType: "accessory", fullItemDetails: { accessoryType: "controller", accessoryName: "Power Glove", platform: "NES" } }),
      listings: [{ title: "NES Nintendo Power Glove", accessoryType: "controller", accessoryName: "Power Glove", platform: "NES", imageUrl: "https://example.com/candidate.jpg" }],
    });
    expect(result.status).not.toBe("skipped_no_target_image");
    expect(mockedInvokeLLM).toHaveBeenCalled();
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

    const movieBoxSetTarget = buildVisualTargetMetadata({
      title: "Moonlighting Season 1 & 2 DVD excellent",
      category: "movies",
      itemType: "box_set",
      condition: "excellent",
      fullItemDetails: { boxSetName: "Moonlighting Season 1 & 2", format: "DVD", numberOfMovies: 2 },
    });
    const preOwnedCandidate = {
      title: "Moonlighting Seasons 1 & 2 (DVD) Complete w/ Excellent Case & 6 Discs",
      condition: "Pre-Owned",
      itemType: "collection",
      imageUrl: "https://example.com/moonlighting-preowned.jpg",
    };
    expect(buildDeclaredIdentityReviews([preOwnedCandidate], movieBoxSetTarget)).toEqual([]);
    expect(buildDeclaredIdentityReviews([preOwnedCandidate], movieBoxSetTarget, { ignoreSubjectiveConditionDifferences: true })).toEqual([]);
    expect(prepareUniversalVisualCandidates([preOwnedCandidate], movieBoxSetTarget).contextReasons).toEqual(new Map());
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
    expect(unavailablePath).toContain("reviews: []");
  });

  it("does not count a deterministic Conan title conflict as actually reviewed", async () => {
    const target = buildVisualTargetMetadata({
      title: "Conan the Destroyer",
      category: "movies",
      itemType: "individual_movie",
      fullItemDetails: { title: "Conan the Destroyer", format: "VHS" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "marketplace",
      sourceLabel: "Sold-Comps — Mercari Sold",
      targetImageUrl: "https://example.com/conan-target.jpg",
      targetMetadata: target,
      listings: [{
        title: "Conan CGC 8.0 A VHS Tape",
        imageUrl: "https://example.com/conan-candidate.jpg",
      }],
    });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
    expect(result.reviewedCount).toBe(0);
    expect(result.reviews).toEqual([]);
    expect(result.contextListings?.[0]).toMatchObject({
      visualRequirement: "not_required_pre_visual",
      visualReviewStatus: "mismatch",
      evidenceDisposition: "context_only",
    });
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
      visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, rawOrLooseVisible: false, identityMatches: true, denominationMatches: true },
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
      visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, rawOrLooseVisible: false, identityMatches: true, denominationMatches: true },
    };

    const reconciled = reconcileCoinPrimaryReviewForAdjudication(firstPass, metadata, "1896 Morgan Silver Dollar PCGS MS63");
    expect(reconciled).toMatchObject({ verdict: "match", confidence: "high" });

    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("const reconciledPrimaryReviews = primaryReviews.map");
    expect(source).toContain("const needsCoinAdjudication = isCoinMetadata(targetMetadata);");
  });

  it("runs the independent second review for an exact-title Mercari coin holder crop before making an admission decision", async () => {
    const metadata = "title=1896 Morgan PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={\"year\":\"1896\",\"variety\":\"Morgan\"}";
    const cropEvidence = { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false, rawOrLooseVisible: false, identityMatches: true, denominationMatches: true };
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

  it("sends an explicit Disney visual match directly to analyzer evidence", () => {
    const listings = [{ title: "Disney Mickey D23 Pin" }, { title: "Disney Minnie D23 Pin" }, { title: "Disney Mickey D23 Pin" }];
    const reviews = [
      { candidateIndex: 0, verdict: "rough_match" as const, confidence: "high" as const, rationale: "Character and colors are plausible, but the pin artwork is partly obscured." },
      { candidateIndex: 1, verdict: "mismatch" as const, confidence: "high" as const, rationale: "Different character and pin silhouette." },
      { candidateIndex: 2, verdict: "match" as const, confidence: "high" as const, rationale: "The character, artwork, silhouette, colors, and backing card visibly match." },
    ];
    const result = applyVisualSourceReviews(listings, reviews, listings.length, { requireExactMatch: true });
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "rough_match", evidenceDisposition: "warning_review" });
    expect(result.listings[1]).toMatchObject({ visualReviewStatus: "mismatch", evidenceDisposition: "warning_review" });
    expect(result.listings[2]).toMatchObject({ visualReviewStatus: "match" });
    expect(result.listings[2]).not.toHaveProperty("evidenceDisposition");

    const confirmed = applyVisualSourceReviews(listings, [{
      ...reviews[2]!,
      candidateIndex: 0,
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match",
        initialConfidence: "high",
        retryStatus: "performed",
        adjudicationStatus: "confirmed",
        finalPass: "high_resolution_retry",
      },
    }], 1, { requireExactMatch: true });
    expect(hasCompletedDisneyPinsAdjudication({ ...reviews[2]!, visualAudit: undefined })).toBe(false);
    expect(hasCompletedDisneyPinsAdjudication({ ...reviews[2]!, visualAudit: confirmed.listings[0]?.visualAudit })).toBe(true);
    expect(confirmed.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("clears only the stale provisional Disney blocker when the same candidate later confirms", () => {
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
      rationale: "The independent review confirms the exact Disney Pin.",
      visualEvidence: exactEvidence,
      visualAudit: {
        imageCount: 1,
        initialVerdict: "match" as const,
        initialConfidence: "high" as const,
        retryStatus: "performed" as const,
        adjudicationStatus: "confirmed" as const,
        finalPass: "high_resolution_retry" as const,
        initialEvidence: exactEvidence,
        finalEvidence: exactEvidence,
      },
    };
    const result = applyVisualSourceReviews(
      [{
        title: "Disney Eeyore Around the World Pin",
        evidenceDisposition: "warning_review",
        evidenceReasons: [],
        visualAdmissionReason: "The independent Disney Pin image comparison did not complete; the initial AI result is retained for context only and cannot enter valuation.",
      }],
      [review],
      1,
      { requireExactMatch: true },
    );

    expect(result.listings[0]).toMatchObject({ visualReviewStatus: "match" });
    expect(result.listings[0]).not.toHaveProperty("visualAdmissionReason");
    expect(result.listings[0]).not.toHaveProperty("evidenceDisposition");
  });

  it("keeps the explicit Disney visual match eligible when retry metadata is unavailable", () => {
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
    expect(result.listings[0]).not.toHaveProperty("visualAdmissionReason");
    expect(result.listings[0]).toMatchObject({ visualAudit: { adjudicationStatus: "unavailable" } });
  });

  it("does not let generic raw/ungraded reconciliation promote a Disney Pin", () => {
    const metadata = "title=Disney Eeyore Pin; category=disney_pins; isGraded=No";
    const review = { candidateIndex: 0, verdict: "unreadable" as const, confidence: "medium" as const, rationale: "Both pins are raw and the artwork matches exactly." };
    expect(normalizeExplicitUngradedVisualReviews([review], metadata)[0]).toMatchObject({ verdict: "unreadable" });
  });

  it("does not downgrade a completed Disney visual match because diagnostic evidence fields are incomplete", () => {
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
    expect(review).toMatchObject({ verdict: "match", confidence: "high" });
    expect(review.rationale).toContain("artwork differs");
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
    expect(source).toContain("The primary job is exact image comparison");
    expect(source).toContain("the initial result is provisional audit evidence only and cannot enter valuation");
    expect(disneyPinsVisualInstruction("category=disney_pins")).toContain("Primary pin identity is authoritative");
    expect(disneyPinsVisualInstruction("category=disney_pins")).toContain("generic backing card or packaging variation alone is a soft difference");
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

  it("accepts descriptive Disney Pins titles when the meaningful individual-pin name is present", () => {
    const target = buildVisualTargetMetadata({
      title: "Donald Duck Black & White Snapshots",
      category: "disney_pins",
      itemType: "single_pin",
      fullItemDetails: { pinName: "Donald Duck Black & White Snapshots", character: "Donald Duck", series: "Snapshots" },
    });
    expect(buildDeclaredIdentityReviews([{ title: "2011 Walt Disney World Pin 84196 WDW Donald Duck Black & White Snapshots", imageUrl: "https://example.com/catalog.jpg" }], target)).toHaveLength(0);
    expect(buildDeclaredIdentityReviews([{ title: "Disney Trading Pin - Donald Duck Black & White Snapshots", imageUrl: "https://example.com/trading.jpg" }], target)).toHaveLength(0);
    expect(buildDeclaredIdentityReviews([{ title: "Minnie Mouse Black & White Snapshots Disney Pin", imageUrl: "https://example.com/wrong-character.jpg" }], target)[0]?.rationale).toContain("pin name differs");
    expect(buildDeclaredIdentityReviews([{ title: "DLR PWP Collection Sepia Snapshots Donald Duck Black White Disney Pin (A2)", imageUrl: "https://example.com/single-pin.jpg" }], target)).toHaveLength(0);
    const eeyoreTarget = buildVisualTargetMetadata({
      title: "Around the World Eeyore Pin",
      category: "disney_pins",
      itemType: "single_pin",
      fullItemDetails: { pinName: "Around the World Eeyore", character: "Eeyore", series: "Around the World" },
    });
    expect(buildDeclaredIdentityReviews([{ title: "Disney Pin HKDL Eeyore Name Tag Mystery Collection", imageUrl: "https://example.com/mystery-collection-pin.jpg" }], eeyoreTarget)).toHaveLength(0);
    expect(buildDeclaredIdentityReviews([{ title: "UK Disney Store Winnie the Pooh Eeyore and Piglet Christmas 2002 Pin E7", imageUrl: "https://example.com/character-pin.jpg" }], eeyoreTarget)).toHaveLength(0);
    expect(buildDeclaredIdentityReviews([{ title: "Disney Trading Pin * Eeyore * Sitting * From Winnie the Pooh", imageUrl: "https://example.com/sitting-eeyore.jpg" }], eeyoreTarget)).toHaveLength(0);
    expect(buildDeclaredIdentityReviews([{ title: "2003 Official WDW Walt Disney World Pin Eeyore Donkey Pink Bow Winnie the Pooh", imageUrl: "https://example.com/bow-eeyore.jpg" }], eeyoreTarget)).toHaveLength(0);
    expect(buildDeclaredIdentityReviews([{ title: "Disney Trading Pin Minnie Mouse Sitting From Winnie the Pooh", imageUrl: "https://example.com/minnie.jpg" }], eeyoreTarget)[0]?.rationale).toContain("pin name differs");
    expect(isMultiItemLot({ title: "Disney Sitting Eeyore Pooh 2008 Pin C4", itemType: "Collection", imageUrl: "https://example.com/provider-label.jpg" }, eeyoreTarget)).toBe(false);
    expect(isMultiItemLot({ title: "Disney Sitting Eeyore Pooh 2008 Pin C4 Collection Lot of 5", itemType: "Collection", imageUrl: "https://example.com/real-lot.jpg" }, eeyoreTarget)).toBe(true);
    const princessTarget = buildVisualTargetMetadata({
      title: "Disney Designer Ultimate Princess Collection",
      category: "disney_pins",
      itemType: "single_pin",
      fullItemDetails: { pinName: "Disney Designer Ultimate Princess Collection Aurora", character: "Aurora", series: "Disney Designer Ultimate Princess Collection" },
    });
    expect(isMultiItemLot({ title: "Disney Designer Ultimate Princess Collection Aurora Hinged Pin Limited Edition", itemType: "Collection/Lot", imageUrl: "https://example.com/princess-single.jpg" }, princessTarget)).toBe(false);
    expect(isMultiItemLot({ title: "Disney Designer Ultimate Princess Collection Aurora Collection Lot of 3", itemType: "Collection/Lot", imageUrl: "https://example.com/princess-lot.jpg" }, princessTarget)).toBe(true);
    expect(buildDeclaredIdentityReviews([{ title: "Disney Pin Collection Lot of 5", imageUrl: "https://example.com/true-lot.jpg" }], target)[0]?.rationale).toContain("collection, lot");
  });

  it("allows a single Disney Pin through the full pre-visual filter despite eBay Collection/Lot metadata", async () => {
    mockedInvokeLLM.mockResolvedValue(structuredVisualResponse({
      reviews: [{ candidateIndex: 0, verdict: "match", confidence: "high", rationale: "The Eeyore pin artwork and backing presentation match the target." }],
    }) as never);
    const target = buildVisualTargetMetadata({
      title: "Eeyore Name Tag Mystery Pin",
      category: "disney_pins",
      itemType: "single_pin",
      fullItemDetails: { pinName: "Eeyore Name Tag Mystery", character: "Eeyore", series: "HKDL" },
    });
    const result = await filterVisualSourceCandidates({
      sourceRole: "ebay",
      sourceLabel: "eBay Active Listings",
      targetImageUrl: "https://example.com/eeyore-target.jpg",
      targetMetadata: target,
      listings: [
        {
          title: "Disney Pin HKDL Eeyore Name Tag Mystery Collection",
          itemType: "Collection/Lot",
          itemDetails: JSON.stringify({ pinName: "Eeyore Name Tag Mystery", character: "Eeyore", series: "HKDL" }),
          imageUrl: "https://example.com/eeyore-single.jpg",
        },
        {
          title: "Disney Eeyore and Piglet Pin Set of 2",
          itemType: "Collection/Lot",
          imageUrl: "https://example.com/eeyore-set.jpg",
        },
      ],
    });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    expect(result.reviewedCount).toBe(1);
    expect(result.listings.map((listing) => listing.title)).toEqual(["Disney Pin HKDL Eeyore Name Tag Mystery Collection"]);
    expect(result.contextListings?.map((listing) => listing.title)).toEqual(["Disney Eeyore and Piglet Pin Set of 2"]);
    expect(result.contextListings?.[0]?.visualReviewRationale).toContain("multi-item");
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
    expect(source).toContain('provider: args.visualProvider');
    expect(source).toContain('if (provider === "openai") return "gpt-6-luna"');
    expect(source).toContain('model: visualReviewModel(args.visualProvider, "initial")');
    expect(source).toContain('model: visualReviewModel(args.visualProvider, "retry", needsFocusedGradeEscalation)');
    expect(source).toContain('initialModel: visualReviewModel(args.visualProvider, "initial")');
    expect(source).toContain('finalModel: visualReviewModel(args.visualProvider, "initial")');
    expect(source).toContain('reasoning: needsFocusedGradeEscalation ? { effort: "low" } : undefined');
  });

  it("treats sealed and CIB graded video games as separate forms and fails closed on target-form conflict", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("item form is a mandatory identity gate: sealed, CIB/complete-in-box, boxed-only, loose/raw, and parts-only are distinct comparable cohorts");
    expect(source).toContain("A candidate label that visibly says CIB is not the same as a target label that visibly says Sealed");
    expect(source).toContain("target's structured details say CIB or Complete in Box while its visible holder label says Sealed, and the target does not also have Sealed=Yes");
    expect(source).toContain("${videoGameFormInstruction(targetMetadata)}");
    expect(source).toContain("VIDEO-GAME LABEL CHECK: read the printed form designation on each visible grading label before deciding");
    expect(source).toContain("A clear PSA slab whose label says CIB is a graded CIB game—not a raw or loose cartridge");
    expect(source).toContain("${focusedVideoGameLabelInstruction(targetMetadata)}");
    expect(source).toContain("Descriptive sealed-label suffixes such as A+, A++, or A+++ are soft evidence");
  });

  it("treats Sealed=Yes as Complete in Box=Yes and does not call matching target metadata conflicting", () => {
    const target = buildVisualTargetMetadata({
      title: "Grand Theft Auto III PS2 Sealed Graded PSA 9.4",
      category: "video_games",
      itemType: "game",
      grade: "9.4",
      certificationCompany: "PSA",
      fullItemDetails: { gameTitle: "Grand Theft Auto III", platform: "PS2", sealed: "yes", completeInBox: "No" },
    });
    expect(target).toContain('"sealed":"Yes"');
    expect(target).toContain('"completeInBox":"Yes"');
    const rationale = "Both images show a PSA slab with a readable 9.4 grade and a sealed Grand Theft Auto III for PlayStation 2. The target's structured details say Complete in Box: Yes while the visible holder label says Sealed; the target form is therefore conflicting.";
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "unreadable",
        confidence: "low",
        rationale,
        visualEvidence: {
          slabVisible: true,
          gradingLabelVisible: true,
          graderVisible: true,
          numericGradeVisible: true,
          gradeMatches: true,
          rawOrLooseVisible: false,
          identityMatches: true, artworkMatches: true,
        },
      },
    ], [{ title: "Grand Theft Auto III PS2 Sealed Graded PSA 9.4" }], target);
    expect(result[0]).toMatchObject({ verdict: "match" });
    expect(result[0]?.rationale).toContain("Sealed=Yes logically implies Complete in Box=Yes");
  });

  it("keeps a real target Sealed versus candidate CIB conflict blocked", () => {
    const target = buildVisualTargetMetadata({
      title: "Grand Theft Auto III PS2 Sealed Graded PSA 9.4",
      category: "video_games",
      itemType: "game",
      grade: "9.4",
      certificationCompany: "PSA",
      fullItemDetails: { gameTitle: "Grand Theft Auto III", platform: "PS2", sealed: "yes", completeInBox: "yes" },
    });
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "unreadable",
        confidence: "low",
        rationale: "The target is visibly Sealed while the candidate label reads CIB Complete in Box; this is a sealed versus CIB form conflict.",
        visualEvidence: {
          slabVisible: true,
          gradingLabelVisible: true,
          graderVisible: true,
          numericGradeVisible: true,
          gradeMatches: true,
          rawOrLooseVisible: false,
          identityMatches: true, artworkMatches: true,
        },
      },
    ], [{ title: "Grand Theft Auto III PS2 CIB Graded PSA 9.4" }], target);
    expect(result[0]?.verdict).toBe("unreadable");
  });

  it("treats title-derived Sealed and structured Sealed as the same complete form", () => {
    const target = buildVisualTargetMetadata({
      title: "Grand Theft Auto III PS2",
      category: "video_games",
      itemType: "game",
      fullItemDetails: { gameTitle: "Grand Theft Auto III", platform: "PS2", sealed: "Yes", completeInBox: "No" },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "Grand Theft Auto III PS2 Sealed PSA 9.4", fullItemDetails: { sealed: "Yes", completeInBox: "Yes" } },
    ], target)).toEqual([]);
  });

  it("treats a CIB-only candidate as different from a Sealed target", () => {
    const target = buildVisualTargetMetadata({
      title: "Grand Theft Auto III PS2",
      category: "video_games",
      itemType: "game",
      fullItemDetails: { gameTitle: "Grand Theft Auto III", platform: "PS2", sealed: "Yes", completeInBox: "Yes" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "Grand Theft Auto III PS2 Complete in Box PSA 9.4" },
    ], target);
    expect(reviews[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(reviews[0]?.rationale).toContain("Product form differs");
  });

  it("treats a Sealed candidate as different from a CIB-only target", () => {
    const target = buildVisualTargetMetadata({
      title: "Grand Theft Auto III PS2",
      category: "video_games",
      itemType: "game",
      fullItemDetails: { gameTitle: "Grand Theft Auto III", platform: "PS2", sealed: "No", completeInBox: "Yes" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "Grand Theft Auto III PS2 Sealed PSA 9.4" },
    ], target);
    expect(reviews[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
    expect(reviews[0]?.rationale).toContain("Product form differs");
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
    expect(source).toContain("const comparisonListings = args.listings.map((listing) => ({");
    expect(source).toContain("const universalPreparation = prepareUniversalVisualCandidates(comparisonListings, targetMetadata);");
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

  it("treats a video-game sealed-label suffix as soft evidence when the protected identity fields match", () => {
    const metadata = `title=Grand Theft Auto III PS2; category=video_games; grade=9.4; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ gradeQualifier: "A++", sealed: "Yes", isGraded: "Yes" })}`;
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "match",
        confidence: "high",
        rationale: "The PSA 9.4 holder, numeric grade, sealed game form, game identity, and cover art match; the tiny descriptive label suffix is not reliably readable.",
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false },
      },
    ], [{ title: "Grand Theft Auto III PS2 Sealed PSA 9.4 A+" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
  });

  it("promotes a video-game suffix-only mismatch to a valuation-facing match", () => {
    const metadata = `title=Grand Theft Auto III PS2; category=video_games; grade=9.4; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ sealed: "Yes", isGraded: "Yes" })}`;
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "mismatch",
        confidence: "high",
        rationale: "grading label: target PSA label reads 9.4 and Sealed A++ vs candidate PSA label reads 9.4 and Sealed A+ — material identity difference",
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true },
      },
    ], [{ title: "Grand Theft Auto III PS2 Sealed PSA 9.4 A+" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "high" });
    expect(result[0].rationale).toContain("eligible for valuation");
  });

  it("ignores a sealed-label suffix even when the model returns unreadable", () => {
    const metadata = `title=Grand Theft Auto III PS2; category=video_games; grade=9.4; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ sealed: "Yes", isGraded: "Yes" })}`;
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "unreadable",
        confidence: "low",
        rationale: "The PSA 9.4 holder, numeric grade, game identity, and sealed form match, but the target label reads Sealed A++ and the candidate label reads Sealed A+; label designation difference is not reliably readable.",
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true },
      },
    ], [{ title: "Grand Theft Auto III PS2 Sealed PSA 9.4 A+" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match" });
    expect(result[0].rationale).toContain("suffix is explicitly ignored");
  });

  it("promotes the exact screenshot-shaped unreadable rationale when both sealed labels are identical", () => {
    const metadata = `title=Grand Theft Auto III PS2; category=video_games; grade=9.4; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ sealed: "Yes", isGraded: "Yes" })}`;
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "unreadable",
        confidence: "low",
        rationale: 'grading label designation: target label reads "Sealed A++" vs candidate The candidate label reads "Sealed A++" — material identity difference',
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true },
      },
    ], [{ title: "Grand Theft Auto III PS2 Sealed PSA 9.4 A++" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "match", confidence: "medium" });
    expect(result[0].rationale).toContain("label designations are identical");
  });

  it("keeps a confirmed sealed-versus-CIB video-game conflict as a mismatch", () => {
    const metadata = `title=Grand Theft Auto III PS2; category=video_games; grade=9.4; certificationCompany=PSA; fullItemDetails=${JSON.stringify({ sealed: "Yes", isGraded: "Yes" })}`;
    const result = conservativeGradedVisualReviews([
      {
        candidateIndex: 0,
        verdict: "mismatch",
        confidence: "high",
        rationale: "The candidate is CIB while the target is Sealed; the game identity and PSA 9.4 holder otherwise match.",
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false },
      },
    ], [{ title: "Grand Theft Auto III PS2 CIB PSA 9.4" }], metadata);
    expect(result[0]).toMatchObject({ verdict: "mismatch", confidence: "high" });
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
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true },
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

  it("ignores non-form protector and in-hand title phrases for Vintage Toys", () => {
    const cardedTarget = `title=Hot Wheels 70 Plymouth AAR Cuda; category=vintage_toys; itemType=vehicle; fullItemDetails=${JSON.stringify({ packagingType: "carded" })}`;
    const looseTarget = `title=Hot Wheels 70 Plymouth AAR Cuda; category=vintage_toys; itemType=vehicle; fullItemDetails=${JSON.stringify({ packagingType: "loose" })}`;
    expect(buildDeclaredIdentityReviews([
      { title: "Hot Wheels 70 Plymouth AAR Cuda W/ Protector" },
    ], cardedTarget)).toEqual([]);
    expect(buildDeclaredIdentityReviews([
      { title: "Hot Wheels 70 Plymouth AAR Cuda In Hand" },
    ], looseTarget)).toEqual([]);
    expect(buildDeclaredIdentityReviews([
      { title: "Hot Wheels 70 Plymouth AAR Cuda Carded W/ Protector" },
    ], looseTarget)[0]?.rationale).toContain("packaging form differs");
  });

  it("uses the structured plush identity instead of the full graded display title", () => {
    const target = buildVisualTargetMetadata({
      title: "Nintendo Donkey Kong 1998 AFA 7.5",
      category: "vintage_toys",
      itemType: "plush",
      grade: "7.5",
      certificationCompany: "AFA",
      fullItemDetails: { toyName: "Donkey Kong", brand: "Nintendo", year: "1998" },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "Nintendo Collectibles Talking Plush Character Donkey Kong 15 inch 1998 Graded AFA", imageUrl: "https://example.com/donkey-kong.jpg" },
    ], target)).toEqual([]);
    const wrongReviews = buildDeclaredIdentityReviews([
      { title: "Nintendo Collectibles Talking Plush Character Diddy Kong 15 inch 1998 Graded AFA", imageUrl: "https://example.com/diddy-kong.jpg" },
    ], target);
    expect(wrongReviews[0]?.rationale).toContain("toy name or character differs");
    expect(wrongReviews[0]?.rationale).toContain("toy name or character:");
    expect(wrongReviews[0]?.rationale).not.toContain("vehicle name:");
  });
  it("accepts MOTU as Masters of the Universe and MOC as carded for Man-At-Arms", () => {
    const target = buildVisualTargetMetadata({
      title: "1983 Man-At-Arms Mattel AFA 75.0",
      category: "vintage_toys",
      itemType: "action_figure",
      grade: "75.0",
      certificationCompany: "AFA",
      fullItemDetails: {
        toyNameCharacter: "Masters of the Universe Man-At-Arms",
        franchise: "Masters of the Universe",
        brand: "Mattel",
        year: "1983",
        packagingType: "Carded",
      },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "MOTU MAN AT ARMS Mint Sealed MOC Vintage 1983 AFA 75.0 Masters of the Universe", imageUrl: "https://example.com/man-at-arms.jpg" },
    ], target)).toEqual([]);
  });

  it("uses a custom value when a target field is stored as Other", () => {
    const target = buildVisualTargetMetadata({
      title: "Nintendo Donkey Kong plush",
      category: "vintage_toys",
      itemType: "plush",
      fullItemDetails: { toyName: "Donkey Kong", brand: "Other", customBrand: "Nintendo" },
    });
    expect(target).toContain('"brand":"Nintendo"');
    expect(target).not.toContain('"brand":"Other"');
    expect(buildDeclaredIdentityReviews([
      { title: "Nintendo Donkey Kong plush" },
    ], target)).toEqual([]);
  });

  it("applies the Other-to-custom rule to non-brand fields too", () => {
    const target = buildVisualTargetMetadata({
      title: "Example Game Nintendo Switch",
      category: "video_games",
      itemType: "game",
      fullItemDetails: { gameTitle: "Example Game", platform: "Other", customPlatform: "Nintendo Switch" },
    });
    expect(target).toContain('"platform":"Nintendo Switch"');
    expect(target).not.toContain('"platform":"Other"');
    expect(buildDeclaredIdentityReviews([
      { title: "Example Game Nintendo Switch" },
    ], target)).toEqual([]);
  });

  it("uses Board Games identity fields instead of listing-title year or vehicle rules", () => {
    const target = buildVisualTargetMetadata({
      title: "Monopoly: Manhattan Beach Edition",
      category: "vintage_toys",
      itemType: "board_game___puzzle",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach", year: "2000", brand: "Hasbro" },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "Monopoly Manhattan Beach Board Game Factory Sealed Edition", imageUrl: "https://example.com/board-game.jpg" },
    ], target)).toEqual([]);
    const wrong = buildDeclaredIdentityReviews([
      { title: "Risk Board Game Factory Sealed Edition", imageUrl: "https://example.com/wrong-board-game.jpg" },
    ], target);
    expect(wrong[0]?.rationale).toContain("game or puzzle name differs");
    expect(wrong[0]?.rationale).toContain("Board Games game or puzzle name differs");
    expect(wrong[0]?.rationale).not.toContain("vehicle name");
    expect(vintageToyVisualScore({ title: "Manhattan Beach Monopoly Board Game Factory Sealed" }, target)).toMatchObject({
      score: 25,
      matched: ["gamePuzzleName"],
    });
  });

  it("does not invent a Board Games year conflict when the candidate omits structured year", () => {
    const target = buildVisualTargetMetadata({
      title: "Monopoly: Manhattan Beach Edition",
      category: "vintage_toys",
      itemType: "board_game___puzzle",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach", year: "2000" },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "Monopoly Manhattan Beach Board Game Factory Sealed Edition", imageUrl: "https://example.com/board-game.jpg" },
    ], target)).toEqual([]);
  });

  it("uses sealed title evidence for Board Game completeness ranking without changing structured metadata", () => {
    const target = buildVisualTargetMetadata({
      title: "Monopoly: Manhattan Beach Edition",
      category: "vintage_toys",
      itemType: "board_game___puzzle",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach", complete: "Yes", year: "2000" },
    });
    const candidate = { title: "Manhattan Beach Monopoly Board Game Factory Sealed", imageUrl: "https://example.com/board-game.jpg" };
    expect(buildDeclaredIdentityReviews([candidate], target)).toEqual([]);
    expect(vintageToyVisualScore(candidate, target)).toMatchObject({ score: 40, matched: ["gamePuzzleName", "complete"] });

    const gradedToyTarget = buildVisualTargetMetadata({ title: "Man-At-Arms", category: "vintage_toys", itemType: "action_figure", grade: "75", certificationCompany: "AFA", fullItemDetails: { toyNameCharacter: "Man-At-Arms", brand: "Mattel", franchise: "Masters of the Universe", year: "1983", packagingType: "Carded", complete: "Yes", accessoriesIncluded: "Yes" } });
    const ungradedToy = vintageToyVisualScore({ title: "Man-At-Arms Mattel Masters of the Universe 1983 Carded Complete Accessories", itemDetails: JSON.stringify({ toyNameCharacter: "Man-At-Arms", brand: "Mattel", franchise: "Masters of the Universe", year: "1983", packagingType: "Carded", complete: "Yes", accessoriesIncluded: "Yes" }) }, gradedToyTarget);
    const gradedToy = vintageToyVisualScore({ title: "Man-At-Arms Mattel Masters of the Universe 1983 Carded Complete Accessories AFA 75", itemDetails: JSON.stringify({ toyNameCharacter: "Man-At-Arms", brand: "Mattel", franchise: "Masters of the Universe", year: "1983", packagingType: "Carded", complete: "Yes", accessoriesIncluded: "Yes" }) }, gradedToyTarget);
    expect(ungradedToy.score).toBe(90);
    expect(gradedToy.score).toBe(100);
    expect(gradedToy.matched).toEqual(expect.arrayContaining(["gradingCompany", "grade"]));
  });

  it("interprets CIB as Complete in Box across title evidence and applicable category scoring", () => {
    expect(titleCompletenessState("Super Mario Bros. 3 NES CIB")).toBe("yes");
    expect(titleCompletenessState("Super Mario Bros. 3 NES Complete-In-Box")).toBe("yes");
    expect(titleCompletenessState("Super Mario Bros. 3 NES CIB Sealed")).toBe("yes");
    expect(titleCompletenessState("Super Mario Bros. 3 NES CIB, no box")).toBe("no");

    const videoGameTarget = buildVisualTargetMetadata({
      title: "Super Mario Bros. 3 NES",
      category: "video_games",
      itemType: "game",
      fullItemDetails: { gameTitle: "Super Mario Bros. 3", platform: "NES", completeInBox: "Yes", sealed: "No" },
    });
    const videoGameRows = buildMetadataFieldComparisons(videoGameTarget, { title: "Super Mario Bros. 3 NES CIB" });
    expect(videoGameRows.find((row) => row.targetField === "Complete In Box")).toMatchObject({ titleDerivedValue: "Yes (inferred from title)", titleDerivedStatus: "match" });
    expect(videoGameRows.find((row) => row.targetField === "Sealed")).toMatchObject({ titleDerivedValue: "Unknown", titleDerivedStatus: "unknown" });

    const toyTarget = buildVisualTargetMetadata({
      title: "Vintage Playset",
      category: "vintage_toys",
      itemType: "playset",
      fullItemDetails: { toyNameCharacter: "Vintage Playset", complete: "Yes" },
    });
    expect(vintageToyVisualScore({ title: "Vintage Playset CIB" }, toyTarget).matched).toContain("complete");
  });

  it("builds side-by-side Board Games field comparisons without title-derived year or completeness", () => {
    const target = buildVisualTargetMetadata({
      title: "Monopoly: Manhattan Beach Edition",
      category: "vintage_toys",
      itemType: "board_game___puzzle",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach", year: "2000", complete: "Yes", publisherBrand: "Hasbro" },
    });
    const rows = buildMetadataFieldComparisons(target, {
      title: "Monopoly Manhattan Beach Board Game Factory Sealed Edition",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach" },
    });
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetField: "Game or puzzle name", targetValue: "Monopoly: Manhattan Beach", candidateValue: "Monopoly: Manhattan Beach", status: "match" }),
      expect.objectContaining({ targetField: "Year", targetValue: "2000", candidateValue: "Unknown", status: "unknown" }),
      expect.objectContaining({ targetField: "Completeness", targetValue: "Yes", candidateValue: "Unknown", status: "unknown" }),
    ]));
    expect(rows.filter((row) => row.targetField === "Year")).toHaveLength(1);
    expect(rows.map((row) => row.targetField)).not.toContain("Vehicle name");
  });

  it("treats equivalent numeric grade formatting as a metadata match", () => {
    const target = buildVisualTargetMetadata({
      title: "The Legend of Zelda Gold Cartridge NES",
      category: "video_games",
      itemType: "game",
      grade: "7.50",
      certificationCompany: "PSA",
      fullItemDetails: { gameTitle: "The Legend of Zelda", platform: "NES", isGraded: "Yes" },
    });
    const rows = buildMetadataFieldComparisons(target, {
      title: "The Legend of Zelda Gold Cartridge NES PSA 7.5",
      fullItemDetails: { gameTitle: "The Legend of Zelda", platform: "NES", grade: "7.5", certificationCompany: "PSA" },
    });

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetField: "Grade", targetValue: "7.50", candidateValue: "7.5", status: "match" }),
    ]));
  });

  it("shows a separate title-derived candidate value without treating it as structured metadata", () => {
    const target = buildVisualTargetMetadata({
      title: "Monopoly: Manhattan Beach Edition",
      category: "vintage_toys",
      itemType: "board_game___puzzle",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach", year: "2000", complete: "Yes" },
    });
    const rows = buildMetadataFieldComparisons(target, {
      title: "Monopoly Manhattan Beach Board Game Factory Sealed Edition 2000",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach" },
    });
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetField: "Game or puzzle name", candidateValue: "Monopoly: Manhattan Beach", titleDerivedValue: expect.stringContaining("Monopoly: Manhattan Beach"), titleDerivedStatus: "match" }),
      expect.objectContaining({ targetField: "Year", candidateValue: "Unknown", titleDerivedValue: "Unknown", titleDerivedStatus: "unknown", status: "unknown" }),
      expect.objectContaining({ targetField: "Completeness", candidateValue: "Unknown", titleDerivedValue: "Yes (inferred from title)", titleDerivedStatus: "match", status: "unknown" }),
    ]));
  });

  it("marks structured fields that contributed to the ranking score", () => {
    const target = buildVisualTargetMetadata({
      title: "Monopoly: Manhattan Beach Edition",
      category: "vintage_toys",
      itemType: "board_game___puzzle",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach", publisherBrand: "Hasbro" },
    });
    const [scored] = annotatePreVisualComparableScores([{
      title: "Monopoly Manhattan Beach Board Game",
      fullItemDetails: { gamePuzzleName: "Monopoly: Manhattan Beach", publisherBrand: "Hasbro" },
    }], target);
    const rows = buildMetadataFieldComparisons(target, scored);
    expect(rows.find((row) => row.targetField === "Game or puzzle name")?.rankingContribution).toMatchObject({ matched: true, structured: true, titleDerived: false, reasons: [expect.stringMatching(/^gamePuzzleName: \d+ points \(structured\)$/)] });
    expect(rows.find((row) => row.targetField === "Publisher or brand")?.rankingContribution).toMatchObject({ matched: true, structured: true });
  });

  it("marks title-derived fields that contributed to the ranking score", () => {
    const target = buildVisualTargetMetadata({
      title: "Call of Duty World at War Xbox 360",
      category: "video_games",
      itemType: "game",
      grade: "9.8",
      certificationCompany: "PSA",
      fullItemDetails: { gameTitle: "Call of Duty World at War", platform: "Xbox 360", isGraded: "Yes" },
    });
    const [scored] = annotatePreVisualComparableScores([{
      title: "Call of Duty World at War Xbox 360 Sealed WATA 9.8",
      fullItemDetails: { gameTitle: "Call of Duty World at War", platform: "Xbox 360" },
    }], target);
    const rows = buildMetadataFieldComparisons(target, scored);
    expect(rows.find((row) => row.targetField === "Grade")?.rankingContribution).toMatchObject({ matched: true, structured: false, titleDerived: true });
    expect(rows.find((row) => row.targetField === "Certification company")?.rankingContribution).toMatchObject({ matched: true, structured: false, titleDerived: true });
  });

  it("rebuilds a missing final-projection breakdown from normalized title evidence", () => {
    const target = buildVisualTargetMetadata({
      title: "Grand Theft Auto Vice City PS2",
      category: "video_games",
      itemType: "game",
      grade: "9.8",
      certificationCompany: "PSA",
      fullItemDetails: { gameTitle: "Grand Theft Auto Vice City", platform: "PS2", isGraded: "Yes", completeInBox: "Yes", sealed: "Yes" },
    });
    const projected = withMetadataFieldComparisons(target, {
      normalizedListingTitle: "Grand Theft Auto Vice City PS2 Sealed WATA 9.8 A++",
      title: "",
      metadataFieldComparisons: [],
      fullItemDetails: { gameTitle: "Grand Theft Auto Vice City", platform: "PS2" },
    });
    expect(projected.metadataFieldComparisons.length).toBeGreaterThan(0);
    expect(projected.metadataFieldComparisons).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetField: "Grade", titleDerivedValue: "9.8" }),
      expect.objectContaining({ targetField: "Certification company", titleDerivedValue: "WATA" }),
      expect.objectContaining({ targetField: "Sealed", titleDerivedValue: "Yes (inferred from title)" }),
    ]));
  });

  it("normalizes title-derived grade evidence and infers sealed completeness and graded status", () => {
    const target = buildVisualTargetMetadata({
      title: "Call of Duty: World at War Xbox 360",
      category: "video_games",
      itemType: "game",
      grade: "9.8",
      certificationCompany: "PSA",
      fullItemDetails: { gameTitle: "Call of Duty: World at War", platform: "Xbox 360", isGraded: "Yes", completeInBox: "Yes", sealed: "Yes" },
    });
    const rows = buildMetadataFieldComparisons(target, {
      title: "Call of Duty World at War Xbox 360 Sealed PSA 9.8 A+ Graded",
      fullItemDetails: { gameTitle: "Call of Duty: World at War", platform: "Xbox 360" },
    });

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetField: "Grade", titleDerivedValue: "9.8", titleDerivedStatus: "match" }),
      expect.objectContaining({ targetField: "Is Graded", titleDerivedValue: "Yes (inferred from title)", titleDerivedStatus: "match" }),
      expect.objectContaining({ targetField: "Complete In Box", titleDerivedValue: "Yes (inferred from title)", titleDerivedStatus: "match" }),
      expect.objectContaining({ targetField: "Sealed", titleDerivedValue: "Yes (inferred from title)", titleDerivedStatus: "match" }),
    ]));
    expect(rows.find((row) => row.targetField === "Grade")?.titleDerivedValue).not.toContain("PSA");
  });

  it("treats PSA and WATA as equivalent Video Games grader evidence in the comparison table", () => {
    const target = buildVisualTargetMetadata({
      title: "Grand Theft Auto Vice City PS2",
      category: "video_games",
      itemType: "game",
      grade: "9.8",
      certificationCompany: "PSA",
      fullItemDetails: { gameTitle: "Grand Theft Auto Vice City", platform: "PS2", isGraded: "Yes" },
    });
    const structuredRows = buildMetadataFieldComparisons(target, {
      title: "Grand Theft Auto Vice City PS2 WATA 9.8 A+",
      fullItemDetails: { gameTitle: "Grand Theft Auto Vice City", platform: "PS2", certificationCompany: "WATA", grade: "9.8" },
    });
    const titleEvidenceRows = buildMetadataFieldComparisons(target, {
      title: "Grand Theft Auto Vice City PS2 WATA 9.8 A+",
      fullItemDetails: { gameTitle: "Grand Theft Auto Vice City", platform: "PS2", grade: "9.8" },
    });

    expect(structuredRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetField: "Certification company", candidateValue: "WATA", status: "match" }),
    ]));
    expect(titleEvidenceRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetField: "Certification company", titleDerivedValue: "WATA", titleDerivedStatus: "match" }),
    ]));
  });

  it("keeps ranking score and rank on candidates retained outside visual review", () => {
    const target = buildVisualTargetMetadata({
      title: "Call of Duty: World at War Xbox 360",
      category: "video_games",
      itemType: "game",
      grade: "9.8",
      certificationCompany: "PSA",
    });
    const scored = annotatePreVisualComparableScores([
      { title: "Call of Duty World at War Xbox 360 Sealed PSA 9.8" },
      { title: "Call of Duty World at War Xbox 360" },
    ], target);
    expect(scored[0]?.metadataMatchScore).toEqual(expect.any(Number));
    expect(scored[0]?.metadataMatchRank).toBe(1);
    expect(scored[1]?.metadataMatchScore).toEqual(expect.any(Number));
    expect(scored[1]?.metadataMatchRank).toBe(2);
  });

  it("uses recognized title-derived grade and grader evidence in universal ranking when structured values are unknown", () => {
    const target = buildVisualTargetMetadata({
      title: "Call of Duty: World at War Xbox 360",
      category: "video_games",
      itemType: "game",
      grade: "9.8",
      certificationCompany: "PSA",
    });
    const score = universalMetadataScore({
      title: "Call of Duty World at War Xbox 360 Sealed PSA 9.8",
      grade: "Unknown",
      grader: "Unknown",
    }, target);

    expect(score.score).toBeGreaterThanOrEqual(35);
    expect(score.matched).toEqual(expect.arrayContaining(["grade (title-derived)", "grading company (title-derived)"]));
  });

  it("uses recognized title-derived grade and grader evidence in Sports Cards ranking when structured values are unknown", () => {
    const target = buildVisualTargetMetadata({
      title: "1986 Fleer Michael Jordan #57",
      category: "sports_cards",
      itemType: "single_card",
      grade: "9.8",
      certificationCompany: "PSA",
      fullItemDetails: { player: "Michael Jordan", year: "1986", manufacturer: "Fleer", cardNumber: "57" },
    });
    const score = sportsCardSingleVisualScore({
      title: "1986 Fleer Michael Jordan #57 PSA 9.8",
      grade: "Unknown",
      grader: "Unknown",
    }, target);

    expect(score.matched).toEqual(expect.arrayContaining(["gradingCompany", "grade"]));
    expect(score.score).toBeGreaterThanOrEqual(70);
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
  it("does not compare cosmetic marketplace condition to Video Game working condition", () => {
    const metadata = `title=NES Power Glove; category=video_games; itemType=accessory; fullItemDetails=${JSON.stringify({ accessoryType: "Controller", accessoryName: "Power Glove", platform: "NES", workingCondition: "Working" })}`;
    expect(buildDeclaredIdentityReviews([
      { title: "Nintendo NES Power Glove Large L New Open Box Complete", condition: "Like New", imageUrl: "https://example.com/candidate.jpg" },
    ], metadata)).toEqual([]);
  });
  it("uses explicit product-role wording without rejecting generic accessory labels", () => {
    const metadata = `title=NES Power Glove; category=video_games; itemType=accessory; fullItemDetails=${JSON.stringify({ accessoryType: "Controller", accessoryName: "Power Glove", platform: "NES", manufacturer: "Nintendo", workingCondition: "Working" })}`;
    expect(buildDeclaredIdentityReviews([
      { title: "Nintendo NES Power Glove Controller Tested Working" },
    ], metadata)).toEqual([]);

    const roleReviews = buildDeclaredIdentityReviews([
      { title: "Power Glove Replacement Cable for Nintendo NES" },
      { title: "Controller Compatible with Power Glove" },
      { title: "Power Glove Empty Box" },
      { title: "Power Glove Manual Only" },
    ], metadata);
    expect(roleReviews).toHaveLength(4);
    const rationale = roleReviews.map((review) => review.rationale).join(" ");
    expect(rationale).toContain("replacement or spare component");
    expect(rationale).toContain("compatibility with another product");
    expect(rationale).toContain("packaging only");
    expect(rationale).toContain("manual or instructions only");
  });
  it("does not reuse cosmetic condition as sealed status across item types", () => {
    for (const category of ["sports_cards", "pokemon", "video_games", "vintage_toys", "movies"]) {
      const metadata = `title=Test item; category=${category}; itemType=single; fullItemDetails=${JSON.stringify({ sealedStatus: "yes" })}`;
      const conflicts = findMaterialMetadataConflicts(metadata, { title: "Test item", condition: "Like New" });
      expect(conflicts.some((conflict) => conflict.field === "sealedStatus")).toBe(false);
    }
  });
  it("still compares explicit functional condition signals for Video Game accessories", () => {
    const metadata = `title=NES Power Glove; category=video_games; itemType=accessory; fullItemDetails=${JSON.stringify({ accessoryType: "Controller", accessoryName: "Power Glove", platform: "NES", workingCondition: "Working" })}`;
    const reviews = buildDeclaredIdentityReviews([
      { title: "Nintendo NES Power Glove For Parts", condition: "For Parts or Not Working", imageUrl: "https://example.com/candidate.jpg" },
    ], metadata);
    expect(reviews[0]?.rationale).toContain("working condition differs");
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

  it("exposes base-casting-first Vintage Toys guidance without hard-mismatching variants", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("VINTAGE-TOY VISUAL IDENTITY");
    expect(source).toContain("base casting identity means the same visible vehicle model/body shape");
    expect(source).toContain("Treasure Hunt or Super Treasure Hunt status");
    expect(source).toContain("do not by themselves prove a different vehicle");
    expect(source).toContain("do not infer a different vehicle type merely because the title omits that generic word");
    expect(source).toContain("variant difference explicitly");
    expect(source).toContain("title metadata can explain a variant but cannot override matching visible base-casting evidence");
  });

  it("does not convert a Cuda model title into a false vehicle-type conflict", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "70 Plymouth AAR Cuda Hot Wheels",
      category: "vintage_toys",
      itemType: "vehicle",
      fullItemDetails: { vehicleName: "Plymouth AAR Cuda", vehicleType: "Car", brand: "Hot Wheels" },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "2026 Hot Wheels 70 Plymouth AAR Cuda Gold Super Treasure Hunt" },
    ], targetMetadata)).toEqual([]);
  });
  it("still blocks an explicitly different Vintage Toys vehicle form", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "70 Plymouth AAR Cuda Hot Wheels",
      category: "vintage_toys",
      itemType: "vehicle",
      fullItemDetails: { vehicleName: "Plymouth AAR Cuda", vehicleType: "Car", brand: "Hot Wheels" },
    });
    const reviews = buildDeclaredIdentityReviews([
      { title: "Plymouth AAR Cuda Hot Wheels aircraft model" },
    ], targetMetadata);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.rationale).toContain("vehicle type differs");
  });
  it("does not hard-block a Vintage Toys vehicle for working-feature differences", () => {
    const targetMetadata = buildVisualTargetMetadata({
      title: "70 Plymouth AAR Cuda Hot Wheels",
      category: "vintage_toys",
      itemType: "vehicle",
      fullItemDetails: {
        vehicleName: "Plymouth AAR Cuda",
        vehicleType: "Car",
        brand: "Hot Wheels",
        workingFeatures: "Yes",
      },
    });
    expect(buildDeclaredIdentityReviews([
      { title: "2026 Hot Wheels 70 Plymouth AAR Cuda Gold Super Treasure Hunt W Protector STH" },
      { title: "2026 Hot Wheels 70 Plymouth AAR Cuda Gold Super Treasure Hunt", itemDetails: JSON.stringify({ workingFeatures: "No" }) },
    ], targetMetadata)).toEqual([]);
  });
  it("promotes an unreadable review only when title and gallery rationale explicitly confirm the grade", () => {
    const result = conservativeGradedVisualReviews([
      // A promotion needs positive image identity, not only a matching holder.
      { candidateIndex: 0, verdict: "unreadable", confidence: "low", rationale: "The AFA 75+ grade is clearly readable in the additional gallery image and matches the target; the holder and item also match.", visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true }, }
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

  it("shows target and candidate metadata values when a visual result has a material difference", () => {
    const result = applyVisualSourceReviews(
      [{ title: "2026 Hot Wheels 70 Plymouth AAR Cuda", franchise: "Matchbox", imageUrl: "https://example.com/candidate.jpg" }],
      [{ candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "The visible base casting is different." }],
      1,
      { targetMetadata: "category=vintage_toys;title=70 Plymouth AAR Cuda;fullItemDetails={\"franchise\":\"Hot Wheels\",\"vehicleName\":\"70 Plymouth AAR Cuda\"}" },
    );
    expect(result.listings[0]?.visualReviewRationale).toContain('franchise: target “Hot Wheels” vs candidate “Matchbox”');
  });
  it("does not report a provider title echo as a Vintage Toys Brand difference", () => {
    const targetMetadata = "category=vintage_toys;itemType=plush_stuffed_toy;title=1998 Donkey Kong Nintendo AFA 7.5;fullItemDetails={\"brand\":\"Other\",\"customBrand\":\"Nintendo\",\"toyName\":\"Donkey Kong\",\"year\":\"1998\"}";
    const candidateTitle = 'Nintendo Collectibles Talking Plush Character Donkey Kong 15" 1998 Graded AFA';
    const result = applyVisualSourceReviews(
      [{ title: candidateTitle, brand: candidateTitle, imageUrl: "https://example.com/candidate.jpg" }],
      [{ candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "Different item." }],
      1,
      { targetMetadata },
    );
    expect(result.listings[0]?.visualReviewRationale).not.toContain("brand: target");
    expect(result.listings[0]?.visualReviewRationale).not.toContain(candidateTitle);
  });
  it("treats Hot Wheels and HotWheels as the same Vintage Toys franchise spelling", () => {
    const reviews = buildDeclaredIdentityReviews(
      [{ title: "2026 Hot Wheels 70 Plymouth AAR Cuda", franchise: "HotWheels" }],
      "category=vintage_toys;itemType=vehicle;title=70 Plymouth AAR Cuda;fullItemDetails={\"franchise\":\"Hot Wheels\",\"vehicleName\":\"70 Plymouth AAR Cuda\"}",
    );
    expect(reviews).toHaveLength(0);
  });
  it("preserves eBay visual status fields in the response consumed by the image-check panel", () => {
    const routerSource = readFileSync(resolve(import.meta.dirname, "./testAIRouter.ts"), "utf8");
    expect(routerSource).toContain("visualRequirement: s.visualRequirement ?? null");
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
    expect(score.score).toBe(90);
    expect(score.matched).toEqual(expect.arrayContaining([
      "artist", "releaseTitle", "format", "recordLabel", "catalogNumber", "releaseYear", "country", "edition", "packagingIncluded",
    ]));

    const gradedTarget = buildVisualTargetMetadata({ title: "Kind of Blue", category: "music", itemType: "vinyl_record", grade: "9.8", certificationCompany: "CGC", fullItemDetails: {
      artist: "Miles Davis", releaseTitle: "Kind of Blue", format: "vinyl_record", recordLabel: "Columbia",
      catalogNumber: "CL 1355", releaseYear: "1959", country: "United States", edition: "First Pressing", packagingIncluded: "yes",
    } });
    const gradedScore = musicVisualScore({
      title: "Miles Davis Kind of Blue Columbia CL 1355 1959 First Pressing Vinyl Record CGC 9.8",
      itemDetails: JSON.stringify({ artist: "Miles Davis", releaseTitle: "Kind of Blue", format: "vinyl_record", recordLabel: "Columbia", catalogNumber: "CL 1355", releaseYear: "1959", country: "United States", edition: "First Pressing", packagingIncluded: "yes" }),
    }, gradedTarget);
    expect(gradedScore.score).toBe(100);
    expect(gradedScore.matched).toEqual(expect.arrayContaining(["gradingCompany", "grade"]));
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

  it("normalizes the stored single_pin value before scoring Disney Pins", () => {
    const target = buildVisualTargetMetadata({
      title: "Donald Duck Pin - Black & White Snapshots",
      category: "disney_pins",
      itemType: "single_pin",
      fullItemDetails: {
        pinName: "Black & White Snapshots", character: "Donald Duck", series: "Snapshots",
        year: "2024", pinTradingEvent: "Disney", limitedEdition: "no", openEdition: "yes",
      },
    });
    const score = disneyPinsIndividualVisualScore({
      title: "Donald Duck Pin - Black & White Snapshots Disney Pin",
      itemDetails: JSON.stringify({ pinName: "Black & White Snapshots", character: "Donald Duck", series: "Snapshots", year: "2024", pinTradingEvent: "Disney", limitedEdition: "no", openEdition: "yes" }),
    }, target);
    expect(score.score).toBeGreaterThan(0);
    expect(score.matched).toEqual(expect.arrayContaining(["pinName", "character", "series"]));
  });
  it("credits character-only marketplace titles enough to reach the Disney single-pin visual threshold", () => {
    const target = buildVisualTargetMetadata({
      title: "Around the World Eeyore Pin",
      category: "disney_pins",
      itemType: "single_pin",
      fullItemDetails: { pinName: "Around the World Eeyore", character: "Eeyore", series: "Around the World" },
    });
    for (const title of [
      "Eeyore From Winnie The Pooh Disneyland D Fantasy Pin (LE 200)",
      "DISNEY TRADING PIN * EEYORE * SITTING * FROM WINNIE THE POOH",
      "2003 Official WDW Walt Disney World Pin EEYORE Donkey Pink Bow Winnie the Pooh",
    ]) {
      const score = disneyPinsIndividualVisualScore({ title }, target);
      expect(score.score).toBeGreaterThanOrEqual(40);
      expect(disneyPinsVisualCap(score.score)).toBeGreaterThan(0);
      expect(score.matched).toContain("pinName");
    }
  });

  it("scores Disney Designer Princess Collection title variants before visual review", () => {
    const target = buildVisualTargetMetadata({
      title: "Disney Designer Ultimate Princess Collection",
      category: "disney_pins",
      itemType: "single_pin",
      fullItemDetails: {
        pinName: "Disney Designer Ultimate Princess Collection Aurora",
        character: "Princess Aurora",
        series: "Disney Designer Ultimate Princess Collection",
        year: "2022",
        limitedEdition: "yes",
      },
    });
    for (const title of [
      "Limited Edition Disney's Ultimate Princess Collection ‘Aurora’ Trading Pin",
      "Disney Aurora Ultimate Princess Collection Pin",
    ]) {
      const score = disneyPinsIndividualVisualScore({ title }, target);
      expect(score.score).toBeGreaterThanOrEqual(40);
      expect(disneyPinsVisualCap(score.score)).toBeGreaterThan(0);
      expect(score.matched).toEqual(expect.arrayContaining(["pinName", "character", "series"]));
    }
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
    expect(disneyPinsVisualCap(40)).toBe(2);
    expect(disneyPinsVisualCap(39)).toBe(0);
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
  ])("allows ordinary condition differences for visual review across %s", (category) => {
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
    expect(buildDeclaredIdentityReviews([candidate], targetMetadata)).toHaveLength(category === "movies" || category === "music" ? 0 : 1);
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

  it("normalizes and preserves every structured visual difference", () => {
    const rows = normalizeVisualSourceReviews({ reviews: [{ candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "The images differ.", visualDifferences: [{ field: "artwork", targetObservation: "blue front artwork", candidateObservation: "red front artwork", impact: "material identity difference" }], visualEvidence: {} }] }, 1);
    expect(rows[0]?.visualDifferences).toEqual([{ field: "artwork", targetObservation: "blue front artwork", candidateObservation: "red front artwork", impact: "material identity difference" }]);
  });
  it("merges AI image differences with all deterministic metadata differences for every category", () => {
    const result = applyVisualSourceReviews(
      [{ title: "1986 Topps #401", itemDetails: JSON.stringify({ player: "Different Player", setName: "Topps" }), imageUrl: "https://example.com/card.jpg" }],
      [{ candidateIndex: 0, verdict: "mismatch", confidence: "high", rationale: "The card front differs.", visualDifferences: [{ field: "artwork", targetObservation: "target player portrait", candidateObservation: "different player portrait", impact: "material identity difference" }] }],
      1,
      { targetMetadata: `category=sports_cards;title=1986 Topps #401;fullItemDetails=${JSON.stringify({ player: "Cal Ripken Jr.", setName: "Topps" })}` },
    );
    expect(result.listings[0]?.visualDifferences).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "artwork", candidateObservation: "different player portrait" }),
      expect.objectContaining({ field: "player", targetObservation: "Cal Ripken Jr.", candidateObservation: "Different Player" }),
    ]));
    expect(result.listings[0]?.visualReviewRationale).toContain("Differences found:");
  });
  it("requires the vision prompt and Test AI UI to expose complete differences", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    const tableSource = readFileSync(resolve(import.meta.dirname, "../client/src/components/TestAiMetadataComparisonTable.tsx"), "utf8");
    expect(source).toContain("list every detected material difference in visualDifferences");
    expect(source).toContain("targetObservation");
    expect(pageSource).toContain("Why mismatch — all detected differences");
    expect(pageSource).toContain("VisualDifferenceList");
    expect(source).toContain("rankingContribution?:");
    expect(pageSource).toContain("import { MetadataComparisonTable }");
    expect(tableSource).toContain("Highlighted field names contributed to the ranking score.");
    expect(tableSource).toContain("Title-derived scored field");
  });
  it("shows each reviewed candidate price beside its match or mismatch verdict", () => {
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    const componentSource = readFileSync(resolve(import.meta.dirname, "../client/src/components/TestAiCandidateStatus.tsx"), "utf8");
    const statusSource = readFileSync(resolve(import.meta.dirname, "../shared/testAiCandidateStatus.ts"), "utf8");
    expect(pageSource).toContain("from '@/components/TestAiCandidateStatus'");
    expect(pageSource).toContain("<TestAiVisualReviewRow key={candidateDisplayKey(listing, {}, String(index))} listing={listing} targetImageUrl={targetImageUrl} />");
    expect(componentSource).toContain("export function TestAiVisualReviewRow({ listing, targetImageUrl }");
    expect(componentSource).toContain("{formatCandidateDisplayPrice(listing)}");
    expect(componentSource).toContain("<TestAiCandidateStatus listing={listing} />");
    expect(componentSource).toContain("<TestAiCandidateImagePair listing={listing} targetImageUrl={targetImageUrl} />");
    expect(componentSource).toContain("View full explanation");
    expect(statusSource).toContain("row.price ?? row.soldPrice ?? row.salePrice ?? row.finalPrice ?? row.currentPrice ?? row.current_price");
    expect(statusSource).toContain("row.currency ?? row.soldCurrency ?? (typeof raw === 'object' ? raw?.currency : null) ?? ''");
    expect(statusSource).toContain("${currency || 'Currency unknown'}");
    expect(statusSource).toContain("label: 'Image match'");
    expect(statusSource).toContain("label: 'Image mismatch'");
  });

  it("keeps visual review bounded and fails closed when the provider times out", () => {
    expect(VISUAL_REVIEW_PER_CANDIDATE_TIMEOUT_MS).toBe(20_000);
    expect(VISUAL_REVIEW_OVERALL_DEADLINE_MS).toBe(120_000);
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("completed_with_timeout");
    expect(source).toContain("Remaining candidates are retained for manual review and cannot enter valuation implicitly.");
    expect(source).toContain("controller.abort()");
  });

  it("adds one candidate-scoped Disney timeout retry without treating timeout as approval", () => {
    const source = readFileSync(resolve(import.meta.dirname, "./testAiVisualSourceFilter.ts"), "utf8");
    expect(source).toContain("let galleryTimedOut = false");
    expect(source).toContain("let thirdDisneyAttempted = false");
    expect(source).toContain("if (!galleryReviews.length && canAttemptThirdDisneyReview && galleryTimedOut)");
    expect(source).toContain("THIRD CONFIRMATION ATTEMPT");
    expect(source).toContain("third Disney confirmation attempt also timed out");
    expect(source).toContain('adjudicationStatus: "unavailable"');
    expect(source).not.toContain("timeoutFallbackDisneyVisualMatch");
  });

  it("treats generic Disney backing-card differences as soft evidence", () => {
    const target = buildVisualTargetMetadata({
      title: "Cinderella & Gus Glitter Portrait Pin",
      category: "disney_pins",
      itemType: "single_pin",
      itemDetails: { character: "Cinderella", series: "Glitter Portrait" },
    });
    expect(disneyPinsEvidenceIsExact({
      characterMatches: true,
      artworkMatches: true,
      silhouetteMatches: true,
      backingCardMatches: false,
      setDesignMatches: false,
      identityMatches: true,
    }, target)).toBe(true);
    const instruction = disneyPinsVisualInstruction(target);
    expect(instruction).toContain("generic backing card or packaging variation alone is a soft difference");
    expect(instruction).toContain("Primary pin identity is authoritative");
  });

  it("keeps explicit Disney edition or event backing evidence strict", () => {
    const target = buildVisualTargetMetadata({
      title: "Cinderella & Gus Glitter Portrait Pin — 2024 D23 Exclusive",
      category: "disney_pins",
      itemType: "single_pin",
      itemDetails: {
        character: "Cinderella",
        series: "Glitter Portrait",
        edition: "2024 D23 Exclusive",
        eventName: "D23",
      },
    });
    expect(disneyPinsEvidenceIsExact({
      characterMatches: true,
      artworkMatches: true,
      silhouetteMatches: true,
      backingCardMatches: false,
      setDesignMatches: false,
      identityMatches: true,
    }, target)).toBe(false);
    expect(disneyPinsEvidenceIsExact({
      characterMatches: true,
      artworkMatches: true,
      silhouetteMatches: true,
      backingCardMatches: true,
      setDesignMatches: true,
      identityMatches: true,
    }, target)).toBe(true);
  });

  it("explains timeout and partial-review states in the eBay Active UI", () => {
    const pageSource = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TestAI.tsx"), "utf8");
    const componentSource = readFileSync(resolve(import.meta.dirname, "../client/src/components/TestAiCandidateStatus.tsx"), "utf8");
    const statusSource = readFileSync(resolve(import.meta.dirname, "../shared/testAiCandidateStatus.ts"), "utf8");
    expect(pageSource).toContain("maximum 2 minutes");
    expect(pageSource).toContain("Only candidates with a completed visual result can support current-value evidence");
    expect(pageSource).toContain("AI image checks stopped after returning partial results");
    expect(pageSource).toContain("Partial/error source response — known source observations are retained.");
    expect(pageSource).toContain("No actual dispatch receipts are available. Legacy verdicts are not proof of image execution.");
    expect(pageSource).toMatch(/import \{[^}]*\bTestAiProcessCompleteNotice as ProcessCompleteNotice\b[^}]*\} from '@\/components\/TestAiCandidateStatus';/);
    expect(componentSource).toMatch(/export function TestAiProcessCompleteNotice\(\{ data \}: \{ data\?: any \}\) \{\s+if \(!data\) return <p\b[^>]*>No returned source response — request execution and result coverage are unknown\. This is not a zero-match result\.<\/p>;\s+const retrieval = sourceRetrievalCoverage\(data\);/);
    expect(componentSource).toContain("import { sourceCurrentWindowLabel, sourceMetricDisplay, sourceRetrievalCoverage } from '../../../shared/testAiSourceDisplay';");
    expect(componentSource).toContain("Selected but undispatched rows are not background jobs.");
    expect(componentSource).toContain("aria-label=\"Source request end coverage\">{retrieval.partial ? 'Source request ended with partial/error coverage — known returned rows retained below.' : 'Source request ended — returned source results are displayed below.'}");
    expect(componentSource).toContain("return mergeCandidateDisplayGroups(groups, scope).filter(hasActualVisualDispatch);");
    expect(componentSource).toContain("const dispatched = rows.filter(hasActualVisualDispatch), responses = rows.filter(hasActualVisualResponse);");
    expect(statusSource).toContain("label: 'Timed out — no usable response'");
    expect(statusSource).toContain("label: 'Provider failure — dispatched'");
    expect(statusSource).toContain("label: 'Source eligible — final analysis not run'");
  });
});


describe("Stage 1 safe visual confirmation", () => {
  beforeEach(() => mockedInvokeLLM.mockReset());
  const metadata = 'title=The Legend of Zelda NES; category=video_games; grade=7.50; certificationCompany=PSA; fullItemDetails={"gameTitle":"The Legend of Zelda","platform":"NES","sealed":"Yes","isGraded":"Yes"}';
  const title = 'The Legend of Zelda NES 1987 Sealed PSA 7.5 A+';
  const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true };
  const suffix = 'Grading label difference: target label reads Sealed A++ versus candidate label reads Sealed A+; the game identity otherwise matches.';
  const normalize = (review: any, target = metadata, candidateTitle = title) => conservativeGradedVisualReviews([{ candidateIndex: 0, confidence: 'high', ...review }], [{ title: candidateTitle }], target)[0];

  it.each(['mismatch', 'unreadable'])('does not promote a %s suffix result without required image evidence', (verdict) => {
    expect(normalize({ verdict, rationale: suffix }).verdict).not.toBe('match');
    expect(normalize({ verdict, rationale: suffix, visualEvidence: { ...evidence, identityMatches: undefined, artworkMatches: undefined } }).verdict).not.toBe('match');
  });

  it.each([
    ['raw item', { ...evidence, rawOrLooseVisible: true }],
    ['numeric grade disagreement', { ...evidence, gradeMatches: false }],
    ['unreadable grade', { ...evidence, numericGradeVisible: false }],
    ['identity disagreement', { ...evidence, identityMatches: false }],
    ['artwork disagreement', { ...evidence, artworkMatches: false }],
  ])('does not promote a suffix result with %s', (_name, visualEvidence) => {
    expect(normalize({ verdict: 'mismatch', rationale: suffix, visualEvidence }).verdict).not.toBe('match');
    expect(normalize({ verdict: 'unreadable', rationale: suffix, visualEvidence }).verdict).not.toBe('match');
  });

  it.each(['artwork', 'platform', 'numeric grade', 'product form'])('retains a material structured %s conflict beside a soft suffix', (field) => {
    expect(normalize({ verdict: 'unreadable', rationale: suffix, visualEvidence: evidence,
      visualDifferences: [{ field, targetObservation: 'target identity', candidateObservation: 'different candidate', impact: 'material identity difference' }],
    }).verdict).not.toBe('match');
  });

  it('does not misclassify numeric grade discrepancy as a soft label suffix', () => {
    expect(normalize({ verdict: 'mismatch', rationale: 'Grading label difference: target label reads PSA 9.4 versus candidate label reads PSA 8.0.', visualEvidence: { ...evidence, gradeMatches: false } }).verdict).toBe('mismatch');
  });

  it('does not erase a Sealed-versus-candidate-CIB hard conflict', () => {
    const review = normalize({ verdict: 'mismatch', rationale: suffix + ' The target is Sealed versus candidate CIB.', visualEvidence: evidence });
    expect(review.verdict).toBe('mismatch');
  });

  it('records the actual permitted correction without changing the original review', () => {
    const original = { candidateIndex: 0, verdict: 'mismatch' as const, confidence: 'high' as const, rationale: suffix, visualEvidence: evidence };
    const result = normalize(original);
    expect(original.verdict).toBe('mismatch');
    expect(result.verdict).toBe('match');
    expect(result.visualAudit?.normalizations).toEqual([expect.objectContaining({ rule: 'video_game_soft_sealed_suffix', verdictBefore: 'mismatch', rationaleBefore: suffix, verdictAfter: 'match' })]);
  });

  it('preserves a completed graded match without grade-confirmation prose', () => {
    expect(normalize({ verdict: 'match', rationale: 'All inspected item features correspond.', visualEvidence: evidence }).verdict).toBe('match');
  });

  it('preserves a completed comic identity and artwork match without a magic phrase', () => {
    const result = conservativeComicVisualReviews([{ candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'All visible features correspond.', visualEvidence: evidence }], [{ title: 'X-Men #1 CGC 9.8' }], 'title=X-Men #1; category=comics');
    expect(result[0].verdict).toBe('match');
  });

  it.each([undefined, { ...evidence, gradeMatches: false }, { ...evidence, numericGradeVisible: false }, { ...evidence, rawOrLooseVisible: true }, { ...evidence, artworkMatches: false }])('does not promote unreadable by narrative against absent/contrary evidence %#', (visualEvidence) => {
    expect(normalize({ verdict: 'unreadable', rationale: 'The PSA grade 7.5 is clearly readable and matches the target; the game identity matches.', visualEvidence }).verdict).toBe('unreadable');
  });

  it('does not generalize PSA/WATA equivalence to Sports Cards', () => {
    expect(normalize({ verdict: 'unreadable', rationale: 'The WATA 7.5 numeric grade is clearly visible and matches; item identity matches.', visualEvidence: evidence }, 'title=Sports Card; category=sports_cards; grade=7.5; certificationCompany=PSA', 'Sports Card WATA 7.5').verdict).toBe('unreadable');
  });

  it('cannot promote an unreadable card without its mandatory qualifier', () => {
    expect(normalize({ verdict: 'unreadable', rationale: 'The PSA 8 numeric grade is clearly readable and matches.', visualEvidence: evidence }, 'title=Sports Card; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails={"gradeQualifier":"OC"}', 'Sports Card PSA 8').verdict).toBe('unreadable');
  });

  it('keeps missing qualifier normalization idempotent instead of confirming its own commentary', () => {
    const target = 'title=Sports Card; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails={"gradeQualifier":"OC"}';
    const review = { verdict: 'match', rationale: 'The PSA 8 numeric grade is clearly readable and matches; the card artwork matches.', visualEvidence: evidence };
    const first = normalize(review, target, 'Sports Card PSA 8');
    const second = normalize(first, target, 'Sports Card PSA 8');
    expect(first.verdict).toBe('unreadable');
    expect(second).toEqual(first);
  });

  it('does not treat target-only or negated qualifier mentions as candidate confirmation', () => {
    const target = 'title=Sports Card; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails={"gradeQualifier":"OC"}';
    expect(normalize({ verdict: 'unreadable', rationale: 'The target requires OC, but the candidate qualifier cannot be established. The PSA 8 numeric grade is clearly readable and matches.', visualEvidence: evidence }, target, 'Sports Card PSA 8').verdict).toBe('unreadable');
    expect(normalize({ verdict: 'match', rationale: 'The candidate OC qualifier is not visible; the numeric grade and artwork match.', visualEvidence: evidence }, target, 'Sports Card PSA 8').verdict).toBe('unreadable');
    expect(normalize({ verdict: 'match', rationale: 'The candidate qualifier is too small to read, but grading and artwork match.', visualEvidence: evidence }, target, 'Sports Card PSA 8 OC').verdict).toBe('match');
  });

  it('does not let a matching qualifier title erase a known contrary candidate observation', () => {
    const target = 'title=2018 Topps; category=sports_cards; grade=8; certificationCompany=PSA; fullItemDetails={"gradeQualifier":"OC"}';
    expect(normalize({ verdict: 'match', rationale: 'The candidate has no OC qualifier; its label clearly reads PSA 8. The card identity and artwork match.', visualEvidence: evidence }, target, '2018 Topps PSA 8 OC').verdict).toBe('unreadable');
    const comicTarget = 'title=X-Men; category=comics; grade=9.8; certificationCompany=CGC; fullItemDetails={"certificationLabelStatus":"Restored"}';
    expect(normalize({ verdict: 'match', rationale: 'The candidate is not Restored; its visible CGC 9.8 label and cover are readable.', visualEvidence: evidence }, comicTarget, 'X-Men CGC 9.8 Restored').verdict).toBe('unreadable');
  });

  it('keeps an actual candidate CIB conflict within a target self-description sentence', () => {
    expect(normalize({ verdict: 'mismatch', rationale: 'The target structured details indicate CIB and Sealed, while the candidate is CIB without factory wrap.', visualEvidence: evidence }, metadata, 'The Legend of Zelda NES PSA 7.5').verdict).toBe('mismatch');
  });

  it('does not let PSA/WATA equivalence override contrary observed numeric grades', () => {
    expect(normalize({ verdict: 'unreadable', rationale: 'The target PSA numeric grade is 7.5. The candidate WATA numeric grade is 6.0; numeric grade differs. Game identity and artwork match.', visualEvidence: evidence }, metadata, 'The Legend of Zelda NES WATA 6.0').verdict).toBe('unreadable');
  });

  it('preserves equivalent numeric grades in structured visual differences', () => {
    expect(normalize({ verdict: 'match', rationale: 'All item features correspond.', visualEvidence: evidence,
      visualDifferences: [{ field: 'numeric grade', targetObservation: '7.50', candidateObservation: '7.5', impact: 'material identity difference' }],
    }).verdict).toBe('match');
  });

  it('preserves a genuine match when the model explicitly says the numeric grade does not differ', () => {
    expect(normalize({ verdict: 'match', rationale: 'The numeric grade does not differ; only the Sealed A++ versus Sealed A+ suffix differs. All game identity and artwork match.', visualEvidence: evidence }).verdict).toBe('match');
  });

  it.each(['certification ID', 'certification number', 'serial number', 'barcode', 'QR code'])('ignores specimen-specific %s differences without weakening grade checks', (field) => {
    expect(normalize({ verdict: 'match', rationale: 'All item identity and grading features correspond.', visualEvidence: evidence,
      visualDifferences: [{ field, targetObservation: '123456', candidateObservation: '654321', impact: 'material identity difference' }],
    }).verdict).toBe('match');
  });

  it('preserves optional unknown observations instead of manufacturing false conflicts', () => {
    const review = normalizeVisualSourceReviews({ reviews: [{ candidateIndex: 0, verdict: 'unreadable', confidence: 'low', rationale: 'The holder is cropped.', visualEvidence: { slabVisible: false } }] }, 1)[0];
    expect(review.visualEvidence).toEqual({ slabVisible: false });
    expect(review.visualEvidence).not.toHaveProperty('identityMatches');
    expect(review.visualEvidence).not.toHaveProperty('gradeMatches');
  });

  const coinMetadata = 'title=1896 Morgan Dollar PCGS MS63; category=coins; grade=MS63; certificationCompany=PCGS; fullItemDetails={"year":"1896","variety":"Morgan"}';
  const coinTitle = '1896 Morgan Silver Dollar PCGS MS63';
  it.each(['identityMatches', 'dateMatches', 'varietyMatches', 'denominationMatches', 'artworkMatches'])('coin title cannot erase explicitly false %s evidence', (field) => {
    const review = enforceCoinExactEvidence({ candidateIndex: 0, verdict: 'unreadable', confidence: 'low', rationale: 'The independent image check found a disagreement.', visualEvidence: { ...evidence, denominationMatches: true, dateMatches: true, varietyMatches: true, [field]: false } }, coinMetadata, coinTitle);
    expect(review.verdict).toBe('unreadable');
  });

  it('allows exact title facts to supplement only an unknown coin-holder crop', () => {
    const result = enforceCoinExactEvidence({ candidateIndex: 0, verdict: 'unreadable', confidence: 'low', rationale: 'Coin identity and denomination are visible; date and holder label are cropped.', visualEvidence: { identityMatches: true, denominationMatches: true, rawOrLooseVisible: false } }, coinMetadata, coinTitle);
    expect(result.verdict).toBe('match');
    expect(result.visualAudit?.normalizations?.[0]?.rule).toBe('coin_unknown_crop_supplement');
  });

  it('coin title does not turn an arbitrary empty evidence object into confirmation', () => {
    expect(enforceCoinExactEvidence({ candidateIndex: 0, verdict: 'unreadable', confidence: 'low', rationale: 'The image cannot be inspected.', visualEvidence: {} }, coinMetadata, coinTitle).verdict).toBe('unreadable');
  });

  it('coin title does not overwrite a date disagreement reported in the final rationale', () => {
    expect(enforceCoinExactEvidence({ candidateIndex: 0, verdict: 'unreadable', confidence: 'low', rationale: 'The visible date differs from the target.', visualEvidence: { identityMatches: true, denominationMatches: true } }, coinMetadata, coinTitle).verdict).toBe('unreadable');
  });

  it('a completed independent coin retry cannot erase its contrary observed numeric grade', () => {
    const finalEvidence = { ...evidence, dateMatches: true, varietyMatches: true, denominationMatches: true };
    const rationale = 'The target PCGS numeric grade is 63. The candidate PCGS numeric grade is 62; numeric grade differs. Coin identity and denomination match.';
    const review = { candidateIndex: 0, verdict: 'match' as const, confidence: 'high' as const, rationale, visualEvidence: finalEvidence,
      visualAudit: { imageCount: 1, initialVerdict: 'match' as const, initialConfidence: 'high' as const, retryStatus: 'performed' as const, finalPass: 'high_resolution_retry' as const, adjudicationStatus: 'confirmed' as const, retryRationale: rationale, finalEvidence } };
    expect(enforceCoinExactEvidence({ ...review, verdict: 'unreadable' }, coinMetadata, coinTitle).verdict).toBe('unreadable');
    expect(enforceCoinExactEvidence(review, coinMetadata, coinTitle).verdict).toBe('unreadable');
    expect(hasCompletedCoinAdjudication(review, coinMetadata, coinTitle)).toBe(false);
  });

  it('coin title cannot override a visibly different grader in the deciding review', () => {
    const review = { candidateIndex: 0, verdict: 'match' as const, confidence: 'high' as const, rationale: 'The candidate NGC numeric grade is 63. Coin identity and denomination match.', visualEvidence: { ...evidence, dateMatches: true, varietyMatches: true, denominationMatches: true } };
    expect(enforceCoinExactEvidence(review, coinMetadata, coinTitle).verdict).toBe('unreadable');
  });

  it('never promotes a raw suffix mismatch after both retry formats fail', async () => {
    mockedInvokeLLM.mockResolvedValueOnce(structuredVisualResponse({ reviews: [{ candidateIndex: 0, verdict: 'mismatch', confidence: 'high', rationale: suffix, visualEvidence: { ...evidence, rawOrLooseVisible: true, slabVisible: false, gradeMatches: false } }] }) as any)
      .mockRejectedValueOnce(new Error('isolated retry unavailable')).mockRejectedValueOnce(new Error('isolated retry fallback unavailable'));
    const result = await filterVisualSourceCandidates({ sourceRole: 'marketplace', sourceLabel: 'Stage 1 mocked eBay Sold', targetImageUrl: 'https://example.com/target.jpg', targetMetadata: metadata, listings: [{ title, imageUrl: 'https://example.com/candidate.jpg' }] });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(3);
    expect(result.listings[0].visualReviewStatus).not.toBe('match');
    expect(result.listings[0].evidenceDisposition).not.toBe('valuation_eligible');
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: 'mismatch', retryStatus: 'failed', finalPass: 'initial' });
  });

  it('preserves an earlier confirmed graded match when an optional gallery retry fails', async () => {
    mockedInvokeLLM.mockResolvedValueOnce(structuredVisualResponse({ reviews: [{ candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'The graded item identity, holder, and numeric grade match.', visualEvidence: evidence }] }) as any)
      .mockRejectedValueOnce(new Error('isolated optional retry unavailable')).mockRejectedValueOnce(new Error('isolated optional retry fallback unavailable'));
    const result = await filterVisualSourceCandidates({ sourceRole: 'marketplace', sourceLabel: 'Stage 1 mock', targetImageUrl: 'https://example.com/target.jpg', targetMetadata: metadata,
      listings: [{ title: 'The Legend of Zelda NES Sealed', fullItemDetails: { gameTitle: 'The Legend of Zelda', platform: 'NES', sealed: 'Yes', isGraded: 'Yes' }, imageUrl: 'https://example.com/candidate.jpg', imageUrls: ['https://example.com/candidate.jpg', 'https://example.com/gallery.jpg'] }] });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(3);
    expect(result.listings[0].visualReviewStatus).toBe('match');
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: 'match', retryStatus: 'failed', finalPass: 'initial', finalEvidence: evidence });
  });

  it('preserves raw retry provenance separately from the permitted normalized decision', async () => {
    const initial = { candidateIndex: 0, verdict: 'mismatch', confidence: 'high', rationale: 'The primary image is unclear; candidate appears raw.', visualEvidence: { rawOrLooseVisible: false } };
    mockedInvokeLLM.mockResolvedValueOnce(structuredVisualResponse({ reviews: [initial] }) as any)
      .mockResolvedValueOnce(structuredVisualResponse({ reviews: [{ candidateIndex: 0, verdict: 'unreadable', confidence: 'low', rationale: suffix, visualEvidence: evidence }] }) as any);
    const result = await filterVisualSourceCandidates({ sourceRole: 'marketplace', sourceLabel: 'Stage 1 mock', targetImageUrl: 'https://example.com/target.jpg', targetMetadata: metadata, listings: [{ title, imageUrl: 'https://example.com/candidate.jpg' }] });
    expect(result.listings[0].visualReviewStatus).toBe('match');
    expect(result.listings[0].visualAudit).toMatchObject({ initialVerdict: 'mismatch', initialRationale: initial.rationale, retryVerdict: 'unreadable', retryConfidence: 'low', retryRationale: suffix, finalPass: 'high_resolution_retry' });
  });
});
