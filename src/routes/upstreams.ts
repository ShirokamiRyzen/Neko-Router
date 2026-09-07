import { Elysia, t } from "elysia";
import { db } from "../db";
import { upstreamKeys } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";
import {
  getBaseUrl,
  getApiKeyForUpstream,
  parseUpstreamKeys,
  parseUpstreamKeyEntries,
  parseUpstreamModels,
  type UpstreamKeyEntry,
} from "../services/router";

const adjectives = [
  "hyper", "quantum", "stellar", "apex", "swift", "cyber", "turbo",
  "neon", "vivid", "sonic", "ultra", "prime", "shadow", "cosmic", "emerald"
];

const nouns = [
  "falcon", "lynx", "neko", "panther", "router", "gateway", "pulse",
  "engine", "spark", "node", "core", "vertex", "nexus", "orbit"
];

function generateRandomAlias(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun}-${num}`;
}

function maskKey(key: string): string {
  if (!key) return "******";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "******";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

async function testSingleKey(
  provider: "openai" | "anthropic",
  baseUrl: string | null,
  key: string
): Promise<{ success: boolean; latencyMs: number; error?: string; message?: string }> {
  const startTime = performance.now();
  const effectiveBaseUrl =
    baseUrl && baseUrl.trim().length > 0
      ? baseUrl.replace(/\/+$/, "")
      : provider === "openai"
      ? "https://api.openai.com/v1"
      : "https://api.anthropic.com";

  try {
    if (provider === "openai") {
      const url = `${effectiveBaseUrl}/models`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok) {
        return { success: true, latencyMs, message: "Connection successful" };
      } else {
        const text = await res.text();
        return {
          success: false,
          latencyMs,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        };
      }
    } else {
      const url = `${effectiveBaseUrl}/v1/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok || res.status === 400) {
        return { success: true, latencyMs, message: "Connection successful" };
      } else {
        const text = await res.text();
        return {
          success: false,
          latencyMs,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        };
      }
    }
  } catch (e: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return { success: false, latencyMs, error: e?.message || "Connection timeout or failed" };
  }
}

