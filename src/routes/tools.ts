import { Elysia, t } from "elysia";
import { checkClientRateLimit, validateClientKey } from "../services/auth";
import { checkHttpsRequirement } from "../services/optimizer";
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

async function runSearch(query: string | undefined, maxResults: number | undefined, set: any) {
  if (!query || !query.trim()) {
    return errorResponse(set, 400, "Query parameter 'query' is required.", "missing_query");
  }

  try {
    return await searchDuckDuckGo(query, maxResults ?? 5);
  } catch (error: any) {
    return errorResponse(
      set,
      502,
      error?.message || "Failed to search DuckDuckGo.",
      "search_failed",
      "upstream_error"
    );
  }
}

async function runFetch(url: string | undefined, maxChars: number | undefined, set: any) {
  if (!url || !url.trim()) {
    return errorResponse(set, 400, "Parameter 'url' is required.", "missing_url");
  }

  try {
    return await fetchWebPage(url, maxChars ?? 12000);
  } catch (error: any) {
    return errorResponse(
      set,
      502,
      error?.message || "Failed to fetch the requested URL.",
      "fetch_failed",
      "upstream_error"
    );
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

      return runSearch(body.query, body.maxResults, set);
    },
    {
      body: t.Object({
        query: t.String({ minLength: 1 }),
        maxResults: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
      }),
      detail: {
        tags: ["Tools"],
        summary: "Search the web using DuckDuckGo",
        description:
          "Scrapes DuckDuckGo Lite and returns a list of { title, url, snippet } results. Requires a valid client API key.",
      },
    }
  )
  .get(
    "/v1/tools/search",
    async ({ query, request, set }) => {
      const auth = await authenticateRequest(request, set);
      if ("error" in auth) return auth.error;

      const maxResults = query.maxResults ? Number(query.maxResults) : undefined;
      return runSearch(query.q ?? query.query, maxResults, set);
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        query: t.Optional(t.String()),
        maxResults: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Tools"],
        summary: "Search the web using DuckDuckGo (GET alias)",
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

      return runFetch(body.url, body.maxChars, set);
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
      return runFetch(query.url, maxChars, set);
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
