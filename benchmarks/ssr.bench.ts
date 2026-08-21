import { performance } from "node:perf_hooks";
import { CocoFrameApp, definePage } from "../packages/core/src/index.ts";
import { jsx } from "../packages/jsx/src/index.ts";

const app = new CocoFrameApp({ siteName: "Benchmark" });
app.page("/posts/:slug", definePage({
  load: ({ params }) => ({ slug: params.slug }),
  meta: ({ slug }) => ({ title: slug ?? "post", description: "Benchmark page" }),
  view: ({ slug }) => jsx("main", { children: [jsx("h1", { children: slug }), jsx("p", { children: "Rendered by CocoFrame" })] }),
}));

const iterations = 10_000;
const request = new Request("http://localhost/posts/hello");
for (let index = 0; index < 100; index++) await (await app.fetch(request)).arrayBuffer();
const start = performance.now();
for (let index = 0; index < iterations; index++) await (await app.fetch(request)).arrayBuffer();
const duration = performance.now() - start;
console.log(JSON.stringify({
  iterations,
  durationMs: Number(duration.toFixed(2)),
  operationsPerSecond: Math.round(iterations / (duration / 1_000)),
  note: "Local architectural baseline; not a cross-framework comparison.",
}, null, 2));
