export const forumTaxonomy = {
  comics: ["single_comics", "original_art", "grading_slabs", "supplies"] as const,
  sports_cards: ["baseball", "basketball", "football", "hockey", "soccer", "other_sports", "grading_slabs"] as const,
  vintage_toys: ["action_figures", "vehicles", "dolls", "board_games", "playsets"] as const,
  video_games: ["consoles", "games", "accessories", "manuals_boxes", "repairs_collecting"] as const,
  stamps: ["us_stamps", "worldwide_stamps", "covers", "errors_varieties", "supplies"] as const,
  coins: ["us_coins", "world_coins", "currency", "tokens_medals", "errors_varieties"] as const,
  pokemon: ["singles", "sealed_product", "graded_cards", "accessories"] as const,
  movies: ["dvds_bluray", "vhs", "posters", "memorabilia"] as const,
  autographs: ["sports", "entertainment", "historical", "authentication"] as const,
  disney_pins: ["open_edition", "limited_edition", "event_pins", "mystery_trading"] as const,
} as const;

export type ForumParentCategory = keyof typeof forumTaxonomy;
export type ForumSubcategory = (typeof forumTaxonomy)[ForumParentCategory][number];

export const forumCategoryLabels: Record<string, string> = {
  general: "General Discussion",
  comics: "Comics",
  sports_cards: "Sports Cards",
  vintage_toys: "Vintage Toys",
  video_games: "Video Games",
  stamps: "Stamps",
  coins: "Coins",
  pokemon: "Pokémon",
  movies: "Movies",
  autographs: "Autographs",
  disney_pins: "Disney Pins",
};

export const forumSubcategoryLabels: Record<string, string> = {
  single_comics: "Single Comics",
  original_art: "Original Art",
  grading_slabs: "Grading & Slabs",
  supplies: "Supplies",
  baseball: "Baseball",
  basketball: "Basketball",
  football: "Football",
  hockey: "Hockey",
  soccer: "Soccer",
  other_sports: "Other Sports",
  action_figures: "Action Figures",
  vehicles: "Vehicles",
  dolls: "Dolls",
  board_games: "Board Games",
  playsets: "Playsets",
  consoles: "Consoles",
  games: "Games",
  accessories: "Accessories",
  manuals_boxes: "Manuals & Boxes",
  repairs_collecting: "Repairs & Collecting",
  us_stamps: "U.S. Stamps",
  worldwide_stamps: "Worldwide Stamps",
  covers: "Covers",
  errors_varieties: "Errors & Varieties",
  us_coins: "U.S. Coins",
  world_coins: "World Coins",
  currency: "Currency",
  tokens_medals: "Tokens & Medals",
  singles: "Singles",
  sealed_product: "Sealed Product",
  graded_cards: "Graded Cards",
  dvds_bluray: "DVDs & Blu-ray",
  vhs: "VHS",
  posters: "Posters",
  memorabilia: "Memorabilia",
  sports: "Sports",
  entertainment: "Entertainment",
  historical: "Historical",
  authentication: "Authentication",
  open_edition: "Open Edition",
  limited_edition: "Limited Edition",
  event_pins: "Event Pins",
  mystery_trading: "Mystery & Trading",
};

export const forumParentLevelSubcategory = "collections_lots";
export const forumParentLevelSubcategoryLabel = "Collections / Lots";

export function getForumSubcategories(category: string) {
  if (!(category in forumTaxonomy)) return [];
  return [
    ...forumTaxonomy[category as ForumParentCategory].map((value) => ({ value, label: forumSubcategoryLabels[value] })),
    { value: forumParentLevelSubcategory, label: forumParentLevelSubcategoryLabel },
  ];
}
