export const TRADEBILIA_LOGO_URL = "/manus-storage/Tradebilialogo_886a61b7.webp";

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
  { value: "all", label: "All Conditions" },
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
    eyebrow: "Hall-of-fame cardboard",
    heading: "Card-show clarity with premium slab energy and arena-blue contrast.",
    description: "The Sports Cards exchange leans into teal glass, cream card-show surfaces, and condensed athletic headlines inspired by the uploaded reference.",
    heroClassName: "bg-[linear-gradient(135deg,#0f3b43_0%,#27758b_42%,#102732_100%)] text-[#fff4e0]",
    pageClassName: "bg-[linear-gradient(180deg,#0d2c36_0%,#16414a_14%,#ead6ac_14%,#ead6ac_100%)] text-[#1a1814]",
    panelClassName: "bg-[#f6e5bf]/95 border-[#3c6f77]/25",
    accentClassName: "text-[#0e5766]",
    chipClassName: "bg-[#0f5563] text-[#fff1d2] border-[#0f5563]/40",
    borderClassName: "border-[#345c63]/20",
    cardClassName: "bg-[#f4dfb4] border-[#2f6670]/20 text-[#19150d] shadow-[0_18px_50px_rgba(20,39,47,0.16)]",
    headingFont: "Oswald, Inter, sans-serif",
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
    headingFont: "Bebas Neue, Inter, sans-serif",
    textureClassName: "bg-[radial-gradient(circle_at_top,rgba(104,220,67,0.22),transparent_38%)]",
  },
  stamps: {
    eyebrow: "Philatelic archives",
    heading: "Lavender paper, formal lettering, and archival calm for rare postal treasures.",
    description: "The Stamps exchange uses a soft violet field, restrained filter rail, and catalog-like rhythm influenced by the uploaded philatelic reference.",
    heroClassName: "bg-[linear-gradient(135deg,#39204d_0%,#53306d_60%,#b79ccc_100%)] text-[#f3e6ff]",
    pageClassName: "bg-[linear-gradient(180deg,#382148_0%,#51306c_14%,#d9cadf_14%,#d9cadf_100%)] text-[#1e1725]",
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
    pageClassName: "bg-[linear-gradient(180deg,#121928_0%,#20283d_14%,#e9decb_14%,#e9decb_100%)] text-[#1d1712]",
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
    pageClassName: "bg-[linear-gradient(180deg,#18408d_0%,#2c69d1_14%,#f5d84a_14%,#f5d84a_100%)] text-[#1f2240]",
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
    pageClassName: "bg-[linear-gradient(180deg,#23080f_0%,#47111d_14%,#ead7bf_14%,#ead7bf_100%)] text-[#24150f]",
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
    pageClassName: "bg-[linear-gradient(180deg,#111216_0%,#242830_14%,#e7dcc8_14%,#e7dcc8_100%)] text-[#1f1914]",
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
    pageClassName: "bg-[linear-gradient(180deg,#16284a_0%,#413182_14%,#f8d6ea_14%,#f8d6ea_100%)] text-[#26153c]",
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

export function getTradebiliaCategoryBenchmark(slug: string) {
  return tradebiliaCategoryBenchmarks[slug as TradebiliaCategorySlug] ?? null;
}
