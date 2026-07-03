export type TradebiliaListingImageInput = {
  title: string;
  category?: string | null;
  primaryPhotoUrl?: string | null;
};

const categoryImageMap: Record<string, string> = {
  comics: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/client/public/images/comics-background-YZiiH2cyV8YJx6GFQj4PKC.webp",
  sports_cards: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/client/public/images/Sportscardwallpaper.webp",
  vintage_toys: "/images/VintageToysBackground.png",
  video_games: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/client/public/images/video-games-background-kyx4vVUqTYCMC3kMbtokYU.webp",
  stamps: "/images/StampsBackground.png",
  coins: "/images/CoinsBackground.png",
  pokemon: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/client/public/images/pokemon-background-J6h7Mte6BSYA3GfQ4vtdFj.webp",
  movies: "/images/VHSBackground.png",
  autographs: "/images/AutoBackground.png",
  disney_pins: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/client/public/images/disney-pins-background-F6yUvFLVrhmnaWk6GsFMZ8.webp",
};

const keywordImageMap: Array<{ keywords: string[]; imageUrl: string }> = [
  {
    keywords: ["michael jordan", "jordan rookie"],
    imageUrl: "/images/1986-87 Michael Jordan.jpg",
  },
  {
    keywords: ["walter payton"],
    imageUrl: "/images/1976 Walter Payton.png",
  },
  {
    keywords: ["rickey henderson"],
    imageUrl: "/images/1980 Rickey Henderson.png",
  },
  {
    keywords: ["joe montana"],
    imageUrl: "/images/1981 Joe Montana.png",
  },
  {
    keywords: ["martin brodeur"],
    imageUrl: "/images/1990 Martin Brodeur.png",
  },
  {
    keywords: ["charizard holo", "charizard - holo", "1999 charizard"],
    imageUrl: "/images/1999 Charizard - Holo.png",
  },
  {
    keywords: ["charizard v", "2022 charizard"],
    imageUrl: "/images/2022 Charizard V.png",
  },
  {
    keywords: ["sun & moon", "sun and moon"],
    imageUrl: "/images/2019 Sun & Moon.png",
  },
  {
    keywords: ["spider-verse", "spider verse", "edge of spider-verse"],
    imageUrl: "/images/Edge of Spider-Verse 2.png",
  },
  {
    keywords: ["star wars"],
    imageUrl: "/images/Star Wars 1.png",
  },
];

function normalizeListingImageUrl(url: string) {
  return encodeURI(url);
}

export function resolveTradebiliaListingImage(input: TradebiliaListingImageInput) {
  // 1. Try to match by keyword first to handle cases where uploaded images might be broken
  // but we have a high-quality local asset for the item
  const titleLower = input.title.toLowerCase();
  const matched = keywordImageMap.find(entry => 
    entry.keywords.some(keyword => titleLower.includes(keyword))
  );
  if (matched) return normalizeListingImageUrl(matched.imageUrl);

  // 2. If no keyword match, use user-uploaded image if available
  if (input.primaryPhotoUrl) return normalizeListingImageUrl(input.primaryPhotoUrl);

  // 3. Try to match by category
  if (input.category && categoryImageMap[input.category]) {
    return normalizeListingImageUrl(categoryImageMap[input.category]);
  }

  // 4. Return a "No Image" placeholder if no match found
  return normalizeListingImageUrl("https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/no-image-placeholder-HPQQaNUbyBPHRn2iPDGbTL.webp");
}
