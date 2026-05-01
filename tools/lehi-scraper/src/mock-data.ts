/**
 * Synthetic but realistic dataset for `npm run scrape:mock`.
 *
 * Hand-curated 30 listings clustered around Morning Vista (40.4847, -111.8814)
 * with realistic price / size distribution for the 84043 zip — useful as a
 * fallback when the live scraper is blocked, or for offline development of
 * the viewer UI.
 *
 * Real-money values are believable but NOT real. Don't read these as actual
 * comps; they exist to exercise the chart and filter code paths.
 */

import type { ParsedListing } from "./realtor-parse";

interface MockSeed {
  id: string;
  address: string;
  lat: number;
  lon: number;
  price: number;
  bed: number;
  bath: number;
  sqft: number;
  lot_sqft: number;
  year_built: number;
  type: "single_family" | "townhouse" | "condo";
  status?: "for_sale" | "pending" | "sold";
}

const SEEDS: MockSeed[] = [
  // --- Morning Vista immediate vicinity (within 1 mile) ---
  { id: "MOCK-001", address: "1042 Morning Vista Dr", lat: 40.4849, lon: -111.881, price: 595000, bed: 4, bath: 2.5, sqft: 2680, lot_sqft: 6500, year_built: 2017, type: "single_family" },
  { id: "MOCK-002", address: "1158 N Forest Vista Ln", lat: 40.4861, lon: -111.8798, price: 615000, bed: 4, bath: 3, sqft: 2820, lot_sqft: 7100, year_built: 2018, type: "single_family" },
  { id: "MOCK-003", address: "997 W Saddleback Cir", lat: 40.4831, lon: -111.8841, price: 542000, bed: 3, bath: 2.5, sqft: 2310, lot_sqft: 5400, year_built: 2016, type: "single_family" },
  { id: "MOCK-004", address: "1267 Aspen Hollow Rd", lat: 40.4872, lon: -111.8823, price: 729000, bed: 5, bath: 3.5, sqft: 3450, lot_sqft: 9800, year_built: 2020, type: "single_family" },
  { id: "MOCK-005", address: "884 Ridgeview Ct", lat: 40.4815, lon: -111.8852, price: 489000, bed: 3, bath: 2, sqft: 1840, lot_sqft: 5200, year_built: 2014, type: "townhouse" },

  // --- Traverse Mountain core (1-3 mi) ---
  { id: "MOCK-006", address: "2104 N Cumming Ridge Rd", lat: 40.4945, lon: -111.875, price: 685000, bed: 4, bath: 3, sqft: 2950, lot_sqft: 8200, year_built: 2019, type: "single_family" },
  { id: "MOCK-007", address: "1857 W Eagle Crest Way", lat: 40.491, lon: -111.892, price: 625000, bed: 4, bath: 2.5, sqft: 2640, lot_sqft: 6800, year_built: 2018, type: "single_family" },
  { id: "MOCK-008", address: "2431 Brookside Ln", lat: 40.4978, lon: -111.871, price: 519000, bed: 3, bath: 2.5, sqft: 2120, lot_sqft: 5600, year_built: 2015, type: "single_family" },
  { id: "MOCK-009", address: "1612 Trailhead Cir", lat: 40.4895, lon: -111.8765, price: 459000, bed: 3, bath: 2, sqft: 1720, lot_sqft: 4800, year_built: 2013, type: "townhouse" },
  { id: "MOCK-010", address: "2289 N Heritage Hills Dr", lat: 40.4962, lon: -111.8688, price: 845000, bed: 5, bath: 4, sqft: 3920, lot_sqft: 11000, year_built: 2021, type: "single_family" },
  { id: "MOCK-011", address: "1944 Aspen Glen Ct", lat: 40.4928, lon: -111.8882, price: 575000, bed: 4, bath: 2.5, sqft: 2480, lot_sqft: 6200, year_built: 2017, type: "single_family" },
  { id: "MOCK-012", address: "2587 Sunrise Peak Dr", lat: 40.4995, lon: -111.864, price: 952000, bed: 5, bath: 4, sqft: 4280, lot_sqft: 13500, year_built: 2022, type: "single_family" },

  // --- Lehi central (3-5 mi from Morning Vista) ---
  { id: "MOCK-013", address: "634 W Main St", lat: 40.391, lon: -111.851, price: 425000, bed: 3, bath: 2, sqft: 1680, lot_sqft: 5500, year_built: 1998, type: "single_family", status: "pending" },
  { id: "MOCK-014", address: "789 N 1200 W", lat: 40.4035, lon: -111.864, price: 459000, bed: 4, bath: 2, sqft: 2050, lot_sqft: 7200, year_built: 2005, type: "single_family" },
  { id: "MOCK-015", address: "1421 Center St", lat: 40.3985, lon: -111.842, price: 489000, bed: 3, bath: 2.5, sqft: 2200, lot_sqft: 6400, year_built: 2008, type: "single_family" },
  { id: "MOCK-016", address: "522 S 850 E", lat: 40.3858, lon: -111.831, price: 379000, bed: 3, bath: 2, sqft: 1540, lot_sqft: 4900, year_built: 2002, type: "townhouse" },
  { id: "MOCK-017", address: "2105 N 2000 W", lat: 40.412, lon: -111.881, price: 535000, bed: 4, bath: 3, sqft: 2380, lot_sqft: 6800, year_built: 2012, type: "single_family" },

  // --- Nearby SaratogaSprings / Eagle Mountain (5-10 mi) ---
  { id: "MOCK-018", address: "8120 N Wagon Wheel Way", lat: 40.345, lon: -111.91, price: 545000, bed: 4, bath: 3, sqft: 2680, lot_sqft: 7500, year_built: 2016, type: "single_family" },
  { id: "MOCK-019", address: "9234 Saratoga Pkwy", lat: 40.3325, lon: -111.92, price: 612000, bed: 4, bath: 3, sqft: 2890, lot_sqft: 8200, year_built: 2018, type: "single_family" },
  { id: "MOCK-020", address: "5678 N Eagle View Dr", lat: 40.32, lon: -111.86, price: 498000, bed: 3, bath: 2.5, sqft: 2120, lot_sqft: 6100, year_built: 2014, type: "single_family" },

  // --- Sold (recently) ---
  { id: "MOCK-021", address: "1420 N Vista Pine Ln", lat: 40.4889, lon: -111.879, price: 559000, bed: 4, bath: 2.5, sqft: 2480, lot_sqft: 6300, year_built: 2017, type: "single_family", status: "sold" },
  { id: "MOCK-022", address: "1102 W Sage Ridge Way", lat: 40.4825, lon: -111.886, price: 648000, bed: 4, bath: 3, sqft: 2960, lot_sqft: 7900, year_built: 2019, type: "single_family", status: "sold" },

  // --- Condos / smaller (price hunters) ---
  { id: "MOCK-023", address: "350 W 2050 N #14", lat: 40.481, lon: -111.876, price: 329000, bed: 2, bath: 2, sqft: 1180, lot_sqft: 0, year_built: 2010, type: "condo" },
  { id: "MOCK-024", address: "350 W 2050 N #28", lat: 40.481, lon: -111.876, price: 359000, bed: 3, bath: 2, sqft: 1320, lot_sqft: 0, year_built: 2010, type: "condo" },
  { id: "MOCK-025", address: "1788 N Birchwood Cir", lat: 40.4885, lon: -111.873, price: 398000, bed: 3, bath: 2.5, sqft: 1680, lot_sqft: 3200, year_built: 2015, type: "townhouse" },

  // --- High-end (luxury comps) ---
  { id: "MOCK-026", address: "2956 N Summit Ridge Dr", lat: 40.5022, lon: -111.85, price: 1245000, bed: 5, bath: 4.5, sqft: 4850, lot_sqft: 18000, year_built: 2022, type: "single_family" },
  { id: "MOCK-027", address: "3104 W Mountain Vista Dr", lat: 40.498, lon: -111.91, price: 1180000, bed: 5, bath: 4.5, sqft: 4620, lot_sqft: 16500, year_built: 2021, type: "single_family" },

  // --- Newest (recent listings flag) ---
  { id: "MOCK-028", address: "1455 N Aspen Bend Ct", lat: 40.486, lon: -111.884, price: 569000, bed: 4, bath: 2.5, sqft: 2520, lot_sqft: 6200, year_built: 2018, type: "single_family" },
  { id: "MOCK-029", address: "1622 W Foothill Crest Dr", lat: 40.487, lon: -111.886, price: 605000, bed: 4, bath: 3, sqft: 2740, lot_sqft: 6900, year_built: 2019, type: "single_family" },
  { id: "MOCK-030", address: "2012 N Maple Hollow Way", lat: 40.4948, lon: -111.876, price: 692000, bed: 5, bath: 3, sqft: 3120, lot_sqft: 8400, year_built: 2020, type: "single_family" },
];

export function buildMockListings(): ParsedListing[] {
  return SEEDS.map((seed) => ({
    id: seed.id,
    url: `https://www.realtor.com/realestateandhomes-detail/${encodeURIComponent(seed.address.replace(/\s+/g, "-"))}_Lehi_UT_84043_${seed.id}`,
    address: seed.address,
    city: "Lehi",
    zip: "84043",
    price: seed.price,
    bed: seed.bed,
    bath: seed.bath,
    sqft: seed.sqft,
    lot_sqft: seed.lot_sqft || null,
    year_built: seed.year_built,
    lat: seed.lat,
    lon: seed.lon,
    listing_status: seed.status ?? "for_sale",
    listing_type: seed.type,
    raw_json: null,
  }));
}
