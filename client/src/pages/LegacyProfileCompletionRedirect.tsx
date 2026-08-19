import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Compatibility destination for legacy links and bookmarks. The former
 * Profile Completion form never persisted its fields, so it must not remain
 * reachable as a successful account-management workflow.
 */
export default function LegacyProfileCompletionRedirect() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const dashboardQuery = trpc.market.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const isPending = loading || (isAuthenticated && dashboardQuery.isLoading);
  const destination = !isAuthenticated
    ? "/account-setup"
    : dashboardQuery.data?.profile
      ? "/account-settings?tab=profile"
      : "/account-setup";

  useEffect(() => {
    if (isPending) return;
    setLocation(destination, { replace: true });
  }, [destination, isPending, setLocation]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f3] text-slate-950" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-medium">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Taking you to the right profile page…
      </div>
    </main>
  );
}
