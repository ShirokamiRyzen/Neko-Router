# Neko-Router

High-performance, ultra-low overhead headless AI Gateway & Router designed for OpenAI and Anthropic compatible endpoints, built with **Bun**, **ElysiaJS**, native `bun:sqlite` with **Drizzle ORM** (WAL mode), with native **Elysia Eden** type-safe RPC client support.

---

## Features

- **Ultra-Low Latency & Instant TTFT**: Zero-overhead WebStream passthrough for streaming responses (`text/event-stream`), piping chunks directly to clients without buffering delays.
- **Real-Time Token Telemetry & Cache Tracking**: Automatically extracts prompt tokens, completion tokens, and **cached tokens** from regular JSON responses and streaming SSE chunks (OpenAI `prompt_tokens_details.cached_tokens` and Anthropic `cache_read_input_tokens`).
- **Global Prompt & Token Optimizers**:
  - **Exact Response Cache Engine**: Caches exact prompt completions in SQLite for instant 0ms TTFT responses (`X-Cache-Status: HIT`) with configurable TTL and purge capabilities.
  - **RTK (Repeated Token Knowledge) Compression**: Prunes duplicate consecutive lines, redundant sentences, and repetitive chat history bloat before forwarding upstream.
  - **Caveman Mode**: Injects ultra-dense conciseness directives to strip conversational fluff, preambles, greetings, and apologies, slashing completion tokens.
  - **Whitespace & Prompt Minifier**: Normalizes excessive line breaks and trailing whitespace before tokenizer processing.
- **Client Key Management & Token Quota Limiting**: Generate client access keys with standard `sk-neko-...` prefix, protected by both a requests-per-minute rate limiter and a total cumulative **Token Quota Limiter** (HTTP 429 `insufficient_quota` on exhaustion).
- **Upstream Providers, Multi-Key Pools & Model Routing**: Configure OpenAI and Anthropic providers with multi-key pools for automatic key rotation and load balancing, custom base URLs (e.g. Ollama, vLLM, OpenRouter), priority weights, request timeouts, and live connection testing.
- **Elysia Eden Ready**: Directly export `App` type (`export type App = typeof app`) for 100% end-to-end type-safe consumption in any frontend or service using `@elysiajs/eden`.
- **6-Digit Master PIN Security**: Default PIN `123456` secures admin and configuration endpoints, secured with `Bun.password` (bcrypt) hashing and signed HTTP-only cookie sessions.
- **SQLite Database Management**: Export checkpointed `.sqlite` backups; import databases with automatic SQLite magic header and schema integrity checks.
- **HTTPS-Only API Enforcement**: Optional global switch in Settings to reject unencrypted HTTP requests to AI proxy endpoints, enforcing TLS encryption and inspecting `X-Forwarded-Proto` reverse proxy headers.
- **Interactive API Documentation**: Built-in Swagger/OpenAPI UI available at `/swagger` and complete integration docs in `API_Docs.md`.
- **Pure Zero-Build Docker Deployment**: Instant deployment using lightweight `oven/bun:alpine` with volume bind mounts.

---

## Project Structure

```text
Neko-Router/
├── src/                        # Headless Backend (Bun + ElysiaJS)
│   ├── config/env.ts           # Environment configuration
│   ├── db/
│   │   ├── index.ts            # SQLite connection, WAL pragma, table init
│   │   └── schema.ts           # Drizzle ORM schema definitions
│   ├── middleware/
│   │   └── auth.ts             # Cookie, Bearer JWT, and client key auth guard
│   ├── routes/
│   │   ├── auth.ts             # Status, login, change-pin, logout
│   │   ├── keys.ts             # Client API keys CRUD (sk-neko-...)
│   │   ├── api-keys.ts         # Router integration API keys
│   │   ├── upstreams.ts        # Upstream keys CRUD, alias generator & test
│   │   ├── telemetry.ts        # Aggregated stats & request logs
│   │   ├── admin.ts            # SQLite export/import, metrics, timeout & optimizer settings
│   │   └── proxy.ts            # /v1/chat/completions, /v1/models, /v1/messages
│   ├── services/
│   │   ├── auth.ts             # 6-digit PIN bcrypt verification & client key validation
│   │   ├── router.ts           # Upstream selection & load balancing
│   │   ├── telemetry.ts        # Asynchronous telemetry logger & cached token counters
│   │   ├── optimizer.ts        # RTK compression, Caveman mode, response cache engine
│   │   └── proxy.ts            # Zero-latency WebStream passthrough engine
│   └── index.ts                # Elysia server, Swagger, & Eden type App export
├── data/                       # Local SQLite storage folder
│   └── router.db               # Persisted SQLite database (WAL mode)
├── API_Docs.md                 # Complete API integration manual
├── Dockerfile                  # Lightweight Bun alpine Dockerfile
├── docker-compose.yml          # Host network docker compose with volume mapping
├── .env.example                # Example environment variables
└── package.json
```

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.1+) installed locally, OR Docker & Docker Compose.

