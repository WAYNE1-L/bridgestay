import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trackEvent } from "@/lib/analytics";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageSquare,
  Upload,
  Wand2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImageIcon,
  Building2,
  MapPin,
  DollarSign,
  BedDouble,
  Sparkles,
  ShieldAlert,
  Tag,
  Lightbulb,
  ChevronDown,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ExtractedListing = {
  title: string;
  description?: string;
  propertyType?: string;
  propertyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  monthlyRent?: number;
  securityDeposit?: number;
  availableFrom?: string;
  petsAllowed?: boolean;
  parkingIncluded?: boolean;
  amenities?: string[];
  utilitiesIncluded?: string[];
  isSublease?: boolean;
  subleaseEndDate?: string;
  leaseTerm?: number;
  furnished?: boolean;
  wechatContact?: string;
  confidence: "high" | "medium" | "low";
  extractionSource?: "gemini" | "heuristic-fallback";
  extractionWarning?: string;
  extractionWarnings?: string[];
  locationSource?: "direct_text" | "place_lookup" | "unresolved";
  locationConfidence?: "high" | "medium" | "low";
  duplicateContentRemoved?: boolean;
  multipleListingCandidatesDetected?: boolean;
  conflictingAddressesDetected?: boolean;
  extractedFromBestCandidateChunk?: boolean;
  candidateChunkCount?: number;
  truncatedPreviewOfOtherChunks?: string[];
  otherCandidateChunks?: string[];
};

type PropertyType =
  | "apartment"
  | "studio"
  | "house"
  | "room"
  | "condo"
  | "townhouse";

