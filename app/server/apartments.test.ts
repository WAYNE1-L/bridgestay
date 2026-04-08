import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the database module
vi.mock("./db", () => ({
  getApartments: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "Modern Studio Near Campus",
      description: "Beautiful studio apartment",
      propertyType: "studio",
      address: "123 University Ave",
      city: "Boston",
      state: "MA",
      zipCode: "02115",
      bedrooms: 0,
      bathrooms: "1.0",
      monthlyRent: "1500.00",
      securityDeposit: "1500.00",
      status: "published",
      acceptsInternationalStudents: true,
      noSsnRequired: true,
      noCreditCheckRequired: true,
    },
  ]),
  getApartmentById: vi.fn().mockResolvedValue({
    id: 1,
    title: "Modern Studio Near Campus",
    description: "Beautiful studio apartment",
    propertyType: "studio",
    address: "123 University Ave",
    city: "Boston",
    state: "MA",
    zipCode: "02115",
    bedrooms: 0,
    bathrooms: "1.0",
    monthlyRent: "1500.00",
    securityDeposit: "1500.00",
    landlordId: 2,
    status: "published",
    acceptsInternationalStudents: true,
    noSsnRequired: true,
    noCreditCheckRequired: true,
  }),
  incrementApartmentViews: vi.fn().mockResolvedValue(undefined),
  createApartment: vi.fn().mockResolvedValue(42),
  createListingReport: vi.fn().mockResolvedValue(99),
  getAllApartments: vi.fn().mockResolvedValue([]),
  getListingReportSummary: vi.fn().mockResolvedValue([]),
  getListingReportsForApartment: vi.fn().mockResolvedValue([]),
  updateApartment: vi.fn().mockResolvedValue(undefined),
  getApplicationById: vi.fn().mockResolvedValue(undefined),
  createApplication: vi.fn().mockResolvedValue(123),
  getDocumentById: vi.fn().mockResolvedValue(undefined),
  updateDocumentVerification: vi.fn().mockResolvedValue(undefined),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  getUserDocuments: vi.fn().mockResolvedValue([]),
  getStudentProfile: vi.fn().mockResolvedValue(null),
  getLandlordProfile: vi.fn().mockResolvedValue(null),
  getStudentStats: vi.fn().mockResolvedValue({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    savedApartments: 0,
  }),
  getLandlordStats: vi.fn().mockResolvedValue(null),
  getUniversities: vi.fn().mockResolvedValue([]),
  getUserPayments: vi.fn().mockResolvedValue([]),
  getLandlordPayments: vi.fn().mockResolvedValue([]),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip: "203.0.113.10",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthenticatedContext(role: "user" | "admin" | "landlord" = "user", id = 1): TrpcContext {
  return {
    user: {
      id,
      openId: "test-user-123",
      email: "student@university.edu",
      name: "Test Student",
      loginMethod: "manus",
      role,
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { origin: "http://localhost:3000" },
      ip: "198.51.100.20",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("apartments router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("apartments.list", () => {
    it("returns apartments list for public users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.list({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("title");
      expect(result[0]).toHaveProperty("monthlyRent");
    });

    it("returns apartments with filters applied", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.list({
        city: "Boston",
        minPrice: 1000,
        maxPrice: 2000,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns only published listings for the public list path", async () => {
      vi.mocked(db.getApartments).mockResolvedValueOnce([
        {
          id: 2,
          title: "Published Listing",
          monthlyRent: "1800.00",
          status: "published",
        },
        {
          id: 3,
          title: "Another Published Listing",
          monthlyRent: "2100.00",
          status: "published",
        },
      ] as any);
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.list({});

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((listing) => listing.status === "published")).toBe(true);
      expect(result.some((listing) => listing.status === "archived")).toBe(false);
    });
  });

  describe("apartments.create", () => {
    it("defaults new listings to draft for admins", async () => {
      const ctx = createAuthenticatedContext("admin", 9);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.create({
        title: "Admin Imported Listing",
        propertyType: "apartment",
        address: "123 Main St",
        city: "Boston",
        state: "MA",
        zipCode: "02115",
        bedrooms: 2,
        bathrooms: 1,
        monthlyRent: 1800,
        securityDeposit: 900,
        availableFrom: "2026-05-01T00:00:00.000Z",
      });

      expect(result).toMatchObject({ success: true, status: "draft" });
      expect(db.createApartment).toHaveBeenCalledWith(
        expect.objectContaining({
          landlordId: 9,
          status: "draft",
        })
      );
    });
  });

  describe("apartments.getById", () => {
    it("returns apartment details for public users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.getById({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.title).toBe("Modern Studio Near Campus");
      expect(result?.acceptsInternationalStudents).toBe(true);
      expect(result?.noSsnRequired).toBe(true);
    });

    it("allows public users to access published listing details", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValueOnce({
        id: 2,
        title: "Published Listing",
        description: "Visible apartment",
        propertyType: "apartment",
        address: "2 Active St",
        city: "Boston",
        state: "MA",
        zipCode: "02115",
        bedrooms: 1,
        bathrooms: "1.0",
        monthlyRent: "1800.00",
        securityDeposit: "1800.00",
        landlordId: 2,
        status: "published",
        acceptsInternationalStudents: true,
        noSsnRequired: true,
        noCreditCheckRequired: true,
      } as any);
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.getById({ id: 2 });

      expect(result?.id).toBe(2);
      expect(result?.status).toBe("published");
    });

    it("returns NOT_FOUND for public users accessing archived listing details", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValueOnce({
        id: 3,
        title: "Archived Listing",
        description: "Hidden apartment",
        propertyType: "apartment",
        address: "3 Hidden St",
        city: "Boston",
        state: "MA",
        zipCode: "02115",
        bedrooms: 1,
        bathrooms: "1.0",
        monthlyRent: "1800.00",
        securityDeposit: "1800.00",
        landlordId: 2,
        status: "archived",
        acceptsInternationalStudents: true,
        noSsnRequired: true,
        noCreditCheckRequired: true,
      } as any);
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.apartments.getById({ id: 3 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect(db.incrementApartmentViews).not.toHaveBeenCalled();
    });

    it("allows admins to access archived listing details", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValueOnce({
        id: 4,
        title: "Archived Admin Listing",
        description: "Admin-visible apartment",
        propertyType: "apartment",
        address: "4 Admin St",
        city: "Boston",
        state: "MA",
        zipCode: "02115",
        bedrooms: 1,
        bathrooms: "1.0",
        monthlyRent: "1800.00",
        securityDeposit: "1800.00",
        landlordId: 2,
        status: "archived",
        acceptsInternationalStudents: true,
        noSsnRequired: true,
        noCreditCheckRequired: true,
      } as any);
      const ctx = createAuthenticatedContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.getById({ id: 4 });

      expect(result?.id).toBe(4);
      expect(result?.status).toBe("archived");
    });

    it("allows owners to access their own archived listing details", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValueOnce({
        id: 5,
        title: "Owner Archived Listing",
        description: "Owner-visible apartment",
        propertyType: "apartment",
        address: "5 Owner St",
        city: "Boston",
        state: "MA",
        zipCode: "02115",
        bedrooms: 1,
        bathrooms: "1.0",
        monthlyRent: "1800.00",
        securityDeposit: "1800.00",
        landlordId: 2,
        status: "archived",
        acceptsInternationalStudents: true,
        noSsnRequired: true,
        noCreditCheckRequired: true,
      } as any);
      const ctx = createAuthenticatedContext("landlord", 2);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.getById({ id: 5 });

      expect(result?.id).toBe(5);
      expect(result?.status).toBe("archived");
    });
  });

  describe("apartments.report", () => {
    it("creates a report for a published listing", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValueOnce({
        id: 6,
        title: "Reportable Listing",
        landlordId: 2,
        status: "published",
      } as any);
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.apartments.report({
        apartmentId: 6,
        reason: "suspicious",
        notes: "This looks duplicated",
      });

      expect(result).toEqual({ success: true, reportId: 99 });
      expect(db.createListingReport).toHaveBeenCalledWith({
        apartmentId: 6,
        reason: "suspicious",
        notes: "This looks duplicated",
      });
    });

    it("rejects reports for archived listings", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValueOnce({
        id: 7,
        title: "Archived Listing",
        landlordId: 2,
        status: "archived",
      } as any);
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.apartments.report({
        apartmentId: 7,
        reason: "other",
        notes: "No longer visible",
      })).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(db.createListingReport).not.toHaveBeenCalled();
    });

    it("throttles repeated public reports for the same listing from the same IP", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValue({
        id: 8,
        title: "Reportable Listing",
        landlordId: 2,
        status: "published",
      } as any);
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await caller.apartments.report({
        apartmentId: 8,
        reason: "suspicious",
        notes: "Spam check",
      });

      await expect(caller.apartments.report({
        apartmentId: 8,
        reason: "suspicious",
        notes: "Spam check again",
      })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    });
  });

  describe("apartments admin moderation routes", () => {
    it("rejects non-admin access to admin-only moderation data", async () => {
      const ctx = createAuthenticatedContext("landlord", 2);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.apartments.adminList({})).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.apartments.reportSummary()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.apartments.listReportsForListing({ apartmentId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.apartments.markInactive({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("admin-only import workflow routes", () => {
    it("rejects non-admin access to listing extraction and AI review endpoints", async () => {
      const ctx = createAuthenticatedContext("landlord", 2);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.listings.extractFromWeChat({ text: "出租 2b1b" })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.listings.geocodeAddress({
        address: "123 Main St",
        city: "Boston",
        state: "MA",
      })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.ai.analyzeListingQuality({ listingJson: "{\"title\":\"test\"}" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("documents authorization", () => {
    it("rejects deleting another user's document", async () => {
      vi.mocked(db.getDocumentById).mockResolvedValueOnce({
        id: 11,
        userId: 99,
      } as any);
      const ctx = createAuthenticatedContext("user", 1);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.documents.delete({ id: 11 })).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(db.deleteDocument).not.toHaveBeenCalled();
    });

    it("rejects landlord verification for a document outside their application", async () => {
      vi.mocked(db.getDocumentById).mockResolvedValueOnce({
        id: 12,
        userId: 7,
        applicationId: 55,
      } as any);
      vi.mocked(db.getApplicationById).mockResolvedValueOnce({
        id: 55,
        landlordId: 999,
      } as any);
      const ctx = createAuthenticatedContext("landlord", 2);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.documents.verify({
        id: 12,
        status: "verified",
      })).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(db.updateDocumentVerification).not.toHaveBeenCalled();
    });

    it("rejects attaching a document to someone else's application", async () => {
      vi.mocked(db.getApplicationById).mockResolvedValueOnce({
        id: 77,
        studentId: 44,
        landlordId: 55,
      } as any);
      const ctx = createAuthenticatedContext("user", 1);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.documents.create({
        applicationId: 77,
        documentType: "passport",
        fileName: "passport.pdf",
        fileKey: "documents/1/passport.pdf",
        fileUrl: "https://example.com/passport.pdf",
        mimeType: "application/pdf",
        fileSize: 1234,
      })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});

describe("documents router", () => {
  describe("documents.myDocuments", () => {
    it("returns empty array for authenticated user with no documents", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.documents.myDocuments();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});

describe("applications router", () => {
  describe("applications.create", () => {
    it("rejects applications for archived listings", async () => {
      vi.mocked(db.getApartmentById).mockResolvedValueOnce({
        id: 13,
        landlordId: 2,
        status: "archived",
      } as any);
      const ctx = createAuthenticatedContext("user", 1);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.applications.create({
        apartmentId: 13,
        desiredMoveInDate: "2026-05-01T00:00:00.000Z",
        desiredLeaseTerm: 12,
      })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(db.createApplication).not.toHaveBeenCalled();
    });
  });
});

describe("stats router", () => {
  describe("stats.student", () => {
    it("returns student stats for authenticated user", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.stats.student();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalApplications");
      expect(result).toHaveProperty("pendingApplications");
      expect(result).toHaveProperty("approvedApplications");
      expect(result).toHaveProperty("savedApartments");
    });
  });

  describe("stats.landlord", () => {
    it("returns null for non-landlord users", async () => {
      const ctx = createAuthenticatedContext("user");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.stats.landlord();

      expect(result).toBeNull();
    });
  });
});

describe("universities router", () => {
  describe("universities.list", () => {
    it("returns universities list for public users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.universities.list({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("payments router", () => {
  describe("payments.myPayments", () => {
    it("returns empty array for user with no payments", async () => {
      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.payments.myPayments();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("payments.landlordPayments", () => {
    it("returns empty array for non-landlord users", async () => {
      const ctx = createAuthenticatedContext("user");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.payments.landlordPayments();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
