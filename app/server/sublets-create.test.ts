import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

vi.mock("./db", () => ({
  getApartments: vi.fn().mockResolvedValue([]),
  getApartmentById: vi.fn().mockResolvedValue(null),
  incrementApartmentViews: vi.fn().mockResolvedValue(undefined),
  createApartment: vi.fn().mockResolvedValue(101),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  // stubs for other procedures used by the router
  getApplicationById: vi.fn().mockResolvedValue(undefined),
  createApplication: vi.fn().mockResolvedValue(undefined),
  getDocumentById: vi.fn().mockResolvedValue(undefined),
  updateDocumentVerification: vi.fn().mockResolvedValue(undefined),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  getUserDocuments: vi.fn().mockResolvedValue([]),
  getStudentProfile: vi.fn().mockResolvedValue(null),
  getLandlordProfile: vi.fn().mockResolvedValue(null),
  getStudentStats: vi.fn().mockResolvedValue({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, savedApartments: 0 }),
  getLandlordStats: vi.fn().mockResolvedValue(null),
  getUniversities: vi.fn().mockResolvedValue([]),
  getUserPayments: vi.fn().mockResolvedValue([]),
  getLandlordPayments: vi.fn().mockResolvedValue([]),
  getAllApartments: vi.fn().mockResolvedValue([]),
  getListingReportSummary: vi.fn().mockResolvedValue([]),
  getListingReportsForApartment: vi.fn().mockResolvedValue([]),
  updateApartment: vi.fn().mockResolvedValue(undefined),
  createListingReport: vi.fn().mockResolvedValue(undefined),
}));

const BASE_INPUT = {
  titleEn: "Nice Studio Near Campus",
  address: "123 University Ave",
  city: "Salt Lake City",
  state: "UT",
  zipCode: "84102",
  bedrooms: 0,
  bathrooms: 1,
  monthlyRent: 950,
  securityDeposit: 950,
  availableFrom: "2026-05-15T00:00:00.000Z",
  subleaseEndDate: "2026-08-15T00:00:00.000Z",
};

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAuthCtx(id = 42): TrpcContext {
  return {
    user: {
      id,
      openId: "test-open-id",
      email: "user@test.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("sublets.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.mocked(db.createApartment).mockResolvedValue(101);
  });

  // T1: ctx.user present → uses ctx.user.id as landlordId
  it("T1: uses ctx.user.id when user is authenticated", async () => {
    const ctx = makeAuthCtx(42);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sublets.create(BASE_INPUT);

    expect(result).toEqual({ id: 101, success: true });
    expect(db.createApartment).toHaveBeenCalledWith(
      expect.objectContaining({ landlordId: 42 })
    );
    expect(db.getUserByOpenId).not.toHaveBeenCalled();
  });

  // T2: no user + DEV_DEMO_MODE=true + db has demo user → uses that id + console.warn
  it("T2: DEV_DEMO_MODE with existing demo user uses that user id and warns", async () => {
    vi.stubEnv("DEV_DEMO_MODE", "true");
    vi.mocked(db.getUserByOpenId).mockResolvedValue({
      id: 77,
      openId: "demo-sublet-landlord",
      name: "Demo Sublet Landlord",
      email: "demo-sublet@bridgestay.dev",
      loginMethod: "demo",
      role: "landlord",
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sublets.create(BASE_INPUT);

    expect(result).toEqual({ id: 101, success: true });
    expect(db.createApartment).toHaveBeenCalledWith(
      expect.objectContaining({ landlordId: 77 })
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("DEV_DEMO_MODE"));
    expect(db.upsertUser).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // T3: no user + DEV_DEMO_MODE=true + db empty → inserts demo user
  it("T3: DEV_DEMO_MODE with no demo user in db inserts one then uses it", async () => {
    vi.stubEnv("DEV_DEMO_MODE", "true");
    // First call returns undefined (not found), second call (after upsert) returns the user
    vi.mocked(db.getUserByOpenId)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        id: 99,
        openId: "demo-sublet-landlord",
        name: "Demo Sublet Landlord",
        email: "demo-sublet@bridgestay.dev",
        loginMethod: "demo",
        role: "landlord",
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sublets.create(BASE_INPUT);

    expect(result).toEqual({ id: 101, success: true });
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: "demo-sublet-landlord", role: "landlord" })
    );
    expect(db.createApartment).toHaveBeenCalledWith(
      expect.objectContaining({ landlordId: 99 })
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no demo user found"));

    warnSpy.mockRestore();
  });

  // T4: no user + DEV_DEMO_MODE != 'true' → UNAUTHORIZED
  it("T4: throws UNAUTHORIZED when unauthenticated and DEV_DEMO_MODE is not set", async () => {
    vi.stubEnv("DEV_DEMO_MODE", "false");
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sublets.create(BASE_INPUT)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(db.createApartment).not.toHaveBeenCalled();
  });

  // T5: field mapping — titleEn→title, contact.wechatId→wechatContact, dates as Date objects
  it("T5: maps titleEn to title, contact.wechatId to wechatContact, and transforms date strings", async () => {
    const ctx = makeAuthCtx(1);
    const caller = appRouter.createCaller(ctx);

    await caller.sublets.create({
      ...BASE_INPUT,
      titleEn: "My Sublet Title",
      contact: { wechatId: "my_wechat_123" },
    });

    expect(db.createApartment).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "My Sublet Title",
        wechatContact: "my_wechat_123",
        isSublease: true,
        propertyType: "apartment",
        availableFrom: expect.any(Date),
        subleaseEndDate: expect.any(Date),
      })
    );
  });
});

describe("sublets.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T6: list() forces isSublease=true regardless of input filter
  it("T6: always passes isSublease=true to db.getApartments regardless of input", async () => {
    vi.mocked(db.getApartments).mockResolvedValue([]);
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    // Caller tries to pass isSublease=false — should still be forced to true
    await caller.sublets.list({ isSublease: false });

    expect(db.getApartments).toHaveBeenCalledWith(
      expect.objectContaining({ isSublease: true }),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("passes other filters through to db.getApartments alongside forced isSublease=true", async () => {
    vi.mocked(db.getApartments).mockResolvedValue([]);
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.sublets.list({ city: "Salt Lake City", minPrice: 800 });

    expect(db.getApartments).toHaveBeenCalledWith(
      expect.objectContaining({ isSublease: true, city: "Salt Lake City", minPrice: 800 }),
      expect.any(Number),
      expect.any(Number)
    );
  });
});

describe("sublets.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when apartment is not found", async () => {
    vi.mocked(db.getApartmentById).mockResolvedValue(undefined);
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sublets.getById({ id: 999 });
    expect(result).toBeNull();
  });

  it("returns null when apartment exists but is not a sublease", async () => {
    vi.mocked(db.getApartmentById).mockResolvedValue({
      id: 5,
      isSublease: false,
    } as any);
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sublets.getById({ id: 5 });
    expect(result).toBeNull();
  });

  it("returns the apartment when it is a sublease", async () => {
    const mockApartment = {
      id: 10,
      title: "Sublet Near UofU",
      isSublease: true,
      monthlyRent: "950.00",
    };
    vi.mocked(db.getApartmentById).mockResolvedValue(mockApartment as any);
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sublets.getById({ id: 10 });
    expect(result).toEqual(mockApartment);
  });
});
