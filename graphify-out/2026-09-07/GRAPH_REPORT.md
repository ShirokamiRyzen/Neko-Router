# Graph Report - Neko-Router  (2026-09-07)

## Corpus Check
- 28 files · ~24,245 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 336 nodes · 479 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f2e44936`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compilerOptions
- package.json
- schema.ts
- rules/graphify.md
- workflows/graphify.md
- Neko-Router
- brandkit/SKILL.md
- router.ts
- services/proxy.ts
- VISUAL MODES
- Analysis & Synthesis Instructions
- Design System: Taste Standard
- Protocol: Premium Utilitarian Minimalism UI Architect
- 5. Router Management APIs
- Neko-Router API Documentation

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `proxyOpenAIChatCompletions()` - 14 edges
3. `proxyAnthropicMessages()` - 14 edges
4. `Design System: Taste Standard` - 11 edges
5. `DEFAULT 3 × 3 PANEL SYSTEM` - 10 edges
6. `Analysis & Synthesis Instructions` - 10 edges
7. `VISUAL MODES` - 9 edges
8. `Protocol: Premium Utilitarian Minimalism UI Architect` - 9 edges
9. `Stitch Design Taste — Semantic Design System Skill` - 9 edges
10. `getOptimizationSettings()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `proxyOpenAIChatCompletions()` --calls--> `getApiKeyForUpstream()`  [EXTRACTED]
  src/services/proxy.ts → src/services/router.ts
- `proxyOpenAIChatCompletions()` --calls--> `selectUpstreamKey()`  [EXTRACTED]
  src/services/proxy.ts → src/services/router.ts
- `proxyAnthropicMessages()` --calls--> `getApiKeyForUpstream()`  [EXTRACTED]
  src/services/proxy.ts → src/services/router.ts
- `proxyAnthropicMessages()` --calls--> `selectUpstreamKey()`  [EXTRACTED]
  src/services/proxy.ts → src/services/router.ts
- `UpstreamSelectionResult` --references--> `UpstreamKey`  [EXTRACTED]
  src/services/router.ts → src/db/schema.ts

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.07
Nodes (28): bun, client, dist, ESNext, node_modules, src/**/*, compilerOptions, allowImportingTsExtensions (+20 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (28): drizzle-kit, drizzle-orm, elysia, @elysiajs/cors, @elysiajs/eden, @elysiajs/jwt, @elysiajs/swagger, dependencies (+20 more)

### Community 2 - "schema.ts"
Cohesion: 0.07
Nodes (41): checkpointWal(), initDatabase(), initTablesSync(), reloadDatabase(), sqlite, ApiKey, apiKeys, ClientKey (+33 more)

### Community 5 - "Neko-Router"
Cohesion: 0.14
Nodes (13): 1. Local Development, 1. OpenAI SDK (Python), 2. Anthropic Claude SDK (TypeScript / Node), 3. cURL Stream Passthrough, API Usage Examples, Docker Deployment, Endpoints Summary, Features (+5 more)

### Community 6 - "brandkit/SKILL.md"
Cohesion: 0.06
Nodes (34): 1. Logo Cover, 1. Monogram + Meaning, 2 × 3 REFERENCE-STYLE LAYOUT, 2. Logo Construction, 2. Product Action, 3. Digital Application, 3. Metaphor Fusion, 4. Brand Essence (+26 more)

### Community 7 - "router.ts"
Cohesion: 0.14
Nodes (19): db, UpstreamKey, upstreamKeys, adjectives, nouns, proxyOpenAIModels(), getActiveUpstreamKeys(), getApiKeyForUpstream() (+11 more)

### Community 9 - "services/proxy.ts"
Cohesion: 0.21
Nodes (22): checkClientRateLimit(), incrementClientKeyTokens(), applyRTKCompression(), checkHttpsRequirement(), computeCacheKey(), getCachedResponse(), getOptimizationSettings(), isHttpsRequest() (+14 more)

### Community 10 - "VISUAL MODES"
Cohesion: 0.22
Nodes (9): Cultural / Experimental, Dark Developer / Builder, Dark Nature / Calm System, Dark Product / Operator, Dark Security / Threat Intelligence, Light Editorial / Compliance, Luxury / Beauty / Fashion, VISUAL MODES (+1 more)

### Community 12 - "Analysis & Synthesis Instructions"
Cohesion: 0.11
Nodes (18): 1. Define the Atmosphere, 2. Map the Color Palette, 3. Establish Typography Rules, 4. Define the Hero Section, 5. Describe Component Stylings, 6. Define Layout Principles, 7. Define Responsive Rules, 8. Encode Motion Philosophy (+10 more)

### Community 14 - "Design System: Taste Standard"
Cohesion: 0.13
Nodes (14): 1. Visual Theme & Atmosphere, 2. Color Palette & Roles, 3. Typography Rules, 4. Component Stylings, 5. Hero Section, 6. Layout Principles, 7. Responsive Rules, 8. Motion & Interaction (Code-Phase Intent) (+6 more)

### Community 15 - "Protocol: Premium Utilitarian Minimalism UI Architect"
Cohesion: 0.20
Nodes (9): 1. Protocol Overview, 2. Absolute Negative Constraints (Banned Elements), 3. Typographic Architecture, 4. Color Palette (Warm Monochrome + Spot Pastels), 5. Component Specifications, 6. Iconography & Imagery Directives, 7. Subtle Motion & Micro-Animations, 8. Execution Protocol (+1 more)

### Community 16 - "5. Router Management APIs"
Cohesion: 0.05
Nodes (38): 1. Aggregated Usage, Cached Tokens & Latency Metrics, 1. Check Authentication Status, 1. Export SQLite Database, 1. Get Active Optimizer & Security Configuration, 1. List All Upstream Providers, 1. List Client Keys, 1. List Upstream Keys, 2. Add Upstream Key (+30 more)

### Community 22 - "Neko-Router API Documentation"
Cohesion: 0.07
Nodes (29): 1. Installation:, 1. OpenAI Streaming:, 1. Overview & Base URLs, 2. Anthropic Non-Streaming:, 2. Authentication Mechanisms, 2. Usage with Neko-Router `App` Type:, 3. AI Proxy Endpoints, 4. SDK Integration Guides (+21 more)

## Knowledge Gaps
- **194 isolated node(s):** `name`, `module`, `type`, `private`, `dev` (+189 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `5. Router Management APIs` connect `5. Router Management APIs` to `Neko-Router API Documentation`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Neko-Router API Documentation` connect `Neko-Router API Documentation` to `5. Router Management APIs`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `module`, `type` to the rest of the system?**
  _194 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07477288609364081 - nodes in this community are weakly interconnected._
- **Should `Neko-Router` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._