import { CollectibleCategory } from "./gradingScales";

export interface GradingCompany {
  name: string;
  categories: CollectibleCategory[];
  gradeScale: string;
}

export const gradingCompanies: GradingCompany[] = [
  // Comics
  { name: "CGC Comics", categories: ["comics"], gradeScale: "0.5–10" },
  { name: "CBCS", categories: ["comics"], gradeScale: "0.5–10" },
  { name: "PGX Comics", categories: ["comics"], gradeScale: "0.5–10" },

  // Sports Cards
  { name: "PSA", categories: ["sports_cards", "pokemon", "autographs"], gradeScale: "1–10" },
  { name: "Beckett Grading Services (BGS)", categories: ["sports_cards", "pokemon"], gradeScale: "1–10 with 0.5 increments" },
  { name: "SGC", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "TAG Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "HGA", categories: ["sports_cards", "pokemon"], gradeScale: "1–10 with 0.5 increments" },
  { name: "Arena Club Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "Degree Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "ISA Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "GMA Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "Rare Edition", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "FCG (Forensic Card Grading)", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "MNT Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "KSA Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "PGA Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "RCG", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "OnlyGraded", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "Diamond Service Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "CGA Card Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "TRCG", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "AP Grading", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "PRO", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "GEM", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "GAI", categories: ["sports_cards", "pokemon", "autographs"], gradeScale: "1–10" },
  { name: "PCI", categories: ["sports_cards"], gradeScale: "1–10" },
  { name: "WCG", categories: ["sports_cards", "pokemon"], gradeScale: "1–10" },
  { name: "Pokegrade", categories: ["pokemon"], gradeScale: "1–10" },
  { name: "Tree Frog Grading", categories: ["pokemon"], gradeScale: "1–10" },
  { name: "ACE Grading", categories: ["pokemon"], gradeScale: "1–10" },

  // Coins
  { name: "PCGS", categories: ["coins"], gradeScale: "Sheldon 1–70" },
  { name: "NGC", categories: ["coins"], gradeScale: "Sheldon 1–70" },
  { name: "ANACS", categories: ["coins"], gradeScale: "Sheldon 1–70" },
  { name: "ICG", categories: ["coins"], gradeScale: "Sheldon 1–70" },
  { name: "SEGS", categories: ["coins"], gradeScale: "Sheldon 1–70" },
  { name: "SGS", categories: ["coins"], gradeScale: "Sheldon 1–70" },

  // Stamps
  { name: "PSE", categories: ["stamps"], gradeScale: "1–100" },
  { name: "ASG", categories: ["stamps"], gradeScale: "1–100" },
  { name: "PSAG", categories: ["stamps"], gradeScale: "1–100" },

  // Vintage Toys
  { name: "AFA", categories: ["vintage_toys"], gradeScale: "0–100" },
  { name: "CAS", categories: ["vintage_toys"], gradeScale: "1–100" },
  { name: "UKG", categories: ["vintage_toys"], gradeScale: "1–100" },

  // Video Games
  { name: "WATA", categories: ["video_games"], gradeScale: "1–10" },
  { name: "PSA", categories: ["video_games"], gradeScale: "1–10" },
  { name: "CGC Video Games", categories: ["video_games"], gradeScale: "1–10" },
  { name: "VGA", categories: ["video_games"], gradeScale: "0–100" },
  { name: "CGC Home Video", categories: ["video_games", "movies"], gradeScale: "1–10" },
  { name: "IGS", categories: ["video_games", "movies"], gradeScale: "1–10" },

  // Movies
  { name: "VHS Grading", categories: ["movies"], gradeScale: "1–10" },

  // Autographs
  { name: "PSA/DNA", categories: ["autographs"], gradeScale: "Authentication + optional 1–10" },
  { name: "JSA", categories: ["autographs"], gradeScale: "Authentication" },
  { name: "Beckett Authentication Services", categories: ["autographs"], gradeScale: "Authentication + optional 1–10" },

  // Raw/Ungraded option for all categories
  { name: "Raw", categories: ["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins"], gradeScale: "Ungraded" },
];

/**
 * Get grading companies for a specific category
 */
export function getGradingCompaniesForCategory(category: CollectibleCategory): GradingCompany[] {
  return gradingCompanies
    .filter(company => company.categories.includes(category))
    .sort((a, b) => {
      // Sort Raw to the end
      if (a.name === "Raw") return 1;
      if (b.name === "Raw") return -1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Get all unique grading company names for a specific category
 */
export function getGradingCompanyNamesForCategory(category: CollectibleCategory): string[] {
  return getGradingCompaniesForCategory(category).map(company => company.name);
}
