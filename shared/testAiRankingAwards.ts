/** Explanation-only metadata ranking provenance; never identity/pricing authority. */
export type RankingAwardEvidence = {
  field: string;
  source: "structured" | "title";
  value?: string;
};

export type RankingAward = {
  /** Exact existing scorer term, independent of human-readable reason prose. */
  field: string;
  source: "structured" | "title" | "mixed" | "combined" | "rule";
  awardedPoints: number;
  evidence?: RankingAwardEvidence[];
};

export type MetadataScoreResult = {
  score: number;
  matched: string[];
  unknown?: string[];
  awards: RankingAward[];
};

/** Case/punctuation normalization applies to identifiers, never reason text. */
function identifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const FIELD_ALIASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["title", ["listingTitle", "itemTitle", "titleOverlap"]],
  ["certificationCompany", ["gradingCompany", "grader"]],
  ["grade", ["numericGrade", "gameGrade"]],
  ["isGraded", ["graded", "gradingStatus", "gradingState"]],
  ["platform", ["compatiblePlatform", "compatibleSystem", "console", "system"]],
  ["year", ["releaseYear", "publicationYear", "yearDate", "date", "issueYear", "mintYear"]],
  ["complete", ["isComplete", "completeness"]],
  ["completeInBox", ["completeBox", "cib"]],
  ["sealed", ["factorySealed", "sealedStatus", "sealStatus", "unopened", "unopenedProduct"]],
  ["originalPackaging", ["originalPackagingIncluded", "packagingIncluded"]],
  ["originalBoxIncluded", ["originalBox", "boxIncluded"]],
  ["manufacturer", ["brand", "maker", "customManufacturer"]],
  ["player", ["athlete", "subject", "playerName", "athleteName"]],
  ["setName", ["set", "cardSet", "setNameDescription", "setNameSeries"]],
  ["cardNumber", ["cardNo"]],
  ["issueNumber", ["issueNo", "coverSketchIssueNumber"]],
  ["comicTitle", ["coverSketchComicTitle", "comicSeries"]],
  ["variant", ["variantDescription", "variantCover", "varietyName"]],
  ["country", ["issuingCountry", "issuingAuthority", "countryIssuingAuthority", "countryOfRelease", "pressingCountry"]],
  ["denomination", ["coinDenomination", "noteDenomination"]],
  ["mintMark", ["mint"]],
  ["composition", ["metal", "compositionMetal"]],
  ["designation", ["strike", "finish", "designationStrikeFinish"]],
  ["numberOfCoins", ["numberOfCoinsInSet", "coinCount"]],
  ["numberOfMovies", ["movieCount"]],
  ["numberOfPins", ["pinCount"]],
  ["numberOfStamps", ["stampCount"]],
  ["numberOfCardsInSet", ["cardCount", "numberOfCards"]],
  ["scottNumber", ["catalogNo"]],
  ["hingeStatus", ["hinged"]],
  ["gumType", ["gum", "gumCondition"]],
  ["overprintSurcharge", ["overprint"]],
  ["artist", ["performer", "artistName", "creator"]],
  ["releaseTitle", ["album", "albumTitle"]],
  ["recordLabel", ["label"]],
  ["catalogNumber", ["catNo"]],
  ["authenticationCompany", ["authenticator", "authentication"]],
  ["fromASealedCase", ["fromSealedCase"]],
  ["workingCondition", ["functionality", "workingStatus"]],
  ["packagingType", ["packageType"]],
  ["soundWorks", ["sound"]],
  ["lightsWork", ["lights"]],
  ["instructionsIncluded", ["instructions"]],
  ["accessoriesIncluded", ["accessories"]],
  ["batteryCompartmentCondition", ["batteryCondition"]],
  ["minifiguresIncluded", ["minifigures"]],
  ["retiredStatus", ["retired"]],
  ["tagsAttached", ["tags"]],
  ["builtOrUnbuilt", ["buildStatus"]],
  ["upcEan", ["upc", "ean", "barcode"]],
];
const ALIAS_KEYS = new Map(FIELD_ALIASES.flatMap(([canonical, aliases]) =>
  [canonical, ...aliases].map((alias) => [identifier(alias), identifier(canonical)] as const)));

