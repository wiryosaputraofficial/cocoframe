import assert from "node:assert/strict";
import test from "node:test";
import { CocoFrameApp, definePage } from "../packages/core/src/index.ts";
import { webHandler } from "../packages/server-web/src/index.ts";

test("exposes a zero-configuration Web Standard deployment handler", async () => {
  const app = new CocoFrameApp().page("/", definePage({ meta: { title: "Edge" }, view: () => "edge-ready" }));
  const worker = webHandler(app);
  const response = await worker.fetch(new Request("https://edge.example/"), {}, {});
  assert.equal(response.status, 200);
  assert.match(await response.text(), /edge-ready/);
});
