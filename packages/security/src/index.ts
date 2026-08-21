import { createContextKey, defineMiddleware, type Middleware, type RequestContext } from "@cocoframe/core";

export interface SecurityHeadersOptions {
  readonly contentSecurityPolicy?: string | false;
  readonly frameOptions?: "DENY" | "SAMEORIGIN" | false;
  readonly permissionsPolicy?: string | false;
  readonly crossOriginOpenerPolicy?: "same-origin" | "same-origin-allow-popups" | "unsafe-none" | false;
}

const defaultCsp = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'";

export function securityHeaders(options: SecurityHeadersOptions = {}): Middleware {
  return defineMiddleware("security.headers", async (_context, next) => {
    const response = await next();
    const headers = new Headers(response.headers);
    setUnlessDisabled(headers, "content-security-policy", options.contentSecurityPolicy ?? defaultCsp);
    setUnlessDisabled(headers, "x-frame-options", options.frameOptions ?? "DENY");
    setUnlessDisabled(headers, "permissions-policy", options.permissionsPolicy ?? "camera=(), microphone=(), geolocation=()");
    setUnlessDisabled(headers, "cross-origin-opener-policy", options.crossOriginOpenerPolicy ?? "same-origin");
    headers.set("x-content-type-options", "nosniff");
    if (!headers.has("referrer-policy")) headers.set("referrer-policy", "strict-origin-when-cross-origin");
    return cloneResponse(response, headers);
  });
}

export interface CorsOptions {
  readonly origins: readonly string[] | ((origin: string, context: RequestContext) => boolean | Promise<boolean>);
  readonly methods?: readonly string[];
  readonly headers?: readonly string[];
  readonly exposeHeaders?: readonly string[];
  readonly credentials?: boolean;
  readonly maxAge?: number;
  readonly match?: (context: RequestContext) => boolean;
}

export function cors(options: CorsOptions): Middleware {
  const methods = options.methods ?? ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
  return defineMiddleware("security.cors", async (context, next) => {
    if (options.match && !options.match(context)) return next();
    const origin = context.request.headers.get("origin");
    if (!origin) return next();
    const allowed = typeof options.origins === "function" ? await options.origins(origin, context) : options.origins.includes(origin);
    if (!allowed) {
      return context.request.method === "OPTIONS"
        ? Response.json({ error: "CORS_ORIGIN_DENIED" }, { status: 403 })
        : next();
    }
    if (context.request.method === "OPTIONS" && context.request.headers.has("access-control-request-method")) {
      const requestedMethod = context.request.headers.get("access-control-request-method")?.toUpperCase() ?? "";
      if (!methods.includes(requestedMethod)) return Response.json({ error: "CORS_METHOD_DENIED" }, { status: 405 });
      const headers = new Headers();
      applyCors(headers, origin, methods, options);
      return new Response(null, { status: 204, headers });
    }
    const response = await next();
    const headers = new Headers(response.headers);
    applyCors(headers, origin, methods, options);
    return cloneResponse(response, headers);
  });
}

export const csrfTokenKey = createContextKey<string>("csrf-token");

export interface CsrfOptions {
  readonly trustedOrigins?: readonly string[];
  readonly cookieName?: string;
  readonly headerName?: string;
  readonly fieldName?: string;
  readonly secure?: boolean;
  readonly match?: (context: RequestContext) => boolean;
}

