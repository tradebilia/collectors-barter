const RANKING_TITLE_URLS: Record<string, string> = {
  "Most Viewed": "/manus-storage/MostViewed_4b1eb573.svg",
  "Most Favorited": "/manus-storage/MostRequested_388aaf8b.svg",
  "Top Rated Traders": "/manus-storage/TopRatedTraders_dde137be.svg",
  "Highest Trade Values": "/manus-storage/HighestTradeValue_804dd20b.svg",
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
        backgroundImage: "url(/manus-storage/Background_23084d14.jpg)",
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
