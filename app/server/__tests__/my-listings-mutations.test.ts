import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";

// Mock db module before importing appRouter
vi.mock("../db", () => ({
  getApartmentById: vi.fn(),
  updateApartment: vi.fn(),
  deleteApartment: vi.fn(),
  getApartments: vi.fn(),
  getAllApartments: vi.fn(),
  createApartment: vi.fn(),
  getLandlordApartments: vi.fn(),
  saveApartment: vi.fn(),
  unsaveApartment: vi.fn(),
  getSavedApartments: vi.fn(),
  isApartmentSaved: vi.fn(),
  incrementApartmentViews: vi.fn(),
  getListingReportSummary: vi.fn(),
  getListingReportsForApartment: vi.fn(),
  createListingReport: vi.fn(),
}));

// Mock storage to avoid S3 calls
vi.mock("../storage", () => ({
  storagePut: vi.fn(),
}));

// Mock stripe checkout
vi.mock("../stripe/checkout", () => ({
  createMoveInCheckoutSession: vi.fn(),
  createRentCheckoutSession: vi.fn(),
  getCheckoutSession: vi.fn(),
}));

// Mock stripe products
vi.mock("../stripe/products", () => ({
  calculateMoveInCost: vi.fn(),
}));

// Mock sdk to avoid auth side-effects
vi.mock("../_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

import * as db from "../db";
import { appRouter } from "../routers";

const mockDb = db as Record<string, ReturnType<typeof vi.fn>>;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "google",
    role: "landlord",
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeApartment(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    landlordId: 1,
    title: "Test Apartment",
    description: "A nice place",
    propertyType: "apartment",
    address: "123 Main St",
    city: "Boston",
    state: "MA",
    zipCode: "02101",
    latitude: null,
    longitude: null,
    nearbyUniversities: null,
    distanceToUniversity: null,
    bedrooms: 2,
    bathrooms: "1.0",
    squareFeet: 800,
    floor: null,
    totalFloors: null,
    monthlyRent: "1500.00",
    securityDeposit: "1500.00",
    applicationFee: null,
    petDeposit: null,
    parkingFee: null,
    petPolicy: "no_pets",
    amenities: null,
    utilitiesIncluded: null,
    images: null,
    status: "published",
    viewCount: 0,
    outreachStatus: "not_contacted",
    outreachNotes: null,
    outreachLastContactedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCaller(user: User | null) {
  return appRouter.createCaller({
    user,
    req: { headers: {}, ip: "127.0.0.1" } as any,
    res: {} as any,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.updateApartment.mockResolvedValue(undefined);
  mockDb.deleteApartment.mockResolvedValue(undefined);
});

// ─── apartments.update ────────────────────────────────────────────────────────

describe("apartments.update", () => {
  it("succeeds for owner", async () => {
    const owner = makeUser({ id: 1, role: "landlord" });
    const apt = makeApartment({ landlordId: 1, status: "published" });
    mockDb.getApartmentById.mockResolvedValue(apt);

    const caller = makeCaller(owner);
    const result = await caller.apartments.update({ id: 100, data: { status: "draft" } });

    expect(result).toEqual({ success: true });
    expect(mockDb.updateApartment).toHaveBeenCalledWith(100, expect.objectContaining({ status: "draft" }));
  });

  it("throws FORBIDDEN for non-owner non-admin", async () => {
    const stranger = makeUser({ id: 99, role: "user" });
    const apt = makeApartment({ landlordId: 1 });
    mockDb.getApartmentById.mockResolvedValue(apt);

    const caller = makeCaller(stranger);
    await expect(caller.apartments.update({ id: 100, data: { status: "draft" } }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── apartments.markRented ────────────────────────────────────────────────────

describe("apartments.markRented", () => {
  it("succeeds for owner and sets status to archived", async () => {
    const owner = makeUser({ id: 1, role: "landlord" });
    const apt = makeApartment({ landlordId: 1, status: "published" });
    mockDb.getApartmentById.mockResolvedValue(apt);

    const caller = makeCaller(owner);
    const result = await caller.apartments.markRented({ id: 100 });

    expect(result).toEqual({ success: true, status: "archived" });
    expect(mockDb.updateApartment).toHaveBeenCalledWith(100, { status: "archived" });
  });

  it("is idempotent — calling twice returns same result without error", async () => {
    const owner = makeUser({ id: 1, role: "landlord" });
    // Second call: apartment is already archived
    const archivedApt = makeApartment({ landlordId: 1, status: "archived" });
    mockDb.getApartmentById.mockResolvedValue(archivedApt);

    const caller = makeCaller(owner);
    const result1 = await caller.apartments.markRented({ id: 100 });
    const result2 = await caller.apartments.markRented({ id: 100 });

    expect(result1).toEqual({ success: true, status: "archived" });
    expect(result2).toEqual({ success: true, status: "archived" });
    expect(mockDb.updateApartment).toHaveBeenCalledTimes(2);
  });

  it("throws FORBIDDEN for non-owner non-admin", async () => {
    const stranger = makeUser({ id: 99, role: "user" });
    const apt = makeApartment({ landlordId: 1 });
    mockDb.getApartmentById.mockResolvedValue(apt);

    const caller = makeCaller(stranger);
    await expect(caller.apartments.markRented({ id: 100 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("succeeds for admin regardless of ownership", async () => {
    const admin = makeUser({ id: 50, role: "admin" });
    const apt = makeApartment({ landlordId: 1 });
    mockDb.getApartmentById.mockResolvedValue(apt);

    const caller = makeCaller(admin);
    const result = await caller.apartments.markRented({ id: 100 });

    expect(result).toEqual({ success: true, status: "archived" });
  });

  it("throws NOT_FOUND for missing apartment", async () => {
    const owner = makeUser({ id: 1, role: "landlord" });
    mockDb.getApartmentById.mockResolvedValue(null);

    const caller = makeCaller(owner);
    await expect(caller.apartments.markRented({ id: 999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ─── apartments.delete ────────────────────────────────────────────────────────

describe("apartments.delete", () => {
  it("succeeds for owner — listing is hard-deleted", async () => {
    const owner = makeUser({ id: 1, role: "landlord" });
    const apt = makeApartment({ landlordId: 1 });
    mockDb.getApartmentById.mockResolvedValueOnce(apt).mockResolvedValueOnce(null);

    const caller = makeCaller(owner);
    const result = await caller.apartments.delete({ id: 100 });
    expect(result).toEqual({ success: true });
    expect(mockDb.deleteApartment).toHaveBeenCalledWith(100);

    // Subsequent getById returns NOT_FOUND (simulated via null)
    await expect(caller.apartments.getById({ id: 100 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN for non-owner non-admin", async () => {
    const stranger = makeUser({ id: 99, role: "user" });
    const apt = makeApartment({ landlordId: 1 });
    mockDb.getApartmentById.mockResolvedValue(apt);

    const caller = makeCaller(stranger);
    await expect(caller.apartments.delete({ id: 100 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
