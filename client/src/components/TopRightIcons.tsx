import { Link } from "wouter";
import { Bell, Mail, Cog, Shield } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getAvatarInitials } from "@/lib/tradebilia";

interface TopRightIconsProps {
  className?: string;
  iconColor?: string;
}

const mailFlashStyle = `
  @keyframes mailFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .mail-icon-flash {
    animation: mailFlash 1s ease-in-out infinite;
  }
`;

export function TopRightIcons({ className = "flex items-center gap-3 md:gap-4", iconColor = "text-[#d4e86d]" }: TopRightIconsProps) {
  const { user } = useAuth();
  const unreadQuery = trpc.auth.unreadCounts.useQuery(undefined, {
    enabled: !!user,
    refetchOnMount: true,
    // 30s polling with matching staleTime: previously 5s + staleTime 0,
    // which generated 12 requests/min (2 DB queries each) per logged-in user.
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: !!user,
    refetchOnMount: true,
    // Dashboard drives only the avatar fallback here; 60s freshness is ample
    // (previously staleTime 0 re-ran one of the heaviest queries per mount).
    staleTime: 60000,
  });

  if (!user) {
    return null;
  }

  const unreadMessages = typeof unreadQuery.data?.unreadMessages === 'number' ? unreadQuery.data.unreadMessages : 0;
  const unreadNotifications = typeof unreadQuery.data?.unreadNotifications === 'number' ? unreadQuery.data.unreadNotifications : 0;
  const userAvatarUrl = user?.avatarUrl || dashboardQuery.data?.profile?.avatarUrl || undefined;

  return (
    <>
      <style>{mailFlashStyle}</style>
      <div className={className}>
        {/* Avatar */}
        <Link href={`/profile/${user.id}`} title="Your Profile" className="transition hover:opacity-80">
          <Avatar className="h-6 w-6 border border-white/30 cursor-pointer hover:border-white/60 transition">
            <AvatarImage src={userAvatarUrl} alt={user.name ?? "User"} />
            <AvatarFallback className="bg-[#7f31ff] text-white text-[10px] font-semibold">
              {getAvatarInitials({ firstName: (user as any).firstName, lastName: (user as any).lastName, displayName: user.name ?? "User" })}
            </AvatarFallback>
          </Avatar>
        </Link>

        <span className="text-white/45">|</span>

        {/* Icons */}
        <div className={`flex items-center gap-1 ${iconColor}`}>
          {/* Admin Shield */}
          {user?.role === "admin" && (
            <Link href="/admin" className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 transition" title="Admin Dashboard">
              <Shield className="h-5 w-5 text-white" />
            </Link>
          )}

          {/* Notifications Bell */}
          <Link href="/notifications" className="relative transition hover:opacity-80" title="Notifications">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </Link>

          {/* Settings Cog */}
          <Link href="/account-settings" className="transition hover:opacity-80" title="Settings">
            <Cog className="h-5 w-5" />
          </Link>

          {/* Messages Mail */}
          <Link href="/messages" className="relative transition hover:opacity-80" title="Messages">
            {unreadMessages > 0 ? (
              <div className="flex items-center gap-1">
                <Mail className="h-5 w-5 fill-yellow-400 text-black stroke-[0.5] mail-icon-flash" style={{ strokeWidth: '0.5px' }} />
                <span className="text-xs font-bold text-yellow-400">{unreadMessages > 99 ? "99+" : unreadMessages}</span>
              </div>
            ) : (
              <Mail className="h-5 w-5" />
            )}
          </Link>
        </div>
      </div>
    </>
  );
}
