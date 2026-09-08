import crypto from "crypto";

/**
 * GitHub Copilot OAuth & Token Service
 * Ported directly from decolua/9router implementation:
 * - open-sse/providers/registry/github.js
 * - open-sse/executors/github.js
 * - open-sse/services/tokenRefresh/providers.js
 * - open-sse/services/copilotModels.js
 * - src/lib/oauth/providers/github.js
 */

export const GITHUB_COPILOT_CONFIG = {
  // Official client IDs used by GitHub Copilot
  CLIENT_ID: "Iv1.b507a08c87ecfe98",
  FALLBACK_CLIENT_ID: "Iv1.b507a08c87ecfe81",
  DEVICE_CODE_URL: "https://github.com/login/device/code",
  TOKEN_URL: "https://github.com/login/oauth/access_token",
  COPILOT_TOKEN_URL: "https://api.github.com/copilot_internal/v2/token",
  USER_INFO_URL: "https://api.github.com/user",
  MODELS_URL: "https://api.githubcopilot.com/models",
  BASE_CHAT_URL: "https://api.githubcopilot.com/chat/completions",
  MESSAGES_URL: "https://api.githubcopilot.com/v1/messages",
  RESPONSES_URL: "https://api.githubcopilot.com/responses",
  SCOPES: "read:user",

  // 9router exact version strings
  VSCODE_VERSION: "1.110.0",
  COPILOT_CHAT_VERSION: "0.38.0",
  USER_AGENT: "GitHubCopilotChat/0.38.0",
  API_VERSION: "2025-04-01",
  INTEGRATION_ID: "vscode-chat",
};

export const COPILOT_DEFAULT_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-5.2",
  "gpt-5.4",
  "claude-3.5-sonnet",
  "claude-3.7-sonnet",
  "claude-haiku-4.5",
  "claude-sonnet-4.5",
  "claude-opus-4.5",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "o1",
  "o1-mini",
  "o3-mini",
];

interface CachedCopilotToken {
  token: string;
  expiresAt: number; // unix timestamp in seconds
}

// In-memory cache for Copilot internal session tokens keyed by GitHub OAuth token (ghu_...)
const copilotTokenCache = new Map<string, CachedCopilotToken>();

/**
 * Exchange a GitHub user token (ghu_...) for a temporary GitHub Copilot session token
 * Implements 9router's refreshCopilotToken from open-sse/services/tokenRefresh/providers.js
 */
export async function getCopilotInternalToken(githubAccessToken: string): Promise<string> {
  const cleanToken = githubAccessToken.trim();
  const nowSec = Math.floor(Date.now() / 1000);

  // Check cache (refresh proactively if expiring within 60 seconds)
  const cached = copilotTokenCache.get(cleanToken);
  if (cached && cached.expiresAt > nowSec + 60) {
    return cached.token;
  }

  // Support both "token <ghu>" and "Bearer <ghu>" header styles
  const authHeader = cleanToken.startsWith("ghu_") || cleanToken.startsWith("gho_")
    ? `token ${cleanToken}`
    : `Bearer ${cleanToken}`;

  const res = await fetch(GITHUB_COPILOT_CONFIG.COPILOT_TOKEN_URL, {
    headers: {
      Authorization: authHeader,
      "User-Agent": GITHUB_COPILOT_CONFIG.USER_AGENT,
      "Editor-Version": `vscode/${GITHUB_COPILOT_CONFIG.VSCODE_VERSION}`,
      "Editor-Plugin-Version": `copilot-chat/${GITHUB_COPILOT_CONFIG.COPILOT_CHAT_VERSION}`,
      "x-github-api-version": GITHUB_COPILOT_CONFIG.API_VERSION,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `GitHub Copilot authorization failed (HTTP ${res.status}): This GitHub account does not have an active Copilot subscription.`
      );
    }
    throw new Error(`Copilot token exchange failed (HTTP ${res.status}): ${text.slice(0, 150)}`);
  }

  const data = (await res.json()) as { token?: string; expires_at?: number };
  if (!data?.token) {
    throw new Error("Invalid response from Copilot token endpoint: no token returned");
  }

  // Cache token
  copilotTokenCache.set(cleanToken, {
    token: data.token,
    expiresAt: data.expires_at || nowSec + 1800,
  });

  return data.token;
}