/** Exact aliases only. Optional context prevents category-specific false aliases. */
export function rankingAwardFieldKey(field: string, category = "", itemType = ""): string {
  const key = identifier(field);
  const categoryKey = identifier(category);
  const itemTypeKey = identifier(itemType);
  // The Movie scorer's exact movieTitle term reads the existing title row.
  // Some live source payloads carry the item role (`individual_movie`) more
  // reliably than the category label, so both paths must share this alias.
  const isMovieContext = categoryKey === "movies" || categoryKey === "movie"
    || itemTypeKey.includes("movie");
  if (isMovieContext && key === "movietitle") return "title";
  // Pokémon finish is identity finish, not a Coin designation/strike term.
  if (categoryKey === "pokemon" && ["finish", "finishvariant"].includes(key)) return "finish";
  if (categoryKey === "pokemon" && ["editionera", "edition", "era"].includes(key)) return "editionera";
  if (categoryKey === "pokemon" && key === "number") return "cardnumber";
  if (categoryKey === "vintagetoys" && ["setnumber", "setno"].includes(key)) return "setnumber";
  if (categoryKey === "vintagetoys" && ["piececount", "pieces", "numberofpieces"].includes(key)) return "piececount";
  if (categoryKey === "stamps" && ["scottnumber", "catalognumber", "catalogno"].includes(key)) return "scottnumber";
  return ALIAS_KEYS.get(key) ?? key;
}

const COMPOSITE_FIELDS = new Set(["manufacturerorset", "gradingdetails", "soundorlights"]);

function evidenceForRow(award: RankingAward, field: string, category: string, itemType: string): RankingAwardEvidence[] {
  const key = rankingAwardFieldKey(field, category, itemType);
  return (award.evidence ?? []).filter((entry) => rankingAwardFieldKey(entry.field, category, itemType) === key);
}

export function rankingAwardsForField(
  awards: readonly RankingAward[] | null | undefined,
  field: string,
  category = "",
  itemType = "",
): RankingAward[] {
  const key = rankingAwardFieldKey(field, category, itemType);
  return (awards ?? []).filter((award) => award.awardedPoints > 0 && (
    rankingAwardFieldKey(award.field, category, itemType) === key
    // Only recognized composites and the existing Pin-name character fallback
    // link a term to another field. Is Graded never awards Grade/grader rows.
    || (COMPOSITE_FIELDS.has(identifier(award.field)) || identifier(award.field) === "pinname")
      && evidenceForRow(award, field, category, itemType).length > 0
  ));
}

/** Source-column claims depend only on awards, not matching status/raw presence/prose. */
export function rankingAwardContribution(
  awards: readonly RankingAward[] | null | undefined,
  field: string,
  category = "",
  itemType = "",
): { matched: boolean; structured: boolean; titleDerived: boolean; reasons: string[]; awards: RankingAward[] } {
  const relevant = rankingAwardsForField(awards, field, category, itemType);
  const sources = relevant.flatMap((award) => {
    const evidence = evidenceForRow(award, field, category, itemType);
    // A term marker may link canonically, but its source claim must follow the
    // actual selected evidence, not an unwitnessed sibling/fallback column.
    if (award.evidence?.length || COMPOSITE_FIELDS.has(identifier(award.field))) return evidence.map((entry) => entry.source);
    if (award.source === "structured" || award.source === "title") return [award.source];
    return [];
  });
  return {
    matched: relevant.length > 0,
    structured: sources.includes("structured"),
    titleDerived: sources.includes("title"),
    reasons: relevant.map((award) => `${award.field}: ${award.awardedPoints} points (${award.source})`),
    awards: relevant,
  };
}
