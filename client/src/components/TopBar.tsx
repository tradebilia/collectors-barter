import { TopRightIcons } from "@/components/TopRightIcons";
import { Search, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SignInModal } from "@/components/SignInModal";
import { useState } from "react";

interface TopBarProps {
  logoUrl?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
}

export function TopBar({
  logoUrl = "/manus-storage/tradebilia_final_darkest(1)_3e8b98df.svg",
  searchPlaceholder = "Search...",
  onSearchChange,
}: TopBarProps) {
  const { isAuthenticated, logout } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);

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
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 max-w-2xl w-full">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="bg-transparent text-gray-900 text-sm placeholder-gray-500 outline-none w-full"
            />
          </div>
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
