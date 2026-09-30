/**
 * Safe recovery prompt for when a detailed item-aware request is rejected.
 * The attached public listing photo remains a high-level mood reference only:
 * the generated environment must never reproduce the collectible itself.
 */
export function getVisualReferenceOnlyScenePrompt(): string {
  return [
    "Use the attached public reference image only to infer broad visual attributes such as era, color palette, lighting, materials, and collector-room atmosphere.",
    "Generate a distinct cinematic 16:9 editorial collector-room BACKGROUND for a social graphic.",
    "Do not reproduce, redraw, copy, adapt, depict, or include any object, cover, slab, package, card, character, logo, lettering, silhouette, pose, visual artwork, or setting from the reference image.",
    "Do not use any franchise, title, character, or brand identity from the reference.",
    "Create an original neutral archival display room with physical depth and a premium auction-catalog mood.",
    "Keep the upper half calm for an existing title banner, the lower-left unobstructed for a separately composited original listing photo, and the right-center calm for separately overlaid factual copy.",
    "No readable text and no collectible-like duplicate objects. Background art only.",
  ].join(" ");
}