export const upstreamRoutes = new Elysia({ prefix: "/api/upstreams" })
  .use(authMiddleware)
  .onBeforeHandle(({ isAdmin, apiKey, set }) => {
    if (!isAdmin && !apiKey) {
      set.status = 401;
      return { error: "Unauthorized access to upstream keys" };
    }
  })
  .get("/generate-alias", () => {
    return { alias: generateRandomAlias() };
  })
  .get("/", () => {
    const list = db
      .select()
      .from(upstreamKeys)
      .orderBy(desc(upstreamKeys.createdAt))
      .all();

    return {
      upstreams: list.map((item) => {
        const entries = parseUpstreamKeyEntries(item.apiKeys, item.apiKey);
        const activeEntries = entries.filter((e) => e.isActive);
        const models = parseUpstreamModels(item.models);
        const enabledCount = models.filter((m) => m.enabled).length;

        return {
          id: item.id,
          provider: item.provider as "openai" | "anthropic",
          name: item.name,
          prefix: item.prefix || null,
          baseUrl: item.baseUrl || null,
          isActive: item.isActive,
          roundRobin: (item as any).roundRobin !== 0,
          weight: item.weight,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          apiKey: activeEntries[0]?.key || entries[0]?.key || item.apiKey || "",
          apiKeys: entries.map((e) => e.key),
          keyEntries: entries.map((e) => ({
            id: e.id,
            name: e.name,
            maskedKey: maskKey(e.key),
            isActive: e.isActive,
            createdAt: e.createdAt,
          })),
          totalKeysCount: entries.length,
          activeKeysCount: activeEntries.length,
          maskedKey: maskKey(activeEntries[0]?.key || entries[0]?.key || item.apiKey || ""),
          maskedKeys: entries.map((e) => maskKey(e.key)),
          models,
          totalModelsCount: models.length,
          enabledModelsCount: enabledCount,
        };
      }),
    };
  })
  .get("/:id", ({ params: { id }, set }) => {
    const item = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!item) {
      set.status = 404;
      return { error: "Upstream key not found" };
    }

    const entries = parseUpstreamKeyEntries(item.apiKeys, item.apiKey);
    const activeEntries = entries.filter((e) => e.isActive);
    const models = parseUpstreamModels(item.models);

    return {
      upstream: {
        id: item.id,
        provider: item.provider,
        name: item.name,
        prefix: item.prefix || null,
        baseUrl: item.baseUrl || null,
        isActive: item.isActive,
        roundRobin: (item as any).roundRobin !== 0,
        weight: item.weight,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        apiKey: activeEntries[0]?.key || entries[0]?.key || item.apiKey,
        apiKeys: entries.map((e) => e.key),
        keyEntries: entries,
        totalKeysCount: entries.length,
        activeKeysCount: activeEntries.length,
        models,
      },
    };
  })
  .post(
    "/",
    ({ body, set }) => {
      const { provider, name, prefix, apiKey, apiKeys, keyEntries, baseUrl, weight, roundRobin, models } = body;

      // Extract and normalize keys list
      let normalizedEntries: UpstreamKeyEntry[] = [];
      if (Array.isArray(keyEntries) && keyEntries.length > 0) {
        normalizedEntries = keyEntries
          .filter((k: any) => k && typeof k.key === "string" && k.key.trim().length > 0)
          .map((k: any, idx: number) => ({
            id: k.id || `key_${Date.now()}_${idx}`,
            name: k.name?.trim() || `API Key #${idx + 1}`,
            key: k.key.trim(),
            isActive: k.isActive !== false,
            createdAt: Date.now(),
          }));
      } else if (Array.isArray(apiKeys) && apiKeys.length > 0) {
        normalizedEntries = apiKeys
          .map((k: any) => String(k).trim())
          .filter((k) => k.length > 0)
          .map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
      } else if (apiKey && apiKey.trim().length > 0) {
        normalizedEntries = apiKey
          .split(/[\n,]+/)
          .map((k: string) => k.trim())
          .filter((k) => k.length > 0)
          .map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
      }

      if (normalizedEntries.length === 0) {
        set.status = 400;
        return { error: "At least one API Key must be provided" };
      }

      const id = "up_" + crypto.randomUUID().replace(/-/g, "");
      const now = Date.now();
      const firstActive = normalizedEntries.find((k) => k.isActive);

      db.insert(upstreamKeys)
        .values({
          id,
          provider,
          name: name?.trim() || generateRandomAlias(),
          prefix: prefix ? prefix.trim() : null,
          apiKey: firstActive ? firstActive.key : normalizedEntries[0]!.key,
          apiKeys: JSON.stringify(normalizedEntries),
          models: models ? JSON.stringify(models) : JSON.stringify([]),
          baseUrl: baseUrl?.trim() || null,
          isActive: 1,
          roundRobin: roundRobin !== false ? 1 : 0,
          weight: weight ?? 1,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return {
        success: true,
        upstream: {
          id,
          provider,
          name: name?.trim() || generateRandomAlias(),
          prefix: prefix ? prefix.trim() : null,
          apiKey: firstActive ? firstActive.key : normalizedEntries[0]!.key,
          apiKeys: normalizedEntries.map((e) => e.key),
          keyEntries: normalizedEntries,
          baseUrl: baseUrl?.trim() || null,
          isActive: 1,
          roundRobin: roundRobin !== false,
          weight: weight ?? 1,
        },
      };
    },
    {
      body: t.Object({
        provider: t.Union([t.Literal("openai"), t.Literal("anthropic")]),
        name: t.String(),
        prefix: t.Optional(t.Nullable(t.String())),
        apiKey: t.Optional(t.String()),
        apiKeys: t.Optional(t.Array(t.String())),
        keyEntries: t.Optional(
          t.Array(
            t.Object({
              id: t.Optional(t.String()),
              name: t.Optional(t.String()),
              key: t.String(),
              isActive: t.Optional(t.Boolean()),
            })
          )
        ),
        baseUrl: t.Optional(t.String()),
        weight: t.Optional(t.Number()),
        roundRobin: t.Optional(t.Boolean()),
        models: t.Optional(
          t.Array(
            t.Object({
              id: t.String(),
              name: t.Optional(t.String()),
              enabled: t.Boolean(),
            })
          )
        ),
      }),
    }
  )
  .patch(
    "/:id",
    ({ params: { id }, body, set }) => {
      const existing = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!existing) {
        set.status = 404;
        return { error: "Upstream not found" };
      }

      const updateData: Partial<typeof upstreamKeys.$inferInsert> = {
        updatedAt: Date.now(),
      };

      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.prefix !== undefined) updateData.prefix = body.prefix ? body.prefix.trim() : null;
      if (body.provider !== undefined) updateData.provider = body.provider;
      if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl?.trim() || null;
      if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0;
      if (body.roundRobin !== undefined) updateData.roundRobin = body.roundRobin ? 1 : 0;
      if (body.weight !== undefined) updateData.weight = Math.max(1, body.weight);

      // Multiple keys update
      if (body.keyEntries !== undefined) {
        const normalized = body.keyEntries
          .filter((k: any) => k && typeof k.key === "string" && k.key.trim().length > 0)
          .map((k: any, idx: number) => ({
            id: k.id || `key_${Date.now()}_${idx}`,
            name: k.name?.trim() || `API Key #${idx + 1}`,
            key: k.key.trim(),
            isActive: k.isActive !== false,
            createdAt: k.createdAt || Date.now(),
          }));
        if (normalized.length > 0) {
          updateData.apiKeys = JSON.stringify(normalized);
          const firstActive = normalized.find((k) => k.isActive);
          updateData.apiKey = firstActive ? firstActive.key : normalized[0]!.key;
        }
      } else if (body.apiKeys !== undefined) {
        const cleaned = body.apiKeys
          .map((k: any) => String(k).trim())
          .filter((k) => k.length > 0);
        if (cleaned.length > 0) {
          const normalized = cleaned.map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
          updateData.apiKeys = JSON.stringify(normalized);
          updateData.apiKey = cleaned[0]!;
        }
      } else if (body.apiKey !== undefined && body.apiKey.trim().length > 0) {
        const cleaned = body.apiKey
          .split(/[\n,]+/)
          .map((k: string) => k.trim())
          .filter((k) => k.length > 0);
        if (cleaned.length > 0) {
          const normalized = cleaned.map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
          updateData.apiKeys = JSON.stringify(normalized);
          updateData.apiKey = cleaned[0]!;
        }
      }

      // Models update
      if (body.models !== undefined) {
        updateData.models = JSON.stringify(body.models);
      }

      db.update(upstreamKeys)
        .set(updateData)
        .where(eq(upstreamKeys.id, id))
        .run();

      return { success: true };
    },
    {
      body: t.Object({
        provider: t.Optional(t.Union([t.Literal("openai"), t.Literal("anthropic")])),
        name: t.Optional(t.String()),
        prefix: t.Optional(t.Nullable(t.String())),
        apiKey: t.Optional(t.String()),
        apiKeys: t.Optional(t.Array(t.String())),
        keyEntries: t.Optional(
          t.Array(
            t.Object({
              id: t.Optional(t.String()),
              name: t.Optional(t.String()),
              key: t.String(),
              isActive: t.Optional(t.Boolean()),
            })
          )
        ),
        baseUrl: t.Optional(t.Nullable(t.String())),
        isActive: t.Optional(t.Boolean()),
        roundRobin: t.Optional(t.Boolean()),
        weight: t.Optional(t.Number()),
        models: t.Optional(
          t.Array(
            t.Object({
              id: t.String(),
              name: t.Optional(t.String()),
              enabled: t.Boolean(),
            })
          )
        ),
      }),
    }
  )
  .delete("/:id", ({ params: { id }, set }) => {
    const existing = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!existing) {
      set.status = 404;
      return { error: "Upstream key not found" };
    }

    db.delete(upstreamKeys).where(eq(upstreamKeys.id, id)).run();
    return { success: true };
  })
  .post("/:id/fetch-models", async ({ params: { id }, set }) => {
    const upstream = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!upstream) {
      set.status = 404;
      return { success: false, error: "Upstream not found" };
    }

    const key = getApiKeyForUpstream(upstream);
    if (!key) {
      set.status = 400;
      return { success: false, error: "No API key configured for this upstream" };
    }

    const currentModels = parseUpstreamModels(upstream.models);
    const existingEnabledMap = new Map<string, boolean>();
    for (const m of currentModels) {
      existingEnabledMap.set(m.id, m.enabled);
    }

    let fetchedModelIds: string[] = [];

    try {
      if (upstream.provider === "openai") {
        const url = `${getBaseUrl(upstream)}/models`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) {
          const errText = await res.text();
          return {
            success: false,
            error: `Upstream error HTTP ${res.status}: ${errText.slice(0, 150)}`,
          };
        }
        const data = (await res.json()) as any;
        if (Array.isArray(data?.data)) {
          fetchedModelIds = data.data.map((m: any) => m.id).filter(Boolean);
        }
      } else {
        // Anthropic provider
        const url = `${getBaseUrl(upstream)}/v1/models`;
        try {
          const res = await fetch(url, {
            headers: {
              "x-api-key": key,
              "anthropic-version": "2023-06-01",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) {
            const data = (await res.json()) as any;
            if (Array.isArray(data?.data)) {
              fetchedModelIds = data.data.map((m: any) => m.id).filter(Boolean);
            }
          }
        } catch (e) {}

        // Fallback standard Claude catalog if provider endpoint did not return
        if (fetchedModelIds.length === 0) {
          fetchedModelIds = [
            "claude-3-7-sonnet-20250219",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2",
          ];
        }
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to fetch models from provider",
      };
    }

    const uniqueIds = Array.from(new Set(fetchedModelIds)).sort();
    if (uniqueIds.length === 0) {
      return { success: false, error: "No models returned by upstream provider" };
    }

    // DEFAULT OFF SEMUA:
    // Any existing configured models keep their enabled value.
    // All newly fetched models default to enabled: false!
    const newModels = uniqueIds.map((modelId) => ({
      id: modelId,
      enabled: existingEnabledMap.get(modelId) ?? false, // Default is OFF!
    }));

    db.update(upstreamKeys)
      .set({
        models: JSON.stringify(newModels),
        updatedAt: Date.now(),
      })
      .where(eq(upstreamKeys.id, id))
      .run();

    return {
      success: true,
      models: newModels,
      count: newModels.length,
      enabledCount: newModels.filter((m) => m.enabled).length,
    };
  })
  .post(
    "/:id/models/toggle",
    ({ params: { id }, body, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      let models = parseUpstreamModels(upstream.models);

      if (body.enableAll) {
        models = models.map((m) => ({ ...m, enabled: true }));
      } else if (body.disableAll) {
        models = models.map((m) => ({ ...m, enabled: false }));
      } else if (body.modelId) {
        models = models.map((m) =>
          m.id === body.modelId
            ? {
                ...m,
                enabled:
                  body.enabled !== undefined ? body.enabled : !m.enabled,
              }
            : m
        );
      }

      db.update(upstreamKeys)
        .set({
          models: JSON.stringify(models),
          updatedAt: Date.now(),
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        models,
        enabledCount: models.filter((m) => m.enabled).length,
      };
    },
    {
      body: t.Object({
        modelId: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
        enableAll: t.Optional(t.Boolean()),
        disableAll: t.Optional(t.Boolean()),
      }),
    }
  )
  .post("/:id/test", async ({ params: { id }, set }) => {
    const upstream = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!upstream) {
      set.status = 404;
      return { success: false, error: "Upstream not found" };
    }

    const key = getApiKeyForUpstream(upstream);
    if (!key) {
      set.status = 400;
      return { success: false, error: "No API key configured or active for this upstream" };
    }

    const result = await testSingleKey(
      upstream.provider as "openai" | "anthropic",
      upstream.baseUrl,
      key
    );
    return result;
  })
  .post(
    "/:id/keys/toggle",
    ({ params: { id }, body, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const target = entries.find((e) => e.id === body.keyId);
      if (!target) {
        set.status = 404;
        return { success: false, error: "Key not found in pool" };
      }

      const newActive = body.isActive !== undefined ? body.isActive : !target.isActive;
      target.isActive = newActive;

      const firstActive = entries.find((e) => e.isActive);

      db.update(upstreamKeys)
        .set({
          apiKey: firstActive ? firstActive.key : entries[0]!.key,
          apiKeys: JSON.stringify(entries),
          updatedAt: Date.now(),
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        keyId: body.keyId,
        isActive: newActive,
        keyEntries: entries.map((e) => ({
          id: e.id,
          name: e.name,
          maskedKey: maskKey(e.key),
          isActive: e.isActive,
          createdAt: e.createdAt,
        })),
        totalKeysCount: entries.length,
        activeKeysCount: entries.filter((e) => e.isActive).length,
      };
    },
    {
      body: t.Object({
        keyId: t.String(),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    "/:id/keys/:keyId/test",
    async ({ params: { id, keyId }, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const target = entries.find((e) => e.id === keyId);
      if (!target) {
        set.status = 404;
        return { success: false, error: "Key not found in pool" };
      }

      const res = await testSingleKey(
        upstream.provider as "openai" | "anthropic",
        upstream.baseUrl,
        target.key
      );

      return {
        keyId,
        keyName: target.name,
        ...res,
      };
    }
  )
  .post(
    "/:id/test-all",
    async ({ params: { id }, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const results = [];

      for (const entry of entries) {
        const res = await testSingleKey(
          upstream.provider as "openai" | "anthropic",
          upstream.baseUrl,
          entry.key
        );
        results.push({
          id: entry.id,
          name: entry.name,
          maskedKey: maskKey(entry.key),
          isActive: entry.isActive,
          ...res,
        });
      }

      return {
        success: results.some((r) => r.success),
        results,
      };
    }
  )
  .post(
    "/test-key",
    async ({ body }) => {
      const { provider, baseUrl, apiKey } = body;
      const res = await testSingleKey(provider, baseUrl || null, apiKey);
      return res;
    },
    {
      body: t.Object({
        provider: t.Union([t.Literal("openai"), t.Literal("anthropic")]),
        baseUrl: t.Optional(t.Nullable(t.String())),
        apiKey: t.String(),
      }),
    }
  );
