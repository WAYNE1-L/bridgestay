import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { adaptDbRowToSublet } from "@/lib/subletAdapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bed,
  Bath,
  CalendarDays,
  MapPin,
  Loader2,
  Edit,
  Trash2,
  CheckCircle,
  ImageIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface EditFormValues {
  title: string;
  monthlyRent: string;
  address: string;
  city: string;
  state: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  subleaseEndDate: string;
  wechatContact: string;
}

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const isCn = language === "cn";
  const utils = trpc.useUtils();

  const [editListingId, setEditListingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormValues>({
    title: "",
    monthlyRent: "",
    address: "",
    city: "",
    state: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    subleaseEndDate: "",
    wechatContact: "",
  });

  const [rentedConfirmId, setRentedConfirmId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: rawListings, isLoading: listingsLoading } = trpc.apartments.myListings.useQuery(
    undefined,
    { enabled: Boolean(user) }
  );

  const updateMutation = trpc.apartments.update.useMutation({
    onSuccess: async () => {
      await utils.apartments.myListings.invalidate();
      setEditListingId(null);
      toast.success(isCn ? "房源已更新" : "Listing updated");
    },
    onError: () => {
      toast.error(isCn ? "更新失败，请重试" : "Update failed, please try again");
    },
  });

  const markRentedMutation = trpc.apartments.markRented.useMutation({
    onSuccess: async () => {
      await utils.apartments.myListings.invalidate();
      setRentedConfirmId(null);
      toast.success(isCn ? "已标记为已出租" : "Marked as rented");
    },
    onError: () => {
      toast.error(isCn ? "操作失败，请重试" : "Operation failed, please try again");
    },
  });

  const deleteMutation = trpc.apartments.delete.useMutation({
    onSuccess: async () => {
      await utils.apartments.myListings.invalidate();
      setDeleteConfirmId(null);
      toast.success(isCn ? "房源已删除" : "Listing deleted");
    },
    onError: () => {
      toast.error(isCn ? "删除失败，请重试" : "Delete failed, please try again");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar />
        <main className="container pt-28 pb-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </main>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const rows = rawListings ?? [];
  const listings = rows.map((row) => ({
    adapted: adaptDbRowToSublet(row as Record<string, unknown>),
    status: typeof (row as Record<string, unknown>).status === "string"
      ? (row as Record<string, unknown>).status as string
      : "active",
    rawId: typeof (row as Record<string, unknown>).id === "number"
      ? (row as Record<string, unknown>).id as number
      : parseInt(String((row as Record<string, unknown>).id), 10),
  }));

  function openEdit(rawId: number, row: Record<string, unknown>) {
    const adapted = adaptDbRowToSublet(row);
    setEditForm({
      title: adapted.title,
      monthlyRent: String(adapted.monthlyRent),
      address: adapted.address,
      city: adapted.city,
      state: adapted.state,
      bedrooms: String(adapted.bedrooms),
      bathrooms: String(adapted.bathrooms),
      squareFeet: adapted.squareFeet != null ? String(adapted.squareFeet) : "",
      subleaseEndDate: adapted.subleaseEndDate,
      wechatContact: adapted.wechatContact ?? "",
    });
    setEditListingId(rawId);
  }

  function handleEditSubmit() {
    if (editListingId == null) return;
    updateMutation.mutate({
      id: editListingId,
      data: {
        title: editForm.title,
        monthlyRent: parseFloat(editForm.monthlyRent) || 0,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        bedrooms: parseInt(editForm.bedrooms, 10) || 0,
        bathrooms: parseFloat(editForm.bathrooms) || 0,
        squareFeet: editForm.squareFeet ? parseInt(editForm.squareFeet, 10) : undefined,
        subleaseEndDate: editForm.subleaseEndDate,
        wechatContact: editForm.wechatContact || undefined,
      },
    });
  }

  const inputCls =
    "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  const labelCls = "block text-xs font-medium text-neutral-600 mb-1";

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="container pt-28 pb-16 max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900">
            {isCn ? "我的发布" : "My Listings"}
          </h1>
          <p className="text-sm text-neutral-500">
            {isCn ? "管理你发布的转租房源。" : "Manage the sublet listings you have posted."}
          </p>
        </header>

        {listingsLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : listings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-3">
              <p className="text-base font-medium text-neutral-700">
                {isCn ? "你还没有发布任何房源" : "You have no listings yet"}
              </p>
              <Button
                variant="default"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setLocation("/sublets/post")}
              >
                {isCn ? "发布转租" : "Post a sublet"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(({ adapted: listing, status, rawId }) => (
              <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                  {listing.images?.[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex flex-col items-center justify-center gap-1.5">
                      <ImageIcon className="w-8 h-8 text-neutral-400" />
                      <p className="text-xs text-neutral-500">
                        {isCn ? "暂无图片" : "No photos"}
                      </p>
                    </div>
                  )}
                </div>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900 leading-snug line-clamp-2">
                        {isCn && listing.titleZh ? listing.titleZh : listing.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-neutral-500 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {listing.address}
                      </p>
                    </div>
                    {status === "archived" ? (
                      <Badge variant="outline" className="shrink-0 text-green-700 border-green-200 bg-green-50">
                        {isCn ? "已出租" : "Rented"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-emerald-700 border-emerald-200 bg-emerald-50">
                        {isCn ? "已发布" : "Active"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tabular-nums text-neutral-900">
                      {fmtUsd(listing.monthlyRent)}
                    </span>
                    <span className="text-xs text-neutral-500">{isCn ? "/月" : "/mo"}</span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-700">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Bed className="w-4 h-4 text-neutral-400" />
                      {listing.bedrooms === 0
                        ? isCn ? "单间" : "Studio"
                        : `${listing.bedrooms} ${isCn ? "卧" : "bed"}`}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Bath className="w-4 h-4 text-neutral-400" />
                      {listing.bathrooms} {isCn ? "卫" : "bath"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 bg-neutral-50 rounded px-3 py-2">
                    <CalendarDays className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>
                      {fmtDate(listing.availableFrom)} → <span className="font-semibold">{fmtDate(listing.subleaseEndDate)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(rawId, rows.find((_, i) => listings[i].rawId === rawId) as Record<string, unknown>)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      {isCn ? "编辑" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={status === "archived"}
                      onClick={() => setRentedConfirmId(rawId)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      {isCn ? "标为已租" : "Mark as rented"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => setDeleteConfirmId(rawId)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={editListingId !== null} onOpenChange={(open) => { if (!open) setEditListingId(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCn ? "编辑房源" : "Edit Listing"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>{isCn ? "标题" : "Title"}</label>
              <input
                className={inputCls}
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "月租 (USD)" : "Monthly Rent (USD)"}</label>
              <input
                type="number"
                className={inputCls}
                value={editForm.monthlyRent}
                onChange={(e) => setEditForm((f) => ({ ...f, monthlyRent: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "转租截止日期" : "Sublease End Date"}</label>
              <input
                type="date"
                className={inputCls}
                value={editForm.subleaseEndDate}
                onChange={(e) => setEditForm((f) => ({ ...f, subleaseEndDate: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{isCn ? "地址" : "Address"}</label>
              <input
                className={inputCls}
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "城市" : "City"}</label>
              <input
                className={inputCls}
                value={editForm.city}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "州" : "State"}</label>
              <input
                className={inputCls}
                value={editForm.state}
                onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "卧室数" : "Bedrooms"}</label>
              <input
                type="number"
                className={inputCls}
                value={editForm.bedrooms}
                onChange={(e) => setEditForm((f) => ({ ...f, bedrooms: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "卫浴数" : "Bathrooms"}</label>
              <input
                type="number"
                step="0.5"
                className={inputCls}
                value={editForm.bathrooms}
                onChange={(e) => setEditForm((f) => ({ ...f, bathrooms: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "面积 (sqft，可选)" : "Square Feet (optional)"}</label>
              <input
                type="number"
                className={inputCls}
                value={editForm.squareFeet}
                onChange={(e) => setEditForm((f) => ({ ...f, squareFeet: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{isCn ? "微信号（可选）" : "WeChat ID (optional)"}</label>
              <input
                className={inputCls}
                value={editForm.wechatContact}
                onChange={(e) => setEditForm((f) => ({ ...f, wechatContact: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditListingId(null)}>
              {isCn ? "取消" : "Cancel"}
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isCn ? "保存" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Rented AlertDialog */}
      <AlertDialog open={rentedConfirmId !== null} onOpenChange={(open) => { if (!open) setRentedConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCn ? "确认标记此房源为已出租？" : "Mark this listing as rented?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCn
                ? "标记后，此房源将不再显示为可租。"
                : "This listing will no longer appear as available."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRentedConfirmId(null)}>
              {isCn ? "取消" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                if (rentedConfirmId != null) {
                  markRentedMutation.mutate({ id: rentedConfirmId });
                }
              }}
            >
              {markRentedMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isCn ? "确认" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCn ? "确认删除？" : "Confirm delete?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCn
                ? "此操作不可撤销，房源将被永久删除。"
                : "This cannot be undone. The listing will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>
              {isCn ? "取消" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteConfirmId != null) {
                  deleteMutation.mutate({ id: deleteConfirmId });
                }
              }}
            >
              {deleteMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isCn ? "删除" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
