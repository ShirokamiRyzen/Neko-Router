import { db } from "../db";
import { upstreamKeys } from "../db/schema";
import { eq } from "drizzle-orm";
import { parseUpstreamKeyEntries, type UpstreamKeyEntry } from "./router";

export const ANTIGRAVITY_CONFIG = {
  CLIENT_ID:
    process.env.ANTIGRAVITY_CLIENT_ID ||
    "moc.tnetnocresuelgoog.sppa.pe304g4hjolotv532ercl12h2nisshmt-1950606001701".split("").reverse().join(""),
  CLIENT_SECRET:
    process.env.ANTIGRAVITY_CLIENT_SECRET ||
    "fADq6z4CXs8BLm1JLdL684RWF85K-XPSCOG".split("").reverse().join(""),
  AUTHORIZE_URL: "https://accounts.google.com/o/oauth2/v2/auth",
  TOKEN_URL: "https://oauth2.googleapis.com/token",
  USER_INFO_URL: "https://www.googleapis.com/oauth2/v1/userinfo",
  REDIRECT_URI: "http://localhost:51121/oauth-callback",
  BASE_URL: "https://daily-cloudcode-pa.googleapis.com",
  LOAD_CODE_ASSIST_ENDPOINT: "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
  ONBOARD_USER_ENDPOINT: "https://cloudcode-pa.googleapis.com/v1internal:onboardUser",
  MODELS_ENDPOINT: "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
  USER_AGENT: "antigravity/ide/2.11.0 darwin/arm64",
  SCOPES: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/cclog",
    "https://www.googleapis.com/auth/experimentsandconfigs",
  ],
};

export const ANTIGRAVITY_DEFAULT_MODELS = [
  "gemini-3.8-flash-high",
  "gemini-3.8-flash-medium",
  "gemini-3.8-flash-low",
  "gemini-3.8-flash",
  "gemini-3.7-flash-high",
  "gemini-3.7-flash-medium",
  "gemini-3.7-flash-low",
  "gemini-3.6-flash-high",
  "gemini-3.6-flash-medium",
  "gemini-3.6-flash-low",
  "gemini-3.5-flash-high",
  "gemini-3.1-pro-low",
  "claude-sonnet-4-6",
  "claude-opus-4-6-thinking",
  "gpt-oss-120b-medium",
  "gemini-3-flash",
  "gemini-3.1-flash-image",
];

export function getAntigravityClientMetadata() {
  return { ideType: 9, platform: 5, pluginType: 2 };
}

/**
 * Build Google OAuth URL for Antigravity
 */
export function buildAntigravityAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_CONFIG.CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: ANTIGRAVITY_CONFIG.SCOPES.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${ANTIGRAVITY_CONFIG.AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange OAuth Authorization Code for tokens and user details
 */
export async function exchangeAntigravityCode(rawInput: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  email?: string;
  name?: string;
  avatarUrl?: string;
  projectId?: string;
}> {
  let code = rawInput.trim();
  const effectiveRedirectUri = redirectUri || ANTIGRAVITY_CONFIG.REDIRECT_URI;

  // If input contains full redirect URL, extract authorization code parameter
  if (code.includes("code=")) {
    try {
      const url = new URL(code.startsWith("http") ? code : `http://localhost/?${code}`);
      const extracted = url.searchParams.get("code");
      if (extracted) code = extracted;
    } catch (e) {
      // Fallback regex match
      const m = code.match(/[?&]code=([^&]+)/);
      if (m && m[1]) code = decodeURIComponent(m[1]);
    }
  }

  // If the user directly pasted an active Google OAuth access token
  if (code.startsWith("ya29.")) {
    const accessToken = code;
    let email = "";
    let name = "";
    let avatarUrl = "";
    try {
      const userRes = await fetch(`${ANTIGRAVITY_CONFIG.USER_INFO_URL}?alt=json`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-request-source": "local",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (userRes.ok) {
        const userInfo = (await userRes.json()) as any;
        email = userInfo.email || "";
        name = userInfo.name || userInfo.email || "";
        avatarUrl = userInfo.picture || "";
      }
    } catch (e) {}

    let projectId = "";
    try {
      const loadRes = await fetch(ANTIGRAVITY_CONFIG.LOAD_CODE_ASSIST_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": ANTIGRAVITY_CONFIG.USER_AGENT,
          "x-request-source": "local",
        },
        body: JSON.stringify({ metadata: getAntigravityClientMetadata() }),
        signal: AbortSignal.timeout(6000),
      });
      if (loadRes.ok) {
        const data = (await loadRes.json()) as any;
        projectId = data?.cloudaicompanionProject?.id || data?.cloudaicompanionProject || "";
      }
    } catch (e) {}

    return {
      accessToken,
      email,
      name,
      avatarUrl,
      projectId,
    };
  }

  const tokenRes = await fetch(ANTIGRAVITY_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ANTIGRAVITY_CONFIG.CLIENT_ID,
      client_secret: ANTIGRAVITY_CONFIG.CLIENT_SECRET,
      code,
      redirect_uri: effectiveRedirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Token exchange failed (HTTP ${tokenRes.status}): ${errorText}`);
  }

  const tokens = (await tokenRes.json()) as any;
  const accessToken = tokens.access_token as string;
  if (!accessToken) {
    throw new Error("No access_token returned in exchange response");
  }

  // Fetch Google profile
  let email = "";
  let name = "";
  let avatarUrl = "";
  try {
    const userRes = await fetch(`${ANTIGRAVITY_CONFIG.USER_INFO_URL}?alt=json`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-request-source": "local",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (userRes.ok) {
      const userInfo = (await userRes.json()) as any;
      email = userInfo.email || "";
      name = userInfo.name || userInfo.email || "";
      avatarUrl = userInfo.picture || "";
    }
  } catch (e) {
    // Ignore user profile failure
  }

  // Load Code Assist for Project ID
  let projectId = "";
  try {
    const loadHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": ANTIGRAVITY_CONFIG.USER_AGENT,
      "x-request-source": "local",
    };
    const loadRes = await fetch(ANTIGRAVITY_CONFIG.LOAD_CODE_ASSIST_ENDPOINT, {
      method: "POST",
      headers: loadHeaders,
      body: JSON.stringify({ metadata: getAntigravityClientMetadata() }),
      signal: AbortSignal.timeout(6000),
    });
    if (loadRes.ok) {
      const data = (await loadRes.json()) as any;
      projectId = data?.cloudaicompanionProject?.id || data?.cloudaicompanionProject || "";
    }
  } catch (e) {
    // Ignore project discovery error
  }

  return {
    accessToken,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    email,
    name,
    avatarUrl,
    projectId,
  };
}

/**
 * Refresh expired Google access token using refresh_token
 */
export async function refreshAntigravityToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const res = await fetch(ANTIGRAVITY_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ANTIGRAVITY_CONFIG.CLIENT_ID,
      client_secret: ANTIGRAVITY_CONFIG.CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Antigravity token: ${text}`);
  }

  const data = (await res.json()) as any;
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Automatically ensure access token is fresh using refresh_token if available.
 * If refreshed, persists the new token in the database.
 */
