import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const signinMutation = trpc.auth.signin.useMutation();
  const formRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset scroll position when modal opens to ensure heading is visible
  useEffect(() => {
    if (isOpen && formRef.current) {
      formRef.current.scrollTop = 0;
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signinMutation.mutateAsync({
        username,
        password,
      });

      // The cookie is preferred. If a mobile browser does not retain it, store
      // the signed session token only for the current browser session and retry
      // through the Authorization-header fallback.
      let authenticatedUser = await utils.auth.me.fetch();
      if (!authenticatedUser && result.sessionToken) {
        sessionStorage.setItem("manus-cookie", result.sessionToken);
        authenticatedUser = await utils.auth.me.fetch();
      }

      if (!authenticatedUser) {
        throw new Error("Sign-in was accepted, but this browser did not establish a session. Please close and reopen the site, then try again.");
      }
      
      setUsername("");
      setPassword("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* Modal */}
      <Card role="dialog" aria-modal="true" aria-labelledby="signin-modal-title" className="relative z-[10000] w-full max-w-sm bg-white shadow-lg rounded-lg">
        <div ref={formRef} className="p-6 flex flex-col max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-4 mb-6 flex-shrink-0">
            <h2 id="signin-modal-title" className="text-2xl font-bold">Sign In</h2>
            <button ref={closeButtonRef} type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900" aria-label="Close sign in dialog">Close</button>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4 flex-1">
            <div>
              <label htmlFor="signin-username" className="block text-sm font-medium mb-1">Username</label>
              <Input
                id="signin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="signin-password" className="block text-sm font-medium mb-1">Password</label>
              <Input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/forgot-password");
              }}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </form>

          <div className="mt-4 text-center text-sm flex-shrink-0">
            Not a Member?{" "}
            <button
              onClick={() => {
                onClose();
                navigate("/signup");
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Sign Up
            </button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
}
