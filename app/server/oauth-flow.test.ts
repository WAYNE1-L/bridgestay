import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import express from "express";
import { registerOAuthRoutes } from "./_core/oauth";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("axios");
vi.mock("./_core/env", () => ({
  ENV: {
    googleClientId: "test-client-id",
    googleClientSecret: "test-client-secret",
    appUrl: "http://localhost:3000",
    cookieSecret: "test-jwt-secret",
    isProduction: false,
  },
}));
vi.mock("./db", () => ({
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getApartments: vi.fn().mockResolvedValue([]),
  getApartmentById: vi.fn().mockResolvedValue(null),
  incrementApartmentViews: vi.fn().mockResolvedValue(undefined),
  createApartment: vi.fn().mockResolvedValue(101),
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
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
    authenticateRequest: vi.fn().mockRejectedValue(new Error("no session")),
  },
}));

import * as db from "./db";
import axios from "axios";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    headers: {},
    cookies: {},
    protocol: "http",
    ip: "127.0.0.1",
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const cookies: Record<string, { value: string; options: Record<string, unknown> }> = {};
  const clearedCookies: string[] = [];
  let redirectUrl: string | null = null;
  let statusCode = 200;
  let jsonBody: unknown = null;

  const res = {
    cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
      cookies[name] = { value, options };
      return res;
    }),
    clearCookie: vi.fn((name: string) => {
      clearedCookies.push(name);
      return res;
    }),
    redirect: vi.fn((code: number, url: string) => {
      statusCode = code;
      redirectUrl = url;
      return res;
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      jsonBody = body;
      return res;
    }),
    _state: { get cookies() { return cookies; }, get clearedCookies() { return clearedCookies; }, get redirectUrl() { return redirectUrl; }, get statusCode() { return statusCode; }, get jsonBody() { return jsonBody; } },
  } as unknown as Response & { _state: { cookies: typeof cookies; clearedCookies: typeof clearedCookies; redirectUrl: string | null; statusCode: number; jsonBody: unknown } };

  return res;
}

// Helper to call the /api/oauth/login handler directly
function getLoginHandler() {
  const handlers: Array<(req: Request, res: Response) => void> = [];
  const fakeApp = {
    get: (path: string, handler: (req: Request, res: Response) => void) => {
      if (path === "/api/oauth/login") handlers.push(handler);
    },
  } as unknown as ReturnType<typeof express>;
  registerOAuthRoutes(fakeApp);
  return handlers[0]!;
}

function getCallbackHandler() {
  const handlers: Array<(req: Request, res: Response) => void> = [];
  const fakeApp = {
    get: (path: string, handler: (req: Request, res: Response) => void) => {
      if (path === "/api/oauth/callback") handlers.push(handler);
    },
  } as unknown as ReturnType<typeof express>;
  registerOAuthRoutes(fakeApp);
  return handlers[0]!;
}

function getAllHandlers() {
  const map: Record<string, (req: Request, res: Response) => void> = {};
  const fakeApp = {
    get: (path: string, handler: (req: Request, res: Response) => void) => {
      map[path] = handler;
    },
  } as unknown as ReturnType<typeof express>;
  registerOAuthRoutes(fakeApp);
  return map;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OAuth flow — /api/oauth/login", () => {
  it("T1: redirects to accounts.google.com with correct params and sets state cookie", async () => {
    const handler = getLoginHandler();
    const req = makeReq();
    const res = makeRes() as ReturnType<typeof makeRes>;

    await handler(req, res as unknown as Response);

    const { _state } = res as unknown as { _state: ReturnType<typeof makeRes>["_state"] };
    expect(_state.statusCode).toBe(302);
    expect(_state.redirectUrl).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(_state.redirectUrl).toContain("client_id=test-client-id");
    expect(_state.redirectUrl).toContain("redirect_uri=");
    expect(_state.redirectUrl).toContain("response_type=code");

    // State cookie must be set
    expect(_state.cookies["oauth_state"]).toBeDefined();
    expect(typeof _state.cookies["oauth_state"]!.value).toBe("string");
    expect(_state.cookies["oauth_state"]!.value.length).toBeGreaterThan(0);
  });
});

describe("OAuth flow — /api/oauth/callback", () => {
  it("T2: valid code+state → calls db.upsertUser with google data, sets session cookie, redirects to /", async () => {
    const handler = getCallbackHandler();
    const state = "abc123";
    const req = makeReq({
      query: { code: "auth-code-xyz", state },
      headers: { cookie: `oauth_state=${state}` },
    });
    const res = makeRes();

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "goog-access-token", expires_in: 3600, id_token: "x", scope: "openid email", token_type: "Bearer" },
    });
    vi.mocked(axios.get).mockResolvedValue({
      data: { sub: "google-sub-123", email: "user@example.com", name: "Google User" },
    });

    await handler(req, res as unknown as Response);

    const { _state } = res as unknown as { _state: ReturnType<typeof makeRes>["_state"] };
    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: "google-sub-123", email: "user@example.com", loginMethod: "google" })
    );
    expect(_state.cookies["app_session_id"]).toBeDefined();
    expect(_state.statusCode).toBe(302);
    expect(_state.redirectUrl).toBe("/");
  });

  it("T3: callback with mismatched state → 400", async () => {
    const handler = getCallbackHandler();
    const req = makeReq({
      query: { code: "auth-code", state: "wrong-state" },
      headers: { cookie: "oauth_state=correct-state" },
    });
    const res = makeRes();

    await handler(req, res as unknown as Response);

    const { _state } = res as unknown as { _state: ReturnType<typeof makeRes>["_state"] };
    expect(_state.statusCode).toBe(400);
    expect(db.upsertUser).not.toHaveBeenCalled();
  });

  it("T4: callback with missing code → 400", async () => {
    const handler = getCallbackHandler();
    const req = makeReq({
      query: { state: "some-state" },
      headers: { cookie: "oauth_state=some-state" },
    });
    const res = makeRes();

    await handler(req, res as unknown as Response);

    const { _state } = res as unknown as { _state: ReturnType<typeof makeRes>["_state"] };
    expect(_state.statusCode).toBe(400);
    expect(db.upsertUser).not.toHaveBeenCalled();
  });
});

describe("auth.me tRPC route", () => {
  it("T5: auth.me returns ctx.user as-is", async () => {
    const mockUser = {
      id: 7,
      openId: "test-open-id",
      email: "me@example.com",
      name: "Me User",
      loginMethod: "google" as const,
      role: "landlord",
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user: mockUser,
      req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();

    expect(result).toEqual(mockUser);
  });
});
