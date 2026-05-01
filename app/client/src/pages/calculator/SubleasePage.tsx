/**
 * SubleasePage — Airbnb arbitrage profit calculator.
 *
 * Use case: lease a property from an owner long-term, sublet on Airbnb
 * short-term, calculate monthly net profit, payback, and ROI. Compare
 * 2–3 properties side by side.
 *
 * Layout (top → bottom):
 *   1. Header                  — title + horizon select + Try-example + Reset-all
 *   2. Portfolio summary       — 4 KPI cards (monthly net, setup, payback, period net)
 *   3. Property comparison     — side-by-side metric table (renders only with 2+ properties)
 *   4. Sensitivity chart       — occupancy 40–90% sweep, line per property + total
 *   5. Cashflow waterfall      — bars + cumulative line over the analysis horizon
 *   6. PropertyCard list       — collapsible cards, essential fields + Advanced
 *   7. Add-property / Try-example buttons
 *
 * Data flow: a single `PortfolioInputs` state object holds the array of
 * properties + the horizon. Pure derivation via `calculatePortfolio`. State
 * persists to localStorage under `sublease-portfolio-v2`.
 *
 * Single-file decision: kept as one ~1000-line file rather than splitting
 * into per-component files. Pass A trade-off study; locality of edits >
 * file-count tidiness for a single-page calculator.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Bed,
  ChevronDown,
  Info,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Navbar } from "@/components/Navbar";

import {
  EMPTY_PROPERTY,
  SLC_SUMMER_PRESET,
  calculatePortfolio,
  calculateProperty,
  type PortfolioInputs,
  type PropertyInputs,
  type PropertyOutputs,
} from "@/lib/calculator/sublease";

const STORAGE_KEY = "sublease-portfolio-v2";

const MONTH_NAMES_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SERIES_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
];

// ─── Formatters ──────────────────────────────────────────────────────────────

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  // currencySign defaults to "standard" → -$500 (not "($500)")
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // Switch to compact ($1.2M / $250K) when |n| >= 100,000 to keep KPI cards
  // legible on small viewports. Below that, full precision is fine.
  if (Math.abs(n) >= 100_000) return usdCompact.format(n);
  return usdFull.format(n);
}

function fmtPayback(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n === 0) return "Immediate";
  // Hide trailing .0 for clean integer-month values: "12 mo" not "12.0 mo".
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} mo` : `${rounded.toFixed(1)} mo`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  return `${n.toFixed(0)}%`;
}

// ─── Default state ───────────────────────────────────────────────────────────

function makeEmptyProperty(): PropertyInputs {
  return {
    id: crypto.randomUUID(),
    nickname: "",
    ...EMPTY_PROPERTY,
  };
}

function loadInitialPortfolio(): PortfolioInputs {
  if (typeof window === "undefined") {
    return { properties: [makeEmptyProperty()], analysisHorizonMonths: 3 };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { properties: [makeEmptyProperty()], analysisHorizonMonths: 3 };
    }
    const parsed = JSON.parse(raw) as PortfolioInputs;
    if (!parsed.properties || parsed.properties.length === 0) {
      return { properties: [makeEmptyProperty()], analysisHorizonMonths: 3 };
    }
    return parsed;
  } catch {
    return { properties: [makeEmptyProperty()], analysisHorizonMonths: 3 };
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SubleasePage() {
  const [portfolio, setPortfolio] = useState<PortfolioInputs>(loadInitialPortfolio);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    } catch {
      /* localStorage unavailable; ignore */
    }
  }, [portfolio]);

  const portfolioOutputs = useMemo(() => calculatePortfolio(portfolio), [portfolio]);

  const updateProperty = (id: string, updated: PropertyInputs) => {
    setPortfolio((prev) => ({
      ...prev,
      properties: prev.properties.map((property) =>
        property.id === id ? updated : property
      ),
    }));
  };

  const addProperty = () => {
    setPortfolio((prev) => ({
      ...prev,
      properties: [...prev.properties, makeEmptyProperty()],
    }));
  };

  const removeProperty = (id: string) => {
    setPortfolio((prev) => {
      const remaining = prev.properties.filter((property) => property.id !== id);
      return {
        ...prev,
        properties: remaining.length === 0 ? [makeEmptyProperty()] : remaining,
      };
    });
  };

  // Reset a single card's data back to EMPTY_PROPERTY but keep its slot
  // (and a fresh id so React's keyed-list reconciliation picks up that the
  // children genuinely changed — keeps the auto-suggest ref state from
  // leaking across).
  const resetProperty = (id: string) => {
    setPortfolio((prev) => ({
      ...prev,
      properties: prev.properties.map((property) =>
        property.id === id ? makeEmptyProperty() : property
      ),
    }));
  };

  const handleTryExample = () => {
    setPortfolio((prev) => {
      const next = [...prev.properties];
      const firstId = next[0]?.id ?? crypto.randomUUID();
      next[0] = { id: firstId, ...SLC_SUMMER_PRESET };
      return { ...prev, properties: next };
    });
  };

  const handleResetAll = () => {
    setPortfolio({
      properties: [makeEmptyProperty()],
      analysisHorizonMonths: 3,
    });
  };

  const setHorizon = (n: number) => {
    setPortfolio((prev) => ({ ...prev, analysisHorizonMonths: n }));
  };

  return (
    <>
      <Navbar />
      <main className="container pt-32 pb-16 space-y-6 font-sans tabular-nums">
        <SubleaseHeader
          horizon={portfolio.analysisHorizonMonths}
          onHorizonChange={setHorizon}
          onTryExample={handleTryExample}
          onResetAll={handleResetAll}
        />

        <PortfolioSummary outputs={portfolioOutputs} horizon={portfolio.analysisHorizonMonths} />

        <PortfolioComparison
          properties={portfolio.properties}
          outputs={portfolioOutputs.perProperty}
        />

        <SensitivityChart properties={portfolio.properties} />

        <CashflowWaterfall
          outputs={portfolioOutputs.perProperty}
          horizon={portfolio.analysisHorizonMonths}
        />

        <div className="space-y-4">
          {portfolio.properties.map((property, idx) => (
            <PropertyCard
              key={property.id}
              property={property}
              outputs={portfolioOutputs.perProperty[idx]}
              canRemove={portfolio.properties.length > 1}
              onChange={(updated) => updateProperty(property.id, updated)}
              onRemove={() => removeProperty(property.id)}
              onReset={() => resetProperty(property.id)}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={addProperty} className="gap-2">
            <Plus className="h-4 w-4" />
            Add property / 添加房源
          </Button>
          <Button variant="outline" onClick={handleTryExample} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Try example / 示例数据
          </Button>
        </div>
      </main>
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function SubleaseHeader({
  horizon,
  onHorizonChange,
  onTryExample,
  onResetAll,
}: {
  horizon: number;
  onHorizonChange: (n: number) => void;
  onTryExample: () => void;
  onResetAll: () => void;
}) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex flex-wrap items-center gap-x-2 gap-y-1">
          <Bed className="h-7 w-7 text-orange-500 shrink-0" />
          Sublease Calculator
          <span className="text-muted-foreground font-normal">/ 转租收益计算器</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Calculate Airbnb sublet profit for properties you lease from owners. /
          从业主处租来后做 Airbnb 短租的套利利润计算。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">
            Analysis horizon / 分析周期
          </Label>
          <Select value={String(horizon)} onValueChange={(v) => onHorizonChange(Number(v))}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 6, 9, 12, 18, 24].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} mo
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={onTryExample} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Try example / 示例数据
        </Button>
        <Button variant="ghost" size="sm" onClick={onResetAll} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset all / 清空
        </Button>
      </div>
    </header>
  );
}

