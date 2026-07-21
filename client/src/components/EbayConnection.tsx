import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Star, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function EbayConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const ebayInfo = trpc.ebay.getInfo.useQuery();
  const disconnectMutation = trpc.ebay.disconnect.useMutation({
    onSuccess: () => ebayInfo.refetch(),
    onError: () => setError("Failed to disconnect eBay account"),
  });

  // Imperatively fetch the auth URL (correct pattern — can't call useQuery inside a handler)
  const utils = trpc.useUtils();

  // Handle post-redirect success/error messages from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ebayStatus = params.get("ebay");
    if (ebayStatus === "connected") {
      setSuccessMsg("eBay account connected successfully!");
      ebayInfo.refetch();
      const url = new URL(window.location.href);
      url.searchParams.delete("ebay");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    } else if (ebayStatus === "error") {
      const reason = params.get("reason") || "unknown";
      setError(`eBay connection failed (${reason}). Please try again.`);
      const url = new URL(window.location.href);
      url.searchParams.delete("ebay");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setSuccessMsg(null);

      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem("ebayOAuthState", state);

      // Fetch the auth URL imperatively (not via useQuery hook)
      const authUrl = await utils.ebay.getAuthUrl.fetch({ state });
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err) {
      setError("Failed to start eBay connection. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => disconnectMutation.mutate();

  const isConnected = !!ebayInfo.data?.ebayUsername;
  const feedbackPercentage = ebayInfo.data?.ebayFeedbackPercentage;
  const isLowFeedback = feedbackPercentage != null && feedbackPercentage < 95;
  const memberSince = ebayInfo.data?.ebayMemberSince ? new Date(ebayInfo.data.ebayMemberSince) : null;
  const sellerLevel = ebayInfo.data?.ebaySellerLevel;
  const idVerified = ebayInfo.data?.ebayIdVerified;

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
          <AlertDescription className="text-green-800">{successMsg}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <img 
            src="/manus-storage/Ebaylogo_14743bef.png" 
            alt="eBay" 
            className="h-12 w-auto object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-900">eBay</p>
              {isConnected && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-5 px-1.5 text-[10px]">
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-slate-600">
                {isConnected
                  ? `${ebayInfo.data?.ebayUsername} · ${ebayInfo.data?.ebayFeedbackScore} feedback · ${feedbackPercentage?.toFixed(1)}% positive`
                  : "Not connected"}
              </p>
              {isConnected && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  {memberSince && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Calendar className="h-3 w-3" />
                      Member since {memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  )}
                  {sellerLevel && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                      <Star className="h-3 w-3 fill-amber-600" />
                      {sellerLevel.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  )}
                  {idVerified && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                      <ShieldCheck className="h-3 w-3" />
                      ID Verified
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <Button
          variant={isConnected ? "destructive" : "outline"}
          size="sm"
          className="rounded-lg"
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting || disconnectMutation.isPending}
        >
          {isConnecting || disconnectMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isConnected ? (
            "Disconnect"
          ) : (
            "Connect"
          )}
        </Button>
      </div>

      {isConnected && isLowFeedback && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your eBay feedback score is below 95%. This may affect your trading reputation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
