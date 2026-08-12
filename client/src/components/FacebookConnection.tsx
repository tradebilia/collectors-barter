/**
 * FacebookConnection component — displayed on the Integrations tab of Account Settings.
 * Mirrors the EbayConnection component pattern exactly.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";

export function FacebookConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const facebookInfo = trpc.facebook.getInfo.useQuery();
  const disconnectMutation = trpc.facebook.disconnect.useMutation({
    onSuccess: async () => {
      setSuccessMsg(null);
      await utils.facebook.getInfo.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  // Handle redirect back from Facebook OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fbStatus = params.get("facebook");
    if (fbStatus === "connected") {
      setSuccessMsg("Facebook account connected successfully!");
      utils.facebook.getInfo.invalidate();
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("facebook");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    } else if (fbStatus === "error") {
      const reason = params.get("reason") || "unknown";
      const messages: Record<string, string> = {
        access_denied: "You declined the Facebook connection request.",
        no_code: "Facebook did not return an authorization code.",
        not_logged_in: "You must be logged in to connect Facebook.",
        callback_failed: "Facebook connection failed. Please try again.",
      };
      setError(messages[reason] || `Facebook connection failed (${reason}). Please try again.`);
      const url = new URL(window.location.href);
      url.searchParams.delete("facebook");
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
      sessionStorage.setItem("facebookOAuthState", state);
      const authUrl = await utils.facebook.getAuthUrl.fetch({ state });
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err) {
      setError("Failed to start Facebook connection. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => disconnectMutation.mutate();

  const isConnected = !!facebookInfo.data?.facebookId;
  const facebookName = facebookInfo.data?.facebookName;
  const isVerified = facebookInfo.data?.facebookVerified;

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
            src="/manus-storage/Facebooklogo_0c02c2d1.png"
            alt="Facebook"
            className="h-12 w-auto object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-900">Facebook</p>
              {isConnected && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-5 px-1.5 text-[10px]">
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-slate-600">
                {isConnected ? facebookName || "Connected" : "Not connected"}
              </p>
              {isConnected && isVerified && (
                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium mt-0.5">
                  <ShieldCheck className="h-3 w-3" />
                  Facebook Verified Account
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
    </div>
  );
}