/**
 * Build request headers for api.githubcopilot.com
 * Directly matches 9router's buildHeaders in open-sse/executors/github.js
 */
export function getCopilotHeaders(internalToken: string, isStream: boolean = false): Record<string, string> {
  return {
    Authorization: `Bearer ${internalToken}`,
    "Content-Type": "application/json",
    "copilot-integration-id": GITHUB_COPILOT_CONFIG.INTEGRATION_ID,
    "editor-version": `vscode/${GITHUB_COPILOT_CONFIG.VSCODE_VERSION}`,
    "editor-plugin-version": `copilot-chat/${GITHUB_COPILOT_CONFIG.COPILOT_CHAT_VERSION}`,
    "user-agent": GITHUB_COPILOT_CONFIG.USER_AGENT,
    "openai-intent": "conversation-panel",
    "x-github-api-version": GITHUB_COPILOT_CONFIG.API_VERSION,
    "x-request-id": crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    "x-vscode-user-agent-library-version": "electron-fetch",
    "X-Initiator": "user",
    Accept: isStream ? "text/event-stream" : "application/json",
  };
}

/**
 * Sanitize messages for GitHub Copilot chat completions endpoint.
 * Ported from 9router's sanitizeMessagesForChatCompletions in open-sse/executors/github.js
 */
export function sanitizeMessagesForChatCompletions(body: any): any {
  if (!body?.messages || !Array.isArray(body.messages)) return body;

  const sanitized = { ...body };
  sanitized.messages = body.messages.map((msg: any) => {
    if (!msg.content) return msg;
    if (typeof msg.content === "string") return msg;

    if (Array.isArray(msg.content)) {
      const cleanContent = msg.content
        .map((part: any) => {
          if (part.type === "text") return part;
          if (part.type === "image_url") return part;
          // Serialize tool_use, tool_result, thinking, etc. as text
          const text = part.text || part.content || JSON.stringify(part);
          return { type: "text", text: typeof text === "string" ? text : JSON.stringify(text) };
        })
        .filter((part: any) => part.text !== "");

      return { ...msg, content: cleanContent.length > 0 ? cleanContent : null };
    }

    return msg;
  });

  return sanitized;
}

/**
 * Newer OpenAI models (gpt-5+, o1, o3, o4) require max_completion_tokens instead of max_tokens.
 * Ported from 9router's transformRequest in open-sse/executors/github.js
 */
export function transformCopilotRequestBody(body: any, model: string): any {
  const transformed = sanitizeMessagesForChatCompletions(body);
  const isReasoningModel = /gpt-5|o[134]-/i.test(model);

  if (isReasoningModel && transformed.max_tokens !== undefined) {
    transformed.max_completion_tokens = transformed.max_tokens;
    delete transformed.max_tokens;
  }

  // "none" means no thinking — strip it so models that don't support "none" don't 400
  if (transformed.reasoning_effort === "none") {
    delete transformed.reasoning_effort;
  }

  return transformed;
}

/**
 * Request GitHub Device Code
 * Matches 9router's requestDeviceCode from src/lib/oauth/providers/github.js
 */
