import React from 'react';

interface CategoryHeroSectionProps {
  slug?: string;
  theme: {
    eyebrow: string;
    pageClassName: string;
    borderClassName: string;
    heroClassName: string;
    textureClassName: string;
    accentClassName: string;
    panelClassName: string;
    headingFont: string;
  };
  categoryLabel: string;
  titleImageUrl: string;
  backgroundImageUrl: string;
  listings: any[];
  feedQuery: any;
  getCategoryFont: (slug?: string) => string;
}

export function CategoryHeroSection({
  slug,
  theme,
  categoryLabel,
  titleImageUrl,
  backgroundImageUrl,
  listings,
  feedQuery,
  getCategoryFont,
}: CategoryHeroSectionProps) {
  // Independent positioning for each element
  // All elements except title are positioned absolutely at fixed coordinates
  // This allows them to stay in the same position across all category pages
  
  const isSportsCardsPage = slug === 'sports_cards';
  const showEyebrow = slug !== 'pokemon';
  const backgroundFilter = (slug === 'video_games' || slug === 'coins' || slug === 'stamps' || slug === 'vintage_toys' || slug === 'autographs' || slug === 'movies' || slug === 'comics' || slug === 'pokemon' || slug === 'disney_pins') ? 'contrast(1.2) saturate(1.1)' : 'none';
  const backgroundRepeat = (slug === 'movies' || slug === 'comics' || slug === 'pokemon' || slug === 'video_games' || slug === 'disney_pins') ? 'no-repeat' : 'repeat';
  const backgroundPosition = slug === 'movies' ? 'center top' : 'center';
  const overlayOpacity = slug === 'movies' ? 'bg-black/10' : 'bg-black/30';

  return (
    <header className={`relative overflow-hidden border-b ${theme.borderClassName} ${theme.heroClassName}`} style={{ minHeight: '400px', position: 'relative' }}>
      {/* Background layer */}
      <div className={`absolute inset-0 ${theme.textureClassName}`} style={{
        backgroundImage: backgroundImageUrl,
        backgroundSize: 'cover',
        backgroundPosition: backgroundPosition,
        backgroundAttachment: 'scroll',
        backgroundRepeat: backgroundRepeat,
        filter: backgroundFilter,
        zIndex: 1,
      }}>
        {/* Overlay */}
        <div className={`absolute inset-0 ${overlayOpacity}`}></div>
      </div>

      {/* Container for all elements - position relative so absolute children work */}
      <div className="container relative h-full" style={{ position: 'relative', zIndex: 10, minHeight: '400px' }}>
        {/* Eyebrow text - independent positioning */}
        {showEyebrow && (
          <p className="absolute text-xs font-semibold uppercase tracking-[0.36em] opacity-80"
            style={{
              fontFamily: getCategoryFont(slug),
              color: 'white',
              left: '50%',
              transform: 'translateX(-50%)',
              top: '24px',
              zIndex: 20,
            }}>
            {theme.eyebrow}
          </p>
        )}

        {/* Title image - independent positioning (can vary per category) */}
        <div className="absolute"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: slug === 'pokemon' || slug === 'disney_pins' ? '80px' : '60px',
            zIndex: 30,
            maxWidth: '90%',
          }}>
          <img
            src={titleImageUrl}
            alt={categoryLabel}
            style={{
              maxHeight: '300px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        {/* Divider line - independent positioning */}
        <div className="absolute bg-white/50"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: slug === 'pokemon' || slug === 'disney_pins' ? '380px' : '360px',
            width: 'calc(100% - 32px)',
            maxWidth: '600px',
            height: '1px',
            zIndex: 20,
          }}>
        </div>

        {/* EXCHANGE text - independent positioning */}
        <p className="absolute text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-[0.1em]"
          style={{
            fontFamily: getCategoryFont(slug),
            fontStyle: 'italic',
            color: '#F4D03F',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            left: '50%',
            transform: 'translateX(-50%)',
            top: slug === 'pokemon' || slug === 'disney_pins' ? '400px' : '380px',
            zIndex: 20,
            lineHeight: '1',
          }}>
          EXCHANGE
        </p>

        {/* Statistics bubbles - independent positioning */}
        <div className="absolute flex justify-center gap-6 flex-wrap"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '20px',
            width: '100%',
            maxWidth: '800px',
            zIndex: 20,
            padding: '0 16px',
          }}>
          {[
            ['Listings', String(listings.length)],
            ['Collectors', String(feedQuery.data?.highlights.activeCollectors ?? 0)],
            ['Completed Trades', String(feedQuery.data?.highlights.completedTrades ?? 0)],
            ['Total Market Value', '$0'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1rem] border border-white/15 bg-black/15 px-3 py-2 text-center backdrop-blur-sm">
              <p className="text-[0.65rem] uppercase tracking-[0.3em]" style={{ color: '#ffffff', fontWeight: 600 }}>{label}</p>
              <p className="mt-1 text-sm font-bold" style={{ color: '#ffffff' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
