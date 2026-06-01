export type TradebiliaListingImageInput = {
  title: string;
  category?: string | null;
  primaryPhotoUrl?: string | null;
};

const categoryImageMap: Record<string, string> = {
  comics: "/images/Comicpage2_6d086599.png",
  sports_cards: "/images/sportscards2_50e2e734.png",
  vintage_toys: "/images/Vintagetoys2_b56d7fdc.png",
  video_games: "/images/VideoGames_dd67123d.png",
  stamps: "/images/Stamps1_9eaf705a.png",
  coins: "/images/Coins_353ff538.png",
  pokemon: "/images/Pokemon_095946ab.png",
  movies: "/images/Movies2_d17cc5ad.png",
  autographs: "/images/Autographs_5775ffb1.png",
  disney_pins: "/images/Disney_e4ae94b5.png",
};

const keywordImageMap: Array<{ keywords: string[]; imageUrl: string }> = [
  {
    keywords: ["michael jordan", "jordan rookie"],
    imageUrl: "/images/michael-jordan-rookie_4440f620.jpg",
  },
  {
    keywords: ["walter payton"],
    imageUrl: "/images/walter-payton-rookie_9fa05678.png",
  },
  {
    keywords: ["rickey henderson"],
    imageUrl: "/images/rickey-henderson-rookie_49b0e3a1.png",
  },
  {
    keywords: ["joe montana"],
    imageUrl: "/images/1981JoeMontana_f9fb9609.png",
  },
  {
    keywords: ["martin brodeur"],
    imageUrl: "/images/1990MartinBrodeur_b8430777.png",
  },
  {
    keywords: ["charizard holo", "charizard - holo", "1999 charizard"],
    imageUrl: "/images/1999 Charizard - Holo_8a01b3b9.png",
  },
  {
    keywords: ["charizard v", "2022 charizard"],
    imageUrl: "/images/2022 Charizard V_ca4f6c17.png",
  },
  {
    keywords: ["sun & moon", "sun and moon"],
    imageUrl: "/images/2019 Sun & Moon_fd3c941d.png",
  },
  {
    keywords: ["spider-verse", "spider verse", "edge of spider-verse"],
    imageUrl: "/images/Edge of Spider-Verse 2_29f507ed.png",
  },
  {
    keywords: ["star wars"],
    imageUrl: "/images/Star Wars 1_6bc27ee5.png",
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
