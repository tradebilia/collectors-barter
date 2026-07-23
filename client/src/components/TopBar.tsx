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
  logoUrl = "/images/tradebilia-logo.svg",
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
    // Compact top bar for pages like War Room — no search, just logo + icons
    return (
      <div className="border-b border-white/10 bg-black relative z-0">
        <div className="flex items-center justify-between pl-2 pr-4 py-2 relative" style={{ minHeight: '52px' }}>
          {/* Logo — same size as full TopBar */}
          <div className="h-16 flex items-center" style={{ width: '650px', marginTop: '-10px' }}>
            <a href="/" className="flex items-center hover:opacity-80 transition h-full w-full">
              <div className="h-16 w-full flex items-center">
                <AnimatedLogoSmall70 />
              </div>
            </a>
          </div>

          {/* Icons and Auth on right */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            <TopRightIcons iconColor="text-white/70" />
            {isAuthenticated ? (
              <Button
                onClick={logout}
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
      <div className="flex items-center justify-center gap-4 pl-2 pr-4 py-2 relative">
        {/* Animated Logo on left */}
        <div className="absolute left-2 h-16 flex items-center" style={{ width: '650px', top: '-10px' }}>
          <a href="/" className="flex items-center hover:opacity-80 transition h-full w-full">
            <div className="h-16 w-full flex items-center">
              <AnimatedLogoSmall70 />
            </div>
          </a>
        </div>

        {/* Search in center */}
        <div className="flex items-center gap-0 bg-white rounded-lg px-4 py-2 max-w-2xl w-full">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleSearch}
            className="bg-transparent text-black text-sm placeholder-gray-700 outline-none flex-1 ml-2"
          />
          <button
            onClick={handleSearchClick}
            disabled={searchQuery.trim().length === 0}
            className="flex-shrink-0 ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition"
            aria-label="Search"
          >
            Search
          </button>
        </div>

        {/* Icons and Auth on right */}
        <div className="absolute right-4 flex items-center gap-3 md:gap-4 flex-shrink-0">
        <TopRightIcons iconColor="text-white/70" />
        {isAuthenticated ? (
          <Button
            onClick={logout}
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
