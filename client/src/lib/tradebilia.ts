export const TRADEBILIA_LOGO_URL = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg";

export const tradebiliaCategories = [
  { value: "comics", label: "Comics" },
  { value: "sports_cards", label: "Sports Cards" },
  { value: "vintage_toys", label: "Vintage Toys" },
  { value: "video_games", label: "Video Games" },
  { value: "stamps", label: "Stamps" },
  { value: "coins", label: "Coins" },
  { value: "pokemon", label: "Pokemon" },
  { value: "movies", label: "Movies" },
  { value: "autographs", label: "Autographs" },
  { value: "disney_pins", label: "Disney Pins" },
] as const;

export type TradebiliaCategorySlug = (typeof tradebiliaCategories)[number]["value"];

export const tradebiliaCategoryOptions = [
  { value: "all", label: "All Categories" },
  ...tradebiliaCategories,
] as const;

export const tradebiliaConditionOptions = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "very_good", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
] as const;

export const tradebiliaCategoryThemes: Record<TradebiliaCategorySlug, {
  eyebrow: string;
  heading: string;
  description: string;
  heroClassName: string;
  pageClassName: string;
  panelClassName: string;
  accentClassName: string;
  chipClassName: string;
  borderClassName: string;
  cardClassName: string;
  headingFont: string;
  textureClassName: string;
}> = {
  comics: {
    eyebrow: "Illustrated storytelling",
    heading: "Comic grails, slabbed keys, and golden-age centerpieces.",
    description: "Browse signed issues, key appearances, and certified runs in a page built with dramatic contrast, rich crimson accents, and a classic editorial rhythm.",
    heroClassName: "bg-[linear-gradient(135deg,#2f1010_0%,#751a19_40%,#0e0f17_100%)] text-white",
    pageClassName: "bg-[linear-gradient(180deg,#130c11_0%,#281013_18%,#121116_100%)] text-white",
    panelClassName: "bg-white/6 border-white/12 backdrop-blur-sm",
    accentClassName: "text-rose-200",
    chipClassName: "bg-rose-200/12 text-rose-100 border-rose-200/20",
    borderClassName: "border-white/12",
    cardClassName: "bg-black/20 border-white/10 text-white",
    headingFont: "Bebas Neue, Inter, sans-serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_35%)]",
  },
  sports_cards: {
    eyebrow: "Legendary athletes",
    heading: "Card-show clarity with premium slab energy and arena-blue contrast.",
    description: "The Sports Card exchange leans into teal glass, cream card-show surfaces, and condensed athletic headlines inspired by the uploaded reference.",
    heroClassName: "bg-[linear-gradient(135deg,#0f3b43_0%,#27758b_42%,#102732_100%)] text-[#fff4e0]",
    pageClassName: "bg-[linear-gradient(180deg,#0d2c36_0%,#16414a_14%,#ead6ac_14%,#ead6ac_100%)] text-[#1a1814]",
    panelClassName: "bg-[#f6e5bf]/95 border-[#3c6f77]/25",
    accentClassName: "text-[#0e5766]",
    chipClassName: "bg-[#0f5563] text-[#fff1d2] border-[#0f5563]/40",
    borderClassName: "border-[#345c63]/20",
    cardClassName: "bg-[#f4dfb4] border-[#2f6670]/20 text-[#19150d] shadow-[0_18px_50px_rgba(20,39,47,0.16)]",
    headingFont: "'Playfair Display', serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_34%)]",
  },
  vintage_toys: {
    eyebrow: "Boxed nostalgia",
    heading: "Muted silver, olive, and gold cues for treasured playroom legends.",
    description: "This category balances soft archival neutrals with museum-style spacing so boxed figures, die-cast classics, and franchise grails feel curated rather than crowded.",
    heroClassName: "bg-[linear-gradient(135deg,#202426_0%,#303734_48%,#ad9137_100%)] text-[#f9efc8]",
    pageClassName: "bg-[linear-gradient(180deg,#2c3132_0%,#454342_14%,#c8c8c2_14%,#c8c8c2_100%)] text-[#1e1d1a]",
    panelClassName: "bg-[#e4e0cf]/88 border-[#5f6762]/20 backdrop-blur-sm",
    accentClassName: "text-[#586a4f]",
    chipClassName: "bg-[#556a4d] text-[#f8efc8] border-[#556a4d]/35",
    borderClassName: "border-[#697069]/18",
    cardClassName: "bg-[#d3d2cb] border-[#626764]/18 text-[#1e1d1a] shadow-[0_18px_50px_rgba(34,37,34,0.12)]",
    headingFont: "Oswald, Inter, sans-serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_40%)]",
  },
  video_games: {
    eyebrow: "Sealed cartridge energy",
    heading: "Arcade-green contrast for graded classics, console legends, and competitive staples.",
    description: "The Video Games exchange brings neon green typography, deep CRT-inspired shadows, and tighter collector filters to echo the uploaded page direction.",
    heroClassName: "bg-[linear-gradient(135deg,#04150c_0%,#0f3b1e_56%,#67d63b_100%)] text-[#d7ffb7]",
    pageClassName: "bg-[linear-gradient(180deg,#06150b_0%,#0a2615_100%)] text-[#efffe2]",
    panelClassName: "bg-[#0f2c19]/92 border-[#6ce248]/20 backdrop-blur-sm",
    accentClassName: "text-[#83ef63]",
    chipClassName: "bg-[#68dc43]/18 text-[#d8ffbc] border-[#68dc43]/30",
    borderClassName: "border-[#73e44e]/18",
    cardClassName: "bg-[#092011] border-[#68dc43]/18 text-[#f2ffe8] shadow-[0_18px_50px_rgba(1,14,7,0.35)]",
    headingFont: "Orbitron, Inter, sans-serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(104,220,67,0.22),transparent_38%)]",
  },
  stamps: {
    eyebrow: "Philatelic archives",
    heading: "Lavender paper, formal lettering, and archival calm for rare postal treasures.",
    description: "The Stamps exchange uses a soft violet field, restrained filter rail, and catalog-like rhythm influenced by the uploaded philatelic reference.",
    heroClassName: "bg-[linear-gradient(135deg,#39204d_0%,#53306d_60%,#b79ccc_100%)] text-[#f3e6ff]",
    pageClassName: "bg-[#d9cadf] text-[#1e1725]",
    panelClassName: "bg-[#f4efe8]/90 border-[#8e79a3]/20",
    accentClassName: "text-[#5d3e79]",
    chipClassName: "bg-[#6c4d8d] text-[#f4eafe] border-[#6c4d8d]/30",
    borderClassName: "border-[#9a8aad]/18",
    cardClassName: "bg-[#e2d6e4] border-[#8c7d98]/18 text-[#1f1725] shadow-[0_18px_50px_rgba(56,33,72,0.14)]",
    headingFont: "Playfair Display, Cormorant Garamond, serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_38%)]",
  },
  coins: {
    eyebrow: "Minted prestige",
    heading: "Cabinet-depth navy with metallic highlights for numismatic standouts.",
    description: "Coins stay formal and cinematic, pairing deep jewel tones with brushed-metal cards and a luxury auction-house feel.",
    heroClassName: "bg-[linear-gradient(135deg,#131824_0%,#2a3148_48%,#d4b270_100%)] text-[#f7edce]",
    pageClassName: "bg-[#e9decb] text-[#1d1712]",
    panelClassName: "bg-[#f2e8d6]/92 border-[#8b744d]/20",
    accentClassName: "text-[#86663b]",
    chipClassName: "bg-[#6c5735] text-[#f7edd1] border-[#6c5735]/28",
    borderClassName: "border-[#92784e]/18",
    cardClassName: "bg-[#efe3d0] border-[#947a51]/18 text-[#1b1610] shadow-[0_18px_50px_rgba(32,40,61,0.12)]",
    headingFont: "Cinzel, Cormorant Garamond, serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_38%)]",
  },
  pokemon: {
    eyebrow: "High-voltage collecting",
    heading: "Bright yellow, cobalt contrast, and playful energy for chase-card browsing.",
    description: "Pokemon gets a brighter identity with saturated yellow accents, blue framing, and a more playful headline treatment inspired by the uploaded reference.",
    heroClassName: "bg-[linear-gradient(135deg,#193886_0%,#245ec8_46%,#ffd53f_100%)] text-[#fff6cf]",
    pageClassName: "bg-[#f5d84a] text-[#1f2240]",
    panelClassName: "bg-[#fff8d8]/92 border-[#2a59b5]/20",
    accentClassName: "text-[#1f4ca4]",
    chipClassName: "bg-[#2557b8] text-[#fff6cc] border-[#2557b8]/28",
    borderClassName: "border-[#2f5fc2]/18",
    cardClassName: "bg-[#ffef9b] border-[#2e5db9]/18 text-[#1f2141] shadow-[0_18px_50px_rgba(34,71,156,0.12)]",
    headingFont: "Fredoka, Inter, sans-serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_36%)]",
  },
  movies: {
    eyebrow: "Silver-screen memorabilia",
    heading: "Red velvet contrast and marquee drama for posters, props, and certified film relics.",
    description: "Movies leans into theatrical burgundy, golden accents, and marquee-style hierarchy so the page feels like a premiere-night catalog.",
    heroClassName: "bg-[linear-gradient(135deg,#2c080f_0%,#6c0f1d_52%,#d49a44_100%)] text-[#f8e2b8]",
    pageClassName: "bg-[#ead7bf] text-[#24150f]",
    panelClassName: "bg-[#f4e0c4]/92 border-[#7a2a26]/18",
    accentClassName: "text-[#8a2d24]",
    chipClassName: "bg-[#7a241f] text-[#f9e4bf] border-[#7a241f]/28",
    borderClassName: "border-[#944138]/16",
    cardClassName: "bg-[#efd7b7] border-[#8d392f]/16 text-[#22140d] shadow-[0_18px_50px_rgba(65,17,29,0.14)]",
    headingFont: "Bebas Neue, Inter, sans-serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%)]",
  },
  autographs: {
    eyebrow: "Ink and provenance",
    heading: "Velvet charcoal, parchment highlights, and signature-led elegance for authenticated memorabilia.",
    description: "Autographs adopt a formal gallery tone with high-contrast cream panels and a more ceremonial headline presence.",
    heroClassName: "bg-[linear-gradient(135deg,#121317_0%,#2a2f37_50%,#ccb58d_100%)] text-[#f5e8d1]",
    pageClassName: "bg-[#e7dcc8] text-[#1f1914]",
    panelClassName: "bg-[#f5ecdc]/92 border-[#75634d]/18",
    accentClassName: "text-[#6a5744]",
    chipClassName: "bg-[#5f5141] text-[#f7ecda] border-[#5f5141]/28",
    borderClassName: "border-[#7d6852]/16",
    cardClassName: "bg-[#efe5d4] border-[#7e6b55]/16 text-[#1e1813] shadow-[0_18px_50px_rgba(36,40,48,0.12)]",
    headingFont: "Playfair Display, Cormorant Garamond, serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_36%)]",
  },
  disney_pins: {
    eyebrow: "Curated park magic",
    heading: "Jewel-tone whimsy with polished enamel energy for sought-after Disney pin drops.",
    description: "Disney Pins stays playful but premium, balancing rich jewel tones with softer cream surfaces and a more whimsical headline voice.",
    heroClassName: "bg-[linear-gradient(135deg,#16294d_0%,#433186_44%,#f39bc4_100%)] text-[#fff1fb]",
    pageClassName: "bg-[#f8d6ea] text-[#26153c]",
    panelClassName: "bg-[#fff1fa]/92 border-[#7c4bb4]/18",
    accentClassName: "text-[#6a3fa6]",
    chipClassName: "bg-[#6f45aa] text-[#fff1fb] border-[#6f45aa]/28",
    borderClassName: "border-[#8b5cc0]/16",
    cardClassName: "bg-[#fde2f0] border-[#8a58bc]/16 text-[#2b1842] shadow-[0_18px_50px_rgba(65,49,130,0.12)]",
    headingFont: "Fredoka, Inter, sans-serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_38%)]",
  },
};

