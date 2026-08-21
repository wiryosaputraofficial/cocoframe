# CocoQL Relations 0.1

CocoQL resolves joins from explicit relation paths in the trusted schema. A
query names a relation with `with`; it never writes a table name, join key, or
SQL `ON` expression.

```cocoql
from projects

with client

filter client.name contains corp

select
  id
  name
  client.name
```

Nested traversal is equally explicit:

```cocoql
from clients

with projects.invoices

select
  id
  projects.name
  projects.invoices.amount
```

Declaring a nested path includes its parent joins. The planner always orders
parents before children and emits each path once.

## Schema join rules

```ts
projects: {
  table: "projects",
  fields: {
    id: { type: "id" },
    client_id: { type: "id" },
  },
  relations: {
    client: {
      type: "belongs_to",
      entity: "clients",
      foreignKey: "client_id",
    },
  },
}
```

- `belongs_to`: the source `foreignKey` joins the target `id`.
- `has_one` and `has_many`: the target `foreignKey` joins the source `id`.
- Every key must be declared as a public schema field. Missing keys fail with
  `INVALID_SCHEMA` before usable SQL is returned.
- Joins use deterministic `LEFT JOIN` semantics in version 0.1.

Physical table and column names remain schema-only. Query Plans identify fields
with an entity, a relation path, and a public field name. SQL compilers assign
internal aliases so repeated column names and nested paths remain unambiguous.

## Explicit failures

- Traversing `client.name` without `with client` returns
  `RELATION_NOT_INCLUDED` and suggests the required clause.
- An unknown path segment returns `UNKNOWN_RELATION`, the entity where lookup
  failed, and its available relations.
- CocoQL never substitutes an entity name for a relation name or guesses between
  multiple relations targeting the same entity.

