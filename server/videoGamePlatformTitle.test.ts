import { describe, expect, it } from "vitest";
import { videoGamePlatformFromTitle } from "../shared/testAiMetadataConflict";
import {
  buildMetadataFieldComparisons,
  buildVisualTargetMetadata,
  videoGameGameVisualScore,
} from "./testAiVisualSourceFilter";

describe("Video Games title-derived platform parsing", () => {
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
});
