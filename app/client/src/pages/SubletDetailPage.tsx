/**
 * /sublets/:id — detail view for a single mock sublet listing.
 *
 * R2 still serves curated mock data, so this looks up the id in
 * `MOCK_SUBLETS`. The MockDataBanner is always shown in this version (the
 * site-wide rule: every view rendering demo rows must flag itself).
 *
 * If `:id` doesn't resolve, render a 404 panel with a link back to /sublets.
 */

import { Navbar } from "@/components/Navbar";
import { MockDataBanner } from "@/components/MockDataBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  COMMON_AMENITIES,
  MOCK_SUBLETS,
  SUBLET_AREAS,
  SUBLET_SOURCES,
  type MockSublet,
} from "@/lib/subletMockData";
import {
  ArrowLeft,
  Bath,
  Bed,
  CalendarDays,
  GraduationCap,
  MapPin,
  PawPrint,
  ParkingCircle,
  Square,
  Users,
} from "lucide-react";
import { Link, useParams } from "wouter";

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubletDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const sublet = MOCK_SUBLETS.find((s) => s.id === id);

  if (!sublet) {
    return <SubletNotFound id={id} />;
  }

  return <SubletFound sublet={sublet} />;
}

function SubletNotFound({ id }: { id?: string }) {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="container pt-28 pb-16 max-w-2xl">
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-4">
            <p className="text-5xl font-bold text-neutral-900">404</p>
            <p className="text-lg font-semibold text-neutral-800">
              {language === "cn" ? "找不到这个转租房源" : "Sublet not found"}
            </p>
            <p className="text-sm text-neutral-500">
              {language === "cn"
                ? id
                  ? `没有 id 为 "${id}" 的房源。可能已下架或者链接拼写错误。`
                  : "缺少房源 id。"
                : id
                  ? `No listing matches id "${id}". It may have been removed, or the link is misspelled.`
                  : "Missing listing id."}
            </p>
            <Link href="/sublets">
              <Button variant="default" className="mt-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {language === "cn" ? "返回所有转租" : "Return to listings"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function SubletFound({ sublet }: { sublet: MockSublet }) {
  const { language } = useLanguage();
  const sourceMeta = SUBLET_SOURCES[sublet.source];
  const areaMeta = SUBLET_AREAS.find((a) => a.id === sublet.area);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="container pt-28 pb-16 space-y-6 max-w-4xl">
        {/* Back link */}
        <Link href="/sublets">
          <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {language === "cn" ? "返回所有转租" : "Return to listings"}
          </Button>
        </Link>

        {/* Mock data banner — site-wide rule for any mock-backed view */}
        <MockDataBanner source="curated UofU-area examples" />

        {/* Header card: title, address, source */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`${sourceMeta.tone} border-0 font-medium`}>
                {language === "cn" ? sourceMeta.labelZh : sourceMeta.label}
              </Badge>
              {areaMeta && (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="w-3 h-3" />
                  {language === "cn" ? areaMeta.labelZh : areaMeta.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-orange-700 font-medium tabular-nums">
                <GraduationCap className="w-3.5 h-3.5" />
                {sublet.distanceToUofU} mi {language === "cn" ? "到 UofU" : "to UofU"}
              </span>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
                {language === "cn" && sublet.titleZh ? sublet.titleZh : sublet.title}
              </h1>
              <p className="mt-1.5 text-sm text-neutral-600 inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-neutral-400" />
                {sublet.address}, {sublet.city}, {sublet.state} {sublet.zipCode}
              </p>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-bold tabular-nums text-neutral-900">
                {fmtUsd(sublet.monthlyRent)}
              </span>
              <span className="text-sm text-neutral-500">{language === "cn" ? "/月" : "/mo"}</span>
              <span className="ml-3 text-xs text-neutral-500">
                {language === "cn" ? "押金" : "Deposit"}: {fmtUsd(sublet.securityDeposit)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Specs: bed/bath/sqft */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600 mb-3">
              {language === "cn" ? "户型 / Specs" : "Specs"}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <SpecTile
                icon={<Bed className="w-5 h-5 text-neutral-400" />}
                label={language === "cn" ? "卧室" : "Bedrooms"}
                value={
                  sublet.bedrooms === 0
                    ? language === "cn"
                      ? "单间"
                      : "Studio"
                    : String(sublet.bedrooms)
                }
              />
              <SpecTile
                icon={<Bath className="w-5 h-5 text-neutral-400" />}
                label={language === "cn" ? "卫浴" : "Bathrooms"}
                value={String(sublet.bathrooms)}
              />
              <SpecTile
                icon={<Square className="w-5 h-5 text-neutral-400" />}
                label={language === "cn" ? "面积" : "Square feet"}
                value={
                  sublet.squareFeet
                    ? `${sublet.squareFeet} ${language === "cn" ? "尺" : "sqft"}`
                    : "—"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Available dates */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
              {language === "cn" ? "可住日期 / Available dates" : "Available dates"}
            </h2>
            <div className="flex items-start gap-2 text-sm text-neutral-800 bg-neutral-50 rounded-md px-3 py-2.5">
              <CalendarDays className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div>
                  <span className="text-neutral-500">
                    {language === "cn" ? "最早入住" : "Move-in"}:
                  </span>{" "}
                  <span className="font-medium tabular-nums">{fmtDate(sublet.availableFrom)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">
                    {language === "cn" ? "退租日期" : "Sublease ends"}:
                  </span>{" "}
                  <span className="font-semibold tabular-nums text-neutral-900">
                    {fmtDate(sublet.subleaseEndDate)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* House rules + amenities */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
              {language === "cn" ? "房屋规则 / House rules" : "House rules"}
            </h2>
            <ul className="space-y-2 text-sm text-neutral-800">
              <li className="inline-flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-neutral-400" />
                {sublet.petsAllowed
                  ? language === "cn"
                    ? "可养宠物"
                    : "Pets allowed"
                  : language === "cn"
                    ? "不可养宠物"
                    : "No pets"}
              </li>
              <li className="inline-flex items-center gap-2">
                <ParkingCircle className="w-4 h-4 text-neutral-400" />
                {sublet.parkingIncluded
                  ? language === "cn"
                    ? "含停车位"
                    : "Parking included"
                  : language === "cn"
                    ? "不含停车位"
                    : "No parking included"}
              </li>
              <li className="inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-400" />
                {sublet.hostIsStudent
                  ? language === "cn"
                    ? "在校学生发布"
                    : "Posted by a current student"
                  : language === "cn"
                    ? "房东直接发布"
                    : "Posted by the host"}
              </li>
            </ul>

            {sublet.amenities.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
                  {language === "cn" ? "条件 / Amenities" : "Amenities"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sublet.amenities.map((a) => {
                    const meta = COMMON_AMENITIES.find((x) => x.value === a);
                    const label = meta ? (language === "cn" ? meta.labelZh : meta.label) : a;
                    return (
                      <span
                        key={a}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-700"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {sublet.description && (
          <Card>
            <CardContent className="p-6 space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                {language === "cn" ? "描述 / About" : "About this sublet"}
              </h2>
              <p className="text-sm leading-relaxed text-neutral-800">
                {language === "cn" && sublet.descriptionZh
                  ? sublet.descriptionZh
                  : sublet.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bottom return button */}
        <div className="pt-2">
          <Link href="/sublets">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === "cn" ? "返回所有转租" : "Return to listings"}
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function SpecTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 flex items-start gap-2.5">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-base font-semibold text-neutral-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}
