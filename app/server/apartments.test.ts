import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
      status: "active",
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
    status: "active",
    acceptsInternationalStudents: true,
    noSsnRequired: true,
    noCreditCheckRequired: true,
  }),
  incrementApartmentViews: vi.fn().mockResolvedValue(undefined),
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
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthenticatedContext(role: "user" | "admin" | "landlord" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
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
