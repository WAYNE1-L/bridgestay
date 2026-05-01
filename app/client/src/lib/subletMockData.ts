/**
 * Hand-curated demo sublet listings for the SLC / UofU corridor.
 *
 * Anchors:
 *   - U District:        ~ 200 S 1300 E (≈ 40.7600, -111.8552)
 *   - Sugar House:       ~ 1000 E 2100 S (≈ 40.7250, -111.8540)
 *   - Downtown SLC:      ~ 200 S State (≈ 40.7600, -111.8880)
 *   - Federal Heights:   ~ 1300 E 100 S (≈ 40.7720, -111.8400)
 *   - Foothill:          ~ 2000 E 1700 S (≈ 40.7480, -111.8200)
 *
 * UofU campus center (Park Building): ≈ 40.7649, -111.8421
 *
 * These are SHAPED like real Apartments rows so /sublets can render them
 * through the same card component as production data once that lands.
 *
 * EVERY ROW HERE MUST BE FILTERED THROUGH `MockDataBanner`. Don't display
 * these in any view without the red demo banner.
 */

export type SubletArea =
  | "u_district"
  | "sugar_house"
  | "downtown"
  | "federal_heights"
  | "foothill"
  | "other";

export const SUBLET_AREAS: Array<{ id: SubletArea; label: string; labelZh: string }> = [
  { id: "u_district", label: "U District", labelZh: "U 大学区" },
  { id: "sugar_house", label: "Sugar House", labelZh: "糖屋" },
  { id: "downtown", label: "Downtown SLC", labelZh: "市中心" },
  { id: "federal_heights", label: "Federal Heights", labelZh: "联邦高地" },
  { id: "foothill", label: "Foothill", labelZh: "山脚" },
];

export type SubletSource =
  | "manual_demo"
  | "manual_wechat"
  | "manual_xhs"
  | "manual_other"
  | "craigslist"
  | "reddit"
  | "facebook";

export interface MockSublet {
  id: string;
  /** Title shown on the card */
  title: string;
  titleZh?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  area: SubletArea;
  latitude: number;
  longitude: number;
  monthlyRent: number;
  securityDeposit: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  /** Furnished, parking, utilities, etc. — string tags. */
  amenities: string[];
  /** ISO date string, when sublease ends. */
  subleaseEndDate: string;
  /** ISO date string, earliest move-in date. */
  availableFrom: string;
  petsAllowed: boolean;
  parkingIncluded: boolean;
  /** UofU as the headline anchor; multi-school support is just a JSON array. */
  nearbyUniversities: string[];
  /** Distance to UofU Park Building in miles (computed once, hand-checked). */
  distanceToUofU: number;
  /** Where the listing came from. Always "manual_demo" in mock data. */
  source: SubletSource;
  /** Hosts contact via WeChat for the Chinese-language audience. */
  wechatContact?: string;
  /** Brief description, bilingual. */
  description: string;
  descriptionZh?: string;
  /** Whether the host themselves is a current student. */
  hostIsStudent: boolean;
}

const UOFU = { lat: 40.7649, lon: -111.8421 };

