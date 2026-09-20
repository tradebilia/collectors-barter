export type TradeAlertThemeKey =
  | "sports-baseball"
  | "sports-football"
  | "sports-basketball"
  | "sports-hockey"
  | "sports-collectibles"
  | "comics"
  | "pokemon"
  | "vintage-toys"
  | "video-games-retro"
  | "video-games-modern"
  | "coins"
  | "stamps"
  | "movies"
  | "music-vinyl"
  | "music-cassette"
  | "music-compact-disc"
  | "music-eight-track"
  | "music-collectibles"
  | "autographs"
  | "disney-pins"
  | "collectibles";

export type TradeAlertThemeAssetKey =
  | "sports-baseball"
  | "sports-football"
  | "sports-basketball"
  | "sports-hockey"
  | "sports-collectibles"
  | "comics"
  | "pokemon"
  | "vintage_toys"
  | "video_games"
  | "coins"
  | "stamps"
  | "movies"
  | "music"
  | "autographs"
  | "disney_pins"
  | "collectibles";

export type TradeAlertTheme = {
  key: TradeAlertThemeKey;
  assetKey: TradeAlertThemeAssetKey;
  label: string;
  primary: string;
  secondary: string;
  glow: string;
  panel: string;
  panelBorder: string;
  motif: "field" | "halftone" | "lattice" | "shelves" | "scanlines" | "rings" | "perforation" | "marquee" | "grooves" | "archive" | "facets" | "grid";
};

export type TradeAlertThemeInput = {
  category?: string | null;
  itemType?: string | null;
  title?: string | null;
  visualHints?: readonly string[] | null;
};

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");

