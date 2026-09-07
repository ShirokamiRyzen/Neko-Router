import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { getJwtSecret, validateApiKey } from "../services/auth";
import type { ApiKey } from "../db/schema";

export const authMiddleware = new Elysia({ name: "auth-guard" })
  .use(
    jwt({
      name: "jwt",
      secret: getJwtSecret(),
    })
  )
  .derive({ as: "scoped" }, async ({ request, cookie, jwt }) => {
    let isAdmin = false;
    let apiKey: ApiKey | null = null;

    // 1. Check HTTP-only session cookie for logged-in web UI
    const sessionCookie = cookie?.session;
    if (sessionCookie?.value) {
      try {
        const payload = await jwt.verify(sessionCookie.value as string);
        if (payload && payload.role === "admin") {
          isAdmin = true;
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Check Authorization Header (Bearer token for admin JWT or nr-api-... key)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      // Try JWT first
      try {
        const payload = await jwt.verify(token);
        if (payload && payload.role === "admin") {
          isAdmin = true;
        }
      } catch (e) {
        // Not a JWT
      }

      // If not admin JWT, check if it's a Router Integration API Key (nr-api-...)
      if (!isAdmin) {
        apiKey = await validateApiKey(token);
      }
    }

    // 3. Check x-api-key or x-router-key Header
    const xApiKey = request.headers.get("x-api-key") || request.headers.get("x-router-key");
    if (xApiKey && !apiKey && !isAdmin) {
      apiKey = await validateApiKey(xApiKey.trim());
    }

    return {
      isAdmin,
      apiKey,
      isAuthorized: isAdmin || !!apiKey,
    };
  });
