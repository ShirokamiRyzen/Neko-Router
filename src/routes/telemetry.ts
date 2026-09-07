import { Elysia, t } from "elysia";
import { getTelemetryStats, getRecentLogs, getActiveUpstreamIds } from "../services/telemetry";
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
  .get("/stats", ({ query }) => {
    const rangeHours = Number(query.hours) || 24;
    return getTelemetryStats(rangeHours * 60 * 60 * 1000);
  })
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
  );
