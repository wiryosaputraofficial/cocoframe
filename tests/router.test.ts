import assert from "node:assert/strict";
import test from "node:test";
import { Router } from "../packages/router/src/index.ts";

test("matches static routes before dynamic routes", () => {
  const router = new Router<string>().add("GET", "/posts/:slug", "dynamic").add("GET", "/posts/featured", "static");
  assert.equal(router.match("GET", "/posts/featured")?.handler, "static");
  assert.deepEqual(router.match("GET", "/posts/hello%20world")?.params, { slug: "hello world" });
});

test("matches catch-all parameters and normalizes slashes", () => {
  const router = new Router<string>().add("GET", "/docs/*path", "docs");
  assert.deepEqual(router.match("GET", "//docs/guides/start/")?.params, { path: "guides/start" });
});

test("rejects duplicate routes", () => {
  const router = new Router<string>().add("GET", "/", "first");
  assert.throws(() => router.add("GET", "/", "second"), /Duplicate route/);
});
