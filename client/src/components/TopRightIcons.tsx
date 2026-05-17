import { Link } from "wouter";
import { Bell, Mail, Cog } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

interface TopRightIconsProps {
  className?: string;
  iconColor?: string;
}

export function TopRightIcons({ className = "flex items-center gap-3 md:gap-4", iconColor = "text-[#d4e86d]" }: TopRightIconsProps) {
  const { user } = useAuth();
  const unreadQuery = trpc.auth.unreadCounts.useQuery(undefined, {
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  const unreadMessages = unreadQuery.data?.unreadMessages ?? 0;
  const unreadNotifications = unreadQuery.data?.unreadNotifications ?? 0;

  return (
    <div className={className}>
      {/* Avatar */}
      <Link href={`/profile/${user.id}`} title="Your Profile" className="transition hover:opacity-80">
        <Avatar className="h-6 w-6 border border-white/30 cursor-pointer hover:border-white/60 transition">
          <AvatarImage src={undefined} alt={user.name ?? "User"} />
          <AvatarFallback className="bg-[#7f31ff] text-white text-[10px]">
            {(user.name ?? "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <span className="text-white/45">|</span>

      {/* Icons */}
      <div className={`flex items-center gap-1 ${iconColor}`}>
        {/* Notifications Bell */}
        <Link href="/notifications" className="relative transition hover:opacity-80" title="Notifications">
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          )}
        </Link>

        {/* Settings Cog */}
        <Link href="/account-settings" className="transition hover:opacity-80" title="Settings">
          <Cog className="h-4 w-4" />
        </Link>

        {/* Messages Mail */}
        <Link href="/messages" className="relative transition hover:opacity-80" title="Messages">
          <Mail className="h-4 w-4" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
