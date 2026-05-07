/**
 * /sublets — student-to-student sublet matching browse page.
 *
 * Different from /apartments (which is the generic for-rent listings page):
 * filters are sublet-specific (area pills, sublease end window, source badge),
 * cards highlight the lease-end date and source channel rather than tenancy
 * application metadata, and the hero copy speaks to the SLC / UofU sublet
 * audience.
 *
 * Data source order:
 *   1. Try `trpc.apartments.list({ isSublease: true })` for real DB rows.
 *   2. If the result is empty, fall back to `MOCK_SUBLETS` and render the
 *      site-wide red `MockDataBanner`. Required by project rule.
 */

import { Navbar } from "@/components/Navbar";
import { MockDataBanner } from "@/components/MockDataBanner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  COMMON_AMENITIES,
  MOCK_SUBLETS,
  SUBLET_AREAS,
  SUBLET_SOURCES,
  type MockSublet,
  type SubletArea,
} from "@/lib/subletMockData";
import { adaptDbRowToSublet } from "@/lib/subletAdapter";
import { ContactHostModal } from "@/components/ContactHostModal";
import { SubletMapView } from "@/components/SubletMapView";
import {
  Bed,
  Bath,
  CalendarDays,
  GraduationCap,
  MapPin,
  Phone,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

interface FilterState {
  search: string;
  areas: Set<SubletArea>;
  maxPrice: number;
  minBedrooms: number;
  /** ISO date the user wants the sublet to still be available through. */
  availableThrough: string;
  amenities: Set<string>;
  petsOnly: boolean;
  parkingOnly: boolean;
  sortBy: "ending_soon" | "price_asc" | "price_desc" | "closest_to_uofu";
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  areas: new Set(),
  maxPrice: 2500,
  minBedrooms: 0,
  availableThrough: "",
  amenities: new Set(),
  petsOnly: false,
  parkingOnly: false,
  sortBy: "ending_soon",
};

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

function daysUntil(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const ms = d.getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function SubletsPage() {
  const { language } = useLanguage();
  const { user, signIn } = useAuth();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [contactSublet, setContactSublet] = useState<MockSublet | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  const realQuery = trpc.sublets.list.useQuery({});

  const realCount = Array.isArray(realQuery.data) ? realQuery.data.length : 0;
  const usingMock = realCount === 0;

  const allSublets: MockSublet[] = useMemo(() => {
    if (!usingMock) {
      const rows = (realQuery.data ?? []) as Array<Record<string, unknown>>;
      return rows.map((row) => adaptDbRowToSublet(row));
    }
    return MOCK_SUBLETS;
  }, [usingMock, realQuery.data]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const through = filters.availableThrough
      ? new Date(filters.availableThrough).getTime()
      : null;

    let list = allSublets.filter((s) => {
      if (search) {
        const haystack =
          `${s.title} ${s.titleZh ?? ""} ${s.address} ${s.description}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filters.areas.size > 0 && !filters.areas.has(s.area)) return false;
      if (s.monthlyRent > filters.maxPrice) return false;
      if (s.bedrooms < filters.minBedrooms) return false;
      if (through !== null && new Date(s.subleaseEndDate).getTime() < through) {
        return false;
      }
      if (filters.amenities.size > 0) {
        const has = s.amenities;
        const allMet = Array.from(filters.amenities).every((a) => has.includes(a));
        if (!allMet) return false;
      }
      if (filters.petsOnly && !s.petsAllowed) return false;
      if (filters.parkingOnly && !s.parkingIncluded) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (filters.sortBy) {
        case "ending_soon":
          return new Date(a.subleaseEndDate).getTime() - new Date(b.subleaseEndDate).getTime();
        case "price_asc":
          return a.monthlyRent - b.monthlyRent;
        case "price_desc":
          return b.monthlyRent - a.monthlyRent;
        case "closest_to_uofu":
          return a.distanceToUofU - b.distanceToUofU;
        default:
          return 0;
      }
    });

    return list;
  }, [allSublets, filters]);

  const updateFilters = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleArea = (area: SubletArea) => {
    setFilters((prev) => {
      const next = new Set(prev.areas);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return { ...prev, areas: next };
    });
  };

  const toggleAmenity = (amenity: string) => {
    setFilters((prev) => {
      const next = new Set(prev.amenities);
      if (next.has(amenity)) next.delete(amenity);
      else next.add(amenity);
      return { ...prev, amenities: next };
    });
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      {contactSublet && (
        <ContactHostModal
          sublet={contactSublet}
          open={!!contactSublet}
          onClose={() => setContactSublet(null)}
        />
      )}
      <main className="container pt-28 pb-16 space-y-6">
        {/* Hero */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
            <GraduationCap className="w-3.5 h-3.5" />
            {language === "cn" ? "为留学生打造" : "Built for international students"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">
            {language === "cn" ? "盐湖城留学生转租" : "Salt Lake City student sublets"}
          </h1>
          <p className="text-neutral-600 max-w-2xl">
            {language === "cn"
              ? "从在校学生手里直接租。不查 SSN,不审信用记录,不用经纪费。"
              : "Rent directly from a current student. No SSN check, no credit history, no broker fees."}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {language === "cn" ? "覆盖 U District / 糖屋 / 市中心 / 山脚 / 联邦高地" : "U District · Sugar House · Downtown · Foothill · Federal Heights"}
            </span>
          </div>
        </header>

        {/* Mock data banner — site-wide rule */}
        {usingMock && <MockDataBanner source="curated UofU-area examples" />}

        {/* List / Map view toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("list")}
            className={
              view === "list"
                ? "rounded-full px-3 py-1 text-xs font-medium bg-orange-500 text-white shadow-sm"
                : "rounded-full px-3 py-1 text-xs font-medium bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 transition-colors"
            }
          >
            {language === "cn" ? "列表" : "List view"}
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={
              view === "map"
                ? "rounded-full px-3 py-1 text-xs font-medium bg-orange-500 text-white shadow-sm"
                : "rounded-full px-3 py-1 text-xs font-medium bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 transition-colors"
            }
          >
            {language === "cn" ? "地图" : "Map view"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Filter sidebar */}
          <aside className="space-y-5">
            <Card>
              <CardContent className="p-4 space-y-5">
                {/* Search */}
                <div className="space-y-1.5">
                  <Label htmlFor="sublet-search" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {language === "cn" ? "搜索 / Search" : "Search / 搜索"}
                  </Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400 pointer-events-none" />
                    <Input
                      id="sublet-search"
                      type="text"
                      placeholder={language === "cn" ? "地址 / 关键词" : "Address / keyword"}
                      value={filters.search}
                      onChange={(e) => updateFilters("search", e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Area pills */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {language === "cn" ? "区域 / Area" : "Area / 区域"}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBLET_AREAS.map((area) => {
                      const active = filters.areas.has(area.id);
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => toggleArea(area.id)}
                          className={
                            active
                              ? "rounded-full px-3 py-1 text-xs font-medium bg-orange-500 text-white shadow-sm transition-colors"
                              : "rounded-full px-3 py-1 text-xs font-medium bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 transition-colors"
                          }
                        >
                          {language === "cn" ? area.labelZh : area.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Max price slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                      {language === "cn" ? "最高月租" : "Max monthly rent"}
                    </Label>
                    <span className="text-sm font-medium text-neutral-900 tabular-nums">
                      {fmtUsd(filters.maxPrice)}
                    </span>
                  </div>
                  <Slider
                    min={500}
                    max={3000}
                    step={50}
                    value={[filters.maxPrice]}
                    onValueChange={(v) => updateFilters("maxPrice", v[0] ?? 2500)}
                  />
                </div>

                {/* Min bedrooms */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {language === "cn" ? "最少卧室" : "Min bedrooms"}
                  </Label>
                  <Select
                    value={String(filters.minBedrooms)}
                    onValueChange={(v) => updateFilters("minBedrooms", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{language === "cn" ? "任意 (含单间)" : "Any (incl. studio)"}</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Availability through */}
                <div className="space-y-1.5">
                  <Label htmlFor="sublet-through" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {language === "cn" ? "至少可住到 / Available through" : "Available through / 至少可住到"}
                  </Label>
                  <Input
                    id="sublet-through"
                    type="date"
                    value={filters.availableThrough}
                    onChange={(e) => updateFilters("availableThrough", e.target.value)}
                  />
                </div>

                {/* Amenity chips */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {language === "cn" ? "条件 / Amenities" : "Amenities / 条件"}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_AMENITIES.map((a) => {
                      const active = filters.amenities.has(a.value);
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => toggleAmenity(a.value)}
                          className={
                            active
                              ? "rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500 text-white shadow-sm"
                              : "rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400"
                          }
                        >
                          {language === "cn" ? a.labelZh : a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pets-only" className="text-sm text-neutral-700">
                      {language === "cn" ? "可养宠物" : "Pets allowed only"}
                    </Label>
                    <Switch
                      id="pets-only"
                      checked={filters.petsOnly}
                      onCheckedChange={(v) => updateFilters("petsOnly", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="parking-only" className="text-sm text-neutral-700">
                      {language === "cn" ? "含停车位" : "Parking included only"}
                    </Label>
                    <Switch
                      id="parking-only"
                      checked={filters.parkingOnly}
                      onCheckedChange={(v) => updateFilters("parkingOnly", v)}
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="w-full text-neutral-600 hover:text-neutral-900"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  {language === "cn" ? "重置筛选" : "Reset filters"}
                </Button>
              </CardContent>
            </Card>

            {/* Post-a-sublet CTA */}
            <Card className="border-dashed border-2 border-orange-300 bg-orange-50/50">
              <CardContent className="p-4 space-y-2 text-center">
                <Sparkles className="w-6 h-6 text-orange-500 mx-auto" />
                <p className="text-sm font-medium text-orange-900">
                  {language === "cn" ? "想发布转租?" : "Got a place to sublet?"}
                </p>
                <p className="text-xs text-orange-700/80">
                  {language === "cn"
                    ? "分享你的空间,帮助有需要的同学。"
                    : "Share your space with fellow students."}
                </p>
                <Link href="/sublets/post" className="block w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    {language === "cn" ? "发布转租" : "Post a sublet"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </aside>

          {/* Listings grid */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-neutral-600">
                <span className="font-semibold text-neutral-900 tabular-nums">{filtered.length}</span>{" "}
                {language === "cn" ? "套转租房源" : "sublets match"}
                {filtered.length !== allSublets.length && (
                  <span className="text-neutral-400">
                    {" "}/ {allSublets.length} {language === "cn" ? "总数" : "total"}
                  </span>
                )}
              </p>
              <Select
                value={filters.sortBy}
                onValueChange={(v) => updateFilters("sortBy", v as FilterState["sortBy"])}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ending_soon">
                    {language === "cn" ? "结束日期最近" : "Ending soonest"}
                  </SelectItem>
                  <SelectItem value="price_asc">
                    {language === "cn" ? "价格低到高" : "Price ↑"}
                  </SelectItem>
                  <SelectItem value="price_desc">
                    {language === "cn" ? "价格高到低" : "Price ↓"}
                  </SelectItem>
                  <SelectItem value="closest_to_uofu">
                    {language === "cn" ? "离 UofU 最近" : "Closest to UofU"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {view === "map" ? (
              <SubletMapView sublets={filtered} />
            ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-10 text-center text-neutral-500 space-y-2">
                  <p className="text-base font-medium text-neutral-700">
                    {language === "cn" ? "没有符合条件的转租" : "No sublets match these filters"}
                  </p>
                  <p className="text-sm">
                    {language === "cn"
                      ? "试试放宽价格或者去掉一两个区域筛选。"
                      : "Try relaxing the price ceiling or removing an area filter."}
                  </p>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {language === "cn" ? "重置筛选" : "Reset filters"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((sublet) => (
                  <SubletCard
                    key={sublet.id}
                    sublet={sublet}
                    language={language}
                    onContactHost={setContactSublet}
                    isSignedIn={Boolean(user)}
                    onSignIn={signIn}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SubletCard({
  sublet,
  language,
  onContactHost,
  isSignedIn,
  onSignIn,
}: {
  sublet: MockSublet;
  language: "en" | "cn";
  onContactHost: (sublet: MockSublet) => void;
  isSignedIn: boolean;
  onSignIn: () => void;
}) {
  const days = daysUntil(sublet.subleaseEndDate);
  const sourceMeta = SUBLET_SOURCES[sublet.source];
  const areaMeta = SUBLET_AREAS.find((a) => a.id === sublet.area);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {/* Hero image */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
        <img
          src={sublet.images?.[0] || `https://picsum.photos/seed/${sublet.id}/640/360`}
          alt={sublet.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {!sublet.images?.[0] && (
          <span className="absolute bottom-2 right-2 bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 rounded">
            Demo photo
          </span>
        )}
      </div>
      <CardContent className="p-5 space-y-3">
        {/* Top row: source + area + ending */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`${sourceMeta.tone} border-0 font-medium`}>
              {language === "cn" ? sourceMeta.labelZh : sourceMeta.label}
            </Badge>
            {areaMeta && (
              <span className="inline-flex items-center gap-1 text-neutral-500">
                <MapPin className="w-3 h-3" />
                {language === "cn" ? areaMeta.labelZh : areaMeta.label}
              </span>
            )}
          </div>
          {days >= 0 && days <= 60 && (
            <span className="text-amber-700 font-medium tabular-nums">
              {language === "cn" ? `${days} 天后结束` : `${days} d left`}
            </span>
          )}
        </div>

        {/* Title + address */}
        <div>
          <h3 className="text-base font-semibold text-neutral-900 leading-snug line-clamp-2">
            {language === "cn" && sublet.titleZh ? sublet.titleZh : sublet.title}
          </h3>
          <p className="mt-0.5 text-sm text-neutral-500">{sublet.address}</p>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-neutral-900">
            {fmtUsd(sublet.monthlyRent)}
          </span>
          <span className="text-xs text-neutral-500">
            {language === "cn" ? "/月" : "/mo"}
          </span>
        </div>

        {/* Beds / baths / size / distance */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-700">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Bed className="w-4 h-4 text-neutral-400" />
            {sublet.bedrooms === 0
              ? language === "cn"
                ? "单间"
                : "Studio"
              : `${sublet.bedrooms} ${language === "cn" ? "卧" : "bed"}`}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Bath className="w-4 h-4 text-neutral-400" />
            {sublet.bathrooms} {language === "cn" ? "卫" : "bath"}
          </span>
          {sublet.squareFeet && (
            <span className="text-neutral-600 tabular-nums">
              {sublet.squareFeet} {language === "cn" ? "尺" : "sqft"}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-orange-700 font-medium tabular-nums">
            <GraduationCap className="w-4 h-4" />
            {sublet.distanceToUofU} mi {language === "cn" ? "到 UofU" : "to UofU"}
          </span>
        </div>

        {/* Sublease window */}
        <div className="flex items-center gap-1.5 text-sm text-neutral-700 bg-neutral-50 rounded-md px-3 py-2">
          <CalendarDays className="w-4 h-4 text-neutral-500 shrink-0" />
          <span>
            {language === "cn" ? "可住" : "Available"} {fmtDate(sublet.availableFrom)} →{" "}
            <span className="font-semibold text-neutral-900">{fmtDate(sublet.subleaseEndDate)}</span>
          </span>
        </div>

        {/* Amenity chips */}
        <div className="flex flex-wrap gap-1.5">
          {sublet.amenities.slice(0, 4).map((a) => {
            const meta = COMMON_AMENITIES.find((x) => x.value === a);
            const label = meta ? (language === "cn" ? meta.labelZh : meta.label) : a;
            return (
              <span
                key={a}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-700"
              >
                {label}
              </span>
            );
          })}
          {sublet.amenities.length > 4 && (
            <span className="text-[11px] text-neutral-400 self-center">
              +{sublet.amenities.length - 4}
            </span>
          )}
        </div>

        {/* Footer: contact CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <span className="text-xs text-neutral-500">
            {sublet.hostIsStudent
              ? language === "cn"
                ? "在校学生发布"
                : "Posted by a student"
              : language === "cn"
                ? "房东发布"
                : "Posted by host"}
          </span>
          <div className="flex items-center gap-2">
            {!isSignedIn ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 italic">
                  {language === "cn" ? "请登录后查看联系方式" : "Please sign in to see contact info"}
                </span>
                <Button size="sm" variant="outline" onClick={onSignIn}>
                  {language === "cn" ? "登录" : "Sign in"}
                </Button>
              </div>
            ) : sublet.source !== "manual_demo" && !sublet.wechatContact ? (
              <span className="text-xs text-neutral-400 italic">
                {language === "cn"
                  ? "联系方式暂不可用"
                  : "Contact info unavailable / 联系方式暂不可用"}
              </span>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={() => onContactHost(sublet)}
              >
                <Phone className="w-3.5 h-3.5 mr-1.5" />
                {language === "cn" ? "联系房东" : "Contact host"}
              </Button>
            )}
            <Link href={`/sublets/${sublet.id}`}>
              <Button size="sm" variant="outline">
                {language === "cn" ? "查看详情" : "View details"}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

