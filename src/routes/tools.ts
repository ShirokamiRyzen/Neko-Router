import { Elysia, t } from "elysia";
import { checkClientRateLimit, validateClientKey } from "../services/auth";
import { checkHttpsRequirement } from "../services/optimizer";
import { recordToolTelemetry } from "../services/telemetry";
import { fetchWebPage, searchDuckDuckGo } from "../services/tools";

function getProvidedKey(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey?.trim()) return xApiKey.trim();
  return null;
}

function errorResponse(
  set: any,
  status: number,
  message: string,
  code: string,
  type = "invalid_request_error"
) {
  set.status = status;
  return { error: { message, type, code } };
}

async function authenticateRequest(request: Request, set: any) {
  const key = getProvidedKey(request);
  if (!key) {
    return {
      error: errorResponse(
        set,
        401,
        "Missing API key. Pass your Neko-Router key via 'Authorization: Bearer <key>' or 'x-api-key: <key>'.",
        "invalid_api_key"
      ),
    };
  }

  const clientKey = await validateClientKey(key);
  if (!clientKey) {
    return {
      error: errorResponse(
        set,
        401,
        "Invalid or inactive Neko-Router API key.",
        "invalid_api_key"
      ),
    };
  }

  if (clientKey.rateLimit && !checkClientRateLimit(clientKey.id, clientKey.rateLimit)) {
    return {
      error: errorResponse(
        set,
        429,
        `Rate limit exceeded. Key is restricted to ${clientKey.rateLimit} requests per minute.`,
        "rate_limit_exceeded",
        "rate_limit_error"
      ),
    };
  }

  return { clientKey };
}

async function runSearch(
  query: string | undefined,
  maxResults: number | undefined,
  set: any,
  clientKey: any
) {
  const startedAt = Date.now();

  if (!query || !query.trim()) {
    recordToolTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      toolType: "search",
      query: query ?? null,
      statusCode: 400,
      durationMs: Math.max(1, Date.now() - startedAt),
      errorMessage: "Query parameter 'query' is required.",
    });
    return errorResponse(set, 400, "Query parameter 'query' is required.", "missing_query");
  }

  try {
    const result = await searchDuckDuckGo(query, maxResults ?? 5);
    recordToolTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      toolType: "search",
      provider: result.provider,
      query: result.query,
      statusCode: 200,
      durationMs: Math.max(1, Date.now() - startedAt),
      resultCount: result.count,
    });
    return result;
  } catch (error: any) {
    const message = error?.message || "Failed to search the web.";
    recordToolTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      toolType: "search",
      query: query.trim(),
      statusCode: 502,
      durationMs: Math.max(1, Date.now() - startedAt),
      errorMessage: message,
    });
    return errorResponse(set, 502, message, "search_failed", "upstream_error");
  }
}

async function runFetch(
  url: string | undefined,
  maxChars: number | undefined,
  set: any,
  clientKey: any
) {
  const startedAt = Date.now();

  if (!url || !url.trim()) {
    recordToolTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      toolType: "fetch",
      url: url ?? null,
      statusCode: 400,
      durationMs: Math.max(1, Date.now() - startedAt),
      errorMessage: "Parameter 'url' is required.",
    });
    return errorResponse(set, 400, "Parameter 'url' is required.", "missing_url");
  }

  try {
    const result = await fetchWebPage(url, maxChars ?? 12000);
    recordToolTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      toolType: "fetch",
      url: result.url,
      statusCode: 200,
      durationMs: Math.max(1, Date.now() - startedAt),
      contentLength: result.content.length,
    });
    return result;
  } catch (error: any) {
    const message = error?.message || "Failed to fetch the requested URL.";
    recordToolTelemetry({
      clientKeyId: clientKey?.id,
      clientKeyName: clientKey?.name,
      toolType: "fetch",
      url: url.trim(),
      statusCode: 502,
      durationMs: Math.max(1, Date.now() - startedAt),
      errorMessage: message,
    });
    return errorResponse(set, 502, message, "fetch_failed", "upstream_error");
  }
}

export const toolsRoutes = new Elysia()
  .onBeforeHandle(({ request }) => {
    const httpsErr = checkHttpsRequirement(request);
    if (httpsErr) return httpsErr;
  })
  .post(
    "/v1/tools/search",
    async ({ body, request, set }) => {
      const auth = await authenticateRequest(request, set);
      if ("error" in auth) return auth.error;

      return runSearch(body.query, body.maxResults, set, auth.clientKey);
    },
    {
      body: t.Object({
        query: t.String({ minLength: 1 }),
        maxResults: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
      }),
      detail: {
        tags: ["Tools"],
        summary: "Search the web using a randomized multi-engine pool",
        description:
          "Returns a list of { title, url, snippet } results. Requires a valid client API key.",
      },
    }
  )
  .get(
    "/v1/tools/search",
    async ({ query, request, set }) => {
      const auth = await authenticateRequest(request, set);
      if ("error" in auth) return auth.error;

      const maxResults = query.maxResults ? Number(query.maxResults) : undefined;
      return runSearch(query.q ?? query.query, maxResults, set, auth.clientKey);
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        query: t.Optional(t.String()),
        maxResults: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Tools"],
        summary: "Search the web using a randomized multi-engine pool (GET alias)",
        description:
          "GET alias for /v1/tools/search. Example: /v1/tools/search?q=bun+elysia&maxResults=5",
      },
    }
  )
  .post(
    "/v1/tools/fetch",
    async ({ body, request, set }) => {
      const auth = await authenticateRequest(request, set);
      if ("error" in auth) return auth.error;

      return runFetch(body.url, body.maxChars, set, auth.clientKey);
    },
    {
      body: t.Object({
        url: t.String({ minLength: 1 }),
        maxChars: t.Optional(t.Number({ minimum: 500, maximum: 100000 })),
      }),
      detail: {
        tags: ["Tools"],
        summary: "Fetch and extract readable content from a URL",
        description:
          "Retrieves a URL, follows redirects, and extracts readable text from HTML, JSON, XML, or plain text. Private/internal hosts are blocked by default (set TOOLS_ALLOW_PRIVATE_HOSTS=1 to override). Requires a valid client API key.",
      },
    }
  )
  .get(
    "/v1/tools/fetch",
    async ({ query, request, set }) => {
      const auth = await authenticateRequest(request, set);
      if ("error" in auth) return auth.error;

      const maxChars = query.maxChars ? Number(query.maxChars) : undefined;
      return runFetch(query.url, maxChars, set, auth.clientKey);
    },
    {
      query: t.Object({
        url: t.Optional(t.String()),
        maxChars: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Tools"],
        summary: "Fetch and extract web content (GET alias)",
        description:
          "GET alias for /v1/tools/fetch. Example: /v1/tools/fetch?url=https://example.com&maxChars=12000",
      },
    }
  );
