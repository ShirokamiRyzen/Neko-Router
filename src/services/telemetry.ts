import { db, sqlite } from "../db";
import {
  telemetryLogs,
  toolLogs,
  type TelemetryLog,
  type ToolLog,
} from "../db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export interface LogTelemetryParams {
  clientKeyId?: string | null;
  clientKeyName?: string | null;
  upstreamKeyId?: string | null;
  provider: "openai" | "anthropic";
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
  totalTokens: number;
  statusCode: number;
  durationMs: number;
  isStreaming: boolean;
  errorMessage?: string | null;
}

export function recordTelemetry(params: LogTelemetryParams): void {
  try {
    const id = "log_" + crypto.randomUUID().replace(/-/g, "");
    db.insert(telemetryLogs)
      .values({
        id,
        clientKeyId: params.clientKeyId ?? null,
        clientKeyName: params.clientKeyName ?? null,
        upstreamKeyId: params.upstreamKeyId ?? null,
        provider: params.provider,
        endpoint: params.endpoint,
        model: params.model,
        promptTokens: params.promptTokens || 0,
        completionTokens: params.completionTokens || 0,
        cachedTokens: params.cachedTokens || 0,
        totalTokens:
          params.totalTokens ||
          (params.promptTokens || 0) + (params.completionTokens || 0),
        statusCode: params.statusCode,
        durationMs: params.durationMs || 0,
        isStreaming: params.isStreaming ? 1 : 0,
        errorMessage: params.errorMessage ?? null,
        createdAt: Date.now(),
      })
      .run();
} catch (e) {
 console.error("Failed to record telemetry log:", e);
 }
}

export interface LogToolTelemetryParams {
 clientKeyId?: string | null;
 clientKeyName?: string | null;
 toolType: "search" | "fetch";
 provider?: string | null;
 query?: string | null;
 url?: string | null;
 statusCode: number;
 durationMs: number;
 resultCount?: number;
 contentLength?: number;
 errorMessage?: string | null;
}

export function recordToolTelemetry(params: LogToolTelemetryParams): void {
 try {
 const id = "tool_" + crypto.randomUUID().replace(/-/g, "");
 db.insert(toolLogs)
 .values({
 id,
 clientKeyId: params.clientKeyId ?? null,
 clientKeyName: params.clientKeyName ?? null,
 toolType: params.toolType,
 provider: params.provider ?? null,
 query: params.query ?? null,
 url: params.url ?? null,
 statusCode: params.statusCode,
 durationMs: params.durationMs || 0,
 resultCount: params.resultCount || 0,
 contentLength: params.contentLength || 0,
 errorMessage: params.errorMessage ?? null,
 createdAt: Date.now(),
 })
 .run();
 } catch (e) {
 console.error("Failed to record tool telemetry log:", e);
 }
}

export interface ToolLogQuery {
 toolType?: "search" | "fetch" | null;
}

export function getRecentToolLogs(
 limit = 50,
 offset = 0,
 query: ToolLogQuery = {}
): ToolLog[] {
 const conditions = [];
 if (query.toolType) {
 conditions.push(eq(toolLogs.toolType, query.toolType));
 }

 return db
 .select()
 .from(toolLogs)
 .where(conditions.length > 0 ? and(...conditions) : undefined)
 .orderBy(desc(toolLogs.createdAt))
 .limit(limit)
 .offset(offset)
 .all();
}

export interface ActiveRequest {
  id: string;
  clientKeyId?: string | null;
  upstreamKeyId?: string | null;
  provider: string;
  model: string;
  startedAt: number;
  lastActivityAt?: number;
}

const activeRequestsMap = new Map<string, ActiveRequest>();
const recentActivityMap = new Map<string, number>();

// Inactivity threshold: if no activity received for 20s, evict stale request
const MAX_INACTIVITY_MS = 20 * 1000;
// Absolute maximum request lifetime: 180s (3 minutes)
const MAX_TOTAL_LIFETIME_MS = 180 * 1000;

