# @cocoframe/server-node

Node HTTP adapter for Web Standard CocoFrame handlers.

- `createServer(handler, options?)` converts Node requests and responses while preserving one abort lifecycle.
- `gracefulShutdown(server, options?)` drains active responses before a deadline.
- `clientAddress(request)` reads the adapter's verified client identity.
- `RequestBodyTooLargeError` and `RequestTimeoutError` define sanitized adapter failures.

```ts
const server = createServer(app.fetch, {
  maxBodyBytes: 1_048_576,
  requestTimeoutMs: 30_000,
  trustedProxies: ["127.0.0.1"],
});
```

Do not trust forwarded host, protocol, or client chains unless the direct peer is
configured. Keep one `AbortSignal` across body reading, handling, and streamed
response backpressure. Verify with `tests/server-node.test.ts`.