### 1. Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/Neko-Router.git
cd Neko-Router

# Install backend dependencies
bun install

# Copy environment file
cp .env.example .env

# Start development server with live reload
bun run dev
```

Server endpoints:
- **API Root**: [http://localhost:3000](http://localhost:3000)
- **Interactive Swagger OpenAPI Docs**: [http://localhost:3000/swagger](http://localhost:3000/swagger)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## Docker Deployment

The Docker setup uses a clean `oven/bun:alpine` runtime without in-container builds:

```bash
# 1. Prepare environment
cp .env.example .env

# 2. Start container with volume mapping
docker compose up -d --build
```

The entire repository (including `node_modules` and `./data`) is bind-mounted directly to `/app`, giving near-instant container startup and minimal disk footprint.

---

## Frontend Integration with Elysia Eden

Any frontend framework (React, Next.js, Vue, Svelte, Astro, etc.) or Node/Bun client can connect to Neko-Router with 100% end-to-end type safety using `@elysiajs/eden`:

```bash
bun add @elysiajs/eden
```

```ts
import { treaty } from "@elysiajs/eden";
import type { App } from "./src/index"; // or shared App type

// Initialize type-safe client
export const client = treaty<App>("localhost:3000");

// Check health
const { data: health } = await client.health.get();
console.log(health); // { status: "ok", timestamp: ... }

// Fetch client keys with full autocomplete & TypeScript validation
const { data: keys, error } = await client.api.keys.get({
  headers: {
    authorization: "Bearer your-session-or-api-key",
  },
});
```

---

## API Usage Examples

### 1. OpenAI SDK (Python)

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-neko-your-client-key",
    base_url="http://localhost:3000/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain quantum computing briefly."}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```

### 2. Anthropic Claude SDK (TypeScript / Node)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: "sk-neko-your-client-key",
  baseURL: "http://localhost:3000",
});

const response = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello Claude via Neko-Router!" }],
  stream: true,
});

for await (const event of response) {
  if (event.type === "content_block_delta") {
    process.stdout.write(event.delta?.text || "");
  }
}
```

### 3. cURL Stream Passthrough

```bash
curl -N http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-neko-your-client-key" \
  -d '{
    "model": "gpt-4o",
    "stream": true,
    "messages": [{"role": "user", "content": "Tell me a short joke."}]
  }'
```

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Healthcheck & system status | No |
| `GET` | `/swagger` | Interactive Swagger API docs | No |
| `GET` | `/api/auth/status` | Check default PIN & session status | No |
| `POST` | `/api/auth/login` | Login with 6-digit Master PIN | No |
| `POST` | `/api/auth/change-pin` | Change 6-digit Master PIN | Session / Key |
| `GET` | `/api/keys` | List client access keys & token quotas | Session / Key |
| `POST` | `/api/keys` | Generate new client access key (`sk-neko-...`) | Session / Key |
| `GET` | `/api/upstreams` | List configured upstream provider keys | Session / Key |
| `POST` | `/api/upstreams` | Add upstream key (OpenAI/Anthropic) | Session / Key |
| `POST` | `/api/upstreams/:id/test` | Ping upstream key & measure latency | Session / Key |
| `GET` | `/api/telemetry/stats` | Aggregated usage, cached tokens & latency metrics | Session / Key |
| `GET` | `/api/telemetry/logs` | Real-time paginated request telemetry logs | Session / Key |
| `GET` | `/api/admin/settings/optimizations` | Read global prompt & token optimizer flags | Session / Key |
| `POST` | `/api/admin/settings/optimizations` | Update global prompt & token optimizer flags | Session / Key |
| `POST` | `/api/admin/cache/clear` | Purge exact response cache table | Session / Key |
| `GET` | `/api/admin/db/export` | Download SQLite backup file | Session / Key |
| `POST` | `/api/admin/db/import` | Upload & verify SQLite database | Session / Key |
| `GET` | `/api/admin/system` | Runtime diagnostics & memory usage | Session / Key |
| `POST` | `/v1/chat/completions` | OpenAI Chat Completions proxy | Client Key (`sk-neko-...`) |
| `GET` | `/v1/models` | List available models | Client Key (`sk-neko-...`) |
| `POST` | `/v1/messages` | Anthropic Claude Messages proxy | Client Key (`sk-neko-...`) |
