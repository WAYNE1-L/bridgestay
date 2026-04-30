import { Link } from "wouter";
import { BarChart3, Calculator, FileText, ArrowRight, TrendingUp, DollarSign, Home as HomeIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { calc } from "@/lib/analytics/calc";
import { safeUSD, safePct } from "@/lib/analytics/format";

export default function AnalyticsDashboard() {
  const { t } = useLanguage();

  const sample = calc({
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
  });

  return (
    <>
      <Navbar />
      <main className="container pt-32 pb-16 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            {t("analytics.dashboard.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("analytics.dashboard.subtitle")}</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={DollarSign}
            label={t("analytics.dashboard.kpi.monthlyCashFlow")}
            value={safeUSD(sample.monthlyCashFlow)}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <KpiCard
            icon={TrendingUp}
            label={t("analytics.dashboard.kpi.capRate")}
            value={safePct(sample.capRate)}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KpiCard
            icon={HomeIcon}
            label={t("analytics.dashboard.kpi.coc")}
            value={safePct(sample.coc)}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <KpiCard
            icon={Calculator}
            label={t("analytics.dashboard.kpi.breakEven")}
            value={safeUSD(sample.breakEvenRent)}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.dashboard.quickLinks")}</CardTitle>
              <CardDescription>{t("analytics.dashboard.quickLinksDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickLink href="/analytics/roi" icon={Calculator} label={t("analytics.dashboard.link.roi")} />
              <QuickLink href="/analytics/reports" icon={FileText} label={t("analytics.dashboard.link.reports")} />
              <QuickLink href="/calculator/sublease" icon={TrendingUp} label={t("analytics.dashboard.link.sublease")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("analytics.dashboard.sampleAnalysis")}</CardTitle>
              <CardDescription>{t("analytics.dashboard.sampleAnalysisDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{t("analytics.dashboard.row.purchasePrice")}</span><span>{safeUSD(sample.purchasePrice)}</span></div>
              <div className="flex justify-between"><span>{t("analytics.dashboard.row.monthlyRent")}</span><span>{safeUSD(sample.monthlyRent)}</span></div>
              <div className="flex justify-between"><span>{t("analytics.dashboard.row.totalExpenses")}</span><span>{safeUSD(sample.totalExpenses)}</span></div>
              <div className="flex justify-between font-semibold pt-2 border-t"><span>{t("analytics.dashboard.row.netOI")}</span><span>{safeUSD(sample.netOperatingIncome / 12)}/mo</span></div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}

function KpiCard({ icon: Icon, label, value, iconColor, iconBg }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href}>
      <a className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-3 font-medium">
          <Icon className="h-5 w-5 text-gray-700" />
          {label}
        </span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </a>
    </Link>
  );
}
