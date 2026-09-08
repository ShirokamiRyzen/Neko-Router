export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res as unknown as T;
}

export interface AuthStatus {
  isDefaultPin: boolean;
  authenticated: boolean;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  displayKey: string;
  description: string | null;
  isActive: boolean;
  secretKeysCount: number;
  createdAt: number;
  lastUsedAt: number | null;
}

export interface ClientKeyItem {
  id: string;
  apiKeyId?: string | null;
  apiKeyName?: string | null;
  name: string;
  key: string;
  displayKey: string;
  isActive: number;
  rateLimit: number | null;
  tokenLimit: number | null;
  usedTokens: number;
  allowedProviders?: string[];
  roundRobinProviders?: boolean;
  createdAt: number;
  lastUsedAt: number | null;
  totalRequests: number;
  totalTokens: number;
}

export interface UpstreamModelItem {
  id: string;
  name?: string;
  enabled: boolean;
}

export interface UpstreamKeyEntryItem {
  id: string;
  name: string;
  key?: string;
  maskedKey?: string;
  isActive: boolean;
  createdAt?: number;
}

export interface UpstreamKeyItem {
  id: string;
  provider: "openai" | "anthropic";
  name: string;
  prefix?: string | null;
  baseUrl: string | null;
  isActive: number;
  roundRobin?: boolean;
  weight: number;
  createdAt: number;
  updatedAt: number;
  apiKey?: string;
  apiKeys?: string[];
  keyEntries?: UpstreamKeyEntryItem[];
  totalKeysCount?: number;
  activeKeysCount?: number;
  maskedKey: string;
  maskedKeys?: string[];
  models?: UpstreamModelItem[];
  totalModelsCount?: number;
  enabledModelsCount?: number;
}

export interface TelemetryStats {
  totalRequests: number;
  successRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCachedTokens: number;
  totalTokens: number;
  avgDurationMs: number;
  estimatedCost?: number;
  modelStats: {
    model: string;
    provider: string;
    requests: number;
    tokens: number;
    promptTokens?: number;
    completionTokens?: number;
    cachedTokens?: number;
    estimatedCost?: number;
  }[];
  activeUpstreamIds?: string[];
  activeRequestsCount?: number;
}

export interface TelemetryLogItem {
  id: string;
  clientKeyId: string | null;
  clientKeyName: string | null;
  upstreamKeyId: string | null;
  provider: string;
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  statusCode: number;
  durationMs: number;
  isStreaming: number;
  errorMessage: string | null;
  createdAt: number;
}

export interface OptimizationSettings {
  cacheEnabled: boolean;
  rtkCompression: boolean;
  cavemanMode: boolean;
  minifyPrompt: boolean;
  cacheTtlSeconds: number;
  httpsOnly: boolean;
  requestTimeoutSeconds: number;
}

export interface SystemInfo {
  version: string;
  bunVersion: string;
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
  dbSizeBytes: number;
  dbPath: string;
}

export function calculateTokenCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0
): number {
  const m = (model || "").toLowerCase();
  let promptRate = 0.5; // per 1M tokens USD
  let completionRate = 1.5; // per 1M tokens USD
  let cachedRate = 0.25; // per 1M tokens USD

  if (m.includes("gpt-4o-mini")) {
    promptRate = 0.15;
    completionRate = 0.6;
    cachedRate = 0.075;
  } else if (m.includes("gpt-4o")) {
    promptRate = 2.5;
    completionRate = 10.0;
    cachedRate = 1.25;
  } else if (m.includes("o1-mini")) {
    promptRate = 3.0;
    completionRate = 12.0;
    cachedRate = 1.5;
  } else if (m.includes("o3-mini")) {
    promptRate = 1.1;
    completionRate = 4.4;
    cachedRate = 0.55;
  } else if (m.includes("o1")) {
    promptRate = 15.0;
    completionRate = 60.0;
    cachedRate = 7.5;
  } else if (m.includes("gpt-4")) {
    promptRate = 10.0;
    completionRate = 30.0;
    cachedRate = 5.0;
  } else if (m.includes("gpt-3.5")) {
    promptRate = 0.5;
    completionRate = 1.5;
    cachedRate = 0.25;
  } else if (
    m.includes("claude-3-5-sonnet") ||
    m.includes("claude-3-7-sonnet") ||
    m.includes("claude-3-sonnet")
  ) {
    promptRate = 3.0;
    completionRate = 15.0;
    cachedRate = 0.3;
  } else if (m.includes("claude-3-5-haiku") || m.includes("claude-3-haiku")) {
    promptRate = 0.8;
    completionRate = 4.0;
    cachedRate = 0.08;
  } else if (m.includes("claude-3-opus") || m.includes("claude-opus")) {
    promptRate = 15.0;
    completionRate = 75.0;
    cachedRate = 3.75;
  } else if (m.includes("deepseek-reasoner") || m.includes("deepseek-r1")) {
    promptRate = 0.55;
    completionRate = 2.19;
    cachedRate = 0.14;
  } else if (m.includes("deepseek-chat") || m.includes("deepseek-v3") || m.includes("deepseek")) {
    promptRate = 0.14;
    completionRate = 0.28;
    cachedRate = 0.014;
  } else if (m.includes("kimi") || m.includes("moonshot")) {
    promptRate = 0.2;
    completionRate = 0.6;
    cachedRate = 0.1;
  } else if (m.includes("glm") && (m.includes("flash") || m.includes("air"))) {
    promptRate = 0.05;
    completionRate = 0.1;
    cachedRate = 0.025;
  } else if (m.includes("glm")) {
    promptRate = 1.0;
    completionRate = 1.0;
    cachedRate = 0.5;
  } else if (m.includes("qwen") && m.includes("turbo")) {
    promptRate = 0.04;
    completionRate = 0.08;
    cachedRate = 0.02;
  } else if (m.includes("qwen") && m.includes("plus")) {
    promptRate = 0.11;
    completionRate = 0.28;
    cachedRate = 0.05;
  } else if (m.includes("qwen") && m.includes("max")) {
    promptRate = 1.6;
    completionRate = 6.4;
    cachedRate = 0.8;
  } else if (m.includes("flash") || m.includes("mini") || m.includes("small") || m.includes("haiku")) {
    promptRate = 0.15;
    completionRate = 0.6;
    cachedRate = 0.075;
  } else if (m.includes("code") || m.includes("coder")) {
    promptRate = 0.25;
    completionRate = 0.75;
    cachedRate = 0.12;
  }

  const effectivePrompt = Math.max(0, promptTokens - cachedTokens);
  const cost =
    (effectivePrompt / 1_000_000) * promptRate +
    (cachedTokens / 1_000_000) * cachedRate +
    (completionTokens / 1_000_000) * completionRate;

  return cost;
}

export function formatCost(cost: number | undefined | null): string {
  if (cost === undefined || cost === null || isNaN(cost) || cost <= 0) return "$0.00";
  if (cost < 0.0001) return `<$0.0001`;
  if (cost < 0.001) return `~$${cost.toFixed(4)}`;
  if (cost < 0.01) return `~$${cost.toFixed(4)}`;
  if (cost < 1) return `~$${cost.toFixed(3)}`;
  return `~$${cost.toFixed(2)}`;
}
