import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_TIMEOUT = 20000;
const DEFAULT_MAX_CONTENT_LENGTH = 12000;
const MAX_CONTENT_LENGTH_CAP = 100000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

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
  provider: "duckduckgo";
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
    const parsed = new URL(href, "https://lite.duckduckgo.com");
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
      provider: "duckduckgo",
      query: trimmedQuery,
      results: [],
      count: 0,
    };
  }

  const response = await fetchWithTimeout("https://lite.duckduckgo.com/lite/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": LYNX_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    },
    body: new URLSearchParams({ q: trimmedQuery }).toString(),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo responded with HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: WebSearchResult[] = [];

  $("a.result-link").each((_index, element) => {
    if (results.length >= limit) return false;

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

  return {
    provider: "duckduckgo",
    query: trimmedQuery,
    results,
    count: results.length,
  };
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
  main.find("h1, h2, h3, h4, h5, p, li, blockquote, pre, code").each((_i, element) => {
    const tag = element.tagName.toLowerCase();
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (text.length <= 5) return;

    if (tag.startsWith("h")) {
      lines.push(`\n### ${text}\n`);
    } else if (tag === "li") {
      lines.push(`- ${text}`);
    } else {
      lines.push(text);
    }
  });

  let cleanText = lines.join("\n\n");
  if (!cleanText || cleanText.length < 50) {
    cleanText = $("body")
      .text()
      .replace(/\n\s*\n+/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  const truncated = cleanText.length > maxChars;
  if (truncated) {
    cleanText = `${cleanText.slice(0, maxChars)}\n... (content truncated)`;
  }

  return {
    title,
    content: cleanText || "(Page has no readable text)",
    truncated,
  };
}

export async function fetchWebPage(
  input: string,
  maxChars = DEFAULT_MAX_CONTENT_LENGTH
): Promise<WebFetchResult> {
  const limit = Math.min(
    Math.max(Math.floor(Number(maxChars) || DEFAULT_MAX_CONTENT_LENGTH), 500),
    MAX_CONTENT_LENGTH_CAP
  );

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
  const textResult = await readTextLimited(response, MAX_RESPONSE_BYTES, contentType);
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
