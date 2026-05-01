import { AlertTriangle } from "lucide-react";

/**
 * Site-wide red banner shown above any view that's currently rendering mock /
 * demo data instead of a real database row. Required by the project memory rule:
 * mock data must be visually distinct from production listings.
 */
export function MockDataBanner({ source }: { source?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border border-red-300 bg-red-50 text-red-900 rounded-lg px-4 py-3 flex items-start gap-3 shadow-sm"
    >
      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" aria-hidden />
      <div className="text-sm leading-relaxed">
        <strong className="font-semibold">Demo data — not real listings.</strong>
        <span className="text-red-800/90"> 演示数据,非真实房源。</span>
        <span className="block mt-1 text-red-700/80 text-xs">
          {source
            ? `Source: ${source}. Real Craigslist / Reddit / manual entries land in R3.`
            : "Real Craigslist / Reddit / manual entries land in R3. We're still showing curated examples for now."}
        </span>
      </div>
    </div>
  );
}
