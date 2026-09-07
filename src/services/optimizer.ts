import { sqlite } from "../db";

export interface OptimizationSettings {
  cacheEnabled: boolean;
  rtkCompression: boolean;
  cavemanMode: boolean;
  minifyPrompt: boolean;
  cacheTtlSeconds: number;
  httpsOnly: boolean;
  requestTimeoutSeconds: number;
}

export function getOptimizationSettings(): OptimizationSettings {
  try {
    const rows = sqlite
      .query("SELECT key, value FROM settings WHERE key LIKE 'opt_%'")
      .all() as { key: string; value: string }[];

    const map = new Map(rows.map((r) => [r.key, r.value]));
    const timeoutVal = parseInt(map.get("opt_request_timeout") || "0", 10);

    return {
      cacheEnabled: map.get("opt_cache_enabled") !== "0", // Default enabled (1)
      rtkCompression: map.get("opt_rtk_compression") === "1",
      cavemanMode: map.get("opt_caveman_mode") === "1",
      minifyPrompt: map.get("opt_minify_prompt") === "1",
      cacheTtlSeconds: parseInt(map.get("opt_cache_ttl") || "3600", 10),
      httpsOnly: map.get("opt_https_only") === "1",
      requestTimeoutSeconds: isNaN(timeoutVal) || timeoutVal < 0 ? 0 : timeoutVal,
    };
  } catch (e) {
    return {
      cacheEnabled: true,
      rtkCompression: false,
      cavemanMode: false,
      minifyPrompt: false,
      cacheTtlSeconds: 3600,
      httpsOnly: false,
      requestTimeoutSeconds: 0,
    };
  }
}

export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.toLowerCase() === "https";
  }
  const forwardedSsl = request.headers.get("x-forwarded-ssl");
  if (forwardedSsl && forwardedSsl.toLowerCase() === "on") {
    return true;
  }
  try {
    const url = new URL(request.url);
    return url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

export function checkHttpsRequirement(request: Request): Response | null {
  const opt = getOptimizationSettings();
  if (!opt.httpsOnly) return null;

  if (!isHttpsRequest(request)) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "HTTPS is required by server policy. Unencrypted HTTP requests are rejected. Please use https:// or set 'X-Forwarded-Proto: https'.",
          type: "https_required",
          code: "https_only",
        },
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  return null;
}

export function updateOptimizationSettings(
  settings: Partial<OptimizationSettings>
): OptimizationSettings {
  const now = Date.now();

  if (settings.cacheEnabled !== undefined) {
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('opt_cache_enabled', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [settings.cacheEnabled ? "1" : "0", now]
    );
  }
  if (settings.rtkCompression !== undefined) {
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('opt_rtk_compression', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [settings.rtkCompression ? "1" : "0", now]
    );
  }
  if (settings.cavemanMode !== undefined) {
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('opt_caveman_mode', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [settings.cavemanMode ? "1" : "0", now]
    );
  }
  if (settings.minifyPrompt !== undefined) {
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('opt_minify_prompt', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [settings.minifyPrompt ? "1" : "0", now]
    );
  }
  if (settings.cacheTtlSeconds !== undefined) {
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('opt_cache_ttl', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [String(Math.max(60, settings.cacheTtlSeconds)), now]
    );
  }
  if (settings.httpsOnly !== undefined) {
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('opt_https_only', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [settings.httpsOnly ? "1" : "0", now]
    );
  }
  if (settings.requestTimeoutSeconds !== undefined) {
    const timeoutVal = Math.max(0, Math.floor(Number(settings.requestTimeoutSeconds) || 0));
    sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('opt_request_timeout', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [String(timeoutVal), now]
    );
  }

  return getOptimizationSettings();
}

/**
 * RTK (Repeated Token Knowledge) Compression
 * Eliminates duplicate sentences, repeated words, and redundant whitespace bloat.
 */
export function applyRTKCompression(text: string): string {
  if (!text || text.length < 10) return text;

  // 1. Collapse multiple line breaks and trailing spaces
  let cleaned = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");

  // 2. Remove immediate duplicate consecutive lines
  const lines = cleaned.split("\n");
  const filteredLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i]?.trim();
    const prev = filteredLines[filteredLines.length - 1]?.trim();
    if (curr && curr === prev) {
      continue; // skip duplicate repeated line
    }
    filteredLines.push(lines[i] ?? "");
  }

  return filteredLines.join("\n");
}

