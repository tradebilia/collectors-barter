/**
 * Filter presets for quick filtering on category pages
 * Allows users to quickly apply common filter combinations
 */

import { type TradebiliaCategorySlug } from "./tradebilia";

export interface FilterPreset {
  id: string;
  label: string;
  description: string;
  filters: Record<string, any>;
}

export const filterPresets: Record<TradebiliaCategorySlug, FilterPreset[]> = {
  sports_cards: [
    {
      id: "vintage_era",
      label: "Vintage Era",
      description: "Cards from 1950s-1980s",
      filters: {
        year: "1950s, 1960s, 1970s, 1980s",
      },
    },
    {
      id: "modern_era",
      label: "Modern Era",
      description: "Cards from 2000s onwards",
      filters: {
        year: "2000s, 2010s, 2020s",
      },
    },
    {
      id: "high_value",
      label: "High Value",
      description: "Cards over $1000",
      filters: {
        valueMin: 1000,
      },
    },
    {
      id: "graded_10",
      label: "Perfect Grade",
      description: "Graded 10 cards only",
      filters: {
        grade: "10",
      },
    },
    {
      id: "rookie_cards",
      label: "Rookie Cards",
      description: "Rookie cards only",
      filters: {
        rookie: "yes",
      },
    },
  ],
  comics: [
    {
      id: "golden_age",
      label: "Golden Age",
      description: "Comics from 1938-1956",
      filters: {
        year: "1938-1956",
      },
    },
    {
      id: "silver_age",
      label: "Silver Age",
      description: "Comics from 1956-1970",
      filters: {
        year: "1956-1970",
      },
    },
    {
      id: "first_issues",
      label: "First Issues",
      description: "Issue #1 comics",
      filters: {
        issueNumber: "#1",
      },
    },
    {
      id: "high_grade",
      label: "High Grade",
      description: "Graded 8.0 and above",
      filters: {
        grade: "8.0+",
      },
    },
  ],
  pokemon: [
    {
      id: "base_set",
      label: "Base Set",
      description: "Original Base Set cards",
      filters: {
        set: "Base Set",
      },
    },
    {
      id: "holo_rares",
      label: "Holo Rares",
      description: "Holographic rare cards",
      filters: {
        rarity: "Holo",
      },
    },
    {
      id: "psa_graded",
      label: "PSA Graded",
      description: "PSA graded cards only",
      filters: {
        gradingService: "PSA",
      },
    },
  ],
  vintage_toys: [
    {
      id: "mint_condition",
      label: "Mint Condition",
      description: "Mint condition items",
      filters: {
        condition: "mint",
      },
    },
    {
      id: "star_wars",
      label: "Star Wars",
      description: "Star Wars collectibles",
      filters: {
        franchise: "Star Wars",
      },
    },
  ],
  video_games: [
    {
      id: "nes_games",
      label: "NES Games",
      description: "Nintendo Entertainment System",
      filters: {
        system: "NES",
      },
    },
    {
      id: "sealed_games",
      label: "Sealed Games",
      description: "Factory sealed games",
      filters: {
        condition: "sealed",
      },
    },
  ],
  stamps: [
    {
      id: "us_stamps",
      label: "US Stamps",
      description: "United States stamps",
      filters: {
        country: "United States",
      },
    },
    {
      id: "early_issues",
      label: "Early Issues",
      description: "Stamps from 1847-1900",
      filters: {
        year: "1847-1900",
      },
    },
  ],
  coins: [
    {
      id: "us_coins",
      label: "US Coins",
      description: "United States coins",
      filters: {
        country: "United States",
      },
    },
    {
      id: "rare_dates",
      label: "Rare Dates",
      description: "Key date coins",
      filters: {
        year: "1909, 1933, 1794",
      },
    },
  ],
  movies: [
    {
      id: "marvel",
      label: "Marvel",
      description: "Marvel movie collectibles",
      filters: {
        franchise: "Marvel",
      },
    },
    {
      id: "disney",
      label: "Disney",
      description: "Disney movie collectibles",
      filters: {
        franchise: "Disney",
      },
    },
  ],
  autographs: [
    {
      id: "sports_autographs",
      label: "Sports Autographs",
      description: "Athlete autographs",
      filters: {
        franchise: "Sports",
      },
    },
    {
      id: "authenticated",
      label: "Authenticated",
      description: "Professionally authenticated",
      filters: {
        authentication: "JSA, PSA/DNA, BAS",
      },
    },
  ],
  disney_pins: [
    {
      id: "limited_edition",
      label: "Limited Edition",
      description: "Limited edition pins",
      filters: {
        rarity: "Limited Edition",
      },
    },
    {
      id: "park_releases",
      label: "Park Releases",
      description: "Disney park releases",
      filters: {
        parkOrEvent: "Disneyland, Disney World, EPCOT",
      },
    },
  ],
};

/**
 * Gets filter presets for a specific category
 */
export function getPresetsForCategory(category: TradebiliaCategorySlug): FilterPreset[] {
  return filterPresets[category] || [];
}

/**
 * Applies a filter preset to the current filters
 */
export function applyFilterPreset(
  currentFilters: Record<string, any>,
  preset: FilterPreset
): Record<string, any> {
  return {
    ...currentFilters,
    ...preset.filters,
  };
}
