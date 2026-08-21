import { performance } from "node:perf_hooks";
import { CocoFrameApp, definePage } from "../packages/core/src/index.ts";
import { jsx } from "../packages/jsx/src/index.ts";
import { createServer } from "../packages/server-node/src/index.ts";

const app = new CocoFrameApp({ siteName: "HTTP Benchmark" });
app.page("/posts/:slug", definePage({
  load: ({ params }) => ({ slug: params.slug }),
  meta: ({ slug }) => ({ title: slug ?? "post" }),
  view: ({ slug }) => jsx("main", { children: jsx("h1", { children: slug }) }),
}));

const server = createServer(app.fetch);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("HTTP benchmark did not receive a TCP address");
const url = `http://127.0.0.1:${address.port}/posts/hello`;
const iterations = 2_000;

try {
  for (let index = 0; index < 50; index++) await (await fetch(url)).arrayBuffer();
  const start = performance.now();
  for (let index = 0; index < iterations; index++) await (await fetch(url)).arrayBuffer();
  const duration = performance.now() - start;
  console.log(JSON.stringify({
    iterations,
    durationMs: Number(duration.toFixed(2)),
    requestsPerSecond: Math.round(iterations / (duration / 1_000)),
    note: "Sequential localhost HTTP baseline; not a cross-framework comparison.",
  }, null, 2));
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
