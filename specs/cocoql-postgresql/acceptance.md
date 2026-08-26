# Acceptance Criteria: CocoQL PostgreSQL Production Integration

- [ ] Given valid CocoQL reads, when executed against real PostgreSQL 14, 15, 16, 17, and 18, then filters, explicit nested joins, aggregation, semantic UTC dates, sorting, pagination, null semantics, and typed results behave deterministically.
- [ ] Given authorized create, update, or delete CocoQL, when executed, then it runs transactionally and rolls back before commit when actual affected rows exceed the confirmed maximum.
- [ ] Given preview, invalid, unauthorized, unsafe, or forged input, when processed, then no database mutation occurs and no database connection is acquired.
- [ ] Given PostgreSQL values, when SQL is compiled or executed, then values remain separate numbered parameters and identifiers come only from the trusted schema.
- [ ] Given cancellation, timeout, query failure, commit failure, or guard failure, when execution ends, then the transaction state is safe and the pooled client is released exactly once.
- [ ] Given supported native PostgreSQL fields and operations, when modeled in CocoQL, then UUID, JSONB, arrays, enums, conflict handling, returning rows, and PostgreSQL search operators compile and execute through explicit typed APIs.
- [ ] Given advanced reads, when represented by the approved language contract, then grouped boolean filters, HAVING, DISTINCT, CTE or subquery boundaries, cursor pagination, and row locking are validated and safely compiled.
- [ ] Given concurrent production migrations, when multiple instances start, then one advisory-locked migration sequence applies immutable checksummed migrations and drift is rejected.
- [ ] Given execution telemetry or an error, when exposed to applications or AI, then it is typed, bounded, sanitized, and does not reveal credentials or sensitive parameter values.
- [ ] Given the official pg driver and PostgreSQL 14 through 18, when CI and packed-package smoke tests run, then read, mutation, transaction, migration, cancellation, and compatibility suites pass without MySQL regressions.
