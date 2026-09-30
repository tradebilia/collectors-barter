import { describe, expect, it } from "vitest";
import { getVisualReferenceOnlyScenePrompt } from "./visualReferenceScenePrompt";

describe("visual-reference-only scene prompt", () => {
  it("uses the listing image only for high-level environmental cues", () => {
    const prompt = getVisualReferenceOnlyScenePrompt();
    expect(prompt).toContain("broad visual attributes such as era, color palette, lighting, materials, and collector-room atmosphere");
    expect(prompt).toContain("distinct cinematic 16:9 editorial collector-room BACKGROUND");
    expect(prompt).toContain("Do not use any franchise, title, character, or brand identity from the reference");
  });

  it("prohibits recreating the collectible and keeps the renderer's content lanes clear", () => {
    const prompt = getVisualReferenceOnlyScenePrompt();
    expect(prompt).toContain("Do not reproduce, redraw, copy, adapt, depict");
    expect(prompt).toContain("cover, slab, package, card, character, logo, lettering");
    expect(prompt).toContain("upper half calm");
    expect(prompt).toContain("lower-left unobstructed");
    expect(prompt).toContain("right-center calm");
    expect(prompt).toContain("No readable text and no collectible-like duplicate objects");
  });
});
