import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchSupabaseListings, deleteSupabaseListing } from '../lib/supabase';
import { mapSupabaseListings } from '../lib/supabaseMapper';

// Bilingual text type
export interface BilingualText {
  cn: string;
  en: string;
}

// Contact info type
export interface ContactInfo {
  wechat?: string;
  email?: string;
}

// Review status type
export type ReviewStatus = "pending" | "approved" | "rejected";

// Listing status type
export type ListingStatus = "available" | "rented" | "hidden";

// Bilingual listing type
export interface BilingualListing {
  id: string;
  title: BilingualText;
  location: {
    address: BilingualText;
    area: BilingualText;
  };
  price: {
    amount: number;
    currency: string;
    notes: BilingualText;
  };
  propertyType: string;
  availability: {
    start: string;
    end: string;
  };
  description: BilingualText;
  tags: BilingualText[];
  imageUrl?: string; // Primary image (backward compatible)
  images?: string[]; // Multiple images for carousel
  contact: ContactInfo;
  isFeatured?: boolean; // Featured listings appear on homepage
  status?: ListingStatus; // Listing status: available, rented, hidden
  adminNotes?: string; // Private admin notes (never exposed to frontend users)
  sourceLink?: string; // Original listing source URL (admin only, not shown to users)
  reviewStatus?: ReviewStatus; // Review status for moderation
  submittedBy?: number; // User ID who submitted the listing
  reviewedBy?: number; // Admin ID who reviewed the listing
  reviewedAt?: string; // Timestamp of review
  rejectionReason?: string; // Reason for rejection
}

interface ListingsContextType {
  listings: BilingualListing[];
  supabaseListings: BilingualListing[];
  allListings: BilingualListing[]; // Combined: supabase + local
  isLoadingSupabase: boolean;
  addListing: (listing: BilingualListing) => void;
  updateListing: (id: string, updates: Partial<BilingualListing>) => void;
  deleteListing: (id: string) => void;
  deleteSupabaseListing: (id: string) => Promise<boolean>; // Delete from Supabase and refresh
  refreshSupabase: () => Promise<void>;
}

// Default listings data with bilingual support and contact info
const defaultListings: BilingualListing[] = [
  {
    id: "slc_001",
    title: {
      cn: "盐湖城 1B1B 滑雪胜地旁急转租 (首月优惠$300)",
      en: "Salt Lake City 1B1B Near Ski Resorts - Urgent Sublease ($300 off first month)"
    },
    location: {
      address: {
        cn: "6960 S Inglenook Cv, Salt Lake City, UT",
        en: "6960 S Inglenook Cv, Salt Lake City, UT"
      },
      area: {
        cn: "Cottonwood Heights / 滑雪度假区",
        en: "Cottonwood Heights / Ski Resorts Area"
      }
    },
    price: {
      amount: 1500,
      currency: "USD",
      notes: {
        cn: "包含所有物业费和管理费，首月立减$300",
        en: "All utilities included, $300 off first month"
      }
    },
    propertyType: "1B1B",
    availability: {
      start: "2024-01-15",
      end: "2024-10-01"
    },
    description: {
      cn: "个人工作变动急转。地理位置绝佳，距离四大滑雪场仅30-40分钟车程。",
      en: "Urgent sublease due to job relocation. Prime location, only 30-40 min drive to four major ski resorts."
    },
    tags: [
      { cn: "急转", en: "Urgent" },
      { cn: "滑雪", en: "Skiing" },
      { cn: "可养宠", en: "Pet Friendly" },
      { cn: "优惠", en: "Discount" }
    ],
    contact: {
      wechat: "ski_lover_slc",
      email: "sublease.slc@gmail.com"
    },
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
    ],
    isFeatured: true,
    reviewStatus: "approved"
  },
  {
    id: "slc_002",
    title: {
      cn: "Downtown 核心区 The Hardison 公寓转租",
      en: "Downtown Core - The Hardison Apartment Sublease"
    },
    location: {
      address: {
        cn: "480 E S Temple St, Salt Lake City, UT 84111",
        en: "480 E S Temple St, Salt Lake City, UT 84111"
      },
      area: {
        cn: "盐湖城市中心",
        en: "Downtown SLC"
      }
    },
    price: {
      amount: 1480,
      currency: "USD",
      notes: {
        cn: "包除电费外所有费用 (原价$1800+，差价房东已补)",
        en: "All utilities except electricity included (Original $1800+, landlord covers difference)"
      }
    },
    propertyType: "1B1B (600 sqft)",
    availability: {
      start: "2024-02-01",
      end: "2024-05-31"
    },
    description: {
      cn: "位于SLC核心地段，距离犹他大学5分钟车程。卧室超大窗户，采光极好。",
      en: "Located in SLC's core area, 5 min drive to University of Utah. Large bedroom windows with excellent natural light."
    },
    tags: [
      { cn: "市中心", en: "Downtown" },
      { cn: "近UofU", en: "Near UofU" },
      { cn: "高性价比", en: "Great Value" }
    ],
    contact: {
      wechat: "hardison_apt",
      email: "hardison.sublease@outlook.com"
    },
    images: [
      "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"
    ],
    isFeatured: true,
    reviewStatus: "approved"
  }
];

const STORAGE_KEY = "bridgestay-listings-v2";

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

export function ListingsProvider({ children }: { children: ReactNode }) {
  // Local listings (from localStorage)
  const [listings, setListings] = useState<BilingualListing[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure all listings have contact field
          return parsed.map((l: BilingualListing) => ({
            ...l,
            contact: l.contact || { wechat: "", email: "" }
          }));
        } catch {
          return defaultListings;
        }
      }
    }
    return defaultListings;
  });

  // Supabase listings (from remote database)
  const [supabaseListings, setSupabaseListings] = useState<BilingualListing[]>([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);

  // Fetch Supabase listings on mount
  const refreshSupabase = async () => {
    setIsLoadingSupabase(true);
    try {
      const data = await fetchSupabaseListings();
      const mapped = mapSupabaseListings(data);
      setSupabaseListings(mapped);
    } catch (error) {
      // Properly format error message for logging
      const errorMessage = error instanceof Error ? error.message : 
        (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error('Failed to fetch Supabase listings:', errorMessage);
      // Keep existing listings on error (graceful degradation)
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  useEffect(() => {
    refreshSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  }, [listings]);

  // Combined listings: Supabase first (sorted by luxury_score), then local
  const allListings = [...supabaseListings, ...listings];

  const addListing = (listing: BilingualListing) => {
    setListings((prev) => [listing, ...prev]);
  };

  const updateListing = (id: string, updates: Partial<BilingualListing>) => {
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteListing = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  // Delete from Supabase and refresh the list
  const handleDeleteSupabaseListing = async (id: string): Promise<boolean> => {
    const success = await deleteSupabaseListing(id);
    if (success) {
      await refreshSupabase();
    }
    return success;
  };

  return (
    <ListingsContext.Provider value={{ 
      listings, 
      supabaseListings,
      allListings,
      isLoadingSupabase,
      addListing, 
      updateListing, 
      deleteListing,
      deleteSupabaseListing: handleDeleteSupabaseListing,
      refreshSupabase
    }}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const context = useContext(ListingsContext);
  if (context === undefined) {
    throw new Error("useListings must be used within a ListingsProvider");
  }
  return context;
}
