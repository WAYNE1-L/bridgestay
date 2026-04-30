import { useState, useMemo } from "react";
import { Calculator, DollarSign, Percent, TrendingUp, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { calc, type RoiInput } from "@/lib/analytics/calc";
import { safeUSD, safePct } from "@/lib/analytics/format";

const DEFAULTS: RoiInput = {
  purchasePrice: 300000,
  downPct: 20,
  rentMonthly: 2400,
  expensesMonthly: 800,
  interestPct: 6.5,
  years: 30,
  taxPct: 1.2,
  insuranceMonthly: 150,
  hoaMonthly: 0,
  mgmtPct: 8,
  maintPct: 5,
  vacancyPct: 5,
};

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  icon?: React.ComponentType<{ className?: string }>;
  suffix?: string;
}

function NumField({ label, value, onChange, step = 1, min = 0, max, icon: Icon, suffix }: NumFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />}
        <Input
          type="number"
          step={step}
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className={Icon ? "pl-10" : suffix ? "pr-10" : ""}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsRoi() {
  const { t } = useLanguage();
  const [inputs, setInputs] = useState<RoiInput>(DEFAULTS);
  const out = useMemo(() => calc(inputs), [inputs]);

  const cashFlowColor = (n: number) => (n > 0 ? "text-green-600" : n < 0 ? "text-red-600" : "text-gray-600");

  const update = (key: keyof RoiInput) => (n: number) => setInputs((prev) => ({ ...prev, [key]: n }));

  return (
    <>
      <Navbar />
      <main className="container pt-32 pb-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-8 w-8" />
              {t("analytics.roi.title")}
            </h1>
            <p className="text-muted-foreground">{t("analytics.roi.subtitle")}</p>
          </div>
          <Button variant="outline" onClick={() => setInputs(DEFAULTS)} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("analytics.roi.reset")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("analytics.roi.inputsTitle")}</CardTitle>
              <CardDescription>{t("analytics.roi.inputsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <NumField label={t("analytics.roi.field.purchasePrice")} value={inputs.purchasePrice} onChange={update("purchasePrice")} step={1000} icon={DollarSign} />
              <NumField label={t("analytics.roi.field.downPct")} value={inputs.downPct} onChange={update("downPct")} step={1} max={100} icon={Percent} suffix="%" />
              <NumField label={t("analytics.roi.field.rentMonthly")} value={inputs.rentMonthly} onChange={update("rentMonthly")} step={50} icon={DollarSign} />
              <NumField label={t("analytics.roi.field.expensesMonthly")} value={inputs.expensesMonthly} onChange={update("expensesMonthly")} step={50} icon={DollarSign} />
              <NumField label={t("analytics.roi.field.interestPct")} value={inputs.interestPct} onChange={update("interestPct")} step={0.1} max={30} icon={Percent} suffix="%" />
              <NumField label={t("analytics.roi.field.years")} value={inputs.years} onChange={update("years")} step={1} max={50} />
              <NumField label={t("analytics.roi.field.taxPct")} value={inputs.taxPct} onChange={update("taxPct")} step={0.1} max={10} icon={Percent} suffix="%" />
              <NumField label={t("analytics.roi.field.insuranceMonthly")} value={inputs.insuranceMonthly} onChange={update("insuranceMonthly")} step={10} icon={DollarSign} />
              <NumField label={t("analytics.roi.field.hoaMonthly")} value={inputs.hoaMonthly} onChange={update("hoaMonthly")} step={25} icon={DollarSign} />
              <NumField label={t("analytics.roi.field.mgmtPct")} value={inputs.mgmtPct} onChange={update("mgmtPct")} step={0.5} max={20} icon={Percent} suffix="%" />
              <NumField label={t("analytics.roi.field.maintPct")} value={inputs.maintPct} onChange={update("maintPct")} step={0.5} max={20} icon={Percent} suffix="%" />
              <NumField label={t("analytics.roi.field.vacancyPct")} value={inputs.vacancyPct} onChange={update("vacancyPct")} step={0.5} max={20} icon={Percent} suffix="%" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t("analytics.roi.resultsTitle")}
              </CardTitle>
              <CardDescription>{t("analytics.roi.resultsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">{t("analytics.roi.section.property")}</h4>
                <Row label={t("analytics.roi.field.purchasePrice")} value={safeUSD(out.purchasePrice)} />
                <Row label={t("analytics.roi.row.downPayment")} value={safeUSD(out.downPayment)} />
                <Row label={t("analytics.roi.row.loanAmount")} value={safeUSD(out.loanAmount)} />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">{t("analytics.roi.section.expenses")}</h4>
                <Row label={t("analytics.roi.row.pi")} value={safeUSD(out.pi)} />
                <Row label={t("analytics.roi.row.tax")} value={safeUSD(out.tax)} />
                <Row label={t("analytics.roi.row.insurance")} value={safeUSD(out.insurance)} />
                <Row label={t("analytics.roi.row.hoa")} value={safeUSD(out.hoa)} />
                <Row label={t("analytics.roi.row.mgmt")} value={safeUSD(out.mgmt)} />
                <Row label={t("analytics.roi.row.maint")} value={safeUSD(out.maint)} />
                <Row label={t("analytics.roi.row.vacancy")} value={safeUSD(out.vac)} />
                <Row label={t("analytics.roi.row.total")} value={safeUSD(out.totalExpenses)} bold />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">{t("analytics.roi.section.metrics")}</h4>
                <Row label={t("analytics.roi.row.monthlyCashFlow")} value={safeUSD(out.monthlyCashFlow)} valueClass={cashFlowColor(out.monthlyCashFlow)} />
                <Row label={t("analytics.roi.row.annualCashFlow")} value={safeUSD(out.annualCashFlow)} valueClass={cashFlowColor(out.annualCashFlow)} />
                <Row label={t("analytics.roi.row.capRate")} value={safePct(out.capRate)} />
                <Row label={t("analytics.roi.row.coc")} value={safePct(out.coc)} />
                <Row label={t("analytics.roi.row.dscr")} value={out.dscr.toFixed(2)} />
                <Row label={t("analytics.roi.row.breakEvenRent")} value={safeUSD(out.breakEvenRent)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function Row({ label, value, bold, valueClass }: { label: string; value: string; bold?: boolean; valueClass?: string }) {
  return (
    <div className={`flex justify-between items-center py-1 ${bold ? "border-t" : ""}`}>
      <span className={`text-sm ${bold ? "font-medium" : ""}`}>{label}</span>
      <span className={`font-semibold ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
