import { useState } from "react";
import { useLocation } from "wouter";
import { OtpVerification } from "@/components/OtpVerification";
import { trpc } from "@/lib/trpc";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function VerifyAccount() {
  const [location, setLocation] = useLocation();
  const [verificationStep, setVerificationStep] = useState<"email" | "phone" | "complete">("email");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const sendEmailCodeMutation = trpc.auth.sendEmailCode.useMutation();
  const verifyEmailCodeMutation = trpc.auth.verifyEmailCode.useMutation();
  const sendPhoneCodeMutation = trpc.auth.sendPhoneCode.useMutation();
  const verifyPhoneCodeMutation = trpc.auth.verifyPhoneCode.useMutation();

  // Get email and phone from query params or session
  const params = new URLSearchParams(location.split("?")[1]);
  const email = params.get("email") || "";
  const phone = params.get("phone") || "";

  const handleEmailVerify = async (otp: string) => {
    setIsLoading(true);
    setError(undefined);
    try {
      await verifyEmailCodeMutation.mutateAsync({ code: otp });
      setVerificationStep(phone ? "phone" : "complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneVerify = async (otp: string) => {
    setIsLoading(true);
    setError(undefined);
    try {
      if (!phone) throw new Error("Your phone number is missing. Return to account setup and try again.");
      await verifyPhoneCodeMutation.mutateAsync({ phone, code: otp });
      setVerificationStep("complete");
      // Redirect to welcome page after 2 seconds
      setTimeout(() => setLocation("/welcome?new=true"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setError(undefined);
      await sendEmailCodeMutation.mutateAsync({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  const handleResendPhone = async () => {
    try {
      if (!phone) throw new Error("Your phone number is missing. Return to account setup and try again.");
      setError(undefined);
      await sendPhoneCodeMutation.mutateAsync({ phone });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {verificationStep === "email" && (
          <OtpVerification
            type="email"
            contact={email}
            onVerify={handleEmailVerify}
            onResend={handleResendEmail}
            isLoading={isLoading}
            error={error}
          />
        )}

        {verificationStep === "phone" && (
          <OtpVerification
            type="phone"
            contact={phone}
            onVerify={handlePhoneVerify}
            onResend={handleResendPhone}
            isLoading={isLoading}
            error={error}
          />
        )}

        {verificationStep === "complete" && (
          <Card>
            <CardHeader>
              <CardTitle>Account Verified!</CardTitle>
              <CardDescription>
                Your account has been successfully verified. Redirecting...
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
