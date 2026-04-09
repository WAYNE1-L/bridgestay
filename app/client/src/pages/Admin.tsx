import { Fragment, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings, BilingualListing } from "@/contexts/ListingsContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { safeJsonArray } from "@/lib/safeJsonArray";
import { Plus, Trash2, Home, ImageIcon, DollarSign, MapPin, FileText, Tag, Shield, Pencil, X, Save, Wand2, Upload, CheckCircle2, ClipboardCheck, Building2, Eye, MessageSquare, TrendingUp, BarChart3, Star, Circle, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "wouter";
import { BridgeStayLogo } from "@/components/BridgeStayLogo";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const emptyFormData = {
  imageUrl: "",
  titleCn: "",
  titleEn: "",
  price: "",
  priceNotesCn: "",
  priceNotesEn: "",
  addressCn: "",
  addressEn: "",
  areaCn: "",
  areaEn: "",
  descCn: "",
  descEn: "",
  propertyType: "",
  tagsCn: "",
  tagsEn: "",
  availabilityStart: "",
  availabilityEnd: "",
  wechat: "",
  email: "",
  adminNotes: "", // Private admin notes - never exposed to frontend users
  status: "available" as "available" | "rented" | "hidden",
};

const emptyDbForm = {
  title: "",
  description: "",
  propertyType: "apartment" as "apartment" | "studio" | "house" | "room" | "condo" | "townhouse",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  monthlyRent: "",
  securityDeposit: "",
  bedrooms: "1",
  bathrooms: "1",
  status: "draft" as "draft" | "pending_review" | "published" | "rejected" | "archived",
  featured: false,
};

export default function Admin() {
  const [, navigate] = useLocation();
  const { t, language } = useLanguage();
  const { listings, addListing, updateListing, deleteListing } = useListings();
  const { user, isAuthenticated } = useAuth();
  
  const isAdmin = user?.role === "admin";

  // Fetch all DB apartments for real admin management
  const { data: dbApartments = [], refetch: refetchDbApartments } = trpc.apartments.adminList.useQuery({
    limit: 100,
    offset: 0,
  }, {
    enabled: isAdmin,
  });

  const {
    data: reportSummary = [],
    isLoading: isReportSummaryLoading,
    refetch: refetchReportSummary,
  } = trpc.apartments.reportSummary.useQuery(undefined, {
    enabled: isAdmin,
  });
  
  const totalListings = dbApartments.length;
  const activeListings = dbApartments.filter((a: any) => a.status === "published").length;
  
  const [formData, setFormData] = useState(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApartmentId, setEditingApartmentId] = useState<number | null>(null);
  const [selectedReportListingId, setSelectedReportListingId] = useState<number | null>(null);
  const [dbForm, setDbForm] = useState(emptyDbForm);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "pending_review" | "published" | "rejected" | "archived">("all");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: selectedListingReports = [], isLoading: areListingReportsLoading } = trpc.apartments.listReportsForListing.useQuery({
    apartmentId: selectedReportListingId ?? 0,
  }, {
    enabled: isAdmin && selectedReportListingId !== null,
  });

  const updateApartmentMutation = trpc.apartments.update.useMutation({
    onSuccess: async () => {
      await refetchDbApartments();
      setEditingApartmentId(null);
      setDbForm(emptyDbForm);
      toast.success(language === "cn" ? "房源已更新" : "Listing updated");
    },
    onError: (error) => {
      toast.error(error.message || (language === "cn" ? "更新失败" : "Update failed"));
    },
  });

  const deleteApartmentMutation = trpc.apartments.delete.useMutation({
    onSuccess: async () => {
      await refetchDbApartments();
      toast.success(language === "cn" ? "房源已删除" : "Listing deleted");
    },
    onError: (error) => {
      toast.error(error.message || (language === "cn" ? "删除失败" : "Delete failed"));
    },
  });

  const markInactiveMutation = trpc.apartments.markInactive.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchReportSummary(), refetchDbApartments()]);
      toast.success(language === "cn" ? "房源已归档" : "Listing archived");
    },
    onError: (error) => {
      toast.error(error.message || (language === "cn" ? "归档失败" : "Failed to archive listing"));
    },
  });

  const filteredDbApartments = dbApartments.filter((listing: any) => {
    if (statusFilter === "all") return true;
    return listing.status === statusFilter;
  });

  // Handle image upload with Base64 conversion
  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(language === "cn" ? "请上传图片文件" : "Please upload an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === "cn" ? "图片大小不能超过 5MB" : "Image size cannot exceed 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      setFormData((prev) => ({ ...prev, imageUrl: base64Data }));
      toast.success(language === "cn" ? "图片已上传" : "Image uploaded");
    };
    reader.onerror = () => {
      toast.error(language === "cn" ? "图片读取失败" : "Failed to read image");
    };
    reader.readAsDataURL(file);
  }, [language]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingId(null);
  };

  const handleEdit = (listing: BilingualListing) => {
    // Pre-fill form with existing data
    setFormData({
      imageUrl: listing.imageUrl || "",
      titleCn: listing.title.cn,
      titleEn: listing.title.en,
      price: listing.price.amount.toString(),
      priceNotesCn: listing.price.notes.cn,
      priceNotesEn: listing.price.notes.en,
      addressCn: listing.location.address.cn,
      addressEn: listing.location.address.en,
      areaCn: listing.location.area.cn,
      areaEn: listing.location.area.en,
      descCn: listing.description.cn,
      descEn: listing.description.en,
      propertyType: listing.propertyType,
      tagsCn: listing.tags.map(t => t.cn).join(", "),
      tagsEn: listing.tags.map(t => t.en).join(", "),
      availabilityStart: listing.availability.start || "",
      availabilityEnd: listing.availability.end || "",
      wechat: listing.contact?.wechat || "",
      email: listing.contact?.email || "",
      adminNotes: listing.adminNotes || "",
      status:
        listing.status === "rented" || listing.status === "hidden"
          ? listing.status
          : "available",
    });
    setEditingId(listing.id);
    setIsFormOpen(true);
    // Scroll to form
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse tags
    const tagsCn = formData.tagsCn.split(",").map((t) => t.trim()).filter(Boolean);
    const tagsEn = formData.tagsEn.split(",").map((t) => t.trim()).filter(Boolean);
    const tags = tagsCn.map((cn, i) => ({
      cn,
      en: tagsEn[i] || cn
    }));

    const listingData: BilingualListing = {
      id: editingId || `listing_${Date.now()}`,
      title: {
        cn: formData.titleCn,
        en: formData.titleEn || formData.titleCn
      },
      location: {
        address: {
          cn: formData.addressCn,
          en: formData.addressEn || formData.addressCn
        },
        area: {
          cn: formData.areaCn,
          en: formData.areaEn || formData.areaCn
        }
      },
      price: {
        amount: parseFloat(formData.price) || 0,
        currency: "USD",
        notes: {
          cn: formData.priceNotesCn,
          en: formData.priceNotesEn || formData.priceNotesCn
        }
      },
      propertyType: formData.propertyType,
      availability: {
        start: formData.availabilityStart || "Immediate",
        end: formData.availabilityEnd || ""
      },
      description: {
        cn: formData.descCn,
        en: formData.descEn || formData.descCn
      },
      tags,
      imageUrl: formData.imageUrl || undefined,
      contact: {
        wechat: formData.wechat || undefined,
        email: formData.email || undefined
      },
      adminNotes: formData.adminNotes || undefined,
      status: formData.status,
    };

    if (editingId) {
      updateListing(editingId, listingData);
      toast.success(language === "cn" ? "房源已更新" : "Listing updated");
    } else {
      addListing(listingData);
      toast.success(t("admin.success"));
    }
    
    resetForm();
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("admin.deleteConfirm"))) {
      deleteListing(id);
      toast.success(language === "cn" ? "房源已删除" : "Listing deleted");
    }
  };

  const handleAddNew = () => {
    navigate("/admin/import");
  };

  const startDbEdit = (apartment: any) => {
    setEditingApartmentId(apartment.id);
    setDbForm({
      title: apartment.title ?? "",
      description: apartment.description ?? "",
      propertyType: apartment.propertyType ?? "apartment",
      address: apartment.address ?? "",
      city: apartment.city ?? "",
      state: apartment.state ?? "",
      zipCode: apartment.zipCode ?? "",
      monthlyRent: apartment.monthlyRent?.toString?.() ?? "",
      securityDeposit: apartment.securityDeposit?.toString?.() ?? "",
      bedrooms: apartment.bedrooms?.toString?.() ?? "1",
      bathrooms: apartment.bathrooms?.toString?.() ?? "1",
      status: apartment.status ?? "draft",
      featured: apartment.featured ?? false,
    });
  };

  const saveDbEdit = () => {
    if (!editingApartmentId) return;
    if (dbForm.title.trim().length < 5) {
      toast.error(language === "cn" ? "标题至少需要 5 个字符" : "Title must be at least 5 characters");
      return;
    }
    if (!/\d/.test(dbForm.address) || dbForm.address.trim().length < 5) {
      toast.error(language === "cn" ? "请输入有效街道地址" : "Please enter a valid street address");
      return;
    }

    updateApartmentMutation.mutate({
      id: editingApartmentId,
      data: {
        title: dbForm.title.trim(),
        description: dbForm.description.trim() || undefined,
        propertyType: dbForm.propertyType,
        address: dbForm.address.trim(),
        city: dbForm.city.trim(),
        state: dbForm.state.trim().toUpperCase(),
        zipCode: dbForm.zipCode.trim(),
        monthlyRent: Number(dbForm.monthlyRent),
        securityDeposit: Number(dbForm.securityDeposit) || 0,
        bedrooms: Number(dbForm.bedrooms),
        bathrooms: Number(dbForm.bathrooms),
        status: dbForm.status,
        featured: dbForm.featured,
      },
    });
  };

  const handleDeleteDb = (id: number) => {
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    deleteApartmentMutation.mutate({ id });
  };

  // Check if user is admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-warm-cream">
        <Navbar />
        <div className="container py-20">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">
                {language === "cn" ? "需要登录" : "Login Required"}
              </h2>
              <p className="text-gray-600">
                {language === "cn" ? "请先登录以访问管理后台" : "Please login to access the admin dashboard"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-warm-cream">
        <Navbar />
        <div className="container py-20">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">
                {language === "cn" ? "权限不足" : "Access Denied"}
              </h2>
              <p className="text-gray-600">
                {language === "cn" ? "只有管理员可以访问此页面" : "Only administrators can access this page"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      <Navbar />
      
      <main className="container py-12">
        <motion.div {...fadeInUp}>
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">欢迎回来，管理员</h1>
                <p className="text-gray-600">超级管理员后台 · 管理全站房源</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/import">
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-xl font-medium border-primary text-primary hover:bg-primary/5"
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  AI 房源导入
                </Button>
              </Link>
              <Link href="/admin/review">
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-xl font-medium border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  <ClipboardCheck className="w-5 h-5 mr-2" />
                  审核队列
                </Button>
              </Link>
              {!isFormOpen && (
                <Button
                  onClick={handleAddNew}
                  className="h-12 px-6 rounded-xl btn-warm text-white font-medium"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  录入新房源
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalListings}</p>
                    <p className="text-sm text-gray-500">房源总数</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{activeListings}</p>
                    <p className="text-sm text-gray-500">已发布</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-500">待处理咨询</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                    <p className="text-sm text-gray-500">全站浏览量</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mb-8">
            <Link href="/apartments">
              <Button variant="outline" className="h-10 px-4 rounded-xl">
                <BarChart3 className="w-4 h-4 mr-2" />
                数据概览
              </Button>
            </Link>
          </div>

          <Card className="border-0 shadow-soft mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {language === "cn" ? "房源举报汇总" : "Listing Report Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isReportSummaryLoading ? (
                <div className="py-6 text-sm text-gray-500">
                  {language === "cn" ? "正在加载举报汇总..." : "Loading report summary..."}
                </div>
              ) : reportSummary.length === 0 ? (
                <div className="py-6 text-sm text-gray-500">
                  {language === "cn" ? "暂无举报记录" : "No reports yet"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4 font-medium">{language === "cn" ? "房源" : "Listing"}</th>
                        <th className="py-2 pr-4 font-medium">{language === "cn" ? "总数" : "Total"}</th>
                        <th className="py-2 pr-4 font-medium">{language === "cn" ? "原因" : "Reasons"}</th>
                        <th className="py-2 pr-4 font-medium">{language === "cn" ? "最新备注" : "Latest notes"}</th>
                        <th className="py-2 pr-4 font-medium">{language === "cn" ? "最新举报" : "Latest"}</th>
                        <th className="py-2 font-medium">{language === "cn" ? "操作" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportSummary.map((item) => (
                        <Fragment key={item.apartmentId}>
                          <tr key={item.apartmentId} className="border-b last:border-0">
                            <td className="py-3 pr-4">
                              <div className="font-medium text-gray-900">{item.title}</div>
                              <div className="text-xs text-gray-500">#{item.apartmentId} · {item.status}</div>
                            </td>
                            <td className="py-3 pr-4 font-semibold text-gray-900">{item.totalCount}</td>
                            <td className="py-3 pr-4 text-gray-600">
                              unavailable {item.byReason.unavailable} · wrong_details {item.byReason.wrong_details} · suspicious {item.byReason.suspicious} · other {item.byReason.other}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              <div className="max-w-[220px] truncate" title={item.latestReportNotes ?? ""}>
                                {item.latestReportNotes?.trim() || "—"}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {item.latestReportAt ? new Date(item.latestReportAt).toLocaleString() : "—"}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedReportListingId(
                                    selectedReportListingId === item.apartmentId ? null : item.apartmentId
                                  )}
                                >
                                  {selectedReportListingId === item.apartmentId
                                    ? (language === "cn" ? "收起" : "Hide reports")
                                    : (language === "cn" ? "查看举报" : "View reports")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={item.status === "archived" || markInactiveMutation.isPending}
                                  onClick={() => markInactiveMutation.mutate({ id: item.apartmentId })}
                                >
                                  {item.status === "archived"
                                    ? (language === "cn" ? "已归档" : "Archived")
                                    : (language === "cn" ? "归档" : "Archive")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {selectedReportListingId === item.apartmentId && (
                            <tr className="border-b bg-gray-50">
                              <td colSpan={6} className="p-4">
                                {areListingReportsLoading ? (
                                  <div className="text-sm text-gray-500">
                                    {language === "cn" ? "正在加载举报..." : "Loading reports..."}
                                  </div>
                                ) : selectedListingReports.length === 0 ? (
                                  <div className="text-sm text-gray-500">
                                    {language === "cn" ? "暂无举报详情" : "No report details"}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {selectedListingReports.map((report) => (
                                      <div key={report.id} className="rounded-md border bg-white p-3">
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                          <span>#{report.id}</span>
                                          <span>{report.reason}</span>
                                          <span>{report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}</span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                                          {report.notes?.trim() || "—"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Add/Edit Listing Form */}
            {isFormOpen && (
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {editingId ? (
                        <>
                          <Pencil className="w-5 h-5 text-primary" />
                          编辑房源
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 text-primary" />
                          录入新房源
                        </>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {language === "cn" ? "上传房源图片" : "Upload Listing Image"}
                      </Label>
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                      />
                      
                      {formData.imageUrl ? (
                        /* Show image preview */
                        <div className="relative">
                          <img
                            src={formData.imageUrl}
                            alt="Listing preview"
                            className="w-full h-40 object-cover rounded-xl border border-border"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => imageInputRef.current?.click()}
                              className="bg-white/90 hover:bg-white"
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              {language === "cn" ? "更换" : "Change"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                              className="bg-red-500/90 hover:bg-red-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          {formData.imageUrl.startsWith("data:") && (
                            <div className="absolute bottom-2 left-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {language === "cn" ? "已上传" : "Uploaded"}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Show upload button */
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-700">
                            {language === "cn" ? "点击上传房源图片" : "Click to upload listing image"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {language === "cn" ? "支持 JPG, PNG, WebP，最大 5MB" : "Supports JPG, PNG, WebP, max 5MB"}
                          </p>
                        </div>
                      )}
                      
                      {/* Fallback: Manual URL input */}
                      <div className="pt-2">
                        <Label className="text-xs text-gray-500">
                          {language === "cn" ? "或输入图片路径" : "Or enter image path"}
                        </Label>
                        <Input
                          name="imageUrl"
                          value={formData.imageUrl.startsWith("data:") ? "" : formData.imageUrl}
                          onChange={handleInputChange}
                          placeholder="/images/house1.jpg"
                          className="h-10 rounded-lg mt-1"
                        />
                      </div>
                    </div>

                    {/* Bilingual Title */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("admin.titleCn")} *</Label>
                        <Input
                          name="titleCn"
                          value={formData.titleCn}
                          onChange={handleInputChange}
                          required
                          className="h-12 rounded-xl"
                          placeholder="盐湖城 1B1B 公寓转租"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.titleEn")}</Label>
                        <Input
                          name="titleEn"
                          value={formData.titleEn}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="Salt Lake City 1B1B Sublease"
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {t("admin.price")} *
                      </Label>
                      <Input
                        name="price"
                        type="number"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-xl"
                        placeholder="1500"
                      />
                    </div>

                    {/* Price Notes */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("admin.priceNotesCn")}</Label>
                        <Input
                          name="priceNotesCn"
                          value={formData.priceNotesCn}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="首月优惠$300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.priceNotesEn")}</Label>
                        <Input
                          name="priceNotesEn"
                          value={formData.priceNotesEn}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="$300 off first month"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {t("admin.addressCn")} *
                      </Label>
                      <Input
                        name="addressCn"
                        value={formData.addressCn}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-xl"
                        placeholder="123 Main St, Salt Lake City, UT"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.addressEn")}</Label>
                      <Input
                        name="addressEn"
                        value={formData.addressEn}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl"
                        placeholder="123 Main St, Salt Lake City, UT"
                      />
                    </div>

                    {/* Area */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("admin.areaCn")} *</Label>
                        <Input
                          name="areaCn"
                          value={formData.areaCn}
                          onChange={handleInputChange}
                          required
                          className="h-12 rounded-xl"
                          placeholder="市中心"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("admin.areaEn")}</Label>
                        <Input
                          name="areaEn"
                          value={formData.areaEn}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="Downtown"
                        />
                      </div>
                    </div>

                    {/* Property Type */}
                    <div className="space-y-2">
                      <Label>{t("admin.propertyType")} *</Label>
                      <Input
                        name="propertyType"
                        value={formData.propertyType}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-xl"
                        placeholder="1B1B / 2B2B / Studio"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t("admin.descCn")}
                      </Label>
                      <Textarea
                        name="descCn"
                        value={formData.descCn}
                        onChange={handleInputChange}
                        className="rounded-xl min-h-[100px]"
                        placeholder="房源描述..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("admin.descEn")}</Label>
                      <Textarea
                        name="descEn"
                        value={formData.descEn}
                        onChange={handleInputChange}
                        className="rounded-xl min-h-[100px]"
                        placeholder="Property description..."
                      />
                    </div>

                    {/* Tags */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          {language === "cn" ? "中文标签" : "Chinese Tags"}
                        </Label>
                        <Input
                          name="tagsCn"
                          value={formData.tagsCn}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="急转租, 滑雪, 可养宠物"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "英文标签" : "English Tags"}</Label>
                        <Input
                          name="tagsEn"
                          value={formData.tagsEn}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="Urgent, Skiing, Pet-friendly"
                        />
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "开始日期" : "Start Date"}</Label>
                        <Input
                          name="availabilityStart"
                          type="date"
                          value={formData.availabilityStart}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "结束日期" : "End Date"}</Label>
                        <Input
                          name="availabilityEnd"
                          type="date"
                          value={formData.availabilityEnd}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "微信号" : "WeChat ID"}</Label>
                        <Input
                          name="wechat"
                          value={formData.wechat}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="wx_id_123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "邮箱" : "Email"}</Label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="h-12 rounded-xl"
                          placeholder="host@email.com"
                        />
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="space-y-2">
                      <Label>{language === "cn" ? "房源状态" : "Listing Status"}</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: "available" | "rented" | "hidden") => 
                          setFormData((prev) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">
                            <span className="flex items-center gap-2">
                              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                              {language === "cn" ? "招租中" : "Available"}
                            </span>
                          </SelectItem>
                          <SelectItem value="rented">
                            <span className="flex items-center gap-2">
                              <Circle className="w-2 h-2 fill-gray-500 text-gray-500" />
                              {language === "cn" ? "已出租" : "Rented"}
                            </span>
                          </SelectItem>
                          <SelectItem value="hidden">
                            <span className="flex items-center gap-2">
                              <EyeOff className="w-3 h-3 text-red-500" />
                              {language === "cn" ? "已下架" : "Hidden"}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Admin Notes - Private, never exposed to users */}
                    <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <Label className="flex items-center gap-2 text-yellow-800">
                        <Shield className="w-4 h-4" />
                        {language === "cn" ? "内部备注 (仅管理员可见)" : "Private Admin Notes"}
                      </Label>
                      <Textarea
                        name="adminNotes"
                        value={formData.adminNotes}
                        onChange={handleInputChange}
                        className="min-h-[100px] rounded-xl bg-white"
                        placeholder={language === "cn" 
                          ? "记录房东真实微信、底价、注意事项等敏感信息..."
                          : "Record landlord's real WeChat, base price, notes..."
                        }
                      />
                      <p className="text-xs text-yellow-700">
                        {language === "cn" 
                          ? "ℹ️ 此备注仅在管理后台可见，不会在前端页面或 JSON 中暴露"
                          : "ℹ️ This note is only visible in admin dashboard, never exposed to frontend or JSON"
                        }
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-14 rounded-xl btn-warm text-white font-medium"
                    >
                      {editingId ? (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          {language === "cn" ? "保存修改" : "Save Changes"}
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 mr-2" />
                          {t("admin.submit")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Existing Listings */}
            <Card className={`border-0 shadow-soft ${!isFormOpen ? "lg:col-span-2" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" />
                  {language === "cn" ? "数据库房源管理" : "Database Listings"}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({filteredDbApartments.length} {language === "cn" ? "条房源" : "listings"})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">
                    {language === "cn" ? "按状态筛选" : "Filter by status"}
                  </span>
                  <Select
                    value={statusFilter}
                    onValueChange={(value: "all" | "draft" | "pending_review" | "published" | "rejected" | "archived") =>
                      setStatusFilter(value)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "cn" ? "全部状态" : "All statuses"}</SelectItem>
                      <SelectItem value="draft">{language === "cn" ? "草稿" : "Draft"}</SelectItem>
                      <SelectItem value="pending_review">{language === "cn" ? "待审核" : "Pending review"}</SelectItem>
                      <SelectItem value="published">{language === "cn" ? "已发布" : "Published"}</SelectItem>
                      <SelectItem value="rejected">{language === "cn" ? "已拒绝" : "Rejected"}</SelectItem>
                      <SelectItem value="archived">{language === "cn" ? "已归档" : "Archived"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingApartmentId && (
                  <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {language === "cn" ? "编辑数据库房源" : "Edit DB Listing"}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingApartmentId(null);
                          setDbForm(emptyDbForm);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input value={dbForm.title} onChange={(e) => setDbForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Listing title" />
                      <Select value={dbForm.propertyType} onValueChange={(value: any) => setDbForm((prev) => ({ ...prev, propertyType: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="room">Room</SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={dbForm.address} onChange={(e) => setDbForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="123 Main St" />
                      <Input value={dbForm.city} onChange={(e) => setDbForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="City" />
                      <Input value={dbForm.state} onChange={(e) => setDbForm((prev) => ({ ...prev, state: e.target.value }))} placeholder="UT" maxLength={2} />
                      <Input value={dbForm.zipCode} onChange={(e) => setDbForm((prev) => ({ ...prev, zipCode: e.target.value }))} placeholder="84102" />
                      <Input type="number" value={dbForm.monthlyRent} onChange={(e) => setDbForm((prev) => ({ ...prev, monthlyRent: e.target.value }))} placeholder="1450" />
                      <Input type="number" value={dbForm.securityDeposit} onChange={(e) => setDbForm((prev) => ({ ...prev, securityDeposit: e.target.value }))} placeholder="500" />
                      <Input type="number" value={dbForm.bedrooms} onChange={(e) => setDbForm((prev) => ({ ...prev, bedrooms: e.target.value }))} placeholder="2" />
                      <Input type="number" value={dbForm.bathrooms} onChange={(e) => setDbForm((prev) => ({ ...prev, bathrooms: e.target.value }))} placeholder="2" />
                          <Select value={dbForm.status} onValueChange={(value: any) => setDbForm((prev) => ({ ...prev, status: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending_review">Pending review</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                      <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                        <span className="text-sm text-gray-600">{language === "cn" ? "精选推荐" : "Featured"}</span>
                        <Switch checked={dbForm.featured} onCheckedChange={(checked) => setDbForm((prev) => ({ ...prev, featured: checked }))} />
                      </div>
                    </div>
                    <Textarea value={dbForm.description} onChange={(e) => setDbForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" />
                    <Button onClick={saveDbEdit} disabled={updateApartmentMutation.isPending} className="w-full">
                      {updateApartmentMutation.isPending ? (language === "cn" ? "保存中..." : "Saving...") : (language === "cn" ? "保存数据库修改" : "Save DB Changes")}
                    </Button>
                  </div>
                )}

                {filteredDbApartments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {language === "cn" ? "暂无数据库房源" : "No database listings yet"}
                  </div>
                ) : (
                  <div className={`grid gap-4 ${!isFormOpen ? "md:grid-cols-2 lg:grid-cols-3" : ""} max-h-[600px] overflow-y-auto pr-2`}>
                    {filteredDbApartments.map((listing: any) => (
                      <div
                        key={listing.id}
                        className={`p-4 rounded-xl transition-colors ${
                          listing.status === 'archived' ? 'bg-gray-100 opacity-60' :
                          listing.status === 'rejected' ? 'bg-red-50' :
                          'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {/* Status Badge */}
                        {listing.status === 'published' && (
                          <div className="mb-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500 text-white">
                              {language === "cn" ? "已发布" : "Published"}
                            </span>
                          </div>
                        )}
                        {listing.status === 'pending_review' && (
                          <div className="mb-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-500 text-white">
                              {language === "cn" ? "待审核" : "Pending review"}
                            </span>
                          </div>
                        )}
                        {listing.status === 'rejected' && (
                          <div className="mb-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500 text-white">
                              {language === "cn" ? "已拒绝" : "Rejected"}
                            </span>
                          </div>
                        )}
                        {listing.status === 'archived' && (
                          <div className="mb-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500 text-white">
                              {language === "cn" ? "已归档" : "Archived"}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {listing.title}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {listing.address}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-primary font-bold">
                                ${Number(listing.monthlyRent).toLocaleString()}
                              </span>
                              <span className="text-gray-500 text-sm">
                                {language === "cn" ? "/月" : "/mo"}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startDbEdit(listing)}
                              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-blue-200"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDb(listing.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                              disabled={deleteApartmentMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Admin Controls */}
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          {/* Featured Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Star className={`w-4 h-4 ${listing.isFeatured ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                              <span className="text-sm text-gray-600">精选推荐</span>
                            </div>
                            <Switch
                              checked={listing.featured || false}
                              onCheckedChange={(checked) => {
                                updateApartmentMutation.mutate({
                                  id: listing.id,
                                  data: { featured: checked },
                                });
                              }}
                              className="data-[state=checked]:bg-yellow-500"
                            />
                          </div>
                          
                          {/* Status Dropdown */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">状态</span>
                            <Select
                              value={listing.status || 'draft'}
                              onValueChange={(value: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived') => {
                                updateApartmentMutation.mutate({
                                  id: listing.id,
                                  data: { status: value },
                                });
                              }}
                            >
                              <SelectTrigger className="w-28 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="published">
                                  <span className="flex items-center gap-1.5">
                                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                                    {language === "cn" ? "已发布" : "Published"}
                                  </span>
                                </SelectItem>
                                <SelectItem value="draft">
                                  <span className="flex items-center gap-1.5">
                                    <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />
                                    {language === "cn" ? "草稿" : "Draft"}
                                  </span>
                                </SelectItem>
                                <SelectItem value="pending_review">
                                  <span className="flex items-center gap-1.5">
                                    <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                                    {language === "cn" ? "待审核" : "Pending review"}
                                  </span>
                                </SelectItem>
                                <SelectItem value="rejected">
                                  <span className="flex items-center gap-1.5">
                                    <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                                    {language === "cn" ? "已拒绝" : "Rejected"}
                                  </span>
                                </SelectItem>
                                <SelectItem value="archived">
                                  <span className="flex items-center gap-1.5">
                                    <EyeOff className="w-3 h-3 text-gray-500" />
                                    {language === "cn" ? "已归档" : "Archived"}
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => updateApartmentMutation.mutate({
                                id: listing.id,
                                data: { status: "published" },
                              })}
                              disabled={listing.status === "published" || updateApartmentMutation.isPending}
                            >
                              {language === "cn" ? "发布" : "Publish"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => updateApartmentMutation.mutate({
                                id: listing.id,
                                data: { status: "archived" },
                              })}
                              disabled={listing.status === "archived" || updateApartmentMutation.isPending}
                            >
                              {language === "cn" ? "归档" : "Archive"}
                            </Button>
                          </div>
                        </div>
                        
                        {(() => {
                          const amenities = safeJsonArray(listing.amenities);

                          if (amenities.length === 0) return null;

                          return (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {amenities.slice(0, 4).map((amenity: string, i: number) => (
                                <span
                                  key={`${listing.id}-${i}`}
                                  className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700"
                                >
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 bg-white mt-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <BridgeStayLogo size="sm" />
            <p className="text-sm text-gray-500">
              {t("footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
