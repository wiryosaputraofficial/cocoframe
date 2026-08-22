import assert from "node:assert/strict";
import test from "node:test";
import { CocoFrameApp, defer, defineApi, defineLayout, definePage, json, withLayouts } from "../packages/core/src/index.ts";
import { defineIsland } from "../packages/client/src/index.ts";
import { jsx } from "../packages/jsx/src/index.ts";
import { schema } from "../packages/schema/src/index.ts";

test("renders a complete SEO document", async () => {
  const app = new CocoFrameApp({ siteName: "Example", language: "id" });
  app.page("/posts/:slug", definePage({
    load: ({ params }) => ({ slug: params.slug }),
    meta: ({ slug }) => ({
      title: `Post ${slug}`,
      description: "A typed post",
      canonical: `https://example.com/posts/${slug}`,
      jsonLd: { "@type": "Article", name: slug },
    }),
    view: ({ slug }) => jsx("h1", { children: slug }),
  }));
  const response = await app.fetch(new Request("https://example.com/posts/fast"));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /^<!doctype html>/);
  assert.match(body, /<title>Post fast · Example<\/title>/);
  assert.match(body, /rel="canonical" href="https:\/\/example.com\/posts\/fast"/);
  assert.match(body, /application\/ld\+json/);
  assert.match(body, /<h1>fast<\/h1>/);
});

test("keeps API responses typed and returns an accurate 404", async () => {
  const app = new CocoFrameApp();
  app.api("/api/health", defineApi({ method: "GET", handle: () => json({ ok: true }) }));
  const api = await app.fetch(new Request("http://localhost/api/health"));
  assert.deepEqual(await api.json(), { ok: true });
  const missing = await app.fetch(new Request("http://localhost/missing"));
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /noindex, nofollow/);
});

test("lets a page declare an accurate response status", async () => {
  const app = new CocoFrameApp().page("/*path", definePage({
    load: ({ params }) => ({ path: params.path }),
    meta: { title: "Page not found", robots: "noindex, nofollow" },
    status: ({ path }) => path ? 404 : 410,
    view: ({ path }) => jsx("main", { children: `Missing ${path}` }),
  }));
  const response = await app.fetch(new Request("http://localhost/missing/page"));
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Missing missing\/page/);
});

test("exposes built-in liveness and application readiness", async () => {
  let ready = false;
  const app = new CocoFrameApp({ health: { readiness: () => ready } });
  assert.deepEqual(await (await app.fetch(new Request("http://localhost/_health/live"))).json(), { status: "ok" });
  const unavailable = await app.fetch(new Request("http://localhost/_health/ready"));
  assert.equal(unavailable.status, 503);
  ready = true;
  const available = await app.fetch(new Request("http://localhost/_health/ready"));
  assert.equal(available.status, 200);
  assert.equal(available.headers.get("cache-control"), "no-store");
});

test("rejects untrusted production hosts when an allowlist is configured", async () => {
  const page = definePage({ meta: { title: "Allowed" }, view: () => "allowed" });
  const production = new CocoFrameApp({ allowedHosts: ["app.example", "app.example:8443"] }).page("/", page);

  assert.equal((await production.fetch(new Request("http://app.example./"))).status, 200);
  assert.equal((await production.fetch(new Request("http://app.example:8443/"))).status, 200);
  const rejected = await production.fetch(new Request("http://attacker.example/"));
  assert.equal(rejected.status, 421);
  assert.equal(rejected.headers.get("cache-control"), "no-store");
  assert.deepEqual(await rejected.json(), { error: "HOST_NOT_ALLOWED" });

  const development = new CocoFrameApp({ development: true, allowedHosts: ["app.example"] }).page("/", page);
  assert.equal((await development.fetch(new Request("http://localhost/"))).status, 200);
  assert.throws(() => new CocoFrameApp({ allowedHosts: ["https://app.example"] }), /Invalid allowed host/);
  assert.throws(() => new CocoFrameApp({ allowedHosts: ["*.example"] }), /Invalid allowed host/);
});
test("wraps pages in nested layouts and marks islands for hydration", async () => {
  const Counter = defineIsland<{ initial: number }>({
    name: "test-counter",
    setup: ({ initial }) => () => jsx("button", { children: initial }),
  });
  const page = definePage({
    meta: { title: "Interactive" },
    view: () => jsx(Counter, { initial: 2 }),
  });
  const layout = defineLayout(({ children }) => jsx("section", { class: "layout", children }));
  const app = new CocoFrameApp().page("/", withLayouts(page, [layout]));
  const body = await (await app.fetch(new Request("http://localhost/"))).text();
  assert.match(body, /<section class="layout"><coco-island/);
  assert.match(body, /data-coco-module="\/coco-assets\/islands\/test-counter\.js"/);
  assert.match(body, /<script type="module" src="\/coco-assets\/client\.js"><\/script>/);
});

