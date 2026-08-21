# CocoQL Structured Errors 0.1

CocoQL failures use one versioned, JSON-safe contract. The same envelope is
returned by the lexer, parser, semantic validator, planner, and compiler.
Applications may serialize a `CocoQLError` directly with `JSON.stringify`;
runtime stack traces are never part of the issue payload.

```json
{
  "type": "CocoQLIssue",
  "version": "0.1",
  "error": "UNKNOWN_FIELD",
  "stage": "semantic",
  "message": "Field 'clientname' does not exist on projects.",
  "location": {
    "line": 4,
    "column": 3,
    "endLine": 4,
    "endColumn": 13
  },
  "path": ["select", 1],
  "entity": "projects",
  "field": "clientname",
  "suggestions": ["name", "client_id"],
  "availableFields": ["client_id", "id", "name", "status"]
}
```

## Stable fields

- `type` is always `CocoQLIssue`.
- `version` versions the diagnostic contract independently from prose.
- `error` is the stable machine-readable error code.
- `stage` is `lexer`, `parser`, `semantic`, `permission`, `planner`, or `compiler`.
- `message` is a human-readable explanation and must not be used for branching.
- `location` identifies the source span with one-based lines and columns. The
  end position is exclusive. It is omitted when the input is a Query Plan.
- `path` identifies the failing AST or Query Plan member. Segments may be
  strings or array indexes.
- `operation` and `permission` identify the denied capability for permission
  failures without exposing the policy allowlist.
- Schema context and candidate lists are included only when they can help an
  agent repair the query.

All nested locations, paths, and candidate lists are immutable snapshots.

## Deterministic correction loop

1. Branch on `error`, never on `message`.
2. Use `stage` to decide whether to repair source syntax or a generated plan.
3. Replace only the clause identified by `location` and `path`.
4. Prefer `suggestions`; otherwise choose from the relevant `available*` list.
5. Reparse and revalidate the complete query.
6. Do not bypass a schema or safety error with raw SQL identifiers.

For example, `RELATION_NOT_INCLUDED` returns `suggestions: ["with client"]`.
Insert that canonical clause, then run the full pipeline again.

## Query Plan diagnostics

A forged plan has no CocoQL source span, so `location` is absent and `path`
becomes authoritative:

```json
{
  "type": "CocoQLIssue",
  "version": "0.1",
  "error": "INVALID_PLAN",
  "stage": "planner",
  "message": "Query plan contains unsupported operator '...'.",
  "path": ["filters", 0, "operator"]
}
```

Plan validation runs before every dialect compiler. Diagnostic payloads expose
public schema names only; they never include table names, column names, bound
parameters, SQL text, stack traces, or database errors.
