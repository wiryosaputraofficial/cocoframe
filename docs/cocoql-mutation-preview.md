# CocoQL Mutation Preview 0.1

Preview turns a write intent into an inspectable public-schema plan. It never creates SQL, opens a connection, or estimates rows by guessing.

```cocoql
preview
from invoices
filter status = pending
update
  status = paid
```

```ts
const mutation = parseCocoQLMutation(source);
authorizeCocoQLMutation(mutation, schema, permissions);
enforceCocoQLMutationSafety(mutation, schema, safety);
const preview = previewCocoQLMutation(mutation, schema, { now });
```

For create, the deterministic estimate is `1`. Update and delete return `estimatedAffectedRows: null` and `estimate: "database-required"`. Passing a preview plan to a dialect compiler fails with `PREVIEW_REQUIRED`.

