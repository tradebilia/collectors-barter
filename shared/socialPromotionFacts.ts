export type SocialPromotionFact = { label: string; value: string };

type PromotionField = {
  label: string;
  keys: readonly string[];
};

type ItemTypePromotionRule = {
  /** Facts for an ungraded listing, or for an item type that cannot be graded. */
  facts: readonly PromotionField[];
  /** Replaces the ungraded facts when this item type is explicitly graded. */
  gradedFacts?: readonly PromotionField[];
};

const detail = (label: string, ...keys: string[]): PromotionField => ({ label, keys });
const condition = detail("Condition", "$condition");
const gradingCompany = detail("Grading Company", "$gradingCompany");
const grade = detail("Grade", "$grade");

/**
 * The high-value graphic has room for four concise, public-safe facts. These
 * rules deliberately mirror the fields for each Add Inventory item type; they
 * are not category-wide fallbacks. A title and item type already appear above
 * the fact grid, so the rules favor distinguishing facts over repeated titles.
 */
export const SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE: Readonly<Record<string, ItemTypePromotionRule>> = {
  "autographs:collection_lot": {
    facts: [detail("Signed Items", "numberOfSignedItems"), detail("Signers", "signersIncluded"), detail("Authentication", "authenticationIncluded"), detail("Item Types", "itemTypesIncluded")],
  },
  "autographs:signed_item": {
    facts: [detail("Signer", "signer"), detail("Signed Item Type", "signedItemType"), detail("Authentication", "authenticationIncluded"), detail("Authentication Company", "customAuthenticationCompany", "authenticationCompany")],
  },
  "coins:coin_set": {
    facts: [detail("Country", "country"), detail("Set Name", "setName"), detail("Year", "year"), detail("Set Type", "setType")],
  },
  "coins:collection_lot": {
    facts: [detail("Coin Count", "approximateCoinCount"), detail("Countries", "countriesIncluded"), detail("Years", "yearsIncluded"), detail("Notable Coins", "notableCoins")],
  },
  "coins:paper_money": {
    facts: [detail("Country", "country"), detail("Denomination", "denomination"), detail("Year", "year"), condition],
    gradedFacts: [detail("Country", "country"), detail("Denomination", "denomination"), gradingCompany, grade],
  },
  "coins:single_coin": {
    facts: [detail("Country", "country"), detail("Denomination", "denomination"), detail("Year", "year"), detail("Mint Mark", "mintMark")],
    gradedFacts: [detail("Country", "country"), detail("Denomination", "denomination"), gradingCompany, grade],
  },
  "comics:collection_lot": {
    facts: [detail("Comic Count", "numberOfComics"), detail("Publishers", "publishersIncluded"), detail("Major Titles", "majorTitlesIncluded"), detail("Years", "yearsIncluded")],
  },
  "comics:original_art": {
    facts: [detail("Artist", "artistName"), detail("Artwork Title", "artworkTitle"), detail("Publisher", "publisher"), detail("Year Created", "yearCreated")],
  },
  "comics:single_comic": {
    facts: [detail("Title", "comicTitle", "title"), detail("Issue No.", "issueNumber", "issueNo", "issue"), detail("Publisher", "publisher"), condition],
    gradedFacts: [detail("Title", "comicTitle", "title"), detail("Issue No.", "issueNumber", "issueNo", "issue"), gradingCompany, grade],
  },
  "disney_pins:collection_lot": {
    facts: [detail("Pin Count", "approximatePinCount"), detail("Characters", "charactersIncluded"), detail("Series", "seriesIncluded"), detail("Limited Editions", "limitedEditionPinsIncluded")],
  },
  "disney_pins:single_pin": {
    facts: [detail("Character", "character"), detail("Series", "series"), detail("Year", "year"), detail("Limited Edition", "limitedEdition")],
  },
  "disney_pins:pin_set": {
    facts: [detail("Set Name", "setName"), detail("Pin Count", "numberOfPins"), detail("Limited Edition", "limitedEdition"), detail("Complete Set", "completeSet")],
  },
  "movies:box_set": {
    facts: [detail("Box Set", "boxSetName"), detail("Format", "format"), detail("Edition", "edition"), detail("Sealed", "sealed")],
    gradedFacts: [detail("Box Set", "boxSetName"), detail("Format", "format"), gradingCompany, grade],
  },
  "movies:collection_lot": {
    facts: [detail("Formats", "formatsIncluded"), detail("Quantity", "approximateQuantity"), detail("Notable Titles", "notableTitles"), detail("Sealed Items", "sealedItemsIncluded")],
  },
  "movies:individual_movie": {
    facts: [detail("Title", "title"), detail("Format", "format"), detail("Release Year", "releaseYear"), detail("Edition", "edition")],
    gradedFacts: [detail("Title", "title"), detail("Format", "format"), gradingCompany, grade],
  },
  "music:cassette_tape": {
    facts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), gradingCompany, grade],
  },
  "music:compact_disc": {
    facts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), gradingCompany, grade],
  },
  "music:eight_track_tape": {
    facts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), gradingCompany, grade],
  },
  "music:other_music_format": {
    facts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), gradingCompany, grade],
  },
  "music:vinyl_record": {
    facts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Catalog No.", "catalogNumber")],
    gradedFacts: [detail("Artist", "artist"), detail("Release", "releaseTitle"), gradingCompany, grade],
  },
  "pokemon:collection_lot": {
    facts: [detail("Card Count", "approximateCardCount"), detail("Eras / Series", "setsIncluded"), detail("Notable Cards", "notableCards"), detail("Graded Cards", "includesGradedCards")],
  },
  "pokemon:set": {
    facts: [detail("Set Name", "setName"), detail("Year", "year"), detail("Complete", "complete"), detail("Cards in Set", "numberOfCardsInSet")],
  },
  "pokemon:single_card": {
    facts: [detail("Card Name", "cardName"), detail("Set Name", "setName"), detail("Card No.", "cardNumber"), detail("Rarity", "rarity")],
    gradedFacts: [detail("Card Name", "cardName"), detail("Set Name", "setName"), gradingCompany, grade],
  },
  "pokemon:unopened_product": {
    facts: [detail("Set Name", "setName"), detail("Product Type", "customProductType", "productType"), detail("Year", "releaseYear"), detail("Factory Sealed", "factorySealed")],
  },
  "sports_cards:card_set": {
    facts: [detail("Sport", "customSport", "sport"), detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), detail("Set Name", "setName")],
  },
  "sports_cards:collection_lot": {
    facts: [detail("Card Count", "approximateCardCount"), detail("Years", "yearsIncluded"), detail("Manufacturers", "manufacturersIncluded"), detail("Notable Cards", "notableCards")],
  },
  "sports_cards:single_card": {
    facts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), detail("Set Name", "setName"), detail("Card No.", "cardNumber")],
    gradedFacts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), gradingCompany, grade],
  },
  "sports_cards:unopened_product": {
    facts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), detail("Product Format", "productFormat"), detail("Factory Sealed", "factorySealed")],
  },
  "stamps:collection_lot": {
    facts: [detail("Quantity", "approximateQuantity"), detail("Countries", "countriesIncluded"), detail("Years", "yearsIncluded"), detail("Album Included", "albumIncluded")],
  },
  "stamps:single_stamp": {
    facts: [detail("Country", "country"), detail("Year", "year"), detail("Scott No.", "scottNumber"), detail("Mint or Used", "mintOrUsed")],
    gradedFacts: [detail("Country", "country"), detail("Scott No.", "scottNumber"), gradingCompany, grade],
  },
  "stamps:stamp_set": {
    facts: [detail("Country", "country"), detail("Year", "year"), detail("Set Name", "setNameDescription"), detail("Mint or Used", "mintOrUsed")],
    gradedFacts: [detail("Country", "country"), detail("Set Name", "setNameDescription"), gradingCompany, grade],
  },
  "video_games:accessory": {
    facts: [detail("Accessory Type", "accessoryType"), detail("Accessory", "accessoryName"), detail("Platform", "platform"), detail("Manufacturer", "customManufacturer", "manufacturer")],
    gradedFacts: [detail("Accessory Type", "accessoryType"), detail("Accessory", "accessoryName"), gradingCompany, grade],
  },
  "video_games:collection_lot": {
    facts: [detail("Item Count", "approximateItemCount"), detail("Platforms", "platformsIncluded"), detail("Notable Items", "notableGamesConsoles"), detail("Graded Games", "includesGradedGames")],
  },
  "video_games:console": {
    facts: [detail("Console", "consoleName"), detail("Model", "modelNumber"), detail("Region", "region"), detail("Working Condition", "workingCondition")],
    gradedFacts: [detail("Console", "consoleName"), detail("Model", "modelNumber"), gradingCompany, grade],
  },
  "video_games:game": {
    facts: [detail("Game", "gameTitle"), detail("Platform", "platform"), detail("Release Year", "releaseYear"), detail("Complete in Box", "completeInBox")],
    gradedFacts: [detail("Game", "gameTitle"), detail("Platform", "platform"), gradingCompany, grade],
  },
  "vintage_toys:action_figure": {
    facts: [detail("Toy / Character", "toyName"), detail("Brand", "brand"), detail("Franchise", "franchise"), detail("Year", "year")],
    gradedFacts: [detail("Toy / Character", "toyName"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:board_game": {
    facts: [detail("Game / Puzzle", "gamePuzzleName"), detail("Publisher / Brand", "publisherBrand"), detail("Year", "year"), detail("Complete", "complete")],
    gradedFacts: [detail("Game / Puzzle", "gamePuzzleName"), detail("Publisher / Brand", "publisherBrand"), gradingCompany, grade],
  },
  "vintage_toys:collection_lot": {
    facts: [detail("Item Count", "approximateItemCount"), detail("Brands", "brandsIncluded"), detail("Franchises", "franchisesIncluded"), detail("Notable Items", "notableItems")],
    gradedFacts: [detail("Item Count", "approximateItemCount"), detail("Brands", "brandsIncluded"), gradingCompany, grade],
  },
  "vintage_toys:electronic_toy": {
    facts: [detail("Toy", "toyName"), detail("Brand", "brand"), detail("Year", "year"), detail("Working Condition", "workingCondition")],
    gradedFacts: [detail("Toy", "toyName"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:lego": {
    facts: [detail("Set No.", "setNumber"), detail("Theme", "theme"), detail("Piece Count", "pieceCount"), detail("Complete", "complete")],
    gradedFacts: [detail("Set No.", "setNumber"), detail("Theme", "theme"), gradingCompany, grade],
  },
  "vintage_toys:model_kit": {
    facts: [detail("Model / Kit", "modelKitName"), detail("Brand", "brand"), detail("Scale", "scale"), detail("Built or Unbuilt", "builtOrUnbuilt")],
    gradedFacts: [detail("Model / Kit", "modelKitName"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:playset": {
    facts: [detail("Playset", "playsetName"), detail("Brand", "brand"), detail("Franchise", "franchise"), detail("Year", "year")],
    gradedFacts: [detail("Playset", "playsetName"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:plush_toy": {
    facts: [detail("Toy / Character", "toyNameCharacter"), detail("Brand", "brand"), detail("Year", "year"), detail("Tags Attached", "tagsAttached")],
    gradedFacts: [detail("Toy / Character", "toyNameCharacter"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:vehicle": {
    facts: [detail("Vehicle", "vehicleName"), detail("Brand", "brand"), detail("Franchise", "franchise"), detail("Year", "year")],
    gradedFacts: [detail("Vehicle", "vehicleName"), detail("Brand", "brand"), gradingCompany, grade],
  },
};

const FALLBACK_FIELDS: readonly PromotionField[] = [
  detail("Year", "year", "releaseYear", "publicationYear", "manufactureYear"),
  detail("Manufacturer", "customManufacturer", "manufacturer", "manufacturerName"),
  detail("Brand", "brand", "brandName"),
  detail("Edition", "edition", "printRun"),
];

function toDetailRecord(itemDetails: unknown): Record<string, unknown> {
  if (!itemDetails) return {};
  if (typeof itemDetails === "string") {
    try {
      const parsed = JSON.parse(itemDetails) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof itemDetails === "object" && !Array.isArray(itemDetails) ? itemDetails as Record<string, unknown> : {};
}

function normalizedValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  if (!normalized || ["ungraded", "raw", "n/a", "none", "null", "undefined"].includes(normalized.toLowerCase())) return null;
  return normalized.slice(0, 80);
}

function validGrade(value: unknown): string | null {
  const normalized = normalizedValue(value);
  return normalized && !/^0+(?:\.0+)?$/.test(normalized) ? normalized : null;
}

function getValue(field: PromotionField, source: Record<string, unknown>): string | null {
  for (const key of field.keys) {
    const value = key === "$grade" ? validGrade(source.grade) : normalizedValue(source[key]);
    if (value) return value;
  }
  return null;
}

function isExplicitlyGraded(details: Record<string, unknown>, source: Record<string, unknown>): boolean {
  const state = normalizedValue(details.isGraded)?.toLowerCase();
  if (state === "yes" || state === "true") return true;
  if (state === "no" || state === "false") return false;
  return Boolean(normalizedValue(source.$gradingCompany) || validGrade(source.grade));
}

export function getSocialPromotionFacts(input: {
  category?: string | null;
  itemType?: string | null;
  itemDetails?: unknown;
  condition?: string | null;
  grade?: string | number | null;
  certificationCompany?: string | null;
  customGradingCompany?: string | null;
}): SocialPromotionFact[] {
  const category = String(input.category ?? "").trim().toLowerCase();
  const itemType = String(input.itemType ?? "").trim().toLowerCase();
  const details = toDetailRecord(input.itemDetails);
  const source: Record<string, unknown> = {
    ...details,
    $condition: input.condition ? String(input.condition).replace(/_/g, " ") : null,
    $gradingCompany: input.customGradingCompany || input.certificationCompany || details.customGradingCompany || details.gradingCompany,
    grade: input.grade ?? details.grade,
  };
  const rule = SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE[`${category}:${itemType}`];
  const fields = rule?.gradedFacts && isExplicitlyGraded(details, source)
    ? rule.gradedFacts
    : rule?.facts ?? FALLBACK_FIELDS;

  return fields.flatMap((field) => {
    const value = getValue(field, source);
    return value ? [{ label: field.label, value }] : [];
  }).slice(0, 4);
}
