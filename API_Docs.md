# Neko-Router API Documentation

Comprehensive API integration documentation for **Neko-Router**, a high-performance, ultra-low overhead AI Gateway & Router featuring stream-passthrough architecture designed for **OpenAI** and **Anthropic Claude** compatible endpoints.

---

## Table of Contents

1. [Overview & Base URLs](#1-overview--base-urls)
2. [Authentication Mechanisms](#2-authentication-mechanisms)
3. [AI Proxy Endpoints](#3-ai-proxy-endpoints)
   - [OpenAI Chat Completions (`POST /v1/chat/completions`)](#a-openai-chat-completions-post-v1chatcompletions)
   - [OpenAI Models List (`GET /v1/models`)](#b-openai-models-list-get-v1models)
   - [Anthropic Messages (`POST /v1/messages`)](#c-anthropic-messages-post-v1messages)
4. [SDK Integration Guides](#4-sdk-integration-guides)
   - [OpenAI Python SDK](#a-openai-python-sdk)
   - [OpenAI Node.js / TypeScript SDK](#b-openai-nodejs--typescript-sdk)
   - [Anthropic Claude TypeScript SDK](#c-anthropic-claude-typescript-sdk)
   - [Anthropic Claude Python SDK](#d-anthropic-claude-python-sdk)
   - [cURL Streaming & Non-Streaming](#e-curl-examples)
   - [Elysia Eden Treaty (TypeScript End-to-End Type Safety)](#f-elysia-eden-treaty-typescript)
5. [Router Management APIs](#5-router-management-apis)
   - [Authentication & PIN Endpoints](#a-authentication--pin-endpoints)
   - [Client Access Keys Management](#b-client-keys-endpoints)
   - [Upstream Router Keys Management](#c-upstream-router-keys-endpoints)
   - [Telemetry & Token Analytics](#d-telemetry--token-logs-endpoints)
   - [Database & System Diagnostics](#e-database--system-endpoints)
   - [Global Prompt & Token Optimizers](#f-global-prompt--token-optimizers)
6. [Response Codes & Error Handling](#6-response-codes--error-handling)

---

## 1. Overview & Base URLs

Neko-Router acts as an intelligent, ultra-fast middleman between your client applications and upstream AI providers (OpenAI, Anthropic, Ollama, vLLM, OpenRouter, etc.).

- **Default Server Base URL:** `http://localhost:3000`
- **OpenAI-Compatible Base URL:** `http://localhost:3000/v1`
- **Anthropic-Compatible Base URL:** `http://localhost:3000`
- **Interactive Swagger UI:** `http://localhost:3000/swagger`

---

## 2. Authentication Mechanisms

### A. AI Completions & Proxy Keys (`sk-...`)
Used by client applications and standard AI SDKs to execute AI proxy requests (`/v1/chat/completions`, `/v1/models`, `/v1/messages`).
- **Format:** Standard `sk-...` format (e.g. `sk-neko-7x8a9b2c...`).
- **Header:** `Authorization: Bearer sk-...` or `x-api-key: sk-...`

### B. Router Management Interface Keys (`x-api-key`)
Used to authenticate programmatic requests to the router's management API (`/api/keys`, `/api/upstreams`, `/api/telemetry`, `/api/admin`):
- **Header:** `x-api-key: <client-key>` *or* `Authorization: Bearer <client-key>`

### C. Token Limiter Quota & Rate Limits
Every client key can have:
- **Token Quota Limiter (`tokenLimit`):** Maximum cumulative tokens (Prompt + Completion) allowed. When exhausted, the router immediately blocks requests with HTTP `429 Too Many Requests` (`insufficient_quota`).
- **Rate Limiter (`rateLimit`):** Maximum requests allowed per 60-second sliding window.

### D. Master PIN / Admin Session
Used to secure the administrative router dashboard.
- Logging in via `/api/auth/login` issues a signed HTTP-only cookie (`session`) and a JWT bearer token.
- Factory default PIN: `123456` (strictly requires setting a new 6-digit PIN on initial setup).

---

## 3. AI Proxy Endpoints

### A. OpenAI Chat Completions (`POST /v1/chat/completions`)

Supports standard JSON responses and instant Server-Sent Events (SSE) streaming with **zero-buffering passthrough**.

- **URL:** `/v1/chat/completions`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <client-api-key>` *or* `x-api-key: <client-api-key>`

#### Request Body (JSON)
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a concise, helpful assistant." },
    { "role": "user", "content": "Explain quantum computing in 2 sentences." }
  ],
  "stream": true,
  "temperature": 0.7
}
```

#### Stream Passthrough Characteristics:
- When `stream: true`, the router automatically appends `stream_options: { include_usage: true }`.
- Every byte chunk is instantly forwarded via WebStream (`TransformStream`) directly to the client without artificial buffering delays, preserving the upstream **Time To First Token (TTFT)**.
- An asynchronous SSE parser extracts prompt, completion, cached, and total tokens from the terminal usage chunk and records them into SQLite telemetry.
- If Exact Response Cache is active and matches, an instant 0ms cached response is served with `X-Cache-Status: HIT`.

---

### B. OpenAI Models List (`GET /v1/models`)

Retrieves the available models from active OpenAI upstream keys, or returns a standard curated model fallback list if upstream is offline.

- **URL:** `/v1/models`
- **Method:** `GET`
- **Headers:**
  - `Authorization: Bearer <client-api-key>` *(optional)*

#### Example Response
```json
{
  "object": "list",
  "data": [
    { "id": "gpt-4o", "object": "model", "created": 1715367049, "owned_by": "openai" },
    { "id": "gpt-4o-mini", "object": "model", "created": 1721245000, "owned_by": "openai" },
    { "id": "o3-mini", "object": "model", "created": 1738000000, "owned_by": "openai" },
    { "id": "claude-3-7-sonnet-20250219", "object": "model", "created": 1740000000, "owned_by": "anthropic" },
    { "id": "claude-3-5-sonnet-20241022", "object": "model", "created": 1729600000, "owned_by": "anthropic" }
  ]
}
```

---

### C. Anthropic Messages (`POST /v1/messages`)

Supports the native Anthropic Claude Messages protocol for both non-streaming and streaming requests.

- **URL:** `/v1/messages`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: <client-api-key>` *or* `Authorization: Bearer <client-api-key>`
  - `anthropic-version: 2023-06-01` *(optional, defaults to 2023-06-01)*
  - `anthropic-beta: <beta-flag>` *(optional, forwarded if provided)*

#### Request Body (JSON)
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "Hello Claude via Neko-Router!" }
  ],
  "stream": true
}
```

#### Anthropic Token Telemetry & Caching:
- `event: message_start` -> extracts `input_tokens` (Prompt tokens) and `cache_read_input_tokens` (Cached tokens).
- `event: message_delta` -> extracts `output_tokens` (Completion tokens).

---

## 4. SDK Integration Guides

### A. OpenAI Python SDK

```python
from openai import OpenAI

# Simply configure base_url to point to Neko-Router /v1
client = OpenAI(
    api_key="sk-neko-your-client-key-here",
    base_url="http://localhost:3000/v1"
)

# Streaming Chat Completion
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a short haiku about speed."}],
    stream=True
)

for chunk in stream:
    content = chunk.choices[0].delta.content or ""
    print(content, end="", flush=True)
```

---

### B. OpenAI Node.js / TypeScript SDK

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "sk-neko-your-client-key-here",
  baseURL: "http://localhost:3000/v1",
});

async function main() {
  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Explain zero-buffering proxying." }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();
```

---

### C. Anthropic Claude TypeScript SDK

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: "sk-neko-your-client-key-here",
  baseURL: "http://localhost:3000",
});

async function main() {
  const stream = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello Claude via Neko-Router!" }],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }
}

main();
```

---

### D. Anthropic Claude Python SDK

```python
import anthropic

client = anthropic.Anthropic(
    api_key="sk-neko-your-client-key-here",
    base_url="http://localhost:3000"
)

with client.messages.stream(
    max_tokens=1024,
    messages=[{"role": "user", "content": "Describe an AI Gateway."}],
    model="claude-3-5-sonnet-20241022",
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

---

### E. cURL Examples

#### 1. OpenAI Streaming:
```bash
curl -N http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-neko-your-client-key-here" \
  -d '{
    "model": "gpt-4o",
    "stream": true,
    "messages": [
      { "role": "user", "content": "Explain relativity in simple terms." }
    ]
  }'
```

#### 2. Anthropic Non-Streaming:
```bash
curl http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-neko-your-client-key-here" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 256,
    "messages": [
      { "role": "user", "content": "List the laws of thermodynamics." }
    ]
  }'
```

---

### F. Elysia Eden Treaty (TypeScript)

If you are building a custom Web Dashboard, mobile app, microservice, or CLI tool with TypeScript/JavaScript, you can consume Neko-Router with **100% end-to-end type safety and autocomplete** using `@elysiajs/eden`:

#### 1. Installation:
```bash
bun add @elysiajs/eden
# or
npm install @elysiajs/eden
```

#### 2. Usage with Neko-Router `App` Type:
```typescript
import { treaty } from "@elysiajs/eden";
import type { App } from "./src/index"; // or export type from your build

// Initialize the Eden Treaty client
export const api = treaty<App>("http://localhost:3000");

// 1. Health check (fully typed response)
const { data: health } = await api.health.get();
console.log(health?.status); // "ok"

// 2. Query available AI models (no auth required)
const { data: models } = await api.v1.models.get();
console.log(models?.data); // Array of Model objects

// 3. Authenticate with Master PIN
const { data: authResult } = await api.api.auth.login.post({
  pin: "123456",
});

const token = authResult?.token;

// 4. Fetch Client Keys with Bearer token
const { data: keys, error } = await api.api.keys.get({
  headers: {
    authorization: `Bearer ${token}`,
  },
});

// 5. Create a new Client Key
const { data: newKey } = await api.api.keys.post(
  {
    name: "Production Worker",
    rateLimit: 60,
    tokenLimit: 500000,
    allowedProviders: ["openai", "anthropic"],
    roundRobinProviders: 1,
  },
  {
    headers: {
      authorization: `Bearer ${token}`,
    },
  }
);
console.log("Generated Key:", newKey?.key); // "sk-neko-..."
```

---

## 5. Router Management APIs

All `/api/*` management endpoints can be authenticated via an **Admin Session Cookie**, an **Admin Bearer Token** (`Authorization: Bearer <admin-token>`), or a **Client Key** (`Authorization: Bearer <client-key>` / `x-api-key: <client-key>`).

### A. Authentication & PIN Endpoints

#### 1. Check Authentication Status
- **`GET /api/auth/status`**
- **Response:**
  ```json
  {
    "isDefaultPin": false,
    "authenticated": true
  }
  ```

#### 2. Login with 6-Digit Master PIN
- **`POST /api/auth/login`**
- **Body:** `{ "pin": "654321" }`
- **Response:**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "isDefaultPin": false
  }
  ```

#### 3. Change 6-Digit Master PIN
- **`POST /api/auth/change-pin`**
- **Body:** `{ "currentPin": "123456", "newPin": "654321" }`
- **Response:**
  ```json
  {
    "success": true,
    "message": "PIN updated successfully",
    "token": "..."
  }
  ```

#### 4. Logout
- **`POST /api/auth/logout`**
- **Response:** `{ "success": true }`

---

### B. Client Keys Endpoints

#### 1. List Client Keys
- **`GET /api/keys`**
- **Response:**
  ```json
  {
    "keys": [
      {
        "id": "ck_abc123",
        "name": "Production Web App",
        "key": "sk-neko-8d72fa98bc1e4f...",
        "displayKey": "sk-neko-...e4f",
        "isActive": 1,
        "rateLimit": 60,
        "tokenLimit": 5000000,
        "usedTokens": 18240,
        "createdAt": 1788775899649,
        "lastUsedAt": 1788775920000,
        "totalRequests": 42,
        "totalTokens": 18240
      }
    ]
  }
  ```

#### 2. Create Client Key
- **`POST /api/keys`**
- **Body:**
  ```json
  {
    "name": "Chatbot Backend",
    "customKey": "sk-neko-custom-string",
    "rateLimit": 100,
    "tokenLimit": 1000000
  }
  ```

#### 3. Update Client Key Status / Limits
- **`PATCH /api/keys/:id`**
- **Body:** `{ "isActive": false, "name": "New Name", "rateLimit": 120, "tokenLimit": 2000000 }`

#### 4. Revoke / Delete Client Key
- **`DELETE /api/keys/:id`**

---

### C. Upstream Router Keys Endpoints

#### 1. List Upstream Keys
- **`GET /api/upstreams`**
- **Response:**
  ```json
  {
    "upstreams": [
      {
        "id": "up_xyz789",
        "provider": "openai",
        "name": "hyper-falcon-88",
        "baseUrl": null,
        "isActive": 1,
        "weight": 2,
        "maskedKey": "sk-pro...1234",
        "createdAt": 1788775899649,
        "updatedAt": 1788775899649
      }
    ]
  }
  ```

#### 2. Add Upstream Key
- **`POST /api/upstreams`**
- **Body:**
  ```json
  {
    "provider": "openai",
    "name": "quantum-lynx-42",
    "apiKey": "sk-proj-...",
    "baseUrl": "https://api.openai.com/v1",
    "weight": 1
  }
  ```

#### 3. Generate Random Alias
- **`GET /api/upstreams/generate-alias`**
- **Response:** `{ "alias": "stellar-neko-92" }`

#### 4. Test Upstream Connectivity
- **`POST /api/upstreams/:id/test`**
- **Response:**
  ```json
  {
    "success": true,
    "latencyMs": 142,
    "message": "Connection successful"
  }
  ```

#### 5. Update Upstream Key
- **`PATCH /api/upstreams/:id`**
- **Body:** `{ "isActive": true, "weight": 3 }`

#### 6. Delete Upstream Provider
- **`DELETE /api/upstreams/:id`**

#### 7. Add Key to Provider Pool
- **`POST /api/upstreams/:id/keys`**
- **Body:**
  ```json
  {
    "name": "Backup Key 2",
    "key": "sk-proj-...",
    "isActive": true
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "addedCount": 1,
    "totalKeysCount": 8,
    "activeKeysCount": 8,
    "keyEntries": [...]
  }
  ```

#### 8. Mass Import Keys to Provider Pool
Import hundreds of API keys in a single atomic request from multiline raw text or structured arrays.
- **`POST /api/upstreams/:id/keys/import`**
- **Body:**
  ```json
  {
    "rawKeys": "sk-proj-key1...\nsk-proj-key2...\nCustom Label: sk-proj-key3...",
    "namePrefix": "Node Key",
    "defaultActive": true,
    "skipDuplicates": true
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "importedCount": 150,
    "duplicatesSkipped": 2,
    "message": "Successfully imported 150 keys (2 duplicates skipped)",
    "totalKeysCount": 158,
    "activeKeysCount": 158,
    "keyEntries": [...]
  }
  ```

#### 9. Delete Single Key from Pool
- **`DELETE /api/upstreams/:id/keys/:keyId`**
- **Response:**
  ```json
  {
    "success": true,
    "message": "Key deleted successfully",
    "totalKeysCount": 157,
    "activeKeysCount": 157,
    "keyEntries": [...]
  }
  ```

#### 10. Toggle All Keys in Pool
- **`POST /api/upstreams/:id/keys/toggle-all`**
- **Body:** `{ "enableAll": true }` or `{ "disableAll": true }`

---

### D. Telemetry & Token Logs Endpoints

#### 1. Aggregated Usage, Cached Tokens & Latency Metrics
- **`GET /api/telemetry/stats?hours=24`**
- **Response:**
  ```json
  {
    "totalRequests": 1250,
    "successRequests": 1242,
    "totalPromptTokens": 542000,
    "totalCompletionTokens": 189000,
    "totalCachedTokens": 142000,
    "totalTokens": 731000,
    "avgDurationMs": 285,
    "modelStats": [
      {
        "model": "gpt-4o",
        "provider": "openai",
        "requests": 820,
        "tokens": 490000
      },
      {
        "model": "claude-3-5-sonnet-20241022",
        "provider": "anthropic",
        "requests": 430,
        "tokens": 241000
      }
    ]
  }
  ```

#### 2. Recent Request Telemetry Logs
- **`GET /api/telemetry/logs?limit=50&offset=0`**
- **Response:**
  ```json
  {
    "logs": [
      {
        "id": "log_0a8b9c...",
        "clientKeyId": "ck_abc123",
        "clientKeyName": "Production Web App",
        "upstreamKeyId": "up_xyz789",
        "provider": "openai",
        "endpoint": "/v1/chat/completions",
        "model": "gpt-4o",
        "promptTokens": 45,
        "completionTokens": 120,
        "cachedTokens": 45,
        "totalTokens": 165,
        "statusCode": 200,
        "durationMs": 312,
        "isStreaming": 1,
        "errorMessage": null,
        "createdAt": 1788776000000
      }
    ]
  }
  ```

---

### E. Upstream Router Providers & Multi-Key Pool

Manage upstream OpenAI and Anthropic API providers, configure multiple keys per upstream for automatic load balancing, and manage per-model routing catalogs (with default OFF security policy).

#### 1. List All Upstream Providers
- **`GET /api/upstreams`**
- **Response:**
  ```json
  {
    "upstreams": [
      {
        "id": "up_7a8b9c...",
        "provider": "openai",
        "name": "hyper-falcon-88",
        "baseUrl": "https://api.openai.com/v1",
        "isActive": 1,
        "weight": 1,
        "createdAt": 1788776000000,
        "updatedAt": 1788776000000,
        "apiKey": "sk-proj-...1234",
        "apiKeys": ["sk-proj-...1234", "sk-proj-...5678"],
        "maskedKey": "sk-proj-...1234",
        "maskedKeys": ["sk-proj-...1234", "sk-proj-...5678"],
        "models": [
          { "id": "gpt-4o", "enabled": true },
          { "id": "gpt-4o-mini", "enabled": false }
        ],
        "totalModelsCount": 2,
        "enabledModelsCount": 1
      }
    ]
  }
  ```

#### 2. Create Upstream Provider with Multi-Key Pool
- **`POST /api/upstreams`**
- **Payload:**
  ```json
  {
    "provider": "openai",
    "name": "Production OpenAI Pool",
    "apiKeys": [
      "sk-proj-primary-key...",
      "sk-proj-secondary-key..."
    ],
    "baseUrl": "https://api.openai.com/v1",
    "weight": 2
  }
  ```

#### 3. Edit Upstream Provider
- **`PATCH /api/upstreams/:id`**
- Updates upstream configuration including name, provider, baseUrl, priority weight, key pool, and models.
- **Payload:**
  ```json
  {
    "name": "Updated Gateway Node",
    "apiKeys": [
      "sk-proj-key1...",
      "sk-proj-key2..."
    ],
    "baseUrl": "https://custom-proxy.internal/v1",
    "weight": 3,
    "isActive": true
  }
  ```

#### 4. Fetch Models from Upstream Provider (Default OFF)
- **`POST /api/upstreams/:id/fetch-models`**
- Queries upstream endpoint (`/models` or Anthropic catalog) using an active key from the pool.
- **Security Policy:** All newly fetched models default to `enabled: false`. If any model was previously enabled, its state is preserved.
- **Response:**
  ```json
  {
    "success": true,
    "models": [
      { "id": "gpt-4o", "enabled": false },
      { "id": "gpt-4o-mini", "enabled": false },
      { "id": "o1", "enabled": false }
    ],
    "count": 3,
    "enabledCount": 0
  }
  ```

#### 5. Toggle Model Status for Upstream
- **`POST /api/upstreams/:id/models/toggle`**
- Toggle a single model or batch enable/disable all models.
- **Payload (Single model toggle):**
  ```json
  {
    "modelId": "gpt-4o",
    "enabled": true
  }
  ```
- **Payload (Batch toggle):**
  ```json
  {
    "enableAll": true
  }
  ```
  or
  ```json
  {
    "disableAll": true
  }
  ```

#### 6. Test Upstream Connectivity
- **`POST /api/upstreams/:id/test`**
- Sends a verification ping to the upstream endpoint using the active key pool.
- **Response:** `{ "success": true, "latencyMs": 142, "message": "Connection successful" }`

#### 7. Delete Upstream Provider
- **`DELETE /api/upstreams/:id`**
- **Response:** `{ "success": true }`

---

### F. Database & System Endpoints

#### 1. Export SQLite Database
- **`GET /api/admin/db/export`**
- Executes `PRAGMA wal_checkpoint(TRUNCATE)` and streams the complete `.sqlite` snapshot.
- **Response Headers:** `Content-Type: application/x-sqlite3`, `Content-Disposition: attachment; filename="neko-router-backup-YYYY-MM-DD-HHmm.sqlite"`

#### 2. Import SQLite Database
- **`POST /api/admin/db/import`**
- Accepts a binary SQLite database via `multipart/form-data` with the field `file`.
- Verifies the SQLite Magic Header (`SQLite format 3`), validates data integrity (`PRAGMA integrity_check`), and verifies essential schema tables.
- Hot-reloads the active database connection instantly without restarting the server process.

#### 3. Runtime Engine Diagnostics
- **`GET /api/admin/system`**
- **Response:**
  ```json
  {
    "version": "1.0.0",
    "bunVersion": "1.3.14",
    "uptimeSeconds": 3600,
    "memory": {
      "rssMb": 42.5,
      "heapUsedMb": 18.2
    },
    "dbSizeBytes": 65536,
    "dbPath": "data/router.db"
  }
  ```

#### 4. Health Check
- **`GET /health`**
- **Response:** `{ "status": "ok", "timestamp": 1788776644824 }`

---

### F. Global Prompt & Token Optimizers

These optimizations are applied **globally** across all inbound OpenAI and Anthropic proxy requests.

#### 1. Get Active Optimizer & Security Configuration
- **`GET /api/admin/settings/optimizations`**
- **Response:**
  ```json
  {
    "cacheEnabled": true,
    "rtkCompression": true,
    "cavemanMode": false,
    "minifyPrompt": true,
    "cacheTtlSeconds": 3600,
    "httpsOnly": false
  }
  ```

#### 2. Update Global Optimizer & Security Configuration
- **`POST /api/admin/settings/optimizations`**
- **Payload:**
  ```json
  {
    "cacheEnabled": true,
    "rtkCompression": true,
    "cavemanMode": true,
    "minifyPrompt": true,
    "cacheTtlSeconds": 7200,
    "httpsOnly": true
  }
  ```
- **Response:** Updated configuration object.

#### 3. Purge Exact Response Cache
- **`POST /api/admin/cache/clear`**
- Clears all cached response entries from SQLite.
- **Response:** `{ "cleared": 14 }`

---

## 6. Response Codes & Error Handling

Neko-Router adheres to standard HTTP status codes and OpenAI / Anthropic error object conventions:

| Status Code | Error Type | Description / Root Cause |
|---|---|---|
| `200 OK` | - | Request successfully proxied and completed. |
| `400 Bad Request` | `invalid_request_error` | Malformed JSON payload or invalid parameter schema. |
| `400 Bad Request` | `model_not_enabled` | The requested model is disabled or not enabled on any active upstream provider. |
| `401 Unauthorized` | `invalid_api_key` | Missing, invalid, or disabled client access key. |
| `403 Forbidden` | `https_required` | Unencrypted HTTP request rejected due to HTTPS-Only server policy. |
| `404 Not Found` | `not_found` | Resource (client key, upstream key) does not exist. |
| `429 Too Many Requests` | `insufficient_quota` | Cumulative token quota exceeded for this client key. |
| `429 Too Many Requests` | `requests` / `rate_limit_error` | Request per minute rate limit exceeded. |
| `502 Bad Gateway` | `gateway_error` | Gateway failed to connect to upstream provider (network/DNS/timeout). |
| `503 Service Unavailable` | `no_upstream_key` | No active upstream API keys configured for the requested provider. |

Standard JSON Error Format:
```json
{
  "error": {
    "message": "No active OpenAI upstream key configured in Neko-Router",
    "type": "router_error",
    "code": "no_upstream_key"
  }
}
```
