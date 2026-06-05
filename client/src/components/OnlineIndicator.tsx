import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useCallback } from 'react';

interface OnlineIndicatorProps {
  sellerId: number;
  className?: string;
}

export function OnlineIndicator({ sellerId, className = '' }: OnlineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    if (onlineStatusQuery.data) {
      setIsOnline(onlineStatusQuery.data.isOnline);
      setIsLoading(false);
    }
  }, [onlineStatusQuery.data]);

  if (isLoading) {
    return null;
  }

  if (!isOnline) {
    return null;
  }

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
