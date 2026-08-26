# @cocoframe/database-postgres

Pool-compatible PostgreSQL adapter and managed CocoQL executor for PostgreSQL
14–18.

- `createCocoQLPostgresExecutor(pool)` runs parse, permission, safety, planning,
  parameterized compilation, bounded execution, affected-row guards, retry, and
  sanitized telemetry.
- `createPostgresAdapter(pool)` creates the driver-neutral low-level adapter.
- `openPostgres(pool)` creates the database facade.
- `migratePostgres(database, migrations)` applies checksum-locked migrations
  under a transaction-scoped advisory lock.

```ts
import { Pool } from "pg";
import { createCocoQLPostgresExecutor } from "@cocoframe/database-postgres";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const executor = createCocoQLPostgresExecutor(pool);

const users = await executor.read({
  source: "from users\nselect id,email\ntake 20",
  schema,
  permissions,
  safety,
  signal: request.signal,
});
```

The package deliberately uses structural pool interfaces, so applications own
their driver version. Values are always passed separately from SQL. See
[`docs/cocoql-postgresql.md`](../../docs/cocoql-postgresql.md) for native types,
advanced reads, guarded writes, failures, telemetry, migrations, and verification.
