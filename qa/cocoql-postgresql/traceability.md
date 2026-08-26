# Traceability: CocoQL PostgreSQL Production Integration

| Source requirement | QA case | Status | Evidence |
| --- | --- | --- | --- |
| cocospec:acceptance-1 | `acceptance-1` | passed | Real integration suite passed on isolated synthetic schemas against PostgreSQL 14.24, 15.19, 16.15, 17.11, and 18.6; deterministic reads, joins, aggregation, UTC dates, sorting, pagination, and null handling also passed compiler/unit coverage. |
| cocospec:acceptance-2 | `acceptance-2` | passed | Unit and real PostgreSQL integration coverage passed for transactional create/update/delete, affected-row guard rollback, RETURNING, and unchanged rows after rejected commits. |
| cocospec:acceptance-3 | `acceptance-3` | passed | Managed-executor negative tests passed with acquisition counters at zero for preview, malformed, unauthorized, unsafe, and forged inputs. |
| cocospec:acceptance-4 | `acceptance-4` | passed | Compiler and integration tests passed for numbered PostgreSQL parameters, schema-owned identifiers, native casts, and SQL-injection-shaped values remaining out of SQL text. |
| cocospec:acceptance-5 | `acceptance-5` | passed | Unit and PostgreSQL 14-18 integration tests passed for statement timeout, AbortSignal cancellation, retryable query/commit failures, indeterminate commit handling, rollback, single release/destroy, and pool recovery. |
| cocospec:acceptance-6 | `acceptance-6` | passed | PostgreSQL 14-18 integration passed for UUID, JSONB, arrays, enums, full-text search, ON CONFLICT, and RETURNING through typed APIs. |
| cocospec:acceptance-7 | `acceptance-7` | passed | Compiler and real integration coverage passed for grouped predicates, HAVING aggregate expressions, DISTINCT, schema-preserving CTEs, unique cursors, and row locks. |
| cocospec:acceptance-8 | `acceptance-8` | passed | Concurrent migration calls passed against PostgreSQL 14-18 with advisory locking; idempotence, missing history, checksum drift rejection, metadata, and legacy baseline tests passed. |
| cocospec:acceptance-9 | `acceptance-9` | passed | Telemetry and typed-error tests passed with bounded metadata and assertions that SQL, parameters, credentials, request source, authorization data, and sensitive values are absent. |
| cocospec:acceptance-10 | `acceptance-10` | passed | Official pg-driver suite passed locally on PostgreSQL 14-18; full repository tests passed 190 with 1 environment-conditional skip, and all 24 packed package/template smoke checks passed without MySQL regression. |
| cocoframe:server-first | `framework-server-first` | passed | Production build and E2E checks passed; changed CocoQL documentation renders useful server HTML without requiring browser JavaScript. |
| cocoframe:accessibility | `framework-accessibility` | passed | Chromium, Firefox, and WebKit E2E coverage passed for semantic content, keyboard behavior, focus, accessible names, 200 percent zoom, forced-colors handling, and responsive documentation expectations. |
| cocoframe:target-reachability | `framework-target-reachability` | passed | Inspect, build, and multi-browser E2E checks passed for changed documentation routes, internal links, anchors, and API/package references. |
| cocoframe:interaction-integrity | `framework-interaction-integrity` | passed | Multi-browser E2E checks passed for accessible names, keyboard activation, visible focus, and link/control action integrity on changed documentation surfaces. |
| cocoframe:responsive | `framework-responsive` | passed | Chromium, Firefox, and WebKit responsive E2E checks passed from 320px through 4K with no horizontal overflow; 28 tests passed and 4 capability-specific skips were expected. |
