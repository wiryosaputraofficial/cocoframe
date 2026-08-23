# @cocoframe/cocoql

Versioned, schema-aware query and mutation tooling for deterministic AI-generated
database work.

The public entry exports the lexer/parser, canonical formatter, schema and
permission definitions, semantic validation, safety enforcement, query/mutation
plans, previews, structured diagnostics, semantic UTC dates, and guarded
parameterized MySQL/PostgreSQL compilers.

```ts
const schema = defineCocoQLSchema({ /* explicit entities and relations */ });
const plan = planCocoQL(validateCocoQL(parseCocoQL(source), schema), schema);
const compiled = compileCocoQLToPostgres(plan);
```

Never compile unvalidated ASTs or forged plans. Reads and mutations require
explicit schema, permission, and safety boundaries; preview plans are not executable
writes. Start with `docs/cocoql-ai-guidelines.md`, then the relevant
`docs/cocoql-*.md` specification. Verify all behavior with `tests/cocoql.test.ts`.
