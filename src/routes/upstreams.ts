import { Elysia, t } from "elysia";
import { db } from "../db";
import { upstreamKeys } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";
import {
  getBaseUrl,
  getApiKeyForUpstream,
  parseUpstreamKeys,
  parseUpstreamKeyEntries,
  parseUpstreamModels,
  type UpstreamKeyEntry,
} from "../services/router";
import {
  requestGitHubDeviceCode,
  pollGitHubDeviceToken,
  getCopilotInternalToken,
  fetchCopilotLiveModels,
  GITHUB_COPILOT_CONFIG,
  COPILOT_DEFAULT_MODELS,
} from "../services/copilot";
import {
  buildAntigravityAuthUrl,
  exchangeAntigravityCode,
  fetchAntigravityModels,
  ANTIGRAVITY_CONFIG,
  ANTIGRAVITY_DEFAULT_MODELS,
} from "../services/antigravity";
import {
  buildCodexAuthUrl,
  exchangeCodexCode,
  generatePkce,
  startCodexCallbackServer,
  getCodexSession,
  removeCodexSession,
  extractCodexJwtClaims,
  CODEX_CONFIG,
  CODEX_DEFAULT_MODELS,
} from "../services/codex";
import { fetchBandelBangetLiveModels } from "../services/bandelbanget";

const adjectives = [
  "hyper", "quantum", "stellar", "apex", "swift", "cyber", "turbo",
  "neon", "vivid", "sonic", "ultra", "prime", "shadow", "cosmic", "emerald"
];

const nouns = [
  "falcon", "lynx", "neko", "panther", "router", "gateway", "pulse",
  "engine", "spark", "node", "core", "vertex", "nexus", "orbit"
];

