declare global {
  interface Window {
    umami?: {
      track?: (eventName: string, eventData?: Record<string, unknown>) => void;
    };
  }
}

let analyticsInjected = false;

/**
 * Inject the Umami analytics script tag if both env vars are configured.
 * Called once from main.tsx. No-ops silently when vars are absent or if
 * already injected (guards against Vite HMR re-execution).
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  if (analyticsInjected) return;

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;

  if (!endpoint || !websiteId) return;

  analyticsInjected = true;
  const s = document.createElement("script");
  s.defer = true;
  s.src = `${endpoint}/umami`;
  s.setAttribute("data-website-id", websiteId);
  document.head.appendChild(s);
}

export function trackEvent(
  eventName: string,
  eventData?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  try {
    window.umami?.track?.(eventName, eventData);
  } catch {
    // Best-effort analytics should never affect the product flow.
  }
}

export {};
