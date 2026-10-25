import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { search as duckDuckScrapeSearch, SafeSearchType } from "duck-duck-scrape";

const DEFAULT_TIMEOUT = 20000;
const DEFAULT_MAX_CONTENT_LENGTH = 12000;
const MAX_CONTENT_LENGTH_CAP = 100000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MIN_RESPONSE_BYTES = 512 * 1024;
const MAX_REDIRECTS = 5;

const FETCH_CACHE_TTL_MS = 3 * 60 * 1000;
const FETCH_CACHE_MAX_ENTRIES = 100;

const LYNX_UA =
  "Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/1.0.2k-fips";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  provider: string;
  query: string;
  results: WebSearchResult[];
  count: number;
}

export interface WebFetchResult {
  url: string;
  contentType: string;
  title?: string;
  content: string;
  truncated: boolean;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function unwrapDuckDuckGoUrl(href?: string): string | null {
  if (!href) return null;
  try {
    const parsed = new URL(href, "https://duckduckgo.com");
    const realUrl = parsed.searchParams.get("uddg");
    if (realUrl) return decodeURIComponent(realUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (e) {
    return null;
  }
  return null;
}

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 200;

interface SearchCacheEntry {
  expiresAt: number;
  provider: string;
  results: WebSearchResult[];
}

interface EngineGroupState {
  chain: Promise<unknown>;
  lastRequestAt: number;
  cooldownUntil: number;
}

const searchCache = new Map<string, SearchCacheEntry>();
const engineGroups = new Map<string, EngineGroupState>();
const inFlightSearches = new Map<
  string,
  Promise<{ provider: string; results: WebSearchResult[] }>
>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSearchCacheKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function getCachedSearch(key: string): SearchCacheEntry | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  return entry;
}

function setCachedSearch(
  key: string,
  provider: string,
  results: WebSearchResult[]
): void {
  if (results.length === 0) return;
  if (searchCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    provider,
    results,
  });
}

function getEngineGroupState(group: string): EngineGroupState {
  let state = engineGroups.get(group);
  if (!state) {
    state = { chain: Promise.resolve(), lastRequestAt: 0, cooldownUntil: 0 };
    engineGroups.set(group, state);
  }
  return state;
}

function isEngineCoolingDown(engine: SearchEngine): boolean {
  return getEngineGroupState(engine.group).cooldownUntil > Date.now();
}

function markEngineCooldown(engine: SearchEngine, retryAfterMs: number): void {
  const state = getEngineGroupState(engine.group);
  state.cooldownUntil = Math.max(state.cooldownUntil, Date.now() + retryAfterMs);
}

function clearEngineCooldown(engine: SearchEngine): void {
  getEngineGroupState(engine.group).cooldownUntil = 0;
}

function withEngineSlot<T>(
  engine: SearchEngine,
  fn: () => Promise<T>
): Promise<T> {
  const state = getEngineGroupState(engine.group);
  const run = state.chain.then(async () => {
    const waitUntil = Math.max(
      state.lastRequestAt + engine.minIntervalMs,
      state.cooldownUntil
    );
    const waitMs = waitUntil - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    try {
      return await fn();
    } finally {
      state.lastRequestAt = Date.now();
    }
  });
  state.chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function getSearchHeaders(): Record<string, string> {
  return {
    "User-Agent": LYNX_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: "https://lite.duckduckgo.com/lite/",
    DNT: "1",
    Connection: "keep-alive",
  };
}

async function fetchDuckDuckGoLite(query: string): Promise<Response> {
  const url = new URL("https://lite.duckduckgo.com/lite/");
  url.searchParams.set("q", query);
  url.searchParams.set("kl", "wt-wt");
  return fetchWithTimeout(
    url.toString(),
    { method: "GET", headers: getSearchHeaders() },
    15000
  );
}

async function fetchDuckDuckGoHtml(query: string): Promise<Response> {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  url.searchParams.set("kl", "wt-wt");
  return fetchWithTimeout(
    url.toString(),
    { method: "GET", headers: getSearchHeaders() },
    15000
  );
}

function parseDuckDuckGoLite(html: string): WebSearchResult[] {
  const $ = cheerio.load(html);
  const results: WebSearchResult[] = [];

  $("a.result-link").each((_index, element) => {
    const title = $(element).text().replace(/\s+/g, " ").trim();
    const url = unwrapDuckDuckGoUrl($(element).attr("href"));
    if (!title || !url) return;

    const row = $(element).closest("tr");
    let snippet = row.find(".result-snippet").text().replace(/\s+/g, " ").trim();
    if (!snippet) {
      snippet = row
        .next()
        .find(".result-snippet")
        .text()
        .replace(/\s+/g, " ")
        .trim();
    }
    if (!snippet) {
      snippet = row.next().text().replace(/\s+/g, " ").trim();
    }

    results.push({ title, url, snippet });
  });

  return results;
}

function parseDuckDuckGoHtml(html: string): WebSearchResult[] {
  const $ = cheerio.load(html);
  const results: WebSearchResult[] = [];

  $("a.result__a").each((_index, element) => {
    const title = $(element).text().replace(/\s+/g, " ").trim();
    const url = unwrapDuckDuckGoUrl($(element).attr("href"));
    if (!title || !url) return;

    const container = $(element).closest(".result");
    let snippet = container
      .find(".result__snippet")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (!snippet) {
      snippet = $(element)
        .closest(".result__body")
        .find(".result__snippet")
        .text()
        .replace(/\s+/g, " ")
        .trim();
    }

    results.push({ title, url, snippet });
  });

  return results;
}

class SearchRateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs = 60000) {
    super(message);
    this.name = "SearchRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  rsquo: "\u2019",
  lsquo: "\u2018",
  ldquo: "\u201c",
  rdquo: "\u201d",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(
        isHex ? entity.slice(2) : entity.slice(1),
        isHex ? 16 : 10
      );
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return match;
    }
    return HTML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function cleanHtmlText(text: string): string {
  if (!text) return "";
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function getBrowserHeaders(referer: string): Record<string, string> {
  return {
    "User-Agent": BROWSER_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: referer,
    DNT: "1",
    Connection: "keep-alive",
  };
}

function looksLikeSearchChallenge(status: number, html: string): boolean {
  if (status === 202 || status === 403 || status === 429) return true;
  return /anubis_challenge|challenge-form|anomaly-modal|unusual traffic|g-recaptcha|h-captcha|id=["']captcha["']/i.test(
    html
  );
}

function looksLikeDuckDuckGoChallenge(status: number, html: string): boolean {
  if (status === 202 || status === 403 || status === 429) return true;
  return /anomaly-modal|challenge-form|bots use DuckDuckGo|id=["']captcha["']/i.test(
    html
  );
}

function unwrapYahooUrl(href?: string): string | null {
  if (!href) return null;
  try {
    const ruMatch = href.match(/\/RU=([^/]+)/i);
    if (ruMatch?.[1]) {
      return decodeURIComponent(ruMatch[1]);
    }

    const parsed = new URL(href, "https://search.yahoo.com");
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function searchYahoo(
  query: string,
  limit: number
): Promise<WebSearchResult[]> {
  const url = new URL("https://search.yahoo.com/search");
  url.searchParams.set("p", query);
  url.searchParams.set("fr2", "p:s,v:w,m:sa:all");

  const response = await fetchWithTimeout(
    url.toString(),
    { headers: getBrowserHeaders("https://search.yahoo.com/") },
    15000
  );
  const html = await response.text();

  if (looksLikeSearchChallenge(response.status, html)) {
    throw new SearchRateLimitError(`Yahoo HTTP ${response.status}`, 30000);
  }
  if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);

  const $ = cheerio.load(html);
  const results: WebSearchResult[] = [];

  $(".algo").each((_index, element) => {
    if (results.length >= limit) return false;

    let anchor = $(element).find("h3 a[href]").first();
    if (anchor.length === 0) anchor = $(element).find("a[href]").first();

    const target = unwrapYahooUrl(anchor.attr("href"));
    const title = $(element)
      .find("h3")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (!target || !title) return;

    const snippet = $(element)
      .find(".compText")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    results.push({ title, url: target, snippet });
  });

  return results;
}

async function searchDuckDuckGoLite(
  query: string,
  limit: number
): Promise<WebSearchResult[]> {
  const response = await fetchDuckDuckGoLite(query);
  const html = await response.text();

  if (looksLikeDuckDuckGoChallenge(response.status, html)) {
    throw new SearchRateLimitError(
      `DuckDuckGo Lite HTTP ${response.status}`,
      30000
    );
  }
  if (!response.ok) throw new Error(`DuckDuckGo Lite HTTP ${response.status}`);

  return parseDuckDuckGoLite(html).slice(0, limit);
}

async function searchDuckDuckGoHtml(
  query: string,
  limit: number
): Promise<WebSearchResult[]> {
  const response = await fetchDuckDuckGoHtml(query);
  const html = await response.text();

  if (looksLikeDuckDuckGoChallenge(response.status, html)) {
    throw new SearchRateLimitError(
      `DuckDuckGo HTML HTTP ${response.status}`,
      30000
    );
  }
  if (!response.ok) throw new Error(`DuckDuckGo HTML HTTP ${response.status}`);

  return parseDuckDuckGoHtml(html).slice(0, limit);
}

async function searchDuckDuckGoScrape(
  query: string,
  limit: number
): Promise<WebSearchResult[]> {
  try {
    const data = await duckDuckScrapeSearch(
      query,
      {
        safeSearch: SafeSearchType.MODERATE,
        region: "wt-wt",
      },
      { timeout: 15000 }
    );

    if (data.noResults || !Array.isArray(data.results)) return [];

    return data.results
      .slice(0, limit)
      .map((result) => ({
        title: cleanHtmlText(result.title || ""),
        url: result.url || "",
        snippet: cleanHtmlText(
          result.description || result.rawDescription || ""
        ),
      }))
      .filter((result) => result.title && result.url);
  } catch (error: any) {
    if (/anomaly|too quickly|rate limit/i.test(error?.message || "")) {
      throw new SearchRateLimitError(
        `DuckDuckGo Scrape: ${error.message}`,
        30000
      );
    }
    throw error;
  }
}

interface SearchEngine {
  name: string;
  group: string;
  minIntervalMs: number;
  cooldownMs: number;
  search: (query: string, limit: number) => Promise<WebSearchResult[]>;
}

const SEARCH_ENGINES: SearchEngine[] = [
  {
    name: "yahoo",
    group: "yahoo",
    minIntervalMs: 1000,
    cooldownMs: 30000,
    search: searchYahoo,
  },
  {
    name: "duckduckgo-lite",
    group: "duckduckgo",
    minIntervalMs: 1000,
    cooldownMs: 30000,
    search: searchDuckDuckGoLite,
  },
  {
    name: "duckduckgo-html",
    group: "duckduckgo",
    minIntervalMs: 1000,
    cooldownMs: 30000,
    search: searchDuckDuckGoHtml,
  },
  {
    name: "duckduckgo-scrape",
    group: "duckduckgo-scrape",
    minIntervalMs: 1000,
    cooldownMs: 60000,
    search: searchDuckDuckGoScrape,
  },
];

// Launch the next engine group shortly after the previous one if it has not
// answered yet. This keeps the common case (first engine succeeds) at one
// request while avoiding multi-second waits on a slow/blocked engine.
const SEARCH_ENGINE_STAGGER_MS = 600;
const SEARCH_DEADLINE_MS = 15000;

function runEnginePool(
  query: string,
  cacheKey: string
): Promise<{ provider: string; results: WebSearchResult[] }> {
  const engines = shuffle(SEARCH_ENGINES);

  return new Promise((resolve, reject) => {
    let settled = false;
    let launched = 0;
    let pending = 0;
    let hadValidResponse = false;
    let lastValidProvider = "none";
    const errors: string[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    const clearTimers = () => {
      while (timers.length > 0) {
        const timer = timers.pop();
        if (timer) clearTimeout(timer);
      }
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimers();
      fn();
    };

    const maybeFinish = () => {
      if (settled || launched < engines.length || pending > 0) return;
      finish(() => {
        if (hadValidResponse) {
          resolve({ provider: lastValidProvider, results: [] });
          return;
        }
        reject(new Error(`All search engines failed (${errors.join("; ")})`));
      });
    };

    const launch = (engine: SearchEngine) => {
      if (settled) return;
      launched += 1;

      if (isEngineCoolingDown(engine)) {
        errors.push(`${engine.name}: cooling down`);
        maybeFinish();
        return;
      }

      pending += 1;
      withEngineSlot(engine, () => engine.search(query, 20))
        .then((results) => {
          hadValidResponse = true;
          lastValidProvider = engine.name;

          if (results.length > 0) {
            clearEngineCooldown(engine);
            setCachedSearch(cacheKey, engine.name, results);
            finish(() => resolve({ provider: engine.name, results }));
          } else {
            errors.push(`${engine.name}: no results`);
          }
        })
        .catch((error: any) => {
          if (error instanceof SearchRateLimitError) {
            markEngineCooldown(engine, error.retryAfterMs || engine.cooldownMs);
          }
          errors.push(`${engine.name}: ${error?.message || "request failed"}`);
        })
        .finally(() => {
          pending -= 1;
          maybeFinish();
        });
    };

    timers.push(
      setTimeout(() => {
        finish(() => {
          if (hadValidResponse) {
            resolve({ provider: lastValidProvider, results: [] });
            return;
          }
          reject(
            new Error(
              `Search timed out after ${SEARCH_DEADLINE_MS}ms (${errors.join("; ") || "no engine responded"})`
            )
          );
        });
      }, SEARCH_DEADLINE_MS)
    );

    engines.forEach((engine, index) => {
      if (index === 0) {
        launch(engine);
        return;
      }
      timers.push(
        setTimeout(() => launch(engine), index * SEARCH_ENGINE_STAGGER_MS)
      );
    });

    maybeFinish();
  });
}

export async function searchDuckDuckGo(
  query: string,
  maxResults = 5
): Promise<WebSearchResponse> {
  if (!query || typeof query !== "string") {
    throw new Error("Search query must be a non-empty string");
  }

  const trimmedQuery = query.trim();
  const limit = Math.min(Math.max(Math.floor(Number(maxResults) || 5), 1), 20);
  if (!trimmedQuery) {
    return {
      provider: "none",
      query: trimmedQuery,
      results: [],
      count: 0,
    };
  }

  const cacheKey = getSearchCacheKey(trimmedQuery);
  const cached = getCachedSearch(cacheKey);
  if (cached) {
    const results = cached.results.slice(0, limit);
    return {
      provider: cached.provider,
      query: trimmedQuery,
      results,
      count: results.length,
    };
  }

  const existingSearch = inFlightSearches.get(cacheKey);
  if (existingSearch) {
    const { provider, results } = await existingSearch;
    const limited = results.slice(0, limit);
    return {
      provider,
      query: trimmedQuery,
      results: limited,
      count: limited.length,
    };
  }

  const searchPromise = runEnginePool(trimmedQuery, cacheKey);

  inFlightSearches.set(cacheKey, searchPromise);
  try {
    const { provider, results } = await searchPromise;
    const limited = results.slice(0, limit);
    return {
      provider,
      query: trimmedQuery,
      results: limited,
      count: limited.length,
    };
  } finally {
    inFlightSearches.delete(cacheKey);
  }
}

function normalizeTargetUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("URL must be a non-empty string");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isPrivateIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const parts = address.split(".").map((part) => Number(part));
    const [a, b] = parts;
    if (a === undefined || b === undefined) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80")
    );
  }
  return false;
}

async function assertPublicUrl(urlString: string): Promise<void> {
  if (process.env.TOOLS_ALLOW_PRIVATE_HOSTS === "1") return;

  const url = new URL(urlString);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const unbracketed = hostname.replace(/^\[/, "").replace(/\]$/, "");

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("Private or internal hostnames are not allowed");
  }

