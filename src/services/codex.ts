import http from "node:http";
import crypto from "node:crypto";
import { db } from "../db";
import { upstreamKeys } from "../db/schema";
import { eq } from "drizzle-orm";
import { parseUpstreamKeyEntries, type UpstreamKeyEntry } from "./router";

export const CODEX_CONFIG = {
  CLIENT_ID: "app_EMoamEEZ73f0CkXaXp7hrann",
  AUTHORIZE_URL: "https://auth.openai.com/oauth/authorize",
  TOKEN_URL: "https://auth.openai.com/oauth/token",
  REDIRECT_URI: "http://localhost:1455/auth/callback",
  BASE_URL: "https://chatgpt.com/backend-api/codex/responses",
  FIXED_PORT: 1455,
  SCOPE: "openid profile email offline_access",
  ORIGINATOR: "codex_cli_rs",
  USER_AGENT: "codex_cli_rs/0.136.0",
};

export const CODEX_DEFAULT_MODELS = [
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.5",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-6-astra",
  "gpt-5.3-codex-spark",
  "o3-mini",
  "o1",
  "gpt-4o",
  "gpt-4o-mini",
];

export interface CodexTokenResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  expiresAt?: number;
  email?: string;
  name?: string;
  chatgptAccountId?: string;
  chatgptPlanType?: string;
}

export interface CodexSession {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  status: "pending" | "done" | "error";
  error?: string;
  result?: CodexTokenResult;
  createdAt: number;
}

// In-memory active PKCE sessions & callback server
const activeSessions = new Map<string, CodexSession>();
let callbackServer: http.Server | null = null;
let callbackServerTimer: NodeJS.Timeout | null = null;

/**
 * Generate PKCE code verifier and code challenge (S256)
 */
export function generatePkce(): { codeVerifier: string; codeChallenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { codeVerifier: verifier, codeChallenge: challenge };
}

/**
 * Build official OpenAI Codex OAuth URL with PKCE
 */
export function buildCodexAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CODEX_CONFIG.CLIENT_ID,
    redirect_uri: CODEX_CONFIG.REDIRECT_URI,
    scope: CODEX_CONFIG.SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    originator: CODEX_CONFIG.ORIGINATOR,
    state,
  });

  return `${CODEX_CONFIG.AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Extract email, plan, and account details from JWT
 */
export function extractCodexJwtClaims(jwt: string): {
  email?: string;
  name?: string;
  chatgptAccountId?: string;
  chatgptPlanType?: string;
  exp?: number;
} {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3 || !parts[1]) return {};
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));

    const auth = payload["https://api.openai.com/auth"] || {};
    const profile = payload["https://api.openai.com/profile"] || {};

    return {
      email: profile.email || payload.email || payload.preferred_username || undefined,
      name: profile.name || payload.name || undefined,
      chatgptAccountId: auth.chatgpt_account_id || payload.account_id || undefined,
      chatgptPlanType: auth.chatgpt_plan_type || payload.plan_type || undefined,
      exp: payload.exp ? payload.exp * 1000 : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Exchange Authorization Code for Tokens via PKCE
 */
export async function exchangeCodexCode(
  code: string,
  codeVerifier: string,
  redirectUri: string = CODEX_CONFIG.REDIRECT_URI
): Promise<CodexTokenResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CODEX_CONFIG.CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(CODEX_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI Codex token exchange failed (${response.status}): ${text}`);
  }

  const json: any = await response.json();
  const accessToken = json.access_token;
  const refreshToken = json.refresh_token;
  const idToken = json.id_token;
  const expiresIn = json.expires_in; // seconds

  const claims = idToken ? extractCodexJwtClaims(idToken) : accessToken ? extractCodexJwtClaims(accessToken) : {};

  return {
    accessToken,
    refreshToken,
    idToken,
    expiresIn,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : claims.exp,
    email: claims.email,
    name: claims.name,
    chatgptAccountId: claims.chatgptAccountId,
    chatgptPlanType: claims.chatgptPlanType,
  };
}

