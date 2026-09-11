import { Elysia, t } from "elysia";
import { db } from "../db";
import { upstreamKeys, clientKeys, apiKeys } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, and } from "drizzle-orm";
import {
  BANDELBANGET_CONFIG,
  fetchBandelBangetLiveModels,
  testBandelBangetConnection,
  ensureBandelBangetProviders,
  syncBandelBangetFollowUpstreamModels,
} from "../services/bandelbanget";
import { parseUpstreamModels, parseUpstreamKeyEntries } from "../services/router";

export const apiProvidersRoutes = new Elysia({ prefix: "/api/api-providers" })
  .use(authMiddleware)
  .onBeforeHandle(({ isAdmin, apiKey, set }) => {
    if (!isAdmin && !apiKey) {
      set.status = 401;
      return { error: "Unauthorized access to API Providers" };
    }
  })
  // 1. Get BandelBanget status & configuration for both cards
  .get("/bandelbanget/status", async () => {
    const { followUpstream, inputKey } = await ensureBandelBangetProviders();

    const followModels = parseUpstreamModels(followUpstream.models);
    const inputModels = parseUpstreamModels(inputKey.models);

    const followKeyEntries = parseUpstreamKeyEntries(followUpstream.apiKeys, followUpstream.apiKey);
    const inputKeyEntries = parseUpstreamKeyEntries(inputKey.apiKeys, inputKey.apiKey);

    // Check if any client key is configured for follow upstream
    const followClientKeys = db
      .select()
      .from(clientKeys)
      .where(eq(clientKeys.isFollowUpstream, 1))
      .all();

    return {
      success: true,
      cards: {
        followUpstream: {
          id: followUpstream.id,
          name: followUpstream.name,
          baseUrl: followUpstream.baseUrl || BANDELBANGET_CONFIG.BASE_URL,
          prefix: followUpstream.prefix,
          isActive: followUpstream.isActive,
          followUpstream: true,
          mode: "follow_upstream",
          models: followModels,
          totalModelsCount: followModels.length,
          enabledModelsCount: followModels.filter((m) => m.enabled).length,
          activeKeysCount: followKeyEntries.filter((k) => k.isActive).length,
          totalKeysCount: followKeyEntries.length,
          clientKeysUsingCount: followClientKeys.length,
        },
        inputKey: {
          id: inputKey.id,
          name: inputKey.name,
          baseUrl: inputKey.baseUrl || BANDELBANGET_CONFIG.BASE_URL,
          prefix: inputKey.prefix,
          isActive: inputKey.isActive,
          followUpstream: false,
          mode: "input_key",
          models: inputModels,
          totalModelsCount: inputModels.length,
          enabledModelsCount: inputModels.filter((m) => m.enabled).length,
          activeKeysCount: inputKeyEntries.filter((k) => k.isActive).length,
          totalKeysCount: inputKeyEntries.length,
        },
      },
    };
  })
  // 2. Fetch live models from BB
  .get("/bandelbanget/models", async ({ set }) => {
    try {
      const models = await fetchBandelBangetLiveModels();
      return { success: true, models, count: models.length };
    } catch (err: any) {
      set.status = 502;
      return { success: false, error: err?.message || "Failed to fetch models from BandelBanget" };
    }
  })
  // 3. Sync Follow Upstream models directly with BB live models
  .post("/bandelbanget/sync", async ({ set }) => {
    try {
      const result = await syncBandelBangetFollowUpstreamModels();
      return {
        success: true,
        message: `Successfully synced ${result.enabledCount} active models (${result.totalCount} total) directly from BandelBanget!`,
        ...result,
      };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err?.message || "Failed to sync models with BandelBanget" };
    }
  })
  // 4. Test connectivity to BandelBanget
  .post(
    "/bandelbanget/test",
    async ({ body }) => {
      const key = body?.key;
      const res = await testBandelBangetConnection(key);
      return res;
    },
    {
      body: t.Optional(
        t.Object({
          key: t.Optional(t.String()),
        })
      ),
    }
  )
  // 5. Toggle provider active state
  .post(
    "/bandelbanget/toggle",
    async ({ body, set }) => {
      const { id, isActive } = body;
      const target = db.select().from(upstreamKeys).where(eq(upstreamKeys.id, id)).get();
      if (!target) {
        set.status = 404;
        return { success: false, error: "Provider not found" };
      }

      db.update(upstreamKeys)
        .set({ isActive: isActive ? 1 : 0, updatedAt: Date.now() })
        .where(eq(upstreamKeys.id, id))
        .run();

      return { success: true, isActive };
    },
    {
      body: t.Object({
        id: t.String(),
        isActive: t.Boolean(),
      }),
    }
  )
  // 6. Quick create a Follow Upstream key directly for Endpoint & Keys
  .post(
    "/bandelbanget/quick-key",
    async ({ body, set }) => {
      const { name } = body;
      const keyLabel = name?.trim() || "BandelBanget Follow Upstream";

      // Ensure parent API key exists
      let parentKey = db.select().from(apiKeys).limit(1).get();
      if (!parentKey) {
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
        parentKey = db.select().from(apiKeys).where(eq(apiKeys.id, defaultId)).get();
      }

      const { followUpstream } = await ensureBandelBangetProviders();

      // In follow upstream: key is not generated as random sk-neko-!
      // It uses default BB key or valid BB key pass-through
      const id = "ck_" + crypto.randomUUID().replace(/-/g, "");
      const now = Date.now();

      // Check if bb-default is already assigned to a key; if so, create key identifier bb-default or bb-follow-id
      let finalKeyStr = "bb-default";
      const existing = db.select().from(clientKeys).where(eq(clientKeys.key, finalKeyStr)).get();
      if (existing) {
        finalKeyStr = `bb-follow-${id.slice(3, 9)}`;
      }

      db.insert(clientKeys)
        .values({
          id,
          apiKeyId: parentKey?.id || null,
          name: keyLabel,
          key: finalKeyStr,
          isActive: 1,
          rateLimit: null,
          tokenLimit: null,
          usedTokens: 0,
          allowedProviders: JSON.stringify([followUpstream.id, "openai"]),
          roundRobinProviders: 1,
          isFollowUpstream: 1,
          createdAt: now,
          lastUsedAt: null,
        })
        .run();

      return {
        success: true,
        message: "Created Follow Upstream key successfully",
        clientKey: {
          id,
          name: keyLabel,
          key: finalKeyStr,
          isFollowUpstream: true,
        },
      };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
      }),
    }
  );
