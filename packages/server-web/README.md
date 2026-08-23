# @cocoframe/server-web

Minimal Fetch-host adapter for edge, serverless, and other Web Standard runtimes.

- `webHandler(app)` returns a `(Request) => Promise<Response>` compatible handler.
- `WebApplication` and `WebHandler` describe the structural boundary.

```ts
import { webHandler } from "@cocoframe/server-web";

export default webHandler(app);
```

This package intentionally does not emulate Node APIs or own deployment-platform
configuration. Keep the boundary limited to Web `Request` and `Response`. Verify
with `tests/server-web.test.ts`.
