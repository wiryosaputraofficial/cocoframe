# @cocoframe/cocoql

Versioned, schema-aware query and mutation tooling for deterministic AI-generated
database work.

The public entry exports the lexer/parser, canonical formatter, schema and
permission definitions, semantic validation, safety enforcement, query/mutation
plans, previews, structured diagnostics, semantic UTC dates, and guarded
parameterized MySQL/PostgreSQL compilers. The PostgreSQL dialect additionally
supports UUID, JSON/JSONB, typed arrays, full-text search, grouped predicates,
CTEs, HAVING, DISTINCT, unique-field cursors, row locks, RETURNING, and UPSERT.

```ts
const schema = defineCocoQLSchema({ /* explicit entities and relations */ });
const plan = planCocoQL(validateCocoQL(parseCocoQL(source), schema), schema);
const compiled = compileCocoQLToPostgres(plan, schema);
```

Never compile unvalidated ASTs or forged plans. Reads and mutations require
explicit schema, permission, and safety boundaries; preview plans are not executable
writes. Start with `docs/cocoql-ai-guidelines.md`, then the relevant
`docs/cocoql-*.md` specification. Verify all behavior with `tests/cocoql.test.ts`.
Use `createCocoQLPostgresExecutor` from `@cocoframe/database-postgres` when the
validated plan should be executed with connection, transaction, timeout,
cancellation, retry, result-limit, and guard management.
