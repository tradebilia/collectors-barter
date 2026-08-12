// Import types from schema
export type CollectibleCategory = "comics" | "sports_cards" | "vintage_toys" | "video_games" | "stamps" | "coins" | "pokemon" | "movies" | "autographs" | "disney_pins";

// Default grading scale (1-10 with 0.5 increments)
export const defaultGradeValues = [
  "ungraded",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
  "5.5",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
] as const;

// Comics grading scale (0.5-10)
export const comicsGradeValues = [
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "4.5",
  "5",
  "5.5",
  "6",
  "6.5",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
] as const;

// Coins grading scale (Sheldon 1-70)
export const coinsGradeValues = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "53",
  "55",
  "58",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "70",
] as const;

// Vintage Toys grading scale (1-100)
export const toysGradeValues = [
  "1",
  "5",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
  "60",
  "65",
  "70",
  "75",
  "80",
  "85",
  "90",
  "95",
  "100",
] as const;

// Stamps grading scale (1-100)
export const stampsGradeValues = [
  "1",
  "5",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
  "60",
  "65",
  "70",
  "75",
  "80",
  "85",
  "90",
  "95",
  "100",
] as const;

// Video Games grading scale (1-10 or 0-100 depending on grader)
export const videoGamesGradeValues = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "20",
  "30",
  "40",
  "50",
  "60",
  "70",
  "80",
  "90",
  "100",
] as const;

// Movies grading scale (1-10 for VHS/Home Video)
export const moviesGradeValues = [
  "ungraded",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

// Autographs - Authentication only (no grade)
export const autographsGradeValues = [
  "authenticated",
  "ungraded",
] as const;

// Disney Pins - Raw/Ungraded only
export const disneyPinsGradeValues = [
  "raw",
  "ungraded",
] as const;

// Category-specific grading scales mapping
export const categoryGradeScales: Record<
  CollectibleCategory,
  readonly string[]
> = {
  comics: comicsGradeValues,
  sports_cards: defaultGradeValues,
  vintage_toys: toysGradeValues,
  video_games: videoGamesGradeValues,
  stamps: stampsGradeValues,
  coins: coinsGradeValues,
  pokemon: defaultGradeValues,
  movies: moviesGradeValues,
  autographs: autographsGradeValues,
  disney_pins: disneyPinsGradeValues,
};

// Get grading scale for a specific category
export function getGradingScaleForCategory(
  category: CollectibleCategory
): readonly string[] {
  return categoryGradeScales[category] || defaultGradeValues;
}

// Get grading scale label for display
export function getGradingScaleLabel(
  category: CollectibleCategory
): string {
  switch (category) {
    case "comics":
      return "0.5–10 scale";
    case "coins":
      return "Sheldon 1–70 scale";
    case "vintage_toys":
      return "1–100 scale";
    case "stamps":
      return "1–100 scale";
    case "video_games":
      return "1–10 or 0–100 scale";
    case "movies":
      return "1–10 scale";
    case "autographs":
      return "Authentication + optional 1–10";
    case "disney_pins":
      return "Raw/Ungraded";
    case "sports_cards":
    case "pokemon":
    default:
      return "1–10 scale";
  }
}
