# CocoQL Safety

CocoQL 0.1 has a deliberately narrow safety boundary:

- Read and mutation source use separate opt-in parsers.
- It never opens a database connection or executes SQL.
- Mutation keywords fail with `UNSAFE_MUTATION` in the read parser.
- Entity, field, table, and column identifiers must resolve through the schema.
- User values are compiled into `?` placeholders and a separate parameters
  array.
- The validated AST becomes a database-independent Query Plan. Dialect
  compilers reject malformed or forged plans before producing SQL.
- `take` is limited to 10,000.
- Relation traversal must be explicitly included and must resolve through
  schema-declared relations and join keys.
- Semantic dates resolve to explicit UTC half-open ranges in the Query Plan and
  compile only as bound parameters. Applications can inject the planning clock
  for deterministic replay.
- Aggregate functions come from a closed enum. Inputs resolve through schema
  fields, aliases are validated identifiers, and grouping rules are checked
  before the SQL compiler runs.
- Errors serialize through a versioned public envelope. They expose public
  schema context and correction candidates, but never SQL, physical table or
  column identifiers, bound values, stack traces, or database errors.
- Read permissions are explicit and default-deny. Entity, field, relation, and
  aggregate authorization runs outside the parser and compiler. Permission
  errors omit candidate allowlists so an agent cannot use diagnostics to widen
  its own access.
- Immutable safety policies bound read shape, result windows, mutation filters,
  changed fields, and confirmed affected rows.
- Preview produces no SQL. Executable update/delete plans require filters and
  all write plans require explicit affected-row confirmation.
- Mutation compilers return `verifyBeforeCommit: true`; adapters must verify the
  actual affected count inside the same transaction or roll back.

Mutation support remains outside the read parser. Authentication, tenant and
row ownership checks, transaction execution, and database-backed estimation
remain application or adapter responsibilities. An LLM response is never authorization.
