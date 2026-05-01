import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DailyStat,
  Filters,
  Listing,
  ListingsResponse,
  MonthlyStat,
  Summary,
} from "./types";
import { DEFAULT_FILTERS } from "./types";
import { fmtMoney, fmtMoneyFull, fmtNumber, fmtRelativeTime } from "./format";

type Tab = "listings" | "daily" | "trend";

const TAB_LABELS: Record<Tab, string> = {
  listings: "All listings",
  daily: "Daily new",
  trend: "Monthly trend",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("listings");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/summary")
      .then((r) => r.json())
      .then((data: Summary) => {
        if (!cancelled) setSummary(data);
      })
      .catch((e) => {
        if (!cancelled) setSummaryError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold tracking-tight">Lehi Listings Monitor</h1>
          <p className="mt-1 text-sm text-neutral-600">
            84043 / Traverse Mountain / Morning Vista area · scraped from Realtor.com
          </p>
          {summary && <SummaryStrip summary={summary} />}
          {summaryError && (
            <p className="mt-2 text-sm text-red-600">
              Could not reach API ({summaryError}). Is <code>npm run viewer</code>{" "}
              running?
            </p>
          )}
        </div>
      </header>

      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "border-b-2 border-blue-600 px-4 py-3 text-sm font-medium text-blue-600"
                  : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              }
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {tab === "listings" && <ListingsTab />}
        {tab === "daily" && <DailyTab />}
        {tab === "trend" && <TrendTab />}
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-neutral-500">
        Local-only tool · data scraped from Realtor.com public search results · run{" "}
        <code className="rounded bg-neutral-100 px-1">npm run scrape</code> to refresh.
      </footer>
    </div>
  );
}

function SummaryStrip({ summary }: { summary: Summary }) {
  const totals = summary.totals ?? {};
  const lastRun = summary.lastRun;
  return (
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-700">
      <span>
        <strong className="tabular-nums">{totals.total ?? 0}</strong> listings tracked
      </span>
      <span>
        <span className="text-emerald-700 tabular-nums">{totals.for_sale ?? 0}</span> for
        sale
      </span>
      <span>
        <span className="text-amber-700 tabular-nums">{totals.pending ?? 0}</span> pending
      </span>
      <span>
        <span className="text-neutral-600 tabular-nums">{totals.sold ?? 0}</span> sold
      </span>
      <span>
        Avg{" "}
        <span className="tabular-nums">{fmtMoney(totals.avg_price ?? null)}</span>
      </span>
      {lastRun && (
        <span>
          Last scrape:{" "}
          <span className="tabular-nums">{fmtRelativeTime(lastRun.started_at)}</span>
          {" · "}
          <span
            className={
              lastRun.status === "success"
                ? "text-emerald-700"
                : lastRun.status === "partial"
                  ? "text-amber-700"
                  : lastRun.status === "running"
                    ? "text-blue-700"
                    : "text-red-700"
            }
          >
            {lastRun.status}
          </span>
        </span>
      )}
    </div>
  );
}

// ─── Listings tab ────────────────────────────────────────────────────────────

function ListingsTab() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", filters.status);
    params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice < 99_999_999)
      params.set("maxPrice", String(filters.maxPrice));
    if (filters.minBed > 0) params.set("minBed", String(filters.minBed));
    if (filters.minBath > 0) params.set("minBath", String(filters.minBath));
    if (filters.minLotSqft > 0) params.set("minLotSqft", String(filters.minLotSqft));
    if (filters.maxDistanceMi < 999)
      params.set("maxDistanceMi", String(filters.maxDistanceMi));
    params.set("sortBy", filters.sortBy);
    params.set("order", filters.order);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/listings?${query}`)
      .then((r) => r.json())
      .then((d: ListingsResponse) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <FiltersPanel filters={filters} onChange={setFilters} />
      <div>
        <div className="mb-3 flex items-center justify-between text-sm text-neutral-600">
          <span>
            {loading
              ? "Loading…"
              : data
                ? `${data.count} listings match`
                : "—"}
          </span>
          {error && <span className="text-red-600">Error: {error}</span>}
        </div>
        {data && data.listings.length === 0 && !loading && <EmptyState />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data?.listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-neutral-700">No listings match these filters.</p>
      <p className="mt-2 text-sm text-neutral-500">
        If you haven't scraped yet, run{" "}
        <code className="rounded bg-neutral-100 px-1">npm run scrape</code>{" "}
        (or{" "}
        <code className="rounded bg-neutral-100 px-1">npm run scrape:mock</code>{" "}
        for synthetic data).
      </p>
    </div>
  );
}

function FiltersPanel({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <aside className="space-y-4 rounded-lg border bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-700">Filters</h2>

      <Field label="Status">
        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
          className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="for_sale">For sale</option>
          <option value="pending">Pending</option>
          <option value="sold">Sold</option>
        </select>
      </Field>

      <Field label="Price range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.minPrice || ""}
            placeholder="0"
            onChange={(e) => set("minPrice", parseInt(e.target.value || "0", 10))}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm tabular-nums"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="number"
            value={filters.maxPrice >= 99_999_999 ? "" : filters.maxPrice}
            placeholder="any"
            onChange={(e) =>
              set(
                "maxPrice",
                e.target.value ? parseInt(e.target.value, 10) : 99_999_999
              )
            }
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm tabular-nums"
          />
        </div>
      </Field>

      <Field label="Min bed">
        <SelectNum
          value={filters.minBed}
          options={[0, 1, 2, 3, 4, 5]}
          formatLabel={(n) => (n === 0 ? "Any" : `${n}+`)}
          onChange={(n) => set("minBed", n)}
        />
      </Field>

      <Field label="Min bath">
        <SelectNum
          value={filters.minBath}
          options={[0, 1, 1.5, 2, 2.5, 3]}
          formatLabel={(n) => (n === 0 ? "Any" : `${n}+`)}
          onChange={(n) => set("minBath", n)}
        />
      </Field>

      <Field label="Min lot (sqft)">
        <SelectNum
          value={filters.minLotSqft}
          options={[0, 2000, 4000, 6000, 8000, 10000, 20000]}
          formatLabel={(n) => (n === 0 ? "Any" : fmtNumber(n))}
          onChange={(n) => set("minLotSqft", n)}
        />
      </Field>

      <Field label={`Max distance ${filters.maxDistanceMi >= 999 ? "" : `(≤ ${filters.maxDistanceMi} mi)`}`}>
        <input
          type="range"
          min={0}
          max={15}
          step={0.5}
          value={filters.maxDistanceMi >= 999 ? 15 : filters.maxDistanceMi}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            set("maxDistanceMi", v >= 15 ? 999 : v);
          }}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>0 mi</span>
          <span>15+ mi</span>
        </div>
      </Field>

      <Field label="Sort by">
        <select
          value={`${filters.sortBy}:${filters.order}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split(":") as [
              Filters["sortBy"],
              Filters["order"],
            ];
            onChange({ ...filters, sortBy, order });
          }}
          className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="first_seen_at:desc">Newest first</option>
          <option value="first_seen_at:asc">Oldest first</option>
          <option value="price:asc">Price ↑</option>
          <option value="price:desc">Price ↓</option>
          <option value="distance_to_morning_vista_mi:asc">Closest to Morning Vista</option>
          <option value="sqft:desc">Biggest sqft first</option>
        </select>
      </Field>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm hover:bg-neutral-100"
      >
        Reset filters
      </button>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-neutral-600">{label}</label>
      {children}
    </div>
  );
}

