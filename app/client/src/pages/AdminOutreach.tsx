import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart3,
} from "lucide-react";

type OutreachStatus = "not_contacted" | "contacted" | "in_conversation" | "partnered" | "declined" | "expired";

const COLUMNS: { key: OutreachStatus; label: string; color: string; bg: string; border: string }[] = [
  { key: "not_contacted", label: "\u672A\u8054\u7CFB", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
  { key: "contacted", label: "\u5DF2\u8054\u7CFB", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "in_conversation", label: "\u6C9F\u901A\u4E2D", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "partnered", label: "\u5DF2\u5408\u4F5C", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  { key: "declined", label: "\u62D2\u7EDD", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  { key: "expired", label: "\u5DF2\u5931\u6548", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
];

function daysSince(date: string | Date | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function OutreachCard({
  listing,
  onStatusChange,
  onNotesChange,
  isPending,
}: {
  listing: any;
  onStatusChange: (id: number, status: OutreachStatus, notes?: string) => void;
  onNotesChange: (id: number, notes: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(listing.outreachNotes ?? "");

  const daysImported = daysSince(listing.createdAt);
  const rent = listing.monthlyRent
    ? `$${Number(listing.monthlyRent).toLocaleString()}/\u6708`
    : "\u672A\u6807\u4EF7";

  const copyWechat = () => {
    if (listing.wechatContact) {
      navigator.clipboard.writeText(listing.wechatContact);
      toast.success("\u5FAE\u4FE1\u53F7\u5DF2\u590D\u5236");
    }
  };

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Title + link */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
            {listing.title || "\u672A\u547D\u540D\u623F\u6E90"}
          </h4>
          <Link href={`/apartments/${listing.id}`}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Address + rent */}
        <div className="text-xs text-gray-500 space-y-0.5">
          {(listing.address || listing.city) && (
            <p className="truncate">
              {[listing.address, listing.city, listing.state].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="font-medium text-gray-700">{rent}</p>
        </div>

        {/* WeChat contact */}
        {listing.wechatContact && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <span className="text-xs text-green-700 font-medium truncate flex-1">
              {listing.wechatContact}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
              onClick={copyWechat}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Days since import */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{daysImported}\u5929\u524D\u5BFC\u5165</span>
          {listing.outreachLastContactedAt && (
            <span>\u4E0A\u6B21\u8054\u7CFB: {daysSince(listing.outreachLastContactedAt)}\u5929\u524D</span>
          )}
        </div>

        {/* Status dropdown */}
        <Select
          value={listing.outreachStatus ?? "not_contacted"}
          onValueChange={(val) => onStatusChange(listing.id, val as OutreachStatus)}
          disabled={isPending}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((col) => (
              <SelectItem key={col.key} value={col.key} className="text-xs">
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Notes toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {localNotes ? "\u7F16\u8F91\u5907\u6CE8" : "\u6DFB\u52A0\u5907\u6CE8"}
        </button>

        {expanded && (
          <div className="space-y-2">
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="\u5907\u6CE8\u4FE1\u606F..."
              className="text-xs min-h-[60px] resize-none"
              maxLength={2000}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs w-full"
              disabled={isPending || localNotes === (listing.outreachNotes ?? "")}
              onClick={() => onNotesChange(listing.id, localNotes)}
            >
              \u4FDD\u5B58\u5907\u6CE8
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminOutreach() {
  const { language } = useLanguage();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const { data: allListings = [], refetch } = trpc.apartments.adminList.useQuery({
    limit: 500,
    offset: 0,
  });

  const updateOutreachMutation = trpc.apartments.updateOutreach.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("\u72B6\u6001\u5DF2\u66F4\u65B0");
    },
    onError: (err) => {
      toast.error(err.message || "\u66F4\u65B0\u5931\u8D25");
    },
  });

  const handleStatusChange = (id: number, status: OutreachStatus) => {
    updateOutreachMutation.mutate({ id, outreachStatus: status });
  };

  const handleNotesChange = (id: number, notes: string) => {
    const listing = allListings.find((l: any) => l.id === id);
    updateOutreachMutation.mutate({
      id,
      outreachStatus: listing?.outreachStatus ?? "not_contacted",
      outreachNotes: notes,
    });
  };

  const grouped = useMemo(() => {
    const groups: Record<OutreachStatus, any[]> = {
      not_contacted: [],
      contacted: [],
      in_conversation: [],
      partnered: [],
      declined: [],
      expired: [],
    };
    for (const listing of allListings) {
      const status = (listing.outreachStatus ?? "not_contacted") as OutreachStatus;
      if (groups[status]) {
        groups[status].push(listing);
      } else {
        groups.not_contacted.push(listing);
      }
    }
    return groups;
  }, [allListings]);

  // Stats
  const total = allListings.length;
  const totalContacted = allListings.filter(
    (l: any) =>
      l.outreachStatus && l.outreachStatus !== "not_contacted"
  ).length;
  const partneredCount = grouped.partnered.length;
  const conversionRate = totalContacted > 0
    ? ((partneredCount / totalContacted) * 100).toFixed(1)
    : "0";

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const needsFollowUp = allListings.filter((l: any) => {
    if (l.outreachStatus !== "contacted" && l.outreachStatus !== "in_conversation") return false;
    const lastContact = l.outreachLastContactedAt
      ? new Date(l.outreachLastContactedAt).getTime()
      : 0;
    return Date.now() - lastContact > THREE_DAYS_MS;
  }).length;

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 to-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{"\u8054\u7CFB\u8FFD\u8E2A"}</h1>
            <p className="text-sm text-gray-500">{"\u7BA1\u7406\u5FAE\u4FE1\u623F\u4E1C/\u8F6C\u79DF\u4EBA\u8054\u7CFB\u8FDB\u5EA6"}</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">{"\u603B\u623F\u6E90"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
                <p className="text-sm text-gray-500">{"\u5408\u4F5C\u8F6C\u5316\u7387"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{needsFollowUp}</p>
                <p className="text-sm text-gray-500">{"\u5F85\u8DDF\u8FDB"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{partneredCount}</p>
                <p className="text-sm text-gray-500">{"\u5DF2\u5408\u4F5C"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop: Kanban columns */}
        <div className="hidden lg:grid lg:grid-cols-6 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="min-w-0">
              <div className={`rounded-xl ${col.bg} border ${col.border} p-3 mb-3`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {grouped[col.key].length}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {grouped[col.key].length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">{"\u6682\u65E0"}</p>
                ) : (
                  grouped[col.key].map((listing: any) => (
                    <OutreachCard
                      key={listing.id}
                      listing={listing}
                      onStatusChange={handleStatusChange}
                      onNotesChange={handleNotesChange}
                      isPending={updateOutreachMutation.isPending}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Collapsible sections */}
        <div className="lg:hidden space-y-4">
          {COLUMNS.map((col) => (
            <div key={col.key}>
              <button
                onClick={() => toggleSection(col.key)}
                className={`w-full rounded-xl ${col.bg} border ${col.border} p-3 flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {grouped[col.key].length}
                  </Badge>
                </div>
                {collapsedSections[col.key] ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {!collapsedSections[col.key] && (
                <div className="mt-3 space-y-3">
                  {grouped[col.key].length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">{"\u6682\u65E0"}</p>
                  ) : (
                    grouped[col.key].map((listing: any) => (
                      <OutreachCard
                        key={listing.id}
                        listing={listing}
                        onStatusChange={handleStatusChange}
                        onNotesChange={handleNotesChange}
                        isPending={updateOutreachMutation.isPending}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
