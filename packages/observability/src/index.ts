import { createContextKey, defineMiddleware, type Middleware, type RequestContext } from "@cocoframe/core";

export const requestIdKey = createContextKey<string>("request-id");

export interface RequestLogEvent {
  readonly type: "request";
  readonly timestamp: string;
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly durationMs: number;
  readonly fields?: Readonly<Record<string, unknown>>;
}

export interface RequestIdOptions {
  readonly headerName?: string;
  readonly trustIncoming?: boolean;
  readonly create?: () => string;
}

export function requestId(options: RequestIdOptions = {}): Middleware {
  const headerName = options.headerName ?? "x-request-id";
  return defineMiddleware("observability.request-id", async (context, next) => {
    const incoming = options.trustIncoming ? context.request.headers.get(headerName) : null;
    const id = incoming && validRequestId(incoming) ? incoming : (options.create ? options.create() : crypto.randomUUID());
    context.set(requestIdKey, id);
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set(headerName, id);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  });
}

export interface RequestLoggerOptions {
  readonly write?: (event: RequestLogEvent) => void | Promise<void>;
  readonly fields?: (context: RequestContext) => Readonly<Record<string, unknown>> | undefined;
  readonly sample?: (context: RequestContext) => boolean;
}

export function requestLogger(options: RequestLoggerOptions = {}): Middleware {
  const write = options.write ?? ((event: RequestLogEvent) => console.log(JSON.stringify(event)));
  return defineMiddleware("observability.request-logger", async (context, next) => {
    if (options.sample && !options.sample(context)) return next();
    const started = performance.now();
    const response = await next();
    const requestId = context.get(requestIdKey) ?? crypto.randomUUID();
    const fields = options.fields?.(context);
    await write({
      type: "request",
      timestamp: new Date().toISOString(),
      requestId,
      method: context.request.method,
      path: context.url.pathname,
      status: response.status,
      durationMs: Number((performance.now() - started).toFixed(3)),
      ...(fields ? { fields } : {}),
    });
    return response;
  });
}

function validRequestId(value: string): boolean {
  return value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}
