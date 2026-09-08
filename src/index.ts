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

// Serve frontend: Vite Dev Server proxy in development, static dist/public in production
const isDev = process.env.NODE_ENV !== "production";
const staticDir = existsSync(join(import.meta.dir, "../dist/public"))
  ? join(import.meta.dir, "../dist/public")
  : null;

app.get("*", async ({ request }) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // In development, attempt to proxy non-API requests to Vite Dev Server (port 5173) for instant HMR
  if (isDev) {
    try {
      const viteUrl = `http://localhost:5173${pathname}${url.search}`;
      const viteRes = await fetch(viteUrl, {
        method: request.method,
        headers: request.headers,
      });
      if (viteRes.status < 500) {
        return new Response(viteRes.body, {
          status: viteRes.status,
          headers: viteRes.headers,
        });
      }
    } catch (e) {
      // Vite dev server not currently reachable, fallback to static files below
    }
  }

  // Static files with correct MIME types & SPA fallback
  if (staticDir) {
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

    const indexPath = join(staticDir, "index.html");
    if (existsSync(indexPath)) {
      return Bun.file(indexPath);
    }
  }

  return "Neko-Router backend is running. Run `bun run dev` or `bun run build` to view frontend.";
});

app.listen({ port, hostname: host }, () => {
  console.log(`🐱 Neko-Router AI Gateway is running at http://${host}:${port}`);
  console.log(`📖 Interactive OpenAPI Docs at http://${host}:${port}/swagger`);
});

export type App = typeof app;
