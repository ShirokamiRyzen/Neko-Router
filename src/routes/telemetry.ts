import { Elysia, t } from "elysia";
import {
 getTelemetryStats,
 getRecentLogs,
 getRecentToolLogs,
 getActiveUpstreamIds,
} from "../services/telemetry";
import { authMiddleware } from "../middleware/auth";

export const telemetryRoutes = new Elysia({ prefix: "/api/telemetry" })
  .use(authMiddleware)
  .onBeforeHandle(({ isAdmin, apiKey, set }) => {
    if (!isAdmin && !apiKey) {
      set.status = 401;
      return { error: "Unauthorized access to telemetry" };
    }
  })
  .get("/active", () => {
    return {
      activeUpstreamIds: getActiveUpstreamIds(),
    };
  })
  .get(
    "/stats",
    ({ query }) => {
      if (query.all === "true" || query.hours === "all" || query.hours === "0") {
        return getTelemetryStats({ all: true });
      }
      if (query.since && !isNaN(Number(query.since)) && Number(query.since) > 0) {
        return getTelemetryStats({ since: Number(query.since) });
      }
      const rangeHours = Number(query.hours) || 24;
      return getTelemetryStats({ timeRangeMs: rangeHours * 60 * 60 * 1000 });
    },
    {
      query: t.Object({
        hours: t.Optional(t.String()),
        since: t.Optional(t.String()),
        all: t.Optional(t.String()),
      }),
    }
  )
 .get(
 "/logs",
 ({ query }) => {
 const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
 const offset = Math.max(0, Number(query.offset) || 0);
 const logs = getRecentLogs(limit, offset);
 return { logs };
 },
 {
 query: t.Object({
 limit: t.Optional(t.String()),
 offset: t.Optional(t.String()),
 }),
 }
 )
 .get(
 "/tool-logs",
 ({ query }) => {
 const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
 const offset = Math.max(0, Number(query.offset) || 0);
 const toolType =
 query.type === "search" || query.type === "fetch" ? query.type : null;

 let since: number | undefined;
 const isAll =
 query.all === "true" || query.hours === "all" || query.hours === "0";

 if (!isAll) {
 if (query.since && !isNaN(Number(query.since)) && Number(query.since) > 0) {
 since = Number(query.since);
 } else {
 const hours = Number(query.hours) || 24;
 since = Date.now() - hours * 60 * 60 * 1000;
 }
 }

 const logs = getRecentToolLogs(limit, offset, { toolType, since });
 return { logs };
 },
 {
 query: t.Object({
 limit: t.Optional(t.String()),
 offset: t.Optional(t.String()),
 type: t.Optional(t.String()),
 hours: t.Optional(t.String()),
 since: t.Optional(t.String()),
 all: t.Optional(t.String()),
 }),
 }
 );
