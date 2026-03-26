import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings, BilingualListing, ReviewStatus } from "@/contexts/ListingsContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ImageCarousel } from "@/components/ImageCarousel";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Home,
  MapPin,
  Calendar,
  DollarSign,
  User,
  MessageSquare,
  Filter,
  Search,
} from "lucide-react";
import { toast } from "sonner";

type FilterType = "all" | "pending" | "approved" | "rejected";

export default function AdminReview() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { listings, updateListing } = useListings();
  const [filter, setFilter] = useState<FilterType>("pending");
  const [selectedListing, setSelectedListing] = useState<BilingualListing | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {language === "cn" ? "权限不足" : "Access Denied"}
          </h1>
          <p className="text-gray-600">
            {language === "cn" ? "只有管理员可以访问审核页面" : "Only admins can access the review page"}
          </p>
        </div>
      </div>
    );
  }

  // Filter listings based on review status
  const filteredListings = listings.filter((listing) => {
    if (filter === "all") return true;
    return listing.reviewStatus === filter;
  });

  // Count by status
  const counts = {
    all: listings.length,
    pending: listings.filter((l) => l.reviewStatus === "pending").length,
    approved: listings.filter((l) => l.reviewStatus === "approved").length,
    rejected: listings.filter((l) => l.reviewStatus === "rejected").length,
  };

  const handleApprove = (listing: BilingualListing) => {
    updateListing(listing.id, {
      reviewStatus: "approved",
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    });
    toast.success(language === "cn" ? "房源已通过审核" : "Listing approved");
    setSelectedListing(null);
  };

  const handleReject = (listing: BilingualListing) => {
    if (!rejectionReason.trim()) {
      toast.error(language === "cn" ? "请填写拒绝原因" : "Please provide a rejection reason");
      return;
    }
    updateListing(listing.id, {
      reviewStatus: "rejected",
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
      rejectionReason: rejectionReason,
    });
    toast.success(language === "cn" ? "房源已拒绝" : "Listing rejected");
    setShowRejectModal(false);
    setRejectionReason("");
    setSelectedListing(null);
  };

  const getStatusBadge = (status?: ReviewStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            {language === "cn" ? "待审核" : "Pending"}
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {language === "cn" ? "已通过" : "Approved"}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {language === "cn" ? "已拒绝" : "Rejected"}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            {language === "cn" ? "未知" : "Unknown"}
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {language === "cn" ? "房源审核" : "Listing Review"}
          </h1>
          <p className="text-gray-600">
            {language === "cn"
              ? "审核用户提交的房源，确保信息真实有效"
              : "Review user-submitted listings to ensure accuracy and validity"}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(["pending", "all", "approved", "rejected"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="whitespace-nowrap"
            >
              {f === "pending" && <Clock className="w-4 h-4 mr-1" />}
              {f === "approved" && <CheckCircle2 className="w-4 h-4 mr-1" />}
              {f === "rejected" && <XCircle className="w-4 h-4 mr-1" />}
              {f === "all" && <Filter className="w-4 h-4 mr-1" />}
              {f === "pending" && (language === "cn" ? "待审核" : "Pending")}
              {f === "all" && (language === "cn" ? "全部" : "All")}
              {f === "approved" && (language === "cn" ? "已通过" : "Approved")}
              {f === "rejected" && (language === "cn" ? "已拒绝" : "Rejected")}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                {counts[f]}
              </span>
            </Button>
          ))}
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {language === "cn" ? "暂无房源" : "No listings found"}
            </h3>
            <p className="text-gray-500">
              {language === "cn"
                ? "当前筛选条件下没有房源"
                : "No listings match the current filter"}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Image */}
                  <div className="relative aspect-video bg-gray-100">
                    {(listing.images && listing.images.length > 0) || listing.imageUrl ? (
                      <ImageCarousel
                        images={
                          listing.images && listing.images.length > 0
                            ? listing.images
                            : listing.imageUrl
                            ? [listing.imageUrl]
                            : []
                        }
                        alt={listing.title[language]}
                        className="w-full h-full"
                        aspectRatio="auto"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">{getStatusBadge(listing.reviewStatus)}</div>
                  </div>

                  <CardContent className="p-4">
                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {listing.title[language]}
                    </h3>

                    {/* Info */}
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="line-clamp-1">{listing.location.area[language]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-primary">${listing.price.amount}/月</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedListing(listing)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {language === "cn" ? "查看详情" : "View"}
                      </Button>
                      {listing.reviewStatus === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => handleApprove(listing)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedListing(listing);
                              setShowRejectModal(true);
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedListing && !showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedListing(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="relative aspect-video">
                {(selectedListing.images && selectedListing.images.length > 0) ||
                selectedListing.imageUrl ? (
                  <ImageCarousel
                    images={
                      selectedListing.images && selectedListing.images.length > 0
                        ? selectedListing.images
                        : selectedListing.imageUrl
                        ? [selectedListing.imageUrl]
                        : []
                    }
                    alt={selectedListing.title[language]}
                    className="w-full h-full"
                    aspectRatio="auto"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Home className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  {getStatusBadge(selectedListing.reviewStatus)}
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {selectedListing.title[language]}
                </h2>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      {language === "cn" ? "价格" : "Price"}
                    </h4>
                    <p className="text-2xl font-bold text-primary">
                      ${selectedListing.price.amount}/月
                    </p>
                    <p className="text-sm text-gray-500">{selectedListing.price.notes[language]}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      {language === "cn" ? "位置" : "Location"}
                    </h4>
                    <p className="text-gray-600">{selectedListing.location.address[language]}</p>
                    <p className="text-sm text-gray-500">{selectedListing.location.area[language]}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      {language === "cn" ? "描述" : "Description"}
                    </h4>
                    <p className="text-gray-600">{selectedListing.description[language]}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      {language === "cn" ? "联系方式" : "Contact"}
                    </h4>
                    <p className="text-gray-600">
                      WeChat: {selectedListing.contact.wechat || "N/A"}
                    </p>
                    <p className="text-gray-600">Email: {selectedListing.contact.email || "N/A"}</p>
                  </div>

                  {selectedListing.rejectionReason && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-700 mb-1">
                        {language === "cn" ? "拒绝原因" : "Rejection Reason"}
                      </h4>
                      <p className="text-red-600">{selectedListing.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedListing(null)} className="flex-1">
                    {language === "cn" ? "关闭" : "Close"}
                  </Button>
                  {selectedListing.reviewStatus === "pending" && (
                    <>
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => handleApprove(selectedListing)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {language === "cn" ? "通过" : "Approve"}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setShowRejectModal(true)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {language === "cn" ? "拒绝" : "Reject"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {language === "cn" ? "拒绝房源" : "Reject Listing"}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === "cn"
                  ? "请填写拒绝原因，用户将收到通知"
                  : "Please provide a reason for rejection. The user will be notified."}
              </p>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={
                  language === "cn"
                    ? "例如：图片不清晰、信息不完整、价格不合理..."
                    : "e.g., Blurry images, incomplete information, unreasonable price..."
                }
                className="mb-4"
                rows={4}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                  className="flex-1"
                >
                  {language === "cn" ? "取消" : "Cancel"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedListing)}
                  className="flex-1"
                >
                  {language === "cn" ? "确认拒绝" : "Confirm Reject"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
