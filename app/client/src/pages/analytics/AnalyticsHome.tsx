import { Calculator, BarChart3, FileText, Bed } from "lucide-react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  iconColor: string;
  iconBgColor: string;
}

function FeatureCard({ title, description, icon: Icon, href, iconColor, iconBgColor }: FeatureCardProps) {
  return (
    <Link href={href}>
      <div className="group cursor-pointer h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-soft hover:shadow-soft-lg transition-all duration-200 hover:-translate-y-1">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
        <div className="mt-4 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
          Open <span aria-hidden className="ml-1">→</span>
        </div>
      </div>
    </Link>
  );
}

export default function AnalyticsHome() {
  const { t } = useLanguage();

  const features = [
    {
      title: t("analytics.feature.roi.title"),
      description: t("analytics.feature.roi.desc"),
      icon: Calculator,
      href: "/analytics/roi",
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-50",
    },
    {
      title: t("analytics.feature.dashboard.title"),
      description: t("analytics.feature.dashboard.desc"),
      icon: BarChart3,
      href: "/analytics/dashboard",
      iconColor: "text-green-600",
      iconBgColor: "bg-green-50",
    },
    {
      title: t("analytics.feature.reports.title"),
      description: t("analytics.feature.reports.desc"),
      icon: FileText,
      href: "/analytics/reports",
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-50",
    },
    {
      title: t("analytics.feature.sublease.title"),
      description: t("analytics.feature.sublease.desc"),
      icon: Bed,
      href: "/calculator/sublease",
      iconColor: "text-orange-600",
      iconBgColor: "bg-orange-50",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="container pt-32 pb-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            {t("analytics.title")}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t("analytics.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-6">
            <Link href="/analytics/roi">
              <a className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition">
                {t("analytics.getStarted")}
                <span aria-hidden>→</span>
              </a>
            </Link>
            <Link href="/analytics/dashboard">
              <a className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium text-gray-800 hover:underline underline-offset-4 transition">
                {t("analytics.viewDashboard")}
              </a>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </main>
    </>
  );
}