export function registerActiveRequest(
  req: ActiveRequest
): (() => void) & { touch: () => void; finish: () => void; setUpstream: (upstreamKeyId?: string | null) => void } {
  const item: ActiveRequest = {
    ...req,
    lastActivityAt: Date.now(),
  };
  activeRequestsMap.set(req.id, item);
  if (item.upstreamKeyId) {
    recentActivityMap.set(item.upstreamKeyId, Date.now());
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    activeRequestsMap.delete(req.id);
    if (item.upstreamKeyId) {
      recentActivityMap.set(item.upstreamKeyId, Date.now());
    }
  };

  const touch = () => {
    if (finished) return;
    item.lastActivityAt = Date.now();
    if (item.upstreamKeyId) {
      recentActivityMap.set(item.upstreamKeyId, Date.now());
    }
  };

  // Re-point the in-flight request to the provider actually being used. This keeps
  // failover accurate: only the real upstream lights up, the abandoned one is cleared.
  const setUpstream = (upstreamKeyId?: string | null) => {
    if (finished) return;
    const next = upstreamKeyId ?? null;
    if (item.upstreamKeyId && item.upstreamKeyId !== next) {
      recentActivityMap.delete(item.upstreamKeyId);
    }
    item.upstreamKeyId = next;
    if (next) {
      recentActivityMap.set(next, Date.now());
    }
  };

  const fn = finish as any;
  fn.finish = finish;
  fn.touch = touch;
  fn.setUpstream = setUpstream;
  return fn;
}

export function getActiveUpstreamIds(): string[] {
  const now = Date.now();
  const activeIds = new Set<string>();

  // In-flight active requests with auto-pruning of stale/abandoned requests
  for (const [id, req] of activeRequestsMap.entries()) {
    const lastActive = req.lastActivityAt || req.startedAt;
    const isInactive = now - lastActive > MAX_INACTIVITY_MS;
    const isExceededMaxTime = now - req.startedAt > MAX_TOTAL_LIFETIME_MS;

    if (isInactive || isExceededMaxTime) {
      // Auto-evict orphaned or dead in-flight request
      activeRequestsMap.delete(id);
    } else if (req.upstreamKeyId) {
      activeIds.add(req.upstreamKeyId);
    }
  }

  // Requests active in the last 1500ms (for fluid visual persistence on short requests)
  for (const [upId, time] of recentActivityMap.entries()) {
    if (now - time < 1500) {
      activeIds.add(upId);
    } else {
      recentActivityMap.delete(upId);
    }
  }

  return Array.from(activeIds);
}

