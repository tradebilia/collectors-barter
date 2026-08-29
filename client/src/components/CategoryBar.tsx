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

const categoryIcons: Record<string, LucideIcon | typeof MickeyEarsIcon> = {
  comics: BookOpen,
  sports_cards: Medal,
  vintage_toys: Package,
  video_games: Gamepad2,
  stamps: Stamp,
  coins: Coins,
  pokemon: Sparkles,
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
