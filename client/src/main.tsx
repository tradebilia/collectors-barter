import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Redirect to home page which will show sign-in modal
  window.location.href = '/';
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      maxURLLength: 2000, // Prevent 414 errors by using POST for large batches
      async fetch(input, init) {
        const headers = new Headers(init?.headers);
        try {
          const mobileSessionToken = sessionStorage.getItem("manus-cookie");
          if (mobileSessionToken) {
            headers.set("authorization", `Bearer ${mobileSessionToken}`);
          }
        } catch {}

        const response = await globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });

        // If the server (or the hosting proxy) is down or restarting, an HTML
        // error page can come back instead of JSON. Without this guard the
        // user sees a cryptic "Unexpected token '<' ... is not valid JSON"
        // toast. Detect it and surface a clear, actionable message instead.
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            "The server is temporarily unreachable (it may be restarting). " +
              "Your entry has NOT been submitted - please wait a few seconds and try again."
          );
        }

        return response;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
