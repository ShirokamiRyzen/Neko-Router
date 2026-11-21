import { Elysia, t } from "elysia";
import { db } from "../db";
import { clientKeys, usageStats } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, sql } from "drizzle-orm";
import { getAvailableModelsList } from "../services/proxy";
import { getModelMetrics24h, type ModelStatusStats } from "../services/telemetry";
import { parseAllowedProviders } from "../services/router";

interface AllTimeStat {
  requests: number;
  successRequests: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  totalDurationMs: number;
  lastAt: number;
}

// Telemetry stores the model id the client sent. Depending on whether the
// router prefix is enabled, that id can be prefixed ("ryzumi/gpt-4o") while the
// catalog advertises the clean id (or vice versa). Try every known variant.
function lookupByModel<T>(
  map: Map<string, T>,
  rawId: string,
  cleanId: string,
  rootId: string
): T | null {
  const direct = map.get(rawId) || map.get(cleanId) || map.get(rootId);
  if (direct) return direct;

  const target = cleanId.toLowerCase();
  for (const [key, value] of map.entries()) {
    const keyClean = key.includes("/") ? key.split("/").slice(1).join("/") : key;
    if (keyClean.toLowerCase() === target) return value;
  }
  return null;
}

function buildAllTimeMap(clientKeyId?: string | null): Map<string, AllTimeStat> {
  const selection = {
    model: usageStats.model,
    requests: sql<number>`coalesce(sum(${usageStats.requests}), 0)`,
    successRequests: sql<number>`coalesce(sum(${usageStats.successRequests}), 0)`,
    promptTokens: sql<number>`coalesce(sum(${usageStats.promptTokens}), 0)`,
    completionTokens: sql<number>`coalesce(sum(${usageStats.completionTokens}), 0)`,
    cachedTokens: sql<number>`coalesce(sum(${usageStats.cachedTokens}), 0)`,
    totalTokens: sql<number>`coalesce(sum(${usageStats.totalTokens}), 0)`,
    totalDurationMs: sql<number>`coalesce(sum(${usageStats.totalDurationMs}), 0)`,
    lastAt: sql<number>`coalesce(max(${usageStats.lastAt}), 0)`,
  };

  const rows = (
    clientKeyId
      ? db.select(selection).from(usageStats).where(eq(usageStats.clientKeyId, clientKeyId)).groupBy(usageStats.model).all()
      : db.select(selection).from(usageStats).groupBy(usageStats.model).all()
  ) as any[];

  const map = new Map<string, AllTimeStat>();
  for (const row of rows) {
    map.set(String(row.model), {
      requests: Number(row.requests || 0),
      successRequests: Number(row.successRequests || 0),
      promptTokens: Number(row.promptTokens || 0),
      completionTokens: Number(row.completionTokens || 0),
      cachedTokens: Number(row.cachedTokens || 0),
      totalTokens: Number(row.totalTokens || 0),
      totalDurationMs: Number(row.totalDurationMs || 0),
      lastAt: Number(row.lastAt || 0),
    });
  }
  return map;
}

const STATUS_ORDER: Record<string, number> = {
  operational: 0,
  degraded: 1,
  idle: 2,
  offline: 3,
};

