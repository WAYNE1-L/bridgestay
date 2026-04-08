import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Bed,
  Bath,
  Square,
  Heart,
  Filter,
  X,
  Grid3X3,
  Map,
  ChevronDown,
  Loader2,
  Building2,
  DollarSign,
  PawPrint,
  Car,
  Shield,
  GraduationCap,
} from "lucide-react";
import { topSignals } from "@/lib/signals";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useListings } from "@/contexts/ListingsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment", labelCn: "公寓" },
  { value: "studio", label: "Studio", labelCn: "单间" },
  { value: "house", label: "House", labelCn: "独栋" },
  { value: "room", label: "Room", labelCn: "房间" },
  { value: "condo", label: "Condo", labelCn: "公寓套房" },
  { value: "townhouse", label: "Townhouse", labelCn: "联排别墅" },
];

function parseNearbyUniversities(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface ApartmentCardProps {
  apartment: any;
  onSave?: () => void;
  isSaved?: boolean;
  isAdminMode?: boolean;
  onDelete?: () => void;
}

function ApartmentCard({ apartment, onSave, isSaved, isAdminMode = false, onDelete }: ApartmentCardProps) {
  const images = apartment.images ? JSON.parse(apartment.images) : [];
  const { language, t } = useLanguage();
  
  return (
    <motion.div
      variants={fadeInUp}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300"
      whileHover={{ y: -4 }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {images.length > 0 ? (
          <img
            src={images[0]}
            alt={apartment.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {apartment.featured && (
            <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {t("listings.featured")}
            </span>
          )}
          {apartment.noSsnRequired && (
            <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {t("listings.noSsn")}
            </span>
          )}
        </div>
        
        {/* Save Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onSave?.();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${isSaved ? "fill-red-500 text-red-500" : "text-foreground"}`}
          />
        </button>
      </div>
      
      {/* Content */}
      <Link href={`/apartments/${apartment.id}`}>
        <div className="p-4 cursor-pointer">
          {/* Price */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold">${Number(apartment.monthlyRent).toLocaleString()}</span>
            <span className="text-muted-foreground">{t("detail.perMonth")}</span>
          </div>
          
          {/* Title */}
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{apartment.title}</h3>
          
          {/* Location */}
          <p className="text-muted-foreground text-sm flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3" />
            {apartment.city}, {apartment.state}
          </p>
          
          {/* Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              {apartment.bedrooms} {Number(apartment.bedrooms) === 1 ? t("listings.bed") : t("listings.beds")}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              {apartment.bathrooms} {Number(apartment.bathrooms) === 1 ? t("listings.bath") : t("listings.baths")}
            </span>
            {apartment.squareFeet && (
              <span className="flex items-center gap-1">
                <Square className="w-4 h-4" />
                {apartment.squareFeet} {t("listings.sqft")}
              </span>
            )}
          </div>
          
          {/* Tags: persistent property facts */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {apartment.petsAllowed && (
              <span className="px-2 py-1 text-xs bg-accent rounded-full flex items-center gap-1">
                <PawPrint className="w-3 h-3" />
                {t("listings.petsOk")}
              </span>
            )}
            {apartment.parkingIncluded && (
              <span className="px-2 py-1 text-xs bg-accent rounded-full flex items-center gap-1">
                <Car className="w-3 h-3" />
                {t("listings.parking")}
              </span>
            )}
          </div>

          {/* Signal badges: rule-based fit signals */}
          {(() => {
            const signals = topSignals(apartment, 3);
            if (signals.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-1.5">
                {signals.map((s) => (
                  <span
                    key={s.id}
                    title={t(`signals.${s.id}.description`)}
                    className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${s.colorClasses}`}
                  >
                    <span aria-hidden="true">{s.emoji}</span>
                    {t(`signals.${s.id}.label`)}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Admin Mode Buttons - Only visible with ?admin=true */}
          {isAdminMode && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              {apartment.sourceLink && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(apartment.sourceLink, '_blank');
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1"
                >
                  🔗 {t("listings.sourceLink")}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.confirm(language === 'cn' ? '确定要删除这个房源吗？' : 'Delete this listing?')) {
                    onDelete?.();
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1"
              >
                🗑️ {t("listings.delete")}
              </button>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function Apartments() {
  const { isAuthenticated, user } = useAuth();
  const { allListings: contextListings } = useListings();
  const { language, t } = useLanguage();
  const utils = trpc.useUtils();
  const searchString = useSearch();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Hidden admin mode - only enabled with ?admin=true in URL
  const isAdminMode = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get('admin') === 'true' && user?.role === "admin";
  }, [searchString, user?.role]);
  const querySearchCity = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("search")?.trim() ?? "";
  }, [searchString]);
  const queryNearUniversity = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("nearUniversity")?.trim() ?? "";
  }, [searchString]);
  
  // View state
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_low" | "price_high">("newest");
  
  // Filter state
  const [searchCity, setSearchCity] = useState(querySearchCity);
  const [selectedState, setSelectedState] = useState<string>("");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [propertyType, setPropertyType] = useState<string>("");
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [parkingIncluded, setParkingIncluded] = useState(false);
  
  // Stable filter object for query
  const [appliedFilters, setAppliedFilters] = useState({
    city: querySearchCity,
    state: "",
    minPrice: 0,
    maxPrice: 5000,
    bedrooms: undefined as number | undefined,
    bathrooms: undefined as number | undefined,
    propertyType: "",
    petsAllowed: false,
    parkingIncluded: false,
    nearUniversity: queryNearUniversity,
  });

  useEffect(() => {
    setSearchCity(querySearchCity);
    setAppliedFilters((prev) => ({
      ...prev,
      city: querySearchCity,
      nearUniversity: queryNearUniversity,
    }));
  }, [querySearchCity, queryNearUniversity]);
  
  // Fetch public published listings
  const { data: apartments, isLoading, refetch } = trpc.apartments.list.useQuery({
    ...appliedFilters,
    limit: 50,
    offset: 0,
  });
  const deleteMutation = trpc.apartments.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        refetch(),
        utils.apartments.myListings.invalidate(),
      ]);
      toast.success(language === 'cn' ? '房源已删除' : 'Listing deleted');
    },
    onError: (error) => {
      toast.error(error.message || (language === 'cn' ? '删除失败' : 'Failed to delete'));
    },
  });

  // Saved apartments
  const { data: savedApartments } = trpc.apartments.saved.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const saveMutation = trpc.apartments.save.useMutation({
    onSuccess: () =>
      toast.success(t("detail.toast.saved"), {
        description: t("detail.toast.savedDesc"),
        action: { label: t("detail.toast.viewSaved"), onClick: () => (window.location.href = "/dashboard") },
      }),
    onError: (error) => {
      toast.error(error.message || t("apartments.toast.saveFailed"));
    },
  });

  const unsaveMutation = trpc.apartments.unsave.useMutation({
    onSuccess: () => toast.success(t("detail.toast.unsaved")),
    onError: (error) => {
      toast.error(error.message || t("apartments.toast.unsaveFailed"));
    },
  });
  
  const savedIds = useMemo(() => {
    return new Set(savedApartments?.map((a: any) => a.id) || []);
  }, [savedApartments]);

  // Merge database apartments with context listings (from AI Generator)
  const mergedApartments = useMemo(() => {
    const publicListings = apartments || [];
    const matchesAppliedFilters = (apartment: any) => {
      if (
        appliedFilters.city &&
        !String(apartment.city ?? "").toLowerCase().includes(appliedFilters.city.toLowerCase())
      ) {
        return false;
      }
      if (appliedFilters.state && apartment.state !== appliedFilters.state) {
        return false;
      }
      if (appliedFilters.minPrice && Number(apartment.monthlyRent) < appliedFilters.minPrice) {
        return false;
      }
      if (appliedFilters.maxPrice && Number(apartment.monthlyRent) > appliedFilters.maxPrice) {
        return false;
      }
      if (appliedFilters.bedrooms && Number(apartment.bedrooms) !== appliedFilters.bedrooms) {
        return false;
      }
      if (appliedFilters.bathrooms && Number(apartment.bathrooms) !== appliedFilters.bathrooms) {
        return false;
      }
      if (
        appliedFilters.propertyType &&
        String(apartment.propertyType ?? "").toLowerCase() !== appliedFilters.propertyType
      ) {
        return false;
      }
      if (appliedFilters.petsAllowed === true && apartment.petsAllowed !== true) {
        return false;
      }
      if (appliedFilters.parkingIncluded === true && apartment.parkingIncluded !== true) {
        return false;
      }
      if (appliedFilters.nearUniversity.trim()) {
        const normalizedUniversity = appliedFilters.nearUniversity.trim().toLowerCase();
        const nearbyUniversities = parseNearbyUniversities(apartment.nearbyUniversities);
        if (
          !nearbyUniversities.some((university) =>
            university.toLowerCase().includes(normalizedUniversity)
          )
        ) {
          return false;
        }
      }
      return true;
    };

    // Keep the public apartments page published-only. Draft and archived
    // owner/admin listings stay visible in dashboard and admin management.
    const dbApartments = publicListings;

    // Convert context listings to apartment format
    const contextApartments = contextListings
      .filter((listing) => listing.status === "published")
      .map((listing) => ({
      id: `ctx_${listing.id}`,
      title: language === "cn" ? listing.title.cn : listing.title.en,
      description: language === "cn" ? listing.description.cn : listing.description.en,
      propertyType: listing.propertyType?.toLowerCase() || "studio",
      address: language === "cn" ? listing.location.address.cn : listing.location.address.en,
      city: language === "cn" ? listing.location.area.cn : listing.location.area.en,
      state: "UT",
      monthlyRent: listing.price.amount.toString(),
      // Use images[] array first, fall back to legacy imageUrl for Supabase listings
      images: JSON.stringify(
        listing.images?.length
          ? listing.images
          : listing.imageUrl
          ? [listing.imageUrl]
          : []
      ),
      amenities: JSON.stringify(listing.tags.map(t => language === "cn" ? t.cn : t.en)),
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms != null ? String(listing.bathrooms) : null,
      squareFeet: listing.squareFeet ?? null,
      nearbyUniversities: listing.nearbyUniversities?.length
        ? JSON.stringify(listing.nearbyUniversities)
        : undefined,
      petsAllowed: listing.petsAllowed ?? false,
      parkingIncluded: listing.parkingIncluded ?? false,
      noSsnRequired: listing.noSsnRequired ?? true,
      featured: listing.isFeatured || false,
      contact: listing.contact,
      sourceLink: listing.sourceLink,
    }));
    
    // DB listings first (real imports), then Supabase context listings
    const combined = [...dbApartments, ...contextApartments.filter(matchesAppliedFilters)];
    
    // Apply sorting
    return combined.sort((a, b) => {
      switch (sortBy) {
        case "price_low":
          return Number(a.monthlyRent) - Number(b.monthlyRent);
        case "price_high":
          return Number(b.monthlyRent) - Number(a.monthlyRent);
        case "newest":
        default:
          return 0; // Keep original order (newest first from DB)
      }
    });
  }, [apartments, contextListings, language, sortBy, appliedFilters]);
  
  const handleSave = useCallback((apartmentId: number | string) => {
    if (!isAuthenticated) {
      toast.error(t("detail.toast.signInToSave"));
      return;
    }
    
    // Skip save for context-based listings (they have string IDs like "ctx_1")
    if (typeof apartmentId === "string") {
      toast.info(t("apartments.toast.contextSaveUnavailable"));
      return;
    }
    
    if (savedIds.has(apartmentId)) {
      unsaveMutation.mutate({ apartmentId });
    } else {
      saveMutation.mutate({ apartmentId });
    }
  }, [isAuthenticated, savedIds, saveMutation, t, unsaveMutation, language]);
  
  const applyFilters = useCallback(() => {
    setAppliedFilters({
      city: searchCity,
      // "any" is the SelectItem placeholder value — treat it as no filter
      state: selectedState === "any" ? "" : selectedState,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      bedrooms: bedrooms && bedrooms !== "any" ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms && bathrooms !== "any" ? parseInt(bathrooms) : undefined,
      propertyType: propertyType === "any" ? "" : propertyType,
      petsAllowed,
      parkingIncluded,
      nearUniversity: appliedFilters.nearUniversity,
    });
    setShowFilters(false);
  }, [searchCity, selectedState, priceRange, bedrooms, bathrooms, propertyType, petsAllowed, parkingIncluded, appliedFilters.nearUniversity]);
  
  const clearFilters = useCallback(() => {
    setSearchCity("");
    setSelectedState("");
    setPriceRange([0, 5000]);
    setBedrooms("");
    setBathrooms("");
    setPropertyType("");
    setPetsAllowed(false);
    setParkingIncluded(false);
    setAppliedFilters({
      city: "",
      state: "",
      minPrice: 0,
      maxPrice: 5000,
      bedrooms: undefined,
      bathrooms: undefined,
      propertyType: "",
      petsAllowed: false,
      parkingIncluded: false,
      nearUniversity: "",
    });
  }, []);
  
  // Update map markers from the same final dataset rendered in the list.
  const updateMapMarkers = useCallback((map: google.maps.Map) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidCoords = false;

    mergedApartments.forEach((apartment: any) => {
      if (apartment.latitude && apartment.longitude) {
        const position = {
          lat: parseFloat(apartment.latitude),
          lng: parseFloat(apartment.longitude),
        };
        
        // Create custom marker content
        const markerContent = document.createElement("div");
        markerContent.className = "bg-primary text-primary-foreground px-2 py-1 rounded-lg font-semibold text-sm shadow-lg";
        markerContent.textContent = `$${Number(apartment.monthlyRent).toLocaleString()}`;
        
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          title: apartment.title,
          content: markerContent,
        });
        
        // Add click listener
        marker.addListener("click", () => {
          window.location.href = `/apartments/${apartment.id}`;
        });
        
        markersRef.current.push(marker);
        bounds.extend(position);
        hasValidCoords = true;
      }
    });
    
    if (hasValidCoords) {
      map.fitBounds(bounds);
    }
  }, [mergedApartments]);
  
  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    updateMapMarkers(map);
  }, [updateMapMarkers]);
  
  // Update markers when apartments change
  useEffect(() => {
    if (mapRef.current && viewMode === "map") {
      updateMapMarkers(mapRef.current);
    }
  }, [mergedApartments, viewMode, updateMapMarkers]);

  const listingsMissingMapCoordinates = useMemo(
    () =>
      mergedApartments.filter(
        (apartment: any) => !apartment.latitude || !apartment.longitude
      ).length,
    [mergedApartments]
  );

  // True when any filter is active — used to pick the right empty-state message
  const hasActiveFilters =
    appliedFilters.city !== "" ||
    appliedFilters.state !== "" ||
    appliedFilters.bedrooms !== undefined ||
    appliedFilters.bathrooms !== undefined ||
    appliedFilters.propertyType !== "" ||
    appliedFilters.petsAllowed ||
    appliedFilters.parkingIncluded ||
    appliedFilters.nearUniversity !== "" ||
    appliedFilters.minPrice > 0 ||
    appliedFilters.maxPrice < 5000;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Search Header */}
        <div className="border-b border-border bg-card/50">
          <div className="container px-6 py-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Search Input */}
              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder={t("apartments.searchPlaceholder")}
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    className="pl-10 h-12 bg-background"
                  />
                </div>
              </div>
              
              {/* View Toggle & Filter Button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "grid" ? "bg-background shadow" : "hover:bg-background/50"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "map" ? "bg-background shadow" : "hover:bg-background/50"
                    }`}
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 bg-transparent"
                >
                  <Filter className="w-4 h-4" />
                  {t("apartments.filters")}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>
            
            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* State */}
                    <div className="space-y-2">
                      <Label>{t("apartments.state")}</Label>
                      <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t("apartments.anyState")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t("apartments.anyState")}</SelectItem>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Price Range */}
                    <div className="space-y-2">
                      <Label>{t("apartments.priceRange")}: ${priceRange[0]} - ${priceRange[1]}</Label>
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        min={0}
                        max={10000}
                        step={100}
                        className="mt-4"
                      />
                    </div>
                    
                    {/* Bedrooms */}
                    <div className="space-y-2">
                      <Label>{t("apartments.bedrooms")}</Label>
                      <Select value={bedrooms} onValueChange={setBedrooms}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t("apartments.any")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t("apartments.any")}</SelectItem>
                          <SelectItem value="0">{t("apartments.studio")}</SelectItem>
                          <SelectItem value="1">{t("apartments.oneBedroom")}</SelectItem>
                          <SelectItem value="2">{t("apartments.twoBedrooms")}</SelectItem>
                          <SelectItem value="3">{t("apartments.threeBedrooms")}</SelectItem>
                          <SelectItem value="4">{t("apartments.fourBedrooms")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bathrooms */}
                    <div className="space-y-2">
                      <Label>{t("apartments.bathrooms")}</Label>
                      <Select value={bathrooms} onValueChange={setBathrooms}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t("apartments.any")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t("apartments.any")}</SelectItem>
                          <SelectItem value="1">{t("apartments.oneBathroom")}</SelectItem>
                          <SelectItem value="2">{t("apartments.twoBathrooms")}</SelectItem>
                          <SelectItem value="3">{t("apartments.threeBathrooms")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Property Type */}
                    <div className="space-y-2">
                      <Label>{t("apartments.propertyType")}</Label>
                      <Select value={propertyType} onValueChange={setPropertyType}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t("apartments.anyType")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t("apartments.anyType")}</SelectItem>
                          {PROPERTY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {language === "cn" ? type.labelCn : type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Toggles */}
                    <div className="flex items-center gap-6 col-span-full">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={petsAllowed}
                          onCheckedChange={setPetsAllowed}
                        />
                        <Label className="cursor-pointer">{t("apartments.petsAllowed")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={parkingIncluded}
                          onCheckedChange={setParkingIncluded}
                        />
                        <Label className="cursor-pointer">{t("apartments.parkingIncluded")}</Label>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 col-span-full">
                      <Button onClick={applyFilters} className="glow-sm">
                        {t("apartments.applyFilters")}
                      </Button>
                      <Button variant="outline" onClick={clearFilters} className="bg-transparent">
                        {t("apartments.clearAll")}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Results */}
        <div className="container px-6 py-8">
          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                {isLoading ? (
                  t("apartments.loading")
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{mergedApartments.length}</span> {t("apartments.found")}
                  </>
                )}
              </p>
              
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("apartments.newest")}</SelectItem>
                  <SelectItem value="price_low">{t("apartments.priceLow")}</SelectItem>
                  <SelectItem value="price_high">{t("apartments.priceHigh")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* International Student Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {t("apartments.studentBadge")}
              </span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="initial"
              animate="animate"
              variants={{
                animate: {
                  transition: { staggerChildren: 0.05 },
                },
              }}
            >
              {mergedApartments.map((apartment: any) => (
                <ApartmentCard
                  key={apartment.id}
                  apartment={apartment}
                  onSave={() => handleSave(apartment.id)}
                  isSaved={typeof apartment.id === "number" && savedIds.has(apartment.id)}
                  isAdminMode={isAdminMode}
                  onDelete={async () => {
                    if (typeof apartment.id === 'number') {
                      deleteMutation.mutate({ id: apartment.id });
                    }
                  }}
                />
              ))}
            </motion.div>
          ) : (
            /* Map View */
            <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
              {/* Map */}
              <div className="rounded-2xl overflow-hidden border border-border h-full min-h-[400px]">
                <MapView
                  className="h-full"
                  initialCenter={{ lat: 39.8283, lng: -98.5795 }}
                  initialZoom={4}
                  onMapReady={handleMapReady}
                />
              </div>
              
              {/* List */}
              <div className="overflow-y-auto space-y-4 h-full">
                {listingsMissingMapCoordinates > 0 && mergedApartments.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    {language === "cn"
                      ? `${listingsMissingMapCoordinates} 套匹配房源暂时没有地图坐标，因此只显示在列表中。`
                      : `${listingsMissingMapCoordinates} matching ${
                          listingsMissingMapCoordinates === 1 ? "listing" : "listings"
                        } ${
                          listingsMissingMapCoordinates === 1 ? "does" : "do"
                        } not have map coordinates yet, so ${
                          listingsMissingMapCoordinates === 1 ? "it appears" : "they appear"
                        } in the list only.`}
                  </div>
                )}
                {mergedApartments.map((apartment: any) => (
                  <ApartmentCard
                    key={apartment.id}
                    apartment={apartment}
                    onSave={() => handleSave(apartment.id)}
                    isSaved={typeof apartment.id === "number" && savedIds.has(apartment.id)}
                    isAdminMode={isAdminMode}
                    onDelete={async () => {
                      if (typeof apartment.id === 'number') {
                        deleteMutation.mutate({ id: apartment.id });
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && mergedApartments.length === 0 && (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              {hasActiveFilters ? (
                <>
                  <h3 className="text-xl font-semibold mb-2">
                    {t("apartments.noMatches")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t("apartments.noMatchesDesc")}
                  </p>
                  <Button onClick={clearFilters} variant="outline" className="bg-transparent">
                    {t("apartments.clearFilters")}
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-2">
                    {t("apartments.noListings")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {user?.role === "admin"
                      ? t("apartments.adminEmpty")
                      : t("apartments.publicEmpty")}
                  </p>
                  {user?.role === "admin" && (
                    <Button asChild>
                      <Link href="/admin/import">
                        {t("apartments.importListing")}
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
