import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Calculator as CalcIcon, Bed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateAll, type CalculatorInputs } from "@/lib/calculator/calculations";

const defaultInputs: CalculatorInputs = {
  purchasePrice: 300000,
  downPaymentPercent: 20,
  interestRateAnnualPercent: 6.5,
  loanTermYears: 30,
  monthlyRent: 2400,
  vacancyPercent: 5,
  maintenancePercent: 5,
  managementPercent: 8,
  taxesMonthly: 300,
  insuranceMonthly: 120,
  otherFixedMonthly: 0,
  closingCosts: 6000,
  rehabBudget: 0,
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatPercent(p: number): string {
  return `${(Number.isFinite(p) ? p : 0).toFixed(1)}%`;
}

function NumField({
  label,
  name,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  name: keyof CalculatorInputs;
  value: number;
  onChange: (name: keyof CalculatorInputs, value: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(name, parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function CalculatorPage() {
  const { t } = useLanguage();
  const [inputs, setInputs] = useState<CalculatorInputs>(defaultInputs);
  const results = useMemo(() => calculateAll(inputs), [inputs]);

  function handleChange(name: keyof CalculatorInputs, value: number) {
    setInputs((prev) => ({ ...prev, [name]: Number.isFinite(value) ? value : 0 }));
  }

  return (
    <>
      <Navbar />
      <main className="container pt-32 pb-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalcIcon className="h-8 w-8" />
              {t("calculator.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("calculator.subtitle")}</p>
          </div>
          <Link href="/calculator/sublease">
            <a className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition">
              <Bed className="h-4 w-4" />
              {t("calculator.toSublease")}
            </a>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("calculator.inputs")}</CardTitle>
              <CardDescription>{t("calculator.inputsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumField label={t("calculator.f.purchasePrice")} name="purchasePrice" value={inputs.purchasePrice} onChange={handleChange} step={1000} />
              <NumField label={t("calculator.f.downPct")} name="downPaymentPercent" value={inputs.downPaymentPercent} onChange={handleChange} step={0.1} />
              <NumField label={t("calculator.f.interestPct")} name="interestRateAnnualPercent" value={inputs.interestRateAnnualPercent} onChange={handleChange} step={0.1} />
              <NumField label={t("calculator.f.loanTerm")} name="loanTermYears" value={inputs.loanTermYears} onChange={handleChange} />
              <NumField label={t("calculator.f.monthlyRent")} name="monthlyRent" value={inputs.monthlyRent} onChange={handleChange} step={50} />
              <NumField label={t("calculator.f.vacancyPct")} name="vacancyPercent" value={inputs.vacancyPercent} onChange={handleChange} step={0.5} />
              <NumField label={t("calculator.f.maintenancePct")} name="maintenancePercent" value={inputs.maintenancePercent} onChange={handleChange} step={0.5} />
              <NumField label={t("calculator.f.managementPct")} name="managementPercent" value={inputs.managementPercent} onChange={handleChange} step={0.5} />
              <NumField label={t("calculator.f.taxesMonthly")} name="taxesMonthly" value={inputs.taxesMonthly} onChange={handleChange} step={10} />
              <NumField label={t("calculator.f.insuranceMonthly")} name="insuranceMonthly" value={inputs.insuranceMonthly} onChange={handleChange} step={10} />
              <NumField label={t("calculator.f.otherFixedMonthly")} name="otherFixedMonthly" value={inputs.otherFixedMonthly} onChange={handleChange} step={10} />
              <NumField label={t("calculator.f.closingCosts")} name="closingCosts" value={inputs.closingCosts} onChange={handleChange} step={500} />
              <NumField label={t("calculator.f.rehabBudget")} name="rehabBudget" value={inputs.rehabBudget} onChange={handleChange} step={500} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("calculator.results")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Stat label={t("calculator.r.cashFlowMonthly")} value={formatCurrency(results.cashFlowMonthly)} positive={results.cashFlowMonthly >= 0} />
                <Stat label={t("calculator.r.monthlyMortgage")} value={formatCurrency(results.monthlyMortgage)} />
                <Stat label={t("calculator.r.noiMonthly")} value={formatCurrency(results.noiMonthly)} />
                <Stat label={t("calculator.r.noiAnnual")} value={formatCurrency(results.noiAnnual)} />
                <Stat label={t("calculator.r.coc")} value={formatPercent(results.cashOnCashReturnPercent)} />
                <Stat label={t("calculator.r.capRate")} value={formatPercent(results.capRatePercent)} />
                <Stat label={t("calculator.r.fiveYr")} value={formatPercent(results.annualizedFiveYearReturnPercent)} />
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t("calculator.expensesTitle")}</h3>
                <ul className="divide-y rounded-md border">
                  <Row label={t("calculator.r.fixed")} value={formatCurrency(results.expenseBreakdownMonthly.fixed)} />
                  <Row label={t("calculator.r.variable")} value={formatCurrency(results.expenseBreakdownMonthly.variable)} />
                  <Row label={t("calculator.r.total")} value={formatCurrency(results.expenseBreakdownMonthly.total)} />
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t("calculator.amortTitle")}</h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t("calculator.amort.month")}</th>
                        <th className="px-3 py-2 font-medium">{t("calculator.amort.principal")}</th>
                        <th className="px-3 py-2 font-medium">{t("calculator.amort.interest")}</th>
                        <th className="px-3 py-2 font-medium">{t("calculator.amort.balance")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.amortization.slice(0, 12).map((p) => (
                        <tr key={p.month} className="odd:bg-gray-50">
                          <td className="px-3 py-1.5">{p.month}</td>
                          <td className="px-3 py-1.5">{formatCurrency(p.principal)}</td>
                          <td className="px-3 py-1.5">{formatCurrency(p.interest)}</td>
                          <td className="px-3 py-1.5">{formatCurrency(p.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold ${
          positive === true ? "text-emerald-600" : positive === false ? "text-rose-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </li>
  );
}
