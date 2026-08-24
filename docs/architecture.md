# Architecture

## Product definition

CocoFrame is a TypeScript web framework with its own component and page
model. It is server-first: a route returns useful HTML without requiring client
JavaScript. Interactivity is added in isolated islands rather than hydrating the
whole document.

## Stable concepts

1. A **component** is a typed function returning a renderable node.
2. A **page** combines `load`, `meta`, and `view` in one module.
3. A **route** is derived from a page filename.
4. An **island** is the opt-in boundary for browser JavaScript.
5. An **adapter** connects the Web Standard handler to a runtime.
6. A **layout** wraps page output and is inherited by directory nesting.
7. A **deferred boundary** streams non-critical content after its fallback.

## Request flow

```text
HTTP request -> runtime adapter -> router -> page.load -> page.meta/page.view
             -> escaped component tree -> complete HTML response
```

## Packages

- `@cocoframe/jsx`: component nodes, escaping, and asynchronous HTML rendering.
- `@cocoframe/router`: method-aware static and parameterized route matching.
- `@cocoframe/core`: page contract, request context, SEO document, and app handler.
- `@cocoframe/server-node`: small Node HTTP adapter.
- `@cocoframe/client`: signals, DOM rendering, island boundaries, and hydration.
- `@cocoframe/schema`: runtime validation, type inference, and serializable contracts.
- `@cocoframe/auth`: Web Crypto signed-cookie session primitives.
- `@cocoframe/database`: driver-neutral connection and transaction lifecycle.
- `@cocoframe/database-sqlite`: official Node SQLite adapter and migrations.
- `@cocoframe/database-postgres`: pool-neutral PostgreSQL transactions and migrations.
- `@cocoframe/security`: CSP, CORS, CSRF, and rate-limit middleware.
- `@cocoframe/observability`: request identity, timing, and structured events.
- `@cocoframe/forms`: schema-backed form state and accessible validation props.
- `@cocoframe/ui`: dependency-light semantic server components and design tokens.
- `@cocoframe/icons`: tree-shakeable, CSP-safe Solar Linear icon components.
- `@cocoframe/cocoql`: versioned, schema-aware query parsing, validation,
  database-independent query planning, UTC semantic date ranges, and
  typed aggregation with parameterized SQL compilation and versioned,
  self-correctable diagnostics, explicit permissions, deterministic safety
  limits, database-free mutation previews, and guarded parameterized MySQL and
  PostgreSQL compilation for AI-generated database work.
- `@cocoframe/server-web`: Fetch export for edge and serverless hosts.
- `@cocoframe/specs`: provider-independent adaptive discovery, versioned product decisions, completeness checks, and deterministic PRD, flow, data-model, acceptance, decision, and task artifacts.
- `@cocoframe/cocoref`: provider-independent visual-reference audits, component reuse decisions, explicit candidate consent, preview/revision state, and approval evidence.
- `@cocoframe/qa`: provider-independent adaptive QA planning, requirement traceability, quality-gate results, defect policy, evidence, and explicit release approval.
- `@cocoframe/agent`: provider-independent MCP discovery and lifecycle contracts plus hash-bound, role-aware, single-use controlled file mutation with confinement, conflict detection, rollback, and sanitized local audit records.
- `@cocoframe/cli`: route discovery, project inspection, and development server.
- `create-cocoframe`: dependency-free project scaffolding with a server-first starter, typed API, and opt-in island.

## Performance invariants

- Static routes use direct map lookup.
- Dynamic patterns are compiled once, never per request.
- Static pages send no application JavaScript.
- Interactive pages load one bootstrap and only their referenced island modules.
- Rendering escapes values in one traversal.
- The JSX renderer yields ordered chunks and the Node adapter honors write
  backpressure instead of buffering complete responses.
- Deferred components resolve independently and may arrive out of order without
  blocking the initial document stream.
- Development-only diagnostics do not enter the production response path.

## SEO invariants

