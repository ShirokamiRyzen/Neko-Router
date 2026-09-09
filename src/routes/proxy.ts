import { Elysia } from "elysia";
import os from "os";
import { validateClientKey } from "../services/auth";
import {
  proxyOpenAIChatCompletions,
  proxyAnthropicMessages,
  proxyOpenAIModels,
} from "../services/proxy";
import { checkHttpsRequirement } from "../services/optimizer";

const MOTIVATIONAL_QUOTES = [
  { quote: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { quote: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
  { quote: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { quote: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { quote: "Bukan karena mudah kita berani, tapi karena kita berani maka semuanya menjadi mungkin.", author: "Seneca" },
  { quote: "Jangan takut melangkah perlahan, takutlah jika hanya berdiam diri.", author: "Pepatah" },
  { quote: "Disiplin dan konsistensi adalah jembatan antara impian dan pencapaian.", author: "Jim Rohn" },
  { quote: "Tetap tenang, berpikir jernih, dan selesaikan tantangan baris demi baris.", author: "NekoRouter" },
  { quote: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { quote: "Kualitas bukanlah suatu aksi tunggal, melainkan sebuah kebiasaan berkelanjutan.", author: "Aristotle" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Bekerjalah dalam hening, biarkan performa dan hasil karyamu yang bersuara.", author: "Frank Ocean" },
  { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { quote: "Perjalanan seribu mil selalu dimulai dari satu langkah pertama.", author: "Lao Tzu" },
  { quote: "Everything seems impossible until it's done.", author: "Nelson Mandela" },
  { quote: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { quote: "Code never lies, comments sometimes do.", author: "Ron Jeffries" },
  { quote: "Iterate fast, stay focused, and ship with confidence.", author: "NekoRouter" },
  { quote: "Usaha dan doa tidak pernah mengkhianati hasil.", author: "Anonim" },
  { quote: "Tantangan adalah apa yang membuat hidup menarik; mengatasinya adalah apa yang membuat hidup bermakna.", author: "Joshua J. Marine" },
  { quote: "Write clean code, build reliable systems, and keep pushing forward.", author: "NekoRouter" },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unitIndex = Math.min(Math.max(i, 0), units.length - 1);
  const val = bytes / Math.pow(1024, unitIndex);
  return `${parseFloat(val.toFixed(2))} ${units[unitIndex]}`;
}

function formatUptime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0s";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

const AVAILABLE_ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/chat/completions",
    auth: "Bearer <client_key> or x-api-key: <client_key>",
    description: "OpenAI-compatible Chat Completions API with streaming, prompt caching, failover routing, and token telemetry.",
  },
  {
    method: "POST",
    path: "/v1/messages",
    auth: "x-api-key: <client_key> or Bearer <client_key>",
    description: "Anthropic-compatible Messages API with full streaming and thinking protocol support.",
  },
  {
    method: "GET",
    path: "/v1/models",
    auth: "Public / Optional Client Key",
    description: "List all active AI models across connected upstream providers in OpenAI format.",
  },
  {
    method: "GET",
    path: "/models",
    auth: "Public / Optional Client Key",
    description: "Standard OpenAI alias for /v1/models.",
  },
  {
    method: "GET",
    path: "/health",
    auth: "Public",
    description: "Healthcheck probe returning gateway status and timestamp.",
  },
  {
    method: "GET",
    path: "/swagger",
    auth: "Public",
    description: "Interactive OpenAPI / Swagger UI test console and API documentation.",
  },
  {
    method: "GET",
    path: "/v1",
    auth: "Public",
    description: "Gateway system diagnostics, hardware specifications, uptime, and endpoint directory.",
  },
];

function getV1Directory() {
  const uptimeSec = Math.floor(process.uptime());
  const mem = process.memoryUsage();
  const cpus = os.cpus();
  const randomMotivation = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

  return {
    status: "online",
    gateway: "Neko-Router",
    version: "1.0.0",
    motivation: randomMotivation,
    server: {
      runtime: `Bun v${Bun.version}`,
      platform: `${os.platform()} (${os.arch()})`,
      os: `${os.type()} ${os.release()}`,
      cpus: {
        model: cpus[0]?.model || "Unknown",
        cores: cpus.length,
      },
      memory: {
        rss: formatBytes(mem.rss),
        heap_used: formatBytes(mem.heapUsed),
        heap_total: formatBytes(mem.heapTotal),
        system_total_ram: formatBytes(os.totalmem()),
        system_free_ram: formatBytes(os.freemem()),
      },
      uptime: formatUptime(uptimeSec),
      uptime_seconds: uptimeSec,
      timestamp: new Date().toISOString(),
    },
    endpoints: AVAILABLE_ENDPOINTS,
  };
}

export const proxyRoutes = new Elysia()
  .onBeforeHandle(({ request }) => {
    const httpsErr = checkHttpsRequirement(request);
    if (httpsErr) return httpsErr;
  })
  // Root /v1 Directory & Diagnostics
  .get("/v1", () => getV1Directory(), {
    detail: {
      tags: ["Proxy"],
      summary: "Gateway specifications, uptime & route directory",
      description: "Returns server hardware specifications, uptime, dynamic motivation, and available endpoints.",
    },
  })
  .get("/v1/", () => getV1Directory(), {
    detail: {
      tags: ["Proxy"],
      summary: "Gateway specifications, uptime & route directory",
      description: "Returns server hardware specifications, uptime, dynamic motivation, and available endpoints.",
    },
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

    return proxyOpenAIChatCompletions(request.headers, body, clientKey, request.signal);
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

    return proxyAnthropicMessages(request.headers, body, clientKey, request.signal);
  });
