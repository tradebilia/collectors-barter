// Single source of truth for category page filter dropdown options.
// Options are derived directly from the inventory form's field definitions
// (fieldDefinitionsGenerated.ts) so the filters always match what listings
// actually store. DO NOT hard-code option lists in CategoryPage.tsx.

import {
  POKEMON_SINGLE_CARD_FIELDS,
  VIDEO_GAMES_GAME_FIELDS,
  MOVIES_INDIVIDUAL_MOVIE_FIELDS,
  MOVIES_BOX_SET_FIELDS,
  AUTOGRAPHS_SIGNED_ITEM_FIELDS,
  SPORTS_CARDS_SINGLE_CARD_FIELDS,
} from "./fieldDefinitionsGenerated";
import type { FieldDefinition } from "./formFieldDefinitions";
import { COUNTRIES_LIST } from "./countries";

export interface FilterOption {
  value: string;
  label: string;
}

/** Extract dropdown options from a form field definition, using the exact
 *  stored values so backend matching works. */
function optionsFromField(
  fields: FieldDefinition[],
  fieldName: string,
): FilterOption[] {
  const field = fields.find(f => f.name === fieldName);
  if (!field || !field.dropdownOptions) return [];
  return field.dropdownOptions.map(value => ({
    value,
    label: field.displayLabels?.[value] ?? value,
  }));
}

/** Merge options from multiple item types, de-duplicated, preserving order. */
function mergedOptions(
  sources: Array<{ fields: FieldDefinition[]; fieldName: string }>,
): FilterOption[] {
  const seen = new Set<string>();
  const merged: FilterOption[] = [];
  for (const { fields, fieldName } of sources) {
    for (const option of optionsFromField(fields, fieldName)) {
      if (!seen.has(option.value)) {
        seen.add(option.value);
        merged.push(option);
      }
    }
  }
  return merged;
}

// Pokemon: Rarity — from the single card form field
export const pokemonRarityOptions: FilterOption[] = optionsFromField(
  POKEMON_SINGLE_CARD_FIELDS,
  "rarity",
);

// Video Games: System — from the game form's platform field
export const videoGameSystemOptions: FilterOption[] = optionsFromField(
  VIDEO_GAMES_GAME_FIELDS,
  "platform",
);

// Video Games: Region — from the game form's region field
export const videoGameRegionOptions: FilterOption[] = optionsFromField(
  VIDEO_GAMES_GAME_FIELDS,
  "region",
);

// Movies: Format — merged from individual movie and box set forms
export const moviesFormatOptions: FilterOption[] = mergedOptions([
  { fields: MOVIES_INDIVIDUAL_MOVIE_FIELDS, fieldName: "format" },
  { fields: MOVIES_BOX_SET_FIELDS, fieldName: "format" },
]);

// Autographs: Medium — from the signed item form's signedItemType field
export const autographsMediumOptions: FilterOption[] = optionsFromField(
  AUTOGRAPHS_SIGNED_ITEM_FIELDS,
  "signedItemType",
);

// Sports Cards: Sport — from the single card form field
export const sportsCardsSportOptions: FilterOption[] = optionsFromField(
  SPORTS_CARDS_SINGLE_CARD_FIELDS,
  "sport",
);

// Stamps/Coins: Country — same full country list the form uses
export const countryOptions: FilterOption[] = COUNTRIES_LIST.map(country => ({
  value: country,
  label: country,
}));

// Boolean-like filters — the form stores lowercase "yes"/"no"
export const yesNoOptions: FilterOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
