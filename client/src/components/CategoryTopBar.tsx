import { TopRightIcons } from "@/components/TopRightIcons";
import { Search, LogOut } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { tradebiliaCategories } from "@/lib/tradebilia";

interface CategoryTopBarProps {
  logoUrl?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
}

export function CategoryTopBar({
  logoUrl = "/manus-storage/tradebilia_final_transparent_d37f9c4f.svg",
  searchPlaceholder = "Search...",
  onSearchChange,
}: CategoryTopBarProps) {
  const { isAuthenticated, logout } = useAuth();
  const [, params] = useRoute("/category/:slug");
  const currentSlug = params?.slug;

  return (
    <div className="border-b border-white/10 bg-black">
      {/* Top row: Logo, Search, Icons */}
      <div className="flex items-center justify-between gap-4 pl-2 pr-4 py-3">
        {/* Logo on left */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center hover:opacity-80 transition">
            <img src={logoUrl} alt="Tradebilia" className="h-14 w-auto object-contain" />
          </Link>
        </div>

        {/* Search in center */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 max-w-2xl w-full">
            <Search className="h-4 w-4 text-white/70 flex-shrink-0" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="bg-transparent text-white text-sm placeholder-white/50 outline-none w-full"
            />
          </div>
        </div>

        {/* Icons and Auth on right */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
          <TopRightIcons iconColor="text-white/70" />
          {isAuthenticated ? (
            <Button
              onClick={async () => {
                await logout();
                window.location.href = "/";
              }}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          ) : (
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Category navigation row */}
      <nav className="relative z-10 border-t border-black bg-black">
        <div className="flex w-full overflow-x-auto">
          <Link
            href="/"
            className="flex-1 border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[11px] text-white whitespace-nowrap"
          >
            Home
          </Link>
          {tradebiliaCategories.map(category => (
            <Link
              key={category.value}
              href={`/category/${category.value}`}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`flex-1 border-b border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-white/10 lg:text-[11px] whitespace-nowrap ${
                category.value === currentSlug ? "bg-white text-slate-950" : "text-white"
              }`}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
