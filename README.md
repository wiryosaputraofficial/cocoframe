# CocoFrame

Experimental server-first web framework focused on speed, SEO, maintainability,
and compact APIs that are easy for developers and AI agents to understand.

## Design goals

- HTML and SEO metadata are rendered on the server by default.
- Components are plain typed functions using a custom TSX runtime.
- Browser JavaScript is opt-in through isolated interactive components.
- Routes, pages, and APIs follow one predictable convention.
- Framework boundaries use Web Standard `Request` and `Response` objects.

## Documentation

- Run the example and open `/docs` for installation, routing, frontend,
  forms, APIs, security, database, operations, troubleshooting, and the public
  package reference.
- Open `/components` for the complete typed UI catalog, design tokens,
  utility classes, props, and chart variants.
- Open `/icons` to search all 1,246 bundled Solar Linear icons and copy their
  direct import path.
- Open `/cocoql` for the language, schema, permissions, safety, mutations,
  SQL dialects, and Query Plan documentation.

## Page example

```tsx
import { definePage } from "@cocoframe/core";

export default definePage({
  load: () => ({ name: "CocoFrame" }),
  meta: ({ name }) => ({
    title: name,
    description: "A server-first web framework",
  }),
  view: ({ name }) => <h1>Hello from {name}</h1>,
});
```

The repository is currently an architectural MVP, not a production release.
See `docs/architecture.md` for scope and invariants.

## Install from GitHub

Requires Git, npm, and Node.js 24 or newer.

```bash
git clone https://github.com/wiryosaputraofficial/cocoframe.git
cd cocoframe
npm install
npm run dev
```

Open `http://127.0.0.1:3000` after the development server reports that all
routes are loaded. The server watches application files and reloads changes
automatically.

### Create a starter from the workspace

The dependency-free project creator is included in this repository. Until the
public runtime packages are released, create the starter inside the cloned
workspace so npm can resolve the local packages:

```bash
npm run create -- examples/my-app --skip-install
npm install
npm run dev --workspace=my-app
```

The registry command will be `npm create cocoframe@latest my-app` after
the public `@cocoframe/*` distribution packages are available. The creator
supports `--package-manager npm|pnpm|yarn|bun` and `--skip-install`, and
refuses to overwrite a non-empty directory.

Before contributing or deploying, run the complete verification gate:

```bash
npm run check
npm test
npm run inspect
npm run generate
npm run build
```

The production server bundle is written to
`examples/basic/.cocoframe/server.mjs` and can be run with `npm start` after
`npm run build`. CocoFrame is currently consumed from this GitHub workspace;
the creator source is ready, while public `@cocoframe/*` packages are not published yet.

## Current milestone

Implemented: custom typed TSX runtime, safe streaming SSR, static/dynamic
routing, nested layouts, page lifecycle, SEO document generation, JSON APIs,
Node adapter, file-route discovery, Rolldown server/browser builds, reactive
client islands, scoped CSS modules, form actions, cache policies, automatic SEO
endpoints, schema-validated API contracts, generated typed clients, Web Standard
deployment, component streaming boundaries, exact CSS module types, OpenAPI 3.1,
signed-cookie sessions, a database adapter contract, production manifests,
development live reload, SQLite and PostgreSQL adapters, guarded CocoQL reads
and mutations, 80 server-first UI primitives, twelve chart types, 1,246 typed
Solar Linear icons, a dependency-free project creator, tests, and local SSR/HTTP baseline benchmarks.

Planned next: public package distribution and npm publishing, distributed rate-limit
stores, telemetry exporters, CSP nonce/integrity helpers, compression, and
additional deployment adapters. See `/docs#roadmap` for the maintained list.

## Streaming and cache policy

Pages stream by default. Metadata and immediate components can reach the client
while asynchronous components are still resolving.

```tsx
export default definePage({
  cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },
  meta: { title: "Products" },
  view: () => <main><Products /></main>,
});
```

Pages may expose an `action` for progressively enhanced POST forms and an
`error` boundary. Static page routes are included automatically in
`/sitemap.xml`; `/robots.txt` points crawlers to that sitemap.

Slow, non-critical content can stream independently with an accessible fallback:

```tsx
import { defer } from "@cocoframe/core";

const Recommendations = () =>
  defer(loadRecommendations(), <p>Loading recommendations...</p>);
```