export function getTradebiliaCategoryTheme(slug: string) {
  return tradebiliaCategoryThemes[slug as TradebiliaCategorySlug] ?? null;
}

export function getTradebiliaCategoryLabel(slug: string) {
  return tradebiliaCategories.find(category => category.value === slug)?.label ?? "Category";
}

/**
 * Format a grade value for display.
 * Grading companies use at most 1 decimal place (e.g. 9.4, not 9.40).
 * Strips trailing zeros: "9.40" -> "9.4", "10.0" -> "10", "9.5" -> "9.5".
 * Non-numeric grades (e.g. "NM", "ungraded") are returned unchanged.
 */
export function formatGrade(grade: string | null | undefined): string {
  if (!grade || grade === 'ungraded' || grade === '0') return '';
  const num = parseFloat(grade);
  if (isNaN(num)) return grade; // non-numeric grades returned as-is
  return num % 1 === 0 ? String(num) : parseFloat(num.toFixed(1)).toString();
}

export type TradebiliaBenchmarkNote = {
  eyebrow: string;
  title: string;
  description: string;
};

export type TradebiliaBenchmarkSpotlight = {
  title: string;
  eyebrow: string;
  description: string;
};

export type TradebiliaCategoryBenchmark = {
  quickFilters: string[];
  railGuidance: string;
  heroNotesEyebrow: string;
  heroNotes: string[];
  summaryHighlights: TradebiliaBenchmarkNote[];
  spotlights: TradebiliaBenchmarkSpotlight[];
  emptyStateEyebrow: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  emptyStateBuildoutTitle: string;
  emptyStateBuildoutNotes: string[];
};

