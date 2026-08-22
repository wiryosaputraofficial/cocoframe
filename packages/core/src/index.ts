import { defer, escapeAttribute, escapeText, jsx, renderToChunks, renderToString, type CocoNode } from "@cocoframe/jsx";
import { normalizePath, Router, type HttpMethod } from "@cocoframe/router";
import { ValidationError, type Schema } from "@cocoframe/schema";

export interface RequestContext {
  readonly request: Request;
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly get: <Value>(key: ContextKey<Value>) => Value | undefined;
  readonly set: <Value>(key: ContextKey<Value>, value: Value) => void;
}

export interface ContextKey<Value> {
  readonly name: string;
  readonly __value?: Value;
}

export type Middleware = ((context: RequestContext, next: () => Promise<Response>) => Response | Promise<Response>) & {
  readonly id?: string;
};

export interface OpenApiInfo {
  readonly title?: string;
  readonly version?: string;
  readonly description?: string;
}

export interface HealthOptions {
  readonly livePath?: string;
  readonly readyPath?: string;
  readonly readiness?: () => boolean | Promise<boolean>;
}

export interface RuntimeAssets {
  readonly client?: string;
  readonly stream?: string;
}

export interface PageMeta {
  readonly title: string;
  readonly description?: string;
  readonly canonical?: string;
  readonly image?: string;
  readonly robots?: string;
  readonly type?: "website" | "article";
  readonly twitterCard?: "summary" | "summary_large_image";
  readonly jsonLd?: Readonly<Record<string, unknown>> | readonly Readonly<Record<string, unknown>>[];
}

export interface PageDefinition<Data> {
  readonly load?: (context: RequestContext) => Data | Promise<Data>;
  readonly meta: PageMeta | ((data: Data, context: RequestContext) => PageMeta | Promise<PageMeta>);
  readonly status?: number | ((data: Data, context: RequestContext) => number | Promise<number>);
  readonly view: (data: Data, context: RequestContext) => CocoNode;
  readonly action?: (context: RequestContext) => Response | ActionRender | void | Promise<Response | ActionRender | void>;
  readonly error?: (error: unknown, context: RequestContext) => CocoNode;
  readonly cache?: CachePolicy;
}

export interface ActionRender {
  readonly kind: "action-render";
  readonly status: number;
}

export interface CachePolicy {
  readonly browser?: number;
  readonly edge?: number;
  readonly staleWhileRevalidate?: number;
  readonly private?: boolean;
}

export interface ApiInputSchemas {
  readonly params?: Schema<unknown>;
  readonly query?: Schema<unknown>;
  readonly body?: Schema<unknown>;
}

export type ApiInput<Definitions extends ApiInputSchemas> = {
  readonly params: Definitions["params"] extends Schema<infer Output> ? Output : Readonly<Record<string, string>>;
  readonly query: Definitions["query"] extends Schema<infer Output> ? Output : Readonly<Record<string, string | string[]>>;
  readonly body: Definitions["body"] extends Schema<infer Output> ? Output : undefined;
};

export interface ApiContext<Definitions extends ApiInputSchemas> extends RequestContext {
  readonly input: ApiInput<Definitions>;
}

export interface ApiDefinition<Definitions extends ApiInputSchemas = ApiInputSchemas, Output = unknown> {
  readonly id?: string;
  readonly method: HttpMethod;
  readonly input?: Definitions;
  readonly output?: Schema<Output>;
  readonly handle: (context: ApiContext<Definitions>) => Response | Output | Promise<Response | Output>;
}

export interface ApiContractManifest {
  readonly id: string;
  readonly method: HttpMethod;
  readonly pattern: string;
  readonly input: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly output?: Readonly<Record<string, unknown>>;
}

export type AppRouteKind = "page" | "action" | "api" | "system";

export interface AppRouteManifest {
  readonly method: HttpMethod;
  readonly pattern: string;
  readonly kind: AppRouteKind;
}