export async function requestGitHubDeviceCode(): Promise<{
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}> {
  const res = await fetch(GITHUB_COPILOT_CONFIG.DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: GITHUB_COPILOT_CONFIG.CLIENT_ID,
      scope: GITHUB_COPILOT_CONFIG.SCOPES,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Device code request failed (HTTP ${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  if (!data?.device_code || !data?.user_code) {
    throw new Error("Invalid response from GitHub device code endpoint");
  }

  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri || "https://github.com/login/device",
    expires_in: data.expires_in || 900,
    interval: data.interval || 5,
  };
}

/**
 * Poll GitHub OAuth token endpoint for Device Code authorization
 * Matches 9router's pollToken + postExchange in src/lib/oauth/providers/github.js
 */
export async function pollGitHubDeviceToken(deviceCode: string): Promise<{
  status: "pending" | "slow_down" | "expired" | "success" | "error";
  accessToken?: string;
  username?: string;
  avatarUrl?: string;
  copilotActive?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(GITHUB_COPILOT_CONFIG.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: GITHUB_COPILOT_CONFIG.CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      signal: AbortSignal.timeout(12000),
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      const text = await res.text();
      return { status: "error", error: text || `HTTP ${res.status}` };
    }

    if (data.error) {
      if (data.error === "authorization_pending") {
        return { status: "pending" };
      }
      if (data.error === "slow_down") {
        return { status: "slow_down" };
      }
      if (data.error === "expired_token") {
        return { status: "expired", error: "Device code expired. Please request a new code." };
      }
      if (data.error === "access_denied") {
        return { status: "error", error: "Authorization was denied by the user." };
      }
      return { status: "error", error: data.error_description || data.error };
    }

    if (data.access_token) {
      const token = data.access_token as string;

      // 9router postExchange: get user info
      let username = "GitHub User";
      let avatarUrl = "";
      try {
        const userRes = await fetch(GITHUB_COPILOT_CONFIG.USER_INFO_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": GITHUB_COPILOT_CONFIG.USER_AGENT,
            "x-github-api-version": GITHUB_COPILOT_CONFIG.API_VERSION,
          },
          signal: AbortSignal.timeout(6000),
        });
        if (userRes.ok) {
          const userData = (await userRes.json()) as any;
          if (userData.login) username = userData.login;
          if (userData.avatar_url) avatarUrl = userData.avatar_url;
        }
      } catch (e) {
        // Fallback user info
      }

      // 9router postExchange: verify Copilot token
      let copilotActive = false;
      try {
        const internalToken = await getCopilotInternalToken(token);
        if (internalToken) copilotActive = true;
      } catch (e) {
        copilotActive = false;
      }

      return {
        status: "success",
        accessToken: token,
        username,
        avatarUrl,
        copilotActive,
      };
    }

    return { status: "pending" };
  } catch (err: any) {
    return { status: "error", error: err?.message || "Polling network error" };
  }
}

/**
 * Fetch live Copilot models directly from https://api.githubcopilot.com/models
 * Matches 9router's expandCatalog & resolveCopilotModels in open-sse/services/copilotModels.js
 */
export async function fetchCopilotLiveModels(githubAccessToken: string): Promise<Array<{ id: string; name: string }>> {
  const internalToken = await getCopilotInternalToken(githubAccessToken);
  const res = await fetch(GITHUB_COPILOT_CONFIG.MODELS_URL, {
    headers: {
      Authorization: `Bearer ${internalToken}`,
      "Content-Type": "application/json",
      "copilot-integration-id": GITHUB_COPILOT_CONFIG.INTEGRATION_ID,
      "editor-version": `vscode/${GITHUB_COPILOT_CONFIG.VSCODE_VERSION}`,
      "editor-plugin-version": `copilot-chat/${GITHUB_COPILOT_CONFIG.COPILOT_CHAT_VERSION}`,
      "user-agent": GITHUB_COPILOT_CONFIG.USER_AGENT,
      "x-github-api-version": GITHUB_COPILOT_CONFIG.API_VERSION,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Copilot /models returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  const rawList = Array.isArray(data?.data) ? data.data : [];

  // Filter models: chat capable & policy not disabled (identical to 9router expandCatalog)
  const seen = new Set<string>();
  const models: Array<{ id: string; name: string }> = [];

  for (const m of rawList) {
    if (!m || typeof m !== "object") continue;
    if (m.capabilities?.type !== "chat") continue;
    if (m.policy && m.policy.state === "disabled") continue;
    const id = m.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({ id, name: m.name || id });
  }

  return models.length > 0
    ? models
    : COPILOT_DEFAULT_MODELS.map((id) => ({ id, name: id }));
}
