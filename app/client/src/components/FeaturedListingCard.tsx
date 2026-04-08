import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ImageCarousel } from "@/components/ImageCarousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Calendar, MessageCircle, Trash2, X, Copy, Check, Mail, Wifi, Car, Snowflake, Utensils, Dumbbell, Shield, Star, Link2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings, BilingualListing } from "@/contexts/ListingsContext";
import { useAuth } from "@/_core/hooks/useAuth";

// Re-export the type for use in other components
export type { BilingualListing };

interface FeaturedListingCardProps {
  listing: BilingualListing;
  index: number;
  isAdminMode?: boolean; // Hidden admin mode via ?admin=true URL param
}

const cardVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

// Xiaohongshu-style tag colors - more vibrant and varied
const tagColors = [
  "bg-rose-50 text-rose-600 border-rose-200",
  "bg-sky-50 text-sky-600 border-sky-200",
  "bg-emerald-50 text-emerald-600 border-emerald-200",
  "bg-violet-50 text-violet-600 border-violet-200",
  "bg-amber-50 text-amber-600 border-amber-200",
  "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200",
];

// Amenities icons mapping
const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-4 h-4" />,
  parking: <Car className="w-4 h-4" />,
  ac: <Snowflake className="w-4 h-4" />,
  kitchen: <Utensils className="w-4 h-4" />,
  gym: <Dumbbell className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
};

