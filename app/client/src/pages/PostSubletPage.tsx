/**
 * /sublets/post — form for submitting a sublet listing.
 *
 * No backend — demo only. On submit: console.log + redirect to /sublets.
 * Must render MockDataBanner to clarify that nothing is persisted.
 */

import { Navbar } from "@/components/Navbar";
import { MockDataBanner } from "@/components/MockDataBanner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBLET_SOURCES } from "@/lib/subletMockData";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type SubletSourceKey = "manual_other" | "manual_wechat" | "manual_xhs" | "craigslist" | "reddit";

const SOURCE_KEYS: SubletSourceKey[] = [
  "manual_other",
  "manual_wechat",
  "manual_xhs",
  "craigslist",
  "reddit",
];

interface FormState {
  title: string;
  titleZh: string;
  monthlyRent: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  availableFrom: string;
  subleaseEndDate: string;
  source: SubletSourceKey | "";
  images: string[];
}

const EMPTY_FORM: FormState = {
  title: "",
  titleZh: "",
  monthlyRent: "",
  address: "",
  city: "Salt Lake City",
  state: "UT",
  zipCode: "",
  bedrooms: "",
  bathrooms: "",
  squareFeet: "",
  availableFrom: "",
  subleaseEndDate: "",
  source: "",
  images: [],
};

const PASTE_PLACEHOLDER =
  `[Craigslist example]\n3BR/1BA near University of Utah – $1,150/mo\n180 S 1300 E, Apt 3, Salt Lake City, UT 84102\nAvail Aug 1 – Dec 20, 2026. 680 sqft. Quiet building.\nContact: craigslist.org/post/12345\n\n---\n\n[微信群转租]\n盐湖城大学区转租，2室1卫，820平方英尺\n月租$1,050，8月15日入住，转租至2027年1月15日\n地址：220 S Mario Capecchi Dr, SLC UT 84132\n微信联系：bridgestay2026`;

