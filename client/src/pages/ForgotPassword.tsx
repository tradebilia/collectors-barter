import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

export function ForgotPassword() {
  const startLogin = () => { window.location.href = getLoginUrl(); };
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const requestEmailRecovery = trpc.auth.requestPasswordRecovery.useMutation();
  const requestPhoneRecovery = trpc.auth.requestPhonePasswordRecovery.useMutation();
  const completePhoneRecovery = trpc.auth.completePhonePasswordRecovery.useMutation();

  const recoveryErrorMessage = (fallback: string, err: unknown) => {
    const message = err instanceof Error ? err.message : "";
    return message.startsWith("Password recovery email is temporarily unavailable") || message.startsWith("SMS verification") || message.startsWith("Could not send the verification code") || message.startsWith("That phone number") || message.startsWith("Too many")
      ? message
      : fallback;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      await requestEmailRecovery.mutateAsync({ email });
      setSuccess(true);
    } catch (err) {
      setError(recoveryErrorMessage("We could not start recovery. Please try again later.", err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);
    try {
      await requestPhoneRecovery.mutateAsync({ phone });
      setPhoneCodeSent(true);
    } catch (err) {
      setError(recoveryErrorMessage("We could not start recovery. Please try again later.", err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await completePhoneRecovery.mutateAsync({ phone, code, newPassword });
      setSuccess(true);
    } catch {
      setError("We could not complete recovery. Request a new code and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>Recover your account using your Tradebilia account email or a verified phone number.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold">Check your recovery method</p>
                <p className="text-sm text-gray-600">
                  If the information matches a verified Tradebilia account, recovery instructions have been sent.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={startLogin} className="w-full">Back to Sign In</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                <Button type="button" variant={method === "email" ? "default" : "ghost"} onClick={() => { setMethod("email"); setError(undefined); }}>Verified Email</Button>
                <Button type="button" variant={method === "phone" ? "default" : "ghost"} onClick={() => { setMethod("phone"); setError(undefined); }}>Verified Phone</Button>
              </div>
              {method === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
              ) : (
                <form onSubmit={phoneCodeSent ? handlePhoneComplete : handlePhoneSend} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Verified Phone Number</label>
                    <Input type="tel" placeholder="Your verified phone number" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading || phoneCodeSent} required />
                  </div>
                  {phoneCodeSent && <>
                    <div className="space-y-2"><label className="text-sm font-medium">Text Message Code</label><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">New Password</label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Confirm New Password</label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
                  </>}
                  {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded"><AlertCircle className="h-4 w-4" /><span>{error}</span></div>}
                  <Button type="submit" disabled={isLoading} className="w-full">{isLoading ? "Working..." : phoneCodeSent ? "Reset Password" : "Send Recovery Code"}</Button>
                </form>
              )}
              <Button type="button" variant="link" onClick={startLogin} className="w-full">Back to Sign In</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