export interface LayoutProps {
  readonly children: CocoNode;
  readonly context: RequestContext;
}

export type LayoutDefinition = (props: LayoutProps) => CocoNode;

export interface AppOptions {
  readonly development?: boolean;
  readonly language?: string;
  readonly siteName?: string;
  readonly stylesheets?: readonly string[];
  readonly siteUrl?: string;
  readonly allowedHosts?: readonly string[];
  readonly openapi?: OpenApiInfo;
  readonly middleware?: readonly Middleware[];
  readonly health?: false | HealthOptions;
  readonly assets?: RuntimeAssets;
}

type RegisteredHandler =
  | { readonly kind: "page"; readonly page: PageDefinition<unknown> }
  | { readonly kind: "action"; readonly page: PageDefinition<unknown> }
  | { readonly kind: "api"; readonly api: ApiDefinition<ApiInputSchemas, unknown> };

export function definePage<Data = undefined>(definition: PageDefinition<Data>): PageDefinition<Data> {
  return Object.freeze(definition);
}

export function defineApi<const Definitions extends ApiInputSchemas = ApiInputSchemas, Output = unknown>(
  definition: ApiDefinition<Definitions, Output>,
): ApiDefinition<Definitions, Output> {
  return Object.freeze(definition);
}

export function defineLayout(definition: LayoutDefinition): LayoutDefinition {
  return definition;
}

export function defineConfig<const Options extends AppOptions>(options: Options): Options {
  return Object.freeze(options);
}

export function createContextKey<Value>(name: string): ContextKey<Value> {
  return Object.freeze({ name });
}

export function defineMiddleware(id: string, middleware: Middleware): Middleware;
export function defineMiddleware(middleware: Middleware): Middleware;
export function defineMiddleware(idOrMiddleware: string | Middleware, input?: Middleware): Middleware {
  const middleware = typeof idOrMiddleware === "string" ? input : idOrMiddleware;
  if (!middleware) throw new TypeError("Middleware implementation is required");
  if (typeof idOrMiddleware === "string") Object.defineProperty(middleware, "id", { value: idOrMiddleware, enumerable: true });
  return middleware;
}

export function defineFormAction<Input>(
  input: Schema<Input>,
  handle: (input: Input, context: RequestContext) => Response | void | Promise<Response | void>,
): NonNullable<PageDefinition<unknown>["action"]> {
  return async (context) => {
    try {
      return await handle(input.parse(await requestBody(context.request)), context);
    } catch (error) {
      if (error instanceof ValidationError) return json({ error: "VALIDATION_ERROR", issues: error.issues }, { status: 422 });
      throw error;
    }
  };
}

export function rerender(status = 422): ActionRender {
  if (!Number.isInteger(status) || status < 400 || status > 599) throw new TypeError("Action render status must be between 400 and 599");
  return Object.freeze({ kind: "action-render", status });
}

export function withLayouts<Data>(
  page: PageDefinition<Data>,
  layouts: readonly LayoutDefinition[],
): PageDefinition<Data> {
  if (layouts.length === 0) return page;
  return {
    ...page,
    view(data, context) {
      return layouts.reduceRight<CocoNode>(
        (children, layout) => layout({ children, context }),
        page.view(data, context),
      );
    },
  };
}

