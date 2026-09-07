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
}

const activeRequestsMap = new Map<string, ActiveRequest>();
const recentActivityMap = new Map<string, number>();

export function registerActiveRequest(req: ActiveRequest): () => void {
  activeRequestsMap.set(req.id, req);
  if (req.upstreamKeyId) {
    recentActivityMap.set(req.upstreamKeyId, Date.now());
  }

  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    activeRequestsMap.delete(req.id);
    if (req.upstreamKeyId) {
      recentActivityMap.set(req.upstreamKeyId, Date.now());
    }
  };
}

export function getActiveUpstreamIds(): string[] {
  const now = Date.now();
  const activeIds = new Set<string>();

  // In-flight active requests
  for (const req of activeRequestsMap.values()) {
    if (req.upstreamKeyId) activeIds.add(req.upstreamKeyId);
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

export function getTelemetryStats(timeRangeMs = 24 * 60 * 60 * 1000) {
  const since = Date.now() - timeRangeMs;

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
    .where(sql`${telemetryLogs.createdAt} >= ${since}`)
    .get();

  const successCount = db
    .select({ count: sql<number>`count(*)` })
    .from(telemetryLogs)
    .where(
      sql`${telemetryLogs.createdAt} >= ${since} AND ${telemetryLogs.statusCode} >= 200 AND ${telemetryLogs.statusCode} < 300`
    )
    .get()?.count || 0;

  // Breakdown by model
  const modelStats = db
    .select({
      model: telemetryLogs.model,
      provider: telemetryLogs.provider,
      requests: sql<number>`count(*)`,
      tokens: sql<number>`coalesce(sum(${telemetryLogs.totalTokens}), 0)`,
    })
    .from(telemetryLogs)
    .where(sql`${telemetryLogs.createdAt} >= ${since}`)
    .groupBy(telemetryLogs.model, telemetryLogs.provider)
    .all();

  return {
    totalRequests: totalReq?.count || 0,
    successRequests: successCount,
    totalPromptTokens: totalReq?.promptTokens || 0,
    totalCompletionTokens: totalReq?.completionTokens || 0,
    totalCachedTokens: totalReq?.cachedTokens || 0,
    totalTokens: totalReq?.totalTokens || 0,
    avgDurationMs: Math.round(totalReq?.avgDuration || 0),
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
