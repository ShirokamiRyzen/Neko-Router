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
  modelStats: {
    model: string;
    provider: string;
    requests: number;
    tokens: number;
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