export class CocoFrameApp {
  readonly #router = new Router<RegisteredHandler>();
  readonly #contracts: ApiContractManifest[] = [];
  readonly #routes: AppRouteManifest[] = [];
  readonly #middleware: Middleware[] = [];
  readonly #options: {
    readonly development: boolean;
    readonly language: string;
    readonly siteName: string;
    readonly stylesheets: readonly string[];
    readonly siteUrl?: string;
    readonly allowedHosts: ReadonlySet<string>;
    readonly openapi: Required<Pick<OpenApiInfo, "title" | "version">> & OpenApiInfo;
    readonly health: false | Required<Pick<HealthOptions, "livePath" | "readyPath">> & HealthOptions;
    readonly assets: Required<RuntimeAssets>;
  };

  constructor(options: AppOptions = {}) {
    this.#options = {
      development: options.development ?? false,
      language: options.language ?? "en",
      siteName: options.siteName ?? "CocoFrame",
      stylesheets: options.stylesheets ?? [],
      allowedHosts: new Set((options.allowedHosts ?? []).map(normalizeAllowedHost)),
      openapi: {
        title: options.openapi?.title ?? `${options.siteName ?? "CocoFrame"} API`,
        version: options.openapi?.version ?? "0.0.1",
        ...(options.openapi?.description ? { description: options.openapi.description } : {}),
      },
      health: options.health === false ? false : {
        livePath: options.health?.livePath ?? "/_health/live",
        readyPath: options.health?.readyPath ?? "/_health/ready",
        ...(options.health?.readiness ? { readiness: options.health.readiness } : {}),
      },
      assets: {
        client: options.assets?.client ?? "/coco-assets/client.js",
        stream: options.assets?.stream ?? "/coco-assets/stream.js",
      },
      ...(options.siteUrl ? { siteUrl: options.siteUrl.replace(/\/$/, "") } : {}),
    };
    this.#middleware.push(...(options.middleware ?? []));
  }

  use(...middleware: readonly Middleware[]): this {
    this.#middleware.push(...middleware);
    return this;
  }

  page<Data>(pattern: string, definition: PageDefinition<Data>): this {
    const normalizedPattern = normalizePath(pattern);
    this.#router.add("GET", normalizedPattern, {
      kind: "page",
      page: definition as PageDefinition<unknown>,
    });
    this.#routes.push(Object.freeze({ method: "GET", pattern: normalizedPattern, kind: "page" }));
    if (definition.action) {
      this.#router.add("POST", normalizedPattern, {
        kind: "action",
        page: definition as PageDefinition<unknown>,
      });
      this.#routes.push(Object.freeze({ method: "POST", pattern: normalizedPattern, kind: "action" }));
    }
    return this;
  }

  api<Definitions extends ApiInputSchemas, Output>(pattern: string, definition: ApiDefinition<Definitions, Output>): this {
    const api = definition as ApiDefinition<ApiInputSchemas, unknown>;
    const normalizedPattern = normalizePath(pattern);
    this.#router.add(definition.method, normalizedPattern, { kind: "api", api });
    this.#routes.push(Object.freeze({ method: definition.method, pattern: normalizedPattern, kind: "api" }));
    if (definition.id) {
      if (this.#contracts.some((contract) => contract.id === definition.id)) throw new Error(`Duplicate API contract id: ${definition.id}`);
      const input = definition.input ?? {};
      this.#contracts.push({
        id: definition.id,
        method: definition.method,
        pattern: normalizedPattern,
        input: Object.fromEntries(Object.entries(input as Record<string, Schema<unknown>>).map(([key, value]) => [key, value.json()])),
        ...(definition.output ? { output: definition.output.json() } : {}),
      });
    }
    return this;
  }

  contracts(): readonly ApiContractManifest[] {
    return this.#contracts;
  }

  openapi(): Required<Pick<OpenApiInfo, "title" | "version">> & OpenApiInfo {
    return this.#options.openapi;
  }

  middleware(): readonly { readonly index: number; readonly id: string }[] {
    return this.#middleware.map((middleware, index) => ({ index, id: middleware.id ?? "anonymous" }));
  }

  manifest(): readonly AppRouteManifest[] {
    const routes = [...this.#routes].sort((left, right) => left.pattern.localeCompare(right.pattern));
    if (this.#options.health) {
      routes.push({ method: "GET", pattern: this.#options.health.livePath, kind: "system" });
      routes.push({ method: "GET", pattern: this.#options.health.readyPath, kind: "system" });
    }
    return routes;
  }

  fetch = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (!this.#options.development && this.#options.allowedHosts.size > 0 && !this.#options.allowedHosts.has(normalizeUrlHost(url))) {
      return json({ error: "HOST_NOT_ALLOWED" }, { status: 421, headers: { "cache-control": "no-store" } });
    }
    const requestedMethod = request.method.toUpperCase() as HttpMethod;
    const match =
      this.#router.match(requestedMethod, url.pathname) ??
      (requestedMethod === "HEAD" ? this.#router.match("GET", url.pathname) : null);

    const values = new Map<ContextKey<unknown>, unknown>();
    const context: RequestContext = {
      request,
      url,
      params: match?.params ?? {},
      query: url.searchParams,
      get: <Value>(key: ContextKey<Value>) => values.get(key as ContextKey<unknown>) as Value | undefined,
      set: <Value>(key: ContextKey<Value>, value: Value) => { values.set(key as ContextKey<unknown>, value); },
    };

    try {
      const dispatch = async (index: number): Promise<Response> => {
        const middleware = this.#middleware[index];
        if (middleware) {
          let called = false;
          return middleware(context, async () => {
            if (called) throw new Error(`Middleware called next() more than once: ${index}`);
            called = true;
            return dispatch(index + 1);
          });
        }
        if (!match) return await this.#healthEndpoint(url) ?? this.#seoEndpoint(url) ?? this.#notFound(url);
        if (match.handler.kind === "api") return this.#handleApi(match.handler.api, context);
        if (match.handler.kind === "action") {
          const result = await match.handler.page.action?.(context);
          if (result instanceof Response) return result;
          if (result?.kind === "action-render") return this.#renderPage(match.handler.page, context, result.status);
          return redirect(url.pathname + url.search, 303);
        }
        const response = await this.#renderPage(match.handler.page, context);
        return requestedMethod === "HEAD" ? new Response(null, response) : response;
      };
      return await dispatch(0);
    } catch (error) {
      return this.#serverError(error);
    }
  };

  async #handleApi(api: ApiDefinition<ApiInputSchemas, unknown>, context: RequestContext): Promise<Response> {
    let input: ApiInput<ApiInputSchemas>;
    try {
      const definitions = api.input ?? {};
      const raw = {
        params: context.params,
        query: searchParamsToObject(context.query),
        body: definitions.body ? await requestBody(context.request) : undefined,
      };
      const parsed: Record<string, unknown> = {};
      const issues: Array<ValidationError["issues"][number]> = [];
      for (const section of ["params", "query", "body"] as const) {
        const definition = definitions[section];
        try {
          parsed[section] = definition ? definition.parse(raw[section]) : raw[section];
        } catch (error) {
          if (error instanceof ValidationError) {
            issues.push(...error.issues.map((issue) => ({ ...issue, path: [section, ...issue.path] })));
          } else throw error;
        }
      }
      if (issues.length > 0) throw new ValidationError(issues);
      input = {
        params: parsed.params,
        query: parsed.query,
        body: parsed.body,
      } as unknown as ApiInput<ApiInputSchemas>;
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({ error: "VALIDATION_ERROR", issues: error.issues }, { status: 400 });
      }
      throw error;
    }
    const result = await api.handle({ ...context, input });
    if (result instanceof Response) return result;
    try {
      const output = api.output ? api.output.parse(result) : result;
      return json(output);
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({
          error: "OUTPUT_VALIDATION_ERROR",
          ...(this.#options.development ? { issues: error.issues } : {}),
        }, { status: 500 });
      }
      throw error;
    }
  }

  #seoEndpoint(url: URL): Response | null {
    const siteUrl = this.#options.siteUrl ?? url.origin;
    if (url.pathname === "/robots.txt") {
      return new Response(`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
      });
    }
    if (url.pathname === "/sitemap.xml") {
      const locations = this.#routes
        .filter(({ kind, method, pattern }) => kind === "page" && method === "GET" && !pattern.includes(":") && !pattern.includes("*"))
        .map(({ pattern }) => `<url><loc>${escapeXml(`${siteUrl}${pattern === "/" ? "" : pattern}`)}</loc></url>`)
        .join("");
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations}</urlset>`, {
        headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
      });
    }
    return null;
  }

  async #healthEndpoint(url: URL): Promise<Response | null> {
    const health = this.#options.health;
    if (!health) return null;
    if (url.pathname === health.livePath) {
      return json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
    }
    if (url.pathname === health.readyPath) {
      try {
        const ready = health.readiness ? await health.readiness() : true;
        return json({ status: ready ? "ready" : "not-ready" }, {
          status: ready ? 200 : 503,
          headers: { "cache-control": "no-store" },
        });
      } catch {
        return json({ status: "not-ready" }, { status: 503, headers: { "cache-control": "no-store" } });
      }
    }
    return null;
  }

  async #renderPage(page: PageDefinition<unknown>, context: RequestContext, statusOverride?: number): Promise<Response> {
    try {
      const data = page.load ? await page.load(context) : undefined;
      const meta = typeof page.meta === "function" ? await page.meta(data, context) : page.meta;
      const configuredStatus = typeof page.status === "function" ? await page.status(data, context) : page.status;
      const status = statusOverride ?? configuredStatus ?? 200;
      if (!Number.isInteger(status) || status < 100 || status > 599) {
        throw new TypeError(`Invalid page status: ${status}`);
      }
      const node = page.view(data, context);
      const documentOptions = {
        meta,
        language: this.#options.language,
        siteName: this.#options.siteName,
        stylesheets: this.#options.stylesheets,
        development: this.#options.development,
        assets: this.#options.assets,
      };

      if (page.error) {
        try {
          const body = await renderToString(node);
          return htmlResponse(renderDocument({ ...documentOptions, body }), status, page.cache);
        } catch (error) {
          return this.#pageError(page, error, context);
        }
      }

      return streamHtmlResponse(node, documentOptions, page.cache, status);
    } catch (error) {
      if (page.error) return this.#pageError(page, error, context);
      throw error;
    }
  }

  async #pageError(page: PageDefinition<unknown>, error: unknown, context: RequestContext): Promise<Response> {
    const body = await renderToString(page.error?.(error, context) ?? "Page failed to render");
    return htmlResponse(renderDocument({
      body,
      language: this.#options.language,
      siteName: this.#options.siteName,
      stylesheets: this.#options.stylesheets,
      development: this.#options.development,
      assets: this.#options.assets,
      meta: { title: "Page error", robots: "noindex, nofollow" },
    }), 500);
  }

  #notFound(url: URL): Response {
    const body = "<main><h1>404</h1><p>Page not found.</p></main>";
    return htmlResponse(
      renderDocument({
        body,
        language: this.#options.language,
        siteName: this.#options.siteName,
        stylesheets: this.#options.stylesheets,
        meta: {
          title: "Page not found",
          description: `No page exists at ${url.pathname}`,
          robots: "noindex, nofollow",
        },
      }),
      404,
    );
  }

  #serverError(error: unknown): Response {
    const body = this.#options.development
      ? renderDevelopmentError(error, "server rendering")
      : "<main><h1>500</h1><p>An unexpected error occurred.</p></main>";
    return htmlResponse(
      renderDocument({
        body,
        language: this.#options.language,
        siteName: this.#options.siteName,
        stylesheets: this.#options.stylesheets,
        development: this.#options.development,
        assets: this.#options.assets,
        meta: { title: "Server error", robots: "noindex, nofollow" },
      }),
      500,
    );
  }
}

