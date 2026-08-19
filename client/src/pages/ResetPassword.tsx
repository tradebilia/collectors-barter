import { useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const completeRecovery = trpc.auth.completePasswordRecovery.useMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (!token || newPassword !== confirmPassword) {
      setError(!token ? "This password recovery link is invalid or incomplete." : "The new passwords do not match.");
      return;
    }
    try {
      await completeRecovery.mutateAsync({ token, newPassword });
      setSuccess(true);
    } catch {
      setError("This password recovery link is no longer valid. Request a new recovery link and try again.");
    }
  };

  return <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-slate-50 to-slate-100">
    <Card className="w-full max-w-md"><CardHeader><CardTitle>Choose a New Password</CardTitle><CardDescription>Your recovery link can be used once.</CardDescription></CardHeader><CardContent>
      {success ? <div className="space-y-4 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /><p className="font-semibold">Password updated</p><Button onClick={() => setLocation("/signin")} className="w-full">Sign In</Button></div> : <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><label className="text-sm font-medium">New Password</label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium">Confirm New Password</label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
        {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded"><AlertCircle className="h-4 w-4" /><span>{error}</span></div>}
        <Button type="submit" disabled={completeRecovery.isPending} className="w-full">{completeRecovery.isPending ? "Updating..." : "Update Password"}</Button>
      </form>}
    </CardContent></Card>
  </div>;
}
