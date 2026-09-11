import {
  selectUpstreamKey,
  getBaseUrl,
  getApiKeyForUpstream,
  getActiveUpstreamKeys,
  parseUpstreamModels,
  parseUpstreamKeyEntries,
  parseAllowedProviders,
} from "./router";
import { recordTelemetry, registerActiveRequest } from "./telemetry";
import { incrementClientKeyTokens, checkClientRateLimit, validateClientKey } from "./auth";
import { db } from "../db";
import { upstreamKeys, type ClientKey, type UpstreamKey } from "../db/schema";
import { eq, or, like, and } from "drizzle-orm";
import {
  getOptimizationSettings,
  optimizeRequestBody,
  computeCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "./optimizer";
import {
  getCopilotInternalToken,
  getCopilotHeaders,
  transformCopilotRequestBody,
} from "./copilot";
import {
  ensureAntigravityAccessToken,
  forceRefreshAntigravityToken,
} from "./antigravity";
import {
  CODEX_CONFIG,
  ensureCodexAccessToken,
  refreshCodexToken,
  transformChatToCodexResponses,
} from "./codex";

type CancellableTransformer<I, O> = Transformer<I, O> & {
  cancel?(reason?: any): void | Promise<void>;
};

export async function proxyOpenAIChatCompletions(
  reqHeaders: Headers,
  body: any,
  clientKey: ClientKey | null,
  clientSignal?: AbortSignal
): Promise<Response> {
  const startTime = performance.now();
  const requestedModel = (body && typeof body === "object" ? body.model : "") || "unknown";
  const selection = selectUpstreamKey("openai", requestedModel, clientKey);
  const upstream = selection.upstream;

  if (!upstream) {
    const isForbidden = selection.error === "no_allowed_providers";
    const isModelDisabled = selection.error === "model_not_enabled";
    return new Response(
      JSON.stringify({
        error: {
          message:
            selection.message ||
            (isModelDisabled
              ? `Model '${requestedModel}' is not enabled on any active OpenAI upstream provider. Enable it in Upstream Settings.`
              : "No active OpenAI upstream provider configured in Neko-Router"),
          type: isForbidden ? "permission_error" : isModelDisabled ? "invalid_request_error" : "router_error",
          code: isForbidden ? "provider_access_denied" : isModelDisabled ? "model_not_enabled" : "no_upstream_key",
        },
      }),
      { status: isForbidden ? 403 : isModelDisabled ? 400 : 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (clientKey) {
    if (clientKey.tokenLimit !== null && clientKey.tokenLimit !== undefined && clientKey.tokenLimit > 0) {
      if ((clientKey.usedTokens || 0) >= clientKey.tokenLimit) {
        return new Response(
          JSON.stringify({
            error: {
              message: `Token quota exceeded. Your key has consumed ${(clientKey.usedTokens || 0).toLocaleString()} of ${clientKey.tokenLimit.toLocaleString()} allocated tokens.`,
              type: "insufficient_quota",
              code: "insufficient_quota",
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (clientKey.rateLimit && !checkClientRateLimit(clientKey.id, clientKey.rateLimit)) {
      return new Response(
        JSON.stringify({
          error: {
            message: `Rate limit exceeded. Key is restricted to ${clientKey.rateLimit} requests per minute.`,
            type: "requests",
            code: "rate_limit_exceeded",
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  // Load optimization settings
  const opt = getOptimizationSettings();
  const optimizedBody = optimizeRequestBody(body, "openai");

  // Normalize model name for upstream: if provider or custom prefix was sent (e.g. "openai/gpt-4o" or "ryzumi/auto"), strip it unless custom gateway
  if (optimizedBody && typeof optimizedBody.model === "string" && optimizedBody.model.includes("/")) {
    const isCustomGateway = upstream.baseUrl && (upstream.baseUrl.includes("openrouter") || upstream.baseUrl.includes("together") || upstream.baseUrl.includes("groq"));
    if (!isCustomGateway) {
      const parts = optimizedBody.model.split("/");
      const prefix = parts[0].toLowerCase();
      const upPrefix = (upstream.prefix || "").toLowerCase();
      if (prefix === "openai" || prefix === upstream.provider.toLowerCase() || (upPrefix && prefix === upPrefix)) {
        optimizedBody.model = parts.slice(1).join("/");
      }
    }
  }

  const model = optimizedBody?.model || "unknown";
  const isStream = Boolean(optimizedBody?.stream);

  const reqId = "req_" + crypto.randomUUID().replace(/-/g, "");
  const finishActive = registerActiveRequest({
    id: reqId,
    clientKeyId: clientKey?.id,
    upstreamKeyId: upstream.id,
    provider: "openai",
    model,
    startedAt: startTime,
  });

  // Client abort handling: if the caller drops or cancels, immediately terminate active routing
  if (clientSignal) {
    if (clientSignal.aborted) {
      finishActive();
      return new Response(JSON.stringify({ error: { message: "Client aborted request" } }), { status: 499 });
    }
    clientSignal.addEventListener("abort", () => {
      finishActive();
    }, { once: true });
  }

  // Check Exact Response Cache
  let cacheKey = "";
  if (opt.cacheEnabled) {
    try {
      cacheKey = await computeCacheKey("openai", model, optimizedBody.messages);
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        finishActive();
        const durationMs = Math.max(1, Math.round(performance.now() - startTime));
        recordTelemetry({
          clientKeyId: clientKey?.id,
          clientKeyName: clientKey?.name,
          upstreamKeyId: upstream.id,
          provider: "openai",
          endpoint: "/v1/chat/completions",
          model,
          promptTokens: cached.promptTokens,
          completionTokens: cached.completionTokens,
          cachedTokens: cached.promptTokens, // Full prompt served from cache
          totalTokens: cached.totalTokens,
          statusCode: 200,
          durationMs,
          isStreaming: isStream,
        });

        if (clientKey && cached.completionTokens > 0) {
          incrementClientKeyTokens(clientKey.id, cached.completionTokens);
        }

        if (isStream) {
          const content = cached.responseJson?.choices?.[0]?.message?.content || "";
          const ssePayload =
            `data: ${JSON.stringify({
              id: "chatcmpl-cache-" + Date.now(),
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [{ index: 0, delta: { content }, finish_reason: "stop" }],
              usage: {
                prompt_tokens: cached.promptTokens,
                completion_tokens: cached.completionTokens,
                total_tokens: cached.totalTokens,
                prompt_tokens_details: { cached_tokens: cached.promptTokens },
              },
            })}\n\ndata: [DONE]\n\n`;

          return new Response(ssePayload, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              "X-Cache-Status": "HIT",
            },
          });
        }

        return new Response(JSON.stringify(cached.responseJson), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Cache-Status": "HIT",
          },
        });
      }
    } catch (e) {
      // Cache lookup failed, continue upstream
    }
  }

  // If streaming, request usage in stream options so OpenAI provides token stats in the final chunk
  if (isStream) {
    optimizedBody.stream_options = {
      ...(optimizedBody.stream_options || {}),
      include_usage: true,
    };
  }

  const isCodex =
    upstream.baseUrl?.includes("chatgpt.com/backend-api/codex") ||
    upstream.name.toLowerCase().includes("codex");

  const upstreamUrl = isCodex
    ? (upstream.baseUrl?.trim() || CODEX_CONFIG.BASE_URL)
    : `${getBaseUrl(upstream)}/chat/completions`;

  const timeoutSeconds = Number(opt.requestTimeoutSeconds) || 0;
  const controller = new AbortController();
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  if (timeoutSeconds > 0) {
    timeoutTimer = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutSeconds}s`));
    }, timeoutSeconds * 1000);
  }

  if (clientSignal) {
    if (clientSignal.aborted) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      controller.abort();
      finishActive();
    } else {
      clientSignal.addEventListener(
        "abort",
        () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          controller.abort();
          finishActive();
        },
        { once: true }
      );
    }
  }

  let upstreamResponse: Response;
  try {
    const currentUpstreamKey = getApiKeyForUpstream(upstream);
    let upstreamHeaders: Record<string, string>;

    const isCopilot =
      upstream.baseUrl?.includes("githubcopilot.com") ||
      currentUpstreamKey.startsWith("ghu_") ||
      currentUpstreamKey.startsWith("gho_");

    const isAntigravity =
      upstream.baseUrl?.includes("cloudcode-pa.googleapis.com") ||
      upstream.baseUrl?.includes("daily-cloudcode-pa.googleapis.com") ||
      currentUpstreamKey.startsWith("ya29.") ||
      upstream.name.toLowerCase().includes("antigravity");

    let requestPayload = optimizedBody;
    let effectiveAntigravityKey = currentUpstreamKey;
    let antigravityEntry: any = null;
    let effectiveCodexKey = currentUpstreamKey;
    let codexEntry: any = null;

    if (isCopilot) {
      const isStream = Boolean(optimizedBody?.stream);
      const internalToken = await getCopilotInternalToken(currentUpstreamKey);
      upstreamHeaders = getCopilotHeaders(internalToken, isStream);
      requestPayload = transformCopilotRequestBody(optimizedBody, model);
    } else if (isAntigravity) {
      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      antigravityEntry = entries.find((e) => e.key === currentUpstreamKey) || entries.find((e) => e.isActive);
      if (antigravityEntry) {
        effectiveAntigravityKey = await ensureAntigravityAccessToken(upstream.id, antigravityEntry);
      }

      const isStream = Boolean(optimizedBody?.stream);
      upstreamHeaders = {
        Authorization: `Bearer ${effectiveAntigravityKey}`,
        "Content-Type": "application/json",
        "User-Agent": "antigravity/ide/2.11.0 darwin/arm64",
        "x-request-source": "local",
        Accept: isStream ? "text/event-stream" : "application/json",
      };
    } else if (isCodex) {
      const entries = parseUpstreamKeyEntries(upstream.apiKeys, upstream.apiKey);
      codexEntry = entries.find((e) => e.key === currentUpstreamKey) || entries.find((e) => e.isActive);
      if (codexEntry) {
        effectiveCodexKey = await ensureCodexAccessToken(upstream.id, codexEntry);
      }

      const isStream = Boolean(optimizedBody?.stream);
      upstreamHeaders = {
        Authorization: `Bearer ${effectiveCodexKey}`,
        "Content-Type": "application/json",
        originator: CODEX_CONFIG.ORIGINATOR,
        "User-Agent": CODEX_CONFIG.USER_AGENT,
        Accept: isStream ? "text/event-stream" : "application/json",
      };
      if (codexEntry?.chatgptAccountId) {
        (upstreamHeaders as any)["chatgpt-account-id"] = codexEntry.chatgptAccountId;
      }
      requestPayload = transformChatToCodexResponses(optimizedBody, model);
    } else {
      const isFollowUpstream = Boolean((upstream as any).followUpstream);
      let authHeaderVal = `Bearer ${currentUpstreamKey}`;
      if (isFollowUpstream) {
        // In Follow Upstream mode, forward client's valid BB key if passed, or fallback to BB default key
        const clientAuth = reqHeaders.get("Authorization");
        const clientKeyHeader = reqHeaders.get("x-api-key");
        const passedKey = clientAuth?.startsWith("Bearer ") ? clientAuth.slice(7).trim() : clientKeyHeader?.trim();
        if (passedKey && !passedKey.startsWith("sk-neko-") && passedKey !== "bb-default") {
          authHeaderVal = `Bearer ${passedKey}`;
        } else {
          authHeaderVal = "Bearer bb-default";
        }
      }

      upstreamHeaders = {
        "Content-Type": "application/json",
        Authorization: authHeaderVal,
      };
    }

    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    // If Antigravity returns 401 Unauthorized, force-refresh token and retry once
    if (isAntigravity && upstreamResponse.status === 401 && antigravityEntry?.refreshToken) {
      try {
        const refreshedToken = await forceRefreshAntigravityToken(upstream.id, antigravityEntry);
        upstreamHeaders.Authorization = `Bearer ${refreshedToken}`;
        upstreamResponse = await fetch(upstreamUrl, {
          method: "POST",
          headers: upstreamHeaders,
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });
      } catch (refreshErr) {
        // Continue with original response
      }
    }

    // If Codex returns 401 Unauthorized, refresh token and retry once
    if (isCodex && upstreamResponse.status === 401 && codexEntry?.refreshToken) {
      try {
        const refreshed = await refreshCodexToken(codexEntry.refreshToken);
        codexEntry.key = refreshed.accessToken;
        if (refreshed.refreshToken) codexEntry.refreshToken = refreshed.refreshToken;
        if (refreshed.expiresAt) codexEntry.expiresAt = refreshed.expiresAt;
        upstreamHeaders.Authorization = `Bearer ${refreshed.accessToken}`;
        upstreamResponse = await fetch(upstreamUrl, {
          method: "POST",
          headers: upstreamHeaders,
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });
      } catch (refreshErr) {
        // Continue with original response
      }
    }
  } catch (err: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    finishActive();
    const isTimeout = controller.signal.aborted;
    const durationMs = Math.round(performance.now() - startTime);
    const statusCode = isTimeout ? 504 : 502;
    const errorMsg = isTimeout
      ? `Gateway timeout: Request duration exceeded configured limit of ${timeoutSeconds}s.`
      : (err?.message || "Failed to reach upstream provider");

    recordTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      upstreamKeyId: upstream.id,
      provider: "openai",
      endpoint: "/v1/chat/completions",
      model,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      statusCode,
      durationMs,
      isStreaming: isStream,
      errorMessage: errorMsg,
    });

    return new Response(
      JSON.stringify({
        error: {
          message: errorMsg,
          type: isTimeout ? "timeout_error" : "gateway_error",
          code: isTimeout ? "gateway_timeout" : undefined,
        },
      }),
      { status: statusCode, headers: { "Content-Type": "application/json" } }
    );
  }

  // Handle upstream error
  if (!upstreamResponse.ok) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    finishActive();
    const errorText = await upstreamResponse.text();
    const durationMs = Math.round(performance.now() - startTime);
    recordTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      upstreamKeyId: upstream.id,
      provider: "openai",
      endpoint: "/v1/chat/completions",
      model,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      statusCode: upstreamResponse.status,
      durationMs,
      isStreaming: isStream,
      errorMessage: errorText.slice(0, 500),
    });

    return new Response(errorText, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type":
          upstreamResponse.headers.get("content-type") || "application/json",
      },
    });
  }

  // Handle Non-Streaming Response
  if (!isStream || !upstreamResponse.body) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    finishActive();
    let responseData = (await upstreamResponse.json()) as any;
    if (isCodex && Array.isArray(responseData?.output)) {
      let textContent = "";
      for (const item of responseData.output) {
        if (item.content && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) textContent += c.text;
          }
        }
      }
      responseData = {
        id: responseData.id ? `chatcmpl-${responseData.id}` : `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: textContent },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: responseData.usage?.input_tokens || 0,
          completion_tokens: responseData.usage?.output_tokens || 0,
          total_tokens: (responseData.usage?.input_tokens || 0) + (responseData.usage?.output_tokens || 0),
        },
      };
    }
    const durationMs = Math.round(performance.now() - startTime);
    const usage = responseData?.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const cachedTokens =
      usage.prompt_tokens_details?.cached_tokens || usage.cached_tokens || 0;
    const totalTokens = usage.total_tokens || promptTokens + completionTokens;

    recordTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      upstreamKeyId: upstream.id,
      provider: "openai",
      endpoint: "/v1/chat/completions",
      model,
      promptTokens,
      completionTokens,
      cachedTokens,
      totalTokens,
      statusCode: upstreamResponse.status,
      durationMs,
      isStreaming: false,
    });

    if (clientKey && totalTokens > 0) {
      incrementClientKeyTokens(clientKey.id, totalTokens);
    }

    if (opt.cacheEnabled && cacheKey) {
      setCachedResponse(
        cacheKey,
        "openai",
        model,
        responseData,
        promptTokens,
        completionTokens,
        opt.cacheTtlSeconds
      );
    }

    return new Response(JSON.stringify(responseData), {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json",
        "X-Cache-Status": "MISS",
      },
    });
  }

  // Handle Streaming Passthrough with Zero Latency & SSE Usage Parser
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let lineBuffer = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let cachedTokens = 0;
  let totalTokens = 0;
  let estimatedTokens = 0;

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      finishActive.touch();
      if (!isCodex) {
        // Instantly passthrough the raw chunk to client for standard providers
        controller.enqueue(chunk);
      }

      // Parse SSE chunk
      try {
        lineBuffer += decoder.decode(chunk, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (isCodex) {
            if (trimmed.startsWith("data:")) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string") {
                  const openaiChunk = {
                    id: `chatcmpl-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: { content: parsed.delta }, finish_reason: null }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                  estimatedTokens += 1;
                } else if (parsed.type === "response.completed" || parsed.type === "response.done") {
                  const finalChunk = {
                    id: `chatcmpl-${Date.now()}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\ndata: [DONE]\n\n`));
                  if (parsed.response?.usage) {
                    promptTokens = parsed.response.usage.input_tokens || promptTokens;
                    completionTokens = parsed.response.usage.output_tokens || completionTokens;
                    totalTokens = promptTokens + completionTokens;
                  }
                }
              } catch {
                // Ignore partial JSON
              }
            }
          } else {
            // Standard OpenAI chunk telemetry parsing
            if (trimmed.startsWith("data:")) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed?.usage) {
                  promptTokens = parsed.usage.prompt_tokens || promptTokens;
                  completionTokens =
                    parsed.usage.completion_tokens || completionTokens;
                  totalTokens = parsed.usage.total_tokens || totalTokens;
                  const cTokens =
                    parsed.usage.prompt_tokens_details?.cached_tokens ||
                    parsed.usage.cached_tokens;
                  if (typeof cTokens === "number") {
                    cachedTokens = cTokens;
                  }
                }
                if (parsed?.choices?.[0]?.delta?.content) {
                  estimatedTokens += 1;
                }
              } catch (e) {
                // Ignore partial or unparseable JSON in data line
              }
            }
          }
        }
      } catch (e) {
        // Continue streaming regardless of telemetry parsing error
      }
    },
    flush() {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      finishActive();
      const durationMs = Math.round(performance.now() - startTime);
      if (totalTokens === 0 && estimatedTokens > 0) {
        completionTokens = estimatedTokens;
        totalTokens = completionTokens;
      }

      recordTelemetry({
        clientKeyId: clientKey?.id,
        clientKeyName: clientKey?.name,
        upstreamKeyId: upstream.id,
        provider: "openai",
        endpoint: "/v1/chat/completions",
        model,
        promptTokens,
        completionTokens,
        cachedTokens,
        totalTokens: totalTokens || promptTokens + completionTokens,
        statusCode: upstreamResponse.status,
        durationMs,
        isStreaming: true,
      });

      const finalTokens = totalTokens || promptTokens + completionTokens;
      if (clientKey && finalTokens > 0) {
        incrementClientKeyTokens(clientKey.id, finalTokens);
      }
    },
    cancel(reason?: any) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      finishActive();
    },
  } as CancellableTransformer<Uint8Array, Uint8Array>);

  const responseHeaders = new Headers();
  responseHeaders.set(
    "Content-Type",
    upstreamResponse.headers.get("content-type") || "text/event-stream"
  );
  responseHeaders.set("Cache-Control", "no-cache");
  responseHeaders.set("Connection", "keep-alive");
  responseHeaders.set("X-Accel-Buffering", "no");
  responseHeaders.set("X-Cache-Status", "MISS");

  return new Response(upstreamResponse.body.pipeThrough(transformStream), {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export async function proxyAnthropicMessages(
  reqHeaders: Headers,
  body: any,
  clientKey: ClientKey | null,
  clientSignal?: AbortSignal
): Promise<Response> {
  const startTime = performance.now();
  const requestedModel = (body && typeof body === "object" ? body.model : "") || "unknown";
  const selection = selectUpstreamKey("anthropic", requestedModel, clientKey);
  const upstream = selection.upstream;

  if (!upstream) {
    const isForbidden = selection.error === "no_allowed_providers";
    const isModelDisabled = selection.error === "model_not_enabled";
    return new Response(
      JSON.stringify({
        type: "error",
        error: {
          type: isForbidden ? "permission_error" : isModelDisabled ? "invalid_request_error" : "router_error",
          message:
            selection.message ||
            (isModelDisabled
              ? `Model '${requestedModel}' is not enabled on any active Anthropic upstream provider. Enable it in Upstream Settings.`
              : "No active Anthropic upstream key configured in Neko-Router"),
        },
      }),
      { status: isForbidden ? 403 : isModelDisabled ? 400 : 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (clientKey) {
    if (clientKey.tokenLimit !== null && clientKey.tokenLimit !== undefined && clientKey.tokenLimit > 0) {
      if ((clientKey.usedTokens || 0) >= clientKey.tokenLimit) {
        return new Response(
          JSON.stringify({
            type: "error",
            error: {
              type: "insufficient_quota",
              message: `Token quota exceeded. Your key has consumed ${(clientKey.usedTokens || 0).toLocaleString()} of ${clientKey.tokenLimit.toLocaleString()} allocated tokens.`,
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (clientKey.rateLimit && !checkClientRateLimit(clientKey.id, clientKey.rateLimit)) {
      return new Response(
        JSON.stringify({
          type: "error",
          error: {
            type: "rate_limit_error",
            message: `Rate limit exceeded. Key is restricted to ${clientKey.rateLimit} requests per minute.`,
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const opt = getOptimizationSettings();
  const optimizedBody = optimizeRequestBody(body, "anthropic");

  // Normalize model name for upstream: if provider prefix was sent (e.g. "anthropic/claude-3-5-sonnet"), strip it unless custom gateway
  if (optimizedBody && typeof optimizedBody.model === "string" && optimizedBody.model.includes("/")) {
    const isCustomGateway = upstream.baseUrl && (upstream.baseUrl.includes("openrouter") || upstream.baseUrl.includes("together") || upstream.baseUrl.includes("groq"));
    if (!isCustomGateway) {
      const parts = optimizedBody.model.split("/");
      if (parts[0].toLowerCase() === "anthropic" || parts[0].toLowerCase() === upstream.provider.toLowerCase()) {
        optimizedBody.model = parts.slice(1).join("/");
      }
    }
  }

  const model = optimizedBody?.model || "unknown";
  const isStream = Boolean(optimizedBody?.stream);

  const reqId = "req_" + crypto.randomUUID().replace(/-/g, "");
  const finishActive = registerActiveRequest({
    id: reqId,
    clientKeyId: clientKey?.id,
    upstreamKeyId: upstream.id,
    provider: "anthropic",
    model,
    startedAt: startTime,
  });

  // Check Exact Response Cache for Anthropic
  let cacheKey = "";
  if (opt.cacheEnabled) {
    try {
      cacheKey = await computeCacheKey("anthropic", model, {
        system: optimizedBody.system,
        messages: optimizedBody.messages,
      });
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        finishActive();
        const durationMs = Math.max(1, Math.round(performance.now() - startTime));
        recordTelemetry({
          clientKeyId: clientKey?.id,
          clientKeyName: clientKey?.name,
          upstreamKeyId: upstream.id,
          provider: "anthropic",
          endpoint: "/v1/messages",
          model,
          promptTokens: cached.promptTokens,
          completionTokens: cached.completionTokens,
          cachedTokens: cached.promptTokens, // Full prompt served from cache
          totalTokens: cached.totalTokens,
          statusCode: 200,
          durationMs,
          isStreaming: isStream,
        });

        if (clientKey && cached.completionTokens > 0) {
          incrementClientKeyTokens(clientKey.id, cached.completionTokens);
        }

        if (isStream) {
          const textContent =
            cached.responseJson?.content?.[0]?.text ||
            (typeof cached.responseJson?.content === "string"
              ? cached.responseJson.content
              : "");

          const sseChunks = [
            `event: message_start\ndata: ${JSON.stringify({
              type: "message_start",
              message: {
                id: "msg_cache_" + Date.now(),
                type: "message",
                role: "assistant",
                model,
                usage: {
                  input_tokens: cached.promptTokens,
                  output_tokens: cached.completionTokens,
                  cache_read_input_tokens: cached.promptTokens,
                },
              },
            })}\n\n`,
            `event: content_block_start\ndata: ${JSON.stringify({
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            })}\n\n`,
            `event: content_block_delta\ndata: ${JSON.stringify({
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: textContent },
            })}\n\n`,
            `event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n`,
            `event: message_delta\ndata: ${JSON.stringify({
              type: "message_delta",
              delta: { stop_reason: "end_turn", stop_sequence: null },
              usage: { output_tokens: cached.completionTokens },
            })}\n\n`,
            `event: message_stop\ndata: {"type":"message_stop"}\n\n`,
          ].join("");

          return new Response(sseChunks, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              "X-Cache-Status": "HIT",
            },
          });
        }

        return new Response(JSON.stringify(cached.responseJson), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Cache-Status": "HIT",
          },
        });
      }
    } catch (e) {
      // Continue upstream on cache error
    }
  }

  const upstreamUrl = `${getBaseUrl(upstream)}/v1/messages`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": getApiKeyForUpstream(upstream),
    "anthropic-version":
      reqHeaders.get("anthropic-version") || "2023-06-01",
  };

  const anthropicBeta = reqHeaders.get("anthropic-beta");
  if (anthropicBeta) {
    headers["anthropic-beta"] = anthropicBeta;
  }

  const timeoutSeconds = Number(opt.requestTimeoutSeconds) || 0;
  const controller = new AbortController();
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  if (timeoutSeconds > 0) {
    timeoutTimer = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutSeconds}s`));
    }, timeoutSeconds * 1000);
  }

  if (clientSignal) {
    if (clientSignal.aborted) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      controller.abort();
      finishActive();
    } else {
      clientSignal.addEventListener(
        "abort",
        () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          controller.abort();
          finishActive();
        },
        { once: true }
      );
    }
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(optimizedBody),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    finishActive();
    const isTimeout = controller.signal.aborted;
    const durationMs = Math.round(performance.now() - startTime);
    const statusCode = isTimeout ? 504 : 502;
    const errorMsg = isTimeout
      ? `Gateway timeout: Request duration exceeded configured limit of ${timeoutSeconds}s.`
      : (err?.message || "Failed to reach Anthropic upstream");

    recordTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      upstreamKeyId: upstream.id,
      provider: "anthropic",
      endpoint: "/v1/messages",
      model,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      statusCode,
      durationMs,
      isStreaming: isStream,
      errorMessage: errorMsg,
    });

    return new Response(
      JSON.stringify({
        type: "error",
        error: {
          type: isTimeout ? "timeout_error" : "gateway_error",
          message: errorMsg,
        },
      }),
      { status: statusCode, headers: { "Content-Type": "application/json" } }
    );
  }

  // Handle upstream error
  if (!upstreamResponse.ok) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    finishActive();
    const errorText = await upstreamResponse.text();
    const durationMs = Math.round(performance.now() - startTime);
    recordTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      upstreamKeyId: upstream.id,
      provider: "anthropic",
      endpoint: "/v1/messages",
      model,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      statusCode: upstreamResponse.status,
      durationMs,
      isStreaming: isStream,
      errorMessage: errorText.slice(0, 500),
    });

    return new Response(errorText, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type":
          upstreamResponse.headers.get("content-type") || "application/json",
      },
    });
  }

  // Handle Non-Streaming Anthropic Response
  if (!isStream || !upstreamResponse.body) {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    finishActive();
    const responseData = (await upstreamResponse.json()) as any;
    const durationMs = Math.round(performance.now() - startTime);
    const usage = responseData?.usage || {};
    const promptTokens = usage.input_tokens || 0;
    const completionTokens = usage.output_tokens || 0;
    const cachedTokens = usage.cache_read_input_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    recordTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      upstreamKeyId: upstream.id,
      provider: "anthropic",
      endpoint: "/v1/messages",
      model,
      promptTokens,
      completionTokens,
      cachedTokens,
      totalTokens,
      statusCode: upstreamResponse.status,
      durationMs,
      isStreaming: false,
    });

    if (clientKey && totalTokens > 0) {
      incrementClientKeyTokens(clientKey.id, totalTokens);
    }

    if (opt.cacheEnabled && cacheKey) {
      setCachedResponse(
        cacheKey,
        "anthropic",
        model,
        responseData,
        promptTokens,
        completionTokens,
        opt.cacheTtlSeconds
      );
    }

    return new Response(JSON.stringify(responseData), {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json",
        "X-Cache-Status": "MISS",
      },
    });
  }

  // Handle Streaming Passthrough for Anthropic SSE
  const decoder = new TextDecoder("utf-8");
  let lineBuffer = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let cachedTokens = 0;
  let currentEvent = "";

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      finishActive.touch();
      // 1. Passthrough directly with no latency
      controller.enqueue(chunk);

      // 2. Parse Anthropic SSE events
      try {
        lineBuffer += decoder.decode(chunk, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (currentEvent === "message_start" && parsed?.message?.usage) {
                promptTokens = parsed.message.usage.input_tokens || promptTokens;
                if (typeof parsed.message.usage.cache_read_input_tokens === "number") {
                  cachedTokens = parsed.message.usage.cache_read_input_tokens;
                }
              } else if (
                currentEvent === "message_delta" &&
                parsed?.usage?.output_tokens
              ) {
                completionTokens = parsed.usage.output_tokens;
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      } catch (e) {
        // Stream continues
      }
    },
    flush() {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      finishActive();
      const durationMs = Math.round(performance.now() - startTime);
      recordTelemetry({
        clientKeyId: clientKey?.id,
        clientKeyName: clientKey?.name,
        upstreamKeyId: upstream.id,
        provider: "anthropic",
        endpoint: "/v1/messages",
        model,
        promptTokens,
        completionTokens,
        cachedTokens,
        totalTokens: promptTokens + completionTokens,
        statusCode: upstreamResponse.status,
        durationMs,
        isStreaming: true,
      });

      if (clientKey && (promptTokens + completionTokens) > 0) {
        incrementClientKeyTokens(clientKey.id, promptTokens + completionTokens);
      }
    },
    cancel(reason?: any) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      finishActive();
    },
  } as CancellableTransformer<Uint8Array, Uint8Array>);

  const responseHeaders = new Headers();
  responseHeaders.set(
    "Content-Type",
    upstreamResponse.headers.get("content-type") || "text/event-stream"
  );
  responseHeaders.set("Cache-Control", "no-cache");
  responseHeaders.set("Connection", "keep-alive");
  responseHeaders.set("X-Accel-Buffering", "no");
  responseHeaders.set("X-Cache-Status", "MISS");

  return new Response(upstreamResponse.body.pipeThrough(transformStream), {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

function getModelCapabilities(modelId: string) {
  const lower = modelId.toLowerCase();
  const isEmbedding = lower.includes("embedding");
  const isAudio = lower.includes("whisper") || lower.includes("tts") || lower.includes("audio");
  const isImage = lower.includes("dall-e") || lower.includes("image");
  const isReasoning =
    lower.includes("o1") ||
    lower.includes("o3") ||
    lower.includes("r1") ||
    lower.includes("deepseek-r1") ||
    lower.includes("thought");
  const isVision =
    lower.includes("vision") ||
    lower.includes("4o") ||
    lower.includes("claude-3") ||
    lower.includes("claude-3.5") ||
    lower.includes("claude-3.7") ||
    lower.includes("gemini") ||
    lower.includes("o1") ||
    lower.includes("vl");

  return {
    completion: !isEmbedding,
    chat_completion: !isEmbedding && !isAudio,
    embeddings: isEmbedding,
    vision: isVision,
    function_calling: !isEmbedding && !isAudio && !lower.includes("o1-mini"),
    tools: !isEmbedding && !isAudio && !lower.includes("o1-mini"),
    tool_choice: !isEmbedding && !isAudio && !lower.includes("o1-mini"),
    json_mode: !isEmbedding,
    json_schema: !isEmbedding,
    streaming: true,
    reasoning: isReasoning,
    image_generation: isImage,
  };
}

function getModelContextWindow(modelId: string): number {
  const lower = modelId.toLowerCase();
  if (lower.includes("claude-3") || lower.includes("claude-3.5") || lower.includes("claude-3.7")) return 200000;
  if (lower.includes("o1") || lower.includes("o3")) return 200000;
  if (lower.includes("gemini-1.5") || lower.includes("gemini-2.0")) return 1000000;
  if (lower.includes("gpt-4o") || lower.includes("gpt-4-turbo")) return 128000;
  if (lower.includes("gpt-4-32k")) return 32768;
  if (lower.includes("gpt-4")) return 8192;
  if (lower.includes("gpt-3.5-turbo-16k")) return 16385;
  if (lower.includes("gpt-3.5")) return 16385;
  if (lower.includes("deepseek")) return 64000;
  return 128000;
}

function getModelMaxTokens(modelId: string): number {
  const lower = modelId.toLowerCase();
  if (lower.includes("o1") || lower.includes("o3")) return 100000;
  if (lower.includes("claude-3-7")) return 64000;
  if (lower.includes("gpt-4o")) return 16384;
  if (lower.includes("claude-3-5")) return 8192;
  if (lower.includes("claude-3")) return 4096;
  if (lower.includes("gpt-4-turbo")) return 4096;
  if (lower.includes("gpt-4")) return 8192;
  return 8192;
}

function enrichModel(prefix: string, m: any, defaultCreated?: number) {
  const rawId = String(m.id || m.name || "").trim();
  // Strip any existing provider prefix to extract clean model id
  const cleanId = rawId.includes("/") ? rawId.split("/").slice(1).join("/") : rawId;
  const fullId = prefix ? `${prefix}/${cleanId}` : cleanId;

  const created =
    typeof m.created === "number"
      ? m.created
      : defaultCreated || Math.floor(Date.now() / 1000);

  const capabilities = m.capabilities || getModelCapabilities(cleanId);
  const contextWindow = m.context_window || m.contextWindow || getModelContextWindow(cleanId);
  const maxTokens = m.max_tokens || m.maxTokens || m.max_output_tokens || getModelMaxTokens(cleanId);
  const type = capabilities.embeddings ? "embeddings" : "chat";

  const modelObj: Record<string, any> = {
    id: fullId,
    object: "model",
    created,
    owned_by: "NekoRouter",
    name: m.name || cleanId,
    description: m.description || `${cleanId} routed via Neko-Router${prefix ? ` (${prefix})` : ""}`,
    provider: prefix || m.provider || "NekoRouter",
    type,
    context_window: contextWindow,
    max_tokens: maxTokens,
    max_output_tokens: maxTokens,
    capabilities,
    permission: [
      {
        id: `modelperm-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        object: "model_permission",
        created,
        allow_create_engine: false,
        allow_sampling: true,
        allow_logprobs: true,
        allow_search_indices: false,
        allow_view: true,
        allow_fine_tuning: false,
        organization: "*",
        group: null,
        is_blocking: false,
      },
    ],
    root: cleanId,
    parent: null,
  };

  // Copy any extra metadata from original, preserving owned_by as NekoRouter and omitting enabled
  for (const [key, val] of Object.entries(m)) {
    if (
      key !== "enabled" &&
      key !== "owned_by" &&
      key !== "id" &&
      key !== "object" &&
      key !== "created" &&
      modelObj[key] === undefined
    ) {
      modelObj[key] = val;
    }
  }

  return modelObj;
}

export async function proxyOpenAIModels(
  clientKey: ClientKey | null,
  headers?: Headers
): Promise<Response> {
  const authHeader = headers?.get("Authorization");
  const xApiKey = headers?.get("x-api-key");
  const passedKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : xApiKey?.trim();

  // Cari provider follow upstream / pass-through yang aktif
  const followUpstream = db
    .select()
    .from(upstreamKeys)
    .where(and(eq(upstreamKeys.followUpstream, 1), eq(upstreamKeys.isActive, 1)))
    .get();

  const allowedProviders = clientKey ? parseAllowedProviders(clientKey.allowedProviders) : [];

  // Tentukan apakah request ini adalah pass-through:
  // 1. Key memiliki flag isFollowUpstream = 1
  // 2. Key adalah 'bb-default'
  // 3. Key hanya mengizinkan follow upstream provider
  const isPassThrough = Boolean(
    clientKey && (
      clientKey.isFollowUpstream === 1 ||
      clientKey.key === "bb-default" ||
      (followUpstream && allowedProviders.length > 0 && allowedProviders.every((id) => id === followUpstream.id || id === "up_bandelbanget_follow"))
    )
  );

  // Jika pass-through: tampilkan 100% model langsung dari upstream
  if (isPassThrough && followUpstream) {
    const targetBase = (followUpstream.baseUrl || "https://bandelbanget.xyz/v1").replace(/\/+$/, "");
    const targetUrl = targetBase.endsWith("/v1") ? `${targetBase}/models` : `${targetBase}/v1/models`;

    let authToSend: string;
    if (passedKey && passedKey !== "bb-default" && !passedKey.startsWith("sk-neko-")) {
      authToSend = `Bearer ${passedKey}`;
    } else if (followUpstream.apiKey) {
      authToSend = `Bearer ${followUpstream.apiKey}`;
    } else {
      authToSend = authHeader || "Bearer bb-default";
    }

    try {
      const upstreamRes = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: authToSend,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (upstreamRes.ok) {
        const data = (await upstreamRes.json()) as any;
        if (Array.isArray(data?.data)) {
          data.data = data.data.map((m: any) => ({
            ...m,
            owned_by: "NekoRouter",
          }));
        }
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        console.warn("Pass-through /models upstream responded with status", upstreamRes.status);
      }
    } catch (err) {
      console.error("Failed to proxy /v1/models directly to upstream:", err);
    }

    // Fallback: fetch live models via BandelBanget helper
    try {
      const { fetchBandelBangetLiveModels } = await import("./bandelbanget");
      const liveModels = await fetchBandelBangetLiveModels();
      const data = liveModels.map((m) => enrichModel("", { ...m, owned_by: "NekoRouter" }));
      return new Response(JSON.stringify({ object: "list", data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {}
  }

  const activeOpenAI = getActiveUpstreamKeys("openai");
  const activeAnthropic = getActiveUpstreamKeys("anthropic");
  const allActive = [...activeOpenAI, ...activeAnthropic].filter((u) => u.isActive);

  if (allActive.length === 0) {
    return new Response(JSON.stringify({ object: "list", data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const enabledModelMap = new Map<string, any>();

  // KASUS 1: Fetch menggunakan Client Key tertentu -> HANYA model yang diizinkan & aktif pada key tersebut
  if (clientKey) {
    const allowed = parseAllowedProviders(clientKey.allowedProviders);
    if (allowed.length === 0) {
      return new Response(JSON.stringify({ object: "list", data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hasSpecificUpstreamIds = allowed.some((a) => a.startsWith("up_"));
    const permittedUpstreams = allActive.filter((u) => {
      if (hasSpecificUpstreamIds) {
        return allowed.includes(u.id);
      }
      return allowed.includes(u.id) || allowed.includes(u.provider);
    });

    for (const upstream of permittedUpstreams) {
      // Jika salah satu upstream yang diizinkan adalah follow upstream, ambil live models 100%
      if (Boolean((upstream as any).followUpstream)) {
        try {
          const { fetchBandelBangetLiveModels } = await import("./bandelbanget");
          const liveModels = await fetchBandelBangetLiveModels();
          for (const lm of liveModels) {
            if (lm.enabled !== false && !enabledModelMap.has(lm.id)) {
              const enriched = enrichModel("", { ...lm, owned_by: "NekoRouter" });
              enabledModelMap.set(lm.id, enriched);
            }
          }
        } catch (e) {}
        continue;
      }

      const rawPrefix = upstream.prefix ? upstream.prefix.trim() : "";
      const models = parseUpstreamModels(upstream.models);
      for (const m of models) {
        // HANYA model yang diaktifkan (enabled === true)
        if (m.enabled) {
          const enriched = enrichModel(rawPrefix, m);
          enabledModelMap.set(enriched.id, enriched);
        }
      }
    }

    const data = Array.from(enabledModelMap.values());
    return new Response(JSON.stringify({ object: "list", data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // KASUS 2: Fetch tanpa Key (Publik) -> Tampilkan seluruh model aktif yang ada di semua provider
  for (const upstream of allActive) {
    if (Boolean((upstream as any).followUpstream)) continue;

    const rawPrefix = upstream.prefix ? upstream.prefix.trim() : "";
    const models = parseUpstreamModels(upstream.models);
    for (const m of models) {
      if (m.enabled) {
        const enriched = enrichModel(rawPrefix, m);
        enabledModelMap.set(enriched.id, enriched);
      }
    }
  }

  // Jika ada follow upstream aktif, tambahkan live models-nya ke daftar publik
  if (followUpstream) {
    try {
      const { fetchBandelBangetLiveModels } = await import("./bandelbanget");
      const liveModels = await fetchBandelBangetLiveModels();
      for (const lm of liveModels) {
        if (lm.enabled !== false && !enabledModelMap.has(lm.id)) {
          const enriched = enrichModel("", { ...lm, owned_by: "NekoRouter" });
          enabledModelMap.set(lm.id, enriched);
        }
      }
    } catch (e) {}
  }

  const data = Array.from(enabledModelMap.values());
  return new Response(JSON.stringify({ object: "list", data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
