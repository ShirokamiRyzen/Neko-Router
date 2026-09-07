import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Root Vite configuration for frontend/
export default defineConfig({
  root: "frontend",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/v1": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/swagger": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});