Deferred content is swapped by a small external script, so no inline executable
script is required. Keep titles, primary copy, structured data, and other
SEO-critical content outside deferred boundaries.

## Interactive island

```tsx
import { bind, defineIsland, signal } from "@cocoframe/client";

export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => <button onClick={() => count.value++}>{bind(count)}</button>;
  },
});
```

The component is rendered into the initial HTML. Only its island bundle and the
small bootstrap are loaded by the browser. Static pages do not receive the
bootstrap script.

`bind(signal)` updates its text node directly without replacing the surrounding
element. Reading `signal.value` in the view remains available when a complete
island re-render is intentional.

CSS files named `*.module.css` are scoped and extracted automatically:

```tsx
import styles from "./card.module.css";

export const Card = () => <article class={styles.card}>...</article>;
```

## Schema and typed APIs

```ts
import { defineApi } from "@cocoframe/core";
import { schema } from "@cocoframe/schema";

export default defineApi({
  id: "greet-person",
  method: "GET",
  input: {
    params: schema.object({ name: schema.string({ min: 2 }) }),
  },
  output: schema.object({ message: schema.string() }),
  handle: ({ input }) => ({ message: `Hello, ${input.params.name}` }),
});
```

The same schema validates runtime input/output, appears in `cocoframe inspect`, and
generates a typed Fetch client and OpenAPI 3.1 document through `cocoframe generate`.
Schemas support string, number, boolean, literal, enum, union, array, record,
object, optional, dates, and transforms.

The same generation step writes exact declarations for every `*.module.css`
file. Generated clients, OpenAPI, and CSS declarations should not be edited by
hand.

## Auth and database boundaries

`@cocoframe/auth` provides HMAC-signed, expiring, HttpOnly session cookies using Web
Crypto. It is a secure session primitive, not a complete identity, OAuth,
password-hashing, or authorization system.

`@cocoframe/database` provides a small acquire/release and transaction contract so an
application can swap drivers without coupling framework core to an ORM. Official
SQLite and PostgreSQL adapters provide ordered migrations; schema ownership and
migration content remain application concerns.

`@cocoframe/database-sqlite` is the first official adapter. It uses Node's built-in
SQLite driver, parameterized queries, serialized connection access, transactions,
and ordered idempotent migrations:

```ts
import { openSqlite } from "@cocoframe/database-sqlite";

const database = openSqlite({ filename: "app.db" });
const users = await database.run((db) =>
  db.all<{ id: number; name: string }>("SELECT id, name FROM users"),
);
```

## Configuration and middleware

Application-wide settings live in one predictable file:

```ts
// cocoframe.config.ts
import { defineConfig } from "@cocoframe/core";

export default defineConfig({
  language: "id",
  siteName: "My App",
  openapi: { title: "My App API", version: "1.0.0" },
  middleware: [requestLogger, sessionLoader, protectAdmin],
});
```

Middleware receives the typed request context and `next`. A `ContextKey<T>`
shares request-scoped values without global variables or string-key collisions.
`@cocoframe/auth` includes session-loading and route-selective protection middleware.

## Universal web and mobile client

The generated client uses only Fetch standards. Its factory accepts a custom
Fetch implementation, headers, and credential policy:

```ts
const api = createCocoFrameClient({
  baseUrl: "https://api.example.com",
  headers: { authorization: `Bearer ${token}` },
  fetch: mobileFetch,
});

const health = await api.health();
```

This keeps one API contract for SSR web, browser islands, React Native,
Capacitor, and other mobile runtimes without coupling them to the frontend
component renderer.

Web Standard deployments can export `webHandler(app)` from `@cocoframe/server-web`;
the Node adapter remains available for traditional servers. `cocoframe build` writes
a `.cocoframe/deploy.json` manifest consumed by `cocoframe start` and deployment tooling.

Run `npm run benchmark:http` for a sequential localhost end-to-end baseline in
addition to the renderer-only `npm run benchmark` measurement.

## Security and observability

`@cocoframe/security` provides composable middleware for CSP and browser hardening,
explicit-origin CORS, double-submit CSRF protection, and bounded in-memory rate
limiting. The default CSP permits same-origin island and streaming modules while
rejecting inline executable scripts.