function SelectNum({
  value,
  options,
  formatLabel,
  onChange,
}: {
  value: number;
  options: number[];
  formatLabel: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {formatLabel(opt)}
        </option>
      ))}
    </select>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const accent =
    listing.listing_status === "for_sale"
      ? "bg-emerald-50 text-emerald-700"
      : listing.listing_status === "pending"
        ? "bg-amber-50 text-amber-700"
        : listing.listing_status === "sold"
          ? "bg-neutral-100 text-neutral-600"
          : "bg-neutral-100 text-neutral-600";

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-neutral-900">{listing.address}</p>
          <p className="text-xs text-neutral-500">
            {listing.city ?? "—"}, UT {listing.zip}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${accent}`}
        >
          {listing.listing_status.replace("_", " ")}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tabular-nums text-neutral-900">
        {fmtMoneyFull(listing.price)}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-700 tabular-nums">
        {listing.bed !== null && <span>{listing.bed} bed</span>}
        {listing.bath !== null && <span>{listing.bath} bath</span>}
        {listing.sqft !== null && <span>{fmtNumber(listing.sqft)} sqft</span>}
        {listing.lot_sqft !== null && listing.lot_sqft > 0 && (
          <span>{fmtNumber(listing.lot_sqft)} lot</span>
        )}
        {listing.year_built !== null && <span>built {listing.year_built}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span className="tabular-nums">
          {listing.distance_to_morning_vista_mi !== null
            ? `${listing.distance_to_morning_vista_mi.toFixed(2)} mi from Morning Vista`
            : "distance unknown"}
        </span>
        <span>{fmtRelativeTime(listing.first_seen_at)}</span>
      </div>
    </a>
  );
}

// ─── Daily tab ───────────────────────────────────────────────────────────────

function DailyTab() {
  const [data, setData] = useState<DailyStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats/daily?days=30")
      .then((r) => r.json())
      .then((d: DailyStat[]) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!data) return <p>Loading…</p>;
  if (data.length === 0)
    return (
      <div className="rounded-lg border border-dashed bg-white p-8 text-center">
        <p>No listings have been seen yet.</p>
        <p className="mt-2 text-sm text-neutral-500">
          Run <code className="rounded bg-neutral-100 px-1">npm run scrape</code> first.
        </p>
      </div>
    );

  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="mb-1 text-base font-semibold">New listings per day (last 30 days)</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Counts the number of distinct listings whose <code>first_seen_at</code> fell on
        each calendar date.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" style={{ fontSize: 12 }} />
            <YAxis style={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="new_listings"
              name="New listings"
              stroke="#2563eb"
              strokeWidth={2}
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ─── Trend tab ───────────────────────────────────────────────────────────────

function TrendTab() {
  const [data, setData] = useState<MonthlyStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats/median-by-month")
      .then((r) => r.json())
      .then((d: MonthlyStat[]) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!data) return <p>Loading…</p>;
  if (data.length === 0)
    return (
      <div className="rounded-lg border border-dashed bg-white p-8 text-center">
        <p>No price-trend data yet — needs at least one month of listings.</p>
      </div>
    );

  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="mb-1 text-base font-semibold">Median list price by month</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Median price grouped by the month the listing was first seen.
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" style={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v: number) => fmtMoney(v)}
              style={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(v: number, name) => [fmtMoneyFull(v), String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="median_price"
              name="Median"
              stroke="#dc2626"
              strokeWidth={2}
              dot
            />
            <Line
              type="monotone"
              dataKey="avg_price"
              name="Average"
              stroke="#2563eb"
              strokeWidth={1.5}
              dot
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