test("streams pages with cache policy and serves automatic SEO endpoints", async () => {
  const app = new CocoFrameApp({ siteName: "Docs", siteUrl: "https://docs.example" });
  app.page("/", definePage({
    meta: { title: "Docs" },
    cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },
    view: () => jsx("main", { children: "Documentation" }),
  }));
  app.page("/posts/:slug", definePage({ meta: { title: "Post" }, view: () => "post" }));
  app.api("/api/status", defineApi({ method: "GET", handle: () => json({ ok: true }) }));

  const page = await app.fetch(new Request("https://docs.example/"));
  assert.ok(page.body);
  assert.equal(page.headers.get("cache-control"), "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  assert.match(await page.text(), /<main>Documentation<\/main>/);

  const robots = await (await app.fetch(new Request("https://any-host/robots.txt"))).text();
  assert.match(robots, /Sitemap: https:\/\/docs\.example\/sitemap\.xml/);
  const sitemap = await (await app.fetch(new Request("https://any-host/sitemap.xml"))).text();
  assert.match(sitemap, /<loc>https:\/\/docs\.example<\/loc>/);
  assert.doesNotMatch(sitemap, /:slug/);
  assert.doesNotMatch(sitemap, /api\/status/);
  assert.deepEqual(app.manifest().find(({ pattern }) => pattern === "/"), { method: "GET", pattern: "/", kind: "page" });
  assert.deepEqual(app.manifest().find(({ pattern }) => pattern === "/api/status"), { method: "GET", pattern: "/api/status", kind: "api" });
  assert.deepEqual(app.manifest().filter(({ kind }) => kind === "system").map(({ pattern }) => pattern), ["/_health/live", "/_health/ready"]);
});

test("handles form actions and page error boundaries", async () => {
  const app = new CocoFrameApp({ development: true });
  app.page("/form", definePage({
    load: ({ query }) => {
      if (query.has("fail")) throw new Error("load failed");
      return { ready: true };
    },
    meta: { title: "Form" },
    action: () => undefined,
    error: (error) => jsx("p", { children: error instanceof Error ? error.message : "failed" }),
    view: ({ ready }) => jsx("form", { children: ready ? "ready" : "waiting" }),
  }));

  const action = await app.fetch(new Request("http://localhost/form", { method: "POST" }));
  assert.equal(action.status, 303);
  assert.equal(action.headers.get("location"), "/form");
  const failed = await app.fetch(new Request("http://localhost/form?fail=1"));
  assert.equal(failed.status, 500);
  assert.match(await failed.text(), /load failed/);
});