- Every page produces a complete HTML document.
- Title and description have safe defaults and can be overridden by a page.
- Canonical, Open Graph, Twitter Card, robots, and JSON-LD are supported.
- Metadata values use the same escaping rules as visible HTML.
- Status codes remain accurate; an error page never masquerades as HTTP 200.
- A page may declare a static or data-derived `status`; explicit action-render
  statuses take precedence for validation responses.
- SEO-critical content is immediate; deferred boundaries are reserved for
  supplementary content with useful fallbacks.

## AI context budget

Application work should normally require only this document, the target page,
and one relevant package API. `cocoframe inspect` provides the route manifest without
requiring an agent to scan the application tree. Public concepts deliberately
avoid aliases and multiple equivalent lifecycle APIs.

## Browser interaction

An island module uses `defineIsland({ name, setup })`. The server invokes
`setup` once to produce accessible initial HTML and serializes JSON-safe props on
the island boundary. The browser bootstrap dynamically imports only that named
island, mounts direct DOM event listeners, records signal reads, and schedules a
boundary-local re-render when a dependency changes. There is no application-wide
virtual DOM or hydration pass.

An island may declare `enhance(root, props)` when existing server HTML only needs
delegated browser behavior. In that mode the bootstrap preserves the rendered
DOM instead of replacing it, keeping large server-rendered collections out of
the browser bundle while still enabling progressive interaction.

`bind(signal)` is the first fine-grained DOM primitive. It renders the current
value during SSR and subscribes the browser text node directly, avoiding a
replacement of its parent element. Computed bindings subscribe to their current
signal dependencies, update those subscriptions when branches change, and clean
them up when the DOM binding is disposed.

## Deferred streaming

`defer(promise, fallback)` emits a stable boundary immediately. Resolved HTML is
delivered in inert templates and applied by the external `@cocoframe/client/stream`
runtime. Boundaries may finish out of order, preserve escaping rules, and do not
require inline executable scripts. A rejected promise leaves the fallback in
place and marks the boundary without exposing server error details.

## Mutations and caching

A page may declare `action(context)` to handle POST requests at its own URL.
Returning no response triggers a 303 redirect back to the page, preserving the
post/redirect/get pattern. `cache` produces explicit browser and shared-cache
directives. Development pages additionally receive an SSE live-reload client;
production documents never include it.

## Middleware and request state

Global middleware is composed once in declaration order and can short-circuit
with a response. Each middleware may invoke `next()` at most once. Typed
`ContextKey<T>` objects carry request-scoped data without string collisions.
Configuration may declare middleware in `cocoframe.config.ts`, keeping the generated
route entry free of application-specific glue.
Built-in middleware carries a stable ID and appears in `cocoframe inspect` in actual
execution order, keeping the security pipeline visible to developers and AI.

Security middleware modifies headers by wrapping the existing response body, so
streaming is preserved. CORS uses an explicit allowlist or predicate. CSRF
requires a same/trusted origin plus a matching cookie/header or form field for
unsafe methods. Rate limiting requires an application-defined key and bounds its
in-memory key count.

Request IDs are validated before incoming values are trusted, stored in typed
request context, and propagated in the response. Structured request events
contain method, path, status, handler duration, and optional application fields;
they never include request bodies, cookies, or authorization headers by default.

## Data contracts

An API may provide an ID plus input/output schemas. Core validates params,
query, body, and response data at runtime. Input errors are aggregated with
machine-readable paths and return HTTP 400; output contract failures return HTTP
500. The serializable manifest feeds both `cocoframe inspect` and `cocoframe generate`, so
runtime validation, AI context, and client types share one source of truth.
Every registered route is classified as `page`, `action`, `api`, or `system`;
automatic sitemap generation consumes only static `page` entries.
`cocoframe generate` also emits OpenAPI 3.1 from the same contract metadata.

## Styling

Files ending in `.module.css` are compiled to deterministic scoped class names.
The class mapping becomes a JavaScript module while the transformed CSS is
extracted to `/coco-assets/styles.css`. `cocoframe inspect` exposes the mapping without an
AI agent scanning generated output.