export default function PostSubletPage() {
  const { language } = useLanguage();
  const { user, loading: authLoading, signIn } = useAuth();
  const [, setLocation] = useLocation();
  const isCn = language === "cn";
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [mode, setMode] = useState<"manual" | "paste">("manual");
  const [pasteText, setPasteText] = useState("");

  const parseFromText = trpc.sublets.parseFromText.useMutation();
  const createSublet = trpc.sublets.create.useMutation({
    onSuccess(result) {
      toast.success(isCn ? "发布成功！/ Posted successfully!" : "Posted successfully! / 发布成功！");
      setLocation(`/sublets/${result.id}`);
    },
    onError(err) {
      toast.error(
        isCn
          ? `发布失败：${err.message} / Failed: ${err.message}`
          : `Failed: ${err.message} / 发布失败：${err.message}`
      );
    },
  });

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) next.title = isCn ? "必填" : "Required";
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0)
      next.monthlyRent = isCn ? "请输入有效金额" : "Enter a valid amount";
    if (!form.address.trim()) next.address = isCn ? "必填" : "Required";
    if (form.bedrooms === "") next.bedrooms = isCn ? "必填" : "Required";
    if (form.bathrooms === "") next.bathrooms = isCn ? "必填" : "Required";
    if (!form.availableFrom) next.availableFrom = isCn ? "必填" : "Required";
    if (!form.subleaseEndDate) next.subleaseEndDate = isCn ? "必填" : "Required";
    if (!form.source) next.source = isCn ? "请选择来源" : "Select a source";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createSublet.mutate({
      titleEn: form.title.trim(),
      titleZh: form.titleZh.trim() || undefined,
      monthlyRent: Number(form.monthlyRent),
      address: form.address.trim(),
      city: form.city.trim() || "Salt Lake City",
      state: form.state.trim() || "UT",
      zipCode: form.zipCode.trim() || "",
      securityDeposit: Number(form.monthlyRent),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      squareFeet: form.squareFeet ? Number(form.squareFeet) : undefined,
      availableFrom: form.availableFrom,
      subleaseEndDate: form.subleaseEndDate,
      source: form.source || undefined,
      images: form.images,
    });
  }

  async function handleExtract() {
    try {
      const result = await parseFromText.mutateAsync({ text: pasteText.trim() });
      if (result.ok) {
        const p = result.parsed;
        setForm((prev) => ({
          ...prev,
          title: p.titleEn ?? prev.title,
          titleZh: p.titleZh ?? prev.titleZh,
          monthlyRent: p.monthlyRent != null ? String(p.monthlyRent) : prev.monthlyRent,
          address: p.address ?? prev.address,
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : prev.bedrooms,
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : prev.bathrooms,
          squareFeet: p.squareFeet != null ? String(p.squareFeet) : prev.squareFeet,
          availableFrom: p.availableFrom ?? prev.availableFrom,
          subleaseEndDate: p.subleaseEndDate ?? prev.subleaseEndDate,
          source: p.sourceHint ?? prev.source,
        }));
        setMode("manual");
        toast.success(
          isCn
            ? "已自动填表，请检查 / Form auto-filled — please review"
            : "Form auto-filled — please review / 已自动填表，请检查"
        );
      } else {
        const errMsg = result.error || (isCn ? "未知错误" : "unknown");
        toast.error(
          isCn
            ? `提取失败：${errMsg} / Extraction failed: ${errMsg}`
            : `Extraction failed: ${errMsg} / 提取失败：${errMsg}`
        );
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : isCn ? "未知错误" : "unknown";
      toast.error(
        isCn
          ? `提取失败：${errMsg} / Extraction failed: ${errMsg}`
          : `Extraction failed: ${errMsg} / 提取失败：${errMsg}`
      );
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <h2 className="text-xl font-semibold text-neutral-900">
                {isCn
                  ? "请先登录后发布短租"
                  : "Please sign in to post a sublet"}
              </h2>
              <p className="text-sm text-neutral-500">
                {isCn
                  ? "您需要登录才能发布转租房源。"
                  : "You need to be signed in to post a sublet listing."}
              </p>
              <Button onClick={signIn} className="bg-orange-500 hover:bg-orange-600 text-white">
                {isCn ? "使用 Google 登录" : "Sign in with Google"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <MockDataBanner source="manual_other" />

        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {isCn ? "发布转租房源" : "Post a Sublet"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isCn
              ? "填写以下信息。提交后仅记录到控制台（演示模式）。"
              : "Fill in the details below. Submissions are logged to console only (demo mode)."}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={
              mode === "manual"
                ? "rounded-full px-4 py-1.5 text-sm font-medium bg-orange-500 text-white shadow-sm transition-colors"
                : "rounded-full px-4 py-1.5 text-sm font-medium bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 transition-colors"
            }
          >
            {isCn ? "手动填写 / Manual" : "Manual / 手动填写"}
          </button>
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={
              mode === "paste"
                ? "rounded-full px-4 py-1.5 text-sm font-medium bg-orange-500 text-white shadow-sm transition-colors"
                : "rounded-full px-4 py-1.5 text-sm font-medium bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 transition-colors"
            }
          >
            {isCn ? "从文本粘贴 / Paste from text" : "Paste from text / 从文本粘贴"}
          </button>
        </div>

        {/* Paste panel */}
        {mode === "paste" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Textarea
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={PASTE_PLACEHOLDER}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-neutral-500">
                {isCn
                  ? "AI 会读取文本自动填表 / AI will auto-fill the form below"
                  : "AI will auto-fill the form below / AI 会读取文本自动填表"}
              </p>
              <Button
                type="button"
                onClick={handleExtract}
                disabled={pasteText.trim().length < 20 || parseFromText.isPending}
                className="w-full"
              >
                {parseFromText.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isCn ? "提取中…" : "Extracting…"}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isCn ? "提取 / Extract" : "Extract / 提取"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual form */}
        {mode === "manual" && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  {isCn ? "标题（英文）" : "Title (English)"}
                  <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder={isCn ? "例：U District 1BR, Aug sublease" : "e.g. U District 1BR, Aug sublease"}
                />
                {errors.title && (
                  <p className="text-xs text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Title ZH */}
              <div className="space-y-1.5">
                <Label htmlFor="titleZh">
                  {isCn ? "中文标题（可选）" : "Chinese Title (optional)"}
                </Label>
                <Input
                  id="titleZh"
                  value={form.titleZh}
                  onChange={(e) => update("titleZh", e.target.value)}
                  placeholder={isCn ? "例：大学区一房一厅" : "e.g. 大学区一房一厅"}
                />
              </div>

              {/* Monthly Rent */}
              <div className="space-y-1.5">
                <Label htmlFor="monthlyRent">
                  {isCn ? "月租金（USD）" : "Monthly Rent (USD)"}
                  <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min={0}
                  step={50}
                  value={form.monthlyRent}
                  onChange={(e) => update("monthlyRent", e.target.value)}
                  placeholder="950"
                />
                {errors.monthlyRent && (
                  <p className="text-xs text-red-600">{errors.monthlyRent}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">
                  {isCn ? "地址" : "Address"}
                  <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder={isCn ? "例：180 S 1300 E, Apt 3, Salt Lake City, UT" : "e.g. 180 S 1300 E, Apt 3, Salt Lake City, UT"}
                />
                {errors.address && (
                  <p className="text-xs text-red-600">{errors.address}</p>
                )}
              </div>

              {/* Bedrooms + Bathrooms */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bedrooms">
                    {isCn ? "卧室数（0 = 开间）" : "Bedrooms (0 = studio)"}
                    <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={form.bedrooms}
                    onChange={(e) => update("bedrooms", e.target.value)}
                    placeholder="0"
                  />
                  {errors.bedrooms && (
                    <p className="text-xs text-red-600">{errors.bedrooms}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bathrooms">
                    {isCn ? "浴室数" : "Bathrooms"}
                    <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={form.bathrooms}
                    onChange={(e) => update("bathrooms", e.target.value)}
                    placeholder="1"
                  />
                  {errors.bathrooms && (
                    <p className="text-xs text-red-600">{errors.bathrooms}</p>
                  )}
                </div>
              </div>

              {/* Square Feet */}
              <div className="space-y-1.5">
                <Label htmlFor="squareFeet">
                  {isCn ? "面积（平方英尺，可选）" : "Square Feet (optional)"}
                </Label>
                <Input
                  id="squareFeet"
                  type="number"
                  min={0}
                  step={10}
                  value={form.squareFeet}
                  onChange={(e) => update("squareFeet", e.target.value)}
                  placeholder="480"
                />
              </div>

              {/* Available From + Sublease End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="availableFrom">
                    {isCn ? "最早入住日期" : "Available From"}
                    <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <Input
                    id="availableFrom"
                    type="date"
                    value={form.availableFrom}
                    onChange={(e) => update("availableFrom", e.target.value)}
                  />
                  {errors.availableFrom && (
                    <p className="text-xs text-red-600">{errors.availableFrom}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subleaseEndDate">
                    {isCn ? "转租结束日期" : "Sublease End Date"}
                    <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <Input
                    id="subleaseEndDate"
                    type="date"
                    value={form.subleaseEndDate}
                    onChange={(e) => update("subleaseEndDate", e.target.value)}
                  />
                  {errors.subleaseEndDate && (
                    <p className="text-xs text-red-600">{errors.subleaseEndDate}</p>
                  )}
                </div>
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <Label htmlFor="source">
                  {isCn ? "来源渠道" : "Source"}
                  <span className="text-red-500 ml-0.5">*</span>
                </Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => update("source", v as SubletSourceKey)}
                >
                  <SelectTrigger id="source">
                    <SelectValue
                      placeholder={isCn ? "请选择来源渠道" : "Select a source channel"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {isCn
                          ? SUBLET_SOURCES[key].labelZh
                          : SUBLET_SOURCES[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.source && (
                  <p className="text-xs text-red-600">{errors.source}</p>
                )}
              </div>

              {/* Photos */}
              <div className="space-y-1.5">
                <Label>
                  {isCn ? "房源照片（可选）" : "Photos (optional)"}
                </Label>
                <MultiImageUpload
                  images={form.images}
                  onChange={(imgs) => setForm((prev) => ({ ...prev, images: imgs }))}
                  maxImages={8}
                  maxSizeMB={10}
                  language={language === "cn" ? "cn" : "en"}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={createSublet.isPending}>
                  {createSublet.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isCn ? "发布中…" : "Posting…"}
                    </>
                  ) : (
                    isCn ? "发布转租" : "Post Sublet"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/sublets")}
                >
                  {isCn ? "取消" : "Cancel"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )}
      </main>
    </div>
  );
}