// ─── Portfolio summary KPI cards ─────────────────────────────────────────────

function PortfolioSummary({
  outputs,
  horizon,
}: {
  outputs: ReturnType<typeof calculatePortfolio>;
  horizon: number;
}) {
  // "Empty state" = nothing entered yet. Detected by all four headline
  // numbers being exactly zero. We dim the KPI values and show a small
  // banner so the page reads as "waiting for input" rather than "loaded
  // and the deal is worthless".
  const isEmpty =
    outputs.totalMonthlyNet === 0 &&
    outputs.totalSetupCost === 0 &&
    outputs.totalPeriodNet === 0 &&
    (outputs.portfolioPaybackMonths === 0 || outputs.portfolioPaybackMonths === Infinity);

  const netColor = (n: number) =>
    isEmpty
      ? "text-muted-foreground/60"
      : n > 0
        ? "text-emerald-600"
        : n < 0
          ? "text-rose-600"
          : "text-gray-700";

  return (
    <section className="space-y-3">
      {isEmpty && (
        <p className="text-xs text-muted-foreground italic">
          Add property data below — KPIs and charts update live. /
          在下方填入房源数据,KPI 与图表会实时更新。
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total monthly net"
          labelZh="月均净利润"
          value={fmtMoney(outputs.totalMonthlyNet)}
          valueClass={netColor(outputs.totalMonthlyNet)}
          dim={isEmpty}
        />
        <KpiCard
          label="Total setup cost"
          labelZh="一次性投入"
          value={fmtMoney(outputs.totalSetupCost)}
          dim={isEmpty}
        />
        <KpiCard
          label="Portfolio payback"
          labelZh="回本月数"
          value={fmtPayback(outputs.portfolioPaybackMonths)}
          dim={isEmpty}
        />
        <KpiCard
          label={`${horizon}-mo total net`}
          labelZh={`${horizon} 月总净利`}
          value={fmtMoney(outputs.totalPeriodNet)}
          valueClass={netColor(outputs.totalPeriodNet)}
          dim={isEmpty}
        />
      </div>
    </section>
  );
}

function KpiCard({
  label,
  labelZh,
  value,
  valueClass,
  dim,
}: {
  label: string;
  labelZh: string;
  value: string;
  valueClass?: string;
  dim?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className="text-[11px] text-muted-foreground">{labelZh}</div>
        <div
          className={`mt-2 text-2xl font-bold ${
            valueClass ?? (dim ? "text-muted-foreground/60" : "")
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Comparison table (only when 2+ properties) ──────────────────────────────

function PortfolioComparison({
  properties,
  outputs,
}: {
  properties: PropertyInputs[];
  outputs: PropertyOutputs[];
}) {
  if (properties.length <= 1) return null;

  const rows: Array<{ label: string; labelZh: string; value: (o: PropertyOutputs) => string; valueClass?: (o: PropertyOutputs) => string }> = [
    {
      label: "Monthly net",
      labelZh: "月净利",
      value: (o) => fmtMoney(o.monthlyNetProfit),
      valueClass: (o) =>
        o.monthlyNetProfit > 0 ? "text-emerald-600" : o.monthlyNetProfit < 0 ? "text-rose-600" : "",
    },
    { label: "Monthly revenue", labelZh: "月营收", value: (o) => fmtMoney(o.monthlyRevenue) },
    { label: "Operating cost", labelZh: "月运营", value: (o) => fmtMoney(o.monthlyOperatingCost) },
    { label: "Setup cost", labelZh: "一次性投入", value: (o) => fmtMoney(o.totalSetupCost) },
    { label: "Payback", labelZh: "回本月数", value: (o) => fmtPayback(o.paybackMonths) },
    { label: "Annual ROI", labelZh: "年化 ROI", value: (o) => fmtPct(o.annualROI) },
    {
      label: "Total period net",
      labelZh: "周期总净利",
      value: (o) => fmtMoney(o.totalPeriodNet),
      valueClass: (o) =>
        o.totalPeriodNet > 0 ? "text-emerald-600" : o.totalPeriodNet < 0 ? "text-rose-600" : "",
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-base font-semibold mb-3">
          Property comparison / 多套对比
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                  Metric / 指标
                </th>
                {properties.map((property, idx) => (
                  <th key={property.id} className="text-right py-2 px-3 font-medium">
                    {property.nickname || `Property ${idx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">
                    {row.label}
                    <span className="text-xs text-muted-foreground/70 ml-2">{row.labelZh}</span>
                  </td>
                  {outputs.map((o, i) => (
                    <td
                      key={i}
                      className={`text-right py-2 px-3 tabular-nums ${row.valueClass?.(o) ?? ""}`}
                    >
                      {row.value(o)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sensitivity chart (occupancy 40%-90%) ───────────────────────────────────

function SensitivityChart({ properties }: { properties: PropertyInputs[] }) {
  const data = useMemo(() => {
    const rows: Array<Record<string, number>> = [];
    for (let occ = 40; occ <= 90; occ += 5) {
      const sweep = properties.map((property) =>
        calculateProperty({ ...property, occupancyRate: occ })
      );
      const row: Record<string, number> = { occupancy: occ };
      let total = 0;
      sweep.forEach((result, idx) => {
        const key = properties[idx].nickname || `Property ${idx + 1}`;
        row[key] = Math.round(result.monthlyNetProfit);
        total += result.monthlyNetProfit;
      });
      row["Total"] = Math.round(total);
      rows.push(row);
    }
    return rows;
  }, [properties]);

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-base font-semibold mb-1">
          Sensitivity to occupancy / 占用率敏感度
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Monthly net profit across a 40–90% occupancy sweep. Bold black line = portfolio total. /
          月净利润随占用率 40–90% 变化。粗黑线 = 投资组合合计。
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="occupancy"
                tickFormatter={(v) => `${v}%`}
                style={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={(v: number) => fmtMoney(v)} style={{ fontSize: 12 }} />
              <RechartsTooltip
                formatter={(v: number, name) => [fmtMoney(v), String(name)]}
                labelFormatter={(v) => `Occupancy: ${v}%`}
              />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {properties.map((property, idx) => (
                <Line
                  key={property.id}
                  type="monotone"
                  dataKey={property.nickname || `Property ${idx + 1}`}
                  stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
              {properties.length > 1 && (
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="#000"
                  strokeWidth={2.5}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Cashflow waterfall ──────────────────────────────────────────────────────

function CashflowWaterfall({
  outputs,
  horizon,
}: {
  outputs: PropertyOutputs[];
  horizon: number;
}) {
  const data = useMemo(() => {
    const rows: Array<{ month: string; monthly: number; cumulative: number }> = [];
    let cumulative = 0;
    for (let m = 0; m < horizon; m++) {
      const monthly = outputs.reduce((s, o) => s + (o.monthlyCashflows[m] ?? 0), 0);
      cumulative += monthly;
      rows.push({ month: `M${m + 1}`, monthly: Math.round(monthly), cumulative: Math.round(cumulative) });
    }
    return rows;
  }, [outputs, horizon]);

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-base font-semibold mb-1">
          Cash flow over {horizon} months / {horizon} 个月现金流
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Bars = monthly cashflow (green positive, red negative). Line = cumulative. /
          柱状 = 当月现金流(正绿负红),折线 = 累计。
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" style={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => fmtMoney(v)} style={{ fontSize: 12 }} />
              <RechartsTooltip
                formatter={(v: number, name) => [fmtMoney(v), String(name)]}
              />
              <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="monthly" name="Monthly cashflow / 当月">
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.monthly >= 0 ? "#10B981" : "#EF4444"} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Cumulative / 累计"
                stroke="#3B82F6"
                strokeWidth={2}
                dot
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Property card ───────────────────────────────────────────────────────────

function PropertyCard({
  property,
  outputs,
  canRemove,
  onChange,
  onRemove,
  onReset,
}: {
  property: PropertyInputs;
  outputs: PropertyOutputs;
  canRemove: boolean;
  onChange: (p: PropertyInputs) => void;
  onRemove: () => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Track what we've auto-suggested for offSeasonAdr so we can keep updating
  // it while peakAdr changes — but stop the moment the user types over it.
  const lastAutoOffAdrRef = useRef<number | null>(null);

  // Auto-suggest off-season ADR ≈ 56% of peak ADR. Fires when peakAdr
  // changes and offSeasonAdr is still 0 OR is exactly the value we last
  // suggested (i.e. user hasn't manually overridden it).
  useEffect(() => {
    if (property.peakAdr <= 0) return;
    const suggested = Math.round(property.peakAdr * 0.56);
    const offUntouchedByUser =
      property.offSeasonAdr === 0 ||
      property.offSeasonAdr === lastAutoOffAdrRef.current;
    if (!offUntouchedByUser) return;
    if (property.offSeasonAdr === suggested) return;
    lastAutoOffAdrRef.current = suggested;
    onChange({ ...property, offSeasonAdr: suggested });
    // Intentionally only depend on peakAdr — onChange/property change every
    // render and would create an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.peakAdr]);

  const offAdrHint =
    property.peakAdr > 0
      ? `Auto: ~$${Math.round(property.peakAdr * 0.56)} (56% of peak)`
      : undefined;

  const netColor =
    outputs.monthlyNetProfit > 0
      ? "text-emerald-600"
      : outputs.monthlyNetProfit < 0
        ? "text-rose-600"
        : "text-gray-700";

  const set = <K extends keyof PropertyInputs>(key: K, v: PropertyInputs[K]) =>
    onChange({ ...property, [key]: v });

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-5">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex-1 flex items-center gap-3 text-left"
            onClick={() => setExpanded((e) => !e)}
          >
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                expanded ? "rotate-0" : "-rotate-90"
              }`}
            />
            <div>
              <h2 className="text-base font-semibold">
                {property.nickname || "Untitled property / 未命名"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Monthly net / 月净利:{" "}
                <span className={`font-medium ${netColor}`}>
                  {fmtMoney(outputs.monthlyNetProfit)}
                </span>
                {" · "}
                Payback / 回本: {fmtPayback(outputs.paybackMonths)}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onReset}
              aria-label="Reset this property"
              title="Reset this card / 重置此卡"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canRemove}
              onClick={onRemove}
              aria-label="Remove property"
              title={canRemove ? "Remove property / 删除房源" : undefined}
            >
              {canRemove ? <Trash2 className="h-4 w-4" /> : <X className="h-4 w-4 opacity-30" />}
            </Button>
          </div>
        </header>

        {expanded && (
          <div className="mt-5 space-y-6">
            {/* === Essential fields (always visible) ===================== */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Property nickname"
                labelZh="房源昵称"
                value={property.nickname}
                onChange={(v) => set("nickname", v)}
                placeholder="e.g. SLC summer A"
              />
              <div /> {/* spacer to keep the 2-col rhythm */}

              <NumField
                label="Monthly rent to owner"
                labelZh="付给业主月租"
                value={property.monthlyRentToOwner}
                onChange={(v) => set("monthlyRentToOwner", v)}
                step={50}
                suffix="$/mo"
                placeholder="800"
                tooltip="What you pay the property owner each month. SLC summer studio typical: $700–1,000 / 你每月付给业主的租金,SLC 夏季单间典型 $700–1,000"
              />
              <NumField
                label="Lease length"
                labelZh="签约月数"
                value={property.leaseLengthMonths}
                onChange={(v) => set("leaseLengthMonths", v)}
                min={1}
                max={24}
                suffix="mo"
                placeholder="3"
                tooltip="Typical SLC summer sublet: 3 months. Longer term reduces per-month risk but increases total exposure. / 典型 SLC 暑假转租 3 个月。期限越长每月风险越低但总敞口越大"
              />

              <NumField
                label="Peak ADR"
                labelZh="旺季每晚"
                value={property.peakAdr}
                onChange={(v) => set("peakAdr", v)}
                step={5}
                suffix="$/night"
                placeholder="90"
                tooltip="Average daily rate during peak season. SLC summer (May–Sep): $80–120 / 旺季每晚均价。SLC 夏季典型 $80–120"
              />
              <NumField
                label="Off-season ADR"
                labelZh="淡季每晚"
                value={property.offSeasonAdr}
                onChange={(v) => {
                  // User typed → stop auto-suggesting; remember new value
                  lastAutoOffAdrRef.current = null;
                  set("offSeasonAdr", v);
                }}
                step={5}
                suffix="$/night"
                placeholder="50"
                hint={offAdrHint}
              />

              <PctField
                label="Occupancy rate"
                labelZh="占用率"
                value={property.occupancyRate}
                onChange={(v) => set("occupancyRate", v)}
                step={1}
                max={100}
                placeholder="70"
                tooltip="Estimated % of nights booked. Realistic SLC summer: 60–75%. Conservative new listing: 50–60% / 估算每月入住率。SLC 夏季现实 60–75%,新房源保守估 50–60%"
              />
              <div /> {/* spacer */}
            </section>

            {/* === Advanced (collapsed by default) ======================= */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                  Advanced settings / 高级设置
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-6">
                <Section title="Setup cost / 一次性投入">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <NumField
                      label="Furniture"
                      labelZh="家具"
                      value={property.furnitureCost}
                      onChange={(v) => set("furnitureCost", v)}
                      step={50}
                      suffix="$"
                    />
                    <NumField
                      label="Renovation"
                      labelZh="装修"
                      value={property.renovationCost}
                      onChange={(v) => set("renovationCost", v)}
                      step={100}
                      suffix="$"
                    />
                    <NumField
                      label="Initial deep clean"
                      labelZh="首次深度清洁"
                      value={property.initialDeepClean}
                      onChange={(v) => set("initialDeepClean", v)}
                      step={20}
                      suffix="$"
                    />
                    <NumField
                      label="Photography"
                      labelZh="拍照费"
                      value={property.photographyCost}
                      onChange={(v) => set("photographyCost", v)}
                      step={20}
                      suffix="$"
                    />
                  </div>
                </Section>

                <Section title="Revenue tuning / 收入参数微调">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MonthRangeField
                      label="Peak season"
                      labelZh="旺季月份"
                      startMonth={property.peakSeasonStartMonth}
                      endMonth={property.peakSeasonEndMonth}
                      onStartChange={(v) => set("peakSeasonStartMonth", v)}
                      onEndChange={(v) => set("peakSeasonEndMonth", v)}
                      tooltip="Wraps around year-end (e.g. Nov→Feb is valid) / 可跨年(如 11月→2月)"
                    />
                    <NumField
                      label="Avg nights / booking"
                      labelZh="平均每次入住"
                      value={property.avgNightsPerBooking}
                      onChange={(v) => set("avgNightsPerBooking", v)}
                      step={0.5}
                      min={1}
                      suffix="nights"
                    />
                  </div>
                </Section>

                <Section title="Lease details / 合同细节">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumField
                      label="Initial deposit"
                      labelZh="押金"
                      value={property.initialDeposit}
                      onChange={(v) => set("initialDeposit", v)}
                      step={50}
                      suffix="$"
                    />
                    <ToggleField
                      label="Deposit refundable"
                      labelZh="押金可退"
                      checked={property.depositRefundable}
                      onChange={(v) => set("depositRefundable", v)}
                    />
                  </div>
                </Section>

                <Section title="Operating cost / 月运营成本">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <NumField
                      label="Utilities"
                      labelZh="水电网"
                      value={property.utilities}
                      onChange={(v) => set("utilities", v)}
                      step={10}
                      suffix="$/mo"
                      disabled={property.utilitiesIncludedInLease}
                    />
                    <ToggleField
                      label="Utilities incl. in lease"
                      labelZh="业主包水电"
                      checked={property.utilitiesIncludedInLease}
                      onChange={(v) => set("utilitiesIncludedInLease", v)}
                    />
                    <NumField
                      label="Cleaning per turnover"
                      labelZh="每次清洁"
                      value={property.cleaningPerTurnover}
                      onChange={(v) => set("cleaningPerTurnover", v)}
                      step={5}
                      suffix="$"
                      disabled={property.cleaningPassedToGuest}
                    />
                    <ToggleField
                      label="Cleaning passed to guest"
                      labelZh="清洁费转嫁客人"
                      checked={property.cleaningPassedToGuest}
                      onChange={(v) => set("cleaningPassedToGuest", v)}
                    />
                    <NumField
                      label="Supplies"
                      labelZh="日用品"
                      value={property.supplies}
                      onChange={(v) => set("supplies", v)}
                      step={10}
                      suffix="$/mo"
                    />
                    <NumField
                      label="Maintenance reserve"
                      labelZh="维修预留"
                      value={property.maintenanceReserve}
                      onChange={(v) => set("maintenanceReserve", v)}
                      step={10}
                      suffix="$/mo"
                    />
                    <NumField
                      label="STR insurance"
                      labelZh="短租保险"
                      value={property.strInsurance}
                      onChange={(v) => set("strInsurance", v)}
                      step={5}
                      suffix="$/mo"
                    />
                  </div>
                </Section>

                <Section title="Risk / 风险">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PctField
                      label="Damage / deposit hold rate"
                      labelZh="押金扣除概率"
                      value={property.damageDepositHoldRate}
                      onChange={(v) => set("damageDepositHoldRate", v)}
                      step={0.5}
                      max={50}
                      tooltip="Approx % of revenue lost to damage holds / 估计每月有多少营收被押金扣留"
                    />
                  </div>
                </Section>

                <Section title="Platform & tax / 平台与税">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <NumField
                      label="Airbnb host fee"
                      labelZh="Airbnb 抽佣"
                      value={property.airbnbHostFeeRate * 100}
                      onChange={(v) => set("airbnbHostFeeRate", v / 100)}
                      step={0.5}
                      max={20}
                      suffix="%"
                      tooltip="Locked at 3% by default / 默认 3%"
                    />
                    <ToggleField
                      label="Lodging tax handled by Airbnb"
                      labelZh="Airbnb 代收住宿税"
                      checked={property.lodgingTaxHandledByAirbnb}
                      onChange={(v) => set("lodgingTaxHandledByAirbnb", v)}
                    />
                    {!property.lodgingTaxHandledByAirbnb && (
                      <PctField
                        label="Manual lodging tax"
                        labelZh="手动住宿税率"
                        value={property.manualLodgingTaxRate}
                        onChange={(v) => set("manualLodgingTaxRate", v)}
                        step={0.5}
                        max={30}
                      />
                    )}
                    <PctField
                      label="Income tax"
                      labelZh="所得税率"
                      value={property.incomeTaxRate}
                      onChange={(v) => set("incomeTaxRate", v)}
                      step={1}
                      max={50}
                    />
                  </div>
                </Section>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Field primitives ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function FieldHeader({
  label,
  labelZh,
  tooltip,
}: {
  label: string;
  labelZh?: string;
  tooltip?: string;
}) {
  return (
    <Label className="text-sm flex items-center gap-1">
      <span>{label}</span>
      {labelZh && <span className="text-muted-foreground font-normal">/ {labelZh}</span>}
      {tooltip && <InfoTooltip content={tooltip} />}
    </Label>
  );
}

function NumField({
  label,
  labelZh,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
  tooltip,
  hint,
  placeholder = "0",
  disabled,
}: {
  label: string;
  labelZh?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  tooltip?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  // Display empty string for 0 so the placeholder shows; prevents "0150"
  // prefix-residue when typing into a value="0" field.
  const displayValue = !Number.isFinite(value) || value === 0 ? "" : value;
  return (
    <div className="space-y-1.5">
      <FieldHeader label={label} labelZh={labelZh} tooltip={tooltip} />
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(0);
              return;
            }
            const v = parseFloat(raw);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className={`${suffix ? "pr-12" : ""} no-spinner tabular-nums`.trim()}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function PctField({
  label,
  labelZh,
  value,
  onChange,
  step = 1,
  max,
  tooltip,
  hint,
  placeholder,
}: {
  label: string;
  labelZh?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  max?: number;
  tooltip?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <NumField
      label={label}
      labelZh={labelZh}
      value={value}
      onChange={onChange}
      step={step}
      max={max}
      suffix="%"
      hint={hint}
      tooltip={tooltip}
      placeholder={placeholder}
    />
  );
}

function TextField({
  label,
  labelZh,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  labelZh?: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldHeader label={label} labelZh={labelZh} />
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ToggleField({
  label,
  labelZh,
  checked,
  onChange,
  tooltip,
}: {
  label: string;
  labelZh?: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  tooltip?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldHeader label={label} labelZh={labelZh} tooltip={tooltip} />
      <div className="flex items-center h-9">
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

function MonthRangeField({
  label,
  labelZh,
  startMonth,
  endMonth,
  onStartChange,
  onEndChange,
  tooltip,
}: {
  label: string;
  labelZh?: string;
  startMonth: number;
  endMonth: number;
  onStartChange: (n: number) => void;
  onEndChange: (n: number) => void;
  tooltip?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldHeader label={label} labelZh={labelZh} tooltip={tooltip} />
      <div className="flex items-center gap-2">
        <Select value={String(startMonth)} onValueChange={(v) => onStartChange(Number(v))}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES_EN.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">→</span>
        <Select value={String(endMonth)} onValueChange={(v) => onEndChange(Number(v))}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES_EN.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help inline-block ml-0.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{content}</TooltipContent>
    </Tooltip>
  );
}
