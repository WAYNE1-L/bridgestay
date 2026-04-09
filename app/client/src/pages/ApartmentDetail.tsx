import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { computeSignals } from "@/lib/signals";
import { safeJsonArray } from "@/lib/safeJsonArray";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useListings } from "@/contexts/ListingsContext";
import { motion } from "framer-motion";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Heart,
  Share2,
  Calendar,
  DollarSign,
  Shield,
  CheckCircle2,
  PawPrint,
  Car,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  GraduationCap,
  Globe,
  FileText,
  ArrowLeft,
  Copy,
  Check,
  MessageCircle,
  Flag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useCallback, useRef, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const REPORT_REASONS = [
  { value: "unavailable" as const, labelKey: "detail.report.reason.unavailable" },
  { value: "wrong_details" as const, labelKey: "detail.report.reason.wrongDetails" },
  { value: "suspicious" as const, labelKey: "detail.report.reason.suspicious" },
  { value: "other" as const, labelKey: "detail.report.reason.other" },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

type LanguageCode = "cn" | "en";
type Translate = (key: string) => string;

function formatDateLabel(value: unknown, language: LanguageCode, fallback: string) {
  if (!value) return fallback;
  const locale = language === "cn" ? "zh-CN" : "en-US";
  if (value instanceof Date) return value.toLocaleDateString(locale);

  const date = new Date(String(value));
  if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(locale);

  return String(value);
}

function parseDateValue(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFreshnessInfo(updatedAt: unknown, createdAt: unknown, language: LanguageCode, t: Translate) {
  const date = parseDateValue(updatedAt) ?? parseDateValue(createdAt);
  if (!date) return null;

  const ageDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  return {
    label:
      ageDays === 0
        ? t("detail.lastUpdatedToday")
        : `${t("detail.lastUpdated")} ${formatDateLabel(date, language, t("detail.notSpecified"))}`,
    isStale: ageDays >= 30,
  };
}

function getStatusLabel(status: unknown, isSublease: boolean, t: Translate) {
  if (isSublease) return t("detail.status.sublease");

  switch (status) {
    case "published":
    case "available":
      return t("detail.status.available");
    case "archived":
      return t("detail.status.unavailable");
    case "pending_review":
      return t("detail.status.pending");
    case "rejected":
      return t("detail.status.rejected");
    case "draft":
      return t("detail.status.draft");
    default:
      return t("detail.status.available");
  }
}

function formatAmenityLabel(value: string, t: Translate) {
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    furnished: t("listings.furnished"),
    "fully furnished": t("listings.furnished"),
    unfurnished: t("listings.unfurnished"),
    parking: t("listings.parking"),
    "parking included": t("listings.parkingIncluded"),
    "pets allowed": t("listings.petsAllowed"),
    "pet friendly": t("listings.petsOk"),
    "utilities included": t("detail.utilitiesIncluded"),
    utilities: t("detail.utilitiesIncluded"),
    dishwasher: t("amenity.dishwasher"),
    laundry: t("amenity.laundry"),
    "in-unit laundry": t("amenity.inUnitLaundry"),
    gym: t("amenity.gym"),
    pool: t("amenity.pool"),
    wifi: t("amenity.wifi"),
    internet: t("amenity.internet"),
    "air conditioning": t("amenity.airConditioning"),
    "washer/dryer": t("amenity.washerDryer"),
  };

  return labels[normalized] ?? value;
}

function getStatusBadgeClass(status: unknown, isSublease: boolean) {
  if (isSublease) return "bg-orange-500/20 text-orange-500 border-0";

  switch (status) {
    case "published":
    case "available":
      return "bg-green-500/20 text-green-500 border-0";
    case "archived":
      return "bg-red-500/20 text-red-500 border-0";
    case "pending_review":
    case "draft":
      return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0";
    case "rejected":
      return "bg-red-500/20 text-red-500 border-0";
    default:
      return "bg-green-500/20 text-green-500 border-0";
  }
}

export default function ApartmentDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { language, t } = useLanguage();
  const cn = language === "cn";
  const mapRef = useRef<google.maps.Map | null>(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopyWeChat = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t("detail.toast.wechatCopied"));
  }, [t]);

  // Detect Supabase/context listings (IDs prefixed with "ctx_" come from ListingsContext,
  // not the tRPC DB. These must be resolved locally, not via tRPC.)
  const isContextId = !!params.id?.startsWith("ctx_");
  const rawContextId = isContextId ? params.id!.replace(/^ctx_/, "") : null;

  // Always call useListings (hooks must be called unconditionally)
  const { allListings } = useListings();

  // Look up the context listing and map it to the DB apartment shape so the
  // rest of the template can render it without any further changes.
  const contextListing = rawContextId
    ? allListings.find((l) => l.id === rawContextId)
    : null;

  const mappedContextApartment = contextListing
    ? {
        id: contextListing.id,
        title: cn ? contextListing.title.cn : contextListing.title.en,
        address: cn ? contextListing.location.address.cn : contextListing.location.address.en,
        city: cn ? contextListing.location.area.cn : contextListing.location.area.en,
        state: "UT",
        zipCode: "",
        monthlyRent: contextListing.price.amount,
        securityDeposit: 0,
        bedrooms: contextListing.bedrooms ?? null,
        bathrooms: contextListing.bathrooms ?? null,
        squareFeet: contextListing.squareFeet ?? null,
        description: cn ? contextListing.description.cn : contextListing.description.en,
        // Prefer images[] array; fall back to legacy imageUrl (Supabase listings)
        images: JSON.stringify(
          contextListing.images?.length
            ? contextListing.images
            : contextListing.imageUrl
            ? [contextListing.imageUrl]
            : []
        ),
        amenities: JSON.stringify(
          contextListing.tags?.map((tag) => (cn ? tag.cn : tag.en)) ?? []
        ),
        utilitiesIncluded: JSON.stringify([]),
        petsAllowed: contextListing.petsAllowed ?? null,
        petDeposit: null,
        petRent: null,
        parkingIncluded: contextListing.parkingIncluded ?? null,
        parkingType: null,
        parkingFee: null,
        latitude: null,
        longitude: null,
        noSsnRequired: contextListing.noSsnRequired ?? true,
        noCreditCheckRequired: true,
        acceptsInternationalStudents: true,
        minLeaseTerm: null,
        maxLeaseTerm: null,
        availableFrom: contextListing.availability.start,
        status: contextListing.status ?? "published",
        viewCount: 0,
        nearbyUniversities: contextListing.nearbyUniversities ?? [],
        // Phase 3 sublease fields — context listings are never subleases
        isSublease: false,
        subleaseEndDate: null,
        wechatContact: contextListing.contact?.wechat ?? null,
        emailContact: contextListing.contact?.email ?? null,
      }
    : null;

  // tRPC DB query — guard against NaN/0/negative IDs (e.g. "undefined", missing param)
  const numericId = params.id ? parseInt(params.id, 10) : 0;
  const validNumericId = !isNaN(numericId) && numericId > 0;
  const { data: dbApartment, isLoading: dbLoading } = trpc.apartments.getById.useQuery(
    { id: isContextId ? 0 : numericId },
    { enabled: !isContextId && validNumericId }
  );

  const apartment = isContextId ? mappedContextApartment : dbApartment;
  const isLoading = isContextId ? false : dbLoading;

  const { data: isSaved } = trpc.apartments.isSaved.useQuery(
    { apartmentId: isContextId ? 0 : numericId },
    { enabled: !isContextId && validNumericId && isAuthenticated }
  );

  const saveMutation = trpc.apartments.save.useMutation({
    onSuccess: () =>
      toast.success(t("detail.toast.saved"), {
        description: t("detail.toast.savedDesc"),
        action: { label: t("detail.toast.viewSaved"), onClick: () => navigate("/dashboard") },
      }),
  });

  const unsaveMutation = trpc.apartments.unsave.useMutation({
    onSuccess: () => toast.success(t("detail.toast.unsaved")),
  });

  const handleSave = useCallback(() => {
    if (isContextId) {
      toast.info(t("detail.toast.saveDbOnly"));
      return;
    }
    if (!isAuthenticated) {
      toast.error(t("detail.toast.signInToSave"));
      return;
    }

    const apartmentId = parseInt(params.id || "0");
    if (isSaved) {
      unsaveMutation.mutate({ apartmentId });
    } else {
      saveMutation.mutate({ apartmentId });
    }
  }, [isContextId, isAuthenticated, isSaved, params.id, saveMutation, t, unsaveMutation]);
  
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("detail.toast.linkCopied"));
  }, [t]);
  
  const handleApply = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    navigate(`/apply/${params.id}`);
  }, [isAuthenticated, navigate, params.id]);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<typeof REPORT_REASONS[number]["value"] | "">("");
  const [reportNotes, setReportNotes] = useState("");

  const reportMutation = trpc.apartments.report.useMutation({
    onSuccess: () => {
      toast.success(t("detail.toast.reportSubmitted"));
      setReportOpen(false);
      setReportReason("");
      setReportNotes("");
    },
    onError: (error) => {
      toast.error(error.message || t("detail.toast.reportFailed"));
    },
  });

  const handleReportSubmit = useCallback(() => {
    if (!reportReason || !apartment) return;
    reportMutation.mutate({
      apartmentId: Number(apartment.id),
      reason: reportReason,
      notes: reportNotes.trim() || undefined,
    });
  }, [reportReason, reportNotes, apartment, reportMutation]);

  // Parse lat/lng from DB strings — null when missing or unparseable.
  const coords = useMemo(() => {
    if (!apartment?.latitude || !apartment?.longitude) return null;
    const lat = parseFloat(apartment.latitude as string);
    const lng = parseFloat(apartment.longitude as string);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  }, [apartment?.latitude, apartment?.longitude]);

  // Full address string for Priority C fallback.
  const addressString = useMemo(() => {
    if (!apartment) return undefined;
    return [apartment.address, apartment.city, apartment.state, apartment.zipCode]
      .filter(Boolean)
      .join(", ") || undefined;
  }, [apartment?.address, apartment?.city, apartment?.state, apartment?.zipCode]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    if (coords) {
      new google.maps.marker.AdvancedMarkerElement({
        map,
        position: coords,
        title: apartment?.title ?? undefined,
      });
    }
  }, [coords, apartment?.title]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (!apartment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-6 py-20 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t("detail.notFound.title")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("detail.notFound.desc")}
          </p>
          <Link href="/apartments">
            <Button>{t("detail.notFound.cta")}</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const images = safeJsonArray(apartment.images);
  const amenities = safeJsonArray(apartment.amenities);
  const utilities = safeJsonArray(apartment.utilitiesIncluded);
  const statusLabel = getStatusLabel(apartment.status, Boolean(apartment.isSublease), t);
  const freshnessInfo = getFreshnessInfo(
    (apartment as any).updatedAt,
    (apartment as any).createdAt,
    language,
    t
  );
  const availabilityLabel = formatDateLabel(apartment.availableFrom, language, t("detail.notSpecified"));
  const leaseLabel = apartment.subleaseEndDate
    ? `${t("detail.ends")} ${formatDateLabel(apartment.subleaseEndDate, language, t("detail.notSpecified"))}`
    : apartment.minLeaseTerm || apartment.maxLeaseTerm
      ? `${apartment.minLeaseTerm ?? "?"}-${apartment.maxLeaseTerm ?? "?"} ${t("detail.monthLease")}`
      : t("detail.leaseTermNotSpecified");
  const furnishedAmenity = amenities.find((amenity: string) =>
    /unfurnished|furnished/i.test(amenity)
  );
  const furnishedLabel = furnishedAmenity
    ? /unfurnished/i.test(furnishedAmenity)
      ? t("listings.unfurnished")
      : t("listings.furnished")
    : null;
  const emailContact =
    typeof (apartment as any).emailContact === "string"
      ? (apartment as any).emailContact.trim()
      : "";
  const emailSubject = encodeURIComponent(`${t("detail.emailSubject")} ${apartment.title}`);
  const emailBody = encodeURIComponent(
    `${t("detail.emailBodyPrefix")} ${apartment.title}. ${t("detail.emailBodySuffix")}`
  );
  const nearbyUniversities: string[] = Array.isArray(apartment.nearbyUniversities)
    ? apartment.nearbyUniversities.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
    : safeJsonArray(apartment.nearbyUniversities);
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Back Button */}
        <div className="container px-6 py-4">
          <Link href="/apartments">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t("detail.backToListings")}
            </Button>
          </Link>
        </div>

        {/* Draft preview banner — only visible before publishing */}
        {(apartment as any).status === "draft" && (
          <div className="container px-6 mb-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
              <span className="text-base" aria-hidden="true">👁</span>
              <div className="text-sm">
                <span className="font-semibold">{t("detail.draftPreview")}</span>
                {" — "}{t("detail.draftPreview.desc")}
              </div>
            </div>
          </div>
        )}
        
        {/* Image Gallery */}
        <div className="container px-6 mb-8">
          <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
            {images.length > 0 ? (
              <>
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt={apartment.title}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i + 1) % images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i === currentImageIndex ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        
        <div className="container px-6 pb-20">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <motion.div {...fadeInUp}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge
                    variant="secondary"
                    className={getStatusBadgeClass(apartment.status, Boolean(apartment.isSublease))}
                  >
                    {statusLabel}
                  </Badge>
                  {apartment.noSsnRequired && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      {t("listings.noSsnRequired")}
                    </Badge>
                  )}
                  {apartment.noCreditCheckRequired && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t("listings.noCreditCheck")}
                    </Badge>
                  )}
                  {apartment.acceptsInternationalStudents && (
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-0">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {t("listings.internationalStudentsWelcome")}
                    </Badge>
                  )}
                </div>
                
                {/* Fit-for-you signals panel */}
                {(() => {
                  const signals = computeSignals(apartment as Record<string, unknown>);
                  if (signals.length === 0) return null;
                  return (
                    <div className="mb-5 p-4 rounded-xl border border-border bg-card">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        {t("detail.signals.title")}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {signals.map((s) => (
                          <div
                            key={s.id}
                            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg ${s.colorClasses}`}
                          >
                            <span className="text-base leading-none mt-0.5" aria-hidden="true">
                              {s.emoji}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-tight">{t(`signals.${s.id}.label`)}</p>
                              <p className="text-xs opacity-80 mt-0.5 leading-snug">{t(`signals.${s.id}.description`)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <h1 className="text-3xl md:text-4xl font-bold mb-2">{apartment.title}</h1>
                
                <p className="text-lg text-muted-foreground flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5" />
                  {apartment.address}, {apartment.city}, {apartment.state} {apartment.zipCode}
                </p>
                
                <div className="flex flex-wrap items-center gap-6 text-lg">
                  <span className="flex items-center gap-2">
                    <Bed className="w-5 h-5 text-muted-foreground" />
                    {apartment.bedrooms} {Number(apartment.bedrooms) === 1 ? t("listings.bedroom") : t("listings.bedrooms")}
                  </span>
                  <span className="flex items-center gap-2">
                    <Bath className="w-5 h-5 text-muted-foreground" />
                    {apartment.bathrooms} {Number(apartment.bathrooms) === 1 ? t("listings.bathroom") : t("listings.bathrooms")}
                  </span>
                  {apartment.squareFeet && (
                    <span className="flex items-center gap-2">
                      <Square className="w-5 h-5 text-muted-foreground" />
                      {apartment.squareFeet} {t("listings.sqft")}
                    </span>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-card border border-border">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      {t("detail.moveIn")}
                    </p>
                    <p className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {availabilityLabel}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-card border border-border">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      {t("detail.stayLength")}
                    </p>
                    <p className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {leaseLabel}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-card border border-border">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      {t("detail.parkingPets")}
                    </p>
                    <p className="font-semibold flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary" />
                      {apartment.parkingIncluded ? t("listings.parking") : t("listings.noParking")}
                      {" · "}
                      {apartment.petsAllowed ? t("listings.petsOk") : t("listings.noPets")}
                    </p>
                  </div>
                  {(furnishedLabel || utilities.length > 0) && (
                    <div className="p-3 rounded-xl bg-card border border-border">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        {t("detail.livingSetup")}
                      </p>
                      <p className="font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        {[furnishedLabel, utilities.length > 0 ? `${utilities.length} ${t("listings.utilities")}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
              
              <Separator />
              
              {/* Description */}
              {apartment.description && (
                <motion.div {...fadeInUp}>
                  <h2 className="text-xl font-semibold mb-4">{t("detail.about")}</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">{apartment.description}</p>
                </motion.div>
              )}
              
              {/* Amenities */}
              {amenities.length > 0 && (
                <motion.div {...fadeInUp}>
                  <h2 className="text-xl font-semibold mb-4">{t("detail.amenities")}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>{formatAmenityLabel(amenity, t)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {/* Utilities */}
              {utilities.length > 0 && (
                <motion.div {...fadeInUp}>
                  <h2 className="text-xl font-semibold mb-4">{t("detail.utilitiesIncluded")}</h2>
                  <div className="flex flex-wrap gap-2">
                    {utilities.map((utility: string) => (
                      <Badge key={utility} variant="outline" className="bg-transparent">
                        {formatAmenityLabel(utility, t)}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {/* Pet & Parking */}
              <motion.div {...fadeInUp} className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <PawPrint className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{t("detail.petPolicy")}</h3>
                  </div>
                  {apartment.petsAllowed ? (
                    <div className="text-muted-foreground">
                      <p className="text-green-400 font-medium mb-1">{t("listings.petsAllowed")}</p>
                      {apartment.petDeposit && <p>{t("detail.petDeposit")}: ${Number(apartment.petDeposit).toLocaleString()}</p>}
                      {apartment.petRent && <p>{t("detail.petRent")}: ${Number(apartment.petRent).toLocaleString()}{t("detail.perMonth")}</p>}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t("listings.noPetsAllowed")}</p>
                  )}
                </div>
                
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <Car className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{t("listings.parking")}</h3>
                  </div>
                  {apartment.parkingIncluded ? (
                    <div className="text-muted-foreground">
                      <p className="text-green-400 font-medium mb-1">{t("listings.parkingIncluded")}</p>
                      {apartment.parkingType && <p>{t("detail.parkingType")}: {formatAmenityLabel(String(apartment.parkingType), t)}</p>}
                      {apartment.parkingFee && Number(apartment.parkingFee) > 0 && (
                        <p>{t("detail.additionalFee")}: ${Number(apartment.parkingFee).toLocaleString()}{t("detail.perMonth")}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t("listings.noParkingIncluded")}</p>
                  )}
                </div>
              </motion.div>
              
              {/* Map */}
              <motion.div {...fadeInUp}>
                <h2 className="text-xl font-semibold mb-4">{t("detail.location")}</h2>
                <div className="rounded-xl overflow-hidden border border-border">
                  <MapView
                    coords={coords}
                    address={addressString}
                    initialZoom={15}
                    onMapReady={handleMapReady}
                  />
                </div>
                {nearbyUniversities.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <GraduationCap className="w-4 h-4" />
                      {t("detail.nearby")}:
                    </span>
                    {nearbyUniversities.map((uni) => (
                      <Badge key={uni} variant="secondary" className="text-xs">
                        {uni}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                {...fadeInUp}
                className="sticky top-24 p-6 rounded-2xl bg-card border border-border"
              >
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">${Number(apartment.monthlyRent).toLocaleString()}</span>
                    <span className="text-muted-foreground">{t("detail.perMonth")}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${Number(apartment.securityDeposit).toLocaleString()} {t("listings.deposit")}
                    </span>
                  </div>
                  {freshnessInfo && (
                    <div
                      className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                        freshnessInfo.isStale
                          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <p className="font-medium">{freshnessInfo.label}</p>
                      {freshnessInfo.isStale && (
                        <p className="mt-1">
                          {t("detail.staleWarning")}
                        </p>
                      )}
                      {freshnessInfo.isStale && (
                        <button
                          type="button"
                          onClick={() => { setReportReason("unavailable"); setReportOpen(true); }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:opacity-80"
                        >
                          <Flag className="w-3 h-3" />
                          {t("detail.reportUnavailable")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* ── Contact Landlord (primary student CTA) ─────────────── */}
                {apartment.wechatContact ? (
                  <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <h3 className="font-semibold mb-1 flex items-center gap-2 text-green-700 dark:text-green-400">
                      <span aria-hidden="true">💬</span>
                      {t("detail.contactWechat.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t("detail.contactWechat.desc")}
                    </p>
                    <p className="text-sm font-mono bg-background px-3 py-2 rounded-lg select-all border border-border mb-3">
                      {apartment.wechatContact}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleCopyWeChat(apartment.wechatContact!)}
                      >
                        {copied
                          ? <><Check className="w-3.5 h-3.5" />{t("detail.contactWechat.copied")}</>
                          : <><Copy className="w-3.5 h-3.5" />{t("detail.contactWechat.copy")}</>}
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent" asChild>
                        <a
                          href={`weixin://dl/chat?${apartment.wechatContact}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("detail.contactWechat.open")}
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("detail.contactWechat.helper")}
                    </p>
                  </div>
                ) : emailContact ? (
                  <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-semibold mb-1 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <MessageCircle className="w-4 h-4" />
                      {t("detail.contactEmail.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t("detail.contactEmail.desc")}
                    </p>
                    <p className="text-sm font-mono bg-background px-3 py-2 rounded-lg select-all border border-border mb-3">
                      {emailContact}
                    </p>
                    <Button size="sm" className="w-full gap-1.5" asChild>
                      <a href={`mailto:${emailContact}?subject=${emailSubject}&body=${emailBody}`}>
                        <MessageCircle className="w-3.5 h-3.5" />
                        {t("detail.contactEmail.cta")}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border">
                    <h3 className="font-semibold mb-1 flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      {t("detail.contactRequest.title")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("detail.contactRequest.desc")}
                    </p>
                    <Button size="sm" className="w-full gap-1.5" onClick={handleApply}>
                      <FileText className="w-3.5 h-3.5" />
                      {t("detail.contactRequest.cta")}
                    </Button>
                  </div>
                )}

                {/* Lease Terms */}
                <div className="mb-6 p-4 rounded-xl bg-muted/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {apartment.isSublease ? t("detail.subleaseTerms") : t("detail.leaseTerms")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {apartment.isSublease && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("detail.type")}</span>
                        <span className="text-orange-500 font-medium">📋 {t("detail.status.sublease")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("detail.availableFrom")}</span>
                      <span>{availabilityLabel}</span>
                    </div>
                    {apartment.subleaseEndDate ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("detail.leaseEnds")}</span>
                        <span>{formatDateLabel(apartment.subleaseEndDate, language, t("detail.notSpecified"))}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("detail.minimumLease")}</span>
                          <span>{apartment.minLeaseTerm ? `${apartment.minLeaseTerm} ${t("listings.months")}` : t("detail.notSpecified")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("detail.maximumLease")}</span>
                          <span>{apartment.maxLeaseTerm ? `${apartment.maxLeaseTerm} ${t("listings.months")}` : t("detail.notSpecified")}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* International Student Benefits */}
                <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                    <Globe className="w-4 h-4" />
                    {t("detail.international.title")}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      {t("detail.international.noSsn")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      {t("detail.international.noCredit")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      {t("detail.international.payments")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      {t("detail.international.docs")}
                    </li>
                  </ul>
                </div>
                
                {/* Actions */}
                <div className="space-y-3">
                  <Button onClick={handleApply} className="w-full glow h-12 text-base gap-2">
                    <FileText className="w-4 h-4" />
                    {t("detail.applyNow")}
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      className={`gap-2 bg-transparent ${isSaved ? "text-red-500 border-red-500/50" : ""}`}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                      {isSaved ? t("detail.saved") : t("detail.save")}
                    </Button>
                    <Button variant="outline" onClick={handleShare} className="gap-2 bg-transparent">
                      <Share2 className="w-4 h-4" />
                      {t("detail.share")}
                    </Button>
                  </div>
                </div>
                
                {/* Views + report */}
                <div className="mt-4 text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {apartment.viewCount} {t("detail.views")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <Flag className="w-3 h-3" />
                    {t("detail.somethingWrong")}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      {/* ── Report Listing Dialog ─────────────────────────── */}
      <Dialog open={reportOpen} onOpenChange={(open) => { setReportOpen(open); if (!open) { setReportReason(""); setReportNotes(""); } }}>
        <DialogContent className="sm:max-w-md" closeLabel={t("detail.report.cancel")}>
          <DialogHeader>
            <DialogTitle>{t("detail.report.title")}</DialogTitle>
            <DialogDescription>
              {t("detail.report.desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("detail.report.reason")}</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reportReason === r.value}
                    onChange={() => setReportReason(r.value)}
                    className="accent-primary"
                  />
                  {t(r.labelKey)}
                </label>
              ))}
            </fieldset>

            <div className="space-y-1">
              <label htmlFor="report-notes" className="text-sm font-medium">
                {t("detail.report.details")}{" "}
                <span className="text-muted-foreground font-normal">({t("detail.report.optional")})</span>
              </label>
              <textarea
                id="report-notes"
                rows={3}
                maxLength={1000}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder={t("detail.report.placeholder")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">{t("detail.report.cancel")}</Button>
            </DialogClose>
            <Button
              onClick={handleReportSubmit}
              disabled={!reportReason || reportMutation.isPending}
            >
              {reportMutation.isPending ? t("detail.report.submitting") : t("detail.report.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
