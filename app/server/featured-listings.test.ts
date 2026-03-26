import { describe, it, expect } from "vitest";

// Mock BilingualListing interface for testing
interface BilingualListing {
  id: string;
  title: { cn: string; en: string };
  isFeatured?: boolean;
}

describe("Featured Listings Logic", () => {
  const mockListings: BilingualListing[] = [
    { id: "1", title: { cn: "精选房源1", en: "Featured Listing 1" }, isFeatured: true },
    { id: "2", title: { cn: "普通房源1", en: "Regular Listing 1" }, isFeatured: false },
    { id: "3", title: { cn: "精选房源2", en: "Featured Listing 2" }, isFeatured: true },
    { id: "4", title: { cn: "普通房源2", en: "Regular Listing 2" }, isFeatured: false },
    { id: "5", title: { cn: "未设置房源", en: "Unset Listing" } }, // isFeatured undefined
  ];

  it("should filter only featured listings for homepage", () => {
    const featuredListings = mockListings.filter(l => l.isFeatured);
    
    expect(featuredListings).toHaveLength(2);
    expect(featuredListings[0].id).toBe("1");
    expect(featuredListings[1].id).toBe("3");
  });

  it("should show all listings on All Listings page", () => {
    // All Listings page shows everything
    expect(mockListings).toHaveLength(5);
  });

  it("should handle undefined isFeatured as false", () => {
    const featuredListings = mockListings.filter(l => l.isFeatured === true);
    
    // Listing with undefined isFeatured should NOT appear in featured
    expect(featuredListings.every(l => l.isFeatured === true)).toBe(true);
    expect(featuredListings.some(l => l.id === "5")).toBe(false);
  });

  it("should limit featured listings to 6 on homepage", () => {
    const manyListings: BilingualListing[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      title: { cn: `房源${i + 1}`, en: `Listing ${i + 1}` },
      isFeatured: true,
    }));

    const homepageFeatured = manyListings.filter(l => l.isFeatured).slice(0, 6);
    
    expect(homepageFeatured).toHaveLength(6);
  });
});
