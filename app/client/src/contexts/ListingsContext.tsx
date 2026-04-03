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
    start: string;  // ISO date string or "Immediate"
    end: string;    // ISO date string or ""
  };
  description: BilingualText;
  tags: BilingualText[];

  // ── Property details (optional — fill in what you know) ──────────────────
  bedrooms?: number | null;       // 0 = studio
  bathrooms?: number | null;
  squareFeet?: number | null;
  petsAllowed?: boolean;
  parkingIncluded?: boolean;
  noSsnRequired?: boolean;        // defaults to true for all BridgeStay listings

  // ── Images ───────────────────────────────────────────────────────────────
  images?: string[];    // Preferred: array of URLs for carousel
  imageUrl?: string;    // Legacy fallback (Supabase scraper output)

  // ── Contact / admin ──────────────────────────────────────────────────────
  contact: ContactInfo;
  isFeatured?: boolean;           // Pinned to top of list
  status?: ListingStatus;
  adminNotes?: string;            // Never exposed to frontend users
  sourceLink?: string;            // Original source URL (admin only)
  reviewStatus?: ReviewStatus;
  submittedBy?: number;
  reviewedBy?: number;
  reviewedAt?: string;
  rejectionReason?: string;
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

// No hardcoded demo listings — all listings come from the database via tRPC.
// The context is kept for Supabase integration and any future local-only listings.
const defaultListings: BilingualListing[] = [];

const STORAGE_KEY = "bridgestay-listings-v3"; // v3: removed hardcoded demo listings

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