Generation writes an exact arbitrary-extension TypeScript declaration next to
each CSS module so invalid class names fail type checking.

## Security and persistence boundaries

Signed sessions use HMAC SHA-256 through Web Crypto, expiry checks, HttpOnly
cookies, and explicit SameSite/Secure policy. This primitive authenticates
session data integrity; applications still own identity proofing and permission
checks.

The database contract owns acquire/release safety and optional transactions.
Connections are released in `finally` paths. Query language, migrations,
pooling, and ORM behavior belong to concrete adapters rather than framework core.
The SQLite adapter serializes access to its single native connection, returns
plain row objects, supports parameter binding, and records idempotent migrations.
The PostgreSQL adapter acquires one pool client per operation, releases it in all
paths, rolls back failed transactions, and serializes migrations across instances
with a transaction-scoped advisory lock.

## Universal clients

Generated clients depend only on Fetch, URL, Headers, and TypeScript types. A
factory binds the base URL, custom Fetch implementation, headers, and credential
policy once. Browser and mobile consumers therefore share the same generated
contract without importing the TSX runtime or server packages.

## Forms and UI

A form controller owns one schema and one typed request-context key. Invalid POST
data is aggregated into field errors, raw string values are retained, and core
rerenders the same page with status 422. Valid submissions return a response or
fall through to the normal 303 redirect behavior. `CsrfField` bridges the
security middleware token into progressive HTML forms.

UI primitives are plain TSX functions with semantic markup and stable class
names. They do not hydrate or ship browser JavaScript. The build detects explicit
`@cocoframe/ui` imports, includes the small token stylesheet once, and lists used
components in `cocoframe inspect`. Direct `@cocoframe/icons/linear/*` imports are
also listed so icon usage remains visible without adding a runtime registry.

## AI-assisted product discovery

CocoSpecs stores one versioned `specs/<feature>/spec.json` source of truth for a
new application feature. Its question set adapts to authentication, OAuth,
roles, persistence, migration, integration, and delivery decisions. The project
snapshot records existing routes, islands, and dependencies so an AI agent can
reuse existing capabilities instead of adding redundant code.

`cocoframe spec generate` renders a PRD, Mermaid user flow and data model,
acceptance criteria, decision log, and implementation tasks only after required
questions are resolved. Generation is reviewable but does not authorize code
changes. Explicit approval moves the canonical spec to `approved`; changing an
answer invalidates approval.

## Reference-driven component approval

CocoRef stores one versioned `refs/<name>/ref.json` source of truth for image-
or website-driven interface work. Its inventory captures `@cocoframe/ui`,
application components, islands, and previously approved candidates. Every visible
requirement is recorded as an explicit reuse or missing decision.

Missing components require user consent before candidate files are created. The
actual temporary TSX candidate is rendered through a local development route; user
feedback reopens that same candidate until approval or cancellation. Approval
promotes the previewed source into `app/components/`. Approval and cancellation
both remove temporary files and routes, and production builds exclude all CocoRef
preview routes.

## AI quality approval

CocoQA stores one versioned `qa/<feature>/qa.json` source of truth after implementation. It requires an approved CocoSpec and can include a completed CocoRef. Adaptive questions make environments, device coverage, safe test data, accessibility, security, performance, and release-blocking policy explicit before checks run.

Acceptance criteria, reference decisions, target reachability, interaction integrity, and CocoFrame's server-first, visual alignment, accessibility, and responsive baselines become traceable required cases. The CLI executes only recognized npm quality scripts and records status, duration, and exit code without persisting raw output. Open defects or any failed required case or gate prevent approval; changing evidence invalidates prior approval.

Agent Bridge serves local MCP over stdio and keeps stdout exclusive to the protocol. Tool registration does not scan the workspace; project data is read only when a tool is called. The CLI injects the existing route, island, and style discovery boundary into the Agent package. Proposed route files are also passed through the CLI's canonical route-pattern parser without being written, avoiding a second route convention and a package dependency cycle.