/**
 * Minify prompt: strip excessive whitespace and redundant padding
 */
export function minifyContent(text: string): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, idx, arr) => !(l.trim() === "" && arr[idx - 1]?.trim() === ""))
    .join("\n");
}

/**
 * Apply active global optimizations to OpenAI / Anthropic request payload
 */
export function optimizeRequestBody(body: any, provider: "openai" | "anthropic"): any {
  const opt = getOptimizationSettings();
  if (!opt.rtkCompression && !opt.cavemanMode && !opt.minifyPrompt) {
    return body;
  }

  const cloned = JSON.parse(JSON.stringify(body));

  // 1. Caveman Mode: Inject ultra-dense conciseness directive
  const cavemanInstruction =
    "Caveman Mode Active: Respond with extreme brevity and maximum density. Omit all pleasantries, preambles, greetings, apologies, and conversational fluff. Use telegram style where appropriate.";

  if (opt.cavemanMode) {
    if (provider === "openai" && Array.isArray(cloned.messages)) {
      const existingSystem = cloned.messages.find((m: any) => m.role === "system");
      if (existingSystem) {
        existingSystem.content = `${existingSystem.content}\n\n[DIRECTIVE: ${cavemanInstruction}]`;
      } else {
        cloned.messages.unshift({ role: "system", content: cavemanInstruction });
      }
    } else if (provider === "anthropic") {
      if (cloned.system) {
        cloned.system = `${cloned.system}\n\n[DIRECTIVE: ${cavemanInstruction}]`;
      } else {
        cloned.system = cavemanInstruction;
      }
    }
  }

  // 2. RTK Compression & Minification on User / Context messages
  if (opt.rtkCompression || opt.minifyPrompt) {
    if (Array.isArray(cloned.messages)) {
      for (const msg of cloned.messages) {
        if (typeof msg.content === "string") {
          if (opt.minifyPrompt) {
            msg.content = minifyContent(msg.content);
          }
          if (opt.rtkCompression) {
            msg.content = applyRTKCompression(msg.content);
          }
        }
      }
    }
  }

  return cloned;
}

/**
 * Exact Response Cache Helpers
 */
export async function computeCacheKey(
  provider: string,
  model: string,
  messages: any
): Promise<string> {
  const payload = `${provider}:${model}:${JSON.stringify(messages)}`;
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getCachedResponse(hash: string): {
  responseJson: any;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null {
  try {
    const now = Date.now();
    const row = sqlite
      .query(
        "SELECT response_json, prompt_tokens, completion_tokens, total_tokens, expires_at FROM response_cache WHERE hash = ?"
      )
      .get(hash) as {
      response_json: string;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      expires_at: number;
    } | null;

    if (!row) return null;
    if (row.expires_at < now) {
      sqlite.run("DELETE FROM response_cache WHERE hash = ?", [hash]);
      return null;
    }

    return {
      responseJson: JSON.parse(row.response_json),
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      totalTokens: row.total_tokens,
    };
  } catch (e) {
    return null;
  }
}

export function setCachedResponse(
  hash: string,
  provider: string,
  model: string,
  responseObj: any,
  promptTokens: number,
  completionTokens: number,
  ttlSeconds = 3600
): void {
  try {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const jsonStr = JSON.stringify(responseObj);

    sqlite.run(
      `INSERT INTO response_cache (hash, provider, model, response_json, prompt_tokens, completion_tokens, total_tokens, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(hash) DO UPDATE SET response_json = excluded.response_json, expires_at = excluded.expires_at`,
      [
        hash,
        provider,
        model,
        jsonStr,
        promptTokens,
        completionTokens,
        promptTokens + completionTokens,
        now,
        expiresAt,
      ]
    );
  } catch (e) {
    console.error("Failed to save response cache:", e);
  }
}

export function clearResponseCache(): { cleared: number } {
  try {
    const count =
      (
        sqlite
          .query("SELECT count(*) as count FROM response_cache")
          .get() as { count: number }
      )?.count || 0;
    sqlite.run("DELETE FROM response_cache;");
    return { cleared: count };
  } catch (e) {
    return { cleared: 0 };
  }
}
