import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function EbayConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ebayInfo = trpc.ebay.getInfo.useQuery();
  const disconnectMutation = trpc.ebay.disconnect.useMutation();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get auth URL
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem("ebayOAuthState", state);

      const { data: authUrlResponse } = await trpc.ebay.getAuthUrl.useQuery({ state });
      
      // Redirect to eBay OAuth
      if (authUrlResponse) {
        window.location.href = authUrlResponse;
      }
    } catch (err) {
      setError("Failed to start eBay connection. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      ebayInfo.refetch();
    } catch (err) {
      setError("Failed to disconnect eBay account");
    }
  };

  const isConnected = !!ebayInfo.data?.ebayUsername;
  const feedbackPercentage = ebayInfo.data?.ebayFeedbackPercentage;
  const isLowFeedback = feedbackPercentage && feedbackPercentage < 95;

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive" className="rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
            <p className="text-xs text-slate-600">
              {isConnected 
                ? `${ebayInfo.data?.ebayUsername} (${ebayInfo.data?.ebayFeedbackScore} feedback, ${feedbackPercentage?.toFixed(1)}% positive)`
                : "Not connected"}
            </p>
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
