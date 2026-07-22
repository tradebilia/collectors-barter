import { Link, useRoute } from "wouter";
import { tradebiliaCategories } from "@/lib/tradebilia";

// Map each category to its hero title logo image
const categoryTitleImages: Record<string, string> = {
  comics: "/images/ComicsTitle.webp",
  sports_cards: "/images/SportsCardsTitle.webp",
  vintage_toys: "/images/VintageToysTitle.webp",
  video_games: "/images/VideoGamesTitle.webp",
  stamps: "/images/StampsTitle.webp",
  coins: "/images/CoinsTitle.webp",
  pokemon: "/images/PokemonTitle.webp",
  movies: "/images/MoviesTitle.webp",
  autographs: "/images/AutographsTitle.webp",
  disney_pins: "/images/DisneyPinsTitle.webp",
};

export function CategoryBar() {
  const [, params] = useRoute("/category/:slug");
  const currentSlug = params?.slug;

  // Determine if we're on the home page
  const isHomePage = useRoute("/")[0];

  return (
    <nav className="relative z-0 border-b border-white/10 bg-black">
      <div className="flex w-full overflow-x-auto">
        {/* Home tab — plain text as requested */}
        <Link
          href="/"
          className={`flex-1 border-r border-white/10 px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[1.1rem] whitespace-nowrap ${
            isHomePage === true ? "bg-white text-slate-950" : "text-white"
          }`}
        >
          Home
        </Link>

        {/* Category tabs — use title logo images */}
        {tradebiliaCategories.map(category => {
          const isActive = category.value === currentSlug;
          const titleImg = categoryTitleImages[category.value];
          return (
            <Link
              key={category.value}
              href={`/category/${category.value}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={`flex-1 border-r border-white/10 px-3 py-2 flex items-center justify-center transition hover:bg-white/10 whitespace-nowrap ${
                isActive ? "bg-white" : ""
              }`}
            >
              {titleImg ? (
                <img
                  src={titleImg}
                  alt={category.label}
                  className="h-16 w-auto object-contain max-w-[180px]"
                />
              ) : (
                <span
                  className={`text-sm font-semibold uppercase tracking-[0.16em] lg:text-[1.1rem] ${
                    isActive ? "text-slate-950" : "text-white"
                  }`}
                >
                  {category.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
