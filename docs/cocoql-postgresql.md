# CocoQL PostgreSQL

CocoQL PostgreSQL provides two deliberately separate layers:

1. `@cocoframe/cocoql` validates intent and compiles trusted plans into
   parameterized PostgreSQL SQL.
2. `@cocoframe/database-postgres` owns connection acquisition, transactions,
   affected-row guards, limits, cancellation, retries, telemetry, and migrations.

The supported server matrix is PostgreSQL 14–18. CI runs the real integration
suite against every supported major version.

## Install and connect

The adapter accepts a structural pool and does not force a driver on application
runtime dependencies. The official integration suite uses `pg`:

```sh
npm install pg @cocoframe/cocoql @cocoframe/database-postgres
```

```ts
import { Pool } from "pg";
import { createCocoQLPostgresExecutor } from "@cocoframe/database-postgres";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const executor = createCocoQLPostgresExecutor(pool, {
  acquireTimeoutMs: 5_000,
  queryTimeoutMs: 30_000,
  maximumResultRows: 10_000,
  maximumResultBytes: 10 * 1024 * 1024,
  retryMaximum: 2,
});
```

## Managed read pipeline

`executor.read()` completes this pipeline before it borrows a connection:

```text
source → parse → schema → permission → safety → plan → PostgreSQL compile
       → acquire → BEGIN → statement_timeout → query → limits → COMMIT → release
```

```ts
const result = await executor.read({
  source: `from users
filter status = active
select id,email
sort id asc
take 20`,
  schema,
  permissions,
  safety,
  signal: request.signal,
});
```

Invalid syntax, unauthorized fields or relations, unsafe work, invalid plans,
preview mutations, and forged PostgreSQL extensions acquire zero connections.
Identifiers always come from the trusted schema. Values stay separate as `$1`,
`$2`, and subsequent parameters.

## Native PostgreSQL data and operators

Schema fields support `uuid`, `json`, `jsonb`, `string_array`, `number_array`,
`boolean_array`, and `uuid_array`, in addition to the shared CocoQL field types.

```ts
const schema = defineCocoQLSchema({
  version: "0.1",
  entities: {
    articles: {
      table: "articles",
      fields: {
        id: { type: "uuid" },
        slug: { type: "string", unique: true },
        metadata: { type: "jsonb" },
        tags: { type: "string_array" },
        body: { type: "string", searchConfig: "english" },
      },
    },
  },
});
```

The PostgreSQL dialect compiles:

- `ilike` and `not ilike` to case-insensitive matching;
- JSONB `contains`, `contained_by`, and `has_key`;
- array `contains`, `contained_by`, and `overlaps` with explicit array casts;
- `matches` to `to_tsvector` and `websearch_to_tsquery` using a trusted
  `searchConfig`;
- UUID, JSON/JSONB, and array assignments with explicit casts.

## Advanced reads

Trusted code can attach PostgreSQL-specific options to a validated read:

```ts
const result = await executor.read({
  source,
  schema,
  permissions,
  safety,
  postgres: {
    distinct: true,
    predicate: {
      kind: "any",
      predicates: [activeCondition, recentCondition],
    },
    ctes: [{ name: "eligible_users", plan: eligiblePlan }],
    fromCte: "eligible_users",
    cursor: { field: idField, value: lastId, position: "after" },
    lock: { mode: "update", wait: "skip_locked" },
  },
});
```

Supported options are nested `all`/`any`/`not` predicates, `DISTINCT`, CTEs,
aggregate `HAVING`, unique-field cursor pagination, and `FOR UPDATE`/`FOR SHARE`
with wait, `NOWAIT`, or `SKIP LOCKED`. The compiler rejects incompatible
combinations such as row locks with grouped aggregation or `DISTINCT`.

## Guarded mutations and UPSERT

Writes always execute in a transaction. The actual `rowCount` is checked before
commit; exceeding the confirmed maximum causes a rollback.

```ts
const result = await executor.mutate({
  source: `create users
  id = "44ef34d4-c3ca-4f9a-972f-b5a3cb0f5968"
  email = "ada@example.com"
  profile = "{\"theme\":\"dark\"}"
confirm affected <= 1`,
  schema,
  permissions,
  safety,
  returning: ["id", "email"],
  conflict: {
    fields: ["email"],
    action: "update",
    update: ["profile"],
  },
});
```

`RETURNING` fields need read permission. `ON CONFLICT` targets must be schema
fields declared as `id` or `unique`, and update fields need mutation permission.

## Timeouts, cancellation, retries, and errors

Each operation has an acquisition timeout and a transaction-local PostgreSQL
`statement_timeout`. An aborted `AbortSignal` destroys the checked-out client so
an in-flight query cannot continue and that client cannot return to the pool.

Mutations retry SQLSTATE `40001` (serialization failure) and `40P01` (deadlock)
on a fresh connection, up to `retryMaximum`. Constraint (`23xxx`), availability,
timeout, guard, result-limit, abort, and indeterminate-commit failures map to
`PostgresExecutionError`. Its JSON form excludes SQL, parameters, credentials,
and server detail.

The optional event callback exposes only stable event names, operation,
fingerprint, attempt, durations, row counts, limits, and SQLSTATE:

```ts
createCocoQLPostgresExecutor(pool, {
  onEvent(event) {
    metrics.record(event);
  },
});
```

## Advisory-locked migrations

```ts
const database = openPostgres(pool);

await migratePostgres(database, [
  { id: "001_users", up: "CREATE TABLE users (...)" },
  { id: "002_indexes", up: "CREATE INDEX ..." },
]);
```

`migratePostgres` uses a transaction-scoped advisory lock and stores SHA-256
checksum, tool version, execution time, and legacy-baseline status in
`_fast_migrations`. Applied IDs must remain present and their source is immutable.
Missing history or changed source rolls back with a typed migration error.

## Verification

```sh
npm test
npm run test:postgres   # requires COCOFRAME_POSTGRES_URL
npm run benchmark:cocoql:postgres
npm run check
npm run inspect
```

The integration suite creates an isolated schema, tests real migrations,
CRUD/UPSERT, native types and operators, advanced reads, guard rollback,
statement timeout, AbortSignal cancellation, and pool recovery, then removes the
schema.