interface DocumentOptions {
  readonly body: string;
  readonly meta: PageMeta;
  readonly language: string;
  readonly siteName: string;
  readonly stylesheets?: readonly string[];
  readonly development?: boolean;
  readonly assets?: RuntimeAssets;
}

export function renderDocument(options: DocumentOptions): string {
  return `${documentStart(options)}${options.body}${documentEnd(options.body.includes("<coco-island "), options.development ?? false, options.assets)}`;
}

function documentStart(options: Omit<DocumentOptions, "body">): string {
  const { meta } = options;
  const title = meta.title === options.siteName ? meta.title : `${meta.title} · ${options.siteName}`;
  const tags = [
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeText(title)}</title>`,
    ...(options.stylesheets ?? []).map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}">`),
    meta.description ? metaTag("description", meta.description) : "",
    meta.robots ? metaTag("robots", meta.robots) : "",
    meta.canonical ? `<link rel=\"canonical\" href=\"${escapeAttribute(meta.canonical)}\">` : "",
    propertyTag("og:title", meta.title),
    meta.description ? propertyTag("og:description", meta.description) : "",
    propertyTag("og:type", meta.type ?? "website"),
    propertyTag("og:site_name", options.siteName),
    meta.canonical ? propertyTag("og:url", meta.canonical) : "",
    meta.image ? propertyTag("og:image", meta.image) : "",
    metaTag("twitter:card", meta.twitterCard ?? (meta.image ? "summary_large_image" : "summary")),
    metaTag("twitter:title", meta.title),
    meta.description ? metaTag("twitter:description", meta.description) : "",
    meta.image ? metaTag("twitter:image", meta.image) : "",
    ...jsonLdTags(meta.jsonLd),
  ].filter(Boolean);

  return `<!doctype html><html lang="${escapeAttribute(options.language)}"><head>${tags.join("")}</head><body>`;
}

