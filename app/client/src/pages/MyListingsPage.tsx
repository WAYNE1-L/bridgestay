import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { adaptDbRowToSublet } from "@/lib/subletAdapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bed,
  Bath,
  CalendarDays,
  MapPin,
  Loader2,
  Edit,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { useLocation } from "wouter";

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

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const isCn = language === "cn";

  const { data: rawListings, isLoading: listingsLoading } = trpc.apartments.myListings.useQuery(
    undefined,
    { enabled: Boolean(user) }
  );

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

  const listings = (rawListings ?? []).map((row) =>
    adaptDbRowToSublet(row as Record<string, unknown>)
  );

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
            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                  <img
                    src={`https://picsum.photos/seed/${listing.id}/640/360`}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-2 right-2 bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Demo photo
                  </span>
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
                    <Badge variant="outline" className="shrink-0 text-emerald-700 border-emerald-200 bg-emerald-50">
                      {isCn ? "已发布" : "Active"}
                    </Badge>
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
                      onClick={() => console.log("edit", listing.id)} // TODO(R8): wire mutations
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      {isCn ? "编辑" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => console.log("mark rented", listing.id)} // TODO(R8): wire mutations
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      {isCn ? "标为已租" : "Mark as rented"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => console.log("delete", listing.id)} // TODO(R8): wire mutations
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
    </div>
  );
}
