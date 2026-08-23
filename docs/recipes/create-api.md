# Create a Contracted API

Create `app/routes/<path>.route.ts` with one stable ID and schema-backed input and
output.

```ts
export default defineApi({
  id: "get-user",
  method: "GET",
  input: { params: schema.object({ id: schema.string({ min: 1 }) }) },
  output: schema.object({ id: schema.string(), name: schema.string() }),
  handle: ({ input }) => ({ id: input.params.id, name: "Coco" }),
});
```

Return plain data unless a custom `Response` is required. Input failures are 400;
output contract failures are 500. Run `npm run generate` after any ID, method,
path, input, output, or OpenAPI metadata change, then inspect the generated Fetch
client and OpenAPI diff. Never edit either output manually.