export const tradebiliaCategoryBenchmarks: Partial<Record<TradebiliaCategorySlug, TradebiliaCategoryBenchmark>> = {
  sports_cards: {
    quickFilters: ["Rookie cards", "Hall of Fame", "Signed slabs", "Low-pop grails"],
    railGuidance: "Use this left rail as the benchmark pattern: immediate search, player and maker context, then grading-focused controls underneath.",
    heroNotesEyebrow: "Show floor notes",
    heroNotes: [
      "Build this page like a premium convention aisle: strong filtering on the left, clear market story on the right, and enough visual energy to feel alive even in low-inventory moments.",
      "Prioritize rookie cards, vintage icons, and slabbed grails in the first browsing impression.",
      "Use teal, cream, and dark arena shadows as the benchmark language for future category refinement.",
    ],
    summaryHighlights: [
      {
        eyebrow: "Premium lane",
        title: "Highlight rookie cards and low-pop slabs at the top of the browsing experience.",
        description: "Sports Cards should feel like a curated show floor, not a generic grid.",
      },
      {
        eyebrow: "Trust cues",
        title: "Keep grader and collector confidence visible before members decide whether to trade.",
        description: "Confidence markers should support action without overpowering the browse flow.",
      },
      {
        eyebrow: "Template intent",
        title: "Use this tighter summary block as the layout model when we replicate the improvements in other categories.",
        description: "The structure is reusable even though the language remains sports-specific.",
      },
    ],
    spotlights: [
      {
        eyebrow: "Benchmark grail",
        title: "1986-87 Michael Jordan Rookie",
        description: "Anchor the benchmark page with a centerpiece rookie that immediately signals premium card-show quality.",
      },
      {
        eyebrow: "Vintage football",
        title: "1976 Walter Payton Rookie",
        description: "Use a second lane to suggest era-based browsing and reinforce that the page can carry more than one sport cleanly.",
      },
      {
        eyebrow: "Baseball spotlight",
        title: "1980 Rickey Henderson Rookie",
        description: "Give the lower section real visual gravity so the page still feels curated even when live listings are temporarily thin.",
      },
    ],
    emptyStateEyebrow: "Sports Cards exchange standby",
    emptyStateTitle: "No live sports-card listings match these filters yet.",
    emptyStateDescription: "The layout is now prepared to carry a fuller card-show experience. Until more Sports Cards inventory is added, the benchmark page should guide visitors toward other discovery paths instead of feeling empty.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Add featured Sports Cards listings or seeded showcase cards so this benchmark page always demonstrates the intended card-grid rhythm.",
      "Once this structure feels final, mirror its spacing, editorial cards, and stronger empty-state behavior across the other category pages.",
    ],
  },
};

