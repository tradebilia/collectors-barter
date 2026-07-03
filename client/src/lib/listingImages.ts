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
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/1986-87%20Michael%20Jordan.jpg",
  },
  {
    keywords: ["walter payton"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/1976%20Walter%20Payton.png",
  },
  {
    keywords: ["rickey henderson"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/1980%20Rickey%20Henderson.png",
  },
  {
    keywords: ["joe montana"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/1981%20Joe%20Montana.png",
  },
  {
    keywords: ["martin brodeur"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/1990%20Martin%20Brodeur.png",
  },
  {
    keywords: ["charizard holo", "charizard - holo", "1999 charizard"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/1999%20Charizard%20-%20Holo.png",
  },
  {
    keywords: ["charizard v", "2022 charizard"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/2022%20Charizard%20V.png",
  },
  {
    keywords: ["sun & moon", "sun and moon"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/2019%20Sun%20&%20Moon.png",
  },
  {
    keywords: ["spider-verse", "spider verse", "edge of spider-verse"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Edge%20of%20Spider-Verse%202.png",
  },
  {
    keywords: ["star wars"],
    imageUrl: "https://raw.githubusercontent.com/tradebilia/collectors-barter/main/assets/images/Star%20Wars%201.png",
  },
];

function normalizeListingImageUrl(url: string) {
  return encodeURI(url);
}

export function resolveTradebiliaListingImage(input: TradebiliaListingImageInput) {
  // 1. If user-uploaded image is available, use it
  if (input.primaryPhotoUrl) return normalizeListingImageUrl(input.primaryPhotoUrl);

  // 2. Try to match by keyword
  const titleLower = input.title.toLowerCase();
  const matched = keywordImageMap.find(entry => 
    entry.keywords.some(keyword => titleLower.includes(keyword))
  );
  if (matched) return normalizeListingImageUrl(matched.imageUrl);

  // 3. Try to match by category
  if (input.category && categoryImageMap[input.category]) {
    return normalizeListingImageUrl(categoryImageMap[input.category]);
  }

  // 4. Return a "No Image" placeholder if no match found
  return normalizeListingImageUrl("https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/no-image-placeholder-HPQQaNUbyBPHRn2iPDGbTL.webp");
}
