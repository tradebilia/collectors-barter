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
    keywords: ["mark mcgwire"],
    imageUrl: "/images/1985-Mark-McGwire_576b8749.jpg",
  },
  {
    keywords: ["martin brodeur"],
    imageUrl: "/images/1990 Martin Brodeur.png",
  },
  {
    keywords: ["charizard holo", "charizard - holo", "1999 charizard", "pokemon charizard"],
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
  {
    keywords: ["ken griffey jr", "griffey rookie"],
    imageUrl: "/images/1989-Ken-Griffey-Jr.jpg",
  },
  {
    keywords: ["wayne gretzky", "gretzky rookie"],
    imageUrl: "/images/1979 Wayne Gretzky Rookie.jpg",
  },
  {
    keywords: ["kobe bryant", "kobe rookie"],
    imageUrl: "/images/1986-87 Michael Jordan.jpg",
  },
];

function normalizeListingImageUrl(url: string) {
  if (url.startsWith('http')) return url;
  // Ensure internal paths start with / and handle spaces
  const path = url.startsWith('/') ? url : `/${url}`;
  return path.split('/').map(part => encodeURIComponent(part)).join('/').replace(/%2F/g, '/');
}

export function resolveTradebiliaListingImage(input: TradebiliaListingImageInput) {
  const titleLower = input.title.toLowerCase();
  
  // 1. Check for known broken seed images in the URL
  const isBrokenSeedImage = input.primaryPhotoUrl && (
    input.primaryPhotoUrl.includes('1996-Kobe-Bryant') || 
    input.primaryPhotoUrl.includes('1979-Wayne-Gretzky') ||
    input.primaryPhotoUrl.includes('1985-Mark-McGwire')
  );

  if (input.primaryPhotoUrl && !isBrokenSeedImage) {
    return normalizeListingImageUrl(input.primaryPhotoUrl);
  }

  // 2. Keyword-based fallback for seed listings or broken URLs
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
  return "https://d2xsxph8kpxj0f.cloudfront.net/310519663570115757/nAx6ATm2BH4G46yabuMZgM/no-image-placeholder-HPQQaNUbyBPHRn2iPDGbTL.webp";
}
