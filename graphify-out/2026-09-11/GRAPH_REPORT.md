# Graph Report - Neko-Router  (2026-09-11)

## Corpus Check
- 55 files · ~73,859 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 572 nodes · 896 edges · 30 communities (26 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4d2715b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compilerOptions
- devDependencies
- schema.ts
- rules/graphify.md
- workflows/graphify.md
- Neko-Router
- brandkit/SKILL.md
- App.tsx
- upstreams.ts
- compilerOptions
- dependencies
- Analysis & Synthesis Instructions
- compilerOptions
- Design System: Taste Standard
- Protocol: Premium Utilitarian Minimalism UI Architect
- C. Upstream Router Keys Endpoints
- plugins
- React + TypeScript + Vite
- frontend/tsconfig.json
- 5. Router Management APIs
- Neko-Router API Documentation
- services/proxy.ts
- E. Upstream Router Providers & Multi-Key Pool
- B. Client Keys Endpoints
- B.2 Router Integration API Keys (`/api/router-keys`)
- A. Authentication & PIN Endpoints
- dev.ts
- F. Database & System Endpoints

## God Nodes (most connected - your core abstractions)
1. `proxyOpenAIChatCompletions()` - 23 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 18 edges
4. `apiRequest()` - 16 edges
5. `react` - 15 edges
6. `compilerOptions` - 15 edges
7. `proxyAnthropicMessages()` - 14 edges
8. `parseUpstreamKeyEntries()` - 13 edges
9. `db` - 12 edges
10. `Design System: Taste Standard` - 11 edges

## Surprising Connections (you probably didn't know these)
- `UpstreamSelectionResult` --references--> `UpstreamKey`  [EXTRACTED]
  src/services/router.ts → src/db/schema.ts
- `proxyOpenAIChatCompletions()` --calls--> `getCopilotInternalToken()`  [EXTRACTED]
  src/services/proxy.ts → src/services/copilot.ts
- `proxyOpenAIChatCompletions()` --calls--> `transformCopilotRequestBody()`  [EXTRACTED]
  src/services/proxy.ts → src/services/copilot.ts
- `App()` --calls--> `useTheme()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/hooks/useTheme.ts
- `App()` --calls--> `apiRequest()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (30 total, 4 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.07
Nodes (28): bun, client, dist, ESNext, node_modules, compilerOptions, allowImportingTsExtensions, allowJs (+20 more)

### Community 1 - "devDependencies"
Cohesion: 0.06
Nodes (33): drizzle-kit, devDependencies, drizzle-kit, tailwindcss, @tailwindcss/vite, @types/bun, @types/node, @types/react (+25 more)

### Community 2 - "schema.ts"
Cohesion: 0.06
Nodes (53): checkpointWal(), db, initDatabase(), initTablesSync(), reloadDatabase(), sqlite, ApiKey, apiKeys (+45 more)

### Community 5 - "Neko-Router"
Cohesion: 0.14
Nodes (13): 1. Local Development, 1. OpenAI SDK (Python), 2. Anthropic Claude SDK (TypeScript / Node), 3. cURL Stream Passthrough, API Usage Examples, Docker Deployment, Endpoints Summary, Features (+5 more)

### Community 6 - "brandkit/SKILL.md"
Cohesion: 0.05
Nodes (43): 1. Logo Cover, 1. Monogram + Meaning, 2 × 3 REFERENCE-STYLE LAYOUT, 2. Logo Construction, 2. Product Action, 3. Digital Application, 3. Metaphor Fusion, 4. Brand Essence (+35 more)

### Community 7 - "App.tsx"
Cohesion: 0.06
Nodes (50): App(), getTabFromLocation(), ROUTE_TO_TAB, TAB_ROUTES, ClientKeysTab(), CodeSnippetViewerProps, DashboardTab(), formatTimeAgo() (+42 more)

### Community 9 - "upstreams.ts"
Cohesion: 0.08
Nodes (35): adjectives, nouns, ANTIGRAVITY_CONFIG, ANTIGRAVITY_DEFAULT_MODELS, buildAntigravityAuthUrl(), exchangeAntigravityCode(), fetchAntigravityModels(), getAntigravityClientMetadata() (+27 more)

### Community 10 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 11 - "dependencies"
Cohesion: 0.09
Nodes (23): clsx, drizzle-orm, elysia, @elysiajs/cors, @elysiajs/eden, @elysiajs/jwt, @elysiajs/swagger, lucide-react (+15 more)

### Community 12 - "Analysis & Synthesis Instructions"
Cohesion: 0.11
Nodes (18): 1. Define the Atmosphere, 2. Map the Color Palette, 3. Establish Typography Rules, 4. Define the Hero Section, 5. Describe Component Stylings, 6. Define Layout Principles, 7. Define Responsive Rules, 8. Encode Motion Philosophy (+10 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 14 - "Design System: Taste Standard"
Cohesion: 0.13
Nodes (14): 1. Visual Theme & Atmosphere, 2. Color Palette & Roles, 3. Typography Rules, 4. Component Stylings, 5. Hero Section, 6. Layout Principles, 7. Responsive Rules, 8. Motion & Interaction (Code-Phase Intent) (+6 more)

### Community 15 - "Protocol: Premium Utilitarian Minimalism UI Architect"
Cohesion: 0.20
Nodes (9): 1. Protocol Overview, 2. Absolute Negative Constraints (Banned Elements), 3. Typographic Architecture, 4. Color Palette (Warm Monochrome + Spot Pastels), 5. Component Specifications, 6. Iconography & Imagery Directives, 7. Subtle Motion & Micro-Animations, 8. Execution Protocol (+1 more)

### Community 16 - "C. Upstream Router Keys Endpoints"
Cohesion: 0.18
Nodes (11): 10. Toggle All Keys in Pool, 1. List Upstream Keys, 2. Add Upstream Key, 3. Generate Random Alias, 4. Test Upstream Connectivity, 5. Update Upstream Key, 6. Delete Upstream Provider, 7. Add Key to Provider Pool (+3 more)

### Community 17 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 18 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 21 - "5. Router Management APIs"
Cohesion: 0.25
Nodes (8): 1. Aggregated Usage, Cached Tokens & Latency Metrics, 1. Get Active Optimizer & Security Configuration, 2. Recent Request Telemetry Logs, 2. Update Global Optimizer & Security Configuration, 3. Purge Exact Response Cache, 5. Router Management APIs, D. Telemetry & Token Logs Endpoints, F. Global Prompt & Token Optimizers

### Community 22 - "Neko-Router API Documentation"
Cohesion: 0.07
Nodes (29): 1. Installation:, 1. OpenAI Streaming:, 1. Overview & Base URLs, 2. Anthropic Non-Streaming:, 2. Authentication Mechanisms, 2. Usage with Neko-Router `App` Type:, 3. AI Proxy Endpoints, 4. SDK Integration Guides (+21 more)

### Community 23 - "services/proxy.ts"
Cohesion: 0.09
Nodes (50): UpstreamKey, AVAILABLE_ENDPOINTS, formatBytes(), formatUptime(), getV1Directory(), MOTIVATIONAL_QUOTES, proxyRoutes, ensureAntigravityAccessToken() (+42 more)

### Community 24 - "E. Upstream Router Providers & Multi-Key Pool"
Cohesion: 0.25
Nodes (8): 1. List All Upstream Providers, 2. Create Upstream Provider with Multi-Key Pool, 3. Edit Upstream Provider, 4. Fetch Models from Upstream Provider (Default OFF), 5. Toggle Model Status for Upstream, 6. Test Upstream Connectivity, 7. Delete Upstream Provider, E. Upstream Router Providers & Multi-Key Pool

### Community 25 - "B. Client Keys Endpoints"
Cohesion: 0.25
Nodes (8): 1. List Client Keys, 2. Create Client Key, 3. Update Client Key Status / Limits, 4. Rotate / Regenerate Secret Key, 5. Quick Adjust Token Quota & Limits, 6. Reset Used Token Quota, 7. Revoke / Delete Client Key, B. Client Keys Endpoints

### Community 26 - "B.2 Router Integration API Keys (`/api/router-keys`)"
Cohesion: 0.33
Nodes (6): 1. List Router API Keys, 2. Create Router API Key, 3. Update Router API Key Details, 4. Rotate / Regenerate Router API Key, 5. Delete Router API Key, B.2 Router Integration API Keys (`/api/router-keys`)

### Community 27 - "A. Authentication & PIN Endpoints"
Cohesion: 0.40
Nodes (5): 1. Check Authentication Status, 2. Login with 6-Digit Master PIN, 3. Change 6-Digit Master PIN, 4. Logout, A. Authentication & PIN Endpoints

### Community 29 - "F. Database & System Endpoints"
Cohesion: 0.40
Nodes (5): 1. Export SQLite Database, 2. Import SQLite Database, 3. Runtime Engine Diagnostics, 4. Health Check, F. Database & System Endpoints

## Knowledge Gaps
- **290 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+285 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `5. Router Management APIs` connect `5. Router Management APIs` to `C. Upstream Router Keys Endpoints`, `Neko-Router API Documentation`, `E. Upstream Router Providers & Multi-Key Pool`, `B. Client Keys Endpoints`, `B.2 Router Integration API Keys (`/api/router-keys`)`, `A. Authentication & PIN Endpoints`, `F. Database & System Endpoints`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `Neko-Router API Documentation` connect `Neko-Router API Documentation` to `5. Router Management APIs`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `plugins`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _290 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06479113384484228 - nodes in this community are weakly interconnected._