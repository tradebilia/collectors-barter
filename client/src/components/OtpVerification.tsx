import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface OtpVerificationProps {
  type: "email" | "phone";
  contact: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

export function OtpVerification({
  type,
  contact,
  onVerify,
  onResend,
  isLoading = false,
  error,
  success = false,
}: OtpVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      return;
    }
    await onVerify(otp);
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendCooldown(60);
    try {
      await onResend();
    } finally {
      setIsResending(false);
    }

    // Countdown timer
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const displayContact = type === "email" ? contact : `${contact.slice(0, -4)}****`;
  const label = type === "email" ? "Email" : "Phone Number";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify {label}</CardTitle>
        <CardDescription>
          We've sent a verification code to {displayContact}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {success ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span>Verified successfully!</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code</label>
              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={otp.length !== 6 || isLoading}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?
              </p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className="text-sm"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend Code"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
