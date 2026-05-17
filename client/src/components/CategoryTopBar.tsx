import { TopRightIcons } from "@/components/TopRightIcons";
import { Search } from "lucide-react";
import { Link } from "wouter";

interface CategoryTopBarProps {
  logoUrl?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
}

export function CategoryTopBar({
  logoUrl = "/manus-storage/tradebilia_final_darkest(1)_3e8b98df.svg",
  searchPlaceholder = "Search...",
  onSearchChange,
}: CategoryTopBarProps) {
  return (
    <div className="border-b border-white/10 bg-black">
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

        {/* Icons on right */}
        <TopRightIcons className="flex items-center gap-3 md:gap-4 flex-shrink-0" iconColor="text-white/70" />
      </div>
    </div>
  );
}
