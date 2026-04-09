import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { safeJsonArray } from "@/lib/safeJsonArray";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  BedDouble,
  MessageSquare,
  ImageIcon,
  Shield,
  Save,
  Loader2,
} from "lucide-react";

const PROPERTY_TYPES = [
  { value: "apartment", label: "\u516C\u5BD3" },
  { value: "studio", label: "\u5355\u95F4" },
  { value: "house", label: "\u72EC\u680B" },
  { value: "room", label: "\u623F\u95F4" },
  { value: "condo", label: "\u516C\u5BD3\u5957\u623F" },
  { value: "townhouse", label: "\u8054\u6392\u522B\u5885" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "\u8349\u7A3F", color: "bg-gray-100 text-gray-700" },
  { value: "pending_review", label: "\u5F85\u5BA1\u6838", color: "bg-amber-100 text-amber-700" },
  { value: "published", label: "\u5DF2\u53D1\u5E03", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "\u5DF2\u62D2\u7EDD", color: "bg-red-100 text-red-700" },
  { value: "archived", label: "\u5DF2\u5F52\u6863", color: "bg-gray-100 text-gray-500" },
];

const OUTREACH_OPTIONS = [
  { value: "not_contacted", label: "\u672A\u8054\u7CFB" },
  { value: "contacted", label: "\u5DF2\u8054\u7CFB" },
  { value: "in_conversation", label: "\u6C9F\u901A\u4E2D" },
  { value: "partnered", label: "\u5DF2\u5408\u4F5C" },
  { value: "declined", label: "\u62D2\u7EDD" },
  { value: "expired", label: "\u5DF2\u5931\u6548" },
];

type FormData = {
  title: string;
  description: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  monthlyRent: string;
  securityDeposit: string;
  applicationFee: string;
  availableFrom: string;
  minLeaseTerm: string;
  maxLeaseTerm: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  petsAllowed: boolean;
  parkingIncluded: boolean;
  amenitiesText: string;
  utilitiesText: string;
  isSublease: boolean;
  subleaseEndDate: string;
  wechatContact: string;
  images: string[];
  status: string;
  featured: boolean;
  outreachStatus: string;
  outreachNotes: string;
};

