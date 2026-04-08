import { describe, expect, it } from "vitest";
import {
  deriveLocationCandidate,
  finalizeExtractionResponse,
  preprocessInput,
  type ExtractedListing,
} from "./wechat-import";

describe("wechat import preprocessing", () => {
  it("keeps a clean single listing intact", () => {
    const input = `Sunny 2B2B sublease
Address: 127 W Scarlett Ave
$1150/month`;

    const result = preprocessInput(input);

    expect(result.text).toContain("127 W Scarlett Ave");
    expect(result.duplicateContentRemoved).toBe(false);
    expect(result.multipleListingCandidatesDetected).toBe(false);
    expect(result.conflictingAddressesDetected).toBe(false);
    expect(result.extractedFromBestCandidateChunk).toBe(false);
    expect(result.candidateChunkCount).toBe(1);
    expect(result.truncatedPreviewOfOtherChunks).toBeUndefined();
  });

  it("removes duplicated repeated listing blocks", () => {
    const block = `Hawthorn townhomes 2b2b次卧转租
Address: 127 W Scarlett Ave
$1150/month`;

    const result = preprocessInput(`${block}\n\n${block}`);

    expect(result.duplicateContentRemoved).toBe(true);
    expect(result.text.match(/127 W Scarlett Ave/g)?.length).toBe(1);
    expect(result.multipleListingCandidatesDetected).toBe(false);
    expect(result.candidateChunkCount).toBe(1);
    expect(result.truncatedPreviewOfOtherChunks).toBeUndefined();
  });

  it("flags noisy multi-listing input with conflicting addresses and picks the best chunk", () => {
    const input = `【Listing A】
Hawthorn townhomes 2b2b次卧转租
Address: 127 W Scarlett Ave
$1150/month
2b2b furnished

【Listing B】
Other apartment short-term sublease
Address: 999 E Valley Blvd
$980/month`;

    const result = preprocessInput(input);

    expect(result.multipleListingCandidatesDetected).toBe(true);
    expect(result.conflictingAddressesDetected).toBe(true);
    expect(result.extractedFromBestCandidateChunk).toBe(true);
    expect(result.candidateChunkCount).toBe(2);
    expect(result.truncatedPreviewOfOtherChunks).toHaveLength(1);
    expect(result.otherCandidateChunks).toHaveLength(1);
    expect(result.truncatedPreviewOfOtherChunks?.[0].length).toBeLessThanOrEqual(120);
    expect(result.truncatedPreviewOfOtherChunks?.[0]).toContain("999 E Valley Blvd");
    expect(result.otherCandidateChunks?.[0]).toContain("999 E Valley Blvd");
    expect(result.text).toContain("127 W Scarlett Ave");
    expect(result.text).not.toContain("999 E Valley Blvd");
  });
});

describe("wechat import phase 1 extraction shaping", () => {
  it("classifies a direct street address as street_address evidence", () => {
    const listing: ExtractedListing = {
      title: "Sunny apartment",
      address: "127 W Scarlett Ave",
      city: "Salt Lake City",
      state: "UT",
      confidence: "medium",
    };

    const result = deriveLocationCandidate(listing);

    expect(result.evidenceType).toBe("street_address");
    expect(result.rawAddressText).toBe("127 W Scarlett Ave");
    expect(result.confidence).toBe("high");
  });

  it("classifies a property-name-only listing as property_name evidence", () => {
    const listing: ExtractedListing = {
      title: "Bridges sublease",
      propertyName: "Bridges Apartment Homes",
      city: "Salt Lake City",
      state: "UT",
      confidence: "medium",
    };

    const result = deriveLocationCandidate(listing);

    expect(result.evidenceType).toBe("property_name");
    expect(result.rawPropertyName).toBe("Bridges Apartment Homes");
    expect(result.issues).toContain("property_name_only");
  });

  it("builds diagnostics for multi-listing conflicts and keeps compatibility fields stable", () => {
    const preprocess = preprocessInput(`【Listing A】
Hawthorn townhomes 2b2b次卧转租
Address: 127 W Scarlett Ave
$1150/month

【Listing B】
Other apartment short-term sublease
Address: 999 E Valley Blvd
$980/month`);

    const listing: ExtractedListing = {
      title: "Hawthorn listing",
      address: "127 W Scarlett Ave",
      city: "Salt Lake City",
      state: "UT",
      confidence: "medium",
      extractionSource: "heuristic-fallback",
    };

    const result = finalizeExtractionResponse(listing, preprocess);

    expect(result.listing.address).toBe("127 W Scarlett Ave");
    expect(result.locationCandidate.evidenceType).toBe("conflicting");
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "multiple_listing_candidates",
        "conflicting_addresses",
        "best_candidate_selected",
      ])
    );
    expect(result.extractionWarnings).toEqual(
      expect.arrayContaining([
        "Conflicting addresses were detected across candidate listings",
      ])
    );
  });

  it("produces a direct-address final response with compatibility fields", () => {
    const listing: ExtractedListing = {
      title: "Sunny apartment",
      address: "127 W Scarlett Ave",
      city: "Salt Lake City",
      state: "UT",
      zipCode: "84111",
      confidence: "medium",
      extractionSource: "heuristic-fallback",
    };

    const result = finalizeExtractionResponse(listing, null);

    expect(result.address).toBe("127 W Scarlett Ave");
    expect(result.listing.address).toBe("127 W Scarlett Ave");
    expect(result.locationSource).toBe("direct_text");
    expect(result.locationCandidate.evidenceType).toBe("street_address");
    expect(result.locationCandidate.rawAddressText).toBe("127 W Scarlett Ave");
    expect(result.diagnostics).toEqual([]);
  });

  it("produces a property-name-only final response without a street address", () => {
    const listing: ExtractedListing = {
      title: "Bridges sublease",
      propertyName: "Bridges Apartment Homes",
      city: "Salt Lake City",
      state: "UT",
      confidence: "medium",
      extractionSource: "heuristic-fallback",
    };

    const result = finalizeExtractionResponse(listing, null);

    expect(result.address).toBeUndefined();
    expect(result.listing.address).toBeUndefined();
    expect(result.locationSource).toBe("unresolved");
    expect(result.locationCandidate.evidenceType).toBe("property_name");
    expect(result.diagnostics.map((item) => item.code)).toContain("property_name_only");
  });

  it("never emits place_lookup from phase 1 extraction shaping", () => {
    const directAddress: ExtractedListing = {
      title: "Direct address listing",
      address: "127 W Scarlett Ave",
      city: "Salt Lake City",
      state: "UT",
      confidence: "medium",
    };
    const propertyOnly: ExtractedListing = {
      title: "Property-only listing",
      propertyName: "Bridges Apartment Homes",
      city: "Salt Lake City",
      state: "UT",
      confidence: "medium",
    };
    const cityOnly: ExtractedListing = {
      title: "City only listing",
      city: "Salt Lake City",
      state: "UT",
      confidence: "low",
    };

    const results = [
      finalizeExtractionResponse(directAddress, null),
      finalizeExtractionResponse(propertyOnly, null),
      finalizeExtractionResponse(cityOnly, null),
    ];

    for (const result of results) {
      expect(result.locationSource).not.toBe("place_lookup");
      expect(result.listing.locationSource).not.toBe("place_lookup");
    }
  });
});