function documentEnd(hasIsland: boolean, development: boolean, assets: RuntimeAssets = {}): string {
  const islandBootstrap = hasIsland ? `<script type="module" src="${escapeAttribute(assets.client ?? "/coco-assets/client.js")}"></script>` : "";
  const developmentReload = development ? '<script type="module" src="/coco-assets/dev.js"></script>' : "";
  return `${developmentReload}${islandBootstrap}</body></html>`;
}

interface DevelopmentErrorDetails {
  readonly type: string;
  readonly message: string;
  readonly stack: string;
  readonly phase: string;
  readonly source: string;
  readonly line: string;
  readonly column: string;
  readonly frames: readonly string[];
}

function developmentErrorDetails(error: unknown, phase: string): DevelopmentErrorDetails {
  const type = error instanceof Error ? error.name || "Error" : "Error";
  const message = error instanceof Error ? error.message || "Unknown error" : String(error ?? "Unknown error");
  const stack = error instanceof Error ? error.stack ?? `${type}: ${message}` : `${type}: ${message}`;
  const frames = stack.split(/\r?\n/).slice(1).map((frame) => frame.trim()).filter(Boolean);
  const location = frames.map((frame) =>
    /\((.+):(\d+):(\d+)\)$/.exec(frame) ?? /(?:at\s+)?(.+):(\d+):(\d+)$/.exec(frame),
  ).find(Boolean);
  return {
    type,
    message,
    stack,
    phase,
    source: location?.[1] ?? "Unavailable",
    line: location?.[2] ?? "—",
    column: location?.[3] ?? "—",
    frames: frames.slice(0, 8),
  };
}

