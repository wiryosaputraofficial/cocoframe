export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface RouteMatch<Handler> {
  readonly handler: Handler;
  readonly pattern: string;
  readonly params: Readonly<Record<string, string>>;
}

interface DynamicRoute<Handler> {
  readonly method: HttpMethod;
  readonly pattern: string;
  readonly expression: RegExp;
  readonly parameterNames: readonly string[];
  readonly score: number;
  readonly handler: Handler;
}

/**
 * Matches normalized static, parameterized, and catch-all routes by HTTP method.
 */
export class Router<Handler> {
  readonly #staticRoutes = new Map<string, { pattern: string; handler: Handler }>();
  readonly #dynamicRoutes: DynamicRoute<Handler>[] = [];

  add(method: HttpMethod, pattern: string, handler: Handler): this {
    const normalizedPattern = normalizePath(pattern);
    const key = routeKey(method, normalizedPattern);

    if (this.#staticRoutes.has(key) || this.#dynamicRoutes.some((route) => route.method === method && route.pattern === normalizedPattern)) {
      throw new Error(`Duplicate route: ${method} ${normalizedPattern}`);
    }

    if (!normalizedPattern.includes(":") && !normalizedPattern.includes("*")) {
      this.#staticRoutes.set(key, { pattern: normalizedPattern, handler });
      return this;
    }

    this.#dynamicRoutes.push(compileRoute(method, normalizedPattern, handler));
    this.#dynamicRoutes.sort((left, right) => right.score - left.score);
    return this;
  }

  match(method: HttpMethod, pathname: string): RouteMatch<Handler> | null {
    const normalizedPath = normalizePath(pathname);
    const staticRoute = this.#staticRoutes.get(routeKey(method, normalizedPath));
    if (staticRoute) {
      return { handler: staticRoute.handler, pattern: staticRoute.pattern, params: {} };
    }

    for (const route of this.#dynamicRoutes) {
      if (route.method !== method) continue;
      const match = route.expression.exec(normalizedPath);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.parameterNames.forEach((name, index) => {
        const value = match[index + 1] ?? "";
        params[name] = safeDecode(value);
      });
      return { handler: route.handler, pattern: route.pattern, params };
    }

    return null;
  }

  manifest(): readonly { method: HttpMethod; pattern: string }[] {
    const staticManifest = [...this.#staticRoutes.entries()].map(([key, route]) => ({
      method: key.slice(0, key.indexOf(" ")) as HttpMethod,
      pattern: route.pattern,
    }));
    const dynamicManifest = this.#dynamicRoutes.map(({ method, pattern }) => ({ method, pattern }));
    return [...staticManifest, ...dynamicManifest].sort((a, b) => a.pattern.localeCompare(b.pattern));
  }
}

/**
 * Normalizes a route path to one leading slash and no trailing slash except at the root.
 */
export function normalizePath(pathname: string): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash === "/") return "/";
  return withLeadingSlash.replace(/\/{2,}/g, "/").replace(/\/$/, "");
}

function routeKey(method: HttpMethod, pathname: string): string {
  return `${method} ${pathname}`;
}

function compileRoute<Handler>(method: HttpMethod, pattern: string, handler: Handler): DynamicRoute<Handler> {
  const parameterNames: string[] = [];
  let score = 0;
  const segments = pattern.split("/").slice(1);
  const source = segments
    .map((segment) => {
      if (segment.startsWith(":")) {
        const name = segment.slice(1);
        assertParameterName(name, pattern);
        parameterNames.push(name);
        score += 2;
        return "([^/]+)";
      }
      if (segment.startsWith("*")) {
        const name = segment.slice(1) || "rest";
        assertParameterName(name, pattern);
        parameterNames.push(name);
        return "(.*)";
      }
      score += 4;
      return escapeRegExp(segment);
    })
    .join("/");

  return {
    method,
    pattern,
    expression: new RegExp(`^/${source}$`),
    parameterNames,
    score,
    handler,
  };
}

function assertParameterName(name: string, pattern: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new TypeError(`Invalid parameter name in route: ${pattern}`);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