export function csrfProtection(options: CsrfOptions = {}): Middleware {
  const cookieName = options.cookieName ?? "fast_csrf";
  const headerName = options.headerName ?? "x-csrf-token";
  const fieldName = options.fieldName ?? "_csrf";
  const secure = options.secure ?? true;
  return defineMiddleware("security.csrf", async (context, next) => {
    if (options.match && !options.match(context)) return next();
    const existing = readCookie(context.request.headers.get("cookie"), cookieName);
    const token = existing ?? randomToken();
    context.set(csrfTokenKey, token);
    if (!isSafeMethod(context.request.method)) {
      const origin = context.request.headers.get("origin");
      if (!origin || (origin !== context.url.origin && !options.trustedOrigins?.includes(origin))) {
        return Response.json({ error: "CSRF_ORIGIN_DENIED" }, { status: 403, headers: { "cache-control": "no-store" } });
      }
      const submitted = context.request.headers.get(headerName) ?? await formToken(context.request, fieldName);
      if (!existing || !submitted || !safeEqual(existing, submitted)) {
        return Response.json({ error: "CSRF_TOKEN_INVALID" }, { status: 403, headers: { "cache-control": "no-store" } });
      }
    }
    const response = await next();
    if (existing) return response;
    const headers = new Headers(response.headers);
    headers.append("set-cookie", `${cookieName}=${token}; Path=/; SameSite=Strict${secure ? "; Secure" : ""}`);
    return cloneResponse(response, headers);
  });
}

export interface RateLimitOptions {
  readonly limit: number;
  readonly windowMs: number;
  readonly key: (context: RequestContext) => string | Promise<string>;
  readonly match?: (context: RequestContext) => boolean;
  readonly maxKeys?: number;
}

export function rateLimit(options: RateLimitOptions): Middleware {
  if (!Number.isInteger(options.limit) || options.limit < 1) throw new TypeError("Rate limit must be a positive integer");
  if (!Number.isFinite(options.windowMs) || options.windowMs < 1) throw new TypeError("Rate limit window must be positive");
  const entries = new Map<string, { count: number; resetAt: number }>();
  return defineMiddleware("security.rate-limit", async (context, next) => {
    if (options.match && !options.match(context)) return next();
    const now = Date.now();
    const key = await options.key(context);
    let entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      entries.set(key, entry);
    }
    entry.count++;
    if (entries.size > (options.maxKeys ?? 10_000)) removeOldest(entries);
    const remaining = Math.max(0, options.limit - entry.count);
    const headers = new Headers({
      "ratelimit-limit": String(options.limit),
      "ratelimit-remaining": String(remaining),
      "ratelimit-reset": String(Math.ceil(entry.resetAt / 1_000)),
    });
    if (entry.count > options.limit) {
      headers.set("retry-after", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1_000))));
      headers.set("cache-control", "no-store");
      return Response.json({ error: "RATE_LIMITED" }, { status: 429, headers });
    }
    const response = await next();
    const output = new Headers(response.headers);
    headers.forEach((value, name) => output.set(name, value));
    return cloneResponse(response, output);
  });
}

function applyCors(headers: Headers, origin: string, methods: readonly string[], options: CorsOptions): void {
  headers.set("access-control-allow-origin", origin);
  headers.append("vary", "Origin");
  headers.set("access-control-allow-methods", methods.join(", "));
  if (options.headers?.length) headers.set("access-control-allow-headers", options.headers.join(", "));
  if (options.exposeHeaders?.length) headers.set("access-control-expose-headers", options.exposeHeaders.join(", "));
  if (options.credentials) headers.set("access-control-allow-credentials", "true");
  if (options.maxAge !== undefined) headers.set("access-control-max-age", String(Math.max(0, Math.floor(options.maxAge))));
}

function cloneResponse(response: Response, headers: Headers): Response {
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function setUnlessDisabled(headers: Headers, name: string, value: string | false): void {
  if (value !== false && !headers.has(name)) headers.set(name, value);
}

function isSafeMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

async function formToken(request: Request, fieldName: string): Promise<string | null> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/x-www-form-urlencoded") && !type.includes("multipart/form-data")) return null;
  const value = (await request.clone().formData()).get(fieldName);
  return typeof value === "string" ? value : null;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function removeOldest(entries: Map<string, { count: number; resetAt: number }>): void {
  let oldestKey: string | undefined;
  let oldestReset = Number.POSITIVE_INFINITY;
  for (const [key, value] of entries) {
    if (value.resetAt < oldestReset) {
      oldestKey = key;
      oldestReset = value.resetAt;
    }
  }
  if (oldestKey !== undefined) entries.delete(oldestKey);
}
