import { formatPublicBooleanValue } from "./publicBooleanValues";
import { formatPublicGradeValue } from "./publicGradeValues";

export type SocialPromotionFact = { label: string; value: string };

type PromotionField = {
  label: string;
  keys: readonly string[];
};

type ItemTypePromotionRule = {
  /** Facts for an ungraded listing, or for an item type that cannot be graded. */
  facts: readonly PromotionField[];
  /** Replaces the ungraded facts when an explicitly graded item requires a grading-specific display. */
  gradedFacts?: readonly PromotionField[];
  /** Replaces the standard facts when the item is explicitly authenticated. */
  authenticatedFacts?: readonly PromotionField[];
};

const detail = (label: string, ...keys: string[]): PromotionField => ({ label, keys });
const condition = detail("Condition", "$condition");
const graded = detail("Graded", "$isGraded");
const gradingCompany = detail("Grading Company", "$gradingCompany");
const grade = detail("Grade", "$grade");

/**
 * Approved source of truth: Tradebilia_High_Value_Graphic_Fields_Simple.xlsx.
 * The social graphic has room for four public-safe facts. Rules below retain
 * the workbook's exact display order; the title and item type render separately.
 */
export const SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE: Readonly<Record<string, ItemTypePromotionRule>> = {
  "autographs:collection_lot": {
    facts: [detail("Number of Signed Items", "numberOfSignedItems"), condition, detail("Signers Included", "signersIncluded")],
  },
  "autographs:signed_item": {
    facts: [detail("Signer", "signer"), detail("Signed Item Type", "signedItemType"), detail("Authentication", "authenticationIncluded"), detail("Authentication Company", "customAuthenticationCompany", "authenticationCompany")],
  },

  "coins:coin_set": {
    facts: [detail("Year", "year"), detail("Set Name", "setName"), detail("Set Type", "setType"), condition],
  },
  "coins:collection_lot": {
    facts: [detail("Coin Count", "approximateCoinCount"), condition, detail("Country", "country")],
  },
  "coins:paper_money": {
    facts: [detail("Year", "year"), detail("Denomination", "denomination"), detail("Country", "country"), condition],
    gradedFacts: [detail("Year", "year"), detail("Denomination", "denomination"), gradingCompany, grade],
  },
  "coins:single_coin": {
    facts: [detail("Year", "year"), detail("Denomination", "denomination"), detail("Country", "country"), condition],
    gradedFacts: [detail("Country", "country"), detail("Denomination", "denomination"), gradingCompany, grade],
  },

  "comics:collection_lot": {
    facts: [detail("Number of Comics", "numberOfComics"), detail("Publishers", "publishersIncluded"), detail("Major Titles", "majorTitlesIncluded"), detail("Years", "yearsIncluded")],
  },
  "comics:original_art": {
    facts: [detail("Artist Name", "artistName"), detail("Art Type", "artType"), detail("Signed By Artist", "signedByArtist"), detail("COA Included", "coaIncluded")],
  },
  "comics:single_comic": {
    facts: [detail("Title", "comicTitle", "title"), detail("Issue No.", "issueNumber", "issueNo", "issue"), detail("Publisher", "publisher"), condition],
    gradedFacts: [detail("Title", "comicTitle", "title"), detail("Issue No.", "issueNumber", "issueNo", "issue"), gradingCompany, grade],
  },

  "disney_pins:collection_lot": {
    facts: [detail("Pin Count", "approximatePinCount"), condition, detail("Characters", "charactersIncluded"), detail("Limited Editions", "limitedEditionPinsIncluded")],
  },
  "disney_pins:single_pin": {
    facts: [detail("Pin Name", "pinName"), condition, detail("Limited Edition", "limitedEdition"), detail("Series", "series")],
  },
  "disney_pins:pin_set": {
    facts: [detail("Set Name", "setName"), detail("Complete Set", "completeSet"), detail("Limited Edition", "limitedEdition"), condition],
  },

  "movies:box_set": {
    facts: [detail("Box Set", "boxSetName"), detail("Format", "format"), graded, detail("Sealed", "sealed")],
    gradedFacts: [detail("Box Set", "boxSetName"), detail("Format", "format"), gradingCompany, grade],
  },
  "movies:collection_lot": {
    facts: [detail("Quantity", "approximateQuantity"), detail("Notable Titles", "notableTitles"), detail("Sealed Items", "sealedItemsIncluded"), condition],
  },
  "movies:individual_movie": {
    facts: [detail("Title", "title"), detail("Format", "format"), detail("Edition", "edition"), graded],
    gradedFacts: [detail("Title", "title"), detail("Format", "format"), gradingCompany, grade],
  },

  "music:cassette_tape": {
    facts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), gradingCompany, grade],
  },
  "music:compact_disc": {
    facts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), gradingCompany, grade],
  },
  "music:eight_track_tape": {
    facts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), gradingCompany, grade],
  },
  "music:other_music_format": {
    facts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), gradingCompany, grade],
  },
  "music:vinyl_record": {
    facts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), detail("Release Year", "releaseYear"), detail("Record Label", "recordLabel")],
    gradedFacts: [detail("Artist / Performer", "artist"), detail("Album", "releaseTitle"), gradingCompany, grade],
  },

  "pokemon:collection_lot": {
    facts: [detail("Card Count", "approximateCardCount"), detail("Eras / Series", "setsIncluded"), detail("Notable Cards", "notableCards"), condition],
  },
  "pokemon:set": {
    facts: [detail("Year", "year"), detail("Set Name", "setName"), detail("Complete", "complete"), condition],
  },
  "pokemon:single_card": {
    facts: [detail("Card Name", "cardName"), detail("Set Name", "setName"), detail("Card No.", "cardNumber"), condition],
    gradedFacts: [detail("Card Name", "cardName"), detail("Set Name", "setName"), gradingCompany, grade],
  },
  "pokemon:unopened_product": {
    facts: [detail("Year", "releaseYear"), detail("Set Name", "setName"), detail("Product Type", "customProductType", "productType"), detail("Factory Sealed", "factorySealed")],
  },

  "sports_cards:card_set": {
    facts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), detail("Sport", "customSport", "sport"), detail("Set Name", "setName")],
  },
  "sports_cards:collection_lot": {
    facts: [detail("Card Count", "approximateCardCount"), detail("Years", "yearsIncluded"), detail("Manufacturers", "manufacturersIncluded"), detail("Notable Cards", "notableCards")],
  },
  "sports_cards:single_card": {
    facts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), detail("Card No", "cardNumber"), graded],
    gradedFacts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), gradingCompany, grade],
  },
  "sports_cards:unopened_product": {
    facts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), detail("Sport", "customSport", "sport"), detail("Product Type", "customProductType", "productType")],
    authenticatedFacts: [detail("Year", "year"), detail("Manufacturer", "customManufacturer", "manufacturer"), detail("Sport", "customSport", "sport"), detail("Authenticated Company", "customAuthenticationCompany", "authenticationCompany")],
  },

  "stamps:collection_lot": {
    facts: [detail("Quantity", "approximateQuantity"), detail("Countries", "countriesIncluded"), detail("Years", "yearsIncluded"), condition],
  },
  "stamps:single_stamp": {
    facts: [detail("Year", "year"), detail("Country", "country"), detail("Scott No.", "scottNumber"), condition],
    gradedFacts: [detail("Year", "year"), detail("Country", "country"), gradingCompany, grade],
  },
  "stamps:stamp_set": {
    facts: [detail("Year", "year"), detail("Country", "country"), detail("Set Name", "setNameDescription"), condition],
    gradedFacts: [detail("Year", "year"), detail("Country", "country"), gradingCompany, grade],
  },

  "video_games:accessory": {
    facts: [detail("Platform", "platform"), detail("Accessory Name", "accessoryName"), detail("Accessory Type", "accessoryType"), condition],
    gradedFacts: [detail("Platform", "platform"), detail("Accessory Name", "accessoryName"), gradingCompany, grade],
  },
  "video_games:collection_lot": {
    facts: [detail("Item Count", "approximateItemCount"), detail("Platforms", "platformsIncluded"), detail("Notable Items", "notableGamesConsoles"), condition],
  },
  "video_games:console": {
    facts: [detail("Console Name", "consoleName"), detail("Original Box Included", "originalBoxIncluded"), detail("Working Condition", "workingCondition"), condition],
    gradedFacts: [detail("Console Name", "consoleName"), detail("Working Condition", "workingCondition"), gradingCompany, grade],
  },
  "video_games:game": {
    facts: [detail("Platform", "platform"), detail("Release Year", "releaseYear"), detail("Complete in Box", "completeInBox"), condition],
    gradedFacts: [detail("Platform", "platform"), detail("Release Year", "releaseYear"), gradingCompany, grade],
  },

  "vintage_toys:action_figure": {
    facts: [detail("Toy Name / Character", "toyName"), detail("Brand", "brand"), detail("Year", "year"), condition],
    gradedFacts: [detail("Toy Name / Character", "toyName"), detail("Packaging Type", "packagingType"), gradingCompany, grade],
  },
  "vintage_toys:board_game": {
    facts: [detail("Game / Puzzle Name", "gamePuzzleName"), detail("Publisher / Brand", "publisherBrand"), detail("Complete", "complete"), condition],
    gradedFacts: [detail("Game / Puzzle Name", "gamePuzzleName"), detail("Publisher / Brand", "publisherBrand"), gradingCompany, grade],
  },
  "vintage_toys:collection_lot": {
    facts: [detail("Item Count", "approximateItemCount"), detail("Brands Included", "brandsIncluded"), detail("Franchises", "franchisesIncluded"), condition],
    gradedFacts: [detail("Item Count", "approximateItemCount"), detail("Brands", "brandsIncluded"), gradingCompany, grade],
  },
  "vintage_toys:electronic_toy": {
    facts: [detail("Toy Name", "toyName"), detail("Tested", "tested"), detail("Working Condition", "workingCondition"), condition],
    gradedFacts: [detail("Toy Name", "toyName"), detail("Tested", "tested"), gradingCompany, grade],
  },
  "vintage_toys:lego": {
    facts: [detail("Set No.", "setNumber"), detail("Theme", "theme"), detail("Piece Count", "pieceCount"), detail("Complete", "complete")],
    gradedFacts: [detail("Set No.", "setNumber"), detail("Theme", "theme"), gradingCompany, grade],
  },
  "vintage_toys:model_kit": {
    facts: [detail("Model / Kit Name", "modelKitName"), detail("Built or Unbuilt", "builtOrUnbuilt"), detail("Brand", "brand"), condition],
    gradedFacts: [detail("Model / Kit Name", "modelKitName"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:playset": {
    facts: [detail("Playset Name", "playsetName"), detail("Brand", "brand"), detail("Year", "year"), condition],
    gradedFacts: [detail("Playset Name", "playsetName"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:plush_toy": {
    facts: [detail("Toy Name/ Character", "toyNameCharacter"), detail("Brand", "brand"), detail("Year", "year"), condition],
    gradedFacts: [detail("Toy Name / Character", "toyNameCharacter"), detail("Brand", "brand"), gradingCompany, grade],
  },
  "vintage_toys:vehicle": {
    facts: [detail("Vehicle Name", "vehicleName"), detail("Brand", "brand"), detail("Year", "year"), condition],
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
  const lowerCaseValue = normalized.toLowerCase();
  if (!normalized || ["ungraded", "raw", "n/a", "none", "null", "undefined"].includes(lowerCaseValue)) return null;
  return formatPublicBooleanValue(normalized).slice(0, 80);
}

function validGrade(value: unknown): string | null {
  const normalized = normalizedValue(value);
  const formatted = normalized ? formatPublicGradeValue(normalized) : "";
  return formatted || null;
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
  if (state === "yes" || state === "true" || state === "1") return true;
  if (state === "no" || state === "false" || state === "0") return false;
  return Boolean(normalizedValue(source.$gradingCompany) || validGrade(source.grade));
}

function isExplicitlyAuthenticated(details: Record<string, unknown>): boolean {
  const state = normalizedValue(details.authenticated)?.toLowerCase();
  return state === "yes" || state === "true" || state === "1";
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
  source.$isGraded = isExplicitlyGraded(details, source) ? "Yes" : "No";

  const rule = SOCIAL_PROMOTION_FIELDS_BY_ITEM_TYPE[`${category}:${itemType}`];
  const fields = rule?.authenticatedFacts && isExplicitlyAuthenticated(details)
    ? rule.authenticatedFacts
    : rule?.gradedFacts && isExplicitlyGraded(details, source)
    ? rule.gradedFacts
    : rule?.facts ?? FALLBACK_FIELDS;

  return fields.flatMap((field) => {
    const value = getValue(field, source);
    return value ? [{ label: field.label, value }] : [];
  }).slice(0, 4);
}