Read-only inspection never invokes the production builder. Protocol v2 mutation planning requires a workflow binding. User-facing plans re-inspect the workspace, validate an approved CocoSpec, require an explicit visual-reference decision, require a ready CocoRef when referenced, bind component and Design Profile hashes, and verify changed static navigation against existing and proposed routes. Protocol v1 remains read-only.

Mutation planning validates explicit paths and stores proposal content only in active-process memory while persisted records contain relative paths, lifecycle identifiers, counts, and SHA-256 hashes rather than prompts, diffs, URLs, or evidence bodies. Human approval is delivered through HMAC-bound MCP elicitation, a host-only API, or a separate CLI command. Execution revalidates workflow and canonical state, is role-aware, expiring, subset-selectable, conflict-detecting, serialized by an exclusive claim, single-use, and rollback-capable. A completed write explicitly reports when runtime target and visual CocoQA evidence remains required. No generic shell, deletion, Git, package, publish, deploy, database, provider-owned browser automation, or outside-workspace operation exists.

## Documentation architecture

The public documentation keeps `/docs` as a compatible complete guide and routes focused topics through `/docs/<topic>`. Topic pages are server-rendered, canonical, independently linkable, and intentionally smaller so users and AI can load only the relevant lifecycle.

`scripts/api-reference.ts` derives package names, versions, public subpaths, export kinds, signatures, JSDoc summaries, deprecation tags, examples, and source locations from package manifests and TypeScript declarations. It writes one checked-in generated module consumed by `/docs/api-reference`; `npm run docs:check` rejects stale output.

## Build artifacts

Production builds contain the server module, hashed browser assets, extracted
CSS, and `.cocoframe/deploy.json`. `cocoframe start` consumes that manifest and serves
production assets with immutable caching. Generated clients, OpenAPI, and CSS
types are derived artifacts from application source.

Production asset names contain content hashes. The server bundle receives the
resolved bootstrap, stream, stylesheet, and island URLs at build time;
`.cocoframe/assets.json` exposes the same mapping to deployment tooling.
Development output lives separately in `.cocoframe/dev`, preventing generators or a
production build from racing with the active development asset server.

Development diagnostics are also isolated from production. The development
build adds one external stylesheet and one browser module for the error overlay;
neither is emitted into production documents. Server rendering, streamed
rendering, island mounting, unhandled browser failures, and watcher build errors
share the same accessible overlay while production responses keep failure details
private.

## Browser verification

Playwright boots separate development and production servers for end-to-end
verification. Development coverage exercises island mounting and the accessible
runtime-error overlay. Production coverage verifies strict CSP behavior, reactive
islands, server form 422/303 flows, deferred streaming, 404 responses, and clean
browser consoles in Chromium, Firefox, and WebKit. Responsive projects visit the
critical documentation and product pages at 320px, a 390px phone, tablet, laptop,
and 4K viewports while checking horizontal overflow, keyboard reachability, image
loading, and authored aspect ratios.

## Node runtime lifecycle

The Node adapter reads request bodies incrementally and rejects them as soon as
the configured byte limit is crossed. One AbortSignal spans body reading,
application handling, and response streaming. Request timeout and client
disconnect therefore propagate across the full lifecycle.

Forwarded protocol, host, and client chains are ignored unless the direct peer
matches `COCOFRAME_TRUSTED_PROXIES`. Graceful shutdown stops accepting connections,
repeatedly closes newly idle keep-alive connections, drains active responses,
then force-closes only after the configured deadline.

Applications may declare explicit `allowedHosts` in configuration. Production
requests whose URL host is outside that list are rejected with HTTP 421 before
routing or middleware; development intentionally bypasses the check for local
tooling. Wildcards are not accepted.

Liveness reports process availability. Readiness can call an application check
and returns 503 without leaking the underlying failure. Both endpoints disable
caching and appear as system routes in `cocoframe inspect`.

## Non-goals for the first milestone

- Reimplementing a TypeScript parser or JavaScript bundler.
- A database ORM, identity provider, application-wide authorization system, or UI design system.
- Full-page browser hydration or a virtual DOM.
- Production-compatible adapters for every runtime.