export function calculateTokenCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0
): number {
  const m = (model || "").toLowerCase();
  let promptRate = 0.5; // per 1M tokens USD
  let completionRate = 1.5; // per 1M tokens USD
  let cachedRate = 0.25; // per 1M tokens USD

  if (m.includes("gpt-4o-mini")) {
    promptRate = 0.15;
    completionRate = 0.6;
    cachedRate = 0.075;
  } else if (m.includes("gpt-4o")) {
    promptRate = 2.5;
    completionRate = 10.0;
    cachedRate = 1.25;
  } else if (m.includes("o1-mini")) {
    promptRate = 3.0;
    completionRate = 12.0;
    cachedRate = 1.5;
  } else if (m.includes("o3-mini")) {
    promptRate = 1.1;
    completionRate = 4.4;
    cachedRate = 0.55;
  } else if (m.includes("o1")) {
    promptRate = 15.0;
    completionRate = 60.0;
    cachedRate = 7.5;
  } else if (m.includes("gpt-4")) {
    promptRate = 10.0;
    completionRate = 30.0;
    cachedRate = 5.0;
  } else if (m.includes("gpt-3.5")) {
    promptRate = 0.5;
    completionRate = 1.5;
    cachedRate = 0.25;
  } else if (
    m.includes("claude-3-5-sonnet") ||
    m.includes("claude-3-7-sonnet") ||
    m.includes("claude-3-sonnet")
  ) {
    promptRate = 3.0;
    completionRate = 15.0;
    cachedRate = 0.3;
  } else if (m.includes("claude-3-5-haiku") || m.includes("claude-3-haiku")) {
    promptRate = 0.8;
    completionRate = 4.0;
    cachedRate = 0.08;
  } else if (m.includes("claude-3-opus") || m.includes("claude-opus")) {
    promptRate = 15.0;
    completionRate = 75.0;
    cachedRate = 3.75;
  } else if (m.includes("deepseek-reasoner") || m.includes("deepseek-r1")) {
    promptRate = 0.55;
    completionRate = 2.19;
    cachedRate = 0.14;
  } else if (m.includes("deepseek-chat") || m.includes("deepseek-v3") || m.includes("deepseek")) {
    promptRate = 0.14;
    completionRate = 0.28;
    cachedRate = 0.014;
  } else if (m.includes("kimi") || m.includes("moonshot")) {
    promptRate = 0.2;
    completionRate = 0.6;
    cachedRate = 0.1;
  } else if (m.includes("glm") && (m.includes("flash") || m.includes("air"))) {
    promptRate = 0.05;
    completionRate = 0.1;
    cachedRate = 0.025;
  } else if (m.includes("glm")) {
    promptRate = 1.0;
    completionRate = 1.0;
    cachedRate = 0.5;
  } else if (m.includes("qwen") && m.includes("turbo")) {
    promptRate = 0.04;
    completionRate = 0.08;
    cachedRate = 0.02;
  } else if (m.includes("qwen") && m.includes("plus")) {
    promptRate = 0.11;
    completionRate = 0.28;
    cachedRate = 0.05;
  } else if (m.includes("qwen") && m.includes("max")) {
    promptRate = 1.6;
    completionRate = 6.4;
    cachedRate = 0.8;
  } else if (m.includes("flash") || m.includes("mini") || m.includes("small") || m.includes("haiku")) {
    promptRate = 0.15;
    completionRate = 0.6;
    cachedRate = 0.075;
  } else if (m.includes("code") || m.includes("coder")) {
    promptRate = 0.25;
    completionRate = 0.75;
    cachedRate = 0.12;
  }

  const effectivePrompt = Math.max(0, promptTokens - cachedTokens);
  const cost =
    (effectivePrompt / 1_000_000) * promptRate +
    (cachedTokens / 1_000_000) * cachedRate +
    (completionTokens / 1_000_000) * completionRate;

  return cost;
}

export interface TelemetryStatsOptions {
  timeRangeMs?: number;
  since?: number;
  all?: boolean;
}

