# CocoFrame Package Catalog

CocoFrame uses small packages with explicit ownership. Install only the
capabilities an application needs. Versions below describe the coordinated
release published on 2026-08-26.

## Application and runtime

| Package | Version | Responsibility |
| --- | ---: | --- |
| [`@cocoframe/jsx`](https://www.npmjs.com/package/@cocoframe/jsx) | `0.0.3` | Typed component nodes, escaping, and async chunk rendering. |
| [`@cocoframe/router`](https://www.npmjs.com/package/@cocoframe/router) | `0.0.3` | Method-aware static, parameterized, and catch-all route matching. |
| [`@cocoframe/core`](https://www.npmjs.com/package/@cocoframe/core) | `0.0.4` | Pages, layouts, APIs, middleware, SEO documents, health, and application dispatch. |
| [`@cocoframe/client`](https://www.npmjs.com/package/@cocoframe/client) | `0.0.4` | Signals, computed values, bindings, islands, hydration, deferred streaming, and development diagnostics. |
| [`@cocoframe/server-node`](https://www.npmjs.com/package/@cocoframe/server-node) | `0.0.3` | Node HTTP adapter, incremental body handling, timeout/abort propagation, proxy trust, and graceful shutdown. |
| [`@cocoframe/server-web`](https://www.npmjs.com/package/@cocoframe/server-web) | `0.0.4` | Fetch-standard export for compatible edge/serverless runtimes. |
| [`@cocoframe/schema`](https://www.npmjs.com/package/@cocoframe/schema) | `0.0.3` | Runtime validation, type inference, transforms, and serializable API contracts. |
| [`@cocoframe/forms`](https://www.npmjs.com/package/@cocoframe/forms) | `0.0.4` | Schema-backed form parsing, retained safe values, errors, and accessible field props. |
| [`@cocoframe/ui`](https://www.npmjs.com/package/@cocoframe/ui) | `0.0.4` | Server-first semantic UI primitives, design tokens, utilities, and charts. |
| [`@cocoframe/icons`](https://www.npmjs.com/package/@cocoframe/icons) | `0.0.3` | Tree-shakeable CSP-safe Solar Linear icon components. |

Local package documentation is indexed in the
[repository package directory](https://github.com/wiryosaputraofficial/cocoframe/tree/main/packages).

## Security, data, and operations

| Package | Version | Responsibility |
| --- | ---: | --- |
| [`@cocoframe/auth`](https://www.npmjs.com/package/@cocoframe/auth) | `0.0.4` | HMAC-signed expiring HttpOnly session-cookie primitives and session middleware. |
| [`@cocoframe/security`](https://www.npmjs.com/package/@cocoframe/security) | `0.0.4` | CSP/security headers, explicit CORS, CSRF, and local rate limiting. |
| [`@cocoframe/observability`](https://www.npmjs.com/package/@cocoframe/observability) | `0.0.4` | Request identity, timing, and structured sanitized events. |
| [`@cocoframe/database`](https://www.npmjs.com/package/@cocoframe/database) | `0.0.3` | Driver-neutral acquire/release and transaction contract. |
| [`@cocoframe/database-sqlite`](https://www.npmjs.com/package/@cocoframe/database-sqlite) | `0.0.3` | Official Node SQLite adapter, parameterized queries, transactions, and migrations. |
| [`@cocoframe/database-postgres`](https://www.npmjs.com/package/@cocoframe/database-postgres) | `0.1.0` | Pool-neutral PostgreSQL transactions, CocoQL execution, limits, cancellation, retries, telemetry, and advisory-locked migrations. |
| [`@cocoframe/cocoql`](https://www.npmjs.com/package/@cocoframe/cocoql) | `0.2.0` | Versioned schema-aware query language, permissions, safety, planning, previews, and parameterized SQL compilation. |

Read [CocoQL PostgreSQL](cocoql-postgresql.md) for the complete PostgreSQL
support contract and [compatibility](compatibility.md) for the supported server
matrix.

## Product engineering and AI

| Package | Version | Responsibility |
| --- | ---: | --- |
| [`@cocoframe/specs`](https://www.npmjs.com/package/@cocoframe/specs) | `0.0.1` | Adaptive product discovery, decisions, completeness, and deterministic review artifacts. |
| [`@cocoframe/ux`](https://www.npmjs.com/package/@cocoframe/ux) | `0.0.1` | Journeys, states, interactions, visual recommendations, PNG evidence, and CocoRef handoff. |
| [`@cocoframe/cocoref`](https://www.npmjs.com/package/@cocoframe/cocoref) | `0.0.1` | Reference audit, component reuse, missing-component consent, candidate previews, and exact-source approval. |
| [`@cocoframe/qa`](https://www.npmjs.com/package/@cocoframe/qa) | `0.1.0` | QA questions, requirement traceability, gates, evidence, defects, and release approval. |
| [`@cocoframe/agent`](https://www.npmjs.com/package/@cocoframe/agent) | `0.1.0` | Provider-independent MCP discovery and controlled role-aware mutation contracts. |
| [`@cocoframe/cli`](https://www.npmjs.com/package/@cocoframe/cli) | `0.1.0` | Development, build, inspect, Doctor, workflow commands, and Agent Bridge executable. |
| [`create-cocoframe`](https://www.npmjs.com/package/create-cocoframe) | `0.0.9` | Dependency-free official application creator and templates. |

CocoFrame Doctor is distributed through `@cocoframe/cli` and uses shared report
contracts from `@cocoframe/agent`; there is no separate Doctor package.

Each product-engineering package also has a focused README in the
[repository package directory](https://github.com/wiryosaputraofficial/cocoframe/tree/main/packages).

## Choose by task

| Need | Start with |
| --- | --- |
| Static server-rendered page | `@cocoframe/core`, `@cocoframe/jsx` |
| Browser interaction | Add `@cocoframe/client` and one island |
| Typed API | Add `@cocoframe/schema`; generate through CLI |
| Progressive form | Add `@cocoframe/forms`; add security middleware for cookie auth |
| Design system | Add `@cocoframe/ui` and direct `@cocoframe/icons/linear/<name>` imports |
| Signed session | Add `@cocoframe/auth`; implement authorization separately |
| PostgreSQL | Add `@cocoframe/database`, `@cocoframe/database-postgres`, and application-selected `pg` |
| AI-safe query intent | Add `@cocoframe/cocoql` and explicit schema/permissions/safety |
| Product discovery | Use `@cocoframe/specs` through `cocoframe spec` |
| Journey and visual preview | Use `@cocoframe/ux` through `cocoframe ux` |
| Reference-driven component work | Use `@cocoframe/cocoref` through `cocoframe ref` |
| Release evidence | Use `@cocoframe/qa` through `cocoframe qa` |
| AI/MCP integration | Use `@cocoframe/agent` through `cocoframe agent` |

## Versioning

Packages version independently according to their public change. Application
templates use exact CocoFrame versions so generated applications begin with a
coordinated set. During the `0.x` phase, read the [changelog](https://github.com/wiryosaputraofficial/cocoframe/blob/main/CHANGELOG.md)
and [compatibility policy](compatibility.md) before upgrading.

Verify installed versions:

```bash
npm ls --depth=0
cocoframe doctor --strict
```
