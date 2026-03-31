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
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ExtractedListing = {
  title: string;
  description?: string;
  propertyType?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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

function defaultAvailableFrom() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

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
    availableFrom: defaultAvailableFrom(),
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
    label: "High confidence — most fields extracted successfully",
    classes: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    Icon: CheckCircle2,
  },
  medium: {
    label: "Medium confidence — please review and fill missing fields",
    classes: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    Icon: AlertCircle,
  },
  low: {
    label: "Low confidence — the AI could not find much structure; fill manually",
    classes: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    Icon: AlertCircle,
  },
} as const;

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS = ["Paste / Upload", "Review & Edit", "Done"] as const;
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

// ── Main component ─────────────────────────────────────────────────────────

export default function ImportListing() {
  const [, navigate] = useLocation();

  // Step
  const [step, setStep] = useState<Step>("input");

  // Step 1 state
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
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

  // ── Mutations ────────────────────────────────────────────────────────────

  const extractMutation = trpc.listings.extractFromWeChat.useMutation({
    onSuccess(data) {
      setExtracted(data);
      setForm((prev) => applyExtracted(prev, data));
      setStep("review");
    },
    onError(err) {
      toast.error("Extraction failed: " + err.message);
    },
  });

  const createMutation = trpc.apartments.create.useMutation({
    onSuccess(data) {
      setSavedId(data.id);
      setStep("success");
    },
    onError(err) {
      toast.error("Failed to save listing: " + err.message);
    },
  });

  const publishMutation = trpc.apartments.publish.useMutation({
    onSuccess() {
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
    if (inputMode === "text" && !inputText.trim()) {
      toast.error("Please paste some WeChat text first");
      return;
    }
    if (inputMode === "image" && !imageData) {
      toast.error("Please upload a screenshot first");
      return;
    }
    extractMutation.mutate({
      text: inputMode === "text" ? inputText : undefined,
      imageBase64: inputMode === "image" ? imageData?.base64 : undefined,
      mimeType: inputMode === "image" ? imageData?.mimeType : undefined,
    });
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function handleSave() {
    // Client-side validation matching server schema requirements
    if (form.title.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (form.address.length < 5) {
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
    setGeocodeStatus("idle");
    setGeocodedData(null);
  }

  function resetGeocodeOnBack() {
    setStep("input");
    setGeocodeStatus("idle");
    setGeocodedData(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
            <span>Import from WeChat</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-green-500" />
            Import from WeChat
          </h1>
          <p className="text-muted-foreground mt-2">
            Paste a WeChat listing message or upload a screenshot — AI extracts
            the details so you can review and publish in seconds.
          </p>
        </div>

        <StepBar current={step} />

        {/* ── STEP 1: INPUT ───────────────────────────────────────────── */}
        {step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle>WeChat listing input</CardTitle>
              <CardDescription>
                Choose how to provide the listing content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setInputMode("text")}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    inputMode === "text"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Paste Text
                </button>
                <button
                  onClick={() => setInputMode("image")}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    inputMode === "image"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload Screenshot
                </button>
              </div>

              {/* Text input */}
              {inputMode === "text" && (
                <div className="space-y-2">
                  <Label>WeChat message text</Label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Paste your WeChat listing message here…\n\nExample:\n整洁2室1卫公寓出租\n位于洛杉矶Westwood区\n月租$1800，押金$1800\n宠物友好，含停车位\n可入住日期：2026年4月1日\n微信：landlord123`}
                    className="h-52 font-mono text-sm resize-none"
                  />
                </div>
              )}

              {/* Image input */}
              {inputMode === "image" && (
                <div className="space-y-3">
                  <Label>WeChat screenshot</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                      imageData
                        ? "border-green-500 bg-green-500/5"
                        : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {imageData ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {imageName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="font-medium">
                          Drop screenshot here or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG up to 10 MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleExtract}
                disabled={extractMutation.isPending}
                className="w-full gap-2"
                size="lg"
              >
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Extracting
                    with AI…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" /> Extract with AI
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Powered by Gemini 2.5 Flash · Works in Chinese and English
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: REVIEW & EDIT ────────────────────────────────────── */}
        {step === "review" && extracted && (
          <div className="space-y-5">
            {/* Confidence banner */}
            {(() => {
              const cfg = CONFIDENCE[extracted.confidence];
              const Icon = cfg.Icon;
              return (
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${cfg.classes}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{cfg.label}</span>
                  {extracted.wechatContact && (
                    <span className="ml-auto text-xs opacity-75 flex-shrink-0">
                      WeChat: {extracted.wechatContact}
                    </span>
                  )}
                </div>
              );
            })()}

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
                  <div className="space-y-1.5">
                    <Label>
                      Monthly Rent (USD){" "}
                      <span className="text-destructive">*</span>
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

                <div className="space-y-1.5">
                  <Label>
                    Available From <span className="text-destructive">*</span>
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

                <div className="flex items-center justify-between py-1">
                  <Label className="cursor-pointer">Parking Included</Label>
                  <Switch
                    checked={form.parkingIncluded}
                    onCheckedChange={(v) => update("parkingIncluded", v)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Amenities{" "}
                    <span className="text-muted-foreground text-xs">
                      (comma-separated)
                    </span>
                  </Label>
                  <Input
                    value={form.amenitiesText}
                    onChange={(e) => update("amenitiesText", e.target.value)}
                    placeholder="In-unit Laundry, Gym, Pool, Dishwasher…"
                  />
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
                      <div className="space-y-1.5">
                        <Label>Sublease Ends On</Label>
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
                    Save Listing <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: SUCCESS ──────────────────────────────────────────── */}
        {step === "success" && savedId !== null && (
          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>

              <div>
                <h2 className="text-2xl font-bold">Listing Saved!</h2>
                {isPublished ? (
                  <p className="text-muted-foreground mt-2">
                    Your listing is now <span className="text-green-600 font-semibold">live</span> and visible to students.
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-2">
                    Your listing has been created as a draft. Publish it now
                    to make it visible to students, or do it later from your dashboard.
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
                  <Link href={`/apartments/${savedId}`}>View Listing</Link>
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