function renderDevelopmentError(error: unknown, phase: string): string {
  const detail = developmentErrorDetails(error, phase);
  const frameItems = detail.frames.length > 0
    ? detail.frames.map((frame, index) => `<li data-index="${index + 1}"><code>${escapeText(frame)}</code></li>`).join("")
    : '<li data-index="1"><code>No call stack is available.</code></li>';
  const title = `${detail.type}: ${detail.message}`;
  return `<div class="coco-dev-overlay" data-coco-dev-overlay role="dialog" aria-modal="true" aria-labelledby="coco-dev-error-title">
    <div class="coco-dev-overlay__surface">
      <div class="coco-dev-overlay__topbar">
        <p class="coco-dev-overlay__eyebrow">Unhandled Runtime Error</p>
        <div class="coco-dev-overlay__top-actions"><span class="coco-dev-overlay__mode">Development Mode</span><button class="coco-dev-overlay__close" type="button" data-coco-dev-close aria-label="Close error overlay">×</button></div>
      </div>
      <header class="coco-dev-overlay__heading"><h1 id="coco-dev-error-title">${escapeText(title)}</h1><p>This error occurred during ${escapeText(detail.phase)}.</p></header>
      <div class="coco-dev-overlay__layout">
        <div class="coco-dev-overlay__panel">
          <div class="coco-dev-overlay__panel-header"><strong>${escapeText(detail.source)}</strong><code>${escapeText(detail.line)}:${escapeText(detail.column)}</code></div>
          <pre class="coco-dev-overlay__stack">${escapeText(detail.stack)}</pre>
          <ol class="coco-dev-overlay__frames">${frameItems}</ol>
        </div>
        <aside class="coco-dev-overlay__panel coco-dev-overlay__sidebar">
          <section><h2>Error Info</h2><dl class="coco-dev-overlay__info"><dt>Type</dt><dd>${escapeText(detail.type)}</dd><dt>Message</dt><dd>${escapeText(detail.message)}</dd><dt>Phase</dt><dd>${escapeText(detail.phase)}</dd><dt>File</dt><dd>${escapeText(detail.source)}</dd><dt>Line</dt><dd>${escapeText(detail.line)}</dd><dt>Column</dt><dd>${escapeText(detail.column)}</dd></dl></section>
          <section><h2>Helpful Links</h2><nav class="coco-dev-overlay__help" aria-label="Error help"><a href="/docs#error-handling">CocoFrame error handling ↗</a><a href="/docs#development">Development guide ↗</a><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/${encodeURIComponent(detail.type)}">MDN: ${escapeText(detail.type)} ↗</a></nav></section>
        </aside>
      </div>
      <footer class="coco-dev-overlay__footer"><p>This error overlay is only visible in development. Press ESC to dismiss.</p><div class="coco-dev-overlay__actions"><button class="coco-dev-overlay__action" type="button" data-coco-dev-copy>Copy error</button><button class="coco-dev-overlay__action coco-dev-overlay__action--primary" type="button" data-coco-dev-reload>Reload page</button></div></footer>
    </div>
  </div>`;
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function redirect(location: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
  return new Response(null, { status, headers: { location } });
}

export { defer, jsx };
export type { CocoNode } from "@cocoframe/jsx";

function normalizeAllowedHost(value: string): string {
  const candidate = value.trim();
  if (!candidate || candidate.includes("://") || candidate.includes("*") || /[?#]/.test(candidate)) {
    throw new TypeError(`Invalid allowed host: ${value}`);
  }
  let url: URL;
  try {
    url = new URL(`http://${candidate}`);
  } catch {
    throw new TypeError(`Invalid allowed host: ${value}`);
  }
  if (url.username || url.password || url.pathname !== "/") throw new TypeError(`Invalid allowed host: ${value}`);
  return normalizeUrlHost(url);
}

function normalizeUrlHost(url: URL): string {
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  return url.port ? `${hostname}:${url.port}` : hostname;
}

function htmlResponse(body: string, status: number, cache?: CachePolicy): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": cacheControl(cache),
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-content-type-options": "nosniff",
    },
  });
}

