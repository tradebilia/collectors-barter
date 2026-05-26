import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function EbayConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ebayInfo = trpc.ebay.getInfo.useQuery();
  const disconnectMutation = trpc.ebay.disconnect.useMutation();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get auth URL
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem("ebayOAuthState", state);

      const authUrlResponse = await trpc.ebay.getAuthUrl.query({ state });
      
      // Redirect to eBay OAuth
      window.location.href = authUrlResponse;
    } catch (err) {
      setError("Failed to start eBay connection. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      ebayInfo.refetch();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to disconnect eBay account");
    }
  };

  const isConnected = ebayInfo.data?.ebayUsername;
  const feedbackPercentage = ebayInfo.data?.ebayFeedbackPercentage;
  const isLowFeedback = feedbackPercentage && feedbackPercentage < 95;

  return (
    <Card>
      <CardHeader>
        <CardTitle>eBay Verification</CardTitle>
        <CardDescription>
          Connect your eBay account to display your feedback score and build trust with other collectors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              eBay account disconnected successfully
            </AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Connected eBay Account</p>
                  <p className="text-lg font-semibold text-gray-900">{ebayInfo.data?.ebayUsername}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>

            {isLowFeedback && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your eBay feedback score is below 95%. This may affect your trading reputation on Tradebilia.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Feedback Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ebayInfo.data?.ebayFeedbackScore || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Positive Feedback</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {feedbackPercentage?.toFixed(1)}%
                  </p>
                  {!isLowFeedback && feedbackPercentage && feedbackPercentage >= 98 && (
                    <Badge variant="default" className="bg-green-600">
                      Excellent
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="w-full"
            >
              {disconnectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect eBay Account"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              No eBay account connected. Connect your account to display your feedback and build trust with traders.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect eBay Account
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
