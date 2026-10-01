const RANKING_TITLE_URLS: Record<string, string> = {
  "Most Viewed": "/manus-storage/MostViewed(1)_bbadfec8.svg",
  "Most Favorited": "/manus-storage/MostRequested(1)_f9f0340b.svg",
  "Top Rated Traders": "/manus-storage/TopRatedTraders(1)_b55576e3.svg",
  "Highest Trade Values": "/manus-storage/HighestTradeValue(1)_e554daf6.svg",
};

interface RankingPageHeroProps {
  title: string;
  subtitle?: string;
}

export function RankingPageHero({ title }: RankingPageHeroProps) {
  const titleUrl = RANKING_TITLE_URLS[title];

  return (
    <section
      className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden text-white"
      style={{
        backgroundImage: "url(/manus-storage/Background3_30307310.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 lg:h-80">
        {titleUrl ? (
          <img src={titleUrl} alt={title} className="h-auto w-full max-w-5xl object-contain" />
        ) : (
          <h1 className="text-center text-5xl font-black tracking-wide sm:text-6xl">{title}</h1>
        )}
      </div>
    </section>
  );
}
