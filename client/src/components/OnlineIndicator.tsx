import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { X } from 'lucide-react';

interface OnlineIndicatorProps {
  sellerId: number;
  className?: string;
  size?: 'small' | 'large';
}

export function OnlineIndicator({ sellerId, className = '', size = 'small' }: OnlineIndicatorProps) {
  const utils = trpc.useUtils();

  // Fetch online status
  const onlineStatusQuery = trpc.onlineStatus.getSellerOnlineStatus.useQuery(
    { sellerId },
    {
      enabled: !!sellerId,
      refetchInterval: 30000, // Poll every 30 seconds to keep status accurate
      staleTime: 25000,
    }
  );

  // Note: Removed cache invalidation on mount to prevent request storms
  // The component will use cached data if available, reducing server load



  // Show nothing while loading
  if (onlineStatusQuery.isLoading) {
    return null;
  }

  // Show nothing if there's an error
  if (onlineStatusQuery.isError || !onlineStatusQuery.data) {
    return null;
  }

  const isOnline = onlineStatusQuery.data.isOnline;
  const isLarge = size === 'large';
  const dotSize = isLarge ? 'h-4 w-4' : 'h-2.5 w-2.5';
  const textSize = isLarge ? 'text-lg font-semibold' : 'text-[9px] font-medium';
  const gap = isLarge ? 'gap-3' : 'gap-1.5';

  if (isOnline) {
    return (
      <div className={`flex items-center ${gap} ${className}`}>
        {/* Green dot indicator */}
        <div className={`relative flex ${dotSize}`}>
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 animate-pulse"></span>
          <span className={`relative inline-flex rounded-full ${dotSize} bg-green-500`}></span>
        </div>
        {/* "Member Online" text */}
        <span className={`${textSize} text-green-600`}>Member Online</span>
      </div>
    );
  }

  // Offline state
  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* Red X indicator */}
      <X className={`${dotSize} text-red-500`} strokeWidth={3} />
      {/* "Member Offline" text */}
      <span className={`${textSize} text-red-500`}>Member Offline</span>
    </div>
  );
}