// Format date for display
function formatDate(dateStr: string, language: "cn" | "en"): string {
  if (!dateStr || dateStr === "Immediate") {
    return language === "cn" ? "即可入住" : "Available Now";
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(language === "cn" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export function FeaturedListingCard({ listing, index, isAdminMode = false }: FeaturedListingCardProps) {
  const { language, t } = useLanguage();
  const { deleteListing, deleteSupabaseListing } = useListings();
  const { user } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const isAdmin = user?.role === "admin";

  const handleCardClick = () => {
    setShowDetailModal(true);
  };

  const handleContact = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowContactModal(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t("contact.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t("admin.deleteConfirm"))) {
      deleteListing(listing.id);
      toast.success(language === "cn" ? "房源已删除" : "Listing deleted");
    }
  };

  const isUrgent = listing.tags.some(tag => 
    tag.cn.includes("急") || tag.en.toLowerCase().includes("urgent")
  );

  // Get availability display
  const availabilityDisplay = listing.availability.start === "Immediate" || !listing.availability.start
    ? (language === "cn" ? "即可入住" : "Available Now")
    : `${formatDate(listing.availability.start, language)} - ${formatDate(listing.availability.end, language)}`;

  // Default amenities for display
  const defaultAmenities = [
    { key: "wifi", cn: "WiFi", en: "WiFi" },
    { key: "ac", cn: "空调", en: "A/C" },
    { key: "kitchen", cn: "厨房", en: "Kitchen" },
    { key: "parking", cn: "停车位", en: "Parking" },
  ];

  return (
    <>
      <motion.div
        variants={cardVariants}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-50px" }}
        transition={{ delay: index * 0.1 }}
        onClick={handleCardClick}
        className="cursor-pointer"
      >
        {/* Card with mobile-optimized sizing */}
        <Card className="group overflow-hidden bg-white border-0 shadow-soft hover:shadow-soft-lg transition-all duration-300 h-full flex flex-col rounded-xl sm:rounded-2xl">
          {/* Image Section - Square on mobile, 4:3 on desktop */}
          <div className="relative aspect-square sm:aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
            {(listing.images && listing.images.length > 0) || listing.imageUrl ? (
              <ImageCarousel
                images={listing.images && listing.images.length > 0 ? listing.images : (listing.imageUrl ? [listing.imageUrl] : [])}
                alt={listing.title[language]}
                className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                aspectRatio="auto"
                showDots={true}
                showArrows={true}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="text-center">
                  <Home className="w-10 h-10 sm:w-16 sm:h-16 text-primary/30 mx-auto mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm text-gray-400">
                    {language === "cn" ? "房源图片" : "Property Image"}
                  </span>
                </div>
              </div>
            )}
            
            {/* Price Badge - Smaller on mobile */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
              <div className="bg-primary text-white rounded-lg sm:rounded-xl px-2 py-1 sm:px-4 sm:py-2 shadow-lg">
                <span className="text-sm sm:text-xl font-bold">${listing.price.amount}</span>
                <span className="text-[10px] sm:text-xs opacity-90">{t("listings.perMonth")}</span>
              </div>
            </div>

            {/* Urgent Tag - Top left */}
            {isUrgent && (
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                <Badge className="bg-red-500 text-white border-0 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold shadow-lg animate-pulse">
                  🔥 {language === "cn" ? "急转" : "Urgent"}
                </Badge>
              </div>
            )}

            {/* Availability Badge - Bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-4">
              <div className="flex items-center gap-1 sm:gap-2 text-white">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">{availabilityDisplay}</span>
              </div>
            </div>

            {/* Admin Delete Button */}
            {isAdmin && !isUrgent && (
              <motion.button
                onClick={handleDelete}
                className="absolute top-2 left-2 sm:top-3 sm:left-3 p-1.5 sm:p-2 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.button>
            )}
          </div>

          <CardContent className="p-3 sm:p-5 flex-1 flex flex-col">
            {/* Title - Smaller on mobile */}
            <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 leading-tight">
              {listing.title[language]}
            </h3>

            {/* Location - Compact */}
            <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3 text-gray-500">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm line-clamp-1">{listing.location.area[language]}</span>
            </div>

            {/* Property Type - Hidden on mobile to save space */}
            <div className="hidden sm:flex items-center gap-1.5 mb-3 text-gray-600">
              <Home className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{listing.propertyType}</span>
            </div>

            {/* Price Notes - Compact on mobile */}
            {listing.price.notes[language] && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 mb-2 sm:mb-3">
                <p className="text-[10px] sm:text-xs text-green-700 font-medium line-clamp-1">
                  💰 {listing.price.notes[language]}
                </p>
              </div>
            )}

            {/* Tags - Smaller on mobile */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
              {listing.tags.slice(0, 3).map((tag, i) => (
                <Badge 
                  key={i} 
                  variant="outline"
                  className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0.5 rounded-full border ${tagColors[i % tagColors.length]}`}
                >
                  {tag[language]}
                </Badge>
              ))}
              {listing.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border-gray-200">
                  +{listing.tags.length - 3}
                </Badge>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Admin Mode Buttons - Only visible with ?admin=true */}
            {isAdminMode && isAdmin && (
              <div className="flex gap-2 mb-2">
                {/* Source Link Button */}
                {listing.sourceLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(listing.sourceLink, '_blank');
                    }}
                    className="flex-1 h-8 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    🔗 Source Link
                  </Button>
                )}
                {/* Delete Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm(language === 'cn' ? '确定要删除这个房源吗？此操作不可撤销。' : 'Are you sure you want to delete this listing? This action cannot be undone.')) {
                      // Check if it's a Supabase listing (UUID format)
                      const isSupabaseListing = listing.id.includes('-') && listing.id.length > 30;
                      if (isSupabaseListing) {
                        const success = await deleteSupabaseListing(listing.id);
                        if (success) {
                          toast.success(language === 'cn' ? '房源已从数据库删除' : 'Listing deleted from database');
                        } else {
                          toast.error(language === 'cn' ? '删除失败' : 'Failed to delete');
                        }
                      } else {
                        deleteListing(listing.id);
                        toast.success(language === 'cn' ? '房源已删除' : 'Listing deleted');
                      }
                    }
                  }}
                  className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 px-3"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  🗑️ Delete
                </Button>
              </div>
            )}

            {/* Contact Button - Smaller on mobile */}
            <Button 
              onClick={handleContact}
              className="w-full h-9 sm:h-11 rounded-lg sm:rounded-xl btn-warm text-white font-medium text-xs sm:text-sm gap-1.5 sm:gap-2"
            >
              {language === "cn" ? (
                <>
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  加微信联系
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Contact Host
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header with Image Carousel */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                {(listing.images && listing.images.length > 0) || listing.imageUrl ? (
                  <ImageCarousel
                    images={listing.images && listing.images.length > 0 ? listing.images : (listing.imageUrl ? [listing.imageUrl] : [])}
                    alt={listing.title[language]}
                    className="w-full h-full"
                    aspectRatio="auto"
                    showDots={true}
                    showArrows={true}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                    <Home className="w-20 h-20 text-primary/30" />
                  </div>
                )}
                
                {/* Close Button */}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>

                {/* Price Badge */}
                <div className="absolute bottom-4 left-4">
                  <div className="bg-primary text-white rounded-xl px-5 py-3 shadow-lg">
                    <span className="text-2xl font-bold">${listing.price.amount}</span>
                    <span className="text-sm opacity-90">/{language === "cn" ? "月" : "mo"}</span>
                  </div>
                </div>

                {/* Urgent Badge */}
                {isUrgent && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-red-500 text-white border-0 px-4 py-2 text-sm font-bold shadow-lg">
                      🔥 {language === "cn" ? "急转" : "Urgent"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Modal Content */}
              <div className="p-6 sm:p-8">
                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                  {listing.title[language]}
                </h2>

                {/* Location & Property Type */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>{listing.location.area[language]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Home className="w-5 h-5 text-primary" />
                    <span>{listing.propertyType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>{availabilityDisplay}</span>
                  </div>
                </div>

                {/* Price Notes */}
                {listing.price.notes[language] && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
                    <p className="text-sm text-green-700 font-medium">
                      💰 {listing.price.notes[language]}
                    </p>
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {language === "cn" ? "房源描述" : "Description"}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {listing.description[language]}
                  </p>
                </div>

                {/* Amenities */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {language === "cn" ? "设施配套" : "Amenities"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {defaultAmenities.map((amenity) => (
                      <div 
                        key={amenity.key}
                        className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                      >
                        {amenityIcons[amenity.key] || <Check className="w-4 h-4" />}
                        <span className="text-sm text-gray-700">{amenity[language]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {language === "cn" ? "标签" : "Tags"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.map((tag, i) => (
                      <Badge 
                        key={i} 
                        variant="outline"
                        className={`text-sm font-medium px-3 py-1 rounded-full border ${tagColors[i % tagColors.length]}`}
                      >
                        {tag[language]}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Contact Button */}
                <Button 
                  onClick={() => {
                    setShowDetailModal(false);
                    setTimeout(() => handleContact(), 100);
                  }}
                  className="w-full h-14 rounded-xl btn-warm text-white font-semibold text-base gap-2"
                >
                  {language === "cn" ? (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      加微信联系房东
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Contact Host
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  {language === "cn" ? t("contact.wechatTitle") : t("contact.emailTitle")}
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Contact Info */}
              {language === "cn" ? (
                // Chinese mode - Show WeChat
                <div className="space-y-4">
                  {listing.contact?.wechat ? (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div className="text-2xl mb-2">💬</div>
                        <p className="text-sm text-gray-500 mb-2">房东微信号</p>
                        <p className="text-xl font-bold text-gray-900">{listing.contact.wechat}</p>
                      </div>
                      <Button
                        onClick={() => handleCopy(listing.contact?.wechat || "")}
                        className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-5 h-5" />
                            已复制！
                          </>
                        ) : (
                          <>
                            <Copy className="w-5 h-5" />
                            点击复制微信号
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>{t("contact.noWechat")}</p>
                    </div>
                  )}
                </div>
              ) : (
                // English mode - Show Email
                <div className="space-y-4">
                  {listing.contact?.email ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <div className="text-2xl mb-2">📧</div>
                        <p className="text-sm text-gray-500 mb-2">Host Email</p>
                        <p className="text-lg font-bold text-gray-900 break-all">{listing.contact.email}</p>
                      </div>
                      <Button
                        onClick={() => handleCopy(listing.contact?.email || "")}
                        className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-5 h-5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-5 h-5" />
                            Copy Email
                          </>
                        )}
                      </Button>
                      <a
                        href={`mailto:${listing.contact.email}`}
                        className="block w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-xl font-medium gap-2"
                        >
                          <Mail className="w-5 h-5" />
                          Open Email App
                        </Button>
                      </a>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>{t("contact.noEmail")}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
