import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(), // nr-api-xxxx (Used for Router Integration / Management API)
  description: text("description"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  lastUsedAt: integer("last_used_at"),
});

export const clientKeys = sqliteTable("client_keys", {
  id: text("id").primaryKey(),
  apiKeyId: text("api_key_id"), // Parent API Key (1 API Key has many Secret Keys)
  name: text("name").notNull(),
  key: text("key").notNull().unique(), // sk-neko-xxxx (Secret Key used for AI Proxy requests)
  isActive: integer("is_active").notNull().default(1),
  rateLimit: integer("rate_limit"), // requests per minute
  tokenLimit: integer("token_limit"), // maximum total tokens allowed (token quota limiter)
  usedTokens: integer("used_tokens").notNull().default(0), // consumed tokens
  allowedProviders: text("allowed_providers").notNull().default("[]"), // JSON string array of upstream IDs. Default '[]' (ALL OFF)
  roundRobinProviders: integer("round_robin_providers").notNull().default(1), // 1 = round robin across eligible providers, 0 = primary only
  createdAt: integer("created_at").notNull(),
  lastUsedAt: integer("last_used_at"),
});

export const upstreamKeys = sqliteTable("upstream_keys", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(), // 'openai' | 'anthropic'
  name: text("name").notNull(),
  prefix: text("prefix"), // Custom provider prefix for model IDs (e.g. 'ryzumi', 'oc-prod')
  apiKey: text("api_key").notNull(),
  apiKeys: text("api_keys"), // JSON array string of string[]: pool of keys for load-balancing
  models: text("models"), // JSON array string of { id: string; name?: string; enabled: boolean }[]
  baseUrl: text("base_url"), // e.g. https://api.openai.com/v1 or custom proxy
  isActive: integer("is_active").notNull().default(1),
  roundRobin: integer("round_robin").notNull().default(1), // 1 = round-robin across active keys, 0 = primary/sequential
  weight: integer("weight").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const telemetryLogs = sqliteTable("telemetry_logs", {
  id: text("id").primaryKey(),
  clientKeyId: text("client_key_id"),
  clientKeyName: text("client_key_name"),
  upstreamKeyId: text("upstream_key_id"),
  provider: text("provider").notNull(),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  isStreaming: integer("is_streaming").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull(),
});

export const responseCache = sqliteTable("response_cache", {
  hash: text("hash").primaryKey(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  responseJson: text("response_json").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
export type ClientKey = typeof clientKeys.$inferSelect;
export type InsertClientKey = typeof clientKeys.$inferInsert;
export type UpstreamKey = typeof upstreamKeys.$inferSelect;
export type TelemetryLog = typeof telemetryLogs.$inferSelect;
export type ResponseCache = typeof responseCache.$inferSelect;
