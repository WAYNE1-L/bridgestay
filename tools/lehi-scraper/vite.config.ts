import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/client",
  build: {
    outDir: path.resolve(__dirname, "public"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3700",
    },
  },
});