function mi(lat: number, lon: number): number {
  const dLat = ((UOFU.lat - lat) * Math.PI) / 180;
  const dLon = ((UOFU.lon - lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((UOFU.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

function make(
  partial: Omit<MockSublet, "distanceToUofU"> & { distanceToUofU?: number }
): MockSublet {
  return {
    distanceToUofU: mi(partial.latitude, partial.longitude),
    ...partial,
  };
}

export const MOCK_SUBLETS: MockSublet[] = [
  make({
    id: "demo-001",
    title: "Studio steps from President's Circle",
    titleZh: "校园北门旁单间",
    address: "180 S 1300 E, Apt 3",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84102",
    area: "u_district",
    latitude: 40.7615,
    longitude: -111.853,
    monthlyRent: 950,
    securityDeposit: 950,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 480,
    amenities: ["furnished", "utilities_included", "wifi", "laundry_in_unit"],
    subleaseEndDate: "2026-08-15",
    availableFrom: "2026-05-15",
    petsAllowed: false,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    wechatContact: "wayne_demo_001",
    description: "Walking distance to campus, great for summer term student. Furnished, utilities included.",
    descriptionZh: "步行 5 分钟到校园,夏季学期完美选择。家具齐全,水电网包。",
    hostIsStudent: true,
  }),
  make({
    id: "demo-002",
    title: "1BR in Sugar House — bus line to campus",
    titleZh: "糖屋一房一厅,直达校园公交",
    address: "1075 E 2100 S",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84106",
    area: "sugar_house",
    latitude: 40.725,
    longitude: -111.854,
    monthlyRent: 1250,
    securityDeposit: 1250,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 720,
    amenities: ["furnished", "parking", "gym", "pet_friendly"],
    subleaseEndDate: "2026-07-31",
    availableFrom: "2026-06-01",
    petsAllowed: true,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah", "Westminster"],
    source: "manual_demo",
    description: "Quiet 1BR with parking and gym. Lease ends end of July, summer-only sublet.",
    hostIsStudent: false,
  }),
  make({
    id: "demo-003",
    title: "Shared 4BR house, private room",
    titleZh: "四居室合租,独立卧室",
    address: "532 N University St",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84102",
    area: "u_district",
    latitude: 40.77,
    longitude: -111.852,
    monthlyRent: 685,
    securityDeposit: 685,
    bedrooms: 1,
    bathrooms: 2,
    squareFeet: null,
    amenities: ["furnished", "utilities_included", "shared_kitchen", "wifi"],
    subleaseEndDate: "2026-08-01",
    availableFrom: "2026-05-01",
    petsAllowed: false,
    parkingIncluded: false,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    wechatContact: "uofu_phd_demo",
    description: "Private bedroom in 4BR house. Three current PhD roommates. International friendly.",
    descriptionZh: "四居室合租独立卧室。三位博士室友,留学生友好。",
    hostIsStudent: true,
  }),
  make({
    id: "demo-004",
    title: "Downtown high-rise studio",
    titleZh: "市中心高层单间",
    address: "230 S 200 W",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84101",
    area: "downtown",
    latitude: 40.762,
    longitude: -111.892,
    monthlyRent: 1450,
    securityDeposit: 1500,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 540,
    amenities: ["furnished", "doorman", "rooftop", "gym"],
    subleaseEndDate: "2026-09-30",
    availableFrom: "2026-06-01",
    petsAllowed: false,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    description: "Modern studio downtown. 15 min by car to UofU. Walking distance to TRAX.",
    hostIsStudent: false,
  }),
  make({
    id: "demo-005",
    title: "Federal Heights 2BR — quiet study spot",
    titleZh: "联邦高地两居,安静学习",
    address: "1320 E 100 S",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84102",
    area: "federal_heights",
    latitude: 40.772,
    longitude: -111.84,
    monthlyRent: 1800,
    securityDeposit: 1800,
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 950,
    amenities: ["furnished", "parking", "utilities_included", "in_unit_laundry"],
    subleaseEndDate: "2026-08-15",
    availableFrom: "2026-05-15",
    petsAllowed: false,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    description: "Roomy 2BR in quiet Federal Heights. Great for two grad students sharing.",
    hostIsStudent: true,
  }),
  make({
    id: "demo-006",
    title: "Foothill 1BR with mountain view",
    titleZh: "山脚一居,山景房",
    address: "2050 E 1700 S",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84108",
    area: "foothill",
    latitude: 40.748,
    longitude: -111.82,
    monthlyRent: 1100,
    securityDeposit: 1100,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 650,
    amenities: ["furnished", "parking", "wifi"],
    subleaseEndDate: "2026-07-15",
    availableFrom: "2026-05-01",
    petsAllowed: true,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    description: "Mountain-view 1BR. Hiking out the back door. 10-min drive to campus.",
    hostIsStudent: false,
  }),
  make({
    id: "demo-007",
    title: "Studio next to TRAX (line goes to UofU)",
    titleZh: "TRAX 站旁单间(直达校园)",
    address: "315 S 600 E",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84102",
    area: "downtown",
    latitude: 40.76,
    longitude: -111.873,
    monthlyRent: 875,
    securityDeposit: 875,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 420,
    amenities: ["furnished", "wifi", "utilities_included", "trax_walkable"],
    subleaseEndDate: "2026-08-31",
    availableFrom: "2026-05-15",
    petsAllowed: false,
    parkingIncluded: false,
    nearbyUniversities: ["University of Utah", "SLCC"],
    source: "manual_demo",
    wechatContact: "trax_studio",
    description: "Cheap studio near TRAX red line. Direct ride to UofU. No car needed.",
    hostIsStudent: true,
  }),
  make({
    id: "demo-008",
    title: "Sugar House 2BR — pet-friendly summer sublet",
    titleZh: "糖屋两居,允许宠物,暑期",
    address: "1244 E 2700 S",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84106",
    area: "sugar_house",
    latitude: 40.717,
    longitude: -111.858,
    monthlyRent: 1650,
    securityDeposit: 1650,
    bedrooms: 2,
    bathrooms: 1.5,
    squareFeet: 1080,
    amenities: ["furnished", "pet_friendly", "parking", "yard"],
    subleaseEndDate: "2026-08-15",
    availableFrom: "2026-06-01",
    petsAllowed: true,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah", "Westminster"],
    source: "manual_demo",
    description: "Two-bedroom in Sugar House. Pet-friendly, fenced yard. Summer-only.",
    hostIsStudent: false,
  }),
  make({
    id: "demo-009",
    title: "Walk to campus — shared house, female only",
    titleZh: "校园步行,合租,仅女生",
    address: "256 S 1400 E",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84102",
    area: "u_district",
    latitude: 40.762,
    longitude: -111.85,
    monthlyRent: 750,
    securityDeposit: 750,
    bedrooms: 1,
    bathrooms: 2,
    squareFeet: null,
    amenities: ["furnished", "utilities_included", "shared_kitchen", "female_only"],
    subleaseEndDate: "2026-07-31",
    availableFrom: "2026-05-15",
    petsAllowed: false,
    parkingIncluded: false,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    wechatContact: "uofu_demo_shared",
    description: "Private room in all-female student house. Two-block walk to Union building.",
    descriptionZh: "全女生学生合租房独立卧室。走到 Union 两个街区。",
    hostIsStudent: true,
  }),
  make({
    id: "demo-010",
    title: "Furnished condo with TRAX access",
    titleZh: "带家具公寓,公交直达",
    address: "445 S 400 E",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84111",
    area: "downtown",
    latitude: 40.756,
    longitude: -111.884,
    monthlyRent: 1395,
    securityDeposit: 1395,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 770,
    amenities: ["furnished", "doorman", "gym", "parking", "trax_walkable"],
    subleaseEndDate: "2026-09-15",
    availableFrom: "2026-05-15",
    petsAllowed: false,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    description: "Modern furnished condo, 15 min TRAX ride to campus.",
    hostIsStudent: false,
  }),
  make({
    id: "demo-011",
    title: "Sugar House studio — short summer sublet",
    titleZh: "糖屋单间,短期暑假",
    address: "950 E 2100 S",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84106",
    area: "sugar_house",
    latitude: 40.7255,
    longitude: -111.857,
    monthlyRent: 825,
    securityDeposit: 825,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 380,
    amenities: ["furnished", "wifi"],
    subleaseEndDate: "2026-07-31",
    availableFrom: "2026-06-01",
    petsAllowed: false,
    parkingIncluded: false,
    nearbyUniversities: ["University of Utah", "Westminster"],
    source: "manual_demo",
    description: "Tight budget? Compact studio. Two-month sublet only.",
    hostIsStudent: true,
  }),
  make({
    id: "demo-012",
    title: "Foothill 3BR house — group sublet",
    titleZh: "山脚三居整租",
    address: "2240 E 1700 S",
    city: "Salt Lake City",
    state: "UT",
    zipCode: "84108",
    area: "foothill",
    latitude: 40.7475,
    longitude: -111.815,
    monthlyRent: 2400,
    securityDeposit: 2400,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1450,
    amenities: ["furnished", "parking", "yard", "in_unit_laundry"],
    subleaseEndDate: "2026-08-15",
    availableFrom: "2026-05-01",
    petsAllowed: true,
    parkingIncluded: true,
    nearbyUniversities: ["University of Utah"],
    source: "manual_demo",
    description: "Whole 3BR house. Three roommates leaving for summer. Take all three or split.",
    hostIsStudent: true,
  }),
];

/** Used by the filter form's amenity chips. */
export const COMMON_AMENITIES = [
  { value: "furnished", label: "Furnished", labelZh: "带家具" },
  { value: "utilities_included", label: "Utilities incl.", labelZh: "包水电" },
  { value: "parking", label: "Parking", labelZh: "停车位" },
  { value: "pet_friendly", label: "Pet friendly", labelZh: "可养宠物" },
  { value: "wifi", label: "Wi-Fi", labelZh: "网络" },
  { value: "in_unit_laundry", label: "In-unit laundry", labelZh: "室内洗衣" },
  { value: "trax_walkable", label: "TRAX walkable", labelZh: "公交可达" },
] as const;

export const SUBLET_SOURCES: Record<SubletSource, { label: string; labelZh: string; tone: string }> = {
  manual_demo: { label: "Demo", labelZh: "演示", tone: "bg-red-100 text-red-700" },
  manual_wechat: { label: "WeChat", labelZh: "微信", tone: "bg-emerald-100 text-emerald-700" },
  manual_xhs: { label: "Xiaohongshu", labelZh: "小红书", tone: "bg-rose-100 text-rose-700" },
  manual_other: { label: "Manual", labelZh: "手工", tone: "bg-neutral-100 text-neutral-700" },
  craigslist: { label: "Craigslist", labelZh: "Craigslist", tone: "bg-purple-100 text-purple-700" },
  reddit: { label: "Reddit", labelZh: "Reddit", tone: "bg-orange-100 text-orange-700" },
  facebook: { label: "FB", labelZh: "脸书", tone: "bg-blue-100 text-blue-700" },
};
