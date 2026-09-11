import { Elysia, t } from "elysia";
import { DB_PATH, checkpointWal, initTablesSync, sqlite } from "../db";
import { authMiddleware } from "../middleware/auth";
import { Database } from "bun:sqlite";
import { unlinkSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import {
  getOptimizationSettings,
  updateOptimizationSettings,
  clearResponseCache,
} from "../services/optimizer";

export const adminRoutes = new Elysia({ prefix: "/api/admin" })
  .use(authMiddleware)
  .onBeforeHandle(({ isAdmin, apiKey, set }) => {
    if (!isAdmin && !apiKey) {
      set.status = 401;
      return { error: "Unauthorized access to admin management" };
    }
  })
  .get("/settings/optimizations", () => {
    return getOptimizationSettings();
  })
  .post(
    "/settings/optimizations",
    ({ body }) => {
      return updateOptimizationSettings(body);
    },
    {
      body: t.Object({
        cacheEnabled: t.Optional(t.Boolean()),
        rtkCompression: t.Optional(t.Boolean()),
        cavemanMode: t.Optional(t.Boolean()),
        minifyPrompt: t.Optional(t.Boolean()),
        cacheTtlSeconds: t.Optional(t.Number()),
        httpsOnly: t.Optional(t.Boolean()),
        requestTimeoutSeconds: t.Optional(t.Number()),
      }),
    }
  )
  .post("/cache/clear", () => {
    return clearResponseCache();
  })
  .get("/system", () => {
    const memory = process.memoryUsage();
    let dbSize = 0;
    try {
      const file = Bun.file(DB_PATH);
      dbSize = file.size;
    } catch (e) {
      // ignore
    }

    return {
      version: "1.0.0",
      bunVersion: Bun.version,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100,
      },
      dbSizeBytes: dbSize,
      dbPath: DB_PATH,
    };
  })
  .get("/db/export", () => {
    // 1. Truncate WAL to write all transactions into the main .db file
    checkpointWal();

    const file = Bun.file(DB_PATH);
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `neko-router-backup-${dateStr}.sqlite`;

    return new Response(file, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  })
  .post(
    "/db/import",
    async ({ body, set }) => {
      const file = body?.file as Blob | null;
      if (!file) {
        set.status = 400;
        return { success: false, error: "No database file provided" };
      }

      const tempId = crypto.randomUUID().slice(0, 8);
      const tempPath = join(dirname(DB_PATH), `temp_import_${tempId}.sqlite`);

      try {
        const buffer = await file.arrayBuffer();
        if (buffer.byteLength < 100) {
          set.status = 400;
          return { success: false, error: "File too small to be a valid SQLite database" };
        }

        // Verify SQLite Magic Header
        const header = new TextDecoder().decode(new Uint8Array(buffer, 0, 16));
        if (!header.startsWith("SQLite format 3")) {
          set.status = 400;
          return { success: false, error: "Invalid SQLite file header" };
        }

        // Write temp file
        await Bun.write(tempPath, buffer);

        // Verify integrity and schema
        const testDb = new Database(tempPath, { readonly: true });
        try {
          const integrity = testDb
            .query("PRAGMA integrity_check;")
            .get() as { integrity_check?: string } | null;

          if (integrity?.integrity_check !== "ok") {
            testDb.close();
            unlinkSync(tempPath);
            set.status = 400;
            return {
              success: false,
              error: `Database integrity check failed: ${integrity?.integrity_check}`,
            };
          }

          // Check required tables
          const tables = testDb
            .query("SELECT name FROM sqlite_master WHERE type='table'")
            .all() as { name: string }[];
          const tableNames = new Set(tables.map((t) => t.name));

          const required = ["settings", "client_keys", "upstream_keys", "telemetry_logs"];
          const missing = required.filter((req) => !tableNames.has(req));

          if (missing.length > 0) {
            testDb.close();
            unlinkSync(tempPath);
            set.status = 400;
            return {
              success: false,
              error: `Schema integrity failure: Missing required tables: ${missing.join(", ")}`,
            };
          }

          testDb.close();
        } catch (e: any) {
          testDb.close();
          unlinkSync(tempPath);
          set.status = 400;
          return {
            success: false,
            error: `Failed to inspect database schema: ${e?.message}`,
          };
        }

        // Backup current database using online SQLite VACUUM INTO
        const backupPath = `${DB_PATH}.bak`;
        try {
          if (existsSync(backupPath)) unlinkSync(backupPath);
          sqlite.run("VACUUM INTO ?", [backupPath]);
        } catch {
          try {
            copyFileSync(DB_PATH, backupPath);
          } catch {}
        }

        // Attach imported DB and atomically synchronize tables
        // Avoids file locking (EBUSY) issues on Windows
        const normalizedTempPath = tempPath.replace(/\\/g, "/");
        sqlite.run("ATTACH DATABASE ? AS imported_db", [normalizedTempPath]);
        try {
          const syncTx = sqlite.transaction(() => {
            sqlite.run("PRAGMA foreign_keys = OFF;");

            const importedTables = (
              sqlite
                .query(
                  "SELECT name FROM imported_db.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
                .all() as { name: string }[]
            ).map((r) => r.name);

            const mainTables = (
              sqlite
                .query(
                  "SELECT name FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
                .all() as { name: string }[]
            ).map((r) => r.name);

            for (const table of importedTables) {
              if (mainTables.includes(table)) {
                const mainCols = (
                  sqlite.query(`PRAGMA main.table_info("${table}")`).all() as {
                    name: string;
                  }[]
                ).map((c) => c.name);
                const importedCols = (
                  sqlite
                    .query(`PRAGMA imported_db.table_info("${table}")`)
                    .all() as { name: string }[]
                ).map((c) => c.name);
                const commonCols = mainCols.filter((c) =>
                  importedCols.includes(c)
                );

                if (commonCols.length > 0) {
                  const colList = commonCols.map((c) => `"${c}"`).join(", ");
                  sqlite.run(`DELETE FROM main."${table}";`);
                  sqlite.run(
                    `INSERT INTO main."${table}" (${colList}) SELECT ${colList} FROM imported_db."${table}";`
                  );
                }
              }
            }

            sqlite.run("PRAGMA foreign_keys = ON;");
          });

          syncTx();
        } finally {
          try {
            sqlite.run("DETACH DATABASE imported_db;");
          } catch {}
        }

        // Clean up temp file
        if (existsSync(tempPath)) {
          unlinkSync(tempPath);
        }

        // Checkpoint WAL to flush imported data cleanly and verify schema
        initTablesSync();
        checkpointWal();

        return {
          success: true,
          message: "Database imported and validated successfully",
        };
      } catch (err: any) {
        if (existsSync(tempPath)) unlinkSync(tempPath);
        set.status = 500;
        return {
          success: false,
          error: `Import failed: ${err?.message || "Unknown error"}`,
        };
      }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  );