function includesAny(haystack: string, needles: readonly string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function theme(
  key: TradeAlertThemeKey,
  assetKey: TradeAlertThemeAssetKey,
  label: string,
  primary: string,
  secondary: string,
  glow: string,
  motif: TradeAlertTheme["motif"],
): TradeAlertTheme {
  return {
    key,
    assetKey,
    label,
    primary,
    secondary,
    glow,
    panel: "rgba(5, 17, 38, 0.72)",
    panelBorder: "rgba(230, 242, 255, 0.30)",
    motif,
  };
}

const THEME_LIBRARY: Record<TradeAlertThemeKey, TradeAlertTheme> = {
  "sports-baseball": theme("sports-baseball", "sports-baseball", "Baseball collectibles", "#0f4f4a", "#122a51", "#f2c66e", "field"),
  "sports-football": theme("sports-football", "sports-football", "Football collectibles", "#31533b", "#1a2949", "#e5b651", "field"),
  "sports-basketball": theme("sports-basketball", "sports-basketball", "Basketball collectibles", "#8a3b16", "#1b294b", "#f1a33b", "field"),
  "sports-hockey": theme("sports-hockey", "sports-hockey", "Hockey collectibles", "#255b82", "#172a48", "#d4efff", "field"),
  "sports-collectibles": theme("sports-collectibles", "sports-collectibles", "Sports collectibles", "#1e5b63", "#182d52", "#eec66d", "field"),
  comics: theme("comics", "comics", "Comic collectibles", "#661f38", "#251c43", "#f1bd60", "halftone"),
  pokemon: theme("pokemon", "pokemon", "Trading card collectibles", "#1a4a95", "#22245d", "#f0c342", "lattice"),
  "vintage-toys": theme("vintage-toys", "vintage_toys", "Vintage toys", "#40503a", "#253447", "#d5af61", "shelves"),
  "video-games-retro": theme("video-games-retro", "video_games", "Retro video game collectibles", "#083d50", "#192b54", "#71e5c3", "scanlines"),
  "video-games-modern": theme("video-games-modern", "video_games", "Video game collectibles", "#26235e", "#102f4c", "#66d2ff", "scanlines"),
  coins: theme("coins", "coins", "Numismatic collectibles", "#5e4a22", "#1e2c46", "#e7bd66", "rings"),
  stamps: theme("stamps", "stamps", "Philatelic collectibles", "#51426e", "#1f314d", "#cbb2e4", "perforation"),
  movies: theme("movies", "movies", "Physical media collectibles", "#62273b", "#201d41", "#efb258", "marquee"),
  "music-vinyl": theme("music-vinyl", "music", "Vinyl collectibles", "#684025", "#26243c", "#e5b45a", "grooves"),
  "music-cassette": theme("music-cassette", "music", "Cassette collectibles", "#613d55", "#1c3148", "#f2bb74", "grooves"),
  "music-compact-disc": theme("music-compact-disc", "music", "Compact disc collectibles", "#35536b", "#202a52", "#91d8f4", "grooves"),
  "music-eight-track": theme("music-eight-track", "music", "Eight-track collectibles", "#604d28", "#293747", "#e5c072", "grooves"),
  "music-collectibles": theme("music-collectibles", "music", "Music collectibles", "#5c3927", "#232b49", "#e9b462", "grooves"),
  autographs: theme("autographs", "autographs", "Signed memorabilia", "#37313a", "#263143", "#d9be89", "archive"),
  "disney-pins": theme("disney-pins", "disney_pins", "Disney pin collectibles", "#513260", "#1d3157", "#f1a6d2", "facets"),
  collectibles: theme("collectibles", "collectibles", "Collectibles", "#163d62", "#1a2749", "#72c8ed", "grid"),
};

/**
 * Resolves a reproducible visual environment from public listing metadata.
 * Real listing photos remain the only collectible imagery; this resolver only
 * selects background lighting, texture, and palette.
 */
export function resolveTradeAlertTheme(input: TradeAlertThemeInput): TradeAlertTheme {
  const category = normalize(input.category);
  const itemType = normalize(input.itemType);
  const explicitHints = (input.visualHints ?? []).map(normalize).join(" ");
  const descriptors = [normalize(input.title), ...(input.visualHints ?? []).map(normalize)].join(" ");

  if (category === "sports cards" || category === "sports card") {
    // An explicit sport field is more reliable than a brand word in the title
    // (for example, Topps appears across multiple collectible sports).
    if (includesAny(explicitHints, ["baseball", "mlb"])) return THEME_LIBRARY["sports-baseball"];
    if (includesAny(explicitHints, ["football", "nfl"])) return THEME_LIBRARY["sports-football"];
    if (includesAny(explicitHints, ["basketball", "nba"])) return THEME_LIBRARY["sports-basketball"];
    if (includesAny(explicitHints, ["hockey", "nhl", "ice rink"])) return THEME_LIBRARY["sports-hockey"];
    if (includesAny(descriptors, ["baseball", "mlb", "topps", "bowman", "upper deck baseball"])) return THEME_LIBRARY["sports-baseball"];
    if (includesAny(descriptors, ["football", "nfl", "quarterback", "touchdown", "wide receiver"])) return THEME_LIBRARY["sports-football"];
    if (includesAny(descriptors, ["basketball", "nba", "hoops", "slam dunk"])) return THEME_LIBRARY["sports-basketball"];
    if (includesAny(descriptors, ["hockey", "nhl", "ice rink", "puck"])) return THEME_LIBRARY["sports-hockey"];
    return THEME_LIBRARY["sports-collectibles"];
  }
  if (category === "comics") return THEME_LIBRARY.comics;
  if (category === "pokemon") return THEME_LIBRARY.pokemon;
  if (category === "vintage toys") return THEME_LIBRARY["vintage-toys"];
  if (category === "video games") {
    if (includesAny(`${itemType} ${descriptors}`, ["nes", "snes", "atari", "sega", "game boy", "nintendo 64", "retro"])) return THEME_LIBRARY["video-games-retro"];
    return THEME_LIBRARY["video-games-modern"];
  }
  if (category === "coins") return THEME_LIBRARY.coins;
  if (category === "stamps") return THEME_LIBRARY.stamps;
  if (category === "movies") return THEME_LIBRARY.movies;
  if (category === "music") {
    if (itemType.includes("vinyl")) return THEME_LIBRARY["music-vinyl"];
    if (itemType.includes("cassette")) return THEME_LIBRARY["music-cassette"];
    if (itemType.includes("compact disc") || itemType === "cd") return THEME_LIBRARY["music-compact-disc"];
    if (itemType.includes("eight track")) return THEME_LIBRARY["music-eight-track"];
    return THEME_LIBRARY["music-collectibles"];
  }
  if (category === "autographs") return THEME_LIBRARY.autographs;
  if (category === "disney pins") return THEME_LIBRARY["disney-pins"];
  return THEME_LIBRARY.collectibles;
}

export function getTradeAlertThemeAssetKeys(inputs: readonly TradeAlertThemeInput[]): TradeAlertThemeAssetKey[] {
  return Array.from(new Set(inputs.map((input) => resolveTradeAlertTheme(input).assetKey)));
}

/** Public-safe metadata used only to select an abstract setting, never displayed or persisted as a theme. */
export function getTradeAlertVisualHints(input: { category?: string | null; itemType?: string | null; title?: string | null; itemDetails?: unknown }) {
  const category = normalize(input.category);
  const itemType = normalize(input.itemType);
  let details: Record<string, unknown> = {};
  if (typeof input.itemDetails === "string") {
    try {
      const parsed = JSON.parse(input.itemDetails) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) details = parsed as Record<string, unknown>;
    } catch {
      details = {};
    }
  } else if (input.itemDetails && typeof input.itemDetails === "object" && !Array.isArray(input.itemDetails)) {
    details = input.itemDetails as Record<string, unknown>;
  }

  const keys = category === "sports cards"
    ? ["sport", "customSport", "league", "playerName"]
    : category === "vintage toys"
    ? ["brand", "franchise", "theme", "toyName", "toyNameCharacter", "vehicleType", "playsetName"]
    : category === "video games"
    ? ["platform", "consoleName", "accessoryName"]
    : category === "movies"
    ? ["format", "edition", "title", "boxSetName"]
    : category === "music"
    ? ["format", "artist", "releaseTitle", "genre"]
    : category === "autographs"
    ? ["signedItemType", "autographCategory", "signer"]
    : category === "comics"
    ? ["publisher", "comicTitle", "artType"]
    : category === "pokemon"
    ? ["setName", "productType", "customProductType"]
    : category === "coins"
    ? ["country", "denomination", "composition"]
    : category === "stamps"
    ? ["country", "setNameDescription"]
    : category === "disney pins"
    ? ["character", "characterName", "series", "pinName"]
    : [];

  return [input.title, itemType, ...keys.map((key) => details[key])]
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map((value) => String(value).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 8);
}

export const TRADE_ALERT_THEME_LIBRARY = THEME_LIBRARY;
