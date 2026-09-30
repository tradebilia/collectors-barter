type ComicWorldSceneInput = {
  category: string;
  itemTitle: string;
  facts: Array<{ label: string; value: string }>;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasIssue(input: ComicWorldSceneInput, issue: string): boolean {
  const title = normalize(input.itemTitle);
  const explicitIssue = input.facts.find(fact => /^issue\s*(?:no\.?|number|#)?$/i.test(fact.label))?.value ?? "";
  return new RegExp(`\\b${issue}\\b`).test(title) || new RegExp(`^0*${issue}$`).test(normalize(explicitIssue));
}

/**
 * Returns a narrow, tested recovery prompt only for reviewed high-value comic
 * subjects. The real public listing photo stays attached so its palette,
 * texture, and composition can influence the environment without recreating
 * the collectible or its artwork.
 */
export function getTestedComicWorldScenePrompt(input: ComicWorldSceneInput): string | null {
  if (normalize(input.category) !== "comics") return null;
  const title = normalize(input.itemTitle);
  const world = /\bspider man\b/.test(title) && hasIssue(input, "300")
    ? "This background should be rooted in the world of a vintage New York web-slinging superhero comic: a distant moonlit Manhattan rooftop silhouette, non-figurative web-lattice shadows projected across brick-and-steel architecture, and deep red and midnight-blue accent light."
    : /\bx men\b/.test(title) && hasIssue(input, "137")
      ? "This background should be rooted in the world of a vintage cosmic ensemble-superhero comic: a distant deep-space nebula, non-figurative crimson-and-violet energy aurora, and angular retro-futurist observatory architecture. Never include comic pages, panels, covers, framed artwork, or printed illustrations."
      : null;
  if (!world) return null;

  return [
    "First, look closely at the attached public item photograph. Create a distinct cinematic 16:9 editorial collector-room BACKGROUND for a social graphic. Use the photo for its dominant palette, print/ink texture, directional composition, and visual energy.",
    "The comic-world environmental details below must be recognizable as setting and atmosphere, not a generic room.",
    world,
    "Keep the upper half calm for an existing title banner, the lower-left unobstructed for a separately composited original listing photo, and the right-center calm for separately overlaid factual copy.",
    "Do not include or imitate the item itself, any comic cover, slab, card, package, character, person, logo, readable lettering, emblem, title, brand, franchise name, or recognizable artwork. Do not add shelves, posters, frames, screens, printed artifacts, display cases, panels, pages, covers, labels, or illustrations anywhere. No text. The output is original background art only.",
  ].join(" ");
}

/** A provider safety rejection needs a controlled recovery or a reviewed static background. */
export function isProviderSceneSafetyRejection(error: unknown): boolean {
  return error instanceof Error && /rejected by the safety system/i.test(error.message);
}
