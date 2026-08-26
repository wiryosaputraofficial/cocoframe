# CocoQL PostgreSQL Production Integration

> CocoSpecs v1 · thorough mode · approved

## Summary

Complete and validate CocoQL PostgreSQL support with safe end-to-end execution, real PostgreSQL compatibility tests, production-grade transactions and mutation guards, native PostgreSQL capabilities, and explicit operational boundaries.

## Users and permissions

["Application developer","AI agent with no raw SQL or credential authority","Application service","Database operator","Authorized end user"]

## Success outcome

CocoQL provides end-to-end, production-grade PostgreSQL integration: schema-aware generation, validation, authorization, safety, native PostgreSQL compilation, pooled execution, guarded transactions, migrations, cancellation, observability, typed results and errors, and real PostgreSQL compatibility evidence.

## Entry points

- Programmatic APIs exported by @cocoframe/cocoql.
- The official PostgreSQL executor exported by @cocoframe/database-postgres.
- An official pg Pool with continued support for structurally compatible pools.
- Deployment or startup migration APIs.
- Mutation preview before execution.
- Read-only Agent Bridge inspection, compilation, and preview; database execution requires explicit application authority.
- No automatic database HTTP endpoint or application UI route.

## Happy path

1. Developer defines the CocoQL schema, permissions, safety policy, PostgreSQL pool, and execution policy.
2. The application accepts CocoQL source from a developer or constrained AI agent.
3. CocoQL parses and semantically validates the source.
4. CocoQL applies default-deny permissions and deterministic safety limits before acquiring a connection.
5. A validated plan compiles to PostgreSQL SQL with trusted identifiers and separately bound values.
6. The PostgreSQL executor acquires a pooled client and applies timeout and cancellation.
7. Reads execute and return typed rows and metadata.
8. Mutations execute in a transaction and verify actual affected rows against the approved guard before commit.
9. Failures or guard violations roll back and every path releases the client.
10. Migrations run under an advisory lock with immutable identity and drift detection.
11. Sanitized diagnostics and observability describe the outcome.
12. Real PostgreSQL and packed-package tests prove the supported compatibility contract.

## Alternate and failure paths

- Compile validated CocoQL without opening a database connection.
- Preview a mutation without executing it.
- Execute a read-only query through the managed pool.
- Execute a guarded mutation in an automatically managed transaction.
- Execute multiple operations through one caller-owned transaction or client.
- Use a structurally compatible custom PostgreSQL pool.
- Dry-run or apply ordered migrations.
- Return rows from create, update, and delete.
- Perform explicit ON CONFLICT upserts.
- Use cursor pagination instead of offset pagination.
- Retry eligible serialization failures or deadlocks under an explicit bounded policy.

- Invalid CocoQL returns a structured source error and acquires no connection.
- Permission and safety violations are rejected before execution.
- Pool or connection failures return a typed unavailable error with optional application-controlled retry.
- Timeout or AbortSignal cancellation cancels work, rolls back an active transaction, and releases the client.
- Affected rows above the approved mutation guard roll back and report sanitized actual and maximum counts.
- Constraint violations return typed sanitized database errors without SQL parameters or credentials.
- Serialization failures and deadlocks retry only for eligible operations when an explicit bounded policy permits it.
- Commit failure returns an indeterminate outcome and never reports success.
- Migration checksum drift stops deployment and requires a new immutable migration.
- Unsupported capabilities return an explicit unsupported-feature error and never fall back silently to raw SQL.

## Interface states

- No automatic application UI or database endpoint is introduced by the runtime library.
- Documentation examples cover configuration, compile success, query running, empty results, mutation preview, committed mutation, validation or safety error, connection or timeout error, migration drift, and cancelled execution.

### Accessibility

- The runtime API has no direct user interface. Documentation and any interactive example must satisfy the existing WCAG 2.2 AA baseline, keyboard navigation, visible focus, semantic output, and accessible status and error announcements.

### Responsive behavior

The runtime API is display-independent. PostgreSQL documentation must remain usable without page overflow from 320x568 through 3840x2160, with controlled horizontal scrolling for code blocks.

## Authentication and security

Not applicable.

- Connection strings, passwords, TLS keys, authorization data, query parameters, returned rows, and sensitive CocoQL source must not appear in logs or structured errors.
- Credentials remain server-only.
- Permission policy is default-deny and safety validation completes before connection acquisition.
- AI generates CocoQL but receives no authority for arbitrary raw SQL.
- Identifiers come only from trusted schema and are quoted; values remain separately bound PostgreSQL parameters.
- Mutations require explicit confirmation and a transaction-enforced affected-row guard; preview never executes a write.
- TLS and certificate validation remain application or driver controlled with no insecure CocoFrame default.
- PostgreSQL roles and grants remain required defense in depth; CocoQL permissions do not replace database authorization.
- PostgreSQL errors map to safe typed categories without leaking internal details.

