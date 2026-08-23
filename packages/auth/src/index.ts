import { defineMiddleware, type ContextKey, type Middleware, type RequestContext } from "@cocoframe/core";

export interface SessionOptions {
  readonly secret: string | Uint8Array;
  readonly cookieName?: string;
  readonly ttlSeconds?: number;
  readonly secure?: boolean;
  readonly sameSite?: "Strict" | "Lax" | "None";
  readonly path?: string;
}

export interface Session<Data> {
  readonly data: Data;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export interface SessionAuth<Data> {
  readonly read: (request: Request, now?: number) => Promise<Session<Data> | null>;
  readonly commit: (data: Data, now?: number) => Promise<string>;
  readonly clear: () => string;
}

export interface SessionProtection<Data> {
  readonly match?: (context: RequestContext) => boolean;
  readonly authorize?: (session: Session<Data>, context: RequestContext) => boolean | Promise<boolean>;
  readonly unauthenticated?: (context: RequestContext) => Response;
  readonly forbidden?: (context: RequestContext) => Response;
}

interface SessionPayload<Data> {
  readonly data: Data;
  readonly iat: number;
  readonly exp: number;
}

/**
 * Creates typed signed-cookie session operations using HMAC SHA-256 through Web Crypto.
 */
export function createSessionAuth<Data extends Readonly<Record<string, unknown>>>(
  options: SessionOptions,
): SessionAuth<Data> {
  const secret = typeof options.secret === "string" ? new TextEncoder().encode(options.secret) : options.secret;
  if (secret.byteLength < 32) throw new TypeError("Session secret must contain at least 32 bytes");
  const cookieName = options.cookieName ?? "fast_session";
  if (!/^[A-Za-z0-9_-]+$/.test(cookieName)) throw new TypeError(`Invalid session cookie name: ${cookieName}`);
  const ttlSeconds = options.ttlSeconds ?? 60 * 60 * 24 * 7;
  const cookie = {
    secure: options.secure ?? true,
    sameSite: options.sameSite ?? "Lax",
    path: options.path ?? "/",
  };
  let keyPromise: Promise<CryptoKey> | undefined;
  const key = () => keyPromise ??= crypto.subtle.importKey("raw", toArrayBuffer(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

  return {
    async read(request, now = Date.now()) {
      const token = readCookie(request.headers.get("cookie"), cookieName);
      if (!token) return null;
      const separator = token.lastIndexOf(".");
      if (separator < 1) return null;
      const encodedPayload = token.slice(0, separator);
      const encodedSignature = token.slice(separator + 1);
      try {
        const valid = await crypto.subtle.verify(
          "HMAC",
          await key(),
          toArrayBuffer(fromBase64Url(encodedSignature)),
          new TextEncoder().encode(encodedPayload),
        );
        if (!valid) return null;
        const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as SessionPayload<Data>;
        if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp) || payload.exp <= now) return null;
        return { data: payload.data, issuedAt: payload.iat, expiresAt: payload.exp };
      } catch {
        return null;
      }
    },
    async commit(data, now = Date.now()) {
      const payload: SessionPayload<Data> = { data, iat: now, exp: now + ttlSeconds * 1_000 };
      const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
      const signature = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(encodedPayload));
      const token = `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
      return serializeCookie(cookieName, token, { ...cookie, maxAge: ttlSeconds });
    },
    clear() {
      return serializeCookie(cookieName, "", { ...cookie, maxAge: 0 });
    },
  };
}

/**
 * Loads a verified signed session into typed request context.
 */
export function sessionMiddleware<Data>(auth: SessionAuth<Data>, key: ContextKey<Session<Data>>): Middleware {
  return defineMiddleware("auth.session", async (context, next) => {
    const session = await auth.read(context.request);
    if (session) context.set(key, session);
    return next();
  });
}

/**
 * Creates route-selective middleware that requires a verified session without replacing authorization checks.
 */
export function protectSession<Data>(key: ContextKey<Session<Data>>, options: SessionProtection<Data> = {}): Middleware {
  return defineMiddleware("auth.protect-session", async (context, next) => {
    if (options.match && !options.match(context)) return next();
    const session = context.get(key);
    if (!session) {
      return options.unauthenticated?.(context) ?? authError("UNAUTHENTICATED", 401);
    }
    if (options.authorize && !await options.authorize(session, context)) {
      return options.forbidden?.(context) ?? authError("FORBIDDEN", 403);
    }
    return next();
  });
}

function authError(error: "UNAUTHENTICATED" | "FORBIDDEN", status: number): Response {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function serializeCookie(
  name: string,
  value: string,
  options: { secure: boolean; sameSite: string; path: string; maxAge: number },
): string {
  const attributes = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${Math.max(0, Math.floor(options.maxAge))}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
  ];
  if (options.secure) attributes.push("Secure");
  return attributes.join("; ");
}

function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return Uint8Array.from(value).buffer;
}
