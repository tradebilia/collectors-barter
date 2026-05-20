import { describe, it, expect } from "vitest";

// Grading services by category (copied from AddInventory.tsx)
const gradingServicesByCategory = {
  comics: [
    "CGC Comics",
    "CBCS",
    "PGX Comics",
    "EGS",
    "Halo Grading",
    "Raw",
  ],
  sports_cards: [
    "PSA",
    "Beckett Grading Services (BGS)",
    "SGC",
    "CGC Cards",
    "TAG Grading",
    "HGA",
    "Arena Club Grading",
    "Degree Grading",
    "ACE Grading",
    "ISA Grading",
    "GMA Grading",
    "Rare Edition",
    "FCG",
    "MNT Grading",
    "KSA Grading",
    "PGA Grading",
    "RCG",
    "OnlyGraded",
    "Diamond Service Grading",
    "CGA Card Grading",
    "TRCG",
    "Raw",
  ],
  vintage_toys: [
    "AFA",
    "CAS",
    "UKG",
    "Toygrader",
    "CGA Toy Grading",
    "Action Figure Grading (AFG)",
    "Raw",
  ],
  video_games: [
    "WATA Games",
    "CGC Video Games",
    "VGA",
    "IGS",
    "UK Graders",
    "Retro Video Game Grading",
    "Raw",
  ],
  stamps: [
    "PSE",
    "ASG",
    "PSAG",
    "PF (Philatelic Foundation)",
    "BPA Expertising",
    "APS Expertizing",
    "Raw",
  ],
  coins: [
    "PCGS",
    "NGC",
    "ANACS",
    "ICG",
    "SEGS",
    "SGS",
    "Hallmark",
    "PCI Coin Grading",
    "Raw",
  ],
  pokemon: [
    "PSA",
    "Beckett Grading Services (BGS)",
    "SGC",
    "CGC Cards",
    "TAG Grading",
    "HGA",
    "Arena Club Grading",
    "Degree Grading",
    "ACE Grading",
    "ISA Grading",
    "GMA Grading",
    "Pokegrade",
    "Tree Frog Grading",
    "AP Grading",
    "Raw",
  ],
  movies: [
    "CGC Home Video",
    "VHS Grading",
    "IGS",
    "AMG Grading",
    "Raw",
  ],
  autographs: [
    "PSA/DNA",
    "JSA",
    "Beckett Authentication Services",
    "Global Authentication",
    "ACE Authentication",
    "Mounted Memories",
    "Steiner Authentication",
    "Upper Deck Authenticated",
    "Fanatics Authentic",
    "Raw",
  ],
  disney_pins: [
    "PSA",
    "CGC",
    "SGC",
    "PinSlabs",
    "GPK Slabs",
    "Raw",
  ],
};

describe("Grading Services by Category", () => {
  it("should have grading services defined for all categories", () => {
    const categories = Object.keys(gradingServicesByCategory);
    expect(categories).toEqual([
      "comics",
      "sports_cards",
      "vintage_toys",
      "video_games",
      "stamps",
      "coins",
      "pokemon",
      "movies",
      "autographs",
      "disney_pins",
    ]);
  });

  it("should have at least one grading service per category", () => {
    Object.entries(gradingServicesByCategory).forEach(([category, services]) => {
      expect(services.length).toBeGreaterThan(0);
    });
  });

  it("should include Raw option for all categories", () => {
    Object.entries(gradingServicesByCategory).forEach(([category, services]) => {
      expect(services).toContain("Raw");
    });
  });

  it("should have category-specific grading companies", () => {
    // Comics should have CGC Comics
    expect(gradingServicesByCategory.comics).toContain("CGC Comics");
    expect(gradingServicesByCategory.comics).toContain("CBCS");

    // Sports Cards should have PSA, BGS, SGC, CGC Cards
    expect(gradingServicesByCategory.sports_cards).toContain("PSA");
    expect(gradingServicesByCategory.sports_cards).toContain("Beckett Grading Services (BGS)");
    expect(gradingServicesByCategory.sports_cards).toContain("SGC");
    expect(gradingServicesByCategory.sports_cards).toContain("CGC Cards");

    // Coins should have PCGS, NGC, ANACS
    expect(gradingServicesByCategory.coins).toContain("PCGS");
    expect(gradingServicesByCategory.coins).toContain("NGC");
    expect(gradingServicesByCategory.coins).toContain("ANACS");

    // Video Games should have WATA Games, CGC Video Games, VGA
    expect(gradingServicesByCategory.video_games).toContain("WATA Games");
    expect(gradingServicesByCategory.video_games).toContain("CGC Video Games");
    expect(gradingServicesByCategory.video_games).toContain("VGA");

    // Stamps should have PSE, ASG
    expect(gradingServicesByCategory.stamps).toContain("PSE");
    expect(gradingServicesByCategory.stamps).toContain("ASG");

    // Autographs should have PSA/DNA, JSA, Beckett
    expect(gradingServicesByCategory.autographs).toContain("PSA/DNA");
    expect(gradingServicesByCategory.autographs).toContain("JSA");
    expect(gradingServicesByCategory.autographs).toContain("Beckett Authentication Services");
  });

  it("should have first grading service as the most popular for each category", () => {
    // Comics: CGC Comics is first
    expect(gradingServicesByCategory.comics[0]).toBe("CGC Comics");

    // Sports Cards: PSA is first
    expect(gradingServicesByCategory.sports_cards[0]).toBe("PSA");

    // Coins: PCGS is first
    expect(gradingServicesByCategory.coins[0]).toBe("PCGS");

    // Video Games: WATA Games is first
    expect(gradingServicesByCategory.video_games[0]).toBe("WATA Games");

    // Stamps: PSE is first
    expect(gradingServicesByCategory.stamps[0]).toBe("PSE");

    // Autographs: PSA/DNA is first
    expect(gradingServicesByCategory.autographs[0]).toBe("PSA/DNA");
  });
});