```ts
import { cors, csrfProtection, rateLimit, securityHeaders } from "@cocoframe/security";

const middleware = [
  securityHeaders(),
  cors({ origins: ["https://mobile.example"] }),
  csrfProtection(),
  rateLimit({ limit: 100, windowMs: 60_000, key: ({ request }) => authenticatedUserId(request) }),
];
```

Rate-limit keys must come from verified identity or trusted infrastructure. The
framework deliberately does not trust `X-Forwarded-For` by default. The bundled
store is per-process; distributed deployments should provide a shared limiter.

`@cocoframe/observability` adds validated request IDs, response propagation, handler
timing, and structured JSON events. Custom writers can forward those events to
the application's logging or telemetry system without coupling core to a vendor.

`@cocoframe/database-postgres` accepts a structurally compatible pool, so common
PostgreSQL drivers can be injected without becoming a framework dependency. It
provides safe release, transaction rollback, advisory-locked migrations, and
parameter arrays.

Use `npm run benchmark:http:concurrent` for the concurrent localhost baseline.

## Production runtime

The Node adapter limits request bodies, aborts timed-out handlers and streams,
derives forwarded identity only from configured trusted proxies, and supports
graceful connection draining. The CLI installs `SIGINT`/`SIGTERM` handlers for
development and production servers.

Runtime settings use explicit environment variables:

- `COCOFRAME_MAX_BODY_BYTES` (default `1048576`)
- `COCOFRAME_REQUEST_TIMEOUT_MS` (default `30000`)
- `COCOFRAME_TRUSTED_PROXIES` (comma-separated direct proxy addresses)
- `COCOFRAME_SHUTDOWN_DELAY_MS` (default `0`)
- `COCOFRAME_SHUTDOWN_TIMEOUT_MS` (default `10000`)

Every app exposes `/_health/live` and `/_health/ready`. A custom readiness
function can check database or dependency state through `cocoframe.config.ts`; set
`health: false` only when the deployment platform supplies equivalent probes.

Production browser entrypoints, CSS, and island modules use content-hashed file
names. `.cocoframe/assets.json` maps logical assets to URLs, while development keeps
stable names for fast rebuilds under `.cocoframe/dev`. The separate directories allow
generation and production builds to run without replacing assets served by the
development watcher.

## Forms and UI components

`@cocoframe/forms` connects one `@cocoframe/schema` definition to HTML form parsing,
request-scoped values, field errors, accessible ARIA props, and server rerendering
with HTTP 422. Successful mutations continue to use POST/Redirect/GET.

```tsx
const profileForm = createForm(schema.object({
  name: schema.string({ min: 2 }),
}));

export default definePage({
  action: profileForm.action(async (input) => saveProfile(input)),
  view: (_data, context) => {
    const state = profileForm.state(context);
    const name = profileForm.field("name", state);
    return <form method="post"><Input {...name} /></form>;
  },
});
```

`CsrfField` reads the token installed by `csrfProtection` and emits a hidden
field. Forms remain fully functional without JavaScript. Sensitive fields can be
declared through `createForm(schema, { sensitiveFields: [...] })`; common secret,
token, and password names are never retained after validation errors.

`@cocoframe/ui` provides 80 semantic primitives and ready-made patterns for
layout, typography, forms, navigation, overlays, feedback, data display, and
AI/chat. The Chart primitive supports line, area, grouped/horizontal/stacked bar,
pie, doughnut, polar-area, radar, scatter, bubble, and mixed SVG charts. Static
components render on the server without browser runtime; genuine interaction is
opted into through an island. The package ships mobile-first design tokens,
component styles, and a collision-safe `c-` prefixed utility layer.

Used components appear in `cocoframe inspect`, keeping the frontend surface
visible to developers and AI agents. The live `/components` catalog is the
source of truth for props, variants, accessibility behavior, and examples.

`@cocoframe/icons` bundles 1,246 Solar Linear icons as individual typed server
components. Direct subpath imports keep the dependency surface and production
bundle small:

```tsx
import HomeIcon from "@cocoframe/icons/linear/home";

export const HomeLink = () => <a href="/"><HomeIcon size={20} /> Home</a>;
```

Icons are decorative by default and accept `label` for a standalone accessible
name. See `packages/icons/THIRD_PARTY_NOTICE.md` for Solar Icon Set attribution.
