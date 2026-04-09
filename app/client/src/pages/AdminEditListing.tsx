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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Check,
  Bot,
} from "lucide-react";

const PROPERTY_TYPES = [
  { value: "apartment", label: "公寓" },
  { value: "studio", label: "单间" },
  { value: "house", label: "独栋" },
  { value: "room", label: "房间" },
  { value: "condo", label: "公寓套房" },
  { value: "townhouse", label: "联排别墅" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿", color: "bg-gray-100 text-gray-700" },
  { value: "pending_review", label: "待审核", color: "bg-amber-100 text-amber-700" },
  { value: "published", label: "已发布", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "已拒绝", color: "bg-red-100 text-red-700" },
  { value: "archived", label: "已归档", color: "bg-gray-100 text-gray-500" },
];

const OUTREACH_OPTIONS = [
  { value: "not_contacted", label: "未联系" },
  { value: "contacted", label: "已联系" },
  { value: "in_conversation", label: "沟通中" },
  { value: "partnered", label: "已合作" },
  { value: "declined", label: "拒绝" },
  { value: "expired", label: "已失效" },
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

  // AI chat analysis state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatResult, setChatResult] = useState<any>(null);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

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
      toast.success("房源已更新");
      setSaving(false);
    },
    onError: (err) => {
      toast.error(err.message || "更新失败");
      setSaving(false);
    },
  });

  const updateOutreachMutation = trpc.apartments.updateOutreach.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const enrichMutation = trpc.listings.enrichListingFromChat.useMutation({
    onSuccess: (data) => {
      setChatResult(data);
      // Auto-select all updates
      const keys = new Set<string>();
      if (data.suggestedDescriptionAppend) keys.add("suggestedDescriptionAppend");
      if (data.newAmenities?.length) keys.add("newAmenities");
      if (data.newUtilities?.length) keys.add("newUtilities");
      const u = data.updates || {};
      for (const k of Object.keys(u)) {
        if (!["chatSummary", "suggestedDescriptionAppend", "newAmenities", "newUtilities"].includes(k)) {
          keys.add(k);
        }
      }
      setSelectedUpdates(keys);
    },
    onError: (err) => {
      toast.error(err.message || "AI 分析失败");
    },
  });

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const handleSave = () => {
    if (!form) return;
    if (form.title.trim().length < 5) {
      toast.error("标题至少需要5个字符");
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

  const handleAnalyzeChat = () => {
    if (!form || !chatText.trim()) return;
    setChatResult(null);
    enrichMutation.mutate({
      chatText: chatText.trim(),
      existingListing: {
        title: form.title || undefined,
        description: form.description || undefined,
        propertyType: form.propertyType || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        squareFeet: form.squareFeet ? Number(form.squareFeet) : undefined,
        monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : undefined,
        securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : undefined,
        availableFrom: form.availableFrom || undefined,
        petsAllowed: form.petsAllowed,
        parkingIncluded: form.parkingIncluded,
        amenities: form.amenitiesText ? form.amenitiesText.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        utilitiesIncluded: form.utilitiesText ? form.utilitiesText.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        isSublease: form.isSublease,
        subleaseEndDate: form.subleaseEndDate || undefined,
        wechatContact: form.wechatContact || undefined,
      },
    });
  };

  const FIELD_LABELS: Record<string, string> = {
    suggestedDescriptionAppend: "补充描述",
    newAmenities: "新增设施",
    newUtilities: "新增水电网",
    monthlyRent: "月租",
    securityDeposit: "押金",
    squareFeet: "面积",
    bedrooms: "卧室",
    bathrooms: "卫浴",
    petsAllowed: "允许宠物",
    parkingIncluded: "含停车位",
    isSublease: "转租",
    subleaseEndDate: "转租结束日期",
    wechatContact: "微信号",
    availableFrom: "可入住日期",
    propertyType: "房型",
    minLeaseTerm: "最短租期",
    maxLeaseTerm: "最长租期",
  };

  const handleApplyUpdates = () => {
    if (!form || !chatResult) return;
    let count = 0;
    const updates = chatResult.updates || {};

    if (selectedUpdates.has("suggestedDescriptionAppend") && chatResult.suggestedDescriptionAppend) {
      const sep = form.description ? "\n\n" : "";
      update("description", form.description + sep + chatResult.suggestedDescriptionAppend);
      count++;
    }
    if (selectedUpdates.has("newAmenities") && chatResult.newAmenities?.length) {
      const existing = form.amenitiesText ? form.amenitiesText.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const merged = [...existing, ...chatResult.newAmenities.filter((a: string) => !existing.some((e) => e.toLowerCase() === a.toLowerCase()))];
      update("amenitiesText", merged.join(", "));
      count++;
    }
    if (selectedUpdates.has("newUtilities") && chatResult.newUtilities?.length) {
      const existing = form.utilitiesText ? form.utilitiesText.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const merged = [...existing, ...chatResult.newUtilities.filter((u: string) => !existing.some((e) => e.toLowerCase() === u.toLowerCase()))];
      update("utilitiesText", merged.join(", "));
      count++;
    }

    // Direct field updates
    const directFields: Record<string, keyof FormData> = {
      monthlyRent: "monthlyRent",
      securityDeposit: "securityDeposit",
      squareFeet: "squareFeet",
      bedrooms: "bedrooms",
      bathrooms: "bathrooms",
      wechatContact: "wechatContact",
      availableFrom: "availableFrom",
      subleaseEndDate: "subleaseEndDate",
      propertyType: "propertyType",
      minLeaseTerm: "minLeaseTerm",
      maxLeaseTerm: "maxLeaseTerm",
    };
    for (const [updateKey, formKey] of Object.entries(directFields)) {
      if (selectedUpdates.has(updateKey) && updates[updateKey] !== undefined) {
        update(formKey, String(updates[updateKey]));
        count++;
      }
    }
    // Boolean fields
    if (selectedUpdates.has("petsAllowed") && updates.petsAllowed !== undefined) {
      update("petsAllowed", Boolean(updates.petsAllowed));
      count++;
    }
    if (selectedUpdates.has("parkingIncluded") && updates.parkingIncluded !== undefined) {
      update("parkingIncluded", Boolean(updates.parkingIncluded));
      count++;
    }
    if (selectedUpdates.has("isSublease") && updates.isSublease !== undefined) {
      update("isSublease", Boolean(updates.isSublease));
      count++;
    }

    toast.success(`已应用 ${count} 项更新`);
  };

  const toggleUpdate = (key: string) => {
    setSelectedUpdates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
          <span className="ml-2 text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  if (!listing || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-gray-500">房源不存在</p>
          <Link href="/admin">
            <Button variant="outline" className="mt-4">返回管理后台</Button>
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
              返回
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">编辑房源 #{listingId}</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存更改
          </Button>
        </div>

        {/* Location banner */}
        {hasLocation && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-sm text-green-700">
            <MapPin className="w-4 h-4 shrink-0" />
            已定位坐标: {Number((listing as any).latitude).toFixed(4)}, {Number((listing as any).longitude).toFixed(4)}
          </div>
        )}

        {/* AI Chat Analysis */}
        <Card className="border-0 shadow-soft mb-6">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-4 h-4" />
              AI 聊天分析
              <span className="ml-auto">
                {chatOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </span>
            </CardTitle>
            <CardDescription>粘贴与房东/转租人的微信聊天记录，AI 自动提取房源补充信息</CardDescription>
          </CardHeader>
          {chatOpen && (
            <CardContent className="space-y-4">
              <Textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={"粘贴微信聊天记录...\n\n例如：\n房东：这个房子在3楼，朝南的\n我：有家具吗？\n房东：有的，沙发床桌子都有，包水电网"}
                className="min-h-[120px] text-sm"
                maxLength={50000}
              />
              <Button
                onClick={handleAnalyzeChat}
                disabled={enrichMutation.isPending || !chatText.trim()}
                className="gap-2"
              >
                {enrichMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI 正在分析聊天记录...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    分析聊天记录
                  </>
                )}
              </Button>

              {/* Results */}
              {chatResult && (
                <div className="space-y-4 pt-2">
                  {/* Summary */}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-1">
                      <Lightbulb className="w-4 h-4" />
                      分析结果
                    </div>
                    <p className="text-sm text-amber-700">{chatResult.chatSummary}</p>
                  </div>

                  {/* Update items */}
                  {(() => {
                    const updates = chatResult.updates || {};
                    const items: { key: string; label: string; value: string }[] = [];

                    if (chatResult.suggestedDescriptionAppend) {
                      items.push({
                        key: "suggestedDescriptionAppend",
                        label: "补充描述",
                        value: chatResult.suggestedDescriptionAppend,
                      });
                    }
                    if (chatResult.newAmenities?.length) {
                      items.push({
                        key: "newAmenities",
                        label: "新增设施",
                        value: chatResult.newAmenities.join(", "),
                      });
                    }
                    if (chatResult.newUtilities?.length) {
                      items.push({
                        key: "newUtilities",
                        label: "新增水电网",
                        value: chatResult.newUtilities.join(", "),
                      });
                    }
                    for (const [k, v] of Object.entries(updates)) {
                      if (["chatSummary", "suggestedDescriptionAppend", "newAmenities", "newUtilities"].includes(k)) continue;
                      if (v === undefined || v === null) continue;
                      items.push({
                        key: k,
                        label: FIELD_LABELS[k] || k,
                        value: typeof v === "boolean" ? (v ? "是" : "否") : String(v),
                      });
                    }

                    if (items.length === 0) return null;

                    return (
                      <>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <label
                              key={item.key}
                              className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUpdates.has(item.key)}
                                onChange={() => toggleUpdate(item.key)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-700">{item.label}</div>
                                <div className="text-sm text-gray-500 break-words">{item.value}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <Button
                          onClick={handleApplyUpdates}
                          disabled={selectedUpdates.size === 0}
                          variant="outline"
                          className="gap-2 w-full"
                        >
                          <Check className="w-4 h-4" />
                          应用选中的更新 ({selectedUpdates.size})
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" /> 基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>标题 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="房源标题"
                />
              </div>
              <div className="space-y-1.5">
                <Label>房型</Label>
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
                <Label>描述</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="房源描述..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4" /> 位置信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>街道地址 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>城市 <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="Salt Lake City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>州 <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    placeholder="UT"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>邮编 <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.zipCode}
                    onChange={(e) => update("zipCode", e.target.value)}
                    placeholder="84101"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Lease */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-4 h-4" /> 价格与租约
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>月租 ($) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={form.monthlyRent}
                    onChange={(e) => update("monthlyRent", e.target.value)}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>押金 ($)</Label>
                  <Input
                    type="number"
                    value={form.securityDeposit}
                    onChange={(e) => update("securityDeposit", e.target.value)}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>申请费 ($)</Label>
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
                  <Label>可入住日期</Label>
                  <Input
                    type="date"
                    value={form.availableFrom}
                    onChange={(e) => update("availableFrom", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>最短租期 (月)</Label>
                  <Input
                    type="number"
                    value={form.minLeaseTerm}
                    onChange={(e) => update("minLeaseTerm", e.target.value)}
                    min={1} max={36}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>最长租期 (月)</Label>
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

          {/* Unit Details */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BedDouble className="w-4 h-4" /> 房型详情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>卧室 <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => update("bedrooms", e.target.value)}
                    min={0} max={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>卫浴 <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => update("bathrooms", e.target.value)}
                    min={0} max={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>面积 (sqft)</Label>
                  <Input
                    type="number"
                    value={form.squareFeet}
                    onChange={(e) => update("squareFeet", e.target.value)}
                    placeholder="可选"
                    min={0}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <Label className="cursor-pointer">允许宠物</Label>
                <Switch
                  checked={form.petsAllowed}
                  onCheckedChange={(v) => update("petsAllowed", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-1">
                <Label className="cursor-pointer">含停车位</Label>
                <Switch
                  checked={form.parkingIncluded}
                  onCheckedChange={(v) => update("parkingIncluded", v)}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>设施配套 <span className="text-muted-foreground text-xs">(逗号分隔)</span></Label>
                <Input
                  value={form.amenitiesText}
                  onChange={(e) => update("amenitiesText", e.target.value)}
                  placeholder="In-unit Laundry, Gym, Pool, Dishwasher..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>含费用项 <span className="text-muted-foreground text-xs">(逗号分隔)</span></Label>
                <Input
                  value={form.utilitiesText}
                  onChange={(e) => update("utilitiesText", e.target.value)}
                  placeholder="Water, Electric, Gas, Internet, Trash..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Sublease & Contact */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="w-4 h-4" /> 转租与联系
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="cursor-pointer">这是一套转租</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">原租客转租房源</p>
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
                    <Label>转租结束日期</Label>
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
                <Label>微信号</Label>
                <Input
                  value={form.wechatContact}
                  onChange={(e) => update("wechatContact", e.target.value)}
                  placeholder="微信联系人 ID"
                />
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="w-4 h-4" /> 照片
              </CardTitle>
              <CardDescription>拖放或点击上传，最多10张，可拖动排序</CardDescription>
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

          {/* Status & Admin */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-4 h-4" /> 状态管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>发布状态</Label>
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
                  <Label>联系追踪状态</Label>
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
                <Label className="cursor-pointer">置顶推荐</Label>
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => update("featured", v)}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>联系备注</Label>
                <Textarea
                  value={form.outreachNotes}
                  onChange={(e) => update("outreachNotes", e.target.value)}
                  placeholder="备注信息..."
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
                返回管理后台
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存更改
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