function generateRandomAlias(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun}-${num}`;
}

function maskKey(key: string): string {
  if (!key) return "******";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "******";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

export function parseRawKeysInput(
  rawKeys: string,
  defaultPrefix = "API Key",
  startIndex = 1
): Array<{ name: string; key: string }> {
  if (!rawKeys || !rawKeys.trim()) return [];

  const lines = rawKeys.split(/\r?\n/);
  const results: Array<{ name: string; key: string }> = [];
  let counter = startIndex;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check if comma-separated on a single line (unless the line has label: key format)
    if (trimmedLine.includes(",") && !trimmedLine.includes(":")) {
      const parts = trimmedLine.split(",").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const cleanKey = part.replace(/^["']|["']$/g, "").trim();
        if (cleanKey.length > 0) {
          results.push({
            name: `${defaultPrefix} #${counter++}`,
            key: cleanKey,
          });
        }
      }
      continue;
    }

    // Check if line has label: key or label = key
    const match = trimmedLine.match(/^([^:=]+)[:=]\s*(.+)$/);
    if (match) {
      const label = match[1]!.trim();
      const rawKey = match[2]!.trim().replace(/^[,"';]+|[,"';]+$/g, "");
      if (rawKey.length > 0) {
        results.push({
          name: label || `${defaultPrefix} #${counter++}`,
          key: rawKey,
        });
        continue;
      }
    }

    // Single key on line
    const cleanKey = trimmedLine.replace(/^[,"';]+|[,"';]+$/g, "");
    if (cleanKey.length > 0) {
      results.push({
        name: `${defaultPrefix} #${counter++}`,
        key: cleanKey,
      });
    }
  }

  return results;
}

async function testSingleKey(
  provider: "openai" | "anthropic",
  baseUrl: string | null,
  key: string
): Promise<{ success: boolean; latencyMs: number; error?: string; message?: string }> {
  const startTime = performance.now();
  const effectiveBaseUrl =
    baseUrl && baseUrl.trim().length > 0
      ? baseUrl.replace(/\/+$/, "")
      : provider === "openai"
        ? "https://api.openai.com/v1"
        : "https://api.anthropic.com";

  // Check if token is a GitHub Copilot token (starts with ghu_ or gho_)
  const isCopilot = key.startsWith("ghu_") || key.startsWith("gho_") || effectiveBaseUrl.includes("githubcopilot.com");
  if (isCopilot) {
    if (key.startsWith("ghu_") || key.startsWith("gho_")) {
      try {
        const res = await fetch(GITHUB_COPILOT_CONFIG.COPILOT_TOKEN_URL, {
          headers: {
            Authorization: `token ${key}`,
            "User-Agent": GITHUB_COPILOT_CONFIG.USER_AGENT,
            "Editor-Version": `vscode/${GITHUB_COPILOT_CONFIG.VSCODE_VERSION}`,
            "Editor-Plugin-Version": `copilot-chat/${GITHUB_COPILOT_CONFIG.COPILOT_CHAT_VERSION}`,
            "x-github-api-version": GITHUB_COPILOT_CONFIG.API_VERSION,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });
        const latencyMs = Math.round(performance.now() - startTime);
        if (res.ok) {
          const data = (await res.json()) as any;
          const expDate = data?.expires_at ? new Date(data.expires_at * 1000).toLocaleTimeString() : "";
          return {
            success: true,
            latencyMs,
            message: `GitHub Copilot token is active and valid!${expDate ? ` (Session refreshed: ${expDate})` : ""}`,
          };
        } else {
          return {
            success: false,
            latencyMs,
            error:
              res.status === 401 || res.status === 403
                ? "This GitHub account does not have an active GitHub Copilot subscription."
                : `HTTP ${res.status}: Failed to verify GitHub Copilot token`,
          };
        }
      } catch (e: any) {
        const latencyMs = Math.round(performance.now() - startTime);
        return { success: false, latencyMs, error: e?.message || "Connection to GitHub timed out" };
      }
    }
  }

  // Check if token is Antigravity (Google OAuth)
  const isAntigravity =
    key.startsWith("ya29.") ||
    effectiveBaseUrl.includes("cloudcode-pa.googleapis.com") ||
    effectiveBaseUrl.includes("daily-cloudcode-pa.googleapis.com");
  if (isAntigravity) {
    try {
      const res = await fetch(`${ANTIGRAVITY_CONFIG.USER_INFO_URL}?alt=json`, {
        headers: {
          Authorization: `Bearer ${key}`,
          "x-request-source": "local",
        },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok) {
        const userInfo = (await res.json()) as any;
        return {
          success: true,
          latencyMs,
          message: `Antigravity Google account active! (${userInfo.email || userInfo.name || "Authenticated"})`,
        };
      } else {
        return {
          success: false,
          latencyMs,
          error: `HTTP ${res.status}: Failed to verify Google OAuth token (expired or invalid)`,
        };
      }
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { success: false, latencyMs, error: e?.message || "Connection to Google OAuth timed out" };
    }
  }

  try {
    if (provider === "openai") {
      const url = `${effectiveBaseUrl}/models`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${key}`,
      };

      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok) {
        return { success: true, latencyMs, message: "Connection successful" };
      } else {
        const text = await res.text();
        return {
          success: false,
          latencyMs,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        };
      }
    } else {
      const url = `${effectiveBaseUrl}/v1/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok || res.status === 400) {
        return { success: true, latencyMs, message: "Connection successful" };
      } else {
        const text = await res.text();
        return {
          success: false,
          latencyMs,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        };
      }
    }
  } catch (e: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return { success: false, latencyMs, error: e?.message || "Connection timeout or failed" };
  }
}

export const upstreamRoutes = new Elysia({ prefix: "/api/upstreams" })
  .use(authMiddleware)
  .onBeforeHandle(({ isAdmin, apiKey, set }) => {
    if (!isAdmin && !apiKey) {
      set.status = 401;
      return { error: "Unauthorized access to upstream keys" };
    }
  })
  .get("/generate-alias", () => {
    return { alias: generateRandomAlias() };
  })
  .post("/copilot/device-code", async ({ set }) => {
    try {
      const data = await requestGitHubDeviceCode();
      return { success: true, ...data };
    } catch (err: any) {
      set.status = 500;
      return { success: false, error: err?.message || "Failed to initiate GitHub device code" };
    }
  })
  .post(
    "/copilot/poll-token",
    async ({ body, set }) => {
      const { deviceCode } = body;
      if (!deviceCode) {
        set.status = 400;
        return { status: "error", error: "deviceCode is required" };
      }
      const res = await pollGitHubDeviceToken(deviceCode);
      return res;
    },
    {
      body: t.Object({
        deviceCode: t.String(),
      }),
    }
  )
  .post(
    "/antigravity/auth-url",
    async ({ body, set }) => {
      try {
        const redirectUri = body?.redirectUri || ANTIGRAVITY_CONFIG.REDIRECT_URI || "http://localhost:51121/oauth-callback";
        const state = `ag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const authUrl = buildAntigravityAuthUrl(redirectUri, state);
        return { success: true, authUrl, state, redirectUri };
      } catch (err: any) {
        set.status = 500;
        return { success: false, error: err?.message || "Failed to generate Antigravity authorization URL" };
      }
    },
    {
      body: t.Optional(
        t.Object({
          redirectUri: t.Optional(t.String()),
        })
      ),
    }
  )
  .post(
    "/antigravity/exchange",
    async ({ body, set }) => {
      try {
        const { code, redirectUri } = body;
        if (!code) {
          set.status = 400;
          return { success: false, error: "Authorization code is required" };
        }
        const data = await exchangeAntigravityCode(code.trim(), redirectUri || ANTIGRAVITY_CONFIG.REDIRECT_URI || "http://localhost:51121/oauth-callback");
        return { success: true, ...data };
      } catch (err: any) {
        set.status = 500;
        return { success: false, error: err?.message || "Failed to exchange Antigravity authorization code" };
      }
    },
    {
      body: t.Object({
        code: t.String(),
        redirectUri: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/codex/auth-url",
    async ({ set }) => {
      try {
        const { codeVerifier, codeChallenge } = generatePkce();
        const state = `cx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const authUrl = buildCodexAuthUrl(state, codeChallenge);

        // Start local callback listener on port 1455
        const serverResult = startCodexCallbackServer({
          state,
          codeVerifier,
          redirectUri: CODEX_CONFIG.REDIRECT_URI,
          status: "pending",
          createdAt: Date.now(),
        });

        return {
          success: true,
          authUrl,
          state,
          codeVerifier,
          localPort: serverResult.port,
          serverRunning: serverResult.success,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, error: err?.message || "Failed to generate OpenAI Codex authorization URL" };
      }
    }
  )
  .get(
    "/codex/status",
    ({ query: { state }, set }) => {
      if (!state) {
        set.status = 400;
        return { success: false, error: "State parameter is required" };
      }
      const session = getCodexSession(state);
      if (!session) {
        return { success: false, status: "expired", error: "Session expired" };
      }
      if (session.status === "done") {
        removeCodexSession(state);
        return { success: true, status: "done", result: session.result };
      }
      if (session.status === "error") {
        removeCodexSession(state);
        return { success: false, status: "error", error: session.error };
      }
      return { success: true, status: "pending" };
    },
    {
      query: t.Object({
        state: t.String(),
      }),
    }
  )
  .post(
    "/codex/exchange",
    async ({ body, set }) => {
      try {
        const { code, codeVerifier, redirectUri } = body;
        if (!code) {
          set.status = 400;
          return { success: false, error: "Authorization code or callback URL is required" };
        }

        // Clean code: if user pasted full redirect URL like http://localhost:1455/auth/callback?code=...
        let cleanCode = code.trim();
        if (cleanCode.includes("code=")) {
          try {
            const parsed = new URL(cleanCode, "http://localhost");
            cleanCode = parsed.searchParams.get("code") || cleanCode;
          } catch {
            const match = cleanCode.match(/[?&]code=([^&]+)/);
            if (match && match[1]) cleanCode = decodeURIComponent(match[1]);
          }
        }

        const data = await exchangeCodexCode(
          cleanCode,
          codeVerifier.trim(),
          redirectUri || CODEX_CONFIG.REDIRECT_URI
        );
        return { success: true, ...data };
      } catch (err: any) {
        set.status = 500;
        return { success: false, error: err?.message || "Failed to exchange OpenAI Codex authorization code" };
      }
    },
    {
      body: t.Object({
        code: t.String(),
        codeVerifier: t.String(),
        redirectUri: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/codex/import-token",
    async ({ body, set }) => {
      try {
        const { accessToken } = body;
        if (!accessToken || !accessToken.trim()) {
          set.status = 400;
          return { success: false, error: "Access token is required" };
        }
        const token = accessToken.trim();
        const claims = extractCodexJwtClaims(token);
        return {
          success: true,
          accessToken: token,
          email: claims.email,
          name: claims.name,
          chatgptAccountId: claims.chatgptAccountId,
          chatgptPlanType: claims.chatgptPlanType,
          expiresAt: claims.exp,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, error: err?.message || "Failed to import ChatGPT token" };
      }
    },
    {
      body: t.Object({
        accessToken: t.String(),
      }),
    }
  )
  .get("/", () => {
    const list = db
      .select()
      .from(upstreamKeys)
      .orderBy(desc(upstreamKeys.createdAt))
      .all();

    return {
      upstreams: list.map((item) => {
        const isFollow = Boolean((item as any).followUpstream);
        const entries = isFollow ? [] : parseUpstreamKeyEntries(item.apiKeys, item.apiKey);
        const activeEntries = entries.filter((e) => e.isActive);
        const models = parseUpstreamModels(item.models);
        const enabledCount = models.filter((m) => m.enabled).length;

        return {
          id: item.id,
          provider: item.provider as "openai" | "anthropic",
          name: item.name,
          prefix: item.prefix || null,
          baseUrl: item.baseUrl || null,
          isActive: item.isActive,
          roundRobin: (item as any).roundRobin !== 0,
          weight: item.weight,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          apiKey: isFollow ? "" : (activeEntries[0]?.key || entries[0]?.key || item.apiKey || ""),
          apiKeys: entries.map((e) => e.key),
          keyEntries: entries.map((e) => ({
            id: e.id,
            name: e.name,
            maskedKey: maskKey(e.key),
            isActive: e.isActive,
            createdAt: e.createdAt,
          })),
          totalKeysCount: entries.length,
          activeKeysCount: activeEntries.length,
          maskedKey: isFollow ? "" : maskKey(activeEntries[0]?.key || entries[0]?.key || item.apiKey || ""),
          maskedKeys: entries.map((e) => maskKey(e.key)),
          models,
          totalModelsCount: models.length,
          enabledModelsCount: enabledCount,
          followUpstream: isFollow,
        };
      }),
    };
  })
  .get("/:id", ({ params: { id }, set }) => {
    const item = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!item) {
      set.status = 404;
      return { error: "Upstream key not found" };
    }

    const isFollow = Boolean((item as any).followUpstream);
    const entries = isFollow ? [] : parseUpstreamKeyEntries(item.apiKeys, item.apiKey);
    const activeEntries = entries.filter((e) => e.isActive);
    const models = parseUpstreamModels(item.models);

    return {
      upstream: {
        id: item.id,
        provider: item.provider,
        name: item.name,
        prefix: item.prefix || null,
        baseUrl: item.baseUrl || null,
        isActive: item.isActive,
        roundRobin: (item as any).roundRobin !== 0,
        weight: item.weight,
        followUpstream: isFollow,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        apiKey: isFollow ? "" : (activeEntries[0]?.key || entries[0]?.key || item.apiKey || ""),
        apiKeys: entries.map((e) => e.key),
        keyEntries: entries,
        totalKeysCount: entries.length,
        activeKeysCount: activeEntries.length,
        models,
      },
    };
  })
  .post(
    "/",
    ({ body, set }) => {
      const { provider, name, prefix, apiKey, apiKeys, keyEntries, rawKeys, baseUrl, weight, roundRobin, models } = body;

      // Extract and normalize keys list
      let normalizedEntries: UpstreamKeyEntry[] = [];
      if (Array.isArray(keyEntries) && keyEntries.length > 0) {
        normalizedEntries = keyEntries
          .filter((k: any) => k && typeof k.key === "string" && k.key.trim().length > 0)
          .map((k: any, idx: number) => ({
            id: k.id || `key_${Date.now()}_${idx}`,
            name: k.name?.trim() || `API Key #${idx + 1}`,
            key: k.key.trim(),
            isActive: k.isActive !== false,
            createdAt: Date.now(),
            refreshToken: typeof k.refreshToken === "string" ? k.refreshToken : undefined,
            expiresAt: typeof k.expiresAt === "number" ? k.expiresAt : undefined,
          }));
      } else if (rawKeys && rawKeys.trim().length > 0) {
        const parsed = parseRawKeysInput(rawKeys, "API Key", 1);
        normalizedEntries = parsed.map((p, idx) => ({
          id: `key_${Date.now()}_${idx}`,
          name: p.name,
          key: p.key,
          isActive: true,
          createdAt: Date.now(),
        }));
      } else if (Array.isArray(apiKeys) && apiKeys.length > 0) {
        normalizedEntries = apiKeys
          .map((k: any) => String(k).trim())
          .filter((k) => k.length > 0)
          .map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
      } else if (apiKey && apiKey.trim().length > 0) {
        normalizedEntries = apiKey
          .split(/[\n,]+/)
          .map((k: string) => k.trim())
          .filter((k) => k.length > 0)
          .map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
      }

      const isFollowUp = Boolean((body as any).followUpstream);
      if (normalizedEntries.length === 0) {
        if (isFollowUp) {
          normalizedEntries = [];
        } else {
          set.status = 400;
          return { error: "At least one API Key must be provided" };
        }
      }

      const id = "up_" + crypto.randomUUID().replace(/-/g, "");
      const now = Date.now();
      const firstActive = normalizedEntries.find((k) => k.isActive);

      db.insert(upstreamKeys)
        .values({
          id,
          provider,
          name: name?.trim() || generateRandomAlias(),
          prefix: prefix ? prefix.trim() : null,
          apiKey: isFollowUp ? "" : (firstActive ? firstActive.key : (normalizedEntries[0]?.key || "")),
          apiKeys: JSON.stringify(normalizedEntries),
          models: models ? JSON.stringify(models) : JSON.stringify([]),
          baseUrl: baseUrl?.trim() || null,
          isActive: 1,
          roundRobin: isFollowUp ? 0 : (roundRobin !== false ? 1 : 0),
          weight: weight ?? 1,
          followUpstream: isFollowUp ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return {
        success: true,
        upstream: {
          id,
          provider,
          name: name?.trim() || generateRandomAlias(),
          prefix: prefix ? prefix.trim() : null,
          apiKey: isFollowUp ? "" : (firstActive ? firstActive.key : (normalizedEntries[0]?.key || "")),
          apiKeys: normalizedEntries.map((e) => e.key),
          keyEntries: normalizedEntries,
          baseUrl: baseUrl?.trim() || null,
          isActive: 1,
          roundRobin: isFollowUp ? false : (roundRobin !== false),
          weight: weight ?? 1,
          followUpstream: Boolean(isFollowUp),
        },
      };
    },
    {
      body: t.Object({
        provider: t.Union([t.Literal("openai"), t.Literal("anthropic")]),
        name: t.String(),
        prefix: t.Optional(t.Nullable(t.String())),
        apiKey: t.Optional(t.String()),
        apiKeys: t.Optional(t.Array(t.String())),
        rawKeys: t.Optional(t.String()),
        keyEntries: t.Optional(
          t.Array(
            t.Object({
              id: t.Optional(t.String()),
              name: t.Optional(t.String()),
              key: t.String(),
              isActive: t.Optional(t.Boolean()),
            })
          )
        ),
        baseUrl: t.Optional(t.String()),
        weight: t.Optional(t.Number()),
        roundRobin: t.Optional(t.Boolean()),
        followUpstream: t.Optional(t.Boolean()),
        models: t.Optional(
          t.Array(
            t.Object({
              id: t.String(),
              name: t.Optional(t.String()),
              enabled: t.Boolean(),
            })
          )
        ),
      }),
    }
  )
  .patch(
    "/:id",
    ({ params: { id }, body, set }) => {
      const existing = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!existing) {
        set.status = 404;
        return { error: "Upstream not found" };
      }

      const updateData: Partial<typeof upstreamKeys.$inferInsert> = {
        updatedAt: Date.now(),
      };

      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.prefix !== undefined) updateData.prefix = body.prefix ? body.prefix.trim() : null;
      if (body.provider !== undefined) updateData.provider = body.provider;
      if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl?.trim() || null;
      if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0;
      if (body.roundRobin !== undefined) updateData.roundRobin = body.roundRobin ? 1 : 0;
      if (body.weight !== undefined) updateData.weight = Math.max(1, body.weight);
      if (body.followUpstream !== undefined) updateData.followUpstream = body.followUpstream ? 1 : 0;

      // Multiple keys update - gracefully merge if key is omitted
      if (body.keyEntries !== undefined) {
        const existingEntries = parseUpstreamKeyEntries(existing.apiKeys, existing.apiKey);
        const existingMap = new Map(existingEntries.map((e) => [e.id, e]));

        const normalized: UpstreamKeyEntry[] = [];
        for (let idx = 0; idx < body.keyEntries.length; idx++) {
          const item = body.keyEntries[idx];
          if (!item) continue;
          const existingEntry = item.id ? existingMap.get(item.id) : undefined;
          const actualKey =
            item.key && typeof item.key === "string" && item.key.trim().length > 0
              ? item.key.trim()
              : existingEntry?.key;

          if (!actualKey) continue;

          normalized.push({
            id: item.id || `key_${Date.now()}_${idx}`,
            name: item.name?.trim() || existingEntry?.name || `API Key #${idx + 1}`,
            key: actualKey,
            isActive: item.isActive !== undefined ? item.isActive : (existingEntry ? existingEntry.isActive : true),
            createdAt: (item as any).createdAt || existingEntry?.createdAt || Date.now(),
            refreshToken: (item as any).refreshToken || existingEntry?.refreshToken || undefined,
            expiresAt: (item as any).expiresAt || existingEntry?.expiresAt || undefined,
          });
        }
        if (normalized.length > 0) {
          updateData.apiKeys = JSON.stringify(normalized);
          const firstActive = normalized.find((k) => k.isActive);
          updateData.apiKey = firstActive ? firstActive.key : normalized[0]!.key;
        }
      } else if (body.rawKeys !== undefined && body.rawKeys.trim().length > 0) {
        const parsed = parseRawKeysInput(body.rawKeys, "API Key", 1);
        if (parsed.length > 0) {
          const normalized = parsed.map((p, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: p.name,
            key: p.key,
            isActive: true,
            createdAt: Date.now(),
          }));
          updateData.apiKeys = JSON.stringify(normalized);
          updateData.apiKey = normalized[0]!.key;
        }
      } else if (body.apiKeys !== undefined) {
        const cleaned = body.apiKeys
          .map((k: any) => String(k).trim())
          .filter((k) => k.length > 0);
        if (cleaned.length > 0) {
          const normalized = cleaned.map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
          updateData.apiKeys = JSON.stringify(normalized);
          updateData.apiKey = cleaned[0]!;
        }
      } else if (body.apiKey !== undefined && body.apiKey.trim().length > 0) {
        const cleaned = body.apiKey
          .split(/[\n,]+/)
          .map((k: string) => k.trim())
          .filter((k) => k.length > 0);
        if (cleaned.length > 0) {
          const normalized = cleaned.map((k, idx) => ({
            id: `key_${Date.now()}_${idx}`,
            name: `API Key #${idx + 1}`,
            key: k,
            isActive: true,
            createdAt: Date.now(),
          }));
          updateData.apiKeys = JSON.stringify(normalized);
          updateData.apiKey = cleaned[0]!;
        }
      }

      // Models update
      if (body.models !== undefined) {
        updateData.models = JSON.stringify(body.models);
      }

      db.update(upstreamKeys)
        .set(updateData)
        .where(eq(upstreamKeys.id, id))
        .run();

      return { success: true };
    },
    {
      body: t.Object({
        provider: t.Optional(t.Union([t.Literal("openai"), t.Literal("anthropic")])),
        name: t.Optional(t.String()),
        prefix: t.Optional(t.Nullable(t.String())),
        apiKey: t.Optional(t.String()),
        apiKeys: t.Optional(t.Array(t.String())),
        rawKeys: t.Optional(t.String()),
        keyEntries: t.Optional(
          t.Array(
            t.Object({
              id: t.Optional(t.String()),
              name: t.Optional(t.String()),
              key: t.Optional(t.String()),
              isActive: t.Optional(t.Boolean()),
            })
          )
        ),
        baseUrl: t.Optional(t.Nullable(t.String())),
        isActive: t.Optional(t.Boolean()),
        roundRobin: t.Optional(t.Boolean()),
        weight: t.Optional(t.Number()),
        followUpstream: t.Optional(t.Boolean()),
        models: t.Optional(
          t.Array(
            t.Object({
              id: t.String(),
              name: t.Optional(t.String()),
              enabled: t.Boolean(),
            })
          )
        ),
      }),
    }
  )
  .delete("/:id", ({ params: { id }, set }) => {
    const existing = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!existing) {
      set.status = 404;
      return { error: "Upstream key not found" };
    }

    db.delete(upstreamKeys).where(eq(upstreamKeys.id, id)).run();
    return { success: true };
  })
  .post("/:id/fetch-models", async ({ params: { id }, set }) => {
    const upstream = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!upstream) {
      set.status = 404;
      return { success: false, error: "Upstream not found" };
    }

    const isFollow = Boolean((upstream as any).followUpstream);
    const key = getApiKeyForUpstream(upstream);
    if (!key && !isFollow) {
      set.status = 400;
      return { success: false, error: "No API key configured for this upstream" };
    }

    const currentModels = parseUpstreamModels(upstream.models);
    const existingEnabledMap = new Map<string, boolean>();
    for (const m of currentModels) {
      existingEnabledMap.set(m.id, m.enabled);
    }

    let fetchedModelIds: string[] = [];

    try {
      if (isFollow) {
        try {
          const liveModels = await fetchBandelBangetLiveModels();
          fetchedModelIds = liveModels.map((m: any) => m.id);
        } catch (e) {
          fetchedModelIds = ["auto", "deepseek-v4-flash", "claude-opus-5", "gpt-5.6", "glm-5.1", "kimi-k2.7-code"];
        }
      } else if (upstream.provider === "openai") {
        const isCopilot =
          upstream.baseUrl?.includes("githubcopilot.com") ||
          key.startsWith("ghu_") ||
          key.startsWith("gho_") ||
          upstream.name.toLowerCase().includes("copilot");

        const isAntigravity =
          upstream.baseUrl?.includes("cloudcode-pa.googleapis.com") ||
          key.startsWith("ya29.") ||
          upstream.name.toLowerCase().includes("antigravity");

        const isCodex =
          upstream.baseUrl?.includes("chatgpt.com/backend-api/codex") ||
          upstream.name.toLowerCase().includes("codex");

        if (isCopilot) {
          try {
            const liveModels = await fetchCopilotLiveModels(key);
            fetchedModelIds = liveModels.map((m) => m.id);
          } catch (e) {
            fetchedModelIds = [...COPILOT_DEFAULT_MODELS];
          }
        } else if (isAntigravity) {
          try {
            const models = await fetchAntigravityModels(key);
            fetchedModelIds = models.map((m) => m.id);
          } catch (e) {
            fetchedModelIds = [...ANTIGRAVITY_DEFAULT_MODELS];
          }
        } else if (isCodex) {
          fetchedModelIds = [...CODEX_DEFAULT_MODELS];
        } else {
          const url = `${getBaseUrl(upstream)}/models`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(12000),
          });
          if (!res.ok) {
            const errText = await res.text();
            return {
              success: false,
              error: `Upstream error HTTP ${res.status}: ${errText.slice(0, 150)}`,
            };
          } else {
            const data = (await res.json()) as any;
            if (Array.isArray(data?.data)) {
              fetchedModelIds = data.data.map((m: any) => m.id).filter(Boolean);
            }
          }
        }
      } else {
        // Anthropic provider
        const url = `${getBaseUrl(upstream)}/v1/models`;
        try {
          const res = await fetch(url, {
            headers: {
              "x-api-key": key,
              "anthropic-version": "2023-06-01",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) {
            const data = (await res.json()) as any;
            if (Array.isArray(data?.data)) {
              fetchedModelIds = data.data.map((m: any) => m.id).filter(Boolean);
            }
          }
        } catch (e) { }

        // Fallback standard Claude catalog if provider endpoint did not return
        if (fetchedModelIds.length === 0) {
          fetchedModelIds = [
            "claude-3-7-sonnet-20250219",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2",
          ];
        }
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to fetch models from provider",
      };
    }

    const uniqueIds = Array.from(new Set(fetchedModelIds)).sort();
    if (uniqueIds.length === 0) {
      return { success: false, error: "No models returned by upstream provider" };
    }

    // DEFAULT OFF SEMUA:
    // Any existing configured models keep their enabled value.
    // All newly fetched models default to enabled: false!
    const newModels = uniqueIds.map((modelId) => ({
      id: modelId,
      enabled: existingEnabledMap.get(modelId) ?? false, // Default is OFF!
    }));

    db.update(upstreamKeys)
      .set({
        models: JSON.stringify(newModels),
        updatedAt: Date.now(),
      })
      .where(eq(upstreamKeys.id, id))
      .run();

    return {
      success: true,
      models: newModels,
      count: newModels.length,
      enabledCount: newModels.filter((m) => m.enabled).length,
    };
  })
  .post(
    "/:id/models/toggle",
    ({ params: { id }, body, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      let models = parseUpstreamModels(upstream.models);

      if (body.enableAll) {
        models = models.map((m) => ({ ...m, enabled: true }));
      } else if (body.disableAll) {
        models = models.map((m) => ({ ...m, enabled: false }));
      } else if (body.modelId) {
        models = models.map((m) =>
          m.id === body.modelId
            ? {
              ...m,
              enabled:
                body.enabled !== undefined ? body.enabled : !m.enabled,
            }
            : m
        );
      }

      db.update(upstreamKeys)
        .set({
          models: JSON.stringify(models),
          updatedAt: Date.now(),
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        models,
        enabledCount: models.filter((m) => m.enabled).length,
      };
    },
    {
      body: t.Object({
        modelId: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
        enableAll: t.Optional(t.Boolean()),
        disableAll: t.Optional(t.Boolean()),
      }),
    }
  )
  .post("/:id/test", async ({ params: { id }, set }) => {
    const upstream = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, id))
      .get();

    if (!upstream) {
      set.status = 404;
      return { success: false, error: "Upstream not found" };
    }

    const key = getApiKeyForUpstream(upstream);
    if (!key) {
      set.status = 400;
      return { success: false, error: "No API key configured or active for this upstream" };
    }

    const result = await testSingleKey(
      upstream.provider as "openai" | "anthropic",
      upstream.baseUrl,
      key
    );
    return result;
  })
  .post(
    "/:id/keys",
    ({ params: { id }, body, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      if (Boolean((upstream as any).followUpstream)) {
        set.status = 400;
        return { success: false, error: "Follow Upstream is a zero-key pass-through provider and cannot accept API keys." };
      }

      const existingEntries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const newEntries: UpstreamKeyEntry[] = [];
      const now = Date.now();

      // Support single key
      if (body.key && body.key.trim().length > 0) {
        newEntries.push({
          id: `key_${now}_${Math.floor(Math.random() * 1000)}`,
          name: body.name?.trim() || `API Key #${existingEntries.length + 1}`,
          key: body.key.trim(),
          isActive: body.isActive !== false,
          createdAt: now,
        });
      }

      // Support multiple keys array
      if (Array.isArray(body.keys) && body.keys.length > 0) {
        body.keys.forEach((k: string, idx: number) => {
          const trimmed = String(k).trim();
          if (trimmed.length > 0) {
            newEntries.push({
              id: `key_${now}_${idx}_${Math.floor(Math.random() * 1000)}`,
              name: body.name ? `${body.name.trim()} #${idx + 1}` : `API Key #${existingEntries.length + newEntries.length + 1}`,
              key: trimmed,
              isActive: body.isActive !== false,
              createdAt: now,
            });
          }
        });
      }

      // Support raw text keys
      if (body.rawKeys && body.rawKeys.trim().length > 0) {
        const parsed = parseRawKeysInput(body.rawKeys, body.name?.trim() || "API Key", existingEntries.length + 1);
        parsed.forEach((p, idx) => {
          newEntries.push({
            id: `key_${now}_${idx}_${Math.floor(Math.random() * 1000)}`,
            name: p.name,
            key: p.key,
            isActive: body.isActive !== false,
            createdAt: now,
          });
        });
      }

      // Support keyEntries array
      if (Array.isArray(body.keyEntries) && body.keyEntries.length > 0) {
        body.keyEntries.forEach((entry: any, idx: number) => {
          if (entry && typeof entry.key === "string" && entry.key.trim().length > 0) {
            newEntries.push({
              id: entry.id || `key_${now}_${idx}_${Math.floor(Math.random() * 1000)}`,
              name: entry.name?.trim() || `API Key #${existingEntries.length + newEntries.length + 1}`,
              key: entry.key.trim(),
              isActive: entry.isActive !== false,
              createdAt: now,
            });
          }
        });
      }

      if (newEntries.length === 0) {
        set.status = 400;
        return { success: false, error: "No valid keys provided to add" };
      }

      const merged = [...existingEntries, ...newEntries];
      const firstActive = merged.find((k) => k.isActive);

      db.update(upstreamKeys)
        .set({
          apiKey: firstActive ? firstActive.key : merged[0]!.key,
          apiKeys: JSON.stringify(merged),
          updatedAt: now,
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        addedCount: newEntries.length,
        totalKeysCount: merged.length,
        activeKeysCount: merged.filter((k) => k.isActive).length,
        keyEntries: merged.map((e) => ({
          id: e.id,
          name: e.name,
          maskedKey: maskKey(e.key),
          isActive: e.isActive,
          createdAt: e.createdAt,
        })),
      };
    },
    {
      body: t.Object({
        key: t.Optional(t.String()),
        name: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
        keys: t.Optional(t.Array(t.String())),
        rawKeys: t.Optional(t.String()),
        keyEntries: t.Optional(
          t.Array(
            t.Object({
              id: t.Optional(t.String()),
              name: t.Optional(t.String()),
              key: t.String(),
              isActive: t.Optional(t.Boolean()),
            })
          )
        ),
      }),
    }
  )
  .post(
    "/:id/keys/import",
    ({ params: { id }, body, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      if (Boolean((upstream as any).followUpstream)) {
        set.status = 400;
        return { success: false, error: "Follow Upstream is a zero-key pass-through provider and cannot accept API keys." };
      }

      const existingEntries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const existingKeySet = new Set(existingEntries.map((e) => e.key));
      const seenBatchKeySet = new Set<string>();

      const defaultActive = body.defaultActive !== false;
      const skipDuplicates = body.skipDuplicates !== false;
      const namePrefix = body.namePrefix?.trim() || "API Key";
      const now = Date.now();

      const candidateEntries: Array<{ name: string; key: string; isActive?: boolean }> = [];

      // 1. From rawKeys text
      if (body.rawKeys && body.rawKeys.trim().length > 0) {
        const parsed = parseRawKeysInput(body.rawKeys, namePrefix, existingEntries.length + 1);
        candidateEntries.push(...parsed.map((p) => ({ ...p, isActive: defaultActive })));
      }

      // 2. From keys array
      if (Array.isArray(body.keys) && body.keys.length > 0) {
        body.keys.forEach((k: string) => {
          const trimmed = String(k).trim();
          if (trimmed.length > 0) {
            candidateEntries.push({
              name: `${namePrefix} #${existingEntries.length + candidateEntries.length + 1}`,
              key: trimmed,
              isActive: defaultActive,
            });
          }
        });
      }

      // 3. From keyEntries array
      if (Array.isArray(body.keyEntries) && body.keyEntries.length > 0) {
        body.keyEntries.forEach((item: any) => {
          if (item && typeof item.key === "string" && item.key.trim().length > 0) {
            candidateEntries.push({
              name: item.name?.trim() || `${namePrefix} #${existingEntries.length + candidateEntries.length + 1}`,
              key: item.key.trim(),
              isActive: item.isActive !== undefined ? item.isActive : defaultActive,
            });
          }
        });
      }

      if (candidateEntries.length === 0) {
        set.status = 400;
        return { success: false, error: "No valid API keys detected in import payload" };
      }

      const toAdd: UpstreamKeyEntry[] = [];
      let duplicatesSkipped = 0;

      for (let i = 0; i < candidateEntries.length; i++) {
        const candidate = candidateEntries[i]!;
        if (skipDuplicates) {
          if (existingKeySet.has(candidate.key) || seenBatchKeySet.has(candidate.key)) {
            duplicatesSkipped++;
            continue;
          }
        }
        seenBatchKeySet.add(candidate.key);
        toAdd.push({
          id: `key_${now}_${i}_${Math.floor(100 + Math.random() * 900)}`,
          name: candidate.name,
          key: candidate.key,
          isActive: candidate.isActive !== false,
          createdAt: now,
        });
      }

      if (toAdd.length === 0) {
        return {
          success: true,
          importedCount: 0,
          duplicatesSkipped,
          message: "All provided keys already exist in the connection pool.",
          totalKeysCount: existingEntries.length,
          activeKeysCount: existingEntries.filter((k) => k.isActive).length,
          keyEntries: existingEntries.map((e) => ({
            id: e.id,
            name: e.name,
            maskedKey: maskKey(e.key),
            isActive: e.isActive,
            createdAt: e.createdAt,
          })),
        };
      }

      const merged = [...existingEntries, ...toAdd];
      const firstActive = merged.find((k) => k.isActive);

      db.update(upstreamKeys)
        .set({
          apiKey: firstActive ? firstActive.key : merged[0]!.key,
          apiKeys: JSON.stringify(merged),
          updatedAt: now,
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        importedCount: toAdd.length,
        duplicatesSkipped,
        message: `Successfully imported ${toAdd.length} key${toAdd.length > 1 ? "s" : ""}${duplicatesSkipped > 0 ? ` (${duplicatesSkipped} duplicates skipped)` : ""}`,
        totalKeysCount: merged.length,
        activeKeysCount: merged.filter((k) => k.isActive).length,
        keyEntries: merged.map((e) => ({
          id: e.id,
          name: e.name,
          maskedKey: maskKey(e.key),
          isActive: e.isActive,
          createdAt: e.createdAt,
        })),
      };
    },
    {
      body: t.Object({
        rawKeys: t.Optional(t.String()),
        keys: t.Optional(t.Array(t.String())),
        keyEntries: t.Optional(
          t.Array(
            t.Object({
              id: t.Optional(t.String()),
              name: t.Optional(t.String()),
              key: t.String(),
              isActive: t.Optional(t.Boolean()),
            })
          )
        ),
        namePrefix: t.Optional(t.String()),
        defaultActive: t.Optional(t.Boolean()),
        skipDuplicates: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete(
    "/:id/keys/:keyId",
    ({ params: { id, keyId }, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const targetIndex = entries.findIndex((e) => e.id === keyId);
      if (targetIndex === -1) {
        set.status = 404;
        return { success: false, error: "Key not found in pool" };
      }

      if (entries.length <= 1) {
        set.status = 400;
        return { success: false, error: "Cannot delete the last key in the connection pool" };
      }

      const remaining = entries.filter((e) => e.id !== keyId);
      const firstActive = remaining.find((e) => e.isActive);

      db.update(upstreamKeys)
        .set({
          apiKey: firstActive ? firstActive.key : remaining[0]!.key,
          apiKeys: JSON.stringify(remaining),
          updatedAt: Date.now(),
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        message: "Key deleted successfully",
        totalKeysCount: remaining.length,
        activeKeysCount: remaining.filter((e) => e.isActive).length,
        keyEntries: remaining.map((e) => ({
          id: e.id,
          name: e.name,
          maskedKey: maskKey(e.key),
          isActive: e.isActive,
          createdAt: e.createdAt,
        })),
      };
    }
  )
  .post(
    "/:id/keys/toggle-all",
    ({ params: { id }, body, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      let entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      if (body.enableAll) {
        entries = entries.map((e) => ({ ...e, isActive: true }));
      } else if (body.disableAll) {
        entries = entries.map((e) => ({ ...e, isActive: false }));
      }

      const firstActive = entries.find((e) => e.isActive);

      db.update(upstreamKeys)
        .set({
          apiKey: firstActive ? firstActive.key : entries[0]!.key,
          apiKeys: JSON.stringify(entries),
          updatedAt: Date.now(),
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        totalKeysCount: entries.length,
        activeKeysCount: entries.filter((e) => e.isActive).length,
        keyEntries: entries.map((e) => ({
          id: e.id,
          name: e.name,
          maskedKey: maskKey(e.key),
          isActive: e.isActive,
          createdAt: e.createdAt,
        })),
      };
    },
    {
      body: t.Object({
        enableAll: t.Optional(t.Boolean()),
        disableAll: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    "/:id/keys/toggle",
    ({ params: { id }, body, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const target = entries.find((e) => e.id === body.keyId);
      if (!target) {
        set.status = 404;
        return { success: false, error: "Key not found in pool" };
      }

      const newActive = body.isActive !== undefined ? body.isActive : !target.isActive;
      target.isActive = newActive;

      const firstActive = entries.find((e) => e.isActive);

      db.update(upstreamKeys)
        .set({
          apiKey: firstActive ? firstActive.key : entries[0]!.key,
          apiKeys: JSON.stringify(entries),
          updatedAt: Date.now(),
        })
        .where(eq(upstreamKeys.id, id))
        .run();

      return {
        success: true,
        keyId: body.keyId,
        isActive: newActive,
        keyEntries: entries.map((e) => ({
          id: e.id,
          name: e.name,
          maskedKey: maskKey(e.key),
          isActive: e.isActive,
          createdAt: e.createdAt,
        })),
        totalKeysCount: entries.length,
        activeKeysCount: entries.filter((e) => e.isActive).length,
      };
    },
    {
      body: t.Object({
        keyId: t.String(),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    "/:id/keys/:keyId/test",
    async ({ params: { id, keyId }, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const target = entries.find((e) => e.id === keyId);
      if (!target) {
        set.status = 404;
        return { success: false, error: "Key not found in pool" };
      }

      const res = await testSingleKey(
        upstream.provider as "openai" | "anthropic",
        upstream.baseUrl,
        target.key
      );

      return {
        keyId,
        keyName: target.name,
        ...res,
      };
    }
  )
  .post(
    "/:id/test-all",
    async ({ params: { id }, set }) => {
      const upstream = db
        .select()
        .from(upstreamKeys)
        .where(eq(upstreamKeys.id, id))
        .get();

      if (!upstream) {
        set.status = 404;
        return { success: false, error: "Upstream not found" };
      }

      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const results = [];

      for (const entry of entries) {
        const res = await testSingleKey(
          upstream.provider as "openai" | "anthropic",
          upstream.baseUrl,
          entry.key
        );
        results.push({
          id: entry.id,
          name: entry.name,
          maskedKey: maskKey(entry.key),
          isActive: entry.isActive,
          ...res,
        });
      }

      return {
        success: results.some((r) => r.success),
        results,
      };
    }
  )
  .post(
    "/test-key",
    async ({ body }) => {
      const { provider, baseUrl, apiKey } = body;
      const res = await testSingleKey(provider, baseUrl || null, apiKey);
      return res;
    },
    {
      body: t.Object({
        provider: t.Union([t.Literal("openai"), t.Literal("anthropic")]),
        baseUrl: t.Optional(t.Nullable(t.String())),
        apiKey: t.String(),
      }),
    }
  );
