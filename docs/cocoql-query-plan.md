# CocoQL Query Plan 0.1

The query plan is CocoQL's stable boundary between language semantics and a
database dialect. It describes a validated read operation without containing
SQL, placeholders, physical table names, or physical column names.

```text
CocoQL source -> lexer -> AST -> schema validation -> Query Plan -> dialect compiler
```

## Public API

```ts
import {
  compileCocoQLToMySql,
  formatCocoQLPlan,
  parseCocoQL,
  planCocoQL,
} from "@cocoframe/cocoql";

const plan = planCocoQL(parseCocoQL(source), schema);
console.log(formatCocoQLPlan(plan));

const { sql, parameters } = compileCocoQLToMySql(plan, schema);
```

`compileCocoQL(source, schema)` remains the high-level shortcut for this full
pipeline.

## Plan shape

```json
{
  "type": "QueryPlan",
  "version": "0.1",
  "operation": "select",
  "rootEntity": "orders",
  "joins": [
    {
      "path": "customer",
      "parentPath": null,
      "relation": "customer",
      "fromEntity": "orders",
      "targetEntity": "customers",
      "kind": "left"
    }
  ],
  "projection": [
    { "entity": "orders", "field": "id", "relationPath": null },
    { "entity": "customers", "field": "name", "relationPath": "customer" },
    { "entity": "orders", "field": "total", "relationPath": null }
  ],
  "filters": [
    {
      "field": { "entity": "orders", "field": "status", "relationPath": null },
      "operator": "=",
      "value": { "kind": "scalar", "value": "paid" }
    }
  ],
  "groupBy": [],
  "aggregates": [],
  "orderBy": [],
  "limit": 20
}
```

Plans are deterministic and deeply immutable when created by `planCocoQL`.
`formatCocoQLPlan` returns canonical, newline-terminated JSON for snapshots,
logs, cache keys, and explainability tools.

Semantic date expressions resolve in the planner to a `date-range` value with
explicit ISO `start`, `end`, `timeZone: "UTC"`, and the original expression.
This keeps calendar interpretation outside SQL dialect compilers while retaining
an explainable source intent. Pass `{ now }` to `planCocoQL` when reproducibility
must not depend on the process clock.

Grouped queries use `groupBy` field references and typed `aggregates`. `orderBy`
contains a discriminated target so a compiler can distinguish schema fields from
aggregate aliases without name guessing.

## Trust boundary

- `planCocoQL` validates the AST against the explicit CocoQL schema first.
- A dialect compiler validates every received plan again. Forged operators,
  mismatched relation paths, cross-entity field references, and malformed pagination
  fail with `INVALID_PLAN` before SQL is produced.
- The compiler resolves physical tables and columns from the trusted schema;
  they are not embedded in the plan.
- Values remain structured data and become dialect parameters.
- A valid plan is not authorization. Applications must apply permissions before
  execution.

Query Plan 0.1 supports schema-resolved left joins. Each join records only its
public relation path and logical entities; physical tables, columns, and join
conditions remain compiler concerns derived from the trusted schema.
