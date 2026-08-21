import { createServer as createNodeServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { once } from "node:events";

export type FetchHandler = (request: Request) => Response | Promise<Response>;
export type TrustedProxies = readonly string[] | ((address: string) => boolean);

export interface NodeServerOptions {
  readonly maxBodyBytes?: number;
  readonly requestTimeoutMs?: number;
  readonly trustedProxies?: TrustedProxies;
}

export interface GracefulShutdownOptions {
  readonly timeoutMs?: number;
  readonly beforeClose?: () => void | Promise<void>;
}

export class RequestBodyTooLargeError extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(`Request body exceeds ${limit} bytes`);
    this.name = "RequestBodyTooLargeError";
    this.limit = limit;
  }
}

export class RequestTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Request exceeded ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function createServer(handler: FetchHandler, options: NodeServerOptions = {}): Server {
  const maxBodyBytes = options.maxBodyBytes ?? 1_048_576;
  const requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 0) throw new TypeError("maxBodyBytes must be a non-negative safe integer");
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) throw new TypeError("requestTimeoutMs must be positive");

  return createNodeServer(async (incoming, outgoing) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new RequestTimeoutError(requestTimeoutMs)), requestTimeoutMs);
    const disconnect = () => controller.abort(new DOMException("Client disconnected", "AbortError"));
    incoming.once("aborted", disconnect);
    try {
      const request = await toWebRequest(incoming, controller.signal, maxBodyBytes, options.trustedProxies);
      const timeoutResult = aborted(controller.signal);
      const handlerResult = Promise.resolve().then(() => handler(request));
      const response = await Promise.race([timeoutResult, handlerResult]);
      await sendWebResponse(response, outgoing, controller.signal);
    } catch (error) {
      await sendNodeError(error, outgoing);
    } finally {
      clearTimeout(timeout);
      incoming.off("aborted", disconnect);
    }
  });
}

export async function gracefulShutdown(server: Server, options: GracefulShutdownOptions = {}): Promise<{ forced: boolean }> {
  await options.beforeClose?.();
  let forced = false;
  const closed = new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeIdleConnections?.();
  });
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new TypeError("Shutdown timeout must be non-negative");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      forced = true;
      server.closeAllConnections?.();
      resolve();
    }, timeoutMs);
  });
  const idleSweep = setInterval(() => server.closeIdleConnections?.(), 25);
  await Promise.race([closed, deadline]);
  clearInterval(idleSweep);
  if (timer) clearTimeout(timer);
  if (forced) await closed;
  return { forced };
}

export function clientAddress(request: Request): string | null {
  return request.headers.get("x-cocoframe-client-address");
}

async function toWebRequest(incoming: IncomingMessage, signal: AbortSignal, maxBodyBytes: number, trustedProxies?: TrustedProxies): Promise<Request> {
  const remoteAddress = normalizeAddress(incoming.socket.remoteAddress ?? "unknown");
  const trusted = isTrustedProxy(remoteAddress, trustedProxies);
  const origin = requestOrigin(
    incoming.socket,
    incoming.headers.host,
    trusted ? firstHeader(incoming.headers["x-forwarded-proto"]) : undefined,
    trusted ? firstHeader(incoming.headers["x-forwarded-host"]) : undefined,
  );
  const method = incoming.method ?? "GET";
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  headers.set("x-cocoframe-client-address", resolveClientAddress(
    remoteAddress,
    trusted ? firstHeader(incoming.headers["x-forwarded-for"]) : undefined,
    trustedProxies,
  ));

  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(incoming, maxBodyBytes, signal);
  return new Request(new URL(incoming.url ?? "/", origin), {
    method,
    headers,
    signal,
    ...(body ? { body: body as BodyInit } : {}),
  });
}

async function sendWebResponse(response: Response, outgoing: ServerResponse, signal: AbortSignal): Promise<void> {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  if (!response.body) {
    outgoing.end();
    return;
  }
  const reader = response.body.getReader();
  let disconnected = false;
  const handleDisconnect = () => {
    disconnected = true;
    void reader.cancel("Client disconnected");
  };
  const handleAbort = () => {
    disconnected = true;
    void reader.cancel(signal.reason);
    outgoing.destroy(signal.reason instanceof Error ? signal.reason : undefined);
  };
  outgoing.once("close", handleDisconnect);
  signal.addEventListener("abort", handleAbort, { once: true });
  try {
    while (!disconnected) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!outgoing.write(Buffer.from(value))) await once(outgoing, "drain");
    }
    if (!disconnected) outgoing.end();
  } finally {
    outgoing.off("close", handleDisconnect);
    signal.removeEventListener("abort", handleAbort);
    reader.releaseLock();
  }
}

async function sendNodeError(error: unknown, outgoing: ServerResponse): Promise<void> {
  if (outgoing.headersSent || outgoing.destroyed) return;
  const status = error instanceof RequestBodyTooLargeError ? 413 : error instanceof RequestTimeoutError ? 408 : 500;
  const code = status === 413 ? "PAYLOAD_TOO_LARGE" : status === 408 ? "REQUEST_TIMEOUT" : "INTERNAL_SERVER_ERROR";
  outgoing.statusCode = status;
  outgoing.setHeader("content-type", "application/json; charset=utf-8");
  outgoing.setHeader("cache-control", "no-store");
  if (status !== 500) outgoing.setHeader("connection", "close");
  outgoing.end(JSON.stringify({ error: code }));
}

function requestOrigin(socket: Socket, host = "localhost", forwardedProtocol?: string, forwardedHost?: string): string {
  const directProtocol = "encrypted" in socket && socket.encrypted ? "https" : "http";
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http" ? forwardedProtocol : directProtocol;
  return `${protocol}://${forwardedHost ?? host}`;
}

async function readBody(incoming: IncomingMessage, limit: number, signal: AbortSignal): Promise<Uint8Array | undefined> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of incoming) {
    if (signal.aborted) throw signal.reason;
    const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += bytes.byteLength;
    if (size > limit) {
      incoming.resume();
      throw new RequestBodyTooLargeError(limit);
    }
    chunks.push(bytes);
  }
  return chunks.length === 0 ? undefined : Buffer.concat(chunks);
}

function aborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

function isTrustedProxy(address: string, trusted?: TrustedProxies): boolean {
  if (!trusted) return false;
  return typeof trusted === "function" ? trusted(address) : trusted.map(normalizeAddress).includes(address);
}

function resolveClientAddress(remote: string, forwarded: string | undefined, trusted?: TrustedProxies): string {
  if (!forwarded || !isTrustedProxy(remote, trusted)) return remote;
  const chain = forwarded.split(",").map((value) => normalizeAddress(value.trim())).filter(Boolean);
  for (let index = chain.length - 1; index >= 0; index--) {
    const address = chain[index];
    if (address && !isTrustedProxy(address, trusted)) return address;
  }
  return chain[0] ?? remote;
}

function normalizeAddress(address: string): string {
  return address.startsWith("::ffff:") ? address.slice(7) : address;
}

function firstHeader(value: string | readonly string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.split(",", 1)[0]?.trim();
}
