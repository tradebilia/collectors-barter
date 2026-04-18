export type TradebiliaListingImageInput = {
  title: string;
  category?: string | null;
  primaryPhotoUrl?: string | null;
};

const categoryImageMap: Record<string, string> = {
  comics: "/manus-storage/Comicpage2_6d086599.png",
  sports_cards: "/manus-storage/sportscards2_50e2e734.png",
  vintage_toys: "/manus-storage/Vintagetoys2_b56d7fdc.png",
  video_games: "/manus-storage/VideoGames_dd67123d.png",
  stamps: "/manus-storage/Stamps1_9eaf705a.png",
  coins: "/manus-storage/Coins_353ff538.png",
  pokemon: "/manus-storage/Pokemon_095946ab.png",
  movies: "/manus-storage/Movies2_d17cc5ad.png",
  autographs: "/manus-storage/Autographs_5775ffb1.png",
  disney_pins: "/manus-storage/Disney_e4ae94b5.png",
};

const keywordImageMap: Array<{ keywords: string[]; imageUrl: string }> = [
  {
    keywords: ["michael jordan", "jordan rookie"],
    imageUrl: "/manus-storage/1986-87 Michael Jordan_a9dcf0a5.jpg",
  },
  {
    keywords: ["walter payton"],
    imageUrl: "/manus-storage/1976 Walter Payton_0773dd5e.png",
  },
  {
    keywords: ["rickey henderson"],
    imageUrl: "/manus-storage/1980 Rickey Henderson_b1d52546.png",
  },
  {
    keywords: ["joe montana"],
    imageUrl: "/manus-storage/1981 Joe Montana_38be360b.png",
  },
  {
    keywords: ["martin brodeur"],
    imageUrl: "/manus-storage/1990 Martin Brodeur_2168abc2.png",
  },
  {
    keywords: ["charizard holo", "charizard - holo", "1999 charizard"],
    imageUrl: "/manus-storage/1999 Charizard - Holo_8a01b3b9.png",
  },
  {
    keywords: ["charizard v", "2022 charizard"],
    imageUrl: "/manus-storage/2022 Charizard V_ca4f6c17.png",
  },
  {
    keywords: ["sun & moon", "sun and moon"],
    imageUrl: "/manus-storage/2019 Sun & Moon_fd3c941d.png",
  },
  {
    keywords: ["spider-verse", "spider verse", "edge of spider-verse"],
    imageUrl: "/manus-storage/Edge of Spider-Verse 2_29f507ed.png",
  },
  {
    keywords: ["star wars"],
    imageUrl: "/manus-storage/Star Wars 1_6bc27ee5.png",
  },
  {
    keywords: ["baseball", "sports card", "card pack"],
    imageUrl: "/manus-storage/sportscards2_50e2e734.png",
  },
  {
    keywords: ["transformers", "action figure", "barbie", "toy"],
    imageUrl: "/manus-storage/Vintagetoys2_b56d7fdc.png",
  },
  {
    keywords: ["comic", "spider-man", "spider man", "issue"],
    imageUrl: "/manus-storage/Comicpage2_6d086599.png",
  },
  {
    keywords: ["pokemon", "pikachu"],
    imageUrl: "/manus-storage/Pokemon_095946ab.png",
  },
  {
    keywords: ["coin"],
    imageUrl: "/manus-storage/Coins_353ff538.png",
  },
  {
    keywords: ["autograph", "signed"],
    imageUrl: "/manus-storage/Autographs_5775ffb1.png",
  },
  {
    keywords: ["pin", "disney"],
    imageUrl: "/manus-storage/Disney_e4ae94b5.png",
  },
  {
    keywords: ["movie", "poster", "prop"],
    imageUrl: "/manus-storage/Movies2_d17cc5ad.png",
  },
  {
    keywords: ["stamp", "postage"],
    imageUrl: "/manus-storage/Stamps1_9eaf705a.png",
  },
  {
    keywords: ["game", "cartridge", "sealed"],
    imageUrl: "/manus-storage/VideoGames_dd67123d.png",
  },
];

function normalizeListingImageUrl(url: string) {
  if (url.startsWith("/manus-storage/")) {
    return encodeURI(url);
  }

  return url;
}

export function resolveTradebiliaListingImage(input: TradebiliaListingImageInput) {
  if (input.primaryPhotoUrl) return normalizeListingImageUrl(input.primaryPhotoUrl);

  const title = input.title.toLowerCase();
  const keywordMatch = keywordImageMap.find(entry => entry.keywords.some(keyword => title.includes(keyword)));
  if (keywordMatch) return normalizeListingImageUrl(keywordMatch.imageUrl);

  if (input.category && categoryImageMap[input.category]) {
    return normalizeListingImageUrl(categoryImageMap[input.category]);
  }

  return normalizeListingImageUrl("/manus-storage/Comicpage2_6d086599.png");
}
