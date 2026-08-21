import { performance } from "node:perf_hooks";
import { CocoFrameApp, defineApi } from "../packages/core/src/index.ts";
import { createServer } from "../packages/server-node/src/index.ts";

const app = new CocoFrameApp();
app.api("/health", defineApi({ method: "GET", handle: () => ({ ok: true }) }));
const server = createServer(app.fetch);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Concurrent benchmark did not receive a TCP address");
const url = `http://127.0.0.1:${address.port}/health`;
const iterations = 5_000;
const concurrency = 50;

try {
  const start = performance.now();
  for (let offset = 0; offset < iterations; offset += concurrency) {
    await Promise.all(Array.from({ length: Math.min(concurrency, iterations - offset) }, async () => {
      const response = await fetch(url);
      await response.arrayBuffer();
      if (!response.ok) throw new Error(`Unexpected benchmark status ${response.status}`);
    }));
  }
  const duration = performance.now() - start;
  console.log(JSON.stringify({
    iterations,
    concurrency,
    durationMs: Number(duration.toFixed(2)),
    requestsPerSecond: Math.round(iterations / (duration / 1_000)),
    note: "Concurrent localhost HTTP baseline; not a cross-framework comparison.",
  }, null, 2));
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
