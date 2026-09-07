import { Elysia } from "elysia";
import { validateClientKey } from "../services/auth";
import {
  proxyOpenAIChatCompletions,
  proxyAnthropicMessages,
  proxyOpenAIModels,
} from "../services/proxy";
import { checkHttpsRequirement } from "../services/optimizer";

export const proxyRoutes = new Elysia()
  .onBeforeHandle(({ request }) => {
    const httpsErr = checkHttpsRequirement(request);
    if (httpsErr) return httpsErr;
  })
  // OpenAI Chat Completions
  .post("/v1/chat/completions", async ({ request, set }) => {
    // 1. Authenticate client
    const authHeader = request.headers.get("Authorization");
    const xApiKey = request.headers.get("x-api-key");
    const key = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : xApiKey?.trim();

    if (!key) {
      set.status = 401;
      return {
        error: {
          message:
            "Missing API key. Pass your Neko-Router key via 'Authorization: Bearer <key>' or 'x-api-key: <key>'.",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      };
    }

    const clientKey = await validateClientKey(key);
    if (!clientKey) {
      set.status = 401;
      return {
        error: {
          message: "Invalid or inactive Neko-Router API key.",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      };
    }

    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      set.status = 400;
      return {
        error: {
          message: "Malformed JSON payload in request body",
          type: "invalid_request_error",
        },
      };
    }

    return proxyOpenAIChatCompletions(request.headers, body, clientKey);
  })

  // OpenAI Models list (tidak perlu SK, publik)
  .get("/v1/models", async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    const xApiKey = request.headers.get("x-api-key");
    const key = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : xApiKey?.trim();

    // Jika ada SK yang valid, saring model sesuai allowed providers; jika tanpa SK, tampilkan semua model aktif
    const clientKey = key ? await validateClientKey(key) : null;
    return proxyOpenAIModels(clientKey);
  })
  .get("/models", async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    const xApiKey = request.headers.get("x-api-key");
    const key = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : xApiKey?.trim();

    const clientKey = key ? await validateClientKey(key) : null;
    return proxyOpenAIModels(clientKey);
  })

  // Anthropic Messages
  .post("/v1/messages", async ({ request, set }) => {
    const authHeader = request.headers.get("Authorization");
    const xApiKey = request.headers.get("x-api-key");
    const key = xApiKey?.trim() || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null);

    if (!key) {
      set.status = 401;
      return {
        type: "error",
        error: {
          type: "authentication_error",
          message:
            "Missing API key. Pass your Neko-Router key via 'x-api-key: <key>' or 'Authorization: Bearer <key>'.",
        },
      };
    }

    const clientKey = await validateClientKey(key);
    if (!clientKey) {
      set.status = 401;
      return {
        type: "error",
        error: {
          type: "authentication_error",
          message: "Invalid or inactive Neko-Router API key.",
        },
      };
    }

    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      set.status = 400;
      return {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "Malformed JSON payload in request body",
        },
      };
    }

    return proxyAnthropicMessages(request.headers, body, clientKey);
  });
