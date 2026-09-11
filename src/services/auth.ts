import { sqlite, db } from "../db";
import { clientKeys, apiKeys, type ClientKey, type ApiKey } from "../db/schema";
import { eq } from "drizzle-orm";

export function getJwtSecret(): string {
  try {
    const row = sqlite
      .query("SELECT value FROM settings WHERE key = 'jwt_secret'")
      .get() as { value: string } | null;
    return row?.value || process.env.JWT_SECRET || "neko-router-default-secret-key-32";
  } catch (e) {
    return process.env.JWT_SECRET || "neko-router-default-secret-key-32";
  }
}

export function isDefaultPin(): boolean {
  try {
    const row = sqlite
      .query("SELECT value FROM settings WHERE key = 'is_default_pin'")
      .get() as { value: string } | null;
    return row?.value === "1";
  } catch (e) {
    return true;
  }
}

export function getTurnstileConfig(): {
  siteKey: string;
  secretKey: string;
  enabled: boolean;
} {
  let siteKey = process.env.TURNSTILE_SITE_KEY || "";
  let secretKey = process.env.TURNSTILE_SECRET_KEY || "";

  try {
    const siteRow = sqlite
      .query("SELECT value FROM settings WHERE key = 'turnstile_site_key'")
      .get() as { value: string } | null;
    if (siteRow?.value) siteKey = siteRow.value;

    const secretRow = sqlite
      .query("SELECT value FROM settings WHERE key = 'turnstile_secret_key'")
      .get() as { value: string } | null;
    if (secretRow?.value) secretKey = secretRow.value;
  } catch (e) {
    // ignore
  }

  const enabled = Boolean(siteKey.trim() && secretKey.trim());
  return { siteKey: siteKey.trim(), secretKey: secretKey.trim(), enabled };
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const { secretKey, enabled } = getTurnstileConfig();
  if (!enabled) {
    return { success: true };
  }

  if (!token || !token.trim()) {
    return {
      success: false,
      error: "Cloudflare Turnstile verification is required",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (data.success) {
      return { success: true };
    }

    console.warn("Turnstile siteverify failed:", data["error-codes"]);
    return {
      success: false,
      error: `Turnstile verification failed (${data["error-codes"]?.join(", ") || "invalid"})`,
    };
  } catch (e: any) {
    console.error("Turnstile request failed:", e);
    return {
      success: false,
      error: "Failed to connect to Cloudflare Turnstile service",
    };
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const row = sqlite
      .query("SELECT value FROM settings WHERE key = 'auth_pin_hash'")
      .get() as { value: string } | null;
    if (!row?.value) return false;
    return await Bun.password.verify(pin, row.value);
  } catch (e) {
    console.error("Error verifying PIN:", e);
    return false;
  }
}

export async function changePin(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPin || newPin.length < 6) {
    return { success: false, error: "New PIN must be at least 6 characters" };
  }

  const isValidCurrent = await verifyPin(currentPin);
  if (!isValidCurrent) {
    return { success: false, error: "Current PIN is incorrect" };
  }

  const newHash = await Bun.password.hash(newPin, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const now = Date.now();
  sqlite.run(
    "UPDATE settings SET value = ?, updated_at = ? WHERE key = 'auth_pin_hash'",
    [newHash, now]
  );
  sqlite.run(
    "UPDATE settings SET value = '0', updated_at = ? WHERE key = 'is_default_pin'",
    [now]
  );

  return { success: true };
}

export async function validateApiKey(
  providedKey: string
): Promise<ApiKey | null> {
  if (!providedKey) return null;
  const keyRecord = db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, providedKey))
    .get();

  if (!keyRecord || !keyRecord.isActive) {
    return null;
  }

  try {
    db.update(apiKeys)
      .set({ lastUsedAt: Date.now() })
      .where(eq(apiKeys.id, keyRecord.id))
      .run();
  } catch (e) {}

  return keyRecord;
}

export async function validateClientKey(
  providedKey: string
): Promise<ClientKey | null> {
  if (!providedKey) return null;
  const keyRecord = db
    .select()
    .from(clientKeys)
    .where(eq(clientKeys.key, providedKey))
    .get();

  if (keyRecord && keyRecord.isActive) {
    // Update lastUsedAt asynchronously
    try {
      db.update(clientKeys)
        .set({ lastUsedAt: Date.now() })
        .where(eq(clientKeys.id, keyRecord.id))
        .run();
    } catch (e) {}
    return keyRecord;
  }

  // If no direct key matched, check if an active Follow Upstream client key exists.
  // In Follow Upstream mode, the router forwards requests directly to BB using default BB key or valid BB key.
  const followKeyRecord = db
    .select()
    .from(clientKeys)
    .where(eq(clientKeys.isFollowUpstream, 1))
    .get();

  if (followKeyRecord && followKeyRecord.isActive) {
    try {
      db.update(clientKeys)
        .set({ lastUsedAt: Date.now() })
        .where(eq(clientKeys.id, followKeyRecord.id))
        .run();
    } catch (e) {}
    return followKeyRecord;
  }

  return null;
}

export function incrementClientKeyTokens(clientKeyId: string, tokens: number): void {
  try {
    sqlite.run(
      "UPDATE client_keys SET used_tokens = used_tokens + ? WHERE id = ?",
      [tokens, clientKeyId]
    );
  } catch (e) {
    console.error("Failed to increment key tokens:", e);
  }
}

// In-memory sliding rate limiter per minute
const rateLimitMap = new Map<string, number[]>();

export function checkClientRateLimit(keyId: string, maxPerMinute?: number | null): boolean {
  if (!maxPerMinute || maxPerMinute <= 0) return true;
  const now = Date.now();
  const windowStart = now - 60000;

  const timestamps = (rateLimitMap.get(keyId) || []).filter((t) => t > windowStart);
  if (timestamps.length >= maxPerMinute) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(keyId, timestamps);
  return true;
}
