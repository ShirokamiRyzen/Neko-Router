import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { initDatabase } from "./db";
import { authRoutes } from "./routes/auth";
import { keysRoutes } from "./routes/keys";
import { routerApiKeysRoutes } from "./routes/api-keys";
import { upstreamRoutes } from "./routes/upstreams";
import { telemetryRoutes } from "./routes/telemetry";
import { adminRoutes } from "./routes/admin";
import { proxyRoutes } from "./routes/proxy";
import { existsSync, statSync } from "fs";
import { join } from "path";

// Initialize database schema and default PIN
await initDatabase();

const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "anthropic-version", "anthropic-beta"],
    })
  )
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Neko-Router API Gateway",
          version: "1.0.0",
          description:
            "Ultra-low latency AI Gateway & Router for OpenAI and Anthropic compatible endpoints with real-time stream passthrough and token telemetry.",
        },
        tags: [
          { name: "Proxy", description: "AI proxy endpoints (OpenAI & Anthropic)" },
          { name: "Auth", description: "Authentication & PIN management" },
          { name: "Keys", description: "Client access keys management" },
          { name: "Router Keys", description: "Router integration API keys management" },
          { name: "Upstreams", description: "Upstream provider keys management" },
          { name: "Telemetry", description: "Token usage and latency metrics" },
          { name: "Admin", description: "Database backup, restore, and system metrics" },
        ],
      },
    })
  )
  // Health & Info Endpoint
  .get("/health", () => ({ status: "ok", timestamp: Date.now() }))
  // Register Route Modules
  .use(authRoutes)
  .use(keysRoutes)
  .use(routerApiKeysRoutes)
  .use(upstreamRoutes)
  .use(telemetryRoutes)
  .use(adminRoutes)
  .use(proxyRoutes);

// Serve frontend static assets if built
const staticDir = existsSync(join(import.meta.dir, "../dist/public"))
  ? join(import.meta.dir, "../dist/public")
  : existsSync(join(import.meta.dir, "../client/dist"))
  ? join(import.meta.dir, "../client/dist")
  : null;

if (staticDir) {
  // Static files with correct MIME types & SPA fallback
  app.get("*", ({ request }) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if directly requested static file exists in staticDir
    if (pathname !== "/") {
      const filePath = join(staticDir, pathname);
      if (existsSync(filePath)) {
        try {
          if (!statSync(filePath).isDirectory()) {
            return Bun.file(filePath);
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // SPA fallback for client-side routing
    const indexPath = join(staticDir, "index.html");
    if (existsSync(indexPath)) {
      return Bun.file(indexPath);
    }
    return "Neko-Router backend is running. Build frontend to view the UI.";
  });
}

app.listen({ port, hostname: host }, () => {
  console.log(`🐱 Neko-Router AI Gateway is running at http://${host}:${port}`);
  console.log(`📖 Interactive OpenAPI Docs at http://${host}:${port}/swagger`);
});

export type App = typeof app;
