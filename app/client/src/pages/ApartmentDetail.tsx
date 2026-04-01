import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { computeSignals } from "@/lib/signals";
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
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { toast } from "sonner";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function ApartmentDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const mapRef = useRef<google.maps.Map | null>(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopyWeChat = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("WeChat ID copied! Open WeChat → Add Contacts → paste to find the landlord.");
  }, []);

  // Detect context listings (IDs prefixed with "ctx_" come from ListingsContext,
  // not the DB — e.g. ctx_slc_001. These must be resolved locally, not via tRPC.)
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
        title: contextListing.title.en,
        address: contextListing.location.address.en,
        city: contextListing.location.area.en,
        state: "UT",
        zipCode: "",
        monthlyRent: contextListing.price.amount,
        securityDeposit: 0,
        bedrooms: contextListing.bedrooms ?? null,
        bathrooms: contextListing.bathrooms ?? null,
        squareFeet: contextListing.squareFeet ?? null,
        description: contextListing.description.en,
        // Prefer images[] array; fall back to legacy imageUrl (Supabase listings)
        images: JSON.stringify(
          contextListing.images?.length
            ? contextListing.images
            : contextListing.imageUrl
            ? [contextListing.imageUrl]
            : []
        ),
        amenities: JSON.stringify(
          contextListing.tags?.map((t) => t.en) ?? []
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
        viewCount: 0,
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
      toast.success("Saved!", {
        description: "Find all your saved listings in the dashboard.",
        action: { label: "View saved →", onClick: () => navigate("/dashboard") },
      }),
  });

  const unsaveMutation = trpc.apartments.unsave.useMutation({
    onSuccess: () => toast.success("Removed from saved listings"),
  });

  const handleSave = useCallback(() => {
    if (isContextId) {
      toast.info("Save is only available for verified DB listings");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Please sign in to save apartments");
      return;
    }

    const apartmentId = parseInt(params.id || "0");
    if (isSaved) {
      unsaveMutation.mutate({ apartmentId });
    } else {
      saveMutation.mutate({ apartmentId });
    }
  }, [isContextId, isAuthenticated, isSaved, params.id, saveMutation, unsaveMutation]);
  
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  }, []);
  
  const handleApply = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    navigate(`/apply/${params.id}`);
  }, [isAuthenticated, navigate, params.id]);
  
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    
    if (apartment?.latitude && apartment?.longitude) {
      const position = {
        lat: parseFloat(apartment.latitude),
        lng: parseFloat(apartment.longitude),
      };
      
      map.setCenter(position);
      map.setZoom(15);
      
      new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: apartment.title,
      });
    }
  }, [apartment]);
  
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
          <h2 className="text-2xl font-semibold mb-2">Apartment not found</h2>
          <p className="text-muted-foreground mb-6">
            This listing may have been removed or is no longer available.
          </p>
          <Link href="/apartments">
            <Button>Browse Apartments</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const images = apartment.images ? JSON.parse(apartment.images as string) : [];
  const amenities = apartment.amenities ? JSON.parse(apartment.amenities as string) : [];
  const utilities = apartment.utilitiesIncluded ? JSON.parse(apartment.utilitiesIncluded as string) : [];
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Back Button */}
        <div className="container px-6 py-4">
          <Link href="/apartments">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to listings
            </Button>
          </Link>
        </div>

        {/* Draft preview banner — only visible before publishing */}
        {(apartment as any).status === "draft" && (
          <div className="container px-6 mb-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400">
              <span className="text-base" aria-hidden="true">👁</span>
              <div className="text-sm">
                <span className="font-semibold">Draft preview</span>
                {" — "}this listing is only visible to you. Publish it from your dashboard to make it searchable by students.
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
                  {apartment.noSsnRequired && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      No SSN Required
                    </Badge>
                  )}
                  {apartment.noCreditCheckRequired && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      No Credit Check
                    </Badge>
                  )}
                  {apartment.acceptsInternationalStudents && (
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-0">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      International Students Welcome
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
                        Why this listing stands out
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
                              <p className="font-semibold text-sm leading-tight">{s.label}</p>
                              <p className="text-xs opacity-80 mt-0.5 leading-snug">{s.description}</p>
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
                    {apartment.bedrooms} {apartment.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Bath className="w-5 h-5 text-muted-foreground" />
                    {apartment.bathrooms} {Number(apartment.bathrooms) === 1 ? "Bathroom" : "Bathrooms"}
                  </span>
                  {apartment.squareFeet && (
                    <span className="flex items-center gap-2">
                      <Square className="w-5 h-5 text-muted-foreground" />
                      {apartment.squareFeet} sqft
                    </span>
                  )}
                </div>
              </motion.div>
              
              <Separator />
              
              {/* Description */}
              {apartment.description && (
                <motion.div {...fadeInUp}>
                  <h2 className="text-xl font-semibold mb-4">About This Property</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">{apartment.description}</p>
                </motion.div>
              )}
              
              {/* Amenities */}
              {amenities.length > 0 && (
                <motion.div {...fadeInUp}>
                  <h2 className="text-xl font-semibold mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {/* Utilities */}
              {utilities.length > 0 && (
                <motion.div {...fadeInUp}>
                  <h2 className="text-xl font-semibold mb-4">Utilities Included</h2>
                  <div className="flex flex-wrap gap-2">
                    {utilities.map((utility: string) => (
                      <Badge key={utility} variant="outline" className="bg-transparent">
                        {utility}
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
                    <h3 className="font-semibold">Pet Policy</h3>
                  </div>
                  {apartment.petsAllowed ? (
                    <div className="text-muted-foreground">
                      <p className="text-green-400 font-medium mb-1">Pets Allowed</p>
                      {apartment.petDeposit && <p>Pet Deposit: ${Number(apartment.petDeposit).toLocaleString()}</p>}
                      {apartment.petRent && <p>Pet Rent: ${Number(apartment.petRent).toLocaleString()}/month</p>}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No pets allowed</p>
                  )}
                </div>
                
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <Car className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Parking</h3>
                  </div>
                  {apartment.parkingIncluded ? (
                    <div className="text-muted-foreground">
                      <p className="text-green-400 font-medium mb-1">Parking Included</p>
                      {apartment.parkingType && <p>Type: {apartment.parkingType}</p>}
                      {apartment.parkingFee && Number(apartment.parkingFee) > 0 && (
                        <p>Additional Fee: ${Number(apartment.parkingFee).toLocaleString()}/month</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No parking included</p>
                  )}
                </div>
              </motion.div>
              
              {/* Map */}
              <motion.div {...fadeInUp}>
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="rounded-xl overflow-hidden border border-border h-[400px]">
                  <MapView
                    className="h-full"
                    initialCenter={
                      apartment.latitude && apartment.longitude
                        ? { lat: parseFloat(apartment.latitude), lng: parseFloat(apartment.longitude) }
                        : { lat: 39.8283, lng: -98.5795 }
                    }
                    initialZoom={15}
                    onMapReady={handleMapReady}
                  />
                </div>
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
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${Number(apartment.securityDeposit).toLocaleString()} deposit
                    </span>
                  </div>
                </div>
                
                {/* ── Contact Landlord (primary student CTA) ─────────────── */}
                {apartment.wechatContact ? (
                  <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <h3 className="font-semibold mb-1 flex items-center gap-2 text-green-700 dark:text-green-400">
                      <span aria-hidden="true">💬</span>
                      Contact Landlord on WeChat
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      This landlord prefers WeChat. Copy the ID below.
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
                          ? <><Check className="w-3.5 h-3.5" />Copied!</>
                          : <><Copy className="w-3.5 h-3.5" />Copy WeChat ID</>}
                      </Button>
                      <Button size="sm" variant="outline" className="bg-transparent" asChild>
                        <a
                          href={`weixin://dl/chat?${apartment.wechatContact}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open WeChat
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      In WeChat: tap <strong>+</strong> → <strong>Add Contacts</strong> → paste ID
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border">
                    <h3 className="font-semibold mb-1 flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      Contact Landlord
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Contact details not provided. Submit an application and the landlord will reach out directly.
                    </p>
                  </div>
                )}

                {/* Lease Terms */}
                <div className="mb-6 p-4 rounded-xl bg-muted/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {apartment.isSublease ? "Sublease Terms" : "Lease Terms"}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {apartment.isSublease && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="text-orange-500 font-medium">📋 Sublease</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available From</span>
                      <span>{new Date(apartment.availableFrom).toLocaleDateString()}</span>
                    </div>
                    {apartment.subleaseEndDate ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lease Ends</span>
                        <span>{new Date(apartment.subleaseEndDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Minimum Lease</span>
                          <span>{apartment.minLeaseTerm} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Maximum Lease</span>
                          <span>{apartment.maxLeaseTerm} months</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* International Student Benefits */}
                <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                    <Globe className="w-4 h-4" />
                    International Student Friendly
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      No SSN required
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      No credit history needed
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      International payments accepted
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Visa documentation support
                    </li>
                  </ul>
                </div>
                
                {/* Actions */}
                <div className="space-y-3">
                  <Button onClick={handleApply} className="w-full glow h-12 text-base gap-2">
                    <FileText className="w-4 h-4" />
                    Apply Now
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      className={`gap-2 bg-transparent ${isSaved ? "text-red-500 border-red-500/50" : ""}`}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button variant="outline" onClick={handleShare} className="gap-2 bg-transparent">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
                
                {/* Views */}
                <p className="text-center text-sm text-muted-foreground mt-4">
                  {apartment.viewCount} people viewed this listing
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
