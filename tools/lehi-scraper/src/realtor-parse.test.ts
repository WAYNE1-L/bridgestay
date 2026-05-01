import { describe, it, expect } from "vitest";
import { parseNextData, parseDom, parseLotString, extractIdFromUrl } from "./realtor-parse";

describe("extractIdFromUrl", () => {
  it("extracts M-style ID from a Realtor detail URL", () => {
    expect(
      extractIdFromUrl(
        "https://www.realtor.com/realestateandhomes-detail/123-Main_Lehi_UT_84043_M12345-67890"
      )
    ).toBe("M12345-67890");
  });

  it("falls back to the last URL segment", () => {
    expect(extractIdFromUrl("https://example.com/listings/abc-123")).toBe("abc-123");
  });

  it("returns null for empty input", () => {
    expect(extractIdFromUrl("/")).toBeNull();
  });
});

describe("parseLotString", () => {
  it("converts acres to sqft", () => {
    expect(parseLotString("0.25 acres")).toBe(10890);
    expect(parseLotString("1 acre")).toBe(43560);
  });

  it("returns sqft as-is", () => {
    expect(parseLotString("5,000 sqft")).toBe(5000);
    expect(parseLotString("5000 sqft")).toBe(5000);
  });

  it("returns null for unparseable input", () => {
    expect(parseLotString(null)).toBeNull();
    expect(parseLotString("--")).toBeNull();
  });
});

describe("parseNextData", () => {
  it("extracts a listing from a typical Realtor.com __NEXT_DATA__ shape", () => {
    const sampleNextData = {
      props: {
        pageProps: {
          property: {
            property_id: "M12345-67890",
            address: {
              line: "123 Main St",
              city: "Lehi",
              postal_code: "84043",
              coordinate: { lat: 40.485, lon: -111.882 },
            },
            description: {
              beds: 4,
              baths_consolidated: "2.5",
              sqft: 2400,
              lot_sqft: 7200,
              year_built: 2019,
              type: "single_family",
            },
            list_price: 575000,
            status: "for_sale",
          },
        },
      },
    };
    const result = parseNextData(
      sampleNextData,
      "https://www.realtor.com/realestateandhomes-detail/123-Main_Lehi_UT_84043_M12345-67890"
    );
    expect(result).not.toBeNull();
    expect(result?.id).toBe("M12345-67890");
    expect(result?.address).toBe("123 Main St");
    expect(result?.city).toBe("Lehi");
    expect(result?.zip).toBe("84043");
    expect(result?.price).toBe(575000);
    expect(result?.bed).toBe(4);
    expect(result?.bath).toBe(2.5);
    expect(result?.sqft).toBe(2400);
    expect(result?.lot_sqft).toBe(7200);
    expect(result?.year_built).toBe(2019);
    expect(result?.lat).toBe(40.485);
    expect(result?.lon).toBe(-111.882);
    expect(result?.listing_type).toBe("single_family");
  });

  it("returns null when address is missing", () => {
    const result = parseNextData({ props: {} }, "https://example.com/x");
    expect(result).toBeNull();
  });

  it("falls back to URL-derived id when property_id is missing", () => {
    const data = {
      pageProps: {
        listing: {
          address: { line: "9 Oak", postal_code: "84043" },
        },
      },
    };
    const result = parseNextData(
      data,
      "https://www.realtor.com/realestateandhomes-detail/9-Oak_Lehi_UT_84043_M99999-11111"
    );
    expect(result?.id).toBe("M99999-11111");
  });
});

describe("parseDom (fallback)", () => {
  it("normalizes string fields to numbers", () => {
    const result = parseDom(
      {
        address: "555 Oak Dr",
        price: "$650,000",
        beds: "4 bed",
        baths: "3 bath",
        sqft: "2,200 sqft",
        lotSize: "0.18 acres",
        city: "Lehi",
        zip: "84043",
      },
      "https://www.realtor.com/realestateandhomes-detail/555-Oak_Lehi_UT_84043_M55555-22222"
    );
    expect(result).not.toBeNull();
    expect(result?.price).toBe(650000);
    expect(result?.bed).toBe(4);
    expect(result?.bath).toBe(3);
    expect(result?.sqft).toBe(2200);
    expect(result?.lot_sqft).toBe(Math.round(0.18 * 43560));
  });

  it("returns null when address or zip missing", () => {
    expect(
      parseDom(
        {
          address: null,
          price: "$1",
          beds: null,
          baths: null,
          sqft: null,
          lotSize: null,
          city: null,
          zip: "84043",
        },
        "https://example.com/x"
      )
    ).toBeNull();
  });
});
