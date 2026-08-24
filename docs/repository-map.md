# CocoFrame Repository Map

This map routes a task to its owning source, public boundary, and focused test.
It describes the current repository layout; `docs/architecture.md` remains the
source for system-wide design and invariants.

## Repository landmarks

| Path | Ownership |
| --- | --- |
| `packages/` | The 22 publishable framework and creator packages. |
| `examples/basic/` | Reference application, live documentation, component catalog, icon explorer, and integration fixture. |
| `tests/*.test.ts` | Node unit and integration tests, run serially. |
| `tests/e2e/` | Development, production-browser, and responsive Playwright coverage. |
| `benchmarks/` | Renderer, sequential HTTP, and concurrent HTTP baselines. |
| `scripts/` | Package staging/packing/smoke tests and E2E production-server support. |
| `docs/` | Architecture, AI routing, and detailed CocoQL specifications. |
| `.cocoframe/` | Root build and test output; derived, not hand-authored framework source. |

The root npm workspace includes `packages/*` and `examples/*`. TypeScript is
strict, uses NodeNext modules, permits TypeScript extension imports in source,
and uses `@cocoframe/jsx` as the TSX runtime.

## Package ownership

| Package | Public entry point and responsibility | Primary verification |
| --- | --- | --- |
| `@cocoframe/jsx` | `packages/jsx/src/index.ts`; component nodes, escaping, ordered async rendering, and bindings. JSX runtime subpaths are `jsx-runtime.ts` and `jsx-dev-runtime.ts`. | `tests/jsx.test.ts` |
| `@cocoframe/router` | `packages/router/src/index.ts`; normalized, method-aware static and compiled dynamic route matching. | `tests/router.test.ts` |
| `@cocoframe/core` | `packages/core/src/index.ts`; page/API/config contracts, typed request context, middleware dispatch, SEO documents, actions, cache policy, system routes, and `CocoFrameApp.fetch`. | `tests/core.test.ts` |
| `@cocoframe/server-node` | `packages/server-node/src/index.ts`; Node HTTP to Web Request/Response adapter, limits, timeout, proxy trust, response backpressure, and graceful shutdown. | `tests/server-node.test.ts` |
| `@cocoframe/server-web` | `packages/server-web/src/index.ts`; minimal Fetch-host export. | `tests/server-web.test.ts` |
| `@cocoframe/specs` | `packages/specs/src/index.ts`; adaptive product discovery, versioned answers, completeness and approval checks, and deterministic review artifacts. | `tests/specs.test.ts` |
| `@cocoframe/cocoref` | `packages/cocoref/src/index.ts`; visual-reference inventory audits, reuse and missing decisions, consent-gated candidates, preview/revision state, and approval artifacts. | `tests/cocoref.test.ts` |
| `@cocoframe/qa` | `packages/qa/src/index.ts`; adaptive QA decisions, traceable cases, allow-listed quality gates, defects, evidence, and explicit release approval. | `tests/qa.test.ts` |
| `@cocoframe/agent` | `packages/agent/src/index.ts`, `lifecycle.ts`, `mutation.ts`, and `stdio.ts`; provider-independent MCP discovery, lifecycle preparation, hash-bound approval, controlled file writes, rollback, audit, confinement, and diagnostics. | `tests/agent.test.ts`, `tests/agent-lifecycle.test.ts`, `tests/agent-mutation.test.ts` |
| `@cocoframe/client` | `packages/client/src/index.ts`; signals, computed values, bindings, island definitions, and asset configuration. `bootstrap.ts`, `stream.ts`, and `dev.ts` are browser entry points. | `tests/client.test.ts`, `tests/e2e/*.spec.ts` |
| `@cocoframe/schema` | `packages/schema/src/index.ts`; runtime schemas, inference, validation issues, transforms, and serializable schema contracts. | `tests/schema.test.ts` |
| `@cocoframe/forms` | `packages/forms/src/index.ts`; schema-backed action parsing, retained values, accessible field props, HTTP 422 rerendering, sensitive-value filtering, and `CsrfField`. | `tests/forms.test.ts`, production form E2E |
| `@cocoframe/security` | `packages/security/src/index.ts`; security headers/CSP, explicit CORS, double-submit CSRF, and bounded local rate limiting. | `tests/security.test.ts`, production CSP/form E2E |
| `@cocoframe/auth` | `packages/auth/src/index.ts`; Web Crypto signed sessions, cookie policy, session context, and protection middleware. | `tests/auth.test.ts` |
| `@cocoframe/database` | `packages/database/src/index.ts`; driver-neutral acquire/release and transaction lifecycle. | `tests/database.test.ts` |
| `@cocoframe/database-sqlite` | `packages/database-sqlite/src/index.ts`; built-in SQLite adapter, serialized connection access, transactions, and migrations. | `tests/database-sqlite.test.ts` |
| `@cocoframe/database-postgres` | `packages/database-postgres/src/index.ts`; pool-compatible PostgreSQL operations, transactions, release safety, and advisory-locked migrations. | `tests/database-postgres.test.ts` |
| `@cocoframe/observability` | `packages/observability/src/index.ts`; request IDs, timing, response propagation, and structured safe events. | `tests/observability.test.ts` |
| `@cocoframe/ui` | `packages/ui/src/index.ts`, `advanced.ts`, `patterns.ts`, and `chart.ts`; semantic server-first primitives, patterns, charts, styles, and utilities. `syntax-highlighter.ts` is also exported as `@cocoframe/ui/syntax`. | `tests/ui.test.ts`, `/components`, responsive E2E |
| `@cocoframe/icons` | `packages/icons/src/index.ts` plus direct `linear/*` subpaths; generated typed Solar Linear server components and catalog metadata. | `tests/icons.test.ts`, `/icons` |
| `@cocoframe/cocoql` | `packages/cocoql/src/index.ts` over lexer/parser/semantic/planning/safety/permission/compiler modules; guarded, schema-aware reads and mutations. | `tests/cocoql.test.ts`, `docs/cocoql-*.md`, `/cocoql` |
| `@cocoframe/cli` | `packages/cli/src/main.ts`, `project.ts`, and `inspect-readonly.ts`; discovery, read-only Agent Bridge adapter, inspect, dev/start, build, generation, asset serving, and project integration. | `tests/project.test.ts`, `tests/agent.test.ts` |
| `create-cocoframe` | `packages/create-cocoframe/src/cli.js`; dependency-free project creation from starter, marketing, dashboard, or documentation templates. | `tests/create-cocoframe.test.ts` |

