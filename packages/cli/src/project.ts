import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, type Plugin } from "rolldown";
import type { ApiContractManifest } from "@cocoframe/core";

const ROUTE_FILE = /\.(page|route)\.tsx?$/;

export interface DiscoveredRoute {
  readonly file: string;
  readonly kind: "page" | "api";
  readonly pattern: string;
  readonly layouts: readonly string[];
}

export interface DiscoveredIsland {
  readonly file: string;
  readonly name: string;
}

export interface DiscoveredStyle {
  readonly file: string;
  readonly classes: Readonly<Record<string, string>>;
  readonly css: string;
}

export async function discoverUiComponents(projectRoot: string): Promise<readonly string[]> {
  const files = (await walk(path.join(projectRoot, "app"))).filter((file) => /\.tsx?$/.test(file));
  const components = new Set<string>();
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*["']@cocoframe\/ui["']/gs)) {
      for (const entry of (match[1] ?? "").split(",")) {
        const name = entry.trim().split(/\s+as\s+/i)[0]?.trim();
        if (name) components.add(name);
      }
    }
  }
  return [...components].sort();
}

export async function discoverIcons(projectRoot: string): Promise<readonly string[]> {
  const files = (await walk(path.join(projectRoot, "app"))).filter((file) => /\.tsx?$/.test(file));
  const icons = new Set<string>();
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/from\s*["']@cocoframe\/icons\/linear\/([a-z0-9-]+)["']/g)) {
      if (match[1]) icons.add(match[1] === "catalog" ? "*" : match[1]);
    }
  }
  return [...icons].sort();
}

export async function discoverRoutes(projectRoot: string): Promise<readonly DiscoveredRoute[]> {
  const routesDirectory = path.join(projectRoot, "app", "routes");
  const files = await walk(routesDirectory);
  return files
    .filter((file) => ROUTE_FILE.test(file))
    .map((file) => ({
      file,
      kind: file.includes(".route.") ? "api" as const : "page" as const,
      pattern: routePatternFromFile(routesDirectory, file),
      layouts: file.includes(".page.") ? layoutFilesForRoute(routesDirectory, file, files) : [],
    }))
    .sort((left, right) => left.pattern.localeCompare(right.pattern));
}

export async function discoverIslands(projectRoot: string): Promise<readonly DiscoveredIsland[]> {
  const islandsDirectory = path.join(projectRoot, "app", "islands");
  const files = await walk(islandsDirectory).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const islands = files.filter((file) => /\.island\.tsx?$/.test(file)).map((file) => ({
    file,
    name: path.basename(file).replace(/\.island\.tsx?$/, ""),
  }));
  const duplicate = islands.find((island, index) => islands.findIndex((item) => item.name === island.name) !== index);
  if (duplicate) throw new Error(`Duplicate island name: ${duplicate.name}`);
  return islands.sort((left, right) => left.name.localeCompare(right.name));
}

export async function discoverStyles(projectRoot: string): Promise<readonly DiscoveredStyle[]> {
  const appDirectory = path.join(projectRoot, "app");
  const files = await walk(appDirectory);
  return Promise.all(files.filter((file) => file.endsWith(".module.css")).sort().map(async (file) => {
    const source = await readFile(file, "utf8");
    return compileCssModule(projectRoot, file, source);
  }));
}

export async function discoverGlobalStyles(projectRoot: string): Promise<readonly string[]> {
  const appDirectory = path.join(projectRoot, "app");
  const files = await walk(appDirectory);
  return files.filter((file) => file.endsWith(".css") && !file.endsWith(".module.css")).sort();
}

