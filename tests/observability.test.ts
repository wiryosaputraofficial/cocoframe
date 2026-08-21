import assert from "node:assert/strict";
import test from "node:test";
import { CocoFrameApp, defineApi } from "../packages/core/src/index.ts";
import { requestId, requestLogger, type RequestLogEvent } from "../packages/observability/src/index.ts";

test("propagates valid request IDs and emits structured request timing", async () => {
  const events: RequestLogEvent[] = [];
  const app = new CocoFrameApp({ middleware: [
    requestId({ trustIncoming: true }),
    requestLogger({ write: (event) => { events.push(event); }, fields: () => ({ service: "test" }) }),
  ] });
  app.api("/health", defineApi({ method: "GET", handle: () => ({ ok: true }) }));
  const response = await app.fetch(new Request("https://example.com/health", { headers: { "x-request-id": "mobile-12345678" } }));
  assert.equal(response.headers.get("x-request-id"), "mobile-12345678");
  assert.equal(events.length, 1);
  assert.deepEqual({ requestId: events[0]?.requestId, status: events[0]?.status, path: events[0]?.path }, {
    requestId: "mobile-12345678", status: 200, path: "/health",
  });
  assert.equal(events[0]?.fields?.service, "test");
  assert.ok((events[0]?.durationMs ?? -1) >= 0);
  assert.deepEqual(app.middleware().map(({ id }) => id), ["observability.request-id", "observability.request-logger"]);
});

test("replaces malformed incoming request IDs", async () => {
  const app = new CocoFrameApp({ middleware: [requestId({ trustIncoming: true })] });
  const response = await app.fetch(new Request("https://example.com/missing", { headers: { "x-request-id": "bad id!" } }));
  assert.notEqual(response.headers.get("x-request-id"), "bad id!");
  assert.equal(response.status, 404);
});
