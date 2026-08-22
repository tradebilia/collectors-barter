import { TopRightIcons } from "@/components/TopRightIcons";
import { Search, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SignInModal } from "@/components/SignInModal";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AnimatedLogoSmall70 from "@/components/AnimatedLogoSmall70";

interface TopBarProps {
  logoUrl?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  hideSearch?: boolean;
}

export function TopBar({
  logoUrl = "https://assets.tradebilia.com/tradebilia_final_transparent_8a1981e6.svg",
  searchPlaceholder = "Search...",
  onSearchChange,
  hideSearch = false,
}: TopBarProps) {
  const { isAuthenticated, logout, user } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  // Global activity heartbeat — keeps online status accurate on every page
  const updateActivityMutation = trpc.onlineStatus.updateActivity.useMutation();
  useEffect(() => {
    if (!isAuthenticated) return;
    updateActivityMutation.mutate();
    const interval = setInterval(() => updateActivityMutation.mutate(), 2 * 60 * 1000); // every 2 minutes
    return () => clearInterval(interval);
  }, [isAuthenticated]);
  // Note: market.search is a query, not a mutation

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value;
      onSearchChange?.(value);

      if (value.trim().length > 0) {
        // Navigate to search results page
        setLocation(`/search?q=${encodeURIComponent(value)}`);
      }
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchClick = () => {
    if (searchQuery.trim().length > 0) {
      onSearchChange?.(searchQuery);
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (hideSearch) {
    // Compact top bar for pages like Trade Room — no search, just logo + icons
    return (
      <div className="border-b border-white/10 bg-black relative z-0">
        <div className="flex min-h-14 items-center justify-between pl-2 pr-4 py-1 relative">
          {/* Desktop logo uses the same full shared geometry as pages with search. */}
          <div className="absolute left-2 h-16 hidden items-center sm:flex" style={{ width: '650px', top: '-10px' }}>
            <a href="/" className="flex items-center hover:opacity-80 transition h-full w-full">
              <div className="h-16 w-full flex items-center">
                <AnimatedLogoSmall70 />
              </div>
            </a>
          </div>

          {/* Keep a compact, non-overlapping logo only at mobile widths. */}
          <div className="h-12 w-[220px] items-center sm:hidden">
            <a href="/" className="flex h-full w-full items-center transition hover:opacity-80">
              <AnimatedLogoSmall70 />
            </a>
          </div>

          {/* Icons and Auth on right */}
          <div className="ml-auto flex items-center gap-3 md:gap-4 flex-shrink-0">
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
              <>
                <Button
                  onClick={() => setShowSignInModal(true)}
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  Sign In
                </Button>
                <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-white/10 bg-black relative z-0">
      <div className="flex min-h-14 items-center gap-2 px-2 py-2 sm:hidden">
        <div className="flex w-[40vw] max-w-[170px] flex-none items-center gap-0 rounded-lg bg-white px-3 py-2">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            type="text"
            aria-label="Search Tradebilia listings"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleSearch}
            className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-black placeholder-gray-700 outline-none"
          />
        </div>
        {isAuthenticated ? (
          <div className="flex flex-shrink-0 items-center gap-1">
            <TopRightIcons className="flex items-center gap-1" iconColor="text-white/70" />
            <Button onClick={async () => { await logout(); window.location.href = "/"; }} variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowSignInModal(true)} size="sm" className="flex-shrink-0 bg-white/20 text-white hover:bg-white/30">Sign In</Button>
        )}
      </div>

      <div className="hidden min-h-14 items-center justify-center gap-4 px-2 py-2 sm:flex sm:pl-2 sm:pr-4 relative">
        {/* Animated Logo on left */}
        <div className="absolute left-2 h-16 hidden items-center sm:flex" style={{ width: '650px', top: '-10px' }}>
          <a href="/" className="flex items-center hover:opacity-80 transition h-full w-full">
            <div className="h-16 w-full flex items-center">
              <AnimatedLogoSmall70 />
            </div>
          </a>
        </div>

        {/* Search in center */}
        <div className="flex items-center gap-0 bg-white rounded-lg px-4 py-2 max-w-2xl w-full mr-16 sm:mx-0">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            aria-label="Search Tradebilia listings"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleSearch}
            className="bg-transparent text-black text-sm placeholder-gray-700 outline-none flex-1 ml-2"
          />
          <button
            onClick={handleSearchClick}
            disabled={searchQuery.trim().length === 0}
            className="hidden sm:block flex-shrink-0 ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition"
            aria-label="Search"
          >
            Search
          </button>
        </div>

        {/* Icons and Auth on right */}
        <div className="absolute right-2 sm:right-4 flex items-center gap-3 md:gap-4 flex-shrink-0">
        <div className="hidden sm:block"><TopRightIcons iconColor="text-white/70" /></div>
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
              Sign Out
            </Button>
        ) : (
          <>
            <Button
              onClick={() => setShowSignInModal(true)}
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30"
            >
              Sign In
            </Button>
            <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />
          </>
        )}
        </div>
      </div>
    </div>
  );
}
