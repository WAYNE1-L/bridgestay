import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// ─── DEV DEMO MODE ───────────────────────────────────────────────────────────
// A synthetic landlord user injected ONLY when:
//   NODE_ENV !== "production"  AND  DEV_DEMO_MODE=true in .env
// This lets the ImportListing flow be tested locally without real OAuth.
// In production ENV.isProduction is always true, so this block is never reached.
const DEMO_USER: User = {
  id: 9999,
  openId: "demo-landlord-local",
  name: "Demo Landlord",
  email: "demo@bridgestay.dev",
  loginMethod: "demo",
  role: "landlord",
  stripeCustomerId: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastSignedIn: new Date(),
};

const DEV_DEMO_MODE =
  !ENV.isProduction && process.env.DEV_DEMO_MODE === "true";

if (DEV_DEMO_MODE) {
  console.warn(
    "[DEV_DEMO_MODE] Auth bypass active — all unauthenticated requests " +
    "will be treated as demo landlord (id=9999). " +
    "Set DEV_DEMO_MODE=false or NODE_ENV=production to disable."
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // DEV DEMO MODE: fall back to synthetic landlord when auth is unavailable.
  // Never activates in production (ENV.isProduction guard above).
  if (!user && DEV_DEMO_MODE) {
    user = DEMO_USER;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
