import { db, sqlite } from "../db";
import { upstreamKeys, type UpstreamKey } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { parseUpstreamModels, parseUpstreamKeyEntries } from "./router";

export const BANDELBANGET_CONFIG = {
  BASE_URL: "https://bandelbanget.xyz/v1",
  MODELS_URL: "https://bandelbanget.xyz/v1/models",
  CHAT_URL: "https://bandelbanget.xyz/v1/chat/completions",
  PROVIDER_ID_FOLLOW: "up_bandelbanget_follow",
  PROVIDER_ID_INPUT: "up_bandelbanget_input",
  NAME_FOLLOW: "BandelBanget",
  NAME_INPUT: "BandelBanget",
};

export interface BandelBangetRawModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  vision?: boolean;
  enabled: boolean;
  grade?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
}

export interface BandelBangetModelItem {
  id: string;
  name: string;
  enabled: boolean;
  vision?: boolean;
  grade?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  created?: number;
  object?: string;
  owned_by?: string;
}

/**
 * Fetch live models directly from BandelBanget upstream endpoint
 * https://bandelbanget.xyz/v1/models
 */
export async function fetchBandelBangetLiveModels(): Promise<BandelBangetModelItem[]> {
  try {
    const res = await fetch(BANDELBANGET_CONFIG.MODELS_URL, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch models: HTTP ${res.status}`);
    }

    const data = (await res.json()) as { object?: string; data?: BandelBangetRawModel[] };
    if (!data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((m) => ({
      id: m.id,
      name: m.id,
      object: m.object || "model",
      created: m.created,
      owned_by: m.owned_by,
      // Active models strictly follow BB's enabled flag!
      enabled: Boolean(m.enabled),
      vision: Boolean(m.vision),
      grade: m.grade || "",
      modalities: m.modalities,
    }));
  } catch (err: any) {
    console.error("Error fetching BandelBanget live models:", err);
    throw err;
  }
}

/**
 * Test latency and connectivity to BandelBanget endpoint
 */
export async function testBandelBangetConnection(
  key?: string
): Promise<{ success: boolean; latencyMs: number; error?: string; message?: string }> {
  const startTime = performance.now();
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (key && key.trim() && key !== "bb-default") {
      headers["Authorization"] = `Bearer ${key.trim()}`;
    } else {
      headers["Authorization"] = "Bearer bb-default";
    }

    const res = await fetch(BANDELBANGET_CONFIG.CHAT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(12000),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      return {
        success: true,
        latencyMs,
        message: "BandelBanget upstream is online and responding normally.",
      };
    } else {
      const text = await res.text();
      return {
        success: false,
        latencyMs,
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs,
      error: err?.message || "Connection to BandelBanget timed out",
    };
  }
}

/**
 * Ensure both BandelBanget providers exist in upstream_keys:
 * 1. Card 1: BandelBanget (Follow Upstream)
 * 2. Card 2: BandelBanget (Input Key)
 */
export async function ensureBandelBangetProviders(): Promise<{
  followUpstream: UpstreamKey;
  inputKey: UpstreamKey;
}> {
  const now = Date.now();

  // 1. Follow Upstream provider
  let follow = db
    .select()
    .from(upstreamKeys)
    .where(
      and(
        eq(upstreamKeys.baseUrl, BANDELBANGET_CONFIG.BASE_URL),
        eq(upstreamKeys.followUpstream, 1)
      )
    )
    .get();

  if (!follow) {
    // Check by ID or name
    follow = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, BANDELBANGET_CONFIG.PROVIDER_ID_FOLLOW))
      .get();
  }

  if (!follow) {
    // Fetch live models for initial setup
    let initialModels: BandelBangetModelItem[] = [];
    try {
      initialModels = await fetchBandelBangetLiveModels();
    } catch (e) {
      initialModels = [];
    }

    db.insert(upstreamKeys)
      .values({
        id: BANDELBANGET_CONFIG.PROVIDER_ID_FOLLOW,
        provider: "openai",
        name: BANDELBANGET_CONFIG.NAME_FOLLOW,
        prefix: "bb",
        apiKey: "",
        apiKeys: JSON.stringify([]),
        models: JSON.stringify(initialModels),
        baseUrl: BANDELBANGET_CONFIG.BASE_URL,
        isActive: 1,
        roundRobin: 0,
        weight: 1,
        followUpstream: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    follow = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, BANDELBANGET_CONFIG.PROVIDER_ID_FOLLOW))
      .get()!;
  } else {
    // Sanitize existing Follow Upstream to ensure zero dummy keys
    db.update(upstreamKeys)
      .set({
        name: BANDELBANGET_CONFIG.NAME_FOLLOW,
        apiKey: "",
        apiKeys: JSON.stringify([]),
        followUpstream: 1,
        baseUrl: BANDELBANGET_CONFIG.BASE_URL,
      })
      .where(eq(upstreamKeys.id, follow.id))
      .run();
    follow.name = BANDELBANGET_CONFIG.NAME_FOLLOW;
    follow.apiKey = "";
    follow.apiKeys = "[]";

    // Refresh live models if currently empty
    let parsedFollowModels: any[] = [];
    try {
      parsedFollowModels = JSON.parse(follow.models || "[]");
    } catch (e) {}

    if (parsedFollowModels.length === 0) {
      try {
        const live = await fetchBandelBangetLiveModels();
        if (live.length > 0) {
          db.update(upstreamKeys)
            .set({ models: JSON.stringify(live), updatedAt: now })
            .where(eq(upstreamKeys.id, follow.id))
            .run();
          follow.models = JSON.stringify(live);
        }
      } catch (e) {}
    }
  }

  // 2. Input Key provider
  let input = db
    .select()
    .from(upstreamKeys)
    .where(
      and(
        eq(upstreamKeys.id, BANDELBANGET_CONFIG.PROVIDER_ID_INPUT)
      )
    )
    .get();

  if (!input) {
    input = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.name, BANDELBANGET_CONFIG.NAME_INPUT))
      .get();
  }

  if (!input) {
    let liveModels: BandelBangetModelItem[] = [];
    try {
      liveModels = await fetchBandelBangetLiveModels();
    } catch (e) {
      liveModels = [];
    }

    db.insert(upstreamKeys)
      .values({
        id: BANDELBANGET_CONFIG.PROVIDER_ID_INPUT,
        provider: "openai",
        name: BANDELBANGET_CONFIG.NAME_INPUT,
        prefix: "bb",
        apiKey: "",
        apiKeys: JSON.stringify([]),
        models: JSON.stringify(liveModels),
        baseUrl: BANDELBANGET_CONFIG.BASE_URL,
        isActive: 1,
        roundRobin: 1,
        weight: 1,
        followUpstream: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    input = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, BANDELBANGET_CONFIG.PROVIDER_ID_INPUT))
      .get()!;
  } else {
    // If input key has placeholder or dummy key, clean it up
    if (input.apiKey === "sk-bb-placeholder" || input.apiKey === "bb-default" || input.apiKeys === `[{"id":"key_bb_upstream_default","name":"BB Pass-through","key":"bb-default","isActive":true,"createdAt":${now}}]`) {
      db.update(upstreamKeys)
        .set({
          name: BANDELBANGET_CONFIG.NAME_INPUT,
          apiKey: "",
          apiKeys: JSON.stringify([]),
          baseUrl: BANDELBANGET_CONFIG.BASE_URL,
        })
        .where(eq(upstreamKeys.id, input.id))
        .run();
      input.name = BANDELBANGET_CONFIG.NAME_INPUT;
      input.apiKey = "";
      input.apiKeys = "[]";
    }

    // Refresh live models if currently empty or outdated
    let parsedModels: any[] = [];
    try {
      parsedModels = JSON.parse(input.models || "[]");
    } catch (e) {}

    if (parsedModels.length === 0 || parsedModels.length <= 6) {
      try {
        const live = await fetchBandelBangetLiveModels();
        if (live.length > 0) {
          db.update(upstreamKeys)
            .set({ models: JSON.stringify(live), updatedAt: now })
            .where(eq(upstreamKeys.id, input.id))
            .run();
          input.models = JSON.stringify(live);
        }
      } catch (e) {}
    }
  }

  return { followUpstream: follow, inputKey: input };
}

/**
 * Synchronize Follow Upstream provider's models with BandelBanget live /v1/models
 */
export async function syncBandelBangetFollowUpstreamModels(): Promise<{
  models: BandelBangetModelItem[];
  totalCount: number;
  enabledCount: number;
}> {
  const liveModels = await fetchBandelBangetLiveModels();
  const enabledCount = liveModels.filter((m) => m.enabled).length;

  const now = Date.now();

  // Find the follow upstream provider
  let follow = db
    .select()
    .from(upstreamKeys)
    .where(
      and(
        eq(upstreamKeys.baseUrl, BANDELBANGET_CONFIG.BASE_URL),
        eq(upstreamKeys.followUpstream, 1)
      )
    )
    .get();

  if (!follow) {
    follow = db
      .select()
      .from(upstreamKeys)
      .where(eq(upstreamKeys.id, BANDELBANGET_CONFIG.PROVIDER_ID_FOLLOW))
      .get();
  }

  if (follow) {
    db.update(upstreamKeys)
      .set({
        models: JSON.stringify(liveModels),
        updatedAt: now,
      })
      .where(eq(upstreamKeys.id, follow.id))
      .run();
  }

  return {
    models: liveModels,
    totalCount: liveModels.length,
    enabledCount,
  };
}
