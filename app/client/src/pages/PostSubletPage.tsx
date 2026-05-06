/**
 * /sublets/post — form for submitting a sublet listing.
 *
 * No backend — demo only. On submit: console.log + redirect to /sublets.
 * Must render MockDataBanner to clarify that nothing is persisted.
 */

import { Navbar } from "@/components/Navbar";
import { MockDataBanner } from "@/components/MockDataBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBLET_SOURCES } from "@/lib/subletMockData";
import { useState } from "react";
import { useLocation } from "wouter";

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
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  availableFrom: string;
  subleaseEndDate: string;
  source: SubletSourceKey | "";
}

const EMPTY_FORM: FormState = {
  title: "",
  titleZh: "",
  monthlyRent: "",
  address: "",
  bedrooms: "",
  bathrooms: "",
  squareFeet: "",
  availableFrom: "",
  subleaseEndDate: "",
  source: "",
};

export default function PostSubletPage() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const isCn = language === "cn";

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

    const data = {
      title: form.title.trim(),
      titleZh: form.titleZh.trim() || undefined,
      monthlyRent: Number(form.monthlyRent),
      address: form.address.trim(),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      squareFeet: form.squareFeet ? Number(form.squareFeet) : undefined,
      availableFrom: form.availableFrom,
      subleaseEndDate: form.subleaseEndDate,
      source: form.source,
    };

    console.log("New sublet posted:", data);
    setLocation("/sublets");
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

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">
                  {isCn ? "发布转租" : "Post Sublet"}
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
      </main>
    </div>
  );
}
