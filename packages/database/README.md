# @cocoframe/database

Small driver-neutral database lifecycle contract.

- `defineDatabaseAdapter(adapter)` preserves a typed adapter contract.
- `createDatabase(adapter)` exposes safe `run`, optional transactions, and close behavior.
- `DatabaseAdapter` requires acquire/release ownership and explicit transaction support.

```ts
const database = createDatabase(adapter);
const rows = await database.run((connection) => query(connection));
```

Every acquired connection is released in a `finally` path. Unsupported
transactions fail explicitly. Query languages, migrations, pooling, and ORM
behavior belong to concrete adapters. Verify with `tests/database.test.ts`.