Most runtime packages deliberately use one `src/index.ts`. Start at that public
file rather than searching for an internal layer that does not exist. CocoQL,
UI, client, Agent Bridge, CLI, and icons are the intentional multi-file exceptions.

## Reference application

`examples/basic` is both executable documentation and an integration target:

- `cocoframe.config.ts` demonstrates language/site metadata, OpenAPI metadata,
  ordered request-ID/security/CSRF middleware, and application stylesheets.
- `app/routes/*.page.tsx` demonstrates page lifecycle, layouts, cache policies,
  streaming, forms, error boundaries, and product documentation.
- `app/routes/**/*.route.ts` demonstrates stable API contracts validated with
  `@cocoframe/schema`.
- `app/islands/*.island.tsx` demonstrates setup-based islands, enhancement,
  signals, computed values, and fine-grained binding.
- `app/components/` contains reusable server components and CSS module usage.
- `app/generated/` contains generated clients and OpenAPI output; do not edit it
  by hand.
- `public/` contains source public assets copied into build output.

For a user-facing feature, inspect the framework package, its focused unit test,
and one `examples/basic` usage. Do not treat the example implementation as a
framework API unless the package public entry point supports it.

## High-value public symbols

- Core: `definePage`, `defineApi`, `defineLayout`, `defineConfig`,
  `defineMiddleware`, `createContextKey`, `withLayouts`, `rerender`, `json`,
  `redirect`, and `CocoFrameApp`.
- Client: `defineIsland`, `signal`, `computed`, `bind`, and
  `configureIslandAssets`.
- Forms: `createForm` and `CsrfField`.
- CLI project layer: `discoverRoutes`, `discoverIslands`, `discoverStyles`,
  `discoverUiComponents`, `discoverIcons`, `buildProject`, `generateClient`,
  `generateCssTypes`, and `generateOpenApi`.

Search the owning entry point for the complete current types before using or
changing any symbol.

## Documentation ownership

- System-wide invariants: `docs/architecture.md`.
- AI reading and change protocol: `docs/ai-context.md`.
- Request behavior: `docs/request-lifecycle.md`.
- Derived files: `docs/generated-artifacts.md`.
- Test selection: `docs/testing.md`.
- CocoQL language and safety contracts: `docs/cocoql-*.md`.
- Public documentation center: `examples/basic/app/routes/docs.page.tsx`, `app/routes/docs/[topic].page.tsx`, and `app/components/docs-topics.tsx`.
- Generated package API reference: `scripts/api-reference.ts` → `examples/basic/app/generated/api-reference.ts` → live `/docs/api-reference`.
- The original `/docs` complete guide and anchors remain compatible while focused `/docs/<topic>` pages provide smaller human and AI context.
- UI and icon public examples: live `/components` and `/icons`, backed by their corresponding example routes and islands.

If a public contract changes, update the owning source and test first, then all
affected architecture, public documentation, examples, and generated outputs.
