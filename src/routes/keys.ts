import { Elysia, t } from "elysia";
import { db } from "../db";
import { clientKeys, apiKeys, telemetryLogs } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, desc, sql } from "drizzle-orm";

function generateKeyString(custom?: string): string {
  if (custom && custom.trim().length > 0) {
    const trimmed = custom.trim();
    if (trimmed.startsWith("sk-neko-")) return trimmed;
    if (trimmed.startsWith("sk-")) {
      return `sk-neko-${trimmed.slice(3)}`;
    }
    return `sk-neko-${trimmed}`;
  }
  const random = Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 28);
  return `sk-neko-${random}`;
}

export const keysRoutes = new Elysia({ prefix: "/api/keys" })
  .use(authMiddleware)
  .onBeforeHandle(({ isAdmin, apiKey, set }) => {
    if (!isAdmin && !apiKey) {
      set.status = 401;
      return { error: "Unauthorized access to Secret Keys" };
    }
  })
  .get("/", () => {
    const list = db
      .select({
        id: clientKeys.id,
        apiKeyId: clientKeys.apiKeyId,
        apiKeyName: apiKeys.name,
        name: clientKeys.name,
        key: clientKeys.key,
        isActive: clientKeys.isActive,
        rateLimit: clientKeys.rateLimit,
        tokenLimit: clientKeys.tokenLimit,
        usedTokens: clientKeys.usedTokens,
        allowedProviders: clientKeys.allowedProviders,
        roundRobinProviders: clientKeys.roundRobinProviders,
        createdAt: clientKeys.createdAt,
        lastUsedAt: clientKeys.lastUsedAt,
        totalRequests: sql<number>`(SELECT count(*) FROM ${telemetryLogs} WHERE ${telemetryLogs.clientKeyId} = ${clientKeys.id})`,
        totalTokens: sql<number>`(SELECT coalesce(sum(${telemetryLogs.totalTokens}), 0) FROM ${telemetryLogs} WHERE ${telemetryLogs.clientKeyId} = ${clientKeys.id})`,
      })
      .from(clientKeys)
      .leftJoin(apiKeys, eq(clientKeys.apiKeyId, apiKeys.id))
      .orderBy(desc(clientKeys.createdAt))
      .all();

    return {
      keys: list.map((k) => {
        let allowedList: string[] = [];
        try {
          if (k.allowedProviders) allowedList = JSON.parse(k.allowedProviders);
        } catch (e) {}

        return {
          ...k,
          apiKeyId: k.apiKeyId || null,
          apiKeyName: k.apiKeyName || "Unassigned",
          allowedProviders: Array.isArray(allowedList) ? allowedList : [],
          roundRobinProviders: k.roundRobinProviders !== 0,
          displayKey:
            k.key.length > 14
              ? `${k.key.slice(0, 10)}...${k.key.slice(-4)}`
              : k.key,
        };
      }),
    };
  })
  .post(
    "/",
    ({ body, set }) => {
      const { name, apiKeyId, customKey, tokenLimit, rateLimit, allowedProviders, roundRobinProviders } = body;
      const keyStr = generateKeyString(customKey);

      // Check duplicate
      const existing = db
        .select()
        .from(clientKeys)
        .where(eq(clientKeys.key, keyStr))
        .get();

      if (existing) {
        set.status = 400;
        return { error: "API Key already exists" };
      }

      let assignedApiKeyId = apiKeyId;
      if (assignedApiKeyId) {
        const parentKey = db.select().from(apiKeys).where(eq(apiKeys.id, assignedApiKeyId)).get();
        if (!parentKey) {
          set.status = 400;
          return { error: "Specified Router API Key not found" };
        }
      } else {
        // Assign to first existing API Key, or create default API Key if none exists
        const firstApiKey = db.select().from(apiKeys).limit(1).get();
        if (firstApiKey) {
          assignedApiKeyId = firstApiKey.id;
        } else {
          const defaultId = "ak_" + crypto.randomUUID().replace(/-/g, "");
          const randomSuffix = Array.from(crypto.getRandomValues(new Uint8Array(20)))
            .map((b) => b.toString(36))
            .join("")
            .slice(0, 24);
          db.insert(apiKeys)
            .values({
              id: defaultId,
              name: "Default API Key",
              key: `nr-api-${randomSuffix}`,
              description: "Default Router Integration Key",
              isActive: 1,
              createdAt: Date.now(),
              lastUsedAt: null,
            })
            .run();
          assignedApiKeyId = defaultId;
        }
      }

      const id = "ck_" + crypto.randomUUID().replace(/-/g, "");
      const now = Date.now();
      // Default: OFF ALL PROVIDERS (empty array)
      const allowedArr = Array.isArray(allowedProviders) ? allowedProviders : [];

      db.insert(clientKeys)
        .values({
          id,
          apiKeyId: assignedApiKeyId,
          name: name.trim(),
          key: keyStr,
          isActive: 1,
          rateLimit: rateLimit ?? null,
          tokenLimit: tokenLimit && tokenLimit > 0 ? tokenLimit : null,
          usedTokens: 0,
          allowedProviders: JSON.stringify(allowedArr),
          roundRobinProviders: roundRobinProviders !== false ? 1 : 0,
          createdAt: now,
          lastUsedAt: null,
        })
        .run();

      const parentKeyRecord = db.select().from(apiKeys).where(eq(apiKeys.id, assignedApiKeyId)).get();

      return {
        success: true,
        key: {
          id,
          apiKeyId: assignedApiKeyId,
          apiKeyName: parentKeyRecord?.name || "Default API Key",
          name: name.trim(),
          key: keyStr,
          isActive: 1,
          rateLimit: rateLimit ?? null,
          tokenLimit: tokenLimit && tokenLimit > 0 ? tokenLimit : null,
          usedTokens: 0,
          allowedProviders: allowedArr,
          roundRobinProviders: roundRobinProviders !== false,
          createdAt: now,
        },
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        apiKeyId: t.Optional(t.String()),
        customKey: t.Optional(t.String()),
        tokenLimit: t.Optional(t.Nullable(t.Number())),
        rateLimit: t.Optional(t.Nullable(t.Number())),
        allowedProviders: t.Optional(t.Array(t.String())),
        roundRobinProviders: t.Optional(t.Boolean()),
      }),
    }
  )
  .patch(
    "/:id",
    ({ params: { id }, body, set }) => {
      const existing = db
        .select()
        .from(clientKeys)
        .where(eq(clientKeys.id, id))
        .get();

      if (!existing) {
        set.status = 404;
        return { error: "Key not found" };
      }

      const updateData: Partial<typeof clientKeys.$inferInsert> = {};
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.apiKeyId !== undefined) updateData.apiKeyId = body.apiKeyId;
      if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0;
      if (body.rateLimit !== undefined) updateData.rateLimit = body.rateLimit;
      if (body.tokenLimit !== undefined) {
        updateData.tokenLimit = body.tokenLimit && body.tokenLimit > 0 ? body.tokenLimit : null;
      }
      if (body.allowedProviders !== undefined) {
        updateData.allowedProviders = JSON.stringify(body.allowedProviders);
      }
      if (body.roundRobinProviders !== undefined) {
        updateData.roundRobinProviders = body.roundRobinProviders ? 1 : 0;
      }
      if (body.resetUsedTokens === true) {
        updateData.usedTokens = 0;
      }

      db.update(clientKeys)
        .set(updateData)
        .where(eq(clientKeys.id, id))
        .run();

      return { success: true };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        apiKeyId: t.Optional(t.Nullable(t.String())),
        isActive: t.Optional(t.Boolean()),
        tokenLimit: t.Optional(t.Nullable(t.Number())),
        rateLimit: t.Optional(t.Nullable(t.Number())),
        allowedProviders: t.Optional(t.Array(t.String())),
        roundRobinProviders: t.Optional(t.Boolean()),
        resetUsedTokens: t.Optional(t.Boolean()),
      }),
    }
  )
  .post("/:id/reset-quota", ({ params: { id }, set }) => {
    const existing = db
      .select()
      .from(clientKeys)
      .where(eq(clientKeys.id, id))
      .get();

    if (!existing) {
      set.status = 404;
      return { error: "Key not found" };
    }

    db.update(clientKeys)
      .set({ usedTokens: 0 })
      .where(eq(clientKeys.id, id))
      .run();

    return { success: true, message: "Token quota usage reset to 0" };
  })
  .post(
    "/:id/toggle-provider",
    ({ params: { id }, body, set }) => {
      const existing = db
        .select()
        .from(clientKeys)
        .where(eq(clientKeys.id, id))
        .get();

      if (!existing) {
        set.status = 404;
        return { success: false, error: "Key not found" };
      }

      let currentAllowed: string[] = [];
      try {
        if (existing.allowedProviders) currentAllowed = JSON.parse(existing.allowedProviders);
      } catch (e) {}

      let updatedAllowed: string[];
      const providerId = body.providerId;

      if (body.allowed !== undefined) {
        if (body.allowed) {
          updatedAllowed = currentAllowed.includes(providerId) ? currentAllowed : [...currentAllowed, providerId];
        } else {
          updatedAllowed = currentAllowed.filter((p) => p !== providerId);
        }
      } else {
        // Toggle
        if (currentAllowed.includes(providerId)) {
          updatedAllowed = currentAllowed.filter((p) => p !== providerId);
        } else {
          updatedAllowed = [...currentAllowed, providerId];
        }
      }

      db.update(clientKeys)
        .set({ allowedProviders: JSON.stringify(updatedAllowed) })
        .where(eq(clientKeys.id, id))
        .run();

      return {
        success: true,
        allowedProviders: updatedAllowed,
      };
    },
    {
      body: t.Object({
        providerId: t.String(),
        allowed: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete("/:id", ({ params: { id }, set }) => {
    const existing = db
      .select()
      .from(clientKeys)
      .where(eq(clientKeys.id, id))
      .get();

    if (!existing) {
      set.status = 404;
      return { error: "Key not found" };
    }

    db.delete(clientKeys).where(eq(clientKeys.id, id)).run();
    return { success: true };
  });
