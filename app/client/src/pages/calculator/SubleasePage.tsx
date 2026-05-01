import { useState, useMemo, useEffect } from "react";
import { Bed, ChevronDown, RotateCcw, TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

import {
  DEFAULT_SUBLEASE_INPUT,
  SubleaseInputSchema,
  calculateSublease,
  type SubleaseInput,
} from "@/lib/calculator/sublease";

const STORAGE_KEY = "bridgestay:sublease-calc:v1";

function safeUSD(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function safePct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function loadStoredInput(): SubleaseInput {
  if (typeof window === "undefined") return DEFAULT_SUBLEASE_INPUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SUBLEASE_INPUT;
    const parsed = SubleaseInputSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SUBLEASE_INPUT;
  } catch {
    return DEFAULT_SUBLEASE_INPUT;
  }
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  // Display empty string for 0 so the placeholder shows; this prevents the
  // "0150" prefix-residue users see when they type into a value="0" field.
  // Non-zero defaults (e.g. vacancyRate=5, cleaning=50) still render normally.
  const displayValue = !Number.isFinite(value) || value === 0 ? "" : value;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          value={displayValue}
          placeholder="0"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(0);
              return;
            }
            const v = parseFloat(raw);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className={suffix ? "pr-12 no-spinner tabular-nums" : "no-spinner tabular-nums"}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PctField({
  label,
  value,
  onChange,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <NumField
      label={label}
      value={value * 100}
      onChange={(n) => onChange(n / 100)}
      step={step}
      suffix="%"
      hint={hint}
    />
  );
}

export default function SubleasePage() {
  const { t } = useLanguage();
  const [inputs, setInputs] = useState<SubleaseInput>(loadStoredInput());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sensitivityRent, setSensitivityRent] = useState<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      /* localStorage unavailable; ignore */
    }
  }, [inputs]);

  const out = useMemo(() => calculateSublease(inputs), [inputs]);

  const update = <K extends keyof SubleaseInput>(key: K) => (v: SubleaseInput[K]) =>
    setInputs((prev) => ({ ...prev, [key]: v }));

  const reset = () => {
    setInputs(DEFAULT_SUBLEASE_INPUT);
    setSensitivityRent(null);
  };

  const sensitivityBase = sensitivityRent ?? inputs.expectedRent;
  const sensitivityData = useMemo(() => {
    const base = inputs.expectedRent;
    const points: Array<{ rent: number; profit: number }> = [];
    const min = base * 0.8;
    const max = base * 1.2;
    const steps = 41;
    for (let i = 0; i < steps; i++) {
      const rent = min + ((max - min) * i) / (steps - 1);
      const r = calculateSublease({ ...inputs, expectedRent: rent });
      points.push({ rent: Math.round(rent), profit: Math.round(r.monthlyNetProfit) });
    }
    return points;
  }, [inputs]);

  const profitColor = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-gray-700");
  const paybackColor = (n: number) =>
    !Number.isFinite(n) ? "text-rose-600" : n <= 12 ? "text-emerald-600" : n <= 24 ? "text-amber-600" : "text-rose-600";

  const paybackDisplay = !Number.isFinite(out.paybackMonths)
    ? t("sublease.kpi.never")
    : `${out.paybackMonths} ${t("sublease.kpi.months")}`;

  return (
    <>
      <Navbar />
      <main className="container pt-32 pb-16 space-y-6 font-sans tabular-nums">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bed className="h-8 w-8 text-orange-500" />
              {t("sublease.title")}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">{t("sublease.subtitle")}</p>
          </div>
          <Button variant="outline" onClick={reset} className="gap-2 self-start">
            <RotateCcw className="h-4 w-4" />
            {t("sublease.reset")}
          </Button>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("sublease.kpi.monthlyNet")}
              </div>
              <div className={`mt-2 text-3xl font-bold ${profitColor(out.monthlyNetProfit)}`}>
                {safeUSD(out.monthlyNetProfit)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("sublease.kpi.annual")}: {safeUSD(out.annualNetProfit)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("sublease.kpi.payback")}
              </div>
              <div className={`mt-2 text-3xl font-bold ${paybackColor(out.paybackMonths)}`}>
                {paybackDisplay}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("sublease.kpi.upfrontInvest")}: {safeUSD(inputs.setupCost + inputs.securityDeposit)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("sublease.kpi.annualROI")}
              </div>
              <div className={`mt-2 text-3xl font-bold ${profitColor(out.annualROI)}`}>
                {safePct(out.annualROI)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                NPV: {safeUSD(out.npv)}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sublease.form.title")}</CardTitle>
            <CardDescription>{t("sublease.form.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-700">{t("sublease.form.leaseIn")}</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumField
                  label={t("sublease.f.leaseInRent")}
                  value={inputs.leaseInRent}
                  onChange={update("leaseInRent")}
                  step={50}
                  suffix="$"
                  hint={t("sublease.f.leaseInRent.hint")}
                />
                <NumField
                  label={t("sublease.f.leaseTermMonths")}
                  value={inputs.leaseTermMonths}
                  onChange={update("leaseTermMonths")}
                />
                <NumField
                  label={t("sublease.f.securityDeposit")}
                  value={inputs.securityDeposit}
                  onChange={update("securityDeposit")}
                  step={50}
                  suffix="$"
                />
                <NumField
                  label={t("sublease.f.setupCost")}
                  value={inputs.setupCost}
                  onChange={update("setupCost")}
                  step={100}
                  suffix="$"
                  hint={t("sublease.f.setupCost.hint")}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-700">{t("sublease.form.leaseOut")}</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NumField
                  label={t("sublease.f.expectedRent")}
                  value={inputs.expectedRent}
                  onChange={update("expectedRent")}
                  step={50}
                  suffix="$"
                  hint={t("sublease.f.expectedRent.hint")}
                />
                <PctField
                  label={t("sublease.f.vacancyRate")}
                  value={inputs.vacancyRate}
                  onChange={update("vacancyRate")}
                  step={1}
                />
                <PctField
                  label={t("sublease.f.platformFee")}
                  value={inputs.platformFee}
                  onChange={update("platformFee")}
                  step={1}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-700">{t("sublease.form.operating")}</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NumField label={t("sublease.f.utilities")} value={inputs.utilities} onChange={update("utilities")} step={10} suffix="$" />
                <NumField label={t("sublease.f.cleaning")} value={inputs.cleaning} onChange={update("cleaning")} step={10} suffix="$" />
                <NumField label={t("sublease.f.other")} value={inputs.other} onChange={update("other")} step={10} suffix="$" />
              </div>
            </fieldset>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                  <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  {t("sublease.form.advanced")}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PctField
                    label={t("sublease.f.rentEscalation")}
                    value={inputs.rentEscalation}
                    onChange={update("rentEscalation")}
                    step={0.5}
                    hint={t("sublease.f.rentEscalation.hint")}
                  />
                  <PctField
                    label={t("sublease.f.priceGrowth")}
                    value={inputs.priceGrowth}
                    onChange={update("priceGrowth")}
                    step={0.5}
                    hint={t("sublease.f.priceGrowth.hint")}
                  />
                  <PctField
                    label={t("sublease.f.discountRate")}
                    value={inputs.discountRate}
                    onChange={update("discountRate")}
                    step={0.5}
                    hint={t("sublease.f.discountRate.hint")}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Max Breakeven Rent */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-600" />
              {t("sublease.breakeven.title")}
            </CardTitle>
            <CardDescription className="text-gray-700">
              {t("sublease.breakeven.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BreakevenCard
                tone="warn"
                icon={AlertTriangle}
                label={t("sublease.breakeven.tier.breakeven")}
                margin={t("sublease.breakeven.margin0")}
                value={out.maxBreakevenRent.breakeven}
              />
              <BreakevenCard
                tone="primary"
                icon={CheckCircle2}
                label={t("sublease.breakeven.tier.healthy")}
                margin={t("sublease.breakeven.margin20")}
                value={out.maxBreakevenRent.healthy}
                highlight
              />
              <BreakevenCard
                tone="excellent"
                icon={TrendingUp}
                label={t("sublease.breakeven.tier.excellent")}
                margin={t("sublease.breakeven.margin35")}
                value={out.maxBreakevenRent.excellent}
              />
            </div>
            <p className="mt-4 text-sm text-gray-700">
              <strong>{t("sublease.breakeven.decisionLine")}</strong>{" "}
              <span className="text-gray-600">{t("sublease.breakeven.decisionExplain")}</span>
            </p>
          </CardContent>
        </Card>

        {/* Sensitivity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sublease.sensitivity.title")}</CardTitle>
            <CardDescription>{t("sublease.sensitivity.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>
                  {t("sublease.sensitivity.simulate")}: <strong>{safeUSD(sensitivityBase)}</strong>
                </span>
                <span className="text-muted-foreground">
                  {t("sublease.sensitivity.range")}: {safeUSD(inputs.expectedRent * 0.8)} – {safeUSD(inputs.expectedRent * 1.2)}
                </span>
              </div>
              <Slider
                min={Math.round(inputs.expectedRent * 0.8)}
                max={Math.round(inputs.expectedRent * 1.2)}
                step={10}
                value={[Math.round(sensitivityBase)]}
                onValueChange={(v) => setSensitivityRent(v[0])}
              />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensitivityData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="rent"
                    tickFormatter={(v) => `$${v}`}
                    style={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(v) => `$${v}`} style={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: number) => [safeUSD(v), t("sublease.sensitivity.profitTooltip")]}
                    labelFormatter={(v) => `${t("sublease.sensitivity.rentTooltip")}: ${safeUSD(Number(v))}`}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
                  <ReferenceLine x={Math.round(sensitivityBase)} stroke="#f97316" strokeDasharray="2 2" />
                  <Line type="monotone" dataKey="profit" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cashflow table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sublease.cashflow.title")}</CardTitle>
            <CardDescription>{t("sublease.cashflow.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("sublease.cashflow.col.month")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("sublease.cashflow.col.leaseIn")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("sublease.cashflow.col.leaseOut")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("sublease.cashflow.col.operating")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("sublease.cashflow.col.net")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("sublease.cashflow.col.cumulative")}</th>
                  </tr>
                </thead>
                <tbody>
                  {out.cashflowSchedule.map((row) => (
                    <tr key={row.month} className="odd:bg-gray-50/40">
                      <td className="px-3 py-1.5">{row.month}</td>
                      <td className="px-3 py-1.5 text-right">{safeUSD(row.leaseIn)}</td>
                      <td className="px-3 py-1.5 text-right">{safeUSD(row.leaseOut)}</td>
                      <td className="px-3 py-1.5 text-right">{safeUSD(row.operating)}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${profitColor(row.net)}`}>
                        {safeUSD(row.net)}
                      </td>
                      <td className={`px-3 py-1.5 text-right font-medium ${profitColor(row.cumulative)}`}>
                        {safeUSD(row.cumulative)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function BreakevenCard({
  tone,
  icon: Icon,
  label,
  margin,
  value,
  highlight,
}: {
  tone: "warn" | "primary" | "excellent";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  margin: string;
  value: number;
  highlight?: boolean;
}) {
  const colors = {
    warn: { ring: "border-amber-200", icon: "text-amber-600", text: "text-amber-700" },
    primary: { ring: "border-orange-300", icon: "text-orange-600", text: "text-orange-700" },
    excellent: { ring: "border-emerald-200", icon: "text-emerald-600", text: "text-emerald-700" },
  } as const;
  const c = colors[tone];

  return (
    <div
      className={`rounded-xl border ${c.ring} bg-white p-5 ${
        highlight ? "ring-2 ring-orange-400 shadow-md" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${c.icon}`} />
        <span className={`text-sm font-semibold ${c.text}`}>{label}</span>
      </div>
      <div className="mt-1 text-xs text-gray-500">{margin}</div>
      <div className={`mt-3 text-3xl font-bold ${c.text}`}>{safeUSD(value)}</div>
      <div className="text-xs text-gray-500 mt-1">/mo</div>
    </div>
  );
}
