import { db } from "../db";
import { upstreamKeys, type UpstreamKey } from "../db/schema";
import { eq, and } from "drizzle-orm";

let roundRobinIndex: Record<string, number> = {
  openai: 0,
  anthropic: 0,
};

let keyRotationIndex: Record<string, number> = {};

export interface ModelConfig {
  id: string;
  name?: string;
  enabled: boolean;
}

export function parseUpstreamModels(modelsJson?: string | null): ModelConfig[] {
  if (!modelsJson) return [];
  try {
    const parsed = JSON.parse(modelsJson);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [];
}

export interface UpstreamKeyEntry {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  createdAt?: number;
  refreshToken?: string;
  expiresAt?: number;
}

export function parseUpstreamKeyEntries(
  apiKeysJson?: string | null,
  fallbackKey?: string
): UpstreamKeyEntry[] {
  if (apiKeysJson) {
    try {
      const parsed = JSON.parse(apiKeysJson);
      if (Array.isArray(parsed)) {
        const result: UpstreamKeyEntry[] = [];
        parsed.forEach((item, index) => {
          if (typeof item === "string") {
            const trimmed = item.trim();
            if (trimmed.length > 0 && trimmed !== "bb-default" && trimmed !== "sk-bb-placeholder") {
              result.push({
                id: `key_${index + 1}_${trimmed.slice(-4)}`,
                name: `API Key #${index + 1}`,
                key: trimmed,
                isActive: true,
              });
            }
          } else if (item && typeof item === "object") {
            const keyVal = typeof item.key === "string" ? item.key.trim() : "";
            if (keyVal.length > 0 && keyVal !== "bb-default" && keyVal !== "sk-bb-placeholder") {
              result.push({
                id: item.id || `key_${index + 1}_${keyVal.slice(-4)}`,
                name: item.name ? String(item.name).trim() : `API Key #${index + 1}`,
                key: keyVal,
                isActive: item.isActive !== false,
                createdAt: item.createdAt,
                refreshToken: typeof item.refreshToken === "string" ? item.refreshToken : undefined,
                expiresAt: typeof item.expiresAt === "number" ? item.expiresAt : undefined,
              });
            }
          }
        });
        return result;
      }
    } catch (e) {}
  }

  if (
    fallbackKey &&
    fallbackKey.trim().length > 0 &&
    fallbackKey !== "bb-default" &&
    fallbackKey !== "sk-bb-placeholder"
  ) {
    const trimmed = fallbackKey.trim();
    return [
      {
        id: "key_primary",
        name: "Primary Key",
        key: trimmed,
        isActive: true,
      },
    ];
  }

  return [];
}

export function parseUpstreamKeys(
  apiKeysJson?: string | null,
  fallbackKey?: string
): string[] {
  const entries = parseUpstreamKeyEntries(apiKeysJson, fallbackKey);
  return entries.filter((e) => e.isActive).map((e) => e.key);
}

export function getApiKeyForUpstream(upstream: UpstreamKey): string {
  const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
  if (entries.length === 0) return upstream.apiKey || "";

  // Only consider active (toggled ON) keys
  const activeEntries = entries.filter((e) => e.isActive);
  if (activeEntries.length === 0) {
    return entries[0]?.key || upstream.apiKey || "";
  }

  if (activeEntries.length === 1) {
    return activeEntries[0]!.key;
  }

  // Check if round robin is enabled (default 1 / true)
  const isRoundRobin = (upstream as any).roundRobin !== 0;
  if (!isRoundRobin) {
    return activeEntries[0]!.key;
  }

  const idx = (keyRotationIndex[upstream.id] || 0) % activeEntries.length;
  keyRotationIndex[upstream.id] = (idx + 1) % activeEntries.length;
  return activeEntries[idx]!.key;
}

export function getActiveUpstreamKeys(
  provider: "openai" | "anthropic"
): UpstreamKey[] {
  const list = db
    .select()
    .from(upstreamKeys)
    .where(
      and(
        eq(upstreamKeys.provider, provider),
        eq(upstreamKeys.isActive, 1)
      )
    )
    .all();

  // Filter out any upstream where ALL individual keys are toggled OFF
  return list.filter((upstream) => {
    const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
    return entries.length === 0 || entries.some((e) => e.isActive);
  });
}

export function parseAllowedProviders(allowedJson?: string | null): string[] {
  if (!allowedJson) return [];
  try {
    const parsed = JSON.parse(allowedJson);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch (e) {}
  return [];
}

let providerModelRotationIndex: Record<string, number> = {};

export interface UpstreamSelectionResult {
  upstream: UpstreamKey | null;
  error?: "no_upstreams" | "no_allowed_providers" | "model_not_enabled";
  message?: string;
}

export function selectUpstreamKey(
  provider: "openai" | "anthropic",
  requestedModel?: string,
  clientKey?: { id: string; name: string; allowedProviders?: string | null; roundRobinProviders?: number } | null
): UpstreamSelectionResult {
  const allActive = getActiveUpstreamKeys(provider);
  if (!allActive || allActive.length === 0) {
    return {
      upstream: null,
      error: "no_upstreams",
      message: `No active ${provider.toUpperCase()} upstream providers configured in Neko-Router.`,
    };
  }

  let eligibleKeys = allActive;

  // 1. Permission check: client key allowed providers (DEFAULT OFF ALL PROVIDERS)
  if (clientKey) {
    const allowedIds = parseAllowedProviders(clientKey.allowedProviders);
    if (allowedIds.length === 0) {
      return {
        upstream: null,
        error: "no_allowed_providers",
        message: `Client Key "${clientKey.name}" has no permitted upstream providers (Default: OFF all providers). Please enable providers for this key in the Neko-Router dashboard.`,
      };
    }

    eligibleKeys = allActive.filter(
      (k) => allowedIds.includes(k.id) || allowedIds.includes(k.provider)
    );
    if (eligibleKeys.length === 0) {
      return {
        upstream: null,
        error: "no_allowed_providers",
        message: `Client Key "${clientKey.name}" does not have permission to access any active ${provider.toUpperCase()} providers.`,
      };
    }
  }

  // 2. Filter by requested model (providers MUST have the same model enabled):
  const target = requestedModel ? requestedModel.trim().toLowerCase() : "";
  const cleanTarget = target.includes("/") ? target.split("/").slice(1).join("/") : target;
  const prefixInTarget = target.includes("/") ? target.split("/")[0] : null;

  if (cleanTarget.length > 0 && cleanTarget !== "unknown") {
    eligibleKeys = eligibleKeys.filter((k) => {
      // Pass-through: 100% bypass model check because it directly forwards to upstream
      if (Boolean((k as any).followUpstream)) {
        if (prefixInTarget) {
          const kPrefix = (k.prefix ? k.prefix.trim() : "").toLowerCase();
          const kProvider = k.provider.toLowerCase();
          if (kPrefix.length > 0 && kPrefix !== prefixInTarget && kProvider !== prefixInTarget) {
            return false;
          }
        }
        return true;
      }

      // If client explicitly requested a prefix (e.g. "ryzumi/auto" or "openai/gpt-4o"), filter by prefix
      if (prefixInTarget) {
        const kPrefix = (k.prefix ? k.prefix.trim() : "").toLowerCase();
        const kProvider = k.provider.toLowerCase();
        if (kPrefix.length > 0 && kPrefix !== prefixInTarget && kProvider !== prefixInTarget) {
          return false;
        }
      }

      const models = parseUpstreamModels(k.models);
      // If provider has configured models, the model must be present and enabled
      if (models.length > 0) {
        const found = models.find((m) => {
          const mid = m.id.toLowerCase();
          const mClean = mid.includes("/") ? mid.split("/").slice(1).join("/") : mid;
          return mid === target || mid === cleanTarget || mClean === cleanTarget;
        });
        return found ? Boolean(found.enabled) : false;
      }
      // If no models were configured yet (wildcard default), allow
      return true;
    });

    if (eligibleKeys.length === 0) {
      return {
        upstream: null,
        error: "model_not_enabled",
        message: `Model '${requestedModel}' is not enabled on any permitted ${provider.toUpperCase()} provider for this key.`,
      };
    }
  }

  // If only 1 eligible provider has this model
  if (eligibleKeys.length === 1) {
    return { upstream: eligibleKeys[0] ?? null };
  }

  // 3. Round-robin across providers that have the same model
  const shouldRoundRobin = clientKey ? clientKey.roundRobinProviders !== 0 : true;

  if (!shouldRoundRobin) {
    // Round-robin OFF: stick to the primary / highest weight provider
    const sorted = [...eligibleKeys].sort((a, b) => (b.weight || 1) - (a.weight || 1));
    return { upstream: sorted[0] ?? null };
  }

  // Round-robin ON: rotate across the providers having this exact same model!
  const rotationKey = `${clientKey?.id || "global"}:${provider}:${target || "any"}`;
  const currentIndex = (providerModelRotationIndex[rotationKey] || 0) % eligibleKeys.length;
  providerModelRotationIndex[rotationKey] = (currentIndex + 1) % eligibleKeys.length;

  return { upstream: eligibleKeys[currentIndex] ?? eligibleKeys[0] ?? null };
}

export function getBaseUrl(upstream: UpstreamKey): string {
  if (upstream.baseUrl && upstream.baseUrl.trim().length > 0) {
    return upstream.baseUrl.replace(/\/+$/, "");
  }

  if (upstream.provider === "openai") {
    return "https://api.openai.com/v1";
  }

  return "https://api.anthropic.com";
}
