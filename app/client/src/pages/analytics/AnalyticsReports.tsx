import { FileText, Download, Calculator, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AnalyticsReports() {
  const { t } = useLanguage();

  return (
    <>
      <Navbar />
      <main className="container pt-32 pb-16 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            {t("analytics.reports.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("analytics.reports.subtitle")}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.reports.exportTitle")}</CardTitle>
            <CardDescription>{t("analytics.reports.exportDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("analytics.reports.exportInfo")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.print()} className="gap-2">
                <Download className="h-4 w-4" />
                {t("analytics.reports.print")}
              </Button>
              <Link href="/analytics/roi">
                <a>
                  <Button variant="outline" className="gap-2">
                    <Calculator className="h-4 w-4" />
                    {t("analytics.reports.toRoi")}
                  </Button>
                </a>
              </Link>
              <Link href="/analytics/dashboard">
                <a>
                  <Button variant="outline" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t("analytics.reports.toDashboard")}
                  </Button>
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.reports.guideTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("analytics.reports.guide1")}</p>
            <p>{t("analytics.reports.guide2")}</p>
            <p>{t("analytics.reports.guide3")}</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