export function getTelemetryStats(
  params: number | TelemetryStatsOptions = 24 * 60 * 60 * 1000
) {
  let isAll = false;
  let since = 0;

  if (typeof params === "number") {
    if (params <= 0) {
      isAll = true;
    } else {
      since = Date.now() - params;
    }
  } else if (params) {
    if (params.all) {
      isAll = true;
    } else if (params.since !== undefined && params.since > 0) {
      since = params.since;
    } else if (params.timeRangeMs !== undefined && params.timeRangeMs > 0) {
      since = Date.now() - params.timeRangeMs;
    } else if (params.timeRangeMs === 0) {
      isAll = true;
    } else {
      since = Date.now() - 24 * 60 * 60 * 1000;
    }
  } else {
    since = Date.now() - 24 * 60 * 60 * 1000;
  }

  const totalWhere = isAll ? sql`1=1` : sql`${telemetryLogs.createdAt} >= ${since}`;
  const successWhere = isAll
    ? sql`${telemetryLogs.statusCode} >= 200 AND ${telemetryLogs.statusCode} < 300`
    : sql`${telemetryLogs.createdAt} >= ${since} AND ${telemetryLogs.statusCode} >= 200 AND ${telemetryLogs.statusCode} < 300`;

  const totalReq = db
    .select({
      count: sql<number>`count(*)`,
      promptTokens: sql<number>`coalesce(sum(${telemetryLogs.promptTokens}), 0)`,
      completionTokens: sql<number>`coalesce(sum(${telemetryLogs.completionTokens}), 0)`,
      cachedTokens: sql<number>`coalesce(sum(${telemetryLogs.cachedTokens}), 0)`,
      totalTokens: sql<number>`coalesce(sum(${telemetryLogs.totalTokens}), 0)`,
      avgDuration: sql<number>`coalesce(avg(${telemetryLogs.durationMs}), 0)`,
    })
    .from(telemetryLogs)
    .where(totalWhere)
    .get();

  const successCount = db
    .select({ count: sql<number>`count(*)` })
    .from(telemetryLogs)
    .where(successWhere)
    .get()?.count || 0;

  // Breakdown by model with prompt, completion, and cached tokens
  const rawModelStats = db
    .select({
      model: telemetryLogs.model,
      provider: telemetryLogs.provider,
      requests: sql<number>`count(*)`,
      promptTokens: sql<number>`coalesce(sum(${telemetryLogs.promptTokens}), 0)`,
      completionTokens: sql<number>`coalesce(sum(${telemetryLogs.completionTokens}), 0)`,
      cachedTokens: sql<number>`coalesce(sum(${telemetryLogs.cachedTokens}), 0)`,
      tokens: sql<number>`coalesce(sum(${telemetryLogs.totalTokens}), 0)`,
    })
    .from(telemetryLogs)
    .where(totalWhere)
    .groupBy(telemetryLogs.model, telemetryLogs.provider)
    .all();

  let totalCost = 0;
  const modelStats = rawModelStats.map((ms) => {
    const prompt = Number(ms.promptTokens || 0);
    const completion = Number(ms.completionTokens || 0);
    const cached = Number(ms.cachedTokens || 0);
    const cost = calculateTokenCost(ms.model, prompt, completion, cached);
    totalCost += cost;

    return {
      model: ms.model,
      provider: ms.provider,
      requests: Number(ms.requests || 0),
      promptTokens: prompt,
      completionTokens: completion,
      cachedTokens: cached,
      tokens: Number(ms.tokens || 0),
      estimatedCost: cost,
    };
  });

  if (totalCost === 0 && ((totalReq?.promptTokens || 0) > 0 || (totalReq?.completionTokens || 0) > 0)) {
    totalCost = calculateTokenCost(
      "default",
      totalReq?.promptTokens || 0,
      totalReq?.completionTokens || 0,
      totalReq?.cachedTokens || 0
    );
  }

  return {
    totalRequests: totalReq?.count || 0,
    successRequests: successCount,
    totalPromptTokens: totalReq?.promptTokens || 0,
    totalCompletionTokens: totalReq?.completionTokens || 0,
    totalCachedTokens: totalReq?.cachedTokens || 0,
    totalTokens: totalReq?.totalTokens || 0,
    avgDurationMs: Math.round(totalReq?.avgDuration || 0),
    estimatedCost: totalCost,
    modelStats,
    activeUpstreamIds: getActiveUpstreamIds(),
    activeRequestsCount: activeRequestsMap.size,
  };
}

