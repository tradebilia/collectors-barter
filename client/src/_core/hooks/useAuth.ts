import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearPreviewSessionToken,
  getPreviewAuthenticatedUser,
  PREVIEW_AUTH_CHANGED_EVENT,
} from "@/lib/previewSession";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const [embeddedPreviewUser, setEmbeddedPreviewUser] = useState(() => getPreviewAuthenticatedUser());

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncEmbeddedPreviewUser = () => setEmbeddedPreviewUser(getPreviewAuthenticatedUser());
    window.addEventListener(PREVIEW_AUTH_CHANGED_EVENT, syncEmbeddedPreviewUser);
    return () => window.removeEventListener(PREVIEW_AUTH_CHANGED_EVENT, syncEmbeddedPreviewUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Clear the Preview auto-login token mirrored into sessionStorage, so
      // header-based sessions (Safari ITP / WebView) are logged out too. The
      // backend cookie is cleared by the logout mutation.
      clearPreviewSessionToken();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const resolvedUser = meQuery.data ?? (embeddedPreviewUser as typeof meQuery.data);

  const state = useMemo(() => {
    return {
      user: resolvedUser ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(resolvedUser),
    };
  }, [
    resolvedUser,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(resolvedUser));
    } catch {
      // Storage can be unavailable inside an embedded preview; auth state still
      // lives in React Query and must not fail during render.
    }
  }, [resolvedUser]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate at this moment only. startLogin() mints the nonce + cookie itself.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
