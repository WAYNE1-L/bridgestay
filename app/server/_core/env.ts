export const ENV = {
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  appUrl: process.env.APP_URL ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Gemini: GEMINI_API_KEY is the canonical name; BUILT_IN_FORGE_API_KEY is the legacy fallback.
  // Both are raw Google AI Studio keys — no proxy involved.
  // IMPORTANT: use || not ?? so that a blank GEMINI_API_KEY= line in .env
  // falls through to BUILT_IN_FORGE_API_KEY instead of stopping at "".
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.BUILT_IN_FORGE_API_KEY || "",
  // Forge proxy (legacy): only used when BUILT_IN_FORGE_API_URL is explicitly set.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "", // kept so existing usages compile
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
