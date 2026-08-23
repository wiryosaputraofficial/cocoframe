# Add Database Access

Depend on `@cocoframe/database` at application boundaries and select a concrete
adapter at composition time.

```ts
const database = openPostgres(pool);

const user = await database.run(async (connection) => {
  const result = await connection.query("SELECT id, name FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
});
```

Always bind values separately from SQL. Acquired connections must be released in
all paths, failed transactions must rollback, and transaction support must be
explicit. Keep deployed migration IDs ordered and immutable. Use the advisory-
locked helper for PostgreSQL production migrations.
