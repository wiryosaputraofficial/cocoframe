# @cocoframe/database-postgres

Pool-compatible PostgreSQL adapter, transactions, and advisory-locked migrations.

- `createPostgresAdapter(pool)` creates the driver-neutral adapter.
- `openPostgres(pool)` creates a ready-to-use database facade.
- `migratePostgres(database, migrations)` applies ordered idempotent migrations under an advisory lock.
- Structural pool/client/query interfaces avoid a hard dependency on one PostgreSQL driver.

```ts
const database = openPostgres(pool);
const users = await database.run((db) => db.query("SELECT id FROM users WHERE id = $1", [id]));
```

Pass values separately from SQL. Always release clients, rollback failed
transactions, and keep deployed migration IDs immutable. Verify with
`tests/database-postgres.test.ts`.
