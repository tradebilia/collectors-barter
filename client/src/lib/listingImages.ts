export type TradebiliaListingImageInput = {
  title: string;
  category?: string | null;
  primaryPhotoUrl?: string | null;
};

const categoryImageMap: Record<string, string> = {
  auto: "https://assets.tradebilia.com/AutoBackground_77c0fc6a.png",
  comics: "https://assets.tradebilia.com/ComicsBackground_798a970b.webp",
  sports_cards: "https://assets.tradebilia.com/SportsCardBackground_e2e711d1.webp",
  vintage_toys: "https://assets.tradebilia.com/VintageToysBackground_a95e7b30.png",
  video_games: "https://assets.tradebilia.com/VideoGamesBackground_f9315289.webp",
  stamps: "https://assets.tradebilia.com/StampsBackground_1bb5af50.png",
  coins: "https://assets.tradebilia.com/CoinsBackground_8f7db775.png",
  pokemon: "https://assets.tradebilia.com/PokemonBackground_d2f9e795.webp",
  movies: "https://assets.tradebilia.com/MoviesBackground_603eb7a8.png",
  autographs: "https://assets.tradebilia.com/AutoBackground_77c0fc6a.png",
  disney_pins: "https://assets.tradebilia.com/DisneyPinsBackground_68498869.webp",
};

// NOTE: Keyword-based image mappings have been disabled because the /images/ paths
// are no longer available. All listings will fall back to category images or the
// no-image placeholder.
const keywordImageMap: Array<{ keywords: string[]; imageUrl: string }> = [];

function normalizeListingImageUrl(url: string) {
  if (url.startsWith('http')) return url;
  // Ensure internal paths start with / and handle spaces
  const path = url.startsWith('/') ? url : `/${url}`;
  const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/').replace(/%2F/g, '/');
  // Convert relative paths to absolute URLs using the current origin
  if (encodedPath.startsWith('/')) {
    return `${window.location.origin}${encodedPath}`;
  }
  return encodedPath;
}

export function resolveTradebiliaListingImage(input: TradebiliaListingImageInput) {
  const titleLower = input.title.toLowerCase();
  
  // 1. Check for known broken seed images in the URL
  const isBrokenSeedImage = input.primaryPhotoUrl && (
    input.primaryPhotoUrl.includes('1996-Kobe-Bryant')
  );

  if (input.primaryPhotoUrl && !isBrokenSeedImage) {
    return normalizeListingImageUrl(input.primaryPhotoUrl);
  }

  // 2. Keyword-based fallback (disabled - use category fallback instead)
  // Previously used /images/ paths which are no longer available
  const matched = keywordImageMap.find(entry => 
    entry.keywords.some(keyword => titleLower.includes(keyword))
  );
  
  if (matched) {
    console.log(`[ImageResolver] Matched keyword for "${input.title}": ${matched.imageUrl}`);
    return normalizeListingImageUrl(matched.imageUrl);
  }

  // 3. Try to match by category
  if (input.category && categoryImageMap[input.category]) {
    return normalizeListingImageUrl(categoryImageMap[input.category]);
  }

  // 4. Return a "No Image" placeholder if no match found
  console.log(`[ImageResolver] No image found for "${input.title}" (category: ${input.category})`);
  return "https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/no-image-placeholder-HPQQaNUbyBPHRn2iPDGbTL.webp";
}