export function getRecentLogs(limit = 50, offset = 0) {
  return db
    .select()
    .from(telemetryLogs)
    .orderBy(desc(telemetryLogs.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export interface ModelStatusStats {
  model: string;
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  successRate: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  avgTps: number;
  maxTps: number;
  minTps: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  lastRequestAt: number | null;
  status: "operational" | "degraded" | "offline" | "idle";
}

export function getModelMetrics24h(sinceMs: number = 24 * 60 * 60 * 1000): Map<string, ModelStatusStats> {
  const since = Date.now() - sinceMs;
  const rows = sqlite
    .query(`
      SELECT 
        model,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_requests,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_requests,
        AVG(CASE WHEN status_code >= 200 AND status_code < 300 THEN duration_ms ELSE duration_ms END) as avg_duration_ms,
        MIN(CASE WHEN status_code >= 200 AND status_code < 300 AND duration_ms > 0 THEN duration_ms ELSE NULL END) as min_duration_ms,
        MAX(CASE WHEN status_code >= 200 AND status_code < 300 THEN duration_ms ELSE NULL END) as max_duration_ms,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(cached_tokens) as total_cached_tokens,
        SUM(total_tokens) as total_tokens,
        AVG(CASE WHEN status_code >= 200 AND status_code < 300 AND duration_ms > 0 AND completion_tokens > 0 THEN (completion_tokens * 1000.0 / duration_ms) ELSE NULL END) as avg_tps,
        MAX(CASE WHEN status_code >= 200 AND status_code < 300 AND duration_ms > 0 AND completion_tokens > 0 THEN (completion_tokens * 1000.0 / duration_ms) ELSE NULL END) as max_tps,
        MIN(CASE WHEN status_code >= 200 AND status_code < 300 AND duration_ms > 0 AND completion_tokens > 0 THEN (completion_tokens * 1000.0 / duration_ms) ELSE NULL END) as min_tps,
        MAX(created_at) as last_request_at
      FROM telemetry_logs
      WHERE created_at >= ?
      GROUP BY model
    `)
    .all(since) as any[];

  const map = new Map<string, ModelStatusStats>();

  for (const r of rows) {
    const totalRequests = Number(r.total_requests || 0);
    const successRequests = Number(r.success_requests || 0);
    const errorRequests = Number(r.error_requests || 0);
    const successRate = totalRequests > 0 ? Number(((successRequests / totalRequests) * 100).toFixed(2)) : 100.0;
    const avgLatencyMs = Math.round(Number(r.avg_duration_ms || 0));
    const minLatencyMs = Math.round(Number(r.min_duration_ms || 0));
    const maxLatencyMs = Math.round(Number(r.max_duration_ms || 0));

    let avgTps = Number((Number(r.avg_tps) || 0).toFixed(2));
    if (avgTps === 0 && Number(r.total_completion_tokens || 0) > 0 && avgLatencyMs > 0 && totalRequests > 0) {
      avgTps = Number(((Number(r.total_completion_tokens) / ((avgLatencyMs * totalRequests) / 1000))).toFixed(2));
    }

    let status: "operational" | "degraded" | "offline" | "idle" = "idle";
    if (totalRequests > 0) {
      if (successRate >= 95) {
        status = "operational";
      } else if (successRate >= 50) {
        status = "degraded";
      } else {
        status = "offline";
      }
    }

    const stat: ModelStatusStats = {
      model: String(r.model),
      totalRequests,
      successRequests,
      errorRequests,
      successRate,
      avgLatencyMs,
      minLatencyMs,
      maxLatencyMs,
      avgTps,
      maxTps: Number((Number(r.max_tps) || 0).toFixed(2)),
      minTps: Number((Number(r.min_tps) || 0).toFixed(2)),
      promptTokens: Number(r.total_prompt_tokens || 0),
      completionTokens: Number(r.total_completion_tokens || 0),
      cachedTokens: Number(r.total_cached_tokens || 0),
      totalTokens: Number(r.total_tokens || 0),
      lastRequestAt: r.last_request_at ? Number(r.last_request_at) : null,
      status,
    };

    map.set(stat.model, stat);
  }

  return map;
}

export function pruneTelemetryLogs(retentionHours = 24): number {
  try {
    const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;
    const info = sqlite.run("DELETE FROM telemetry_logs WHERE created_at < ?", [cutoff]);
    if (info.changes > 0) {
      console.log(`[Telemetry] Auto-pruned ${info.changes} old telemetry records (retention: ${retentionHours}h).`);
    }
    return info.changes;
  } catch (e) {
    console.error("Failed to prune old telemetry logs:", e);
    return 0;
  }
}