export const modelsRoutes = new Elysia({ prefix: "/api/models" })
  .use(authMiddleware)
  .get(
    "/",
    async ({ query, set, isAdmin, apiKey }) => {
      const keyId = (query.keyId || "").trim();

      // Public catalog: without a key filter the endpoint behaves like
      // GET /v1/models and lists every active model. Scoping to a specific
      // client key exposes per-key usage, so that requires authentication.
      if (keyId && !isAdmin && !apiKey) {
        set.status = 401;
        return { error: "Unauthorized: filtering by client key requires authentication" };
      }

      let clientKey = null;
      if (keyId) {
        clientKey = db.select().from(clientKeys).where(eq(clientKeys.id, keyId)).get() || null;
        if (!clientKey) {
          set.status = 404;
          return { error: `Client key '${keyId}' not found` };
        }
      }

      let models: any[] = [];
      try {
        // Reuses the exact same resolution logic as GET /v1/models, so every id
        // shown here is guaranteed to be requestable through the router with
        // the selected key (prefix, pass-through, and enabled-model rules).
        models = await getAvailableModelsList(clientKey as any);
      } catch (err: any) {
        set.status = 502;
        return { error: err?.message || "Failed to resolve available models" };
      }

      const metricsMap = getModelMetrics24h(24 * 60 * 60 * 1000, keyId || null);
      const allTimeMap = buildAllTimeMap(keyId || null);

      const data = models.map((m: any) => {
        const rawId = String(m.id || "");
        const cleanId = rawId.includes("/") ? rawId.split("/").slice(1).join("/") : rawId;
        const rootId = String(m.root || cleanId);

        const metric: ModelStatusStats | null = lookupByModel(metricsMap, rawId, cleanId, rootId);
        const allTime = lookupByModel(allTimeMap, rawId, cleanId, rootId);

        const totalRequests = metric?.totalRequests || 0;
        const successRequests = metric?.successRequests || 0;
        const errorRequests = metric?.errorRequests || 0;
        const successRate =
          metric?.successRate ?? (totalRequests > 0 ? Number(((successRequests / totalRequests) * 100).toFixed(2)) : 100);
        const allTimeRequests = allTime?.requests || 0;
        const allTimeSuccessRate =
          allTimeRequests > 0
            ? Number((((allTime?.successRequests || 0) / allTimeRequests) * 100).toFixed(2))
            : 100;

        return {
          id: rawId,
          name: m.name || cleanId,
          provider: m.provider || m.owned_by || "NekoRouter",
          owned_by: m.owned_by || "NekoRouter",
          description: m.description || "",
          type: m.type || (m.capabilities?.embeddings ? "embeddings" : "chat"),
          root: rootId,
          context_window: m.context_window || m.context_length || 1_000_000,
          capabilities: m.capabilities || {},
          status: metric?.status || "idle",
          latency_ms: metric?.avgLatencyMs || 0,
          tps: metric?.avgTps || 0,
          summary_24h: {
            total_requests: totalRequests,
            success_requests: successRequests,
            error_requests: errorRequests,
            success_rate: successRate,
            avg_latency_ms: metric?.avgLatencyMs || 0,
            min_latency_ms: metric?.minLatencyMs || 0,
            max_latency_ms: metric?.maxLatencyMs || 0,
            avg_tps: metric?.avgTps || 0,
            min_tps: metric?.minTps || 0,
            max_tps: metric?.maxTps || 0,
            prompt_tokens: metric?.promptTokens || 0,
            completion_tokens: metric?.completionTokens || 0,
            cached_tokens: metric?.cachedTokens || 0,
            total_tokens: metric?.totalTokens || 0,
            last_request_at: metric?.lastRequestAt || null,
          },
          all_time: {
            total_requests: allTimeRequests,
            success_requests: allTime?.successRequests || 0,
            success_rate: allTimeSuccessRate,
            avg_latency_ms:
              allTimeRequests > 0 ? Math.round((allTime?.totalDurationMs || 0) / allTimeRequests) : 0,
            prompt_tokens: allTime?.promptTokens || 0,
            completion_tokens: allTime?.completionTokens || 0,
            cached_tokens: allTime?.cachedTokens || 0,
            total_tokens: allTime?.totalTokens || 0,
            last_request_at: allTime?.lastAt || null,
          },
        };
      });

      data.sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        if (statusDiff !== 0) return statusDiff;
        const requestDiff = b.summary_24h.total_requests - a.summary_24h.total_requests;
        if (requestDiff !== 0) return requestDiff;
        return a.id.localeCompare(b.id);
      });

      const requests24h = data.reduce((sum, m) => sum + m.summary_24h.total_requests, 0);
      const success24h = data.reduce((sum, m) => sum + m.summary_24h.success_requests, 0);
      const tokens24h = data.reduce((sum, m) => sum + m.summary_24h.total_tokens, 0);
      const latencyWeighted = data.reduce(
        (sum, m) => sum + m.summary_24h.avg_latency_ms * m.summary_24h.total_requests,
        0
      );
      const tpsWeighted = data.reduce(
        (sum, m) => sum + m.summary_24h.avg_tps * m.summary_24h.total_requests,
        0
      );

      return {
        success: true,
        timestamp: Date.now(),
        window: "24h",
        key: clientKey
          ? {
              id: clientKey.id,
              name: clientKey.name,
              displayKey:
                clientKey.key.length > 14
                  ? `${clientKey.key.slice(0, 10)}...${clientKey.key.slice(-4)}`
                  : clientKey.key,
              isActive: Boolean(clientKey.isActive),
              isFollowUpstream: Boolean(clientKey.isFollowUpstream),
              roundRobinProviders: clientKey.roundRobinProviders !== 0,
              allowedProviders: parseAllowedProviders(clientKey.allowedProviders),
              tokenLimit: clientKey.tokenLimit,
              usedTokens: clientKey.usedTokens,
              rateLimit: clientKey.rateLimit,
            }
          : null,
        stats: {
          total_models: data.length,
          operational_models: data.filter((m) => m.status === "operational").length,
          idle_models: data.filter((m) => m.status === "idle").length,
          degraded_models: data.filter((m) => m.status === "degraded").length,
          offline_models: data.filter((m) => m.status === "offline").length,
          requests_24h: requests24h,
          success_rate_24h:
            requests24h > 0 ? Number(((success24h / requests24h) * 100).toFixed(2)) : 100,
          total_tokens_24h: tokens24h,
          avg_latency_ms: requests24h > 0 ? Math.round(latencyWeighted / requests24h) : 0,
          avg_tps: requests24h > 0 ? Number((tpsWeighted / requests24h).toFixed(1)) : 0,
        },
        models: data,
      };
    },
    {
      query: t.Object({
        keyId: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Models"],
        summary: "Model catalog with optional key-scoped access, info and usage statistics",
        description:
          "Without keyId this is public and returns every active model reachable through the router (same as GET /v1/models). Pass keyId with authentication to scope the list to the models enabled for that client key and to compute key-specific statistics.",
      },
    }
  );