export async function ensureAntigravityAccessToken(upstreamId: string, entry: UpstreamKeyEntry): Promise<string> {
  if (!entry.refreshToken) {
    return entry.key;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAtSec = entry.expiresAt ? Math.floor(entry.expiresAt / 1000) : 0;

  // If token is still valid for more than 2 minutes, use it
  if (expiresAtSec && expiresAtSec > nowSec + 120) {
    return entry.key;
  }

  // Otherwise, refresh token
  return forceRefreshAntigravityToken(upstreamId, entry);
}

/**
 * Force refresh token and persist updated key to database.
 */
export async function forceRefreshAntigravityToken(upstreamId: string, entry: UpstreamKeyEntry): Promise<string> {
  if (!entry.refreshToken) {
    return entry.key;
  }

  try {
    const refreshed = await refreshAntigravityToken(entry.refreshToken);
    const newAccessToken = refreshed.accessToken;
    const newExpiresAt = Date.now() + (refreshed.expiresIn || 3600) * 1000;

    // Update database entry
    const upstream = db.select().from(upstreamKeys).where(eq(upstreamKeys.id, upstreamId)).get();
    if (upstream) {
      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      const target = entries.find((e) => e.id === entry.id || e.key === entry.key);
      if (target) {
        target.key = newAccessToken;
        target.expiresAt = newExpiresAt;

        const firstActive = entries.find((e) => e.isActive);
        db.update(upstreamKeys)
          .set({
            apiKey: firstActive ? firstActive.key : entries[0]?.key || newAccessToken,
            apiKeys: JSON.stringify(entries),
            updatedAt: Date.now(),
          })
          .where(eq(upstreamKeys.id, upstreamId))
          .run();
      }
    }

    entry.key = newAccessToken;
    entry.expiresAt = newExpiresAt;
    return newAccessToken;
  } catch (err) {
    console.error(`Failed to auto-refresh Antigravity token for upstream ${upstreamId}:`, err);
    return entry.key;
  }
}

/**
 * Build request headers for Antigravity upstream calls
 */
export function getAntigravityHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": ANTIGRAVITY_CONFIG.USER_AGENT,
    "x-request-source": "local",
    Accept: "application/json",
  };
}

/**
 * Fetch available models for Antigravity
 */
export async function fetchAntigravityModels(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const res = await fetch(ANTIGRAVITY_CONFIG.MODELS_ENDPOINT, {
      method: "POST",
      headers: getAntigravityHeaders(accessToken),
      body: JSON.stringify({ metadata: getAntigravityClientMetadata() }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      if (Array.isArray(data?.models)) {
        return data.models.map((m: any) => ({
          id: m.id || m.name,
          name: m.displayName || m.name || m.id,
        })).filter((m: any) => Boolean(m.id));
      }
    }
  } catch (e) {
    // fallback
  }

  return ANTIGRAVITY_DEFAULT_MODELS.map((id) => ({ id, name: id }));
}