test("shows escaped runtime diagnostics only in development", async () => {
  const brokenPage = definePage({
    meta: { title: "Broken" },
    view: () => { throw new TypeError("Cannot render <unsafe>"); },
  });
  const development = new CocoFrameApp({
    development: true,
    stylesheets: ["/coco-assets/styles.css"],
  }).page("/broken", brokenPage);
  const developmentResponse = await development.fetch(new Request("http://localhost/broken"));
  const developmentBody = await developmentResponse.text();
  assert.equal(developmentResponse.status, 500);
  assert.match(developmentBody, /data-coco-dev-overlay/);
  assert.match(developmentBody, /Unhandled Runtime Error/);
  assert.match(developmentBody, /TypeError: Cannot render &lt;unsafe&gt;/);
  assert.match(developmentBody, /name="robots" content="noindex, nofollow"/);
  assert.match(developmentBody, /href="\/coco-assets\/styles\.css"/);
  assert.match(developmentBody, /src="\/coco-assets\/dev\.js"/);
  assert.doesNotMatch(developmentBody, /Cannot render <unsafe>/);

  const production = new CocoFrameApp().page("/broken", brokenPage);
  const productionResponse = await production.fetch(new Request("http://localhost/broken"));
  const productionBody = await productionResponse.text();
  assert.equal(productionResponse.status, 500);
  assert.match(productionBody, /An unexpected error occurred/);
  assert.doesNotMatch(productionBody, /data-coco-dev-overlay|Cannot render|TypeError|dev\.js/);
});

test("turns a streamed development failure into the same error overlay", async () => {
  const app = new CocoFrameApp({ development: true }).page("/stream-error", definePage({
    meta: { title: "Stream error" },
    view: () => Promise.reject(new Error("stream exploded")),
  }));
  const response = await app.fetch(new Request("http://localhost/stream-error"));
  const body = await response.text();
  assert.match(body, /data-coco-dev-overlay/);
  assert.match(body, /stream exploded/);
  assert.match(body, /during stream rendering/);
  assert.match(body, /src="\/coco-assets\/dev\.js"/);
});

test("validates API contracts and exposes a machine-readable manifest", async () => {
  const app = new CocoFrameApp({ development: true });
  app.api("/api/items/:id", defineApi({
    id: "update-item",
    method: "POST",
    input: {
      params: schema.object({ id: schema.string({ min: 2 }) }),
      body: schema.object({ quantity: schema.number({ integer: true, min: 1 }) }),
    },
    output: schema.object({ id: schema.string(), quantity: schema.number() }),
    handle: ({ input }) => ({ id: input.params.id, quantity: input.body.quantity }),
  }));

  const valid = await app.fetch(new Request("http://localhost/api/items/ab", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity: 2 }),
  }));
  assert.deepEqual(await valid.json(), { id: "ab", quantity: 2 });

  const invalid = await app.fetch(new Request("http://localhost/api/items/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity: 0 }),
  }));
  assert.equal(invalid.status, 400);
  const failure = await invalid.json() as { error: string; issues: Array<{ path: string[] }> };
  assert.equal(failure.error, "VALIDATION_ERROR");
  assert.deepEqual(failure.issues.map((issue) => issue.path), [["params", "id"], ["body", "quantity"]]);
  assert.equal(app.contracts()[0]?.id, "update-item");
});

test("streams deferred boundaries as promises settle out of order", async () => {
  const app = new CocoFrameApp().page("/", definePage({
    meta: { title: "Deferred" },
    view: () => [
      defer(new Promise((resolve) => setTimeout(() => resolve(jsx("p", { children: "slow" })), 20)), jsx("span", { children: "slow fallback" })),
      defer(Promise.resolve(jsx("p", { children: "fast" })), jsx("span", { children: "fast fallback" })),
    ],
  }));
  const body = await (await app.fetch(new Request("http://localhost/"))).text();
  assert.match(body, /slow fallback/);
  assert.match(body, /fast fallback/);
  assert.match(body, /\/coco-assets\/stream\.js/);
  assert.ok(body.indexOf(">fast<") < body.indexOf(">slow<"));
  assert.match(body, /template data-coco-resolve="coco-s[12]"/);
});
