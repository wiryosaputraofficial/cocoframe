import assert from "node:assert/strict";
import test from "node:test";
import { createContextKey, CocoFrameApp } from "../packages/core/src/index.ts";
import { createSessionAuth, protectSession, sessionMiddleware, type Session } from "../packages/auth/src/index.ts";

test("commits, verifies, expires, and clears signed cookie sessions", async () => {
  const auth = createSessionAuth<{ userId: string }>({
    secret: "a-secure-test-secret-with-at-least-32-bytes",
    ttlSeconds: 60,
  });
  const now = 1_700_000_000_000;
  const cookie = await auth.commit({ userId: "user-1" }, now);
  assert.match(cookie, /HttpOnly; SameSite=Lax; Secure/);
  const request = new Request("https://example.com", { headers: { cookie } });
  assert.deepEqual((await auth.read(request, now + 1_000))?.data, { userId: "user-1" });
  assert.equal(await auth.read(request, now + 61_000), null);

  const token = cookie.split(";", 1)[0]!;
  const tampered = new Request("https://example.com", { headers: { cookie: `${token.slice(0, -1)}x` } });
  assert.equal(await auth.read(tampered, now), null);
  assert.match(auth.clear(), /Max-Age=0/);
});

test("rejects weak secrets", () => {
  assert.throws(() => createSessionAuth({ secret: "short" }), /at least 32 bytes/);
});

test("loads sessions into typed middleware context and protects selected routes", async () => {
  type UserSession = { readonly userId: string; readonly role: "admin" | "member" };
  const auth = createSessionAuth<UserSession>({
    secret: "another-secure-test-secret-with-32-bytes",
    secure: false,
  });
  const sessionKey = createContextKey<Session<UserSession>>("session");
  const app = new CocoFrameApp();
  app.use(
    sessionMiddleware(auth, sessionKey),
    protectSession(sessionKey, {
      match: ({ url }) => url.pathname.startsWith("/admin"),
      authorize: ({ data }) => data.role === "admin",
    }),
  );
  app.api("/public", { method: "GET", handle: () => ({ ok: true }) });
  app.api("/admin", { method: "GET", handle: (context) => ({ userId: context.get(sessionKey)?.data.userId }) });

  assert.equal((await app.fetch(new Request("https://example.com/public"))).status, 200);
  assert.equal((await app.fetch(new Request("https://example.com/admin"))).status, 401);
  const member = await auth.commit({ userId: "member-1", role: "member" });
  assert.equal((await app.fetch(new Request("https://example.com/admin", { headers: { cookie: member } }))).status, 403);
  const admin = await auth.commit({ userId: "admin-1", role: "admin" });
  const response = await app.fetch(new Request("https://example.com/admin", { headers: { cookie: admin } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { userId: "admin-1" });
});
