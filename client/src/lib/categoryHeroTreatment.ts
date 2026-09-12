export interface CategoryHeroTreatment {
  backgroundFilter: string;
  backgroundRepeat: 'repeat' | 'no-repeat';
  backgroundPosition: string;
  overlayClassName: string;
}

export function getCategoryHeroTreatment(slug?: string): CategoryHeroTreatment {
  const normalizedSlug = slug ?? '';
  return {
    backgroundFilter:
      normalizedSlug === 'video_games' ||
      normalizedSlug === 'coins' ||
      normalizedSlug === 'stamps' ||
      normalizedSlug === 'vintage_toys' ||
      normalizedSlug === 'autographs' ||
      normalizedSlug === 'movies' ||
      normalizedSlug === 'comics' ||
      normalizedSlug === 'pokemon' ||
      normalizedSlug === 'disney_pins'
        ? 'contrast(1.2) saturate(1.1)'
        : 'none',
    backgroundRepeat:
      normalizedSlug === 'movies' ||
      normalizedSlug === 'comics' ||
      normalizedSlug === 'pokemon' ||
      normalizedSlug === 'video_games' ||
      normalizedSlug === 'disney_pins'
        ? 'no-repeat'
        : 'repeat',
    backgroundPosition: normalizedSlug === 'movies' ? 'center top' : 'center',
    overlayClassName: normalizedSlug === 'movies' ? 'bg-black/10' : 'bg-black/30',
  };
}