export function routePatternFromFile(routesDirectory: string, file: string): string {
  const relative = path.relative(routesDirectory, file).replaceAll("\\", "/");
  const withoutExtension = relative.replace(ROUTE_FILE, "");
  const segments = withoutExtension.split("/").filter((segment) => segment !== "index");
  const routeSegments = segments.map((segment) => {
    const rest = /^\[\.\.\.([A-Za-z_][A-Za-z0-9_]*)\]$/.exec(segment);
    if (rest?.[1]) return `*${rest[1]}`;
    const parameter = /^\[([A-Za-z_][A-Za-z0-9_]*)\]$/.exec(segment);
    if (parameter?.[1]) return `:${parameter[1]}`;
    return segment;
  });
  return routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`;
}

export function developmentErrorEvent(error: unknown): string {
  const payload = error instanceof Error
    ? {
        type: error.name || "Error",
        message: error.message || "Unknown build error",
        ...(error.stack ? { stack: error.stack } : {}),
        phase: "building",
      }
    : { type: "Error", message: String(error ?? "Unknown build error"), phase: "building" };
  return `event: build-error\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function buildProject(projectRoot: string, development: boolean): Promise<string> {
  const routes = await discoverRoutes(projectRoot);
  const islands = await discoverIslands(projectRoot);
  const styles = await discoverStyles(projectRoot);
  const globalStyles = await discoverGlobalStyles(projectRoot);
  const globalCss = (await Promise.all(globalStyles.map((file) => readFile(file, "utf8")))).join("\n");
  const developmentCss = development
    ? await readFile(fileURLToPath(import.meta.resolve("@cocoframe/client/dev.css")), "utf8")
    : "";
  const usesCocoUi = (await discoverUiComponents(projectRoot)).length > 0;
  const uiCss = usesCocoUi ? (await Promise.all([
    readFile(fileURLToPath(import.meta.resolve("@cocoframe/ui/styles.css")), "utf8"),
    readFile(fileURLToPath(import.meta.resolve("@cocoframe/ui/utilities.css")), "utf8"),
  ])).join("\n") : "";
  const hasStyles = developmentCss.length > 0 || styles.length > 0 || uiCss.length > 0 || globalCss.length > 0;
  const stylesByFile = new Map(styles.map((style) => [path.resolve(style.file), style]));
  const layouts = [...new Set(routes.flatMap((route) => route.layouts))];
  const generatedRoot = path.resolve(projectRoot, ".cocoframe");
  const outputDirectory = development ? path.join(generatedRoot, "dev") : generatedRoot;
  const outputFile = path.join(outputDirectory, "server.mjs");
  const virtualEntry = "\0cocoframe:entry";
  const virtualConfig = "\0cocoframe:config";
  const configFile = await firstExisting([
    path.join(projectRoot, "cocoframe.config.ts"),
    path.join(projectRoot, "cocoframe.config.js"),
  ]);
  const imports = routes.map((_, index) => `import route${index} from "cocoframe:route:${index}";`).join("\n");
  const layoutImports = layouts.map((_, index) => `import layout${index} from "cocoframe:layout:${index}";`).join("\n");
  const registrations = routes.map((route, index) => route.kind === "page"
    ? `app.page(${JSON.stringify(route.pattern)}, withLayouts(route${index}, [${route.layouts.map((file) => `layout${layouts.indexOf(file)}`).join(", ")} ]));`
    : `app.api(${JSON.stringify(route.pattern)}, route${index});`).join("\n");
  let runtimeAssets = { client: "/coco-assets/client.js", stream: "/coco-assets/stream.js" };
  let runtimeStylesheets = hasStyles ? ["/coco-assets/styles.css"] : [];
  let islandAssetUrls = Object.fromEntries(islands.map(({ name }) => [name, `/coco-assets/islands/${name}.js`]));
  const source = () => `
import { CocoFrameApp, withLayouts } from "@cocoframe/core";
import { configureIslandAssets } from "@cocoframe/client";
import cocoframeConfig from "cocoframe:config";
${imports}
${layoutImports}
configureIslandAssets(${JSON.stringify(islandAssetUrls)});
const app = new CocoFrameApp({
  ...cocoframeConfig,
  development: ${JSON.stringify(development)},
  assets: ${JSON.stringify(runtimeAssets)},
  stylesheets: [...(cocoframeConfig.stylesheets ?? []), ...${JSON.stringify(runtimeStylesheets)}]
});
${registrations}
export default app;
`;
  const plugin: Plugin = {
    name: "coco-routes",
    resolveId(id) {
      if (id === "cocoframe:entry") return virtualEntry;
      if (id === "cocoframe:config") return configFile ?? virtualConfig;
      if (id.startsWith("cocoframe:route:")) {
        const index = Number.parseInt(id.slice("cocoframe:route:".length), 10);
        return routes[index]?.file ?? null;
      }
      if (id.startsWith("cocoframe:layout:")) {
        const index = Number.parseInt(id.slice("cocoframe:layout:".length), 10);
        return layouts[index] ?? null;
      }
      return null;
    },
    load(id) {
      if (id === virtualEntry) return source();
      if (id === virtualConfig) return "export default {};";
      return null;
    },
  };
  const cssModulesPlugin: Plugin = {
    name: "coco-css-modules",
    resolveId(id, importer) {
      if (!id.endsWith(".module.css")) return null;
      return importer ? path.resolve(path.dirname(importer), id) : path.resolve(id);
    },
    async load(id) {
      if (!id.endsWith(".module.css")) return null;
      let style = stylesByFile.get(path.resolve(id));
      if (!style) {
        style = compileCssModule(projectRoot, id, await readFile(id, "utf8"));
        stylesByFile.set(path.resolve(id), style);
      }
      return { code: `export default ${JSON.stringify(style.classes)};`, moduleType: "js" };
    },
  };

  const browserInput: Record<string, string> = {
    client: fileURLToPath(import.meta.resolve("@cocoframe/client/bootstrap")),
    stream: fileURLToPath(import.meta.resolve("@cocoframe/client/stream")),
  };
  if (development) browserInput.dev = fileURLToPath(import.meta.resolve("@cocoframe/client/dev"));
  islands.forEach((island) => {
    browserInput[`islands/${island.name}`] = island.file;
  });
  const outputPublicDirectory = path.resolve(outputDirectory, "public");
  const publicDirectory = path.join(outputPublicDirectory, "coco-assets");
  if (!outputPublicDirectory.startsWith(`${generatedRoot}${path.sep}`)) {
    throw new Error(`Refusing to clean generated assets outside ${generatedRoot}`);
  }
  await rm(outputPublicDirectory, { recursive: true, force: true });
  const sourcePublicDirectory = path.join(projectRoot, "public");
  await cp(sourcePublicDirectory, outputPublicDirectory, { recursive: true }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
  await build({
    input: browserInput,
    platform: "browser",
    plugins: [cssModulesPlugin],
    output: {
      dir: publicDirectory,
      format: "esm",
      entryFileNames: development ? "[name].js" : "[name]-[hash].js",
      chunkFileNames: "chunks/[name]-[hash].js",
      sourcemap: development,
      minify: development ? false : true,
    },
  });
  if (hasStyles) {
    await mkdir(publicDirectory, { recursive: true });
    const css = [developmentCss, uiCss, globalCss, ...styles.map((style) => style.css)].filter(Boolean).join("\n");
    const cssName = development ? "styles.css" : `styles-${createHash("sha256").update(css).digest("hex").slice(0, 10)}.css`;
    await writeFile(path.join(publicDirectory, cssName), css, "utf8");
  }
  const builtAssets = (await walk(publicDirectory)).map((file) => ({
    file,
    relative: path.relative(publicDirectory, file).replaceAll("\\", "/"),
  }));
  const assetUrl = (prefix: string, suffix: string) => {
    const asset = builtAssets.find(({ relative }) => relative.startsWith(prefix) && relative.endsWith(suffix));
    if (!asset) throw new Error(`Missing built asset: ${prefix}*${suffix}`);
    return `/coco-assets/${asset.relative}`;
  };
  runtimeAssets = { client: assetUrl("client", ".js"), stream: assetUrl("stream", ".js") };
  runtimeStylesheets = hasStyles ? [assetUrl("styles", ".css")] : [];
  islandAssetUrls = Object.fromEntries(islands.map(({ name }) => [name, assetUrl(`islands/${name}`, ".js")]));
  const assetManifest = {
    version: 1,
    assets: { ...runtimeAssets, stylesheets: runtimeStylesheets, islands: islandAssetUrls },
  };
  await writeFile(path.join(outputDirectory, "assets.json"), `${JSON.stringify(assetManifest, null, 2)}\n`, "utf8");
  await mkdir(outputDirectory, { recursive: true });
  await build({
    input: "cocoframe:entry",
    platform: "node",
    plugins: [cssModulesPlugin, plugin],
    output: { file: outputFile, format: "esm", sourcemap: development },
  });
  await writeFile(path.join(outputDirectory, "deploy.json"), `${JSON.stringify({
    version: 1,
    target: "node",
    server: "server.mjs",
    public: "public",
    assets: "assets.json",
  }, null, 2)}\n`, "utf8");
  return outputFile;
}

export async function generateClient(projectRoot: string): Promise<string> {
  const outputFile = await buildProject(projectRoot, false);
  const app = (await import(`${pathToFileURL(outputFile).href}?generate=${Date.now()}`)).default;
  const contracts = app.contracts() as readonly ApiContractManifest[];
  const generatedDirectory = path.join(projectRoot, "app", "generated");
  const clientFile = path.join(generatedDirectory, "cocoframe-client.ts");
  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(clientFile, renderClient(contracts), "utf8");
  return clientFile;
}

export async function generateCssTypes(projectRoot: string): Promise<readonly string[]> {
  const styles = await discoverStyles(projectRoot);
  return Promise.all(styles.map(async (style) => {
    const declarationFile = style.file.replace(/\.css$/, ".d.css.ts");
    const properties = Object.keys(style.classes).sort().map((name) => `  readonly ${JSON.stringify(name)}: string;`).join("\n");
    await writeFile(declarationFile, `// Generated by CocoFrame. Do not edit manually.\ndeclare const classes: {\n${properties}\n};\nexport default classes;\n`, "utf8");
    return declarationFile;
  }));
}

export async function generateOpenApi(projectRoot: string): Promise<string> {
  const outputFile = await buildProject(projectRoot, false);
  const app = (await import(`${pathToFileURL(outputFile).href}?openapi=${Date.now()}`)).default;
  const contracts = app.contracts() as readonly ApiContractManifest[];
  const info = app.openapi() as { readonly title: string; readonly version: string; readonly description?: string };
  const paths: Record<string, Record<string, unknown>> = {};
  for (const contract of contracts) {
    const pathName = contract.pattern
      .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}")
      .replace(/\*([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
    (paths[pathName] ??= {})[contract.method.toLowerCase()] = openApiOperation(contract);
  }
  const document = {
    openapi: "3.1.0",
    info,
    paths,
  };
  const generatedDirectory = path.join(projectRoot, "app", "generated");
  const openApiFile = path.join(generatedDirectory, "openapi.json");
  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(openApiFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  return openApiFile;
}

export async function serveProjectAsset(request: Request, projectRoot: string, development = true): Promise<Response | null> {
  const url = new URL(request.url);
  const assetRoot = development
    ? path.resolve(projectRoot, ".cocoframe", "dev", "public")
    : path.resolve(projectRoot, ".cocoframe", "public");
  const relative = decodeURIComponent(url.pathname.slice(1));
  if (!relative || relative.endsWith("/")) return null;
  const assetPath = path.resolve(assetRoot, relative);
  if (assetPath !== assetRoot && !assetPath.startsWith(`${assetRoot}${path.sep}`)) return new Response("Forbidden", { status: 403 });
  try {
    const content = await readFile(assetPath);
    return new Response(content, {
      headers: {
        "content-type": contentType(assetPath),
        "cache-control": development ? "no-cache" : url.pathname.startsWith("/coco-assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return url.pathname.startsWith("/coco-assets/") ? new Response("Asset not found", { status: 404 }) : null;
    }
    throw error;
  }
}

function contentType(file: string): string {
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".map")) return "application/json; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".webp")) return "image/webp";
  if (file.endsWith(".ico")) return "image/x-icon";
  if (file.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function layoutFilesForRoute(routesDirectory: string, routeFile: string, allFiles: readonly string[]): string[] {
  const knownFiles = new Set(allFiles.map((file) => path.resolve(file)));
  const relativeDirectory = path.dirname(path.relative(routesDirectory, routeFile));
  const segments = relativeDirectory === "." ? [] : relativeDirectory.split(path.sep);
  const directories = [routesDirectory];
  for (let index = 1; index <= segments.length; index++) {
    directories.push(path.join(routesDirectory, ...segments.slice(0, index)));
  }
  return directories.flatMap((directory) => ["_layout.tsx", "_layout.ts"]
    .map((name) => path.resolve(directory, name))
    .filter((file) => knownFiles.has(file)));
}

function compileCssModule(projectRoot: string, file: string, source: string): DiscoveredStyle {
  const relative = path.relative(projectRoot, file).replaceAll("\\", "/");
  const hash = createHash("sha256").update(relative).digest("hex").slice(0, 7);
  const names = [...source.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((match) => match[1]).filter(Boolean) as string[];
  const classes = Object.fromEntries([...new Set(names)].map((name) => [name, `${name}_${hash}`]));
  let css = source;
  for (const [name, scopedName] of Object.entries(classes)) {
    css = css.replace(new RegExp(`\\.${escapeRegExp(name)}(?![A-Za-z0-9_-])`, "g"), `.${scopedName}`);
  }
  return { file, classes, css };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderClient(contracts: readonly ApiContractManifest[]): string {
  const functions = contracts.map((contract) => {
    const functionName = identifier(contract.id, false);
    const typeName = identifier(contract.id, true);
    const inputEntries = Object.entries(contract.input);
    const inputType = inputEntries.length === 0
      ? "void"
      : `{ ${inputEntries.map(([key, definition]) => `readonly ${key}: ${schemaType(definition)};`).join(" ")} }`;
    const outputType = contract.output ? schemaType(contract.output) : "unknown";
    const acceptsInput = inputEntries.length > 0;
    return `
export type ${typeName}Input = ${inputType};
export type ${typeName}Output = ${outputType};

export async function ${functionName}(baseUrl: string${acceptsInput ? `, input: ${typeName}Input` : ""}, requestOptions: CocoFrameRequestOptions = {}): Promise<${typeName}Output> {
  let pathname = ${JSON.stringify(contract.pattern)};
  ${contract.input.params ? `for (const [key, value] of Object.entries(input.params)) pathname = pathname.replace(\`:\${key}\`, encodeURIComponent(String(value)));` : ""}
  const url = new URL(pathname, baseUrl);
  ${contract.input.query ? `for (const [key, value] of Object.entries(input.query)) {
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)));
    else if (value !== undefined) url.searchParams.set(key, String(value));
  }` : ""}
  const headers = new Headers(requestOptions.headers);
  ${contract.input.body ? 'headers.set("content-type", "application/json");' : ""}
  const response = await (requestOptions.fetch ?? globalThis.fetch)(url, {
    method: ${JSON.stringify(contract.method)},
    headers,
    ...(requestOptions.credentials ? { credentials: requestOptions.credentials } : {}),
    ${contract.input.body ? `body: JSON.stringify(input.body),` : ""}
  });
  const payload: unknown = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new CocoFrameApiError(response.status, payload);
  return payload as ${typeName}Output;
}`;
  }).join("\n");

  const methods = contracts.map((contract) => {
    const functionName = identifier(contract.id, false);
    const typeName = identifier(contract.id, true);
    const acceptsInput = Object.keys(contract.input).length > 0;
    return `    ${functionName}: (${acceptsInput ? `input: ${typeName}Input` : ""}) => ${functionName}(options.baseUrl${acceptsInput ? ", input" : ""}, options),`;
  }).join("\n");

  return `// Generated by CocoFrame. Do not edit manually.
export interface CocoFrameRequestOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly headers?: HeadersInit;
  readonly credentials?: RequestCredentials;
}

export interface CocoFrameClientOptions extends CocoFrameRequestOptions {
  readonly baseUrl: string;
}

export class CocoFrameApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  constructor(status: number, payload: unknown) {
    super(\`CocoFrame API request failed with status \${status}\`);
    this.name = "CocoFrameApiError";
    this.status = status;
    this.payload = payload;
  }
}
${functions}

export function createCocoFrameClient(options: CocoFrameClientOptions) {
  return {
${methods}
  } as const;
}
`;
}

function schemaType(definition: Readonly<Record<string, unknown>>): string {
  if ("const" in definition) return JSON.stringify(definition.const);
  if (Array.isArray(definition.enum)) return definition.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (Array.isArray(definition.anyOf)) return definition.anyOf.map((value) => schemaType(value as Readonly<Record<string, unknown>>)).join(" | ");
  if (definition.type === "string") return "string";
  if (definition.type === "number" || definition.type === "integer") return "number";
  if (definition.type === "boolean") return "boolean";
  if (definition.type === "array") return `readonly (${schemaType(definition.items as Readonly<Record<string, unknown>>)})[]`;
  if (definition.type === "object") {
    const properties = definition.properties as Record<string, Readonly<Record<string, unknown>>> | undefined;
    if (!properties) {
      const additional = definition.additionalProperties;
      return additional && typeof additional === "object" ? `Readonly<Record<string, ${schemaType(additional as Readonly<Record<string, unknown>>)}>>` : "Readonly<Record<string, unknown>>";
    }
    const required = new Set((definition.required as readonly string[] | undefined) ?? []);
    return `{ ${Object.entries(properties).map(([key, value]) => `readonly ${JSON.stringify(key)}${required.has(key) ? "" : "?"}: ${schemaType(value)};`).join(" ")} }`;
  }
  return "unknown";
}

function identifier(value: string, pascal: boolean): string {
  const words = value.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const joined = words.map((word, index) => index === 0 && !pascal
    ? word.toLowerCase()
    : word.charAt(0).toUpperCase() + word.slice(1)).join("");
  const safe = /^[A-Za-z_$]/.test(joined) ? joined : `api${joined}`;
  return safe || (pascal ? "Contract" : "contract");
}

function openApiOperation(contract: ApiContractManifest): Readonly<Record<string, unknown>> {
  const parameters: Array<Record<string, unknown>> = [];
  for (const location of ["params", "query"] as const) {
    const definition = contract.input[location];
    if (!definition || definition.type !== "object") continue;
    const properties = definition.properties as Record<string, Readonly<Record<string, unknown>>>;
    const required = new Set((definition.required as readonly string[] | undefined) ?? []);
    for (const [name, schema] of Object.entries(properties)) {
      parameters.push({ name, in: location === "params" ? "path" : "query", required: location === "params" || required.has(name), schema });
    }
  }
  return {
    operationId: contract.id,
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(contract.input.body ? {
      requestBody: {
        required: true,
        content: { "application/json": { schema: contract.input.body } },
      },
    } : {}),
    responses: {
      "200": {
        description: "Successful response",
        ...(contract.output ? { content: { "application/json": { schema: contract.output } } } : {}),
      },
      "400": {
        description: "Input validation failed",
        content: { "application/json": { schema: { type: "object", required: ["error", "issues"] } } },
      },
    },
  };
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : Promise.resolve([fullPath]);
  }));
  return nested.flat();
}

async function firstExisting(files: readonly string[]): Promise<string | null> {
  for (const file of files) {
    try {
      await readFile(file);
      return file;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}
