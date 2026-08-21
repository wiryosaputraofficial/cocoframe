import assert from "node:assert/strict";
import test from "node:test";
import { CocoFrameApp, defineApi, definePage } from "../packages/core/src/index.ts";
import { jsx } from "../packages/jsx/src/index.ts";
import { cors, csrfProtection, csrfTokenKey, rateLimit, securityHeaders } from "../packages/security/src/index.ts";

test("adds CSP-compatible security headers without buffering streamed pages", async () => {
  const app = new CocoFrameApp({ middleware: [securityHeaders()] });
  app.page("/", definePage({ meta: { title: "Secure" }, view: () => jsx("main", { children: "safe" }) }));
  const response = await app.fetch(new Request("https://example.com/"));
  assert.ok(response.body);
  assert.match(response.headers.get("content-security-policy") ?? "", /script-src 'self'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(await response.text(), /<main>safe<\/main>/);
});

test("handles allowed and denied CORS preflight requests", async () => {
  const app = new CocoFrameApp({ middleware: [cors({
    origins: ["https://mobile.example"],
    headers: ["authorization", "content-type"],
    credentials: true,
    maxAge: 600,
    match: ({ url }) => url.pathname.startsWith("/api/"),
  })] });
  app.api("/api/data", defineApi({ method: "GET", handle: () => ({ ok: true }) }));
  const allowed = await app.fetch(new Request("https://api.example/api/data", {
    method: "OPTIONS",
    headers: { origin: "https://mobile.example", "access-control-request-method": "GET" },
  }));
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://mobile.example");
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
  const denied = await app.fetch(new Request("https://api.example/api/data", {
    method: "OPTIONS",
    headers: { origin: "https://attacker.example", "access-control-request-method": "GET" },
  }));
  assert.equal(denied.status, 403);
});

test("issues and validates CSRF tokens for headers and forms", async () => {
  const app = new CocoFrameApp({ middleware: [csrfProtection({ secure: false })] });
  app.api("/csrf", defineApi({ method: "GET", handle: (context) => ({ token: context.get(csrfTokenKey) }) }));
  app.api("/csrf", defineApi({ method: "POST", handle: () => ({ saved: true }) }));
  const seed = await app.fetch(new Request("https://example.com/csrf"));
  const token = (await seed.json() as { token: string }).token;
  const cookie = seed.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
  assert.ok(token && cookie);
  const valid = await app.fetch(new Request("https://example.com/csrf", {
    method: "POST",
    headers: { origin: "https://example.com", cookie, "x-csrf-token": token },
  }));
  assert.equal(valid.status, 200);
  const form = await app.fetch(new Request("https://example.com/csrf", {
    method: "POST",
    headers: { origin: "https://example.com", cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ _csrf: token }),
  }));
  assert.equal(form.status, 200);
  const attacked = await app.fetch(new Request("https://example.com/csrf", {
    method: "POST",
    headers: { origin: "https://attacker.example", cookie, "x-csrf-token": token },
  }));
  assert.equal(attacked.status, 403);
});

test("rate limits an explicit application key", async () => {
  const app = new CocoFrameApp({ middleware: [rateLimit({ limit: 2, windowMs: 60_000, key: () => "test-user" })] });
  app.api("/api", defineApi({ method: "GET", handle: () => ({ ok: true }) }));
  assert.equal((await app.fetch(new Request("https://example.com/api"))).status, 200);
  const second = await app.fetch(new Request("https://example.com/api"));
  assert.equal(second.headers.get("ratelimit-remaining"), "0");
  const limited = await app.fetch(new Request("https://example.com/api"));
  assert.equal(limited.status, 429);
  assert.equal((await limited.json() as { error: string }).error, "RATE_LIMITED");
});
