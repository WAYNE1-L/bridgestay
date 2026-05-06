import "leaflet/dist/leaflet.css";
import { initAnalytics } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

initAnalytics();

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

const getDevAuthOverride = () => {
  if (typeof window === "undefined") return null;
  if (!import.meta.env.DEV) return null;

  const devAuth = new URLSearchParams(window.location.search).get("devAuth");
  return devAuth === "guest" || devAuth === "demoAdmin" ? devAuth : null;
};

const withDevAuthOverride = (input: RequestInfo | URL): RequestInfo | URL => {
  const devAuth = getDevAuthOverride();
  if (!devAuth) return input;

  const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
  url.searchParams.set("devAuth", devAuth);
  return url.toString();
};

const preserveDevAuthOnLinkClick = (event: MouseEvent) => {
  const devAuth = getDevAuthOverride();
  if (!devAuth) return;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const target = event.target instanceof Element
    ? event.target.closest("a[href]")
    : null;
  if (!(target instanceof HTMLAnchorElement)) return;
  if (target.target && target.target !== "_self") return;

  const url = new URL(target.href, window.location.origin);
  if (url.origin !== window.location.origin) return;
  if (url.searchParams.has("devAuth")) return;

  url.searchParams.set("devAuth", devAuth);
  event.preventDefault();
  event.stopPropagation();
  window.location.href = url.toString();
};

if (import.meta.env.DEV && typeof document !== "undefined") {
  document.addEventListener("click", preserveDevAuthOnLinkClick, true);
}

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
      fetch(input, init) {
        return globalThis.fetch(withDevAuthOverride(input), {
          ...(init ?? {}),
          credentials: "include",
        });
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
