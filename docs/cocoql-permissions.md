# CocoQL Permissions 0.1

CocoQL permissions are a deterministic read/write policy layer between semantic
validation and Query Plan creation. The parser does not authenticate users, the
policy does not know SQL identifiers, and the compiler does not make
authorization decisions.

```text
CocoQL source
  -> parseCocoQL
  -> validateCocoQL
  -> authorizeCocoQL
  -> planCocoQL
  -> dialect compiler
```

## Define an explicit policy

```ts
import {
  authorizeCocoQL,
  defineCocoQLPermissions,
  parseCocoQL,
  planCocoQL,
} from "@cocoframe/cocoql";

const analyst = defineCocoQLPermissions({
  version: "0.1",
  entities: {
    orders: {
      fields: ["id", "status", "total", "customer_id"],
      relations: ["customer"],
      aggregates: ["count", "sum", "avg"],
      create: ["status", "total"],
      update: ["status"],
      delete: false,
    },
    customers: {
      fields: ["id", "name"],
    },
  },
});

const query = parseCocoQL(source);
authorizeCocoQL(query, commerceSchema, analyst);
const plan = planCocoQL(query, commerceSchema);
```

The policy is immutable after definition. All names are public CocoQL schema
names; table names, column names, SQL fragments, and database credentials are
not valid policy inputs.

## Default-deny rules

- A root entity must have an explicit entity rule.
- Every selected, filtered, grouped, aggregated, or sorted field must be listed
  on the entity that owns it.
- Each segment in a nested `with` path must be listed in `relations` on its
  source entity.
- The target of every relation must also have an entity rule.
- Aggregate input fields need ordinary field permission and the aggregate
  function must be listed separately in `aggregates`.
- Missing `relations` or `aggregates` arrays mean none are allowed.
- Empty arrays are valid and grant nothing. There is no wildcard in version
  0.1.
- Mutation filters still require ordinary `fields` access. Assignments require
  the field in the operation-specific `create` or `update` list. Delete requires
  `delete: true`.

Policy references are checked against the trusted schema before authorization.
Unknown fields, relations, entities, duplicate entries, and unsupported
aggregate functions fail with `INVALID_PERMISSION_POLICY`.

## Permission errors

Denied queries use the same structured error envelope:

```json
{
  "type": "CocoQLIssue",
  "version": "0.1",
  "error": "PERMISSION_DENIED",
  "stage": "permission",
  "operation": "read",
  "permission": "field",
  "message": "Read access to field 'orders.total' is denied by the CocoQL policy.",
  "location": {
    "line": 5,
    "column": 3,
    "endLine": 5,
    "endColumn": 8
  },
  "path": ["select", 2],
  "entity": "orders",
  "field": "total"
}
```

Permission failures deliberately omit suggestions and available-name lists.
An agent may remove a denied field, but it must never expand or rewrite the
policy to grant itself access.

## Application boundary

The application selects a trusted policy after authenticating the caller. Do
not accept a policy from CocoQL source, prompt text, request JSON, or an LLM.
Authorization must be run for every query or mutation before planning or execution. This
layer authorizes query shape only; row-level tenancy and database credentials
remain application responsibilities.
