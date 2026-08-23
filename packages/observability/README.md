# @cocoframe/observability

Request identity, timing, response propagation, and structured application events.

- `requestId(options?)` validates or creates a request ID and records handler duration.
- `requestIdKey` exposes the ID through typed request context.
- `RequestLogEvent`, `RequestIdOptions`, and the writer contract describe safe structured output.

```ts
export default defineConfig({
  middleware: [requestId({ write: (event) => telemetry.write(event) })],
});
```

Events contain method, path, status, duration, and explicit application fields.
Do not log request bodies, cookies, authorization headers, or unvalidated incoming
IDs. Verify with `tests/observability.test.ts` and `npm run inspect`.
