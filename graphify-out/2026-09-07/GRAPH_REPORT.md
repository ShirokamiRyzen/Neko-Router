# Graph Report - Neko-Router  (2026-09-07)

## Corpus Check
- 51 files · ~46,253 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 489 nodes · 682 edges · 24 communities (20 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- compilerOptions
- package.json
- schema.ts
- rules/graphify.md
- workflows/graphify.md
- 🐱 Neko-Router
- brandkit/SKILL.md
- App.tsx
- compilerOptions
- client/package.json
- compilerOptions
- Analysis & Synthesis Instructions
- docker-entrypoint.sh
- Design System: Taste Standard
- Protocol: Premium Utilitarian Minimalism UI Architect
- 5. Router Management APIs
- plugins
- React + TypeScript + Vite
- client/tsconfig.json
- services/proxy.ts
- Neko-Router API Documentation
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `apiRequest()` - 16 edges
4. `react` - 15 edges
5. `compilerOptions` - 15 edges
6. `proxyOpenAIChatCompletions()` - 14 edges
7. `proxyAnthropicMessages()` - 14 edges
8. `Design System: Taste Standard` - 11 edges
9. `DEFAULT 3 × 3 PANEL SYSTEM` - 10 edges
10. `Analysis & Synthesis Instructions` - 10 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useTheme()`  [EXTRACTED]
  client/src/App.tsx → client/src/hooks/useTheme.ts
- `App()` --calls--> `apiRequest()`  [EXTRACTED]
  client/src/App.tsx → client/src/lib/api.ts
- `ClientKeysTab()` --calls--> `apiRequest()`  [EXTRACTED]
  client/src/components/ClientKeysTab.tsx → client/src/lib/api.ts
- `DashboardTab()` --calls--> `apiRequest()`  [EXTRACTED]
  client/src/components/DashboardTab.tsx → client/src/lib/api.ts
- `DatabaseSettingsTab()` --calls--> `apiRequest()`  [EXTRACTED]
  client/src/components/DatabaseSettingsTab.tsx → client/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (24 total, 4 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.07
Nodes (28): bun, client, dist, ESNext, node_modules, compilerOptions, allowImportingTsExtensions, allowJs (+20 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (30): drizzle-kit, drizzle-orm, elysia, @elysiajs/cors, @elysiajs/jwt, @elysiajs/static, @elysiajs/swagger, dependencies (+22 more)

### Community 2 - "schema.ts"
Cohesion: 0.08
Nodes (39): checkpointWal(), db, initDatabase(), reloadDatabase(), sqlite, ApiKey, apiKeys, ClientKey (+31 more)

### Community 5 - "🐱 Neko-Router"
Cohesion: 0.14
Nodes (13): 1. Local Development, 1. OpenAI SDK (Python), 2. Anthropic Claude SDK (TypeScript / Node), 2. First-Time Setup Flow, 3. cURL Stream Passthrough, API Usage Examples, Docker Deployment, Endpoints Summary (+5 more)

### Community 6 - "brandkit/SKILL.md"
Cohesion: 0.05
Nodes (43): 1. Logo Cover, 1. Monogram + Meaning, 2 × 3 REFERENCE-STYLE LAYOUT, 2. Logo Construction, 2. Product Action, 3. Digital Application, 3. Metaphor Fusion, 4. Brand Essence (+35 more)

### Community 7 - "App.tsx"
Cohesion: 0.08
Nodes (35): App(), ClientKeysTab(), CodeSnippetViewerProps, DashboardTab(), formatTimeAgo(), getProviderTag(), DatabaseSettingsTab(), HeaderProps (+27 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 10 - "client/package.json"
Cohesion: 0.10
Nodes (20): dependencies, clsx, lucide-react, react, react-dom, tailwind-merge, name, private (+12 more)

### Community 11 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

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

### Community 17 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 18 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 21 - "services/proxy.ts"
Cohesion: 0.10
Nodes (42): UpstreamKey, upstreamKeys, proxyRoutes, adjectives, nouns, checkClientRateLimit(), incrementClientKeyTokens(), validateClientKey() (+34 more)

### Community 22 - "Neko-Router API Documentation"
Cohesion: 0.07
Nodes (26): 1. OpenAI Streaming:, 1. Overview & Base URLs, 2. Anthropic Non-Streaming:, 2. Authentication Mechanisms, 3. AI Proxy Endpoints, 4. SDK Integration Guides, 6. Response Codes & Error Handling, A. AI Completions & Proxy Keys (`sk-...`) (+18 more)

### Community 23 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript (+11 more)

## Knowledge Gaps
- **270 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+265 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `5. Router Management APIs` connect `5. Router Management APIs` to `Neko-Router API Documentation`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `Neko-Router API Documentation` connect `Neko-Router API Documentation` to `5. Router Management APIs`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `plugins`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _270 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08069381598793364 - nodes in this community are weakly interconnected._