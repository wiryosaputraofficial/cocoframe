# Deploying CocoFrame

CocoFrame production builds are self-describing Node server bundles with hashed
browser assets. The deployment boundary is the generated Web Standard
application plus a small Node HTTP adapter.

## Build contract

```bash
npm ci
npm run check
cocoframe doctor --deep --strict
npm run build
```

Production output:

```text
.cocoframe/
├─ server.mjs              production application bundle
├─ assets.json             versioned logical-to-hashed asset map
├─ deploy.json             versioned target/server/public manifest
└─ public/
   ├─ coco-assets/         hashed JS and CSS
   └─ ...                  copied application public files
```

Do not hand-edit this directory. Rebuild from reviewed source.

## Start the Node server

```bash
HOST=0.0.0.0 PORT=3000 npm start
```

`cocoframe start` imports `.cocoframe/server.mjs`, serves generated public
assets, and uses the production manifest. It does not rediscover or compile
application source.

## Environment

```bash
HOST=0.0.0.0
PORT=3000
COCOFRAME_MAX_BODY_BYTES=1048576
COCOFRAME_REQUEST_TIMEOUT_MS=30000
COCOFRAME_TRUSTED_PROXIES=10.0.0.10,10.0.0.11
COCOFRAME_SHUTDOWN_DELAY_MS=0
COCOFRAME_SHUTDOWN_TIMEOUT_MS=10000
```

Configure secrets such as `DATABASE_URL` through the deployment platform. Do
not expose them to islands, generated clients, readiness output, or logs.

## Required production configuration

```ts
import { defineConfig } from "@cocoframe/core";

export default defineConfig({
  language: "en",
  siteName: "My App",
  siteUrl: "https://app.example.com",
  allowedHosts: ["app.example.com"],
  health: {
    readiness: async () => await dependenciesReady(),
  },
  middleware: [requestIdentity, securityHeaders, cors, csrf, rateLimit],
});
```

Production hosts and credentialed CORS origins must be explicit. Apply CSRF to
cookie-authenticated unsafe requests. Authorization remains application-owned.

## Reverse proxy trust

By default, forwarded host, protocol, and client IP are not trusted. If the
application is behind a reverse proxy, list only direct proxy addresses in
`COCOFRAME_TRUSTED_PROXIES`.

```bash
COCOFRAME_TRUSTED_PROXIES=10.0.0.10,10.0.0.11 npm start
```

Do not configure `*`. Ensure the proxy replaces rather than appends untrusted
forwarded headers and that the application cannot be reached around the proxy.
Rate-limit keys must come from verified identity or correctly trusted proxy
data.

## Health and orchestration

Default endpoints:

| Endpoint | Meaning | Response rule |
| --- | --- | --- |
| `/_health/live` | Process can serve requests. | Availability only. |
| `/_health/ready` | Instance may receive new traffic. | `503` when not ready; no dependency details. |

Point liveness and readiness probes at their matching endpoints. Do not use
liveness to represent a temporary database outage; doing so can create restart
loops.

## Graceful shutdown

On `SIGINT` or `SIGTERM`, the Node runtime:

1. marks readiness false;
2. optionally waits `COCOFRAME_SHUTDOWN_DELAY_MS` for routing convergence;
3. drains active requests;
4. closes remaining connections at `COCOFRAME_SHUTDOWN_TIMEOUT_MS`;
5. records a failing process exit when forced closure was required.

Set the platform termination grace period longer than shutdown delay plus
shutdown timeout.

## Assets and caching

Production island, client, stream, and CSS filenames include content hashes.
The server resolves them through `assets.json` and serves framework build assets
with immutable caching. HTML and application public assets keep their own
response policies.

Never refer to an assumed production filename. Use runtime-rendered asset URLs
or the generated manifest.

## Database migrations

Run migrations as a controlled release step before sending traffic to code that
requires the new schema. PostgreSQL deployments use `migratePostgres`, which
acquires a transaction-scoped advisory lock and verifies immutable checksums.

Rules:

- migrations are ordered and uniquely identified;
- deployed migrations remain present and immutable;
- values in application queries remain parameterized;
- the migration principal has only the privileges required for migration;
- application startup does not race uncontrolled migration execution across
  replicas.

See [CocoQL PostgreSQL](cocoql-postgresql.md#advisory-locked-migrations).

## Web Standard adapters

`@cocoframe/server-web` exports the application through Fetch-standard
`Request` and `Response` for hosts that provide a compatible runtime. The
generated client is also Fetch-standard and UI-framework-independent.

Validate a non-Node adapter against streaming, AbortSignal propagation, body
limits, host/proxy semantics, assets, health, and status codes. Do not infer
support merely because a platform exposes a global `fetch`.

## Release checklist

```bash
npm ci
npm run check
npm test
npm run inspect
npm run generate        # when contracts or CSS modules changed
cocoframe doctor --deep --strict
npm run build
npm run test:e2e        # browser/runtime/visual/security changes
```

Then verify:

- canonical CocoSpec and applicable CocoUX/CocoRef sources are approved;
- CocoQA is approved with passing required gates and no open defect;
- generated diffs contain no machine paths or secrets;
- `allowedHosts`, CORS, CSRF, CSP, proxy trust, and authorization are reviewed;
- health probes and graceful shutdown match platform timings;
- migrations were reviewed and can be rolled forward safely;
- the artifact being deployed is the artifact that passed the gates.

## Rollback

Keep the previously verified application artifact available. Roll back
application code independently only when the database change remains backward
compatible. CocoFrame migrations are intentionally forward-only and immutable;
do not rewrite an applied migration to simulate rollback.

After rollback, verify readiness, critical routes, background work, and database
compatibility, then record the incident and new evidence in CocoQA.
