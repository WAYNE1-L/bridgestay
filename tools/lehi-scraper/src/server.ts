/**
 * Lehi Scraper viewer server.
 *   npm run viewer    — http://localhost:3700
 *
 * Serves the React build from `public/` and an /api/* router backed by
 * SQLite. No auth — local-only tool.
 */

import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { db } from "./db.ts";
import { createApiRouter } from "./api.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3700);
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const app = express();
app.use(express.json());
app.use("/api", createApiRouter(db));

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  // SPA fallback for client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res
      .status(200)
      .send(
        `<h1>Lehi Scraper viewer</h1><p>API is up at <code>/api/*</code>. ` +
          `Run <code>npm run build</code> in <code>tools/lehi-scraper/</code> ` +
          `to build the React UI into <code>public/</code>.</p>`
      );
  });
}

app.listen(PORT, () => {
  console.log(`[viewer] Lehi Scraper viewer http://localhost:${PORT}`);
});
