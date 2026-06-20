import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env vars (VITE_*) from the repo root .env so the whole monorepo shares it.
export default defineConfig({
  plugins: [react()],
  envDir: resolve(__dirname, "../.."),
  server: {
    port: 5173,
    host: true,
  },
});
