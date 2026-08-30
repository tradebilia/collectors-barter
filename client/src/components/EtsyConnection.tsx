import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export function EtsyConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const etsyInfo = trpc.etsy.getInfo.useQuery();
  const disconnect = trpc.etsy.disconnect.useMutation({
    onSuccess: () => utils.etsy.getInfo.invalidate(),
    onError: e => setError(e.message),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("etsy");
    if (status === "connected") {
      setSuccessMsg("Etsy account connected successfully.");
      utils.etsy.getInfo.invalidate();
    }
    if (status === "error") {
      const reason = params.get("reason") || "unknown";
      const messages: Record<string, string> = {
        access_denied: "You declined the Etsy connection request.",
        missing_pkce: "Etsy security verification expired. Please try again.",
        encryption_unavailable:
          "Secure Etsy token storage is not available yet.",
        staging_disabled:
          "Etsy connection is disabled in the isolated staging environment.",
        invalid_state: "Etsy security verification failed. Please try again.",
        callback_failed: "Etsy connection failed. Please try again.",
      };
      setError(
        messages[reason] ||
          `Etsy connection failed (${reason}). Please try again.`
      );
    }
    if (status) {
      const url = new URL(window.location.href);
      url.searchParams.delete("etsy");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, [utils.etsy.getInfo]);

  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const url = await utils.etsy.getAuthUrl.fetch();
      window.location.assign(url);
    } catch {
      setError(
        "Etsy is not configured yet. Please try again after the project credentials are added."
      );
      setIsConnecting(false);
    }
  };
  const info = etsyInfo.data;
  const isConnected = !!info?.etsyUserId;
  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMsg && (
        <Alert className="rounded-lg border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMsg}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col items-stretch gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
            <img
              src="/manus-storage/etsy-mark_2dee1a0f.png"
              alt="Etsy"
              className="h-12 w-12 rounded-xl object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-900">Etsy</p>
              {isConnected && (
                <Badge
                  variant="outline"
                  className="border-orange-200 bg-orange-50 text-orange-700"
                >
                  Etsy Verified
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-slate-600">
              {isConnected
                ? info?.etsyShopName ||
                  info?.etsyDisplayName ||
                  "Connected Etsy account"
                : "Not connected"}
            </p>
            {isConnected && info?.etsyShopUrl && (
              <a
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 hover:underline"
                href={info.etsyShopUrl}
                target="_blank"
                rel="noreferrer"
              >
                View Etsy shop <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <Button
          variant={isConnected ? "destructive" : "outline"}
          size="sm"
          className="rounded-lg"
          onClick={isConnected ? () => disconnect.mutate() : connect}
          disabled={isConnecting || disconnect.isPending}
        >
          {isConnecting || disconnect.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isConnected ? (
            "Disconnect"
          ) : (
            "Connect"
          )}
        </Button>
      </div>
    </div>
  );
}
