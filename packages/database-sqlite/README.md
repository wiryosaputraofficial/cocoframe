# @cocoframe/database-sqlite

Official adapter for Node's built-in SQLite driver.

- `createSqliteAdapter(options)` creates a driver-neutral adapter.
- `openSqlite(options)` opens the database facade.
- `SqliteConnection` exposes parameterized `run`, `get`, `all`, and migration behavior.

```ts
const database = openSqlite({ filename: "app.db" });
const users = await database.run((db) => db.all("SELECT id FROM users WHERE active = ?", 1));
```

Access to the native connection is serialized. Use parameter binding, preserve
ordered immutable migration IDs after deployment, and close the database during
shutdown. Verify with `tests/database-sqlite.test.ts`.
