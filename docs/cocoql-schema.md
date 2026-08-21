# CocoQL Schema 0.1

The schema registry is database- and framework-independent.

```ts
import { defineCocoQLSchema } from "@cocoframe/cocoql";

export const schema = defineCocoQLSchema({
  version: "0.1",
  entities: {
    projects: {
      table: "projects",
      description: "Customer projects",
      fields: {
        id: { type: "id" },
        name: { type: "string" },
        status: {
          type: "enum",
          values: ["prospect", "active", "completed"],
          description: "Current project lifecycle state",
        },
        client_id: { type: "id" },
      },
      relations: {
        client: {
          type: "belongs_to",
          entity: "clients",
          foreignKey: "client_id",
        },
      },
    },
  },
});
```

Field names are CocoQL names. `column` may map a field to a different physical
column. SQL identifiers always come from this validated schema.

For `belongs_to`, `foreignKey` names a declared field on the source entity and
joins the target entity's declared `id`. For `has_one` and `has_many`, it names a
declared field on the target entity and joins the source `id`. CocoQL 0.1 emits
deterministic left joins. See [Relations 0.1](./cocoql-relations.md).
