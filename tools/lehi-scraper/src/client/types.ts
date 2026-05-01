// Mirrors the SQLite row shape served by /api/listings.
export interface Listing {
  id: string;
  url: string;
  address: string;
  city: string | null;
  zip: string;
  price: number | null;
  bed: number | null;
  bath: number | null;
  sqft: number | null;
  lot_sqft: number | null;
  year_built: number | null;
  lat: number | null;
  lon: number | null;
  distance_to_morning_vista_mi: number | null;
  listing_status: string;
  listing_type: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_price_change_at: string | null;
  raw_json: string | null;
}

export interface ListingsResponse {
  count: number;
  listings: Listing[];
}

export interface DailyStat {
  date: string;
  new_listings: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
}

export interface MonthlyStat {
  month: string;
  listings_count: number;
  median_price: number | null;
  avg_price: number | null;
}

export interface Summary {
  totals: {
    total: number;
    for_sale: number;
    pending: number;
    sold: number;
    avg_price: number | null;
    min_price: number | null;
    max_price: number | null;
  };
  lastRun: {
    id: number;
    started_at: string;
    finished_at: string | null;
    status: string;
    listings_total: number | null;
    listings_new: number | null;
    listings_updated: number | null;
    error_log: string | null;
  } | null;
}

export interface Filters {
  status: string;
  minPrice: number;
  maxPrice: number;
  minBed: number;
  minBath: number;
  minLotSqft: number;
  maxDistanceMi: number;
  sortBy:
    | "first_seen_at"
    | "last_seen_at"
    | "price"
    | "bed"
    | "sqft"
    | "distance_to_morning_vista_mi";
  order: "asc" | "desc";
}

export const DEFAULT_FILTERS: Filters = {
  status: "for_sale",
  minPrice: 0,
  maxPrice: 99_999_999,
  minBed: 0,
  minBath: 0,
  minLotSqft: 0,
  maxDistanceMi: 999,
  sortBy: "first_seen_at",
  order: "desc",
};
