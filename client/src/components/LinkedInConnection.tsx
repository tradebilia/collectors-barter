import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function LinkedInConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const linkedinInfo = trpc.linkedin.getInfo.useQuery();

  const disconnectMutation = trpc.linkedin.disconnect.useMutation({
    onSuccess: async () => {
      setSuccessMsg(null);
      await utils.linkedin.getInfo.invalidate();
    },
    onError: (err) => setError(err.message),
  });

  // Handle redirect back from LinkedIn OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const liStatus = params.get("linkedin");
    if (liStatus === "connected") {
      setSuccessMsg("LinkedIn account connected successfully!");
      utils.linkedin.getInfo.invalidate();
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("linkedin");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    } else if (liStatus === "error") {
      const reason = params.get("reason") || "unknown";
      const messages: Record<string, string> = {
        access_denied: "You declined the LinkedIn connection request.",
        no_code: "LinkedIn did not return an authorization code.",
        not_logged_in: "You must be logged in to connect LinkedIn.",
        callback_failed: "LinkedIn connection failed. Please try again.",
      };
      setError(messages[reason] || `LinkedIn connection failed (${reason}). Please try again.`);
      const url = new URL(window.location.href);
      url.searchParams.delete("linkedin");
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
      sessionStorage.setItem("linkedinOAuthState", state);
      const authUrl = await utils.linkedin.getAuthUrl.fetch({ state });
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error("No auth URL returned");
      }
    } catch (err) {
      setError("Failed to start LinkedIn connection. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => disconnectMutation.mutate();

  const isConnected = !!linkedinInfo.data?.linkedinId;
  const linkedinName = linkedinInfo.data?.linkedinName;
  const linkedinHeadline = linkedinInfo.data?.linkedinHeadline;

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
            src="/manus-storage/LinkedIn_df1e2c1e.webp"
            alt="LinkedIn"
            className="h-12 w-auto object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-900">LinkedIn</p>
              {isConnected && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 h-5 px-1.5 text-[10px]"
                >
                  Connected
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-slate-600">
                {isConnected ? linkedinName || "Connected" : "Not connected"}
              </p>
              {isConnected && linkedinHeadline && (
                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium mt-0.5">
                  <ShieldCheck className="h-3 w-3" />
                  {linkedinHeadline}
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
