import "dotenv/config";

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../stripe/webhook";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function getMissingProductionEnv() {
  return [
    !ENV.databaseUrl && "DATABASE_URL",
    !ENV.cookieSecret && "JWT_SECRET",
    !ENV.googleClientId && "GOOGLE_CLIENT_ID",
    !ENV.googleClientSecret && "GOOGLE_CLIENT_SECRET",
    !ENV.appUrl && "APP_URL",
    !ENV.ownerOpenId && "OWNER_OPEN_ID",
  ].filter(Boolean);
}

async function startServer() {
  if (ENV.isProduction) {
    const missing = getMissingProductionEnv();
    if (missing.length > 0) {
      throw new Error(
        `Missing required production env vars: ${missing.join(", ")}`
      );
    }
  }

  const app = express();
  const server = createServer(app);
  
  // Stripe webhook MUST be registered BEFORE express.json() to get raw body
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check — must be before tRPC and static middleware
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", ts: Date.now() });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = ENV.isProduction
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (!ENV.isProduction && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
