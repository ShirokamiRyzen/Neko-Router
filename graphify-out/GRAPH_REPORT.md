# Graph Report - Neko-Router  (2026-09-09)

## Corpus Check
- 53 files · ~66,645 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 548 nodes · 824 edges · 25 communities (21 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fd575e6e`
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
- dev.ts

## God Nodes (most connected - your core abstractions)
1. `proxyOpenAIChatCompletions()` - 23 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 18 edges
4. `apiRequest()` - 16 edges
5. `react` - 15 edges
6. `compilerOptions` - 15 edges
7. `proxyAnthropicMessages()` - 14 edges
8. `parseUpstreamKeyEntries()` - 11 edges
9. `Design System: Taste Standard` - 11 edges
10. `C. Upstream Router Keys Endpoints` - 11 edges

## Surprising Connections (you probably didn't know these)
- `proxyOpenAIChatCompletions()` --calls--> `getCopilotInternalToken()`  [EXTRACTED]
  src/services/proxy.ts → src/services/copilot.ts
- `proxyOpenAIChatCompletions()` --calls--> `transformCopilotRequestBody()`  [EXTRACTED]
  src/services/proxy.ts → src/services/copilot.ts
- `App()` --calls--> `useTheme()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/hooks/useTheme.ts
- `App()` --calls--> `apiRequest()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/lib/api.ts
- `ClientKeysTab()` --calls--> `apiRequest()`  [EXTRACTED]
  frontend/src/components/ClientKeysTab.tsx → frontend/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (25 total, 4 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.07
Nodes (28): bun, client, dist, ESNext, node_modules, compilerOptions, allowImportingTsExtensions, allowJs (+20 more)

### Community 1 - "devDependencies"
Cohesion: 0.06
Nodes (33): drizzle-kit, devDependencies, drizzle-kit, tailwindcss, @tailwindcss/vite, @types/bun, @types/node, @types/react (+25 more)

### Community 2 - "schema.ts"
Cohesion: 0.07
Nodes (43): checkpointWal(), initDatabase(), initTablesSync(), reloadDatabase(), sqlite, ApiKey, apiKeys, ClientKey (+35 more)

### Community 5 - "Neko-Router"
Cohesion: 0.14
Nodes (13): 1. Local Development, 1. OpenAI SDK (Python), 2. Anthropic Claude SDK (TypeScript / Node), 3. cURL Stream Passthrough, API Usage Examples, Docker Deployment, Endpoints Summary, Features (+5 more)

### Community 6 - "brandkit/SKILL.md"
Cohesion: 0.05
Nodes (43): 1. Logo Cover, 1. Monogram + Meaning, 2 × 3 REFERENCE-STYLE LAYOUT, 2. Logo Construction, 2. Product Action, 3. Digital Application, 3. Metaphor Fusion, 4. Brand Essence (+35 more)

### Community 7 - "App.tsx"
Cohesion: 0.07
Nodes (41): App(), getTabFromLocation(), ROUTE_TO_TAB, TAB_ROUTES, ClientKeysTab(), CodeSnippetViewerProps, DashboardTab(), formatTimeAgo() (+33 more)

### Community 9 - "upstreams.ts"
Cohesion: 0.08
Nodes (37): db, upstreamKeys, adjectives, nouns, ANTIGRAVITY_CONFIG, ANTIGRAVITY_DEFAULT_MODELS, buildAntigravityAuthUrl(), exchangeAntigravityCode() (+29 more)

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
Cohesion: 0.05
Nodes (40): 1. Aggregated Usage, Cached Tokens & Latency Metrics, 1. Check Authentication Status, 1. Export SQLite Database, 1. Get Active Optimizer & Security Configuration, 1. List All Upstream Providers, 1. List Client Keys, 1. List Router API Keys, 2. Create Client Key (+32 more)

### Community 22 - "Neko-Router API Documentation"
Cohesion: 0.07
Nodes (29): 1. Installation:, 1. OpenAI Streaming:, 1. Overview & Base URLs, 2. Anthropic Non-Streaming:, 2. Authentication Mechanisms, 2. Usage with Neko-Router `App` Type:, 3. AI Proxy Endpoints, 4. SDK Integration Guides (+21 more)

### Community 23 - "services/proxy.ts"
Cohesion: 0.11
Nodes (43): UpstreamKey, ensureAntigravityAccessToken(), forceRefreshAntigravityToken(), checkClientRateLimit(), incrementClientKeyTokens(), ensureCodexAccessToken(), refreshCodexToken(), transformChatToCodexResponses() (+35 more)

## Knowledge Gaps
- **284 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `5. Router Management APIs` connect `5. Router Management APIs` to `C. Upstream Router Keys Endpoints`, `Neko-Router API Documentation`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `Neko-Router API Documentation` connect `Neko-Router API Documentation` to `5. Router Management APIs`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `plugins`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _284 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._