import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, Bell, Mail, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getLoginUrl } from "@/const";

interface PageHeaderProps {
  showSearch?: boolean;
  showCategories?: boolean;
  categories?: Array<{ value: string; label: string }>;
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  keyword?: string;
  onKeywordChange?: (keyword: string) => void;
  onSearch?: () => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  userAvatar?: string | null;
  userName?: string;
  unreadNotifications?: number;
  unreadMessages?: number;
}

const categoryOptions: Array<{ value: string; label: string }> = [
  { value: "comics", label: "Comics" },
  { value: "sports_cards", label: "Sports Cards" },
  { value: "vintage_toys", label: "Vintage Toys" },
  { value: "video_games", label: "Video Games" },
  { value: "stamps", label: "Stamps" },
  { value: "coins", label: "Coins" },
  { value: "pokemon", label: "Pokemon" },
  { value: "movies", label: "Movies" },
  { value: "autographs", label: "Autographs" },
  { value: "disney_pins", label: "Disney Pins" },
]

export function PageHeader({
  showSearch = false,
  showCategories = false,
  categories = categoryOptions,
  activeCategory,
  onCategoryChange,
  keyword = "",
  onKeywordChange,
  onSearch,
  isAuthenticated = false,
  onLogout,
  userAvatar,
  userName = "User",
  unreadNotifications = 0,
  unreadMessages = 0,
}: PageHeaderProps) {
  return (
    <header className="border-b border-black/70 bg-black text-white shadow-[0_8px_22px_rgba(0,0,0,0.25)]">
      <div className="container flex min-h-7 items-center justify-between gap-3 py-0.5 text-[11px]">
        <div className="flex flex-1 items-center gap-3">
          {/* Logo / Title */}
          <Link href="/" className="font-['Oswald'] text-[2.15rem] font-semibold leading-none tracking-[-0.05em] text-white sm:text-[2.45rem]">
            {showSearch ? "Search" : "HOME"}
          </Link>

          {/* Search Bar - Only on pages that need it */}
          {showSearch && (
            <div className="flex w-full max-w-sm overflow-hidden rounded-[0.35rem] border border-black/80 bg-white">
              <Input
                value={keyword}
                onChange={event => onKeywordChange?.(event.target.value)}
                placeholder="Search..."
                className="h-7 rounded-none border-0 bg-white px-3 text-[9.5px] text-slate-900 placeholder:text-slate-500 focus-visible:ring-0"
              />
              <button
                type="button"
                className="inline-flex h-7 w-9 items-center justify-center bg-[#7f31ff] text-white transition hover:bg-[#6925dd]"
                onClick={onSearch}
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right side icons and buttons */}
        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated && (
            <>
              <Link href="/profile" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:text-white">
                My Tradebilia
              </Link>
              <span className="text-white/45">|</span>
              <div className="flex items-center gap-1 text-[#d4e86d]">
                <Link href="/notifications" className="relative transition hover:text-[#c4d85d]" title="Notifications">
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </Link>
                <Link href="/account-settings" className="transition hover:text-[#c4d85d]">
                  <Cog className="h-4 w-4" />
                </Link>
                <Link href="/messages" className="relative transition hover:text-[#c4d85d]" title="Messages">
                  <Mail className="h-4 w-4" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </Link>
              </div>
            </>
          )}
          <div className="flex items-center gap-3">
            {isAuthenticated && userAvatar && (
              <Link href="/profile" title="Your Profile">
                <Avatar className="h-7 w-7 border border-white/30 cursor-pointer hover:border-white/60 transition">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-[#7f31ff] text-white text-[10px]">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button
                  onClick={onLogout}
                  className="h-7 rounded-md bg-white/20 px-3 text-[11px] font-semibold text-white hover:bg-white/30"
                >
                  Log Out
                </Button>
              ) : (
                <Button
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="h-7 rounded-md bg-[#7f31ff] px-3 text-[11px] font-semibold text-white hover:bg-[#6925dd]"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation - Only on pages that need it */}
      {showCategories && (
        <div className="grid grid-cols-2 overflow-hidden border-t border-white/15 bg-[#f7f7f5] text-slate-900 sm:grid-cols-5 xl:grid-cols-10">
          {categories.map(option => (
            <Link
              key={option.value}
              href={`/category/${option.value}`}
              className={`flex min-h-8 items-center justify-center border-b border-r border-slate-300 px-1.5 py-1 text-center font-['Oswald'] text-[12px] font-semibold tracking-[0.01em] transition hover:bg-slate-100 ${activeCategory === option.value ? "bg-[#3b3b3b] text-white" : "bg-[#f7f7f5] text-slate-900"}`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
