/**
 * Filter suggestions utility for providing smart suggestions based on available data
 * Helps users discover common filter values and popular searches
 */

import { type TradebiliaCategorySlug } from "./tradebilia";

export interface FilterSuggestion {
  value: string;
  label: string;
  count?: number; // Number of items matching this suggestion
}

/**
 * Common suggestions for each category
 * In a production app, these would come from the database based on actual listings
 */
export const categoryFilterSuggestions: Record<
  TradebiliaCategorySlug,
  Record<string, FilterSuggestion[]>
> = {
  sports_cards: {
    manufacturer: [
      { value: "Topps", label: "Topps", count: 245 },
      { value: "Fleer", label: "Fleer", count: 189 },
      { value: "Upper Deck", label: "Upper Deck", count: 156 },
      { value: "Donruss", label: "Donruss", count: 98 },
      { value: "Leaf", label: "Leaf", count: 76 },
    ],
    year: [
      { value: "1986", label: "1986 (Rookie Year)", count: 145 },
      { value: "1980s", label: "1980s", count: 312 },
      { value: "1990s", label: "1990s", count: 267 },
      { value: "2000s", label: "2000s", count: 189 },
      { value: "Junk Wax Era", label: "Junk Wax Era (1987-1991)", count: 234 },
    ],
    team: [
      { value: "Yankees", label: "New York Yankees", count: 156 },
      { value: "Cowboys", label: "Dallas Cowboys", count: 134 },
      { value: "Bulls", label: "Chicago Bulls", count: 128 },
      { value: "Lakers", label: "Los Angeles Lakers", count: 112 },
      { value: "49ers", label: "San Francisco 49ers", count: 98 },
    ],
    grade: [
      { value: "10", label: "10 (Gem Mint)", count: 89 },
      { value: "9", label: "9 (Mint)", count: 145 },
      { value: "8", label: "8 (NM-MT)", count: 234 },
      { value: "7", label: "7 (NM)", count: 178 },
    ],
  },
  comics: {
    title: [
      { value: "Amazing Fantasy", label: "Amazing Fantasy", count: 67 },
      { value: "X-Men", label: "X-Men", count: 156 },
      { value: "Action Comics", label: "Action Comics", count: 89 },
      { value: "Detective Comics", label: "Detective Comics", count: 76 },
      { value: "Fantastic Four", label: "Fantastic Four", count: 54 },
    ],
    issueNumber: [
      { value: "#1", label: "Issue #1 (First Appearance)", count: 234 },
      { value: "#1-10", label: "Issues #1-10 (Early Issues)", count: 567 },
      { value: "#100", label: "Issue #100 (Milestone)", count: 89 },
    ],
    grade: [
      { value: "9.8", label: "9.8 (Near Mint/Mint)", count: 45 },
      { value: "9.6", label: "9.6 (Near Mint+)", count: 78 },
      { value: "9.4", label: "9.4 (Near Mint)", count: 123 },
      { value: "9.0", label: "9.0 (Very Fine/Near Mint)", count: 156 },
    ],
  },
  pokemon: {
    set: [
      { value: "Base Set", label: "Base Set (1999)", count: 456 },
      { value: "Jungle", label: "Jungle (1999)", count: 234 },
      { value: "Fossil", label: "Fossil (2000)", count: 189 },
      { value: "Neo Genesis", label: "Neo Genesis (2000)", count: 167 },
      { value: "Evolving Skies", label: "Evolving Skies (2021)", count: 145 },
    ],
    rarity: [
      { value: "Holo Rare", label: "Holographic Rare", count: 567 },
      { value: "Secret Rare", label: "Secret Rare", count: 234 },
      { value: "Ultra Rare", label: "Ultra Rare", count: 189 },
      { value: "Holo", label: "Holographic", count: 789 },
    ],
  },
  vintage_toys: {
    franchise: [
      { value: "Star Wars", label: "Star Wars", count: 345 },
      { value: "G.I. Joe", label: "G.I. Joe", count: 267 },
      { value: "Barbie", label: "Barbie", count: 234 },
      { value: "TMNT", label: "Teenage Mutant Ninja Turtles", count: 189 },
      { value: "He-Man", label: "He-Man & Masters of the Universe", count: 156 },
    ],
  },
  video_games: {
    system: [
      { value: "NES", label: "Nintendo Entertainment System", count: 456 },
      { value: "SNES", label: "Super Nintendo", count: 345 },
      { value: "Sega Genesis", label: "Sega Genesis", count: 267 },
      { value: "Game Boy", label: "Game Boy", count: 234 },
      { value: "Atari 2600", label: "Atari 2600", count: 189 },
    ],
  },
  stamps: {
    country: [
      { value: "United States", label: "United States", count: 567 },
      { value: "Great Britain", label: "Great Britain", count: 345 },
      { value: "France", label: "France", count: 234 },
      { value: "Germany", label: "Germany", count: 189 },
      { value: "Japan", label: "Japan", count: 156 },
    ],
  },
  coins: {
    denomination: [
      { value: "Penny", label: "Penny (1¢)", count: 234 },
      { value: "Nickel", label: "Nickel (5¢)", count: 189 },
      { value: "Dime", label: "Dime (10¢)", count: 167 },
      { value: "Quarter", label: "Quarter (25¢)", count: 145 },
      { value: "Dollar", label: "Dollar ($1)", count: 123 },
    ],
  },
  movies: {
    franchise: [
      { value: "Marvel", label: "Marvel", count: 567 },
      { value: "Disney", label: "Disney", count: 456 },
      { value: "Star Wars", label: "Star Wars", count: 345 },
      { value: "Batman", label: "Batman", count: 267 },
      { value: "James Bond", label: "James Bond", count: 189 },
    ],
  },
  autographs: {
    signer: [
      { value: "Sports", label: "Sports Figures", count: 456 },
      { value: "Actors", label: "Actors & Actresses", count: 345 },
      { value: "Musicians", label: "Musicians", count: 267 },
      { value: "Historical", label: "Historical Figures", count: 189 },
    ],
  },
  disney_pins: {
    parkOrEvent: [
      { value: "Disneyland", label: "Disneyland", count: 567 },
      { value: "Disney World", label: "Walt Disney World", count: 456 },
      { value: "EPCOT", label: "EPCOT", count: 345 },
      { value: "D23", label: "D23 Expo", count: 234 },
      { value: "Disney Cruise", label: "Disney Cruise Line", count: 189 },
    ],
  },
};

/**
 * Gets filter suggestions for a specific category and field
 */
export function getSuggestionsForField(
  category: TradebiliaCategorySlug,
  field: string
): FilterSuggestion[] {
  const suggestions = categoryFilterSuggestions[category]?.[field];
  return suggestions || [];
}

/**
 * Filters suggestions based on user input
 */
export function filterSuggestions(
  suggestions: FilterSuggestion[],
  input: string
): FilterSuggestion[] {
  if (!input) return suggestions.slice(0, 5); // Return top 5 if no input

  const lowerInput = input.toLowerCase();
  return suggestions
    .filter((s) => s.value.toLowerCase().includes(lowerInput) || s.label.toLowerCase().includes(lowerInput))
    .slice(0, 5); // Return top 5 matches
}

/**
 * Gets popular searches for a category
 */
export function getPopularSearches(category: TradebiliaCategorySlug): FilterSuggestion[] {
  // In a real app, this would come from analytics data
  const suggestions = categoryFilterSuggestions[category];
  if (!suggestions) return [];

  // Combine all suggestions and sort by count
  const allSuggestions = Object.values(suggestions).flat();
  return allSuggestions
    .filter((s) => s.count !== undefined)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);
}
