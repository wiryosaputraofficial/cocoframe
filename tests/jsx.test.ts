import assert from "node:assert/strict";
import test from "node:test";
import { jsx, raw, renderToChunks, renderToString } from "../packages/jsx/src/index.ts";

test("renders components, arrays, and attributes", async () => {
  const Badge = ({ label }: { label: string }) => jsx("strong", { className: "badge", children: label });
  const tree = jsx("main", { hidden: true, children: [jsx("h1", { children: "Hello" }), jsx(Badge, { label: "Fast" })] });
  assert.equal(await renderToString(tree), '<main hidden><h1>Hello</h1><strong class="badge">Fast</strong></main>');
});

test("escapes dynamic values and requires explicit raw HTML", async () => {
  assert.equal(await renderToString(jsx("p", { children: '<script>alert("x")</script>' })), "<p>&lt;script&gt;alert(\"x\")&lt;/script&gt;</p>");
  assert.equal(await renderToString(jsx("p", { children: raw("<em>trusted</em>") })), "<p><em>trusted</em></p>");
});

test("supports asynchronous components", async () => {
  const AsyncTitle = async () => jsx("h1", { children: "Async" });
  assert.equal(await renderToString(jsx(AsyncTitle, {})), "<h1>Async</h1>");
});

test("emits ordered chunks without buffering the complete tree", async () => {
  const chunks: string[] = [];
  const delayed = Promise.resolve(jsx("span", { children: "later" }));
  for await (const chunk of renderToChunks(jsx("main", { children: ["first", delayed] }))) chunks.push(chunk);
  assert.deepEqual(chunks, ["<main>", "first", "<span>", "later", "</span>", "</main>"]);
});
