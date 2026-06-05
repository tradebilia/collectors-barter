import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { X } from 'lucide-react';

interface OnlineIndicatorProps {
  sellerId: number;
  className?: string;
}

export function OnlineIndicator({ sellerId, className = '' }: OnlineIndicatorProps) {
  const utils = trpc.useUtils();

  // Fetch online status
  const onlineStatusQuery = trpc.onlineStatus.getSellerOnlineStatus.useQuery(
    { sellerId },
    {
      enabled: !!sellerId,
      refetchInterval: 10000, // Refetch every 10 seconds to keep status current
      staleTime: 5000, // Consider data stale after 5 seconds
    }
  );

  // Invalidate cache on mount to ensure fresh data
  useEffect(() => {
    if (sellerId) {
      utils.onlineStatus.getSellerOnlineStatus.invalidate({ sellerId });
    }
  }, [sellerId, utils]);



  // Show nothing while loading
  if (onlineStatusQuery.isLoading) {
    return null;
  }

  // Show nothing if there's an error
  if (onlineStatusQuery.isError || !onlineStatusQuery.data) {
    return null;
  }

  const isOnline = onlineStatusQuery.data.isOnline;

  if (isOnline) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {/* Green dot indicator */}
        <div className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 animate-pulse"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </div>
        {/* "Member Online" text */}
        <span className="text-[9px] font-medium text-green-600">Member Online</span>
      </div>
    );
  }

  // Offline state
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Red X indicator */}
      <X className="h-2.5 w-2.5 text-red-500" strokeWidth={3} />
      {/* "Member Offline" text */}
      <span className="text-[9px] font-medium text-red-500">Member Offline</span>
    </div>
  );
}