function streamHtmlResponse(
  node: CocoNode,
  options: Omit<DocumentOptions, "body">,
  cache?: CachePolicy,
  status = 200,
): Response {
  const encoder = new TextEncoder();
  let hasIsland = false;
  let streamRuntimeSent = false;
  let deferredSequence = 0;
  interface DeferredTask {
    readonly id: string;
    complete: boolean;
    settled: Promise<{ task: DeferredTask; ok: true; value: unknown } | { task: DeferredTask; ok: false }>;
  }
  const deferredTasks: DeferredTask[] = [];
  const registerDeferred = (content: Promise<unknown>): string => {
    const task = { id: `coco-s${++deferredSequence}`, complete: false } as DeferredTask;
    task.settled = content.then(
      (value) => ({ task, ok: true as const, value }),
      () => ({ task, ok: false as const }),
    );
    deferredTasks.push(task);
    return task.id;
  };
  const renderOptions = {
    onElement: (tag: string) => { if (tag === "coco-island") hasIsland = true; },
    onDeferred: registerDeferred,
  };
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(documentStart(options)));
        for await (const chunk of renderToChunks(node, renderOptions)) {
          controller.enqueue(encoder.encode(chunk));
          if (!streamRuntimeSent && deferredTasks.length > 0) {
            controller.enqueue(encoder.encode(`<script type="module" src="${escapeAttribute(options.assets?.stream ?? "/coco-assets/stream.js")}"></script>`));
            streamRuntimeSent = true;
          }
        }
        while (deferredTasks.some((task) => !task.complete)) {
          const result = await Promise.race(deferredTasks.filter((task) => !task.complete).map((task) => task.settled));
          result.task.complete = true;
          if (!result.ok) {
            controller.enqueue(encoder.encode(`<template data-coco-reject="${escapeAttribute(result.task.id)}"></template>`));
            continue;
          }
          controller.enqueue(encoder.encode(`<template data-coco-resolve="${escapeAttribute(result.task.id)}">`));
          for await (const chunk of renderToChunks(result.value, renderOptions)) controller.enqueue(encoder.encode(chunk));
          controller.enqueue(encoder.encode("</template>"));
        }
        controller.enqueue(encoder.encode(documentEnd(hasIsland, options.development ?? false, options.assets)));
        controller.close();
      } catch (error) {
        if (options.development) {
          controller.enqueue(encoder.encode(renderDevelopmentError(error, "stream rendering")));
          controller.enqueue(encoder.encode(documentEnd(hasIsland, true, options.assets)));
          controller.close();
        } else {
          controller.error(error);
        }
      }
    },
  });
  return new Response(stream, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": cacheControl(cache),
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-content-type-options": "nosniff",
    },
  });
}

