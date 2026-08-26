# Test Plan: CocoQL PostgreSQL Production Integration

> CocoQA v1 · standard · approved

## Sources

- cocospec: `cocoql-postgresql` (approved) — `specs/cocoql-postgresql/spec.json`

## QA decisions

- **Which environments must this feature pass in?** ["local","CI PostgreSQL 14","CI PostgreSQL 15","CI PostgreSQL 16","CI PostgreSQL 17","CI PostgreSQL 18"]
- **Which browsers, devices, and viewport ranges are required?** ["Chromium","Firefox","WebKit","responsive 320px-4K"]
- **Which fixtures, accounts, roles, and data states are safe to use?** Synthetic records only in a randomized isolated PostgreSQL schema; no credentials or production personal data; cleanup drops only that generated schema.
- **Which failures must block release, and which results may be explicitly waived?** ["Any required gate failure","Any critical or high defect","Migration drift or missing history","Security or authorization failure","PostgreSQL integration failure","No waivers for required coverage"]
- **Which accessibility standard and assistive interactions must be verified?** WCAG 2.2 AA for public documentation; verify keyboard-only operation, visible focus, accessible names, 200% text zoom, forced colors, and no horizontal overflow from 320px through 4K.
- **Which security, authorization, privacy, and abuse cases require negative testing?** ["Malformed CocoQL","Unauthorized entities fields relations and mutation outputs","Unsafe limits and unconfirmed writes","Preview and forged plans","SQL injection attempts","Source and result limit abuse","Abort and timeout behavior","Sanitized telemetry and errors","Migration drift and missing history"]

## Test cases

| Case | Category | Required | Status | Intent | Evidence |
| --- | --- | --- | --- | --- | --- |
| `acceptance-1` | functional | yes | passed | Given valid CocoQL reads, when executed against real PostgreSQL 14, 15, 16, 17, and 18, then filters, explicit nested joins, aggregation, semantic UTC dates, sorting, pagination, null semantics, and typed results behave deterministically. | Real integration suite passed on isolated synthetic schemas against PostgreSQL 14.24, 15.19, 16.15, 17.11, and 18.6; deterministic reads, joins, aggregation, UTC dates, sorting, pagination, and null handling also passed compiler/unit coverage. |
| `acceptance-2` | functional | yes | passed | Given authorized create, update, or delete CocoQL, when executed, then it runs transactionally and rolls back before commit when actual affected rows exceed the confirmed maximum. | Unit and real PostgreSQL integration coverage passed for transactional create/update/delete, affected-row guard rollback, RETURNING, and unchanged rows after rejected commits. |
| `acceptance-3` | functional | yes | passed | Given preview, invalid, unauthorized, unsafe, or forged input, when processed, then no database mutation occurs and no database connection is acquired. | Managed-executor negative tests passed with acquisition counters at zero for preview, malformed, unauthorized, unsafe, and forged inputs. |
| `acceptance-4` | functional | yes | passed | Given PostgreSQL values, when SQL is compiled or executed, then values remain separate numbered parameters and identifiers come only from the trusted schema. | Compiler and integration tests passed for numbered PostgreSQL parameters, schema-owned identifiers, native casts, and SQL-injection-shaped values remaining out of SQL text. |
| `acceptance-5` | functional | yes | passed | Given cancellation, timeout, query failure, commit failure, or guard failure, when execution ends, then the transaction state is safe and the pooled client is released exactly once. | Unit and PostgreSQL 14-18 integration tests passed for statement timeout, AbortSignal cancellation, retryable query/commit failures, indeterminate commit handling, rollback, single release/destroy, and pool recovery. |
| `acceptance-6` | functional | yes | passed | Given supported native PostgreSQL fields and operations, when modeled in CocoQL, then UUID, JSONB, arrays, enums, conflict handling, returning rows, and PostgreSQL search operators compile and execute through explicit typed APIs. | PostgreSQL 14-18 integration passed for UUID, JSONB, arrays, enums, full-text search, ON CONFLICT, and RETURNING through typed APIs. |
| `acceptance-7` | functional | yes | passed | Given advanced reads, when represented by the approved language contract, then grouped boolean filters, HAVING, DISTINCT, CTE or subquery boundaries, cursor pagination, and row locking are validated and safely compiled. | Compiler and real integration coverage passed for grouped predicates, HAVING aggregate expressions, DISTINCT, schema-preserving CTEs, unique cursors, and row locks. |
| `acceptance-8` | functional | yes | passed | Given concurrent production migrations, when multiple instances start, then one advisory-locked migration sequence applies immutable checksummed migrations and drift is rejected. | Concurrent migration calls passed against PostgreSQL 14-18 with advisory locking; idempotence, missing history, checksum drift rejection, metadata, and legacy baseline tests passed. |
| `acceptance-9` | functional | yes | passed | Given execution telemetry or an error, when exposed to applications or AI, then it is typed, bounded, sanitized, and does not reveal credentials or sensitive parameter values. | Telemetry and typed-error tests passed with bounded metadata and assertions that SQL, parameters, credentials, request source, authorization data, and sensitive values are absent. |
| `acceptance-10` | functional | yes | passed | Given the official pg driver and PostgreSQL 14 through 18, when CI and packed-package smoke tests run, then read, mutation, transaction, migration, cancellation, and compatibility suites pass without MySQL regressions. | Official pg-driver suite passed locally on PostgreSQL 14-18; full repository tests passed 190 with 1 environment-conditional skip, and all 24 packed package/template smoke checks passed without MySQL regression. |
| `framework-server-first` | compatibility | yes | passed | Useful server-rendered output exists without browser JavaScript. | Production build and E2E checks passed; changed CocoQL documentation renders useful server HTML without requiring browser JavaScript. |
| `framework-accessibility` | accessibility | yes | passed | Keyboard, focus, labels, errors, and semantic structure satisfy the approved accessibility target. | Chromium, Firefox, and WebKit E2E coverage passed for semantic content, keyboard behavior, focus, accessible names, 200 percent zoom, forced-colors handling, and responsive documentation expectations. |
| `framework-target-reachability` | functional | yes | passed | Every changed internal link, CTA, route, anchor, and API target returns successful content or an intentional redirect; external targets have sanitized provider evidence. | Inspect, build, and multi-browser E2E checks passed for changed documentation routes, internal links, anchors, and API/package references. |
| `framework-interaction-integrity` | accessibility | yes | passed | Every changed link and control has an accessible name, keyboard behavior, visible focus, and an action matching its label. | Multi-browser E2E checks passed for accessible names, keyboard activation, visible focus, and link/control action integrity on changed documentation surfaces. |
| `framework-responsive` | responsive | yes | passed | The feature remains usable across the approved viewport and device range without horizontal overflow. | Chromium, Firefox, and WebKit responsive E2E checks passed from 320px through 4K with no horizontal overflow; 28 tests passed and 4 capability-specific skips were expected. |

## Automated gates

| Gate | Command | Required | Status | Duration ms |
| --- | --- | --- | --- | --- |
| `check` | `npm run check` | yes | passed | 9625 |
| `test` | `npm run test` | yes | passed | 28132 |
| `inspect` | `npm run inspect` | yes | passed | 621 |
| `build` | `npm run build` | yes | passed | 588 |
| `test-e2e` | `npm run test:e2e` | yes | passed | 112809 |
