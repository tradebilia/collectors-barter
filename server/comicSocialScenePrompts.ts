type ComicSceneInput = {
  category: string;
  itemTitle: string;
  facts: Array<{ label: string; value: string }>;
};

/**
 * These environmental prompts were verified against the image provider for
 * the two reported comics. They never ask the model to redraw the collectible;
 * the real listing photograph is composited separately by the client.
 */
export function getTestedComicScenePrompts(input: ComicSceneInput): string[] {
  if (input.category.trim().toLowerCase() !== "comics") return [];
  const title = [input.itemTitle, ...input.facts.filter(fact => /^title$/i.test(fact.label)).map(fact => fact.value)].join(" ");
  const issue = input.facts.find(fact => /^issue\s*(?:no\.?|number|#)$/i.test(fact.label))?.value
    ?? /#\s*(\d+)\b/.exec(input.itemTitle)?.[1]
    ?? "";
  const composition = "Create a cinematic 16:9 editorial collector-room BACKGROUND, with atmospheric depth and nuanced physical materials. Keep the upper half calm for an existing title banner, the lower-left unobstructed for a separately composited original listing photograph, and the right-center calm for separately overlaid factual copy. No people, characters, comic covers, slabs, logos, readable lettering, or copies of the listed collectible. The output is background art only.";

  if (/\bspider[\s-]?man\b/i.test(title) && /^0*300$/.test(issue.trim())) {
    return [
      `${composition} Context: a collection display inspired by The Amazing Spider-Man issue 300, a late-1980s graded superhero comic. Use a deep-red and midnight-blue archival-room palette, abstract web-like window shadows, a distant city skyline and vintage comic-shop display materials; do not depict any character or original cover.`,
      `${composition} Context: a late-1980s urban superhero-comic collector archive. Use red and blue accent lighting, intersecting geometric thread shadows and a distant city skyline, with ink-print textures and archival storage cases. Avoid imagery resembling a specific franchise.`,
    ];
  }
  if (/\bx[\s-]?men\b/i.test(title) && /^0*137$/.test(issue.trim())) {
    return [
      `${composition} Context: a collection display inspired by The Uncanny X-Men issue 137, a vintage graded superhero comic. Use midnight blue, warm gold and muted crimson in the archival-room lighting, cosmic-looking abstract light gradients, and vintage comic-shop display materials; do not depict any character or original cover.`,
      `${composition} Context: an early-1980s ensemble-superhero comic collector archive. Use midnight-blue, warm-gold and muted-crimson accents, star-like reflections, ink-print textures and archival storage cases. Avoid imagery resembling a specific franchise.`,
    ];
  }
  return [];
}

export function isProviderSceneSafetyRejection(error: unknown): boolean {
  return error instanceof Error && /rejected by the safety system/i.test(error.message);
}

export async function runTestedComicScenePromptLadder<T>(
  prompts: string[],
  generate: (prompt: string) => Promise<T>,
): Promise<T> {
  if (!prompts.length) throw new Error("No verified comic scene prompt is available for this listing.");
  for (const [index, prompt] of prompts.entries()) {
    try {
      return await generate(prompt);
    } catch (error) {
      // Only a content rejection merits less-specific wording. An outage,
      // storage failure, or configuration problem must not trigger more calls.
      if (!isProviderSceneSafetyRejection(error) || index === prompts.length - 1) throw error;
    }
  }
  throw new Error("No comic scene prompt succeeded.");
}
