# Debug Streaming

First classify the page:

1. A normal page streams the component tree.
2. A page declaring `error` intentionally buffers before sending headers.
3. `defer(promise, fallback)` streams an immediate boundary and later inert template.

Check whether the content is SEO-critical. Titles, structured metadata, primary
copy, and essential controls remain immediate. Only supplementary content uses
`defer`, always with a useful accessible fallback.

Trace one `AbortSignal` from the Node body reader through `CocoFrameApp.fetch` to
the response reader. Do not consume and rebuild a response merely to add headers.
Verify ordered JSX chunks, deferred out-of-order completion, page error status,
Node backpressure/abort tests, strict CSP, and production E2E.
