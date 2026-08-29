import { Link, useRoute } from "wouter";
import { BookOpen, Clapperboard, Coins, Gamepad2, Grid3X3, House, LucideIcon, Medal, Package, PenLine, Search, Sparkles, Stamp } from "lucide-react";
import type { SVGProps } from "react";
import { tradebiliaCategories } from "@/lib/tradebilia";

function MickeyEarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="7.5" cy="7.5" r="4.25" />
      <circle cx="16.5" cy="7.5" r="4.25" />
      <circle cx="12" cy="14" r="6.25" fill="none" />
    </svg>
  );
}

function PostageStampIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 3.5h14l.75 1.75L19 7l.75 1.75L19 10.5l.75 1.75L19 14l.75 1.75L19 17.5l.75 1.75L19 20.5H5l-.75-1.75L5 17l-.75-1.75L5 13.5l-.75-1.75L5 10l-.75-1.75L5 6.5l-.75-1.75L5 3.5Z" />
      <rect x="8" y="7" width="8" height="10" rx="0.75" />
      <path d="M10 9h4M10 11h4M10 13h2" />
    </svg>
  );
}

function PokemonSilhouetteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.1 7.6 3.3 2.2l.2 7.1C2.6 10.7 2 12.5 2 14.4 2 18.7 6.1 22 12 22s10-3.3 10-7.6c0-1.9-.6-3.7-1.5-5.1l.2-7.1-3.8 5.4A9.5 9.5 0 0 0 12 6.2a9.5 9.5 0 0 0-4.9 1.4Z" />
      <path d="m3.1 15.4-2-1.2 1.1 2.1-1.1 1.8 3.2-.4M20.9 15.4l2-1.2-1.1 2.1 1.1 1.8-3.2-.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8.5" cy="12.5" r=".75" fill="white" stroke="none" />
      <circle cx="15.5" cy="12.5" r=".75" fill="white" stroke="none" />
    </svg>
  );
}

const categoryIcons: Record<string, LucideIcon | typeof PostageStampIcon | typeof PokemonSilhouetteIcon> = {
  comics: BookOpen,
  sports_cards: Medal,
  vintage_toys: Package,
  video_games: Gamepad2,
  stamps: PostageStampIcon,
  coins: Coins,
  pokemon: PokemonSilhouetteIcon,
  movies: Clapperboard,
  autographs: PenLine,
  disney_pins: MickeyEarsIcon,
};

function CategoryIcon({ slug }: { slug: string }) {
  const Icon = categoryIcons[slug] ?? Grid3X3;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

export function CategoryBar() {
  const [, params] = useRoute("/category/:slug");
  const currentSlug = params?.slug;
  const isHomePage = useRoute("/")[0];
  const isGlobalSearchPage = useRoute("/search")[0];

  const linkClass = (active: boolean) => `flex min-w-[86px] flex-1 flex-col items-center justify-center gap-1 border-r border-white/10 px-2 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-colors hover:bg-[#33236f] sm:min-w-[96px] sm:text-[0.68rem] lg:min-w-0 lg:text-[0.7rem] ${active ? "bg-[#3b267c] text-white shadow-[inset_0_-2px_0_#b98cff]" : "text-white/85"}`;

  return (
    <nav className="relative z-0 border-b border-white/15 bg-[#0b102d] shadow-[0_4px_14px_rgba(8,10,36,0.24)]" aria-label="Collection categories">
      <div className="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link href="/" className={linkClass(isHomePage === true)}>
          <House className="h-4 w-4" aria-hidden="true" />
          <span>Home</span>
        </Link>
        <Link
          href="/search"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={linkClass(isGlobalSearchPage === true)}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Explore All</span>
        </Link>
        {tradebiliaCategories.map(category => (
          <Link
            key={category.value}
            href={`/category/${category.value}`}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={linkClass(category.value === currentSlug)}
          >
            <CategoryIcon slug={category.value} />
            <span>{category.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
