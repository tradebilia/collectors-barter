import { describe, expect, it } from "vitest";
import {
  videoGamePlatformComparable,
  videoGamePlatformFromTitle,
} from "../shared/testAiMetadataConflict";
import { VIDEO_GAME_CONSOLE_MASTER_LIST } from "../shared/testAiVideoGameConsoleRegistry";
import {
  buildMetadataFieldComparisons,
  buildVisualTargetMetadata,
  videoGameGameVisualScore,
  withMetadataFieldComparisons,
} from "./testAiVisualSourceFilter";

describe("Video Games title-derived platform parsing", () => {
  it("uses one canonical key for PS1 aliases in structured and title-derived evidence", () => {
    expect(videoGamePlatformComparable("PS1")).toBe("ps1");
    expect(videoGamePlatformComparable("Sony PlayStation 1")).toBe("ps1");
    expect(
      videoGamePlatformComparable(
        videoGamePlatformFromTitle("Resident Evil 2 (PlayStation, 1998)")
      )
    ).toBe("ps1");
  });

  it("loads the supplied console master list and preserves GBC aliases", () => {
    const gbc = VIDEO_GAME_CONSOLE_MASTER_LIST.find(entry => entry.shortName === "GBC");
    expect(VIDEO_GAME_CONSOLE_MASTER_LIST).toHaveLength(318);
    expect(gbc).toMatchObject({
      fullName: "Nintendo Game Boy Color",
      aliases: expect.arrayContaining(["GameBoy Color", "Game Boy Colour", "CGB-001"]),
    });
  });

  it("prefers the explicit parenthetical Game Boy Advance platform over NES series branding", () => {
    expect(
      videoGamePlatformFromTitle(
        "Nintendo Metroid Classic NES Series (Game Boy Advance) COMPLETE IN BOX"
      )
    ).toBe("Game Boy Advance");
  });

  it("continues to parse a normal Nintendo NES title as NES", () => {
    expect(
      videoGamePlatformFromTitle("Nintendo NES Metroid Complete in Box")
    ).toBe("NES");
  });

  it("captures Game Boy Color as its own platform instead of the broader Game Boy family", () => {
    expect(
      videoGamePlatformFromTitle(
        "Pokemon Silver Version GBC PSA 9.2 CIB 2000 Nintendo Game Boy Color"
      )
    ).toBe("Game Boy Color");
    expect(
      videoGamePlatformFromTitle("Pokemon Silver Version Nintendo Game Boy")
    ).toBe("Game Boy");
  });

  it("uses the fuller raw title when a provider normalized title drops Color", () => {
    const title =
      "Pokemon Silver Version USA 2000 CIB WATA 7.5 Game Boy Color Lugia Cart 8.0";
    const target = buildVisualTargetMetadata({
      title: "Pokemon Silver Version",
      category: "video_games",
      itemType: "game",
      fullItemDetails: { gameTitle: "Pokemon Silver Version", platform: "Game Boy Color" },
    });
    const row = buildMetadataFieldComparisons(target, {
      category: "video_games",
      normalizedListingTitle: "Pokemon Silver Version Game Boy",
      title,
    }).find(row => row.fieldKey === "platform");
    expect(row).toMatchObject({
      titleDerivedValue: "Game Boy Color (detected in title)",
      titleDerivedStatus: "match",
    });
  });

  it("uses the same platform evidence for scoring and the metadata breakdown", () => {
    const title =
      "Nintendo Metroid Classic NES Series (Game Boy Advance) COMPLETE IN BOX";
    const target = buildVisualTargetMetadata({
      title: "Metroid Game Boy Advance",
      category: "video_games",
      itemType: "game",
      fullItemDetails: {
        gameTitle: "Metroid",
        platform: "Game Boy Advance",
        completeInBox: "yes",
      },
    });
    const listing = { title };
    const score = videoGameGameVisualScore(listing, target);
    const platformRow = buildMetadataFieldComparisons(target, listing).find(
      row => row.fieldKey === "platform"
    );

    expect(score.matched).toContain("platform");
    expect(platformRow).toMatchObject({
      titleDerivedValue: "Game Boy Advance (detected in title)",
      titleDerivedStatus: "match",
    });
  });

  it("shows PS1 as MATCH when the scorer awards the platform points", () => {
    const target = buildVisualTargetMetadata({
      title: "Resident Evil 2 PS1",
      category: "video_games",
      itemType: "game",
      fullItemDetails: { gameTitle: "Resident Evil 2", platform: "PS1" },
    });
    const row = withMetadataFieldComparisons(target, {
      title: "Resident Evil 2 (Sony PlayStation 1, 1998) Complete PS1",
      platform: "Sony PlayStation 1",
      metadataFieldComparisons: [{
        fieldKey: "platform",
        targetField: "Platform",
        targetValue: "PS1",
        candidateField: "Platform",
        candidateValue: "Sony PlayStation 1",
        status: "different",
        titleDerivedField: "Platform (from title)",
        titleDerivedValue: "PlayStation (detected in title)",
        titleDerivedStatus: "different",
      }],
    }).metadataFieldComparisons.find(candidate => candidate.fieldKey === "platform");

    expect(row).toMatchObject({ status: "match", titleDerivedStatus: "match" });
  });
});