  if (isIP(unbracketed)) {
    if (isPrivateIp(unbracketed)) {
      throw new Error("Private or internal IP addresses are not allowed");
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch (e) {
    throw new Error(`Unable to resolve hostname: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new Error(`Unable to resolve hostname: ${hostname}`);
  }

  if (addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Private or internal IP addresses are not allowed");
  }
}

function getCharset(contentType: string): string {
  const match = /charset\s*=\s*"?([^";\s]+)"?/i.exec(contentType);
  return match?.[1]?.toLowerCase() || "utf-8";
}

async function readTextLimited(
  response: Response,
  maxBytes: number,
  contentType: string
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    return { text: await response.text(), truncated: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      if (total + value.byteLength > maxBytes) {
        chunks.push(value.slice(0, maxBytes - total));
        total = maxBytes;
        truncated = true;
        await reader.cancel().catch(() => {});
        break;
      }

      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder(getCharset(contentType)).decode(merged);
  } catch (e) {
    text = new TextDecoder("utf-8").decode(merged);
  }

  return { text, truncated };
}

function isTextualContentType(contentType: string): boolean {
  const type = contentType.toLowerCase();
  return (
    type.startsWith("text/") ||
    type.includes("json") ||
    type.includes("xml") ||
    type.includes("javascript") ||
    type.includes("x-www-form-urlencoded") ||
    type.includes("graphql")
  );
}

function extractReadableHtml(
  html: string,
  maxChars: number
): { title: string; content: string; truncated: boolean } {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe, canvas, nav, footer, header, form, link, meta").remove();

  const title =
    $("title").text().replace(/\s+/g, " ").trim() ||
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    "Untitled Page";

  let main = $('article, main, [role="main"]');
  if (main.length === 0) main = $("body");

  main
    .find('[style*="display:none"], [style*="display: none"], .hidden, .hide')
    .remove();

  const lines: string[] = [];
  const softCap = maxChars + Math.max(2000, Math.floor(maxChars * 0.5));
  let collected = 0;
  let limitReached = false;

  main.find("h1, h2, h3, h4, h5, p, li, blockquote, pre, code").each((_i, element) => {
    if (collected >= softCap) {
      limitReached = true;
      return false;
    }

    const tag = element.tagName.toLowerCase();
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (text.length <= 5) return;

    if (tag.startsWith("h")) {
      lines.push(`\n### ${text}\n`);
      collected += text.length + 6;
    } else if (tag === "li") {
      lines.push(`- ${text}`);
      collected += text.length + 3;
    } else {
      lines.push(text);
      collected += text.length + 2;
    }
  });

  let cleanText = lines.join("\n\n");
  if (!cleanText || cleanText.length < 50) {
    const bodyText = $("body").text();
    const cappedBody =
      bodyText.length > maxChars * 4 ? bodyText.slice(0, maxChars * 4) : bodyText;
    cleanText = cappedBody
      .replace(/\n\s*\n+/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  const truncated = limitReached || cleanText.length > maxChars;
  if (truncated) {
    cleanText = `${cleanText.slice(0, maxChars)}\n... (content truncated)`;
  }

  return {
    title,
    content: cleanText || "(Page has no readable text)",
    truncated,
  };
}

interface FetchCacheEntry {
  expiresAt: number;
  result: WebFetchResult;
}

const fetchCache = new Map<string, FetchCacheEntry>();
const inFlightFetches = new Map<string, Promise<WebFetchResult>>();

function getFetchCacheKey(url: string, limit: number): string {
  return `${url}\u0000${limit}`;
}

function getCachedFetch(key: string): WebFetchResult | null {
  const entry = fetchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    fetchCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedFetch(key: string, result: WebFetchResult): void {
  if (fetchCache.size >= FETCH_CACHE_MAX_ENTRIES) {
    const oldestKey = fetchCache.keys().next().value;
    if (oldestKey) fetchCache.delete(oldestKey);
  }
  fetchCache.set(key, {
    expiresAt: Date.now() + FETCH_CACHE_TTL_MS,
    result,
  });
}

function getResponseByteCap(limit: number, contentType: string): number {
  // JSON/XML are parsed as a whole, so keep the full cap. HTML/plain text only
  // need enough bytes to produce `limit` characters; downloading the entire
  // multi-megabyte body just to slice it is what made large pages feel slow.
  if (/json/i.test(contentType) || /(?:application|text)\/xml/i.test(contentType)) {
    return MAX_RESPONSE_BYTES;
  }
  return Math.min(
    MAX_RESPONSE_BYTES,
    Math.max(MIN_RESPONSE_BYTES, limit * 16 + 64 * 1024)
  );
}

export async function fetchWebPage(
  input: string,
  maxChars = DEFAULT_MAX_CONTENT_LENGTH
): Promise<WebFetchResult> {
  const limit = Math.min(
    Math.max(Math.floor(Number(maxChars) || DEFAULT_MAX_CONTENT_LENGTH), 500),
    MAX_CONTENT_LENGTH_CAP
  );

  const cacheKey = getFetchCacheKey(normalizeTargetUrl(input), limit);
  const cached = getCachedFetch(cacheKey);
  if (cached) return { ...cached };

  const existingFetch = inFlightFetches.get(cacheKey);
  if (existingFetch) return { ...(await existingFetch) };

  const fetchPromise = fetchWebPageUncached(input, limit);
  inFlightFetches.set(cacheKey, fetchPromise);
  try {
    const result = await fetchPromise;
    setCachedFetch(cacheKey, result);
    return { ...result };
  } finally {
    inFlightFetches.delete(cacheKey);
  }
}

async function fetchWebPageUncached(
  input: string,
  limit: number
): Promise<WebFetchResult> {
  let targetUrl = normalizeTargetUrl(input);
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await assertPublicUrl(targetUrl);

    response = await fetchWithTimeout(targetUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/json,text/plain",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "manual",
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) break;

    const location = response.headers.get("location");
    if (!location) break;

    await response.body?.cancel().catch(() => {});
    targetUrl = new URL(location, targetUrl).toString();
  }

  if (!response) {
    throw new Error("Failed to fetch the requested URL");
  }

  if (response.status >= 300 && response.status < 400) {
    throw new Error(`Too many redirects (max: ${MAX_REDIRECTS})`);
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(
      `Request failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`
    );
  }

  const contentType = response.headers.get("content-type") || "text/plain";
  const textResult = await readTextLimited(
    response,
    getResponseByteCap(limit, contentType),
    contentType
  );
  const rawData = textResult.text;
  const byteTruncated = textResult.truncated;

  if (
    /application\/json/i.test(contentType) ||
    (typeof rawData === "string" &&
      (rawData.trim().startsWith("{") || rawData.trim().startsWith("[")))
  ) {
    try {
      const parsed = JSON.parse(rawData);
      const formatted = JSON.stringify(parsed, null, 2);
      const truncated = byteTruncated || formatted.length > limit;
      return {
        url: targetUrl,
        contentType: "application/json",
        content: truncated ? `${formatted.slice(0, limit)}\n... (content truncated)` : formatted,
        truncated,
      };
    } catch (e) {
      // Not valid JSON, continue as another format.
    }
  }

  if (/application\/xml|text\/xml/i.test(contentType)) {
    const $ = cheerio.load(rawData, { xmlMode: true });
    const textContent = $.text().replace(/\s+/g, " ").trim();
    const truncated = byteTruncated || textContent.length > limit;
    return {
      url: targetUrl,
      contentType: "application/xml",
      content: truncated ? `${textContent.slice(0, limit)}\n... (content truncated)` : textContent,
      truncated,
    };
  }

  if (/text\/html/i.test(contentType) || /<html/i.test(rawData)) {
    const extracted = extractReadableHtml(rawData, limit);
    return {
      url: targetUrl,
      contentType: "text/html",
      title: extracted.title,
      content: extracted.content,
      truncated: byteTruncated || extracted.truncated,
    };
  }

  if (!isTextualContentType(contentType)) {
    return {
      url: targetUrl,
      contentType,
      content: "",
      truncated: byteTruncated,
    };
  }

  const truncated = byteTruncated || rawData.length > limit;
  return {
    url: targetUrl,
    contentType: contentType || "text/plain",
    content: truncated ? `${rawData.slice(0, limit)}\n... (content truncated)` : rawData,
    truncated,
  };
}
