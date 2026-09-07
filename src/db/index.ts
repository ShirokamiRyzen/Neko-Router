import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { dirname } from "path";
import { mkdirSync } from "fs";

export const DB_PATH = process.env.DB_PATH || "data/router.db";

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

export let sqlite = new Database(DB_PATH);
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA synchronous = NORMAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export let db = drizzle(sqlite, { schema });

export async function initDatabase(): Promise<void> {
  // Ensure tables exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS client_keys (
      id TEXT PRIMARY KEY,
      api_key_id TEXT,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      rate_limit INTEGER,
      token_limit INTEGER,
      used_tokens INTEGER NOT NULL DEFAULT 0,
      allowed_providers TEXT NOT NULL DEFAULT '[]',
      round_robin_providers INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS upstream_keys (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      prefix TEXT,
      api_key TEXT NOT NULL,
      api_keys TEXT,
      models TEXT,
      base_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      round_robin INTEGER NOT NULL DEFAULT 1,
      weight INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telemetry_logs (
      id TEXT PRIMARY KEY,
      client_key_id TEXT,
      client_key_name TEXT,
      upstream_key_id TEXT,
      provider TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cached_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      status_code INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      is_streaming INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS response_cache (
      hash TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      response_json TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  // Safe schema migrations
  try {
    sqlite.run("ALTER TABLE client_keys ADD COLUMN api_key_id TEXT;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE client_keys ADD COLUMN token_limit INTEGER;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE client_keys ADD COLUMN used_tokens INTEGER NOT NULL DEFAULT 0;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE telemetry_logs ADD COLUMN cached_tokens INTEGER NOT NULL DEFAULT 0;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE upstream_keys ADD COLUMN api_keys TEXT;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE upstream_keys ADD COLUMN models TEXT;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE upstream_keys ADD COLUMN round_robin INTEGER NOT NULL DEFAULT 1;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE upstream_keys ADD COLUMN prefix TEXT;");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE client_keys ADD COLUMN allowed_providers TEXT NOT NULL DEFAULT '[]';");
  } catch (e) {}
  try {
    sqlite.run("ALTER TABLE client_keys ADD COLUMN round_robin_providers INTEGER NOT NULL DEFAULT 1;");
  } catch (e) {}

  // Safe index creations
  try {
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_logs (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_telemetry_client_key ON telemetry_logs (client_key_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_provider ON telemetry_logs (provider);
      CREATE INDEX IF NOT EXISTS idx_client_keys_key ON client_keys (key);
      CREATE INDEX IF NOT EXISTS idx_client_keys_api_key_id ON client_keys (api_key_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key);
      CREATE INDEX IF NOT EXISTS idx_upstream_keys_provider ON upstream_keys (provider);
      CREATE INDEX IF NOT EXISTS idx_response_cache_expires ON response_cache (expires_at);
    `);
  } catch (e) {}

  // Check default PIN setup
  const pinRow = sqlite
    .query("SELECT value FROM settings WHERE key = 'auth_pin_hash'")
    .get() as { value: string } | null;

  if (!pinRow) {
    const hashedDefaultPin = await Bun.password.hash("123456", {
      algorithm: "bcrypt",
      cost: 10,
    });
    const now = Date.now();
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('auth_pin_hash', ?, ?)",
      [hashedDefaultPin, now]
    );
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('is_default_pin', '1', ?)",
      [now]
    );
    console.log("Initialized default PIN (123456) with is_default_pin=1");
  }

  // Check JWT secret
  const jwtRow = sqlite
    .query("SELECT value FROM settings WHERE key = 'jwt_secret'")
    .get() as { value: string } | null;

  if (!jwtRow) {
    const randomSecret =
      process.env.JWT_SECRET ||
      Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('jwt_secret', ?, ?)",
      [randomSecret, Date.now()]
    );
  }
}

export function reloadDatabase(): void {
  try {
    sqlite.close();
  } catch (e) {
    // ignore
  }
  sqlite = new Database(DB_PATH);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA synchronous = NORMAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  db = drizzle(sqlite, { schema });
}

export function checkpointWal(): void {
  sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE);");
}
