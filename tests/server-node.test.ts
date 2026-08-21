import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { clientAddress, createServer, gracefulShutdown } from "../packages/server-node/src/index.ts";

test("rejects oversized request bodies with a safe 413 response", async () => {
  const server = createServer(async (request) => Response.json({ size: (await request.text()).length }), { maxBodyBytes: 8 });
  const url = await listen(server);
  try {
    const response = await fetch(url, { method: "POST", body: "123456789" });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "PAYLOAD_TOO_LARGE" });
  } finally {
    await gracefulShutdown(server);
  }
});

test("aborts handlers after the configured request timeout", async () => {
  let aborted = false;
  const server = createServer((request) => new Promise<Response>((resolve) => {
    request.signal.addEventListener("abort", () => { aborted = true; resolve(new Response("late")); }, { once: true });
  }), { requestTimeoutMs: 20 });
  const url = await listen(server);
  try {
    const response = await fetch(url);
    assert.equal(response.status, 408);
    assert.deepEqual(await response.json(), { error: "REQUEST_TIMEOUT" });
    assert.equal(aborted, true);
  } finally {
    await gracefulShutdown(server);
  }
});

test("ignores forwarded identity until the direct proxy is trusted", async () => {
  const handler = (request: Request) => Response.json({ url: request.url, address: clientAddress(request) });
  const untrusted = createServer(handler);
  const untrustedUrl = await listen(untrusted);
  const direct = await (await fetch(untrustedUrl, { headers: {
    "x-forwarded-for": "203.0.113.9",
    "x-forwarded-host": "public.example",
    "x-forwarded-proto": "https",
  } })).json() as { url: string; address: string };
  assert.match(direct.url, /^http:\/\/127\.0\.0\.1:/);
  assert.equal(direct.address, "127.0.0.1");
  await gracefulShutdown(untrusted);

  const trusted = createServer(handler, { trustedProxies: ["127.0.0.1"] });
  const trustedUrl = await listen(trusted);
  try {
    const forwarded = await (await fetch(trustedUrl, { headers: {
      "x-forwarded-for": "203.0.113.9",
      "x-forwarded-host": "public.example",
      "x-forwarded-proto": "https",
    } })).json() as { url: string; address: string };
    assert.equal(forwarded.url, "https://public.example/");
    assert.equal(forwarded.address, "203.0.113.9");
  } finally {
    await gracefulShutdown(trusted);
  }
});

test("graceful shutdown drains an active response", async () => {
  let started!: () => void;
  const active = new Promise<void>((resolve) => { started = resolve; });
  const server = createServer(async () => {
    started();
    await new Promise((resolve) => setTimeout(resolve, 25));
    return new Response("complete");
  });
  const url = await listen(server);
  const responsePromise = fetch(url);
  await active;
  const shutdownPromise = gracefulShutdown(server, { timeoutMs: 500 });
  assert.equal(await (await responsePromise).text(), "complete");
  assert.deepEqual(await shutdownPromise, { forced: false });
});

async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}/`;
}