function cacheControl(policy?: CachePolicy): string {
  if (!policy) return "no-cache";
  const directives = [policy.private ? "private" : "public", `max-age=${Math.max(0, policy.browser ?? 0)}`];
  if (!policy.private && policy.edge !== undefined) directives.push(`s-maxage=${Math.max(0, policy.edge)}`);
  if (policy.staleWhileRevalidate !== undefined) directives.push(`stale-while-revalidate=${Math.max(0, policy.staleWhileRevalidate)}`);
  return directives.join(", ");
}

function metaTag(name: string, content: string): string {
  return `<meta name="${escapeAttribute(name)}" content="${escapeAttribute(content)}">`;
}

function propertyTag(property: string, content: string): string {
  return `<meta property="${escapeAttribute(property)}" content="${escapeAttribute(content)}">`;
}

function escapeXml(value: string): string {
  return escapeAttribute(value);
}

function searchParamsToObject(params: URLSearchParams): Record<string, string | string[]> {
  const output: Record<string, string | string[]> = {};
  for (const [key, value] of params) {
    const existing = output[key];
    if (existing === undefined) output[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else output[key] = [existing, value];
  }
  return output;
}

async function requestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      throw new ValidationError([{
        path: [],
        message: "Request body is not valid JSON",
        expected: "json",
        received: "invalid json",
      }]);
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const output: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
    for (const [key, value] of form) {
      const existing = output[key];
      if (existing === undefined) output[key] = value;
      else if (Array.isArray(existing)) existing.push(value);
      else output[key] = [existing, value];
    }
    return output;
  }
  const text = await request.text();
  return text === "" ? undefined : text;
}

function jsonLdTags(value: PageMeta["jsonLd"]): string[] {
  if (!value) return [];
  const entries = Array.isArray(value) ? value : [value];
  return entries.map((entry) => {
    const serialized = JSON.stringify(entry)
      .replaceAll("<", "\\u003c")
      .replaceAll("\u2028", "\\u2028")
      .replaceAll("\u2029", "\\u2029");
    return `<script type="application/ld+json">${serialized}</script>`;
  });
}