type FormState = {
  title: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: string;
  monthlyRent: string;
  securityDeposit: string;
  availableFrom: string;
  petsAllowed: boolean;
  parkingIncluded: boolean;
  amenitiesText: string;    // comma-separated; split on save
  utilitiesText: string;    // comma-separated utilities included in rent
  isSublease: boolean;
  subleaseEndDate: string;  // ISO date string or ""
  leaseTerm: string;        // months as string, or ""
  wechatContact: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function makeDefaultForm(): FormState {
  return {
    title: "",
    description: "",
    propertyType: "apartment",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: "",
    monthlyRent: "",
    securityDeposit: "",
    availableFrom: "",
    petsAllowed: false,
    parkingIncluded: false,
    amenitiesText: "",
    utilitiesText: "",
    isSublease: false,
    subleaseEndDate: "",
    leaseTerm: "",
    wechatContact: "",
  };
}

function applyExtracted(form: FormState, e: ExtractedListing): FormState {
  const isValidPropertyType = (v?: string): v is PropertyType =>
    ["apartment", "studio", "house", "room", "condo", "townhouse"].includes(
      v ?? ""
    );

  // Merge "Furnished" into amenities when the LLM detected furnished=true
  const baseAmenities = e.amenities ?? [];
  const amenityList =
    e.furnished === true && !baseAmenities.includes("Furnished")
      ? ["Furnished", ...baseAmenities]
      : baseAmenities;

  return {
    ...form,
    title: e.title || form.title,
    description: e.description || form.description,
    propertyType: isValidPropertyType(e.propertyType)
      ? e.propertyType
      : form.propertyType,
    address: e.address || form.address,
    city: e.city || form.city,
    state: e.state ? e.state.toUpperCase().slice(0, 2) : form.state,
    zipCode: e.zipCode || form.zipCode,
    bedrooms: e.bedrooms ?? form.bedrooms,
    bathrooms: e.bathrooms ?? form.bathrooms,
    squareFeet: e.squareFeet?.toString() ?? form.squareFeet,
    monthlyRent: e.monthlyRent?.toString() ?? form.monthlyRent,
    securityDeposit: e.securityDeposit?.toString() ?? form.securityDeposit,
    availableFrom: e.availableFrom?.split("T")[0] ?? form.availableFrom,
    petsAllowed: e.petsAllowed ?? form.petsAllowed,
    parkingIncluded: e.parkingIncluded ?? form.parkingIncluded,
    amenitiesText: amenityList.length > 0 ? amenityList.join(", ") : form.amenitiesText,
    utilitiesText: e.utilitiesIncluded?.join(", ") ?? form.utilitiesText,
    isSublease: e.isSublease ?? form.isSublease,
    subleaseEndDate: e.subleaseEndDate?.split("T")[0] ?? form.subleaseEndDate,
    leaseTerm: e.leaseTerm?.toString() ?? form.leaseTerm,
    wechatContact: e.wechatContact ?? form.wechatContact,
  };
}

const CONFIDENCE = {
  high: {
    label: "高置信度 — 大多数字段已成功提取",
    classes: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    Icon: CheckCircle2,
  },
  medium: {
    label: "中等置信度 — 请复核并补充缺失字段",
    classes: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    Icon: AlertCircle,
  },
  low: {
    label: "低置信度 — AI 未能识别足够结构，请手动补充",
    classes: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    Icon: AlertCircle,
  },
} as const;

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS = ["Input · 输入", "Review · 审核", "Done · 完成"] as const;
type Step = "input" | "review" | "success";

function StepBar({ current }: { current: Step }) {
  const idx = { input: 0, review: 1, success: 2 }[current];
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i < idx
                ? "bg-green-500 text-white"
                : i === idx
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </div>
          <span
            className={`text-sm hidden sm:inline ${
              i === idx ? "text-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ── AI skill analysis types ───────────────────────────────────────────────

type SkillResult = {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  confidence: "high" | "medium" | "low";
  extra?: Record<string, unknown>;
};
type SkillAnalysis = { skillName: string; result: SkillResult; model: string };
type SkillStatus = "idle" | "loading" | "done" | "error";

function normalizeSkillAnalysis(data: unknown): SkillAnalysis {
  const payload = (data ?? {}) as Record<string, unknown>;
  const result = (payload.result ?? {}) as Record<string, unknown>;

  return {
    skillName: String(payload.skillName ?? ""),
    model: String(payload.model ?? ""),
    result: {
      summary: String(result.summary ?? ""),
      strengths: Array.isArray(result.strengths) ? result.strengths.map(String) : [],
      risks: Array.isArray(result.risks) ? result.risks.map(String) : [],
      recommendations: Array.isArray(result.recommendations)
        ? result.recommendations.map(String)
        : [],
      confidence: (
        ["high", "medium", "low"].includes(result.confidence as string)
          ? result.confidence
          : "low"
      ) as SkillResult["confidence"],
      extra:
        typeof result.extra === "object" && result.extra
          ? (result.extra as Record<string, unknown>)
          : undefined,
    },
  };
}

function hasSubleaseSignal(listing: ExtractedListing): boolean {
  return listing.isSublease === true || Boolean(listing.subleaseEndDate);
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

type MissingFieldKey =
  | "availableFrom"
  | "subleaseEndDate"
  | "parkingIncluded"
  | "furnished"
  | "monthlyRent";

const FIELD_LABELS: Record<MissingFieldKey, string> = {
  availableFrom: "入住日期",
  subleaseEndDate: "转租结束日期",
  parkingIncluded: "停车信息",
  furnished: "家具/设施",
  monthlyRent: "月租",
};

const CONFIDENCE_LABELS: Record<SkillResult["confidence"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function getMissingFieldKeys(items: string[]): Set<MissingFieldKey> {
  const keys = new Set<MissingFieldKey>();

  for (const item of items) {
    const value = item.toLowerCase();

    if (
      value.includes("move-in") ||
      value.includes("move in") ||
      value.includes("available from") ||
      value.includes("availability date") ||
      value.includes("available date")
    ) {
      keys.add("availableFrom");
    }

    if (
      value.includes("lease end") ||
      value.includes("sublease end") ||
      value.includes("end date")
    ) {
      keys.add("subleaseEndDate");
    }

    if (value.includes("parking")) {
      keys.add("parkingIncluded");
    }

    if (value.includes("furnished") || value.includes("furnishing")) {
      keys.add("furnished");
    }

    if (value.includes("price") || value.includes("rent") || value.includes("monthly rent")) {
      keys.add("monthlyRent");
    }
  }

  return keys;
}

function getMissingFieldKey(item: string): MissingFieldKey | null {
  const keys = getMissingFieldKeys([item]);
  return keys.values().next().value ?? null;
}

function looksLikeRawAiPayload(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  if (/^```(?:json)?/i.test(normalized) || /^[{[]/.test(normalized)) return true;

  const rawKeyMatches = normalized.match(
    /["']?(summary|strengths|risks|recommendations|confidence)["']?\s*[:=]/gi
  );
  return (rawKeyMatches?.length ?? 0) >= 2;
}

function containsChineseText(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function cleanReviewText(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || looksLikeRawAiPayload(trimmed)) return "";
  if (!containsChineseText(trimmed)) return "";
  return trimmed;
}

function cleanReviewList(values: string[] | undefined): string[] {
  return (values ?? [])
    .map(cleanReviewText)
    .filter((value) => value.length > 0);
}

function formatMissingField(field: string): string {
  const fieldKey = getMissingFieldKey(field);
  return fieldKey ? FIELD_LABELS[fieldKey] : cleanReviewText(field);
}

function formatConfidenceLabel(confidence: SkillResult["confidence"]): string {
  return CONFIDENCE_LABELS[confidence] ?? CONFIDENCE_LABELS.low;
}

function formatExtractionWarning(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("truncated")) {
    return "AI 返回内容不完整，已使用规则提取结果。请重点复核字段。";
  }
  if (normalized.includes("malformed json") || normalized.includes("invalid json")) {
    return "AI 返回格式异常，已使用规则提取结果。请重点复核字段。";
  }
  if (normalized.includes("schema")) {
    return "AI 返回字段不完整，已使用规则提取结果。请重点复核字段。";
  }
  if (normalized.includes("heuristic") || normalized.includes("gemini was unavailable")) {
    return "AI 暂不可用，已使用规则提取结果。请重点复核字段。";
  }
  return "提取结果需要人工复核。";
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ImportListing() {
  const [, navigate] = useLocation();

  // Step
  const [step, setStep] = useState<Step>("input");

  // Step 1 state — text and image are both always visible; at least one is required
  const [inputText, setInputText] = useState("");
  const [imageData, setImageData] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [imageName, setImageName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction result
  const [extracted, setExtracted] = useState<ExtractedListing | null>(null);

  // Step 2 form state
  const [form, setForm] = useState<FormState>(makeDefaultForm());
  const [images, setImages] = useState<string[]>([]);

  // Step 3
  const [savedId, setSavedId] = useState<number | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  // ── Batch import state ───────────────────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ success: boolean; listing?: any; error?: string; sourceText: string }>>([]);
  const [batchIndex, setBatchIndex] = useState(0);

  // ── AI skill analysis state ──────────────────────────────────────────────
  const [listingAnalysis, setListingAnalysis] = useState<SkillAnalysis | null>(null);
  const [listingAnalysisStatus, setListingAnalysisStatus] = useState<SkillStatus>("idle");
  const [isListingSuggestionsOpen, setIsListingSuggestionsOpen] = useState(false);

  const [subleaseAnalysis, setSubleaseAnalysis] = useState<SkillAnalysis | null>(null);
  const [subleaseAnalysisStatus, setSubleaseAnalysisStatus] = useState<SkillStatus>("idle");
  const [isSubleaseReviewOpen, setIsSubleaseReviewOpen] = useState(false);

  // ── Geocoding state ──────────────────────────────────────────────────────
  type GeocodeStatus = "idle" | "loading" | "found" | "not_found";
  const [geocodeStatus, setGeocodeStatus] = useState<GeocodeStatus>("idle");
  const [geocodedData, setGeocodedData] = useState<{
    latitude: number;
    longitude: number;
    displayName: string;
    nearbyUniversities: string[];
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldRefs = useRef<Partial<Record<MissingFieldKey, HTMLDivElement | null>>>(
    {}
  );
  const hasTrackedSuggestionsShownRef = useRef(false);
  const hasTrackedSubleaseReviewShownRef = useRef(false);
  const usedTitleAssistRef = useRef(false);
  const usedTagsAssistRef = useRef(false);
  const usedJumpAssistRef = useRef(false);
  const hasTrackedPublishAfterAiAssistRef = useRef(false);

  // ── Mutations ────────────────────────────────────────────────────────────

  function loadExtractedIntoForm(data: any) {
    const listingJson = JSON.stringify(data);
    const shouldRunSubleaseReview = hasSubleaseSignal(data);
    const nextForm = applyExtracted(makeDefaultForm(), data);

    setListingAnalysis(null);
    setListingAnalysisStatus("loading");
    setSubleaseAnalysis(null);
    setSubleaseAnalysisStatus(shouldRunSubleaseReview ? "loading" : "idle");
    setIsListingSuggestionsOpen(false);
    setIsSubleaseReviewOpen(false);
    hasTrackedSuggestionsShownRef.current = false;
    hasTrackedSubleaseReviewShownRef.current = false;
    usedTitleAssistRef.current = false;
    usedTagsAssistRef.current = false;
    usedJumpAssistRef.current = false;
    hasTrackedPublishAfterAiAssistRef.current = false;

    setExtracted(data);
    setForm(nextForm);
    if (
      data.address &&
      typeof data.latitude === "number" &&
      typeof data.longitude === "number"
    ) {
      setGeocodeStatus("found");
      setGeocodedData({
        latitude: data.latitude,
        longitude: data.longitude,
        displayName: [data.address, data.city, data.state, data.zipCode]
          .filter(Boolean)
          .join(", "),
        nearbyUniversities: [],
      });
    } else {
      setGeocodeStatus("idle");
      setGeocodedData(null);
    }
    setStep("review");

    listingQualityMutation.mutate({ listingJson });

    if (shouldRunSubleaseReview) {
      subleaseRiskMutation.mutate({
        skillName: "sublease-risk-analyst",
        question:
          "请用简体中文审查这条已提取的转租房源，重点指出风险点、正面因素、建议下一步和缺失信息。输出内容面向 BridgeStay 管理员内部审核，不要面向公开用户。",
        context: listingJson,
      });
    }
  }

  const extractMutation = trpc.listings.extractFromWeChat.useMutation({
    onSuccess(data) {
      loadExtractedIntoForm(data);
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const batchExtractMutation = trpc.listings.extractBatchFromWeChat.useMutation({
    onSuccess(data) {
      toast.success(`Extracted ${data.results.filter(r => r.success).length}/${data.total} listings`);
      setBatchResults(data.results);
      setBatchIndex(0);
      // Load first successful result into review form
      const first = data.results.find(r => r.success);
      if (first?.listing) {
        loadExtractedIntoForm(first.listing);
      }
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const createMutation = trpc.apartments.create.useMutation({
    onSuccess(data) {
      // Guard: id must be a positive integer before navigating to the detail page.
      if (typeof data.id !== "number" || data.id <= 0) {
        toast.error("Listing saved but could not determine its ID. Check your dashboard.");
        return;
      }

      // Auto-advance to next batch item
      if (batchResults.length > 0 && batchIndex < batchResults.length - 1) {
        let nextSuccessIdx = batchIndex + 1;
        while (nextSuccessIdx < batchResults.length && !batchResults[nextSuccessIdx].success) {
          nextSuccessIdx++;
        }
        if (nextSuccessIdx < batchResults.length && batchResults[nextSuccessIdx].listing) {
          setBatchIndex(nextSuccessIdx);
          loadExtractedIntoForm(batchResults[nextSuccessIdx].listing);
          setImages([]);
          toast.info(`Saved! Moving to listing ${nextSuccessIdx + 1} of ${batchResults.length}`);
          return; // Don't go to success step
        }
      }

      setSavedId(data.id);
      setIsPublished(false);
      setStep("success");
    },
    onError(err) {
      toast.error("Failed to save listing: " + err.message);
    },
  });

  const publishMutation = trpc.apartments.publish.useMutation({
    onSuccess() {
      const hasUsedAiAssist =
        usedTitleAssistRef.current ||
        usedTagsAssistRef.current ||
        usedJumpAssistRef.current;

      if (hasUsedAiAssist && !hasTrackedPublishAfterAiAssistRef.current) {
        hasTrackedPublishAfterAiAssistRef.current = true;
        trackEvent("import_listing_publish_after_ai_assist", {
          usedTitleAssist: usedTitleAssistRef.current,
          usedTagsAssist: usedTagsAssistRef.current,
          usedJumpAssist: usedJumpAssistRef.current,
        });
      }
      setIsPublished(true);
      toast.success("Listing is now live!");
    },
    onError(err) {
      toast.error("Could not publish: " + err.message);
    },
  });

  const geocodeMutation = trpc.listings.geocodeAddress.useMutation({
    onSuccess(data) {
      if (data.found) {
        setGeocodeStatus("found");
        setGeocodedData({
          latitude: data.latitude!,
          longitude: data.longitude!,
          displayName: data.displayName!,
          nearbyUniversities: data.nearbyUniversities,
        });
      } else {
        setGeocodeStatus("not_found");
        setGeocodedData(null);
      }
    },
    onError() {
      setGeocodeStatus("not_found");
      setGeocodedData(null);
    },
  });

  // ── AI skill analysis mutations ──────────────────────────────────────────
  const listingQualityMutation = trpc.ai.analyzeListingQuality.useMutation({
    onSuccess(data) {
      setListingAnalysis(normalizeSkillAnalysis(data));
      setListingAnalysisStatus("done");
    },
    onError() {
      setListingAnalysisStatus("error");
    },
  });

  const subleaseRiskMutation = trpc.ai.runSkillPerspective.useMutation({
    onSuccess(data) {
      setSubleaseAnalysis(normalizeSkillAnalysis(data));
      setSubleaseAnalysisStatus("done");
    },
    onError() {
      setSubleaseAnalysisStatus("error");
    },
  });

  function reextractCandidate(chunk: string) {
    extractMutation.mutate({ text: chunk });
  }

  // ── Debounced geocoding — fires when address fields are complete ──────────
  useEffect(() => {
    if (step !== "review") return;
    // Require all four fields to have meaningful values before calling
    if (
      form.address.length < 5 ||
      form.city.length < 2 ||
      form.state.length !== 2
    )
      return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setGeocodeStatus("loading");
    setGeocodedData(null);

    debounceRef.current = setTimeout(() => {
      geocodeMutation.mutate({
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode || undefined,
      });
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.address, form.city, form.state, form.zipCode, step]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImageData({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  function handleExtract() {
    if (!inputText.trim() && !imageData) {
      toast.error("Please paste listing text or upload a screenshot first");
      return;
    }
    setListingAnalysis(null);
    setListingAnalysisStatus("idle");
    setSubleaseAnalysis(null);
    setSubleaseAnalysisStatus("idle");
    setIsListingSuggestionsOpen(false);
    setIsSubleaseReviewOpen(false);
    hasTrackedSuggestionsShownRef.current = false;
    hasTrackedSubleaseReviewShownRef.current = false;
    usedTitleAssistRef.current = false;
    usedTagsAssistRef.current = false;
    usedJumpAssistRef.current = false;
    hasTrackedPublishAfterAiAssistRef.current = false;
    if (batchMode) {
      batchExtractMutation.mutate({ text: inputText.trim() });
    } else {
      extractMutation.mutate({
        text: inputText.trim() || undefined,
        imageBase64: imageData?.base64,
        mimeType: imageData?.mimeType,
      });
    }
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function applySuggestedTitle() {
    if (!listingSuggestedTitle) return;
    usedTitleAssistRef.current = true;
    update("title", listingSuggestedTitle);
    trackEvent("import_listing_ai_apply_suggested_title", {
      hasSuggestedTitle: true,
    });
    toast.success("Applied AI title suggestion");
  }

  function applySuggestedTags() {
    if (listingSuggestedTags.length === 0) return;
    usedTagsAssistRef.current = true;

    const existingTags = splitCommaSeparated(form.amenitiesText);
    const seen = new Set(existingTags.map((tag) => tag.toLowerCase()));
    const mergedTags = [...existingTags];

    for (const tag of listingSuggestedTags) {
      const normalized = tag.trim();
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      mergedTags.push(normalized);
    }

    update("amenitiesText", mergedTags.join(", "));
    trackEvent("import_listing_ai_apply_tags", {
      suggestedTagCount: listingSuggestedTags.length,
      mergedTagCount: mergedTags.length,
    });
    toast.success("Applied AI tags to amenities");
  }

  function jumpToField(field: MissingFieldKey) {
    const element = fieldRefs.current[field];
    if (!element) return;

    usedJumpAssistRef.current = true;
    trackEvent("import_listing_ai_jump_to_field", {
      field,
    });
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleSave() {
    // Client-side validation matching server schema requirements
    if (form.title.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (form.address.length < 5 || !/\d/.test(form.address) || !/[A-Za-z]/.test(form.address)) {
      toast.error("Please enter a valid street address");
      return;
    }
    if (form.city.length < 2) {
      toast.error("Please enter a city");
      return;
    }
    if (form.state.length < 2) {
      toast.error("Please enter a 2-letter state code (e.g. CA)");
      return;
    }
    if (form.zipCode.length < 5) {
      toast.error("Please enter a valid zip code");
      return;
    }
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) {
      toast.error("Please enter a monthly rent amount");
      return;
    }
    if (!form.availableFrom) {
      toast.error("Please enter an available-from date");
      return;
    }

    const amenities = form.amenitiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const utilities = form.utilitiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      propertyType: form.propertyType,
      address: form.address,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      squareFeet: form.squareFeet ? Number(form.squareFeet) : undefined,
      monthlyRent: Number(form.monthlyRent),
      securityDeposit: Number(form.securityDeposit) || 0,
      availableFrom: form.availableFrom,
      petsAllowed: form.petsAllowed,
      parkingIncluded: form.parkingIncluded,
      amenities: amenities.length > 0 ? amenities : undefined,
      utilitiesIncluded: utilities.length > 0 ? utilities : undefined,
      images: images.length > 0 ? images : undefined,
      // Sublease fields — subleaseEndDate and leaseTerm only apply to subleases
      isSublease: form.isSublease || undefined,
      subleaseEndDate: form.isSublease && form.subleaseEndDate ? form.subleaseEndDate : undefined,
      wechatContact: form.wechatContact || undefined,
      // For subleases: use the extracted term as both min and max (fixed period).
      // For direct leases: omit and let the DB defaults (6/12 months) apply.
      minLeaseTerm: form.isSublease && form.leaseTerm ? Number(form.leaseTerm) : undefined,
      maxLeaseTerm: form.isSublease && form.leaseTerm ? Number(form.leaseTerm) : undefined,
      // Geocoding results — undefined when geocoding failed or was skipped;
      // apartments.create already accepts these as optional
      latitude: geocodedData?.latitude,
      longitude: geocodedData?.longitude,
      nearbyUniversities:
        geocodedData?.nearbyUniversities.length
          ? geocodedData.nearbyUniversities
          : undefined,
    });
  }

  function resetAll() {
    setStep("input");
    setForm(makeDefaultForm());
    setImages([]);
    setExtracted(null);
    setInputText("");
    setImageData(null);
    setImageName("");
    setSavedId(null);
    setIsPublished(false);
    setListingAnalysis(null);
    setListingAnalysisStatus("idle");
    setSubleaseAnalysis(null);
    setSubleaseAnalysisStatus("idle");
    setIsListingSuggestionsOpen(false);
    setIsSubleaseReviewOpen(false);
    hasTrackedSuggestionsShownRef.current = false;
    hasTrackedSubleaseReviewShownRef.current = false;
    usedTitleAssistRef.current = false;
    usedTagsAssistRef.current = false;
    usedJumpAssistRef.current = false;
    hasTrackedPublishAfterAiAssistRef.current = false;
    setGeocodeStatus("idle");
    setGeocodedData(null);
    setBatchResults([]);
    setBatchIndex(0);
    setBatchMode(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetGeocodeOnBack() {
    setStep("input");
    setGeocodeStatus("idle");
    setGeocodedData(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const rawListingSuggestedTitle = listingAnalysis?.result.extra?.suggestedTitle;
  const rawListingMissingFields = listingAnalysis?.result.extra?.missingFields;
  const rawListingSuggestedTags = listingAnalysis?.result.extra?.suggestedTags;
  const listingSuggestedTitle =
    typeof rawListingSuggestedTitle === "string" ? rawListingSuggestedTitle : "";
  const listingMissingFields = Array.isArray(rawListingMissingFields)
    ? rawListingMissingFields.map(String)
    : [];
  const listingSuggestedTags = Array.isArray(rawListingSuggestedTags)
    ? rawListingSuggestedTags.map(cleanReviewText).filter(Boolean)
    : [];
  const aiMissingFieldKeys = getMissingFieldKeys(listingMissingFields);
  const listingParseFailed = listingAnalysis?.result.extra?.parseFailed === true;
  const listingSummary = listingParseFailed
    ? ""
    : cleanReviewText(listingAnalysis?.result.summary);
  const listingStrengths = cleanReviewList(listingAnalysis?.result.strengths);
  const listingRisks = cleanReviewList(listingAnalysis?.result.risks);
  const listingRecommendations = cleanReviewList(listingAnalysis?.result.recommendations);
  const listingMissingFieldItems = listingMissingFields
    .map((field) => ({
      label: formatMissingField(field),
      fieldKey: getMissingFieldKey(field),
    }))
    .filter((item) => item.label.length > 0);
  const subleaseParseFailed = subleaseAnalysis?.result.extra?.parseFailed === true;
  const subleaseSummary = subleaseParseFailed
    ? ""
    : cleanReviewText(subleaseAnalysis?.result.summary);
  const subleaseStrengths = cleanReviewList(subleaseAnalysis?.result.strengths);
  const subleaseRisks = cleanReviewList(subleaseAnalysis?.result.risks);
  const subleaseRecommendations = cleanReviewList(subleaseAnalysis?.result.recommendations);
  const hasMeaningfulListingSuggestions = Boolean(
      listingSummary ||
      listingSuggestedTitle ||
      listingMissingFieldItems.length ||
      listingRisks.length ||
      listingStrengths.length ||
      listingSuggestedTags.length ||
      listingRecommendations.length ||
      listingParseFailed
  );
  const shouldShowSubleaseReview =
    !!extracted && hasSubleaseSignal(extracted) && subleaseAnalysisStatus !== "idle";
  const highlightedFieldClasses =
    "rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2";
  const highlightedToggleClasses =
    "flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2";

  useEffect(() => {
    if (step !== "review" || listingAnalysisStatus === "idle") return;
    if (hasTrackedSuggestionsShownRef.current) return;

    hasTrackedSuggestionsShownRef.current = true;
    trackEvent("import_listing_ai_suggestions_shown", {
      status: listingAnalysisStatus,
      isSublease: extracted ? hasSubleaseSignal(extracted) : false,
    });
  }, [step, listingAnalysisStatus, extracted]);

  useEffect(() => {
    if (step !== "review" || !shouldShowSubleaseReview) return;
    if (hasTrackedSubleaseReviewShownRef.current) return;

    hasTrackedSubleaseReviewShownRef.current = true;
    trackEvent("import_listing_ai_sublease_review_shown", {
      status: subleaseAnalysisStatus,
    });
  }, [step, shouldShowSubleaseReview, subleaseAnalysisStatus]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container max-w-2xl mx-auto px-4 py-12">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span>AI 房源导入</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-primary" />
            AI Listing Import
            <span className="text-lg font-normal text-muted-foreground">· AI 房源导入</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Paste listing text or upload a screenshot — Chinese or English, WeChat or any source.
            AI extracts the details for you to review and publish in seconds.
          </p>
        </div>

        <StepBar current={step} />

        {/* ── STEP 1: INPUT ───────────────────────────────────────────── */}
        {step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle>Add listing content · 添加房源内容</CardTitle>
              <CardDescription>
                Paste text, upload a screenshot, or both — AI handles Chinese and English
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text input — always visible, primary input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="listing-text" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    Paste listing text
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Batch Mode</span>
                    <Switch checked={batchMode} onCheckedChange={setBatchMode} />
                  </div>
                </div>
                <Textarea
                  id="listing-text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={batchMode
                    ? `Paste multiple listings separated by --- or numbered (1. 2. 3.)\n\nExample:\n1. 暑期转租 2B2B 近UCLA 月租$1800...\n---\n2. Studio 出租 Downtown LA $1200...`
                    : `Paste WeChat listing text here — Chinese or English\n\nExample:\n整洁2室1卫公寓出租\n位于洛杉矶Westwood区，近UCLA\n月租$1800，押金$1800，含水电\n宠物友好，含停车位，带家具\n可入住：2026年5月1日，合同至12月\n转租 / 微信：landlord_wx123`}
                  className="h-52 font-mono text-sm resize-none"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">
                  OR ALSO ATTACH A SCREENSHOT
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Image input — always visible, optional */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Attach a WeChat screenshot
                  <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    imageData
                      ? "border-green-500 bg-green-500/5"
                      : "border-border hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  {imageData ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-medium text-green-600 dark:text-green-400 truncate">
                          {imageName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click to replace
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <Upload className="w-6 h-6 shrink-0" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Drop screenshot or click to browse</p>
                        <p className="text-xs">PNG, JPG up to 10 MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleExtract}
                disabled={extractMutation.isPending || batchExtractMutation.isPending}
                className="w-full gap-2"
                size="lg"
              >
                {(extractMutation.isPending || batchExtractMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Extracting
                    with AI…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" /> {batchMode ? "Extract Batch with AI" : "Extract with AI"}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                AI 提取 · Powered by Gemini 2.5 Flash · Chinese &amp; English
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: REVIEW & EDIT ────────────────────────────────────── */}
        {step === "review" && extracted && (
          <div className="space-y-5">
            {/* Batch progress */}
            {batchResults.length > 1 && (
              <div className="flex items-center justify-between bg-primary/5 rounded-lg px-4 py-3">
                <span className="text-sm font-medium">
                  Listing {batchIndex + 1} of {batchResults.length}
                </span>
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground">
                    {batchResults.filter(r => r.success).length} extracted successfully
                  </span>
                </div>
              </div>
            )}

            {/* Confidence banner */}
            {(() => {
              const cfg = CONFIDENCE[extracted.confidence];
              const Icon = cfg.Icon;
              const reviewNotes = [
                extracted.multipleListingCandidatesDetected
                  ? extracted.extractedFromBestCandidateChunk
                    ? "检测到多条房源，已提取信息最完整的一条"
                    : "检测到多条房源，请仔细复核"
                  : null,
                extracted.conflictingAddressesDetected
                  ? "检测到地址冲突，请核对当前地址"
                  : null,
                extracted.duplicateContentRemoved
                  ? "已移除重复文本"
                  : null,
              ].filter(Boolean) as string[];
              return (
                <div className={`px-4 py-3 rounded-lg border ${cfg.classes}`}>
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{cfg.label}</span>
                    {extracted.extractionWarning && (
                      <span className="text-xs font-medium rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300">
                        {formatExtractionWarning(extracted.extractionWarning)}
                      </span>
                    )}
                    {extracted.wechatContact && (
                      <span className="ml-auto text-xs opacity-75 flex-shrink-0">
                        WeChat: {extracted.wechatContact}
                      </span>
                    )}
                  </div>
                  {reviewNotes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reviewNotes.map((note) => (
                        <span
                          key={note}
                          className="text-xs font-medium rounded-full border border-current/20 bg-background/50 px-2 py-1"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  )}
                  {extracted.extractedFromBestCandidateChunk && (
                    <p className="mt-2 text-xs opacity-75">
                      AI 已根据租金、地址和文本结构选择最完整的候选房源。
                    </p>
                  )}
                  {extracted.multipleListingCandidatesDetected &&
                    (extracted.truncatedPreviewOfOtherChunks?.length ?? 0) > 0 && (
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer font-medium opacity-90">
                          粘贴内容中还检测到其他房源
                          {typeof extracted.candidateChunkCount === "number"
                            ? `（${extracted.candidateChunkCount} 个候选）`
                            : ""}
                        </summary>
                        <div className="mt-2 space-y-2">
                          {extracted.truncatedPreviewOfOtherChunks!.map((preview, index) => (
                            <div
                              key={`${index}-${preview}`}
                              className="rounded-md border border-current/15 bg-background/40 px-3 py-2 leading-relaxed opacity-90"
                            >
                              <div>{preview}</div>
                              {extracted.otherCandidateChunks?.[index] && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 h-7 text-[11px]"
                                  onClick={() => reextractCandidate(extracted.otherCandidateChunks![index])}
                                  disabled={extractMutation.isPending}
                                >
                                  {extractMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      正在重新提取...
                                    </>
                                  ) : (
                                    "使用这条房源"
                                  )}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                </div>
              );
            })()}

            {/* ── AI Listing Suggestions ──────────────────────────────── */}
            {listingAnalysisStatus !== "idle" && (
              <Collapsible open={isListingSuggestionsOpen} onOpenChange={setIsListingSuggestionsOpen}>
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          AI 审核建议
                          {listingAnalysisStatus === "loading" && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          )}
                        </CardTitle>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform ${
                            isListingSuggestionsOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent asChild>
                    <CardContent className="space-y-4">
                      {listingAnalysisStatus === "loading" && (
                        <p className="text-sm text-muted-foreground">
                          正在生成中文审核建议...
                        </p>
                      )}

                      {listingAnalysisStatus === "error" && (
                        <div className="rounded-md border border-dashed border-blue-500/25 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                          未能完成 AI 审核。你仍然可以继续复核、编辑并保存房源。
                        </div>
                      )}

                      {listingAnalysisStatus === "done" && listingAnalysis && (
                        <>
                          {hasMeaningfulListingSuggestions ? (
                            <>
                              {listingSummary && (
                                <p className="text-sm text-muted-foreground">
                                  {listingSummary}
                                </p>
                              )}

                              {listingParseFailed && (
                                <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                  AI 返回了部分结果，详细建议可能不完整。
                                </div>
                              )}

                              <div className="space-y-2 rounded-md border border-blue-500/20 bg-background/80 px-3 py-3">
                                <div className="flex items-start gap-2">
                                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                                  <div className="min-w-0 text-sm">
                                    <p className="font-medium text-foreground">建议标题</p>
                                    {listingSuggestedTitle ? (
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className="text-muted-foreground">{listingSuggestedTitle}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={applySuggestedTitle}
                                        >
                                          应用
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-muted-foreground">
                                        暂无更好的标题建议。
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-md border border-green-500/20 bg-background/80 px-3 py-3">
                                <div className="flex items-start gap-2">
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                  <div className="text-sm">
                                    <p className="font-medium text-foreground">正面因素</p>
                                    {listingStrengths.length > 0 ? (
                                      <ul className="mt-1 ml-5 list-disc space-y-1 text-muted-foreground">
                                        {listingStrengths.map((strength) => (
                                          <li key={strength}>{strength}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="mt-1 text-muted-foreground">
                                        暂无明确的正面因素总结。
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-md border border-amber-500/20 bg-background/80 px-3 py-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                  <div className="text-sm">
                                    <p className="font-medium text-foreground">缺失信息</p>
                                    {listingMissingFieldItems.length > 0 ? (
                                      <ul className="mt-1 ml-5 list-disc space-y-1 text-muted-foreground">
                                        {listingMissingFieldItems.map(({ label, fieldKey }) => {
                                          return (
                                            <li key={label}>
                                              <span>{label}</span>
                                              {fieldKey && (
                                                <Button
                                                  type="button"
                                                  variant="link"
                                                  size="sm"
                                                  className="ml-2 h-auto px-0 text-xs"
                                                  onClick={() => jumpToField(fieldKey)}
                                                  title={`跳转到${FIELD_LABELS[fieldKey]}`}
                                                >
                                                  跳转到字段
                                                </Button>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    ) : (
                                      <p className="mt-1 text-muted-foreground">
                                        暂无明显缺失字段。
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-md border border-red-500/20 bg-background/80 px-3 py-3">
                                <div className="flex items-start gap-2">
                                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                                  <div className="text-sm">
                                    <p className="font-medium text-foreground">风险点</p>
                                    {listingRisks.length > 0 ? (
                                      <ul className="mt-1 ml-5 list-disc space-y-1 text-muted-foreground">
                                        {listingRisks.map((risk) => (
                                          <li key={risk}>{risk}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="mt-1 text-muted-foreground">
                                        暂未发现明确风险点。
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-md border border-violet-500/20 bg-background/80 px-3 py-3">
                                <div className="flex items-start gap-2">
                                  <Tag className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                                  <div className="text-sm">
                                    <p className="font-medium text-foreground">建议标签</p>
                                    {listingSuggestedTags.length > 0 ? (
                                      <div className="mt-2 space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                          {listingSuggestedTags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-xs">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={applySuggestedTags}
                                        >
                                          应用标签
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-muted-foreground">
                                        暂无标签建议。
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {listingRecommendations.length > 0 && (
                                <div className="space-y-2 rounded-md border border-blue-500/20 bg-background/80 px-3 py-3">
                                  <div className="flex items-start gap-2">
                                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                                    <div className="text-sm">
                                      <p className="font-medium text-foreground">建议下一步</p>
                                      <ul className="mt-1 ml-5 list-disc space-y-1 text-muted-foreground">
                                        {listingRecommendations.map((recommendation) => (
                                          <li key={recommendation}>{recommendation}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <p className="text-xs text-muted-foreground">
                                置信度：{formatConfidenceLabel(listingAnalysis.result.confidence)}
                              </p>
                            </>
                          ) : (
                            <div className="rounded-md border border-dashed border-blue-500/25 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                              AI 审核已完成，但没有返回明确的房源优化建议。
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* ── Sublease Risk Review ──────────────────────────────────── */}
            {shouldShowSubleaseReview && (
              <Collapsible open={isSubleaseReviewOpen} onOpenChange={setIsSubleaseReviewOpen}>
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                          转租风险审核
                          {subleaseAnalysisStatus === "loading" && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          )}
                        </CardTitle>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform ${
                            isSubleaseReviewOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent asChild>
                    <CardContent className="space-y-4">
                      {subleaseAnalysisStatus === "loading" && (
                        <p className="text-sm text-muted-foreground">
                          正在审核转租风险点...
                        </p>
                      )}

                      {subleaseAnalysisStatus === "error" && (
                        <div className="rounded-md border border-dashed border-amber-500/25 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                          未能完成转租风险审核。你仍然可以继续复核、编辑并保存房源。
                        </div>
                      )}

                      {subleaseAnalysisStatus === "done" && subleaseAnalysis && (
                        <>
                          {subleaseSummary ? (
                            <p className="text-sm text-muted-foreground">
                              {subleaseSummary}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              转租审核已完成。
                            </p>
                          )}

                          {subleaseParseFailed && (
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              AI 返回了部分结果，风险细节可能不完整。
                            </div>
                          )}

                          <div className="space-y-2 rounded-md border border-red-500/20 bg-background/80 px-3 py-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                              <div className="text-sm">
                                <p className="font-medium text-foreground">风险点</p>
                                {subleaseRisks.length > 0 ? (
                                  <ul className="mt-1 ml-5 list-disc space-y-1 text-muted-foreground">
                                    {subleaseRisks.map((risk) => (
                                      <li key={risk}>{risk}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-1 text-muted-foreground">
                                    暂未发现明确转租风险点。
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {subleaseStrengths.length > 0 && (
                            <div className="space-y-2 rounded-md border border-green-500/20 bg-background/80 px-3 py-3">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                                <div className="text-sm">
                                  <p className="font-medium text-foreground">正面因素</p>
                                  <ul className="mt-1 ml-5 list-disc space-y-1 text-muted-foreground">
                                    {subleaseStrengths.map((strength) => (
                                      <li key={strength}>{strength}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {subleaseRecommendations.length > 0 && (
                            <div className="space-y-2 rounded-md border border-amber-500/20 bg-background/80 px-3 py-3">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                <div className="text-sm">
                                  <p className="font-medium text-foreground">建议下一步</p>
                                  <ul className="mt-1 ml-5 list-disc space-y-1 text-muted-foreground">
                                    {subleaseRecommendations.map((recommendation) => (
                                      <li key={recommendation}>{recommendation}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            置信度：{formatConfidenceLabel(subleaseAnalysis.result.confidence)}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4" /> Basic Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    Listing Title{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Sunny 2BR apartment near UCLA"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Property Type{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.propertyType}
                    onValueChange={(v) =>
                      update("propertyType", v as PropertyType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          "apartment",
                          "studio",
                          "house",
                          "room",
                          "condo",
                          "townhouse",
                        ] as const
                      ).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    className="h-28 resize-none"
                    placeholder="Describe the apartment…"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4" /> Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {extracted.propertyName && (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-medium">Property name:</span> {extracted.propertyName}
                  </div>
                )}

                {extracted.locationSource === "place_lookup" && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                    Location came from a Google Places property lookup, not directly from the listing text. Please confirm the street address before saving.
                  </div>
                )}

                {extracted.locationSource === "unresolved" && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                    We found a property/building name but not a verified street address. Enter the full street address manually before saving.
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>
                    Street Address{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.state}
                      onChange={(e) =>
                        update("state", e.target.value.toUpperCase().slice(0, 2))
                      }
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Zip Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.zipCode}
                    onChange={(e) => update("zipCode", e.target.value)}
                    placeholder="90024"
                  />
                </div>

                {/* ── Geocoding status badge ───────────────────────────── */}
                {geocodeStatus !== "idle" && (
                  <div
                    className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-lg border ${
                      geocodeStatus === "loading"
                        ? "bg-muted/60 border-border text-muted-foreground"
                        : geocodeStatus === "found"
                        ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {geocodeStatus === "loading" && (
                      <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin flex-shrink-0" />
                    )}
                    {geocodeStatus === "found" && (
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    )}
                    {geocodeStatus === "not_found" && (
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="space-y-0.5 min-w-0">
                      {geocodeStatus === "loading" && (
                        <span>Finding location on map…</span>
                      )}
                      {geocodeStatus === "found" && (
                        <>
                          <p className="font-medium truncate">
                            {geocodedData?.displayName}
                          </p>
                          {geocodedData?.nearbyUniversities.length ? (
                            <p className="text-xs opacity-75">
                              Near:{" "}
                              {geocodedData.nearbyUniversities
                                .slice(0, 3)
                                .join(", ")}
                              {geocodedData.nearbyUniversities.length > 3 &&
                                ` +${geocodedData.nearbyUniversities.length - 3} more`}
                            </p>
                          ) : null}
                        </>
                      )}
                      {geocodeStatus === "not_found" && (
                        <span>
                          Location not verified — listing will save without a
                          map pin. You can still publish it.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-4 h-4" /> Pricing & Lease
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    ref={(node) => {
                      fieldRefs.current.monthlyRent = node;
                    }}
                    className={
                      aiMissingFieldKeys.has("monthlyRent")
                        ? highlightedFieldClasses
                        : "space-y-1.5"
                    }
                  >
                    <Label>
                      Monthly Rent (USD){" "}
                      <span className="text-destructive">*</span>
                      {aiMissingFieldKeys.has("monthlyRent") && (
                        <span className="ml-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          AI 建议
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      value={form.monthlyRent}
                      onChange={(e) => update("monthlyRent", e.target.value)}
                      placeholder="1800"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Security Deposit (USD)</Label>
                    <Input
                      type="number"
                      value={form.securityDeposit}
                      onChange={(e) =>
                        update("securityDeposit", e.target.value)
                      }
                      placeholder="1800"
                      min={0}
                    />
                  </div>
                </div>

                <div
                  ref={(node) => {
                    fieldRefs.current.availableFrom = node;
                  }}
                  className={
                    aiMissingFieldKeys.has("availableFrom")
                      ? highlightedFieldClasses
                      : "space-y-1.5"
                  }
                >
                  <Label>
                    Available From <span className="text-destructive">*</span>
                    {aiMissingFieldKeys.has("availableFrom") && (
                      <span className="ml-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        AI 建议
                      </span>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={form.availableFrom}
                    onChange={(e) => update("availableFrom", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Unit details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BedDouble className="w-4 h-4" /> Unit Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>
                      Bedrooms <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) =>
                        update("bedrooms", Number(e.target.value))
                      }
                      min={0}
                      max={20}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Bathrooms <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) =>
                        update("bathrooms", Number(e.target.value))
                      }
                      min={0}
                      max={20}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sq Ft</Label>
                    <Input
                      type="number"
                      value={form.squareFeet}
                      onChange={(e) => update("squareFeet", e.target.value)}
                      placeholder="Optional"
                      min={0}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <Label className="cursor-pointer">Pets Allowed</Label>
                  <Switch
                    checked={form.petsAllowed}
                    onCheckedChange={(v) => update("petsAllowed", v)}
                  />
                </div>

                <Separator />

                <div
                  ref={(node) => {
                    fieldRefs.current.parkingIncluded = node;
                  }}
                  className={
                    aiMissingFieldKeys.has("parkingIncluded")
                      ? highlightedToggleClasses
                      : "flex items-center justify-between py-1"
                  }
                >
                  <Label className="cursor-pointer">
                    Parking Included
                    {aiMissingFieldKeys.has("parkingIncluded") && (
                      <span className="ml-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        AI 建议
                      </span>
                    )}
                  </Label>
                  <Switch
                    checked={form.parkingIncluded}
                    onCheckedChange={(v) => update("parkingIncluded", v)}
                  />
                </div>

                <div
                  ref={(node) => {
                    fieldRefs.current.furnished = node;
                  }}
                  className={
                    aiMissingFieldKeys.has("furnished")
                      ? highlightedFieldClasses
                      : "space-y-1.5"
                  }
                >
                  <Label>
                    Amenities{" "}
                    <span className="text-muted-foreground text-xs">
                      (comma-separated)
                    </span>
                    {aiMissingFieldKeys.has("furnished") && (
                      <span className="ml-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        AI 建议
                      </span>
                    )}
                  </Label>
                  <Input
                    value={form.amenitiesText}
                    onChange={(e) => update("amenitiesText", e.target.value)}
                    placeholder="In-unit Laundry, Gym, Pool, Dishwasher…"
                  />
                  {aiMissingFieldKeys.has("furnished") && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      如果该房源带家具，请在这里补充“Furnished”。
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Utilities Included{" "}
                    <span className="text-muted-foreground text-xs">
                      (comma-separated)
                    </span>
                  </Label>
                  <Input
                    value={form.utilitiesText}
                    onChange={(e) => update("utilitiesText", e.target.value)}
                    placeholder="Water, Electric, Gas, Internet, Trash…"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sublease & Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="w-4 h-4" /> Sublease & Contact
                </CardTitle>
                <CardDescription>
                  Common for WeChat listings — fill in as many as apply
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <Label className="cursor-pointer">This is a sublease (转租)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The current tenant is subletting the unit
                    </p>
                  </div>
                  <Switch
                    checked={form.isSublease}
                    onCheckedChange={(v) => update("isSublease", v)}
                  />
                </div>

                {form.isSublease && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        ref={(node) => {
                          fieldRefs.current.subleaseEndDate = node;
                        }}
                        className={
                          aiMissingFieldKeys.has("subleaseEndDate")
                            ? highlightedFieldClasses
                            : "space-y-1.5"
                        }
                      >
                        <Label>
                          Sublease Ends On
                          {aiMissingFieldKeys.has("subleaseEndDate") && (
                            <span className="ml-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                              AI 建议
                            </span>
                          )}
                        </Label>
                        <Input
                          type="date"
                          value={form.subleaseEndDate}
                          onChange={(e) => update("subleaseEndDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>
                          Lease Term{" "}
                          <span className="text-muted-foreground text-xs">(months)</span>
                        </Label>
                        <Input
                          type="number"
                          value={form.leaseTerm}
                          onChange={(e) => update("leaseTerm", e.target.value)}
                          placeholder="e.g. 6"
                          min={1}
                          max={24}
                        />
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-1.5">
                  <Label>WeChat Contact ID</Label>
                  <Input
                    value={form.wechatContact}
                    onChange={(e) => update("wechatContact", e.target.value)}
                    placeholder="e.g. landlord_wx123"
                  />
                  <p className="text-xs text-muted-foreground">
                    The WeChat ID students can use to contact you
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="w-4 h-4" /> Photos
                </CardTitle>
                <CardDescription>
                  Optional but strongly recommended — listings with photos get
                  far more views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultiImageUpload
                  images={images}
                  onChange={setImages}
                  maxImages={10}
                  language="en"
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pb-8">
              <Button
                variant="outline"
                onClick={resetGeocodeOnBack}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="flex-1 gap-2"
                size="lg"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                  ) : (
                    <>
                    {batchResults.length > 1 && batchIndex < batchResults.length - 1 ? "Save & Next" : "Save Listing"} <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SUCCESS ──────────────────────────────────────────── */}
        {step === "success" && typeof savedId === "number" && savedId > 0 && (
          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  {isPublished ? "You're Live! 🎉" : "Listing Saved"}
                </h2>
                {isPublished ? (
                  <p className="text-muted-foreground mt-2">
                    Your listing is now <span className="text-green-600 font-semibold">live</span> and visible to students on BridgeStay.
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-2">
                    Your listing was saved but is not live yet. Publish it from your dashboard when you're ready.
                  </p>
                )}
              </div>

              {!isPublished && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  onClick={() => publishMutation.mutate({ id: savedId })}
                  disabled={publishMutation.isPending}
                >
                  {publishMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</>
                  ) : (
                    "Publish Now"
                  )}
                </Button>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant={isPublished ? "default" : "outline"}>
                  <Link href={`/apartments/${savedId}`}>{isPublished ? "View Listing" : "Preview Listing"}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">My Dashboard</Link>
                </Button>
                <Button variant="ghost" onClick={resetAll}>
                  Import Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