/**
 * Refresh an expired OpenAI Codex access token
 */
export async function refreshCodexToken(refreshToken: string): Promise<CodexTokenResult> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CODEX_CONFIG.CLIENT_ID,
    refresh_token: refreshToken,
  });

  const response = await fetch(CODEX_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI Codex token refresh failed (${response.status}): ${text}`);
  }

  const json: any = await response.json();
  const accessToken = json.access_token;
  const newRefreshToken = json.refresh_token || refreshToken;
  const idToken = json.id_token;
  const expiresIn = json.expires_in;

  const claims = idToken ? extractCodexJwtClaims(idToken) : accessToken ? extractCodexJwtClaims(accessToken) : {};

  return {
    accessToken,
    refreshToken: newRefreshToken,
    idToken,
    expiresIn,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : claims.exp,
    email: claims.email,
    name: claims.name,
    chatgptAccountId: claims.chatgptAccountId,
    chatgptPlanType: claims.chatgptPlanType,
  };
}

/**
 * Ensure an access token is fresh before proxying requests
 */
export async function ensureCodexAccessToken(
  upstreamId: string,
  entry: UpstreamKeyEntry
): Promise<string> {
  const now = Date.now();
  // If token is still valid for > 5 minutes, return it
  if (entry.expiresAt && entry.expiresAt - now > 300_000) {
    return entry.key;
  }

  if (!entry.refreshToken) {
    return entry.key;
  }

  try {
    const refreshed = await refreshCodexToken(entry.refreshToken);
    entry.key = refreshed.accessToken;
    if (refreshed.refreshToken) entry.refreshToken = refreshed.refreshToken;
    if (refreshed.expiresAt) entry.expiresAt = refreshed.expiresAt;

    // Persist updated credentials to database
    const upstreams = await db.select().from(upstreamKeys).where(eq(upstreamKeys.id, upstreamId));
    const u = upstreams[0];
    if (u) {
      const entries = parseUpstreamKeyEntries(u.apiKeys, u.apiKey);
      const target = entries.find((e) => e.id === entry.id || e.key === entry.key);
      if (target) {
        target.key = refreshed.accessToken;
        if (refreshed.refreshToken) target.refreshToken = refreshed.refreshToken;
        if (refreshed.expiresAt) target.expiresAt = refreshed.expiresAt;
      }
      await db
        .update(upstreamKeys)
        .set({
          apiKey: entries[0]?.key || u.apiKey,
          apiKeys: JSON.stringify(entries),
          updatedAt: Date.now(),
        })
        .where(eq(upstreamKeys.id, upstreamId));
    }

    return refreshed.accessToken;
  } catch (err) {
    console.error(`[Codex] Failed to proactively refresh token for account ${entry.name}:`, err);
    return entry.key;
  }
}

/**
 * Start or ensure the local HTTP callback listener on port 1455
 */
export function startCodexCallbackServer(
  session: CodexSession
): { port: number; success: boolean; error?: string } {
  activeSessions.set(session.state, session);

  if (callbackServer) {
    return { port: CODEX_CONFIG.FIXED_PORT, success: true };
  }

  try {
    callbackServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || "", `http://localhost:${CODEX_CONFIG.FIXED_PORT}`);
      if (url.pathname !== "/auth/callback" && url.pathname !== "/callback") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");
      const errorDesc = url.searchParams.get("error_description");

      const currentSession = state ? activeSessions.get(state) : null;

      if (!currentSession) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderResultPage(false, "Session expired or invalid state."));
        return;
      }

      if (errorParam) {
        currentSession.status = "error";
        currentSession.error = errorDesc || errorParam;
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderResultPage(false, `Authentication failed: ${errorDesc || errorParam}`));
        return;
      }

      if (!code) {
        currentSession.status = "error";
        currentSession.error = "No authorization code found in callback";
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderResultPage(false, "Missing authorization code."));
        return;
      }

      try {
        const tokens = await exchangeCodexCode(code, currentSession.codeVerifier, currentSession.redirectUri);
        currentSession.status = "done";
        currentSession.result = tokens;

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          renderResultPage(
            true,
            `Connected successfully as ${tokens.email || "OpenAI Account"}! You can return to Neko-Router.`
          )
        );
      } catch (err: any) {
        currentSession.status = "error";
        currentSession.error = err.message || "Failed to exchange authorization code";
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderResultPage(false, `Exchange Error: ${err.message}`));
      }
    });

    callbackServer.listen(CODEX_CONFIG.FIXED_PORT, () => {
      // Auto-cleanup server after 5 minutes
      if (callbackServerTimer) clearTimeout(callbackServerTimer);
      callbackServerTimer = setTimeout(() => {
        stopCodexCallbackServer();
      }, 300_000);
    });

    callbackServer.on("error", (err: any) => {
      console.warn(`[Codex] Local callback server on port ${CODEX_CONFIG.FIXED_PORT} error:`, err.message);
      // If port 1455 is occupied, user can still use manual code paste
    });

    return { port: CODEX_CONFIG.FIXED_PORT, success: true };
  } catch (e: any) {
    return { port: CODEX_CONFIG.FIXED_PORT, success: false, error: e.message };
  }
}