## Data and integrations

### Does this feature use no persistence, existing data, new data, or both existing and new data?

existing-and-new

### Define entities, fields, identifiers, constraints, and relationships needed by this feature.

{"entities":[{"name":"_fast_migrations","fields":[{"name":"id","type":"text","key":"primary","nullable":false},{"name":"checksum","type":"text","key":"none","nullable":false},{"name":"applied_at","type":"timestamptz","key":"none","nullable":false},{"name":"tool_version","type":"text","key":"none","nullable":false},{"name":"execution_ms","type":"bigint","key":"none","nullable":false},{"name":"legacy_baseline","type":"boolean","key":"none","nullable":false}]}],"relationships":[],"constraints":["Migration IDs and checksums are immutable after baseline.","No internal table stores CocoQL source, SQL, parameters, credentials, or returned rows."]}

### Define ownership, retention, deletion, audit, privacy, and backfill behavior for affected data.

["The application owns application data and its retention policy.","CocoQL does not persist query source, compiled SQL, parameters, or results.","Migration metadata is retained for the lifetime of the database and is never automatically deleted.","Checksums use deterministic SHA-256 over the exact migration source.","Existing IDs without checksums receive one legacy baseline backfill; later ID or checksum changes are drift.","Telemetry contains only fingerprints and non-sensitive metadata, with retention controlled by the application's observability provider.","Cancellation, failure, and rollback persist no sensitive payload.","Backup, deletion, legal retention, and privacy requests for application tables remain application responsibilities."]

- The pg package is the officially tested PostgreSQL driver.
- @cocoframe/database-postgres continues to accept structurally compatible pools and may expose pg-specific helpers without coupling the core database contract to one driver.
- Internal integrations include @cocoframe/cocoql, @cocoframe/database, Agent Bridge, CocoDoctor, CocoQA, package smoke, and generated API documentation.
- Timeout and AbortSignal propagate to the driver query.
- Pool unavailability returns a typed error.
- Deadlock and serialization failures may use an explicit bounded retry policy.
- There is no fallback to another database, dialect, or raw SQL.

## Existing project context

No project snapshot was recorded.

## Non-functional requirements

### Which safe events, metrics, traces, and alerts prove the feature is operating correctly?

{"events":["connection acquire start/success/failure","query start/success/failure/cancel","transaction begin/commit/rollback/indeterminate","guard accepted/rejected","retry scheduled/exhausted","migration lock/apply/skip/drift/failure"],"metrics":["pool acquisition duration","query duration and row count","transaction duration","cancellation, timeout, rollback, guard rejection, and retry counts","migration duration and status"],"tracing":["one trace context from compile through release","stable operation fingerprint may be recorded","CocoQL source, SQL text, parameters, credentials, and returned rows are not recorded by default"],"alerts":["pool exhaustion","timeout or error-rate spike","repeated deadlock or serialization failures","indeterminate commit","migration drift or failure"]}

### What latency, payload, concurrency, or browser-performance limits must hold?

{"compileNormalP95Ms":5,"compileAtSafetyLimitMaxMs":50,"executorOverheadP95MsExcludingIo":2,"defaultPoolAcquireTimeoutMs":5000,"defaultQueryTimeoutMs":30000,"defaultRetryMaximum":2,"retryEligibility":["serialization failure","deadlock detected"],"readRequiresTake":true,"defaultMaximumRows":10000,"defaultMaximumResultBytes":10485760,"maximumSourceBytes":65536,"concurrency":"Bounded by the configured PostgreSQL pool; CocoQL creates no second unbounded queue.","cancellation":"Stop lifecycle continuation, roll back active transactions, and release the client as soon as the driver responds.","benchmarking":"Measure compiler and executor overhead separately from PostgreSQL network and server latency."}

## Out of scope

- PostgreSQL server provisioning.
- Credential storage and rotation.
- Backup and point-in-time recovery.
- Replication, failover, sharding, and deployment of connection proxies.
- A database administrator GUI.
- ORM identity maps, lazy loading, and entity change tracking.
- Automatic support for every third-party PostgreSQL extension.
- AI execution of arbitrary raw SQL.
- Destructive migrations without explicit deployment approval.

## Unresolved decisions

All required discovery questions are resolved.