function toDateInput(val: unknown): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val as Date;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function AdminEditListing() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const listingId = Number(params.id);

  const { data: listing, isLoading } = trpc.apartments.getById.useQuery(
    { id: listingId },
    { enabled: !isNaN(listingId) && listingId > 0 },
  );

  const [form, setForm] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);

  // Populate form when listing loads
  useEffect(() => {
    if (!listing) return;
    const a = listing as any;
    setForm({
      title: a.title ?? "",
      description: a.description ?? "",
      propertyType: a.propertyType ?? "apartment",
      address: a.address ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
      zipCode: a.zipCode ?? "",
      monthlyRent: a.monthlyRent?.toString?.() ?? "",
      securityDeposit: a.securityDeposit?.toString?.() ?? "",
      applicationFee: a.applicationFee?.toString?.() ?? "0",
      availableFrom: toDateInput(a.availableFrom),
      minLeaseTerm: a.minLeaseTerm?.toString?.() ?? "6",
      maxLeaseTerm: a.maxLeaseTerm?.toString?.() ?? "12",
      bedrooms: a.bedrooms?.toString?.() ?? "1",
      bathrooms: a.bathrooms?.toString?.() ?? "1",
      squareFeet: a.squareFeet?.toString?.() ?? "",
      petsAllowed: a.petsAllowed ?? false,
      parkingIncluded: a.parkingIncluded ?? false,
      amenitiesText: safeJsonArray(a.amenities).join(", "),
      utilitiesText: safeJsonArray(a.utilitiesIncluded).join(", "),
      isSublease: a.isSublease ?? false,
      subleaseEndDate: toDateInput(a.subleaseEndDate),
      wechatContact: a.wechatContact ?? "",
      images: safeJsonArray(a.images),
      status: a.status ?? "draft",
      featured: a.featured ?? false,
      outreachStatus: a.outreachStatus ?? "not_contacted",
      outreachNotes: a.outreachNotes ?? "",
    });
  }, [listing]);

  const updateMutation = trpc.apartments.update.useMutation({
    onSuccess: () => {
      toast.success("\u623F\u6E90\u5DF2\u66F4\u65B0");
      setSaving(false);
    },
    onError: (err) => {
      toast.error(err.message || "\u66F4\u65B0\u5931\u8D25");
      setSaving(false);
    },
  });

  const updateOutreachMutation = trpc.apartments.updateOutreach.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const handleSave = () => {
    if (!form) return;
    if (form.title.trim().length < 5) {
      toast.error("\u6807\u9898\u81F3\u5C11\u9700\u89815\u4E2A\u5B57\u7B26");
      return;
    }

    setSaving(true);

    const amenities = form.amenitiesText
      .split(",").map((s) => s.trim()).filter(Boolean);
    const utilities = form.utilitiesText
      .split(",").map((s) => s.trim()).filter(Boolean);

    updateMutation.mutate({
      id: listingId,
      data: {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        propertyType: form.propertyType as any,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zipCode: form.zipCode.trim(),
        monthlyRent: Number(form.monthlyRent) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        applicationFee: Number(form.applicationFee) || 0,
        availableFrom: form.availableFrom || undefined,
        minLeaseTerm: Number(form.minLeaseTerm) || 6,
        maxLeaseTerm: Number(form.maxLeaseTerm) || 12,
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        squareFeet: form.squareFeet ? Number(form.squareFeet) : undefined,
        petsAllowed: form.petsAllowed,
        parkingIncluded: form.parkingIncluded,
        amenities: amenities.length > 0 ? amenities : undefined,
        utilitiesIncluded: utilities.length > 0 ? utilities : undefined,
        isSublease: form.isSublease,
        subleaseEndDate: form.subleaseEndDate || undefined,
        wechatContact: form.wechatContact.trim() || undefined,
        images: form.images.length > 0 ? form.images : undefined,
        status: form.status as any,
        featured: form.featured,
      },
    });

    // Update outreach separately if changed
    const a = listing as any;
    if (
      form.outreachStatus !== (a?.outreachStatus ?? "not_contacted") ||
      form.outreachNotes !== (a?.outreachNotes ?? "")
    ) {
      updateOutreachMutation.mutate({
        id: listingId,
        outreachStatus: form.outreachStatus as any,
        outreachNotes: form.outreachNotes || undefined,
      });
    }
  };

  const hasLocation = useMemo(() => {
    const a = listing as any;
    return a?.latitude && a?.longitude;
  }, [listing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">\u52A0\u8F7D\u4E2D...</span>
        </div>
      </div>
    );
  }

  if (!listing || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-gray-500">\u623F\u6E90\u4E0D\u5B58\u5728</p>
          <Link href="/admin">
            <Button variant="outline" className="mt-4">\u8FD4\u56DE\u7BA1\u7406\u540E\u53F0</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              \u8FD4\u56DE
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">\u7F16\u8F91\u623F\u6E90 #{listingId}</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            \u4FDD\u5B58\u66F4\u6539
          </Button>
        </div>

        {/* Location banner */}
        {hasLocation && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-sm text-green-700">
            <MapPin className="w-4 h-4 shrink-0" />
            \u5DF2\u5730\u7406\u7F16\u7801: {(listing as any).latitude?.toFixed(4)}, {(listing as any).longitude?.toFixed(4)}
          </div>
        )}

        <div className="space-y-6">
          {/* ── Basic Info ── */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" /> \u57FA\u672C\u4FE1\u606F
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>\u6807\u9898 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="\u623F\u6E90\u6807\u9898"
                />
              </div>
              <div className="space-y-1.5">
                <Label>\u623F\u578B</Label>
                <Select value={form.propertyType} onValueChange={(v) => update("propertyType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>\u63CF\u8FF0</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="\u623F\u6E90\u63CF\u8FF0..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Location ── */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4" /> \u4F4D\u7F6E\u4FE1\u606F
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>\u8857\u9053\u5730\u5740 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>\u57CE\u5E02 <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="Salt Lake City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u5DDE <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    placeholder="UT"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u90AE\u7F16 <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.zipCode}
                    onChange={(e) => update("zipCode", e.target.value)}
                    placeholder="84101"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Pricing & Lease ── */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-4 h-4" /> \u4EF7\u683C\u4E0E\u79DF\u7EA6
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>\u6708\u79DF ($) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={form.monthlyRent}
                    onChange={(e) => update("monthlyRent", e.target.value)}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u62BC\u91D1 ($)</Label>
                  <Input
                    type="number"
                    value={form.securityDeposit}
                    onChange={(e) => update("securityDeposit", e.target.value)}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u7533\u8BF7\u8D39 ($)</Label>
                  <Input
                    type="number"
                    value={form.applicationFee}
                    onChange={(e) => update("applicationFee", e.target.value)}
                    min={0}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>\u53EF\u5165\u4F4F\u65E5\u671F</Label>
                  <Input
                    type="date"
                    value={form.availableFrom}
                    onChange={(e) => update("availableFrom", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u6700\u77ED\u79DF\u671F (\u6708)</Label>
                  <Input
                    type="number"
                    value={form.minLeaseTerm}
                    onChange={(e) => update("minLeaseTerm", e.target.value)}
                    min={1} max={36}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u6700\u957F\u79DF\u671F (\u6708)</Label>
                  <Input
                    type="number"
                    value={form.maxLeaseTerm}
                    onChange={(e) => update("maxLeaseTerm", e.target.value)}
                    min={1} max={36}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Unit Details ── */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BedDouble className="w-4 h-4" /> \u623F\u578B\u8BE6\u60C5
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>\u5367\u5BA4 <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => update("bedrooms", e.target.value)}
                    min={0} max={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u536B\u751F\u95F4 <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => update("bathrooms", e.target.value)}
                    min={0} max={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>\u9762\u79EF (sqft)</Label>
                  <Input
                    type="number"
                    value={form.squareFeet}
                    onChange={(e) => update("squareFeet", e.target.value)}
                    placeholder="\u53EF\u9009"
                    min={0}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <Label className="cursor-pointer">\u5141\u8BB8\u5BA0\u7269</Label>
                <Switch
                  checked={form.petsAllowed}
                  onCheckedChange={(v) => update("petsAllowed", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-1">
                <Label className="cursor-pointer">\u542B\u505C\u8F66\u4F4D</Label>
                <Switch
                  checked={form.parkingIncluded}
                  onCheckedChange={(v) => update("parkingIncluded", v)}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>\u8BBE\u65BD\u914D\u5957 <span className="text-muted-foreground text-xs">(\u9017\u53F7\u5206\u9694)</span></Label>
                <Input
                  value={form.amenitiesText}
                  onChange={(e) => update("amenitiesText", e.target.value)}
                  placeholder="In-unit Laundry, Gym, Pool, Dishwasher..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>\u542B\u8D39\u7528\u9879 <span className="text-muted-foreground text-xs">(\u9017\u53F7\u5206\u9694)</span></Label>
                <Input
                  value={form.utilitiesText}
                  onChange={(e) => update("utilitiesText", e.target.value)}
                  placeholder="Water, Electric, Gas, Internet, Trash..."
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Sublease & Contact ── */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4" /> \u8F6C\u79DF\u4E0E\u8054\u7CFB
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="cursor-pointer">\u8FD9\u662F\u4E00\u5957\u8F6C\u79DF</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">\u539F\u79DF\u5BA2\u8F6C\u79DF\u623F\u6E90</p>
                </div>
                <Switch
                  checked={form.isSublease}
                  onCheckedChange={(v) => update("isSublease", v)}
                />
              </div>

              {form.isSublease && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <Label>\u8F6C\u79DF\u7ED3\u675F\u65E5\u671F</Label>
                    <Input
                      type="date"
                      value={form.subleaseEndDate}
                      onChange={(e) => update("subleaseEndDate", e.target.value)}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-1.5">
                <Label>\u5FAE\u4FE1\u53F7</Label>
                <Input
                  value={form.wechatContact}
                  onChange={(e) => update("wechatContact", e.target.value)}
                  placeholder="\u5FAE\u4FE1\u8054\u7CFB\u4EBA ID"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Photos ── */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="w-4 h-4" /> \u7167\u7247
              </CardTitle>
              <CardDescription>\u62D6\u653E\u6216\u70B9\u51FB\u4E0A\u4F20\uFF0C\u6700\u591A10\u5F20\uFF0C\u53EF\u62D6\u52A8\u6392\u5E8F</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiImageUpload
                images={form.images}
                onChange={(imgs) => update("images", imgs)}
                maxImages={10}
                maxSizeMB={10}
                language="cn"
              />
            </CardContent>
          </Card>

          {/* ── Status & Admin ── */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-4 h-4" /> \u72B6\u6001\u7BA1\u7406
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>\u53D1\u5E03\u72B6\u6001</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>\u8054\u7CFB\u8FFD\u8E2A\u72B6\u6001</Label>
                  <Select value={form.outreachStatus} onValueChange={(v) => update("outreachStatus", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OUTREACH_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <Label className="cursor-pointer">\u7F6E\u9876\u63A8\u8350</Label>
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => update("featured", v)}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>\u8054\u7CFB\u5907\u6CE8</Label>
                <Textarea
                  value={form.outreachNotes}
                  onChange={(e) => update("outreachNotes", e.target.value)}
                  placeholder="\u5907\u6CE8\u4FE1\u606F..."
                  className="min-h-[80px]"
                  maxLength={2000}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bottom save bar */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <Link href="/admin">
              <Button variant="outline" className="gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                \u8FD4\u56DE\u7BA1\u7406\u540E\u53F0
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              \u4FDD\u5B58\u66F4\u6539
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
