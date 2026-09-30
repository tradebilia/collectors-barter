import { describe, expect, it } from "vitest";
import { getTestedComicWorldScenePrompt, isProviderSceneSafetyRejection } from "./imageSceneRecovery";

const comic = (itemTitle: string, issue?: string) => ({
  category: "Comics",
  itemTitle,
  facts: issue ? [{ label: "Issue #", value: issue }] : [],
});

describe("image scene recovery", () => {
  it("identifies provider safety rejections so the route can use controlled recovery or the reviewed background", () => {
    expect(isProviderSceneSafetyRejection(new Error("Your request was rejected by the safety system"))).toBe(true);
    expect(isProviderSceneSafetyRejection(new Error("Temporary image service timeout"))).toBe(false);
    expect(isProviderSceneSafetyRejection("provider unavailable")).toBe(false);
  });

  it("returns a visually specific but non-literal Manhattan web-slinger environment only for Spider-Man #300", () => {
    const prompt = getTestedComicWorldScenePrompt(comic("Amazing Spider-Man CGC 9.6", "300"));
    expect(prompt).toContain("moonlit Manhattan rooftop silhouette");
    expect(prompt).toContain("web-lattice shadows");
    expect(prompt).toContain("First, look closely at the attached public item photograph");
    expect(prompt).toContain("Do not add shelves, posters, frames, screens, printed artifacts, display cases, panels, pages, covers, labels, or illustrations anywhere.");
    expect(prompt).toContain("Do not include or imitate the item itself");
    expect(getTestedComicWorldScenePrompt(comic("Amazing Spider-Man #299"))).toBeNull();
  });

  it("returns a cosmic observatory environment with explicit comic-artwork exclusions only for X-Men #137", () => {
    const prompt = getTestedComicWorldScenePrompt(comic("X-Men #137 CGC 9.8"));
    expect(prompt).toContain("deep-space nebula");
    expect(prompt).toContain("crimson-and-violet energy aurora");
    expect(prompt).toContain("Never include comic pages, panels, covers, framed artwork, or printed illustrations.");
    expect(getTestedComicWorldScenePrompt(comic("X-Men #136"))).toBeNull();
  });

  it("keeps all untested subjects on their reviewed static fallback path", () => {
    expect(getTestedComicWorldScenePrompt(comic("Daredevil #181"))).toBeNull();
    expect(getTestedComicWorldScenePrompt({ ...comic("Amazing Spider-Man #300"), category: "Sports Cards" })).toBeNull();
  });
});
