/**
 * Comprehensive Grading Company Configuration
 * Based on official grading company standards and verified increment structures
 */

export type CollectibleCategory = "comics" | "sports_cards" | "vintage_toys" | "video_games" | "stamps" | "coins" | "pokemon" | "movies" | "autographs" | "disney_pins";

export interface GradingCompanyConfig {
  name: string;
  categories: CollectibleCategory[];
  gradeScale: string;
  validGrades: string[];
  increment: string;
  hasSubgrades: boolean;
  hasSealGrade: boolean;
  specialDesignations: string[];
}

/**
 * Complete grading company configuration with verified valid grades and increments
 * Each company's grades are listed in order from lowest to highest
 */
export const gradingCompanyConfigs: GradingCompanyConfig[] = [
  // COMICS
  {
    name: "CGC Comics",
    categories: ["comics"],
    gradeScale: "0.5-10",
    validGrades: ["0.5", "0.7", "0.9", "1.0", "1.2", "1.4", "1.6", "1.8", "2.0", "2.2", "2.4", "2.6", "2.8", "3.0", "3.2", "3.4", "3.6", "3.8", "4.0", "4.2", "4.4", "4.6", "4.8", "5.0", "5.2", "5.4", "5.6", "5.8", "6.0", "6.2", "6.4", "6.6", "6.8", "7.0", "7.2", "7.4", "7.6", "7.8", "8.0", "8.2", "8.4", "8.6", "8.8", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"],
    increment: "0.2",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Pristine 10"],
  },
  {
    name: "CBCS",
    categories: ["comics"],
    gradeScale: "0.5-10",
    validGrades: ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "PGX Comics",
    categories: ["comics"],
    gradeScale: "0.5-10",
    validGrades: ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },

  // SPORTS CARDS & POKEMON
  {
    name: "PSA",
    categories: ["sports_cards", "pokemon", "autographs"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "10"],
    increment: "0.5 (no half grades for 9-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Beckett Grading Services (BGS)",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: ["Pristine 10", "Gem Mint 9.5", "Black Label 10"],
  },
  {
    name: "SGC",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "CGC Cards",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Pristine 10", "Gem Mint 10"],
  },
  {
    name: "TAG Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "HGA",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Arena Club Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Degree Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-11",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11"],
    increment: "0.5",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: ["Degree 11"],
  },
  {
    name: "ACE Grading",
    categories: ["pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: true,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "ISA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "GMA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Rare Edition",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "FCG (Forensic Card Grading)",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "MNT Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Flawless 10", "Pristine 10"],
  },
  {
    name: "KSA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "PGA Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "RCG",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "OnlyGraded",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Diamond Service Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "CGA Card Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "TRCG",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Pokegrade",
    categories: ["pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Tree Frog Grading",
    categories: ["pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "AP Grading",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "PRO",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "GEM",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "GAI",
    categories: ["sports_cards", "pokemon", "autographs"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "PCI",
    categories: ["sports_cards"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "WCG",
    categories: ["sports_cards", "pokemon"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },

  // COINS
  {
    name: "PCGS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Plus grades (45+, 50+, 53+, 55+, 58+, 62+, 63+, 64+, 65+, 66+, 67+, 68+)"],
  },
  {
    name: "NGC",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Plus designation", "Star designation"],
  },
  {
    name: "ANACS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "ICG",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "SEGS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "SGS",
    categories: ["coins"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "3", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },

  // PAPER MONEY
  {
    name: "PMG",
    categories: ["movies"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["EPQ (Exceptional Paper Quality)", "Star designation", "NET"],
  },
  {
    name: "PCGS Banknote",
    categories: ["movies"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "Legacy Currency Grading",
    categories: ["movies"],
    gradeScale: "Sheldon 1-70",
    validGrades: ["1", "2", "4", "6", "8", "10", "12", "15", "20", "25", "30", "35", "40", "45", "50", "53", "55", "58", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },

  // VIDEO GAMES
  {
    name: "WATA Games",
    categories: ["video_games"],
    gradeScale: "1-10 + seal grade",
    validGrades: ["0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "0.5",
    hasSubgrades: false,
    hasSealGrade: true,
    specialDesignations: ["Seal grades: A++, A+, A, B+, B, C"],
  },
  {
    name: "CGC Video Games",
    categories: ["video_games"],
    gradeScale: "1-10 + seal grade",
    validGrades: ["1.0", "1.2", "1.4", "1.6", "1.8", "2.0", "2.2", "2.4", "2.6", "2.8", "3.0", "3.2", "3.4", "3.6", "3.8", "4.0", "4.2", "4.4", "4.6", "4.8", "5.0", "5.2", "5.4", "5.6", "5.8", "6.0", "6.2", "6.4", "6.6", "6.8", "7.0", "7.2", "7.4", "7.6", "7.8", "8.0", "8.2", "8.4", "8.6", "8.8", "9.0", "9.2", "9.4", "9.6", "9.8", "9.9", "10.0"],
    increment: "0.2 (1-9), 0.1 (9-10)",
    hasSubgrades: false,
    hasSealGrade: true,
    specialDesignations: ["Seal grades: A++, A+, A, B+, B, C"],
  },
  {
    name: "VGA",
    categories: ["video_games"],
    gradeScale: "0-100 or 1-10",
    validGrades: ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "1 point (0-100) or 0.5 (1-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Gold (85+)", "Silver (75-84)", "Bronze (below 75)"],
  },
  {
    name: "CGC Home Video",
    categories: ["video_games", "movies"],
    gradeScale: "1-10 + seal grade",
    validGrades: ["1.0", "1.2", "1.4", "1.6", "1.8", "2.0", "2.2", "2.4", "2.6", "2.8", "3.0", "3.2", "3.4", "3.6", "3.8", "4.0", "4.2", "4.4", "4.6", "4.8", "5.0", "5.2", "5.4", "5.6", "5.8", "6.0", "6.2", "6.4", "6.6", "6.8", "7.0", "7.2", "7.4", "7.6", "7.8", "8.0", "8.2", "8.4", "8.6", "8.8", "9.0", "9.2", "9.4", "9.6", "9.8", "9.9", "10.0"],
    increment: "0.2 (1-9), 0.1 (9-10)",
    hasSubgrades: false,
    hasSealGrade: true,
    specialDesignations: ["Seal grades: A++, A+, A, B+, B, C"],
  },
  {
    name: "VHS Grading",
    categories: ["video_games", "movies"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "IGS",
    categories: ["video_games", "movies"],
    gradeScale: "1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },

  // STAMPS
  {
    name: "PSE",
    categories: ["stamps"],
    gradeScale: "1-100",
    validGrades: ["10", "20", "30", "40", "50", "60", "65", "70", "75", "80", "85", "90", "95", "98", "100"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Centering grades"],
  },
  {
    name: "ASG",
    categories: ["stamps"],
    gradeScale: "1-100",
    validGrades: ["10", "20", "30", "40", "50", "60", "75", "80", "85", "88", "90", "95", "99", "100"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "PSAG",
    categories: ["stamps"],
    gradeScale: "1-100",
    validGrades: ["10", "20", "30", "40", "50", "60", "75", "80", "85", "90", "95", "100"],
    increment: "Key grades only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },

  // VINTAGE TOYS
  {
    name: "AFA",
    categories: ["vintage_toys"],
    gradeScale: "0-100 or 1-10",
    validGrades: ["10", "20", "30", "40", "50", "60", "70", "75", "80", "85", "90", "95", "100", "1.0", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"],
    increment: "5 points (0-100) or 0.2 (1-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Sealed", "Qualified", "Loose categories"],
  },
  {
    name: "CAS",
    categories: ["vintage_toys"],
    gradeScale: "1-100 or 1-10",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "100"],
    increment: "1 point (1-100) or 0.1 (1-10)",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
  {
    name: "UKG",
    categories: ["vintage_toys"],
    gradeScale: "1-100",
    validGrades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "100"],
    increment: "1 point",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },

  // AUTOGRAPHS
  {
    name: "PSA/DNA",
    categories: ["autographs"],
    gradeScale: "Authentication + optional 1-10",
    validGrades: ["authenticated", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Authentication-focused"],
  },
  {
    name: "JSA",
    categories: ["autographs"],
    gradeScale: "Authentication only",
    validGrades: ["authenticated"],
    increment: "N/A",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Authentication-only service"],
  },
  {
    name: "Beckett Authentication Services",
    categories: ["autographs"],
    gradeScale: "Authentication + optional 1-10",
    validGrades: ["authenticated", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    increment: "Integer only",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: ["Authentication-focused"],
  },

  // RAW/UNGRADED (all categories)
  {
    name: "Raw",
    categories: ["comics", "sports_cards", "vintage_toys", "video_games", "stamps", "coins", "pokemon", "movies", "autographs", "disney_pins"],
    gradeScale: "Ungraded",
    validGrades: ["raw", "ungraded"],
    increment: "N/A",
    hasSubgrades: false,
    hasSealGrade: false,
    specialDesignations: [],
  },
];

/**
 * Get grading companies for a specific category
 */
export function getGradingCompaniesForCategory(category: CollectibleCategory): GradingCompanyConfig[] {
  return gradingCompanyConfigs
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

/**
 * Get grading company config by name
 */
export function getGradingCompanyByName(name: string): GradingCompanyConfig | undefined {
  return gradingCompanyConfigs.find(company => company.name === name);
}

/**
 * Validate if a grade is valid for a specific grading company
 */
export function isValidGradeForCompany(companyName: string, grade: string): boolean {
  const company = getGradingCompanyByName(companyName);
  if (!company) return false;
  return company.validGrades.includes(grade);
}

/**
 * Get valid grades for a specific grading company
 */
export function getValidGradesForCompany(companyName: string): string[] {
  const company = getGradingCompanyByName(companyName);
  return company?.validGrades || [];
}
