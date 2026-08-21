# CocoQL Safety Policy 0.1

`defineCocoQLSafetyPolicy` creates one immutable, trusted policy for bounded reads and writes. It is application configuration, never AI input.

```ts
const safety = defineCocoQLSafetyPolicy({
  version: "0.1",
  read: {
    requireTake: true, maxTake: 100, maxSkip: 1000, maxFilters: 5,
    maxProjectedFields: 10, maxRelations: 2, maxRelationDepth: 2,
    maxGroupFields: 3, maxAggregates: 4
  },
  mutation: {
    requireFilterForUpdate: true, requireFilterForDelete: true,
    requireConfirmation: true, maxAffectedRows: 1000,
    maxFilters: 5, maxChanges: 10
  }
});
```

Call `enforceCocoQLSafety` for reads and `enforceCocoQLMutationSafety` for mutations. Success returns a frozen metrics report. Failure throws a versioned `CocoQLIssue` with `stage: "safety"` and a stable `rule`, such as `mutation.requireFilterForDelete`.

Preview mutations may omit confirmation because they cannot compile into write SQL. Filters are still mandatory, so preview cannot inspect an unbounded update or delete.

