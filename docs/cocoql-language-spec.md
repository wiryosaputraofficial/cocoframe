# CocoQL 0.1 Language Specification

CocoQL is a deterministic database language designed as a stable boundary
between AI agents and relational databases. Version 0.1 keeps reads and
mutations in separate parsers and never executes a database operation by itself.

## Canonical read query

```cocoql
from users

filter status = active
filter age >= 18

select
  id
  name
  email

sort name asc

take 20
skip 0
```

Clauses appear in this order: `from`, zero or more `with`, zero or more
`filter`, zero or more `group`, `select`, zero or more `sort`, optional `take`, optional `skip`.
Repeated filters use `AND`.

Relation fields require an explicit, schema-defined `with` path. Nested paths
such as `with projects.invoices` are supported and never inferred from table or
entity names. See [Relations 0.1](./cocoql-relations.md).

Supported operators are `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not in`,
`contains`, `starts_with`, `ends_with`, `before`, and `after`. Lists use an
explicit bracketed form such as `status in [active, inactive]`.

Strings that are not canonical bare words must be quoted. Comments start with
`#` and end at the newline. Keywords and identifiers are normalized to
lowercase.

Date and datetime fields support deterministic UTC semantic ranges such as
`in this_month`, `before today`, and `in last 7 days`. See
[Semantic Dates 0.1](./cocoql-semantic-dates.md).

Grouped reads use one or more `group <field>` clauses followed by aliased
`count`, `sum`, `avg`, `min`, or `max` expressions inside `select`. See
[Aggregation 0.1](./cocoql-aggregation.md).

Every failure uses the versioned, immutable [Structured Errors 0.1](./cocoql-structured-errors.md)
contract. Source failures carry an exclusive-end location, while AST and Query
Plan failures carry a typed path that agents can use for deterministic repair.

Applications can apply a separate, default-deny [Permissions 0.1](./cocoql-permissions.md)
policy after semantic validation and before Query Plan creation. Permission
rules use public schema names and are never parsed from CocoQL source.

Bounded reads and writes use a trusted [Safety Policy 0.1](./cocoql-safety-policy.md).
Mutations require `parseCocoQLMutation`, independent write permissions, explicit
filters for update/delete, and affected-row confirmation. See
[Mutation Preview](./cocoql-mutation-preview.md) and [Mutations](./cocoql-mutations.md).
The same logical plans compile to MySQL or [PostgreSQL](./cocoql-postgresql.md)
without changing agent-facing syntax.

## Version boundary

CocoQL 0.1 turns a validated AST into a deterministic, dialect-independent
[Query Plan](./cocoql-query-plan.md) before SQL compilation. Schema-aware
relation traversal, semantic UTC dates, aggregation, safety policies, mutation
preview, and guarded MySQL/PostgreSQL compilation are available. Mutation
keywords remain rejected by the read parser with `UNSAFE_MUTATION`; callers
must opt into the separate mutation API.
