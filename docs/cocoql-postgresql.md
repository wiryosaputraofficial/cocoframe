# CocoQL PostgreSQL Dialect 0.1

PostgreSQL consumes the same validated Query Plan and Mutation Plan as MySQL.
Parsing, schema validation, permissions, safety, and preview remain dialect-independent.

## Reads

```ts
const result = compileCocoQLPostgres(source, schema, { now });
```

```sql
SELECT "id", "status"
FROM "orders"
WHERE "status" = $1
LIMIT $2;
```

Values are returned separately in `parameters`. PostgreSQL placeholders are
numbered by their deterministic appearance order. Identifiers are resolved from
the trusted schema and quoted with PostgreSQL double quotes.

Semantic datetime ranges remain ISO UTC strings. Date-only fields use
`YYYY-MM-DD`. PostgreSQL supports `OFFSET` without an artificial limit, so the
dialect does not emit MySQL's unlimited-limit sentinel.

## Guarded mutations

```ts
const result = compileCocoQLMutationPostgres(
  source,
  schema,
  permissions,
  safety,
  { now }
);
```

The result contains PostgreSQL SQL, parameters, and the same
`{ maxAffectedRows, verifyBeforeCommit: true }` guard as MySQL. Preview plans
cannot compile into write SQL.

Compilation never opens a connection. The application or database adapter must
execute the statement in a transaction, check the actual affected rows before
commit, and roll back when the confirmed limit is exceeded.

