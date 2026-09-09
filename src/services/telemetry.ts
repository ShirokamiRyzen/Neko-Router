import { db } from "../db";
import { telemetryLogs, type TelemetryLog } from "../db/schema";
import { desc, eq, sql } from "drizzle-orm";

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

export function registerActiveRequest(req: ActiveRequest): (() => void) & { touch: () => void; finish: () => void } {
  const item: ActiveRequest = {
    ...req,
    lastActivityAt: Date.now(),
  };
  activeRequestsMap.set(req.id, item);
  if (req.upstreamKeyId) {
    recentActivityMap.set(req.upstreamKeyId, Date.now());
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    activeRequestsMap.delete(req.id);
    if (req.upstreamKeyId) {
      recentActivityMap.set(req.upstreamKeyId, Date.now());
    }
  };

  const touch = () => {
    if (finished) return;
    item.lastActivityAt = Date.now();
    if (item.upstreamKeyId) {
      recentActivityMap.set(item.upstreamKeyId, Date.now());
    }
  };

  const fn = finish as any;
  fn.finish = finish;
  fn.touch = touch;
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