const fallbackCategoryBenchmarks: Partial<Record<TradebiliaCategorySlug, TradebiliaCategoryBenchmark>> = {
  comics: {
    quickFilters: ["Key issues", "Signed copies", "Golden age", "First appearances"],
    railGuidance: "Use the Comics rail to move from issue search into publisher, era, and condition signals without losing the editorial feel.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Frame Comics like a premium convention wall: dramatic hero tone, decisive search, and visible issue context from the first screen.",
      "Keep signed books, keys, and slabbed grails in the first browsing impression.",
      "Let the crimson editorial styling stay specific to Comics even while the shared benchmark structure remains intact.",
    ],
    summaryHighlights: [
      { eyebrow: "Editorial lane", title: "Lead with key issues and collector-significant appearances.", description: "The page should feel curated before it feels crowded." },
      { eyebrow: "Trust cues", title: "Surface grading and signature confidence before trade actions appear.", description: "Collectors should see condition logic early." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to keep the exchange lively even when live inventory is thin.", description: "The layout should still teach visitors what belongs here." },
    ],
    spotlights: [
      { eyebrow: "Silver-age grail", title: "Amazing Fantasy #15", description: "Use an unmistakable marquee issue to anchor the editorial row." },
      { eyebrow: "Mutant milestone", title: "Giant-Size X-Men #1", description: "A second lane keeps the page broader than one franchise or publisher." },
      { eyebrow: "Signed showcase", title: "Signed Spawn #1", description: "Show how autograph-forward inventory can still sit comfortably inside the Comics exchange." },
    ],
    emptyStateEyebrow: "Comics exchange standby",
    emptyStateTitle: "No live comics listings match these filters yet.",
    emptyStateDescription: "The benchmark layout keeps Comics purposeful even while inventory is light, steering visitors toward members and adjacent discovery instead of a dead end.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few showcase comics so the editorial row always demonstrates the page rhythm.",
      "Carry this benchmark structure into the other narrative-heavy categories next.",
    ],
  },
  vintage_toys: {
    quickFilters: ["Boxed legends", "Star Wars", "Mint on card", "1980s favorites"],
    railGuidance: "Use the Vintage Toys rail to move from franchise search into era, maker, and packaging condition without losing the museum-like tone.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Vintage Toys should read like a curated showroom: clean hierarchy, boxed nostalgia, and a stronger sense of franchise-era browsing.",
      "Keep boxed figures, carded toys, and franchise grails near the top of the first impression.",
      "Let the benchmark structure carry the page while the silver-olive palette remains specific to Vintage Toys.",
    ],
    summaryHighlights: [
      { eyebrow: "Showcase lane", title: "Lead with boxed icons and mint-on-card staples.", description: "The page should feel archival but not static." },
      { eyebrow: "Trust cues", title: "Keep package condition, franchise, and completeness visible early.", description: "Toy collectors need confidence before trade intent builds." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to prove depth even when live inventory is limited.", description: "The benchmark should still communicate collector breadth." },
    ],
    spotlights: [
      { eyebrow: "Franchise anchor", title: "Star Wars Kenner Figure", description: "Anchor the page with a universally recognizable vintage toy lane." },
      { eyebrow: "Carded classic", title: "1980s G.I. Joe Mint on Card", description: "Support the boxed-to-carded range in a single browsing row." },
      { eyebrow: "Playroom legend", title: "Vintage Hot Wheels Redline", description: "Give the lower shelf enough visual energy to feel curated rather than sparse." },
    ],
    emptyStateEyebrow: "Vintage Toys exchange standby",
    emptyStateTitle: "No live vintage-toy listings match these filters yet.",
    emptyStateDescription: "This showroom layout is ready for fuller inventory, but until then it should still guide visitors toward sellers, franchise paths, and adjacent category discovery.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few boxed and carded toy examples so the page always feels alive.",
      "Reuse this benchmark rhythm in the remaining nostalgia-forward categories.",
    ],
  },
  video_games: {
    quickFilters: ["Sealed games", "Nintendo", "PlayStation", "Graded copies"],
    railGuidance: "Use the Video Games rail to move from title search into platform, publisher, and condition with an arcade-clean browsing pattern.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Video Games should feel like a premium retro aisle: bright platform energy, quick search, and high-confidence condition cues.",
      "Prioritize sealed games, grail-era franchises, and graded copies in the first impression.",
      "Keep the neon-green contrast unique to Video Games while the page structure follows the benchmark.",
    ],
    summaryHighlights: [
      { eyebrow: "Console lane", title: "Lead with sealed classics and recognizable franchise anchors.", description: "The page should feel energetic before the grid even fills in." },
      { eyebrow: "Trust cues", title: "Surface platform, completeness, and grading context before trade actions.", description: "Collectors need certainty around edition and state." },
      { eyebrow: "Discovery intent", title: "Spotlight cards should demonstrate range across consoles and eras.", description: "The row should teach the visitor what belongs in the exchange." },
    ],
    spotlights: [
      { eyebrow: "Sealed grail", title: "Sealed Super Mario Bros.", description: "Anchor the row with an iconic sealed game benchmark." },
      { eyebrow: "Platform legend", title: "Legend of Zelda Ocarina of Time", description: "A second lane broadens the page beyond one generation." },
      { eyebrow: "Collector showcase", title: "Graded Sonic the Hedgehog", description: "Keep the final spotlight energetic and immediately recognizable." },
    ],
    emptyStateEyebrow: "Video Games exchange standby",
    emptyStateTitle: "No live video-game listings match these filters yet.",
    emptyStateDescription: "The benchmark keeps the arcade-floor energy intact even while inventory is thin, guiding members toward other discovery paths instead of an abrupt stop.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few platform-defining games so the spotlight row always teaches the intended rhythm.",
      "Carry this benchmark structure into the brighter, high-energy categories next.",
    ],
  },
  stamps: {
    quickFilters: ["Classic issues", "Postal history", "Mint sets", "International"],
    railGuidance: "Use the Stamps rail to balance calm archival browsing with quick access to country, era, and condition cues.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Stamps should feel archival and measured: softer motion, precise language, and a clean collector-catalog hierarchy.",
      "Prioritize classic issues, mint sets, and postal-history highlights in the opening view.",
      "Keep the lavender catalog tone unique to Stamps while the benchmark structure remains shared.",
    ],
    summaryHighlights: [
      { eyebrow: "Archive lane", title: "Lead with country-defining issues and mint-set highlights.", description: "The page should feel curated like a formal catalog." },
      { eyebrow: "Trust cues", title: "Keep era, origin, and condition clarity visible before trade intent appears.", description: "Philatelic trust comes from precise detail." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to keep a quiet category visually alive.", description: "The benchmark should avoid flat empty-state browsing." },
    ],
    spotlights: [
      { eyebrow: "Historic anchor", title: "Inverted Jenny Showcase", description: "Lead with a universally recognized philatelic reference point." },
      { eyebrow: "Postal history", title: "Victorian Postal Cover", description: "Use a second lane to signal broader collecting styles." },
      { eyebrow: "Mint-set lane", title: "Classic U.S. Mint Sheet", description: "Give the lower row enough visual gravity for light-inventory moments." },
    ],
    emptyStateEyebrow: "Stamps exchange standby",
    emptyStateTitle: "No live stamp listings match these filters yet.",
    emptyStateDescription: "The benchmark now gives Stamps a more intentional catalog-like rhythm, guiding visitors toward related discovery rather than an empty-feeling stop.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few postal-history and mint examples so the page always communicates category depth.",
      "Use this benchmark as the template for the quieter archival categories.",
    ],
  },
  coins: {
    quickFilters: ["Gold coins", "Morgan dollars", "Ancients", "Certified rarities"],
    railGuidance: "Use the Coins rail to move from denomination search into era, metal, and certification without sacrificing the formal cabinet feel.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Coins should feel formal and high-trust: deep cabinet tones, clear rarity language, and confident certification signals.",
      "Lead with gold, key-date, and certified standout pieces in the first browsing impression.",
      "Keep the navy-and-metallic identity unique to Coins while the benchmark layout pattern stays reusable.",
    ],
    summaryHighlights: [
      { eyebrow: "Cabinet lane", title: "Lead with high-confidence rarities and recognizable denomination anchors.", description: "The page should feel premium before it feels dense." },
      { eyebrow: "Trust cues", title: "Surface certification, metal, and era context before trade actions.", description: "Numismatic browsing depends on provenance and clarity." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to keep the category ceremonial even when inventory is sparse.", description: "The layout should still communicate prestige." },
    ],
    spotlights: [
      { eyebrow: "Gold anchor", title: "Saint-Gaudens Double Eagle", description: "Use a flagship gold piece to anchor the editorial row." },
      { eyebrow: "Silver classic", title: "Morgan Dollar Showcase", description: "A second lane broadens the page into mainstream numismatic collecting." },
      { eyebrow: "Ancient lane", title: "Roman Imperial Coin", description: "Keep the final card distinctive enough to suggest depth across eras." },
    ],
    emptyStateEyebrow: "Coins exchange standby",
    emptyStateTitle: "No live coin listings match these filters yet.",
    emptyStateDescription: "The benchmark gives Coins a stronger auction-cabinet rhythm, helping visitors continue discovery even when the live inventory is temporarily light.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few denomination anchors so the page always demonstrates the intended cabinet rhythm.",
      "Use this benchmark to guide the remaining formal luxury-leaning categories.",
    ],
  },
  pokemon: {
    quickFilters: ["Chase cards", "Vintage holo", "Charizard", "PSA slabs"],
    railGuidance: "Use the Pokemon rail to move from card-name search into set, era, and grading cues with a brighter collector-friendly hierarchy.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Pokemon should feel energetic and bright: recognizable chase-card language, clean search behavior, and playful but premium hierarchy.",
      "Lead with vintage holos, Charizard-class icons, and slabbed chase cards in the opening view.",
      "Keep the cobalt-and-yellow energy specific to Pokemon while the benchmark structure remains shared.",
    ],
    summaryHighlights: [
      { eyebrow: "Chase lane", title: "Lead with recognizable grails and set-defining chase cards.", description: "The page should communicate excitement before it communicates volume." },
      { eyebrow: "Trust cues", title: "Surface set, era, and grading clarity before trade actions appear.", description: "Pokemon collectors move quickly when the signals are clear." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to keep the exchange playful even during low inventory moments.", description: "The structure should feel alive and collector-specific." },
    ],
    spotlights: [
      { eyebrow: "Signature grail", title: "1999 Charizard Holo", description: "Anchor the row with a universally understood Pokemon centerpiece." },
      { eyebrow: "Modern chase", title: "Sun & Moon Alt Art", description: "A second lane keeps the page relevant to newer collectors too." },
      { eyebrow: "Web-era discovery", title: "Edge of Spider-Verse Variant", description: "Use a lively third card to maintain color and discovery energy." },
    ],
    emptyStateEyebrow: "Pokemon exchange standby",
    emptyStateTitle: "No live Pokemon listings match these filters yet.",
    emptyStateDescription: "The benchmark now gives Pokemon a stronger chase-card rhythm, guiding visitors into members and adjacent discovery instead of an abrupt empty result.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few chase-card examples so the page always demonstrates the intended energy.",
      "Carry this benchmark into the other bright, fandom-driven categories next.",
    ],
  },
  movies: {
    quickFilters: ["Posters", "Props", "Signed memorabilia", "Franchise pieces"],
    railGuidance: "Use the Movies rail to move from title search into format, franchise, and authenticity without losing the premiere-night tone.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Movies should feel like a red-carpet catalog: strong cinematic contrast, quick title search, and visible provenance cues.",
      "Lead with posters, certified autographs, and franchise props in the first impression.",
      "Keep the burgundy-and-marquee feel specific to Movies while the benchmark structure remains shared.",
    ],
    summaryHighlights: [
      { eyebrow: "Premiere lane", title: "Lead with posters, props, and certified film memorabilia.", description: "The page should read like a premiere-night catalog." },
      { eyebrow: "Trust cues", title: "Surface format, certification, and franchise confidence before trade actions.", description: "Film memorabilia needs provenance-first browsing." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to keep the category cinematic even when inventory runs light.", description: "The layout should still teach the visitor what belongs here." },
    ],
    spotlights: [
      { eyebrow: "Poster anchor", title: "Star Wars One-Sheet", description: "Lead with a universally recognizable poster format for instant clarity." },
      { eyebrow: "Prop lane", title: "Screen-Used Film Prop", description: "A second lane broadens the category beyond paper collectibles." },
      { eyebrow: "Signed showcase", title: "Signed Franchise Lobby Card", description: "Keep the final spotlight distinctly cinematic and collectible." },
    ],
    emptyStateEyebrow: "Movies exchange standby",
    emptyStateTitle: "No live movie listings match these filters yet.",
    emptyStateDescription: "The benchmark gives Movies a stronger marquee rhythm, helping visitors keep exploring even when the live exchange is quiet.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few poster and prop examples so the page always demonstrates the cinematic layout rhythm.",
      "Use this benchmark in the remaining fandom-forward categories where atmosphere matters most.",
    ],
  },
  autographs: {
    quickFilters: ["Signed photos", "Authenticated", "Hall of Fame", "Premium ink"],
    railGuidance: "Use the Autographs rail to move from signer search into item type, authentication, and era without breaking the formal gallery feel.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Autographs should feel ceremonious and trust-heavy: clear signature provenance, strong item framing, and elegant restraint.",
      "Lead with authenticated signatures, signed photos, and high-recognition names in the opening view.",
      "Keep the charcoal-and-parchment gallery mood unique to Autographs while the benchmark structure remains shared.",
    ],
    summaryHighlights: [
      { eyebrow: "Gallery lane", title: "Lead with authenticated signatures and high-recognition names.", description: "The page should feel elegant before it feels transactional." },
      { eyebrow: "Trust cues", title: "Surface authenticator and item-type confidence before trade actions.", description: "Ink collecting depends heavily on provenance." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to keep the gallery alive even when inventory is limited.", description: "The benchmark should communicate prestige and clarity." },
    ],
    spotlights: [
      { eyebrow: "Signature anchor", title: "Joe Montana Signed Card", description: "Use a clear autograph centerpiece with broad collector recognition." },
      { eyebrow: "Hall-of-fame lane", title: "Walter Payton Signed Photo", description: "A second lane shows how the category spans more than one format." },
      { eyebrow: "Premium ink", title: "Authenticated Celebrity Signature", description: "Keep the final spotlight refined and provenance-driven." },
    ],
    emptyStateEyebrow: "Autographs exchange standby",
    emptyStateTitle: "No live autograph listings match these filters yet.",
    emptyStateDescription: "The benchmark gives Autographs a stronger gallery rhythm, helping visitors continue discovery even during a quiet inventory window.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few authenticated signatures so the page always demonstrates its intended gallery tone.",
      "Carry this benchmark into any remaining provenance-heavy experiences.",
    ],
  },
  disney_pins: {
    quickFilters: ["Park releases", "Limited edition", "Character sets", "Framed displays"],
    railGuidance: "Use the Disney Pins rail to move from character or park search into series, edition, and display context without losing the playful premium tone.",
    heroNotesEyebrow: "Collector notes",
    heroNotes: [
      "Disney Pins should feel playful but collected: brighter storytelling, clean edition cues, and a polished enamel-display rhythm.",
      "Lead with park exclusives, limited editions, and character-driven sets in the first impression.",
      "Keep the jewel-tone whimsy specific to Disney Pins while the benchmark structure remains shared.",
    ],
    summaryHighlights: [
      { eyebrow: "Showcase lane", title: "Lead with limited editions and recognizable character-driven releases.", description: "The page should feel lively without becoming noisy." },
      { eyebrow: "Trust cues", title: "Surface series, park origin, and edition confidence before trade actions.", description: "Pin collectors rely on release clarity and finish cues." },
      { eyebrow: "Discovery intent", title: "Use spotlight cards to keep the page magical even when inventory is light.", description: "The benchmark should preserve delight alongside structure." },
    ],
    spotlights: [
      { eyebrow: "Park anchor", title: "Limited Edition Park Pin", description: "Anchor the row with a polished, instantly legible park-release lane." },
      { eyebrow: "Character set", title: "Character Trio Pin Set", description: "A second lane shows the page can support set-based collecting too." },
      { eyebrow: "Display showcase", title: "Framed Resort Pin Display", description: "Use a final spotlight that feels premium rather than merely playful." },
    ],
    emptyStateEyebrow: "Disney Pins exchange standby",
    emptyStateTitle: "No live Disney Pin listings match these filters yet.",
    emptyStateDescription: "The benchmark now gives Disney Pins a more intentional enamel-display rhythm, guiding visitors toward adjacent discovery instead of a dead end.",
    emptyStateBuildoutTitle: "Suggested next build-outs",
    emptyStateBuildoutNotes: [
      "Seed a few limited-edition and park-release examples so the page always demonstrates the intended rhythm.",
      "Use this benchmark to finish the most playful category experiences with consistent structure.",
    ],
  },
};

export function getTradebiliaCategoryBenchmark(slug: string) {
  return tradebiliaCategoryBenchmarks[slug as TradebiliaCategorySlug]
    ?? fallbackCategoryBenchmarks[slug as TradebiliaCategorySlug]
    ?? null;
}


/**
 * Generate avatar initials from user profile data
 * Prefers firstName and lastName if available, falls back to displayName
 */
export function getAvatarInitials(profile: {
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  displayName?: string | null | undefined;
}): string {
  const { firstName, lastName, displayName } = profile;
  
  // If both firstName and lastName are available, use them
  if (firstName && lastName) {
    return `${firstName[0]?.toUpperCase() ?? ""}${lastName[0]?.toUpperCase() ?? ""}` || "TB";
  }
  
  // If only firstName is available
  if (firstName) {
    return firstName[0]?.toUpperCase() ?? "TB";
  }
  
  // Fall back to displayName
  if (displayName) {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("") || "TB";
  }
  
  return "TB";
}