export function stopCodexCallbackServer() {
  if (callbackServerTimer) {
    clearTimeout(callbackServerTimer);
    callbackServerTimer = null;
  }
  if (callbackServer) {
    try {
      callbackServer.close();
    } catch {
      // Ignore
    }
    callbackServer = null;
  }
}

export function getCodexSession(state: string): CodexSession | undefined {
  return activeSessions.get(state);
}

export function removeCodexSession(state: string) {
  activeSessions.delete(state);
}

function renderResultPage(success: boolean, message: string): string {
  const color = success ? "#10b981" : "#ef4444";
  const title = success ? "Authorization Successful" : "Authorization Failed";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; padding: 2rem; border-radius: 12px; max-width: 420px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h2 { color: ${color}; margin-top: 0; }
    p { color: #a1a1aa; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${title}</h2>
    <p>${message}</p>
    <p style="margin-top: 1.5rem; font-size: 12px; color: #71717a;">This window will close automatically or you can close it now.</p>
  </div>
  <script>
    setTimeout(() => { window.close(); }, 3000);
  </script>
</body>
</html>`;
}

/**
 * Transform standard OpenAI Chat Completions body into Codex Responses format
 */
export function transformChatToCodexResponses(body: any, model: string): any {
  if (body?.input) {
    return { ...body, model, stream: true, store: false };
  }

  const result: any = {
    model,
    input: [],
    stream: true,
    store: false,
  };

  let hasSystemMessage = false;
  const messages = body?.messages || [];

  for (const msg of messages) {
    if (msg.role === "system" || msg.role === "developer") {
      if (!hasSystemMessage) {
        result.instructions = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        hasSystemMessage = true;
      }
      continue;
    }

    if (msg.role === "user" || msg.role === "assistant") {
      const contentType = msg.role === "user" ? "input_text" : "output_text";
      const textContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      result.input.push({
        type: "message",
        role: msg.role,
        content: [{ type: contentType, text: textContent }],
      });
    } else if (msg.role === "tool") {
      result.input.push({
        type: "function_call_output",
        call_id: msg.tool_call_id || "call_default",
        output: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      });
    }
  }

  if (!hasSystemMessage) {
    result.instructions = "";
  }

  if (body?.tools && Array.isArray(body.tools)) {
    result.tools = body.tools;
  }
  if (body?.temperature !== undefined) result.temperature = body.temperature;
  if (body?.max_completion_tokens !== undefined) result.max_output_tokens = body.max_completion_tokens;
  else if (body?.max_tokens !== undefined) result.max_output_tokens = body.max_tokens;

  return result;
}
