# @cocoframe/schema

Runtime validation, TypeScript inference, structured issues, and serializable
contract metadata.

`schema` provides string, number, boolean, literal, enum, union, array, record,
object, optional, date, and transform constructors. `Schema<T>` exposes parsing
and JSON contract metadata; `Infer<S>` derives the TypeScript type;
`ValidationError` carries machine-readable issue paths.

```ts
const input = schema.object({
  id: schema.string({ min: 2 }),
  count: schema.number({ integer: true, min: 1 }),
});
type Input = Infer<typeof input>;
```

Use one schema as the runtime and generated-contract source. Preserve aggregated
issues and stable paths so clients and AI can self-correct. Verify with
`tests/schema.test.ts` and contracted API tests.
