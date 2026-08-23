import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";

const defaultRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export interface PublicApiDocumentation {
  readonly package: string;
  readonly name: string;
  readonly summary: string;
  readonly source: string;
  readonly line: number;
}

interface PublicApiTarget extends PublicApiDocumentation {
  readonly documented: boolean;
  readonly sourceFile: ts.SourceFile;
  readonly insertionNode: ts.Node;
}

interface PackageManifest {
  readonly name: string;
  readonly exports?: unknown;
  readonly bin?: Readonly<Record<string, string>>;
}

const exactSummaries: Readonly<Record<string, string>> = {
  ActionRender: "Describes an explicit page-action rerender and its HTTP status.",
  CocoFrameApp: "Registers pages, actions, APIs, middleware, and system routes behind one Web Standard fetch handler.",
  CocoQLError: "Represents a versioned, structured CocoQL diagnostic with a stage, code, path, and source location.",
  CocoFrameApiError: "Represents a non-success response returned by a generated CocoFrame API client.",
  CsrfField: "Renders the hidden CSRF field installed by matching security middleware.",
  Fragment: "Groups sibling CocoFrame nodes without emitting an HTML wrapper.",
  RequestBodyTooLargeError: "Reports that the Node adapter stopped reading a request body after its configured byte limit.",
  RequestTimeoutError: "Reports that the shared Node request lifecycle exceeded its configured deadline.",
  Router: "Matches normalized static, parameterized, and catch-all routes by HTTP method.",
  ValidationError: "Aggregates schema validation issues with machine-readable paths.",
  authorizeCocoQL: "Checks a validated CocoQL read against an explicit default-deny permission policy.",
  authorizeCocoQLMutation: "Checks a validated CocoQL mutation against explicit entity and field permissions.",
  bind: "Binds a signal or computed value to one text node without rerendering its parent island.",
  clientAddress: "Returns the client address verified by the Node adapter's trusted-proxy policy.",
  computed: "Creates a read-only signal that tracks and updates its dynamic signal dependencies.",
  configureIslandAssets: "Configures the built browser-module URL for each stable island name.",
  cors: "Creates streaming-safe CORS middleware with an explicit origin and method policy.",
  createContextKey: "Creates an identity-based typed key for request-scoped context state.",
  createDatabase: "Creates a database facade that always releases acquired connections and exposes transactions only when supported.",
  createForm: "Creates one schema-backed controller for form parsing, retained values, accessible errors, and HTTP 422 rerendering.",
  createPostgresAdapter: "Creates a driver-neutral adapter around a structurally compatible PostgreSQL pool.",
  createServer: "Adapts a Web Standard handler to Node HTTP with body limits, abort propagation, and streamed backpressure.",
  createSessionAuth: "Creates typed signed-cookie session operations using HMAC SHA-256 through Web Crypto.",
  createSqliteAdapter: "Creates a serialized adapter around Node's built-in SQLite connection.",
  csrfProtection: "Creates trusted-origin double-submit CSRF middleware for unsafe requests.",
  defer: "Emits an immediate fallback boundary and streams supplementary content when its promise settles.",
  defineApi: "Defines a typed API handler with optional runtime input and output contracts.",
  defineConfig: "Defines one typed application configuration without adding runtime behavior.",
  defineCocoQLPermissions: "Defines an explicit default-deny CocoQL permission policy against a public schema.",
  defineCocoQLSafetyPolicy: "Defines deterministic read and mutation safety limits for CocoQL planning.",
  defineCocoQLSchema: "Defines the public entities, fields, types, and relations available to CocoQL.",
  defineDatabaseAdapter: "Preserves a typed database adapter contract for acquisition, release, and optional transactions.",
  defineIsland: "Defines a stable opt-in browser boundary with server-rendered initial HTML.",
  defineLayout: "Defines a server-rendered layout inherited through route-directory nesting.",
  defineMiddleware: "Defines middleware with an optional stable ID for inspect output and execution tracing.",
  definePage: "Defines one typed server-rendered page lifecycle containing load, metadata, view, action, and error behavior.",
  enforceCocoQLMutationSafety: "Rejects unsafe CocoQL mutation plans before SQL compilation.",
  enforceCocoQLSafety: "Applies deterministic read limits to a validated CocoQL query plan.",
  escapeAttribute: "Escapes a dynamic value for safe placement in an HTML attribute.",
  escapeText: "Escapes a dynamic value for safe placement in HTML text content.",
  gracefulShutdown: "Stops accepting Node connections, drains active responses, and force-closes only after the deadline.",
  json: "Creates a JSON response with the correct UTF-8 content type.",
  migratePostgres: "Runs ordered idempotent PostgreSQL migrations under a transaction-scoped advisory lock.",
  mountReactive: "Mounts a reactive island view and disposes subscriptions when rendered nodes are replaced.",
  normalizePath: "Normalizes a route path to one leading slash and no trailing slash except at the root.",
  openPostgres: "Creates a database facade backed by a PostgreSQL connection pool.",
  openSqlite: "Opens a serialized SQLite database facade using Node's built-in driver.",
  parseArguments: "Parses dependency-free create-cocoframe CLI arguments into validated creator options.",
  protectSession: "Creates route-selective middleware that requires a verified session without replacing authorization checks.",
  rateLimit: "Creates a bounded in-process rate limiter keyed by verified application identity.",
  raw: "Marks trusted HTML for explicit unescaped rendering; never pass untrusted input.",
  redirect: "Creates an empty redirect response with a validated redirect status.",
  renderDocument: "Renders a complete SEO HTML document around an already-rendered body.",
  renderToChunks: "Streams escaped CocoFrame nodes as ordered HTML chunks without buffering the complete tree.",
  renderToDom: "Renders a CocoFrame node into DOM nodes while preserving HTML and SVG namespaces.",
  renderToString: "Buffers an escaped CocoFrame node tree into one HTML string.",
  requestId: "Creates middleware that validates request IDs, propagates them, and emits safe structured timing events.",
  rerender: "Requests that a page action rerender the page with an explicit status, normally HTTP 422.",
  scaffoldProject: "Creates a validated CocoFrame project from an official template without overwriting non-empty directories.",
  securityHeaders: "Creates middleware that adds CSP and browser-hardening headers without buffering the response body.",
  sessionMiddleware: "Loads a verified signed session into typed request context.",
  signal: "Creates mutable reactive state that notifies subscribers only when its value changes.",
  webHandler: "Exposes a CocoFrame application as a runtime-neutral Fetch handler.",
  withLayouts: "Wraps a page view with inherited layouts from inner to outer scope.",
};

export async function auditPublicApiDocumentation(repositoryRoot = defaultRoot): Promise<readonly PublicApiDocumentation[]> {
  const targets = await collectTargets(repositoryRoot);
  return targets.map(({ package: packageName, name, summary, source, line }) => ({
    package: packageName,
    name,
    summary,
    source,
    line,
  }));
}

export async function findUndocumentedPublicApi(repositoryRoot = defaultRoot): Promise<readonly PublicApiDocumentation[]> {
  const targets = await collectTargets(repositoryRoot);
  return targets.filter(({ documented }) => !documented).map(({ package: packageName, name, summary, source, line }) => ({
    package: packageName,
    name,
    summary,
    source,
    line,
  }));
}

export async function writeMissingPublicApiDocumentation(repositoryRoot = defaultRoot): Promise<number> {
  const targets = (await collectTargets(repositoryRoot)).filter(({ documented }) => !documented);
  const byFile = new Map<string, PublicApiTarget[]>();
  for (const target of targets) {
    const file = target.sourceFile.fileName;
    const existing = byFile.get(file) ?? [];
    if (!existing.some(({ insertionNode }) => insertionNode === target.insertionNode)) existing.push(target);
    byFile.set(file, existing);
  }

  for (const [file, fileTargets] of byFile) {
    let source = await readFile(file, "utf8");
    const edits = fileTargets
      .map((target) => ({ position: target.insertionNode.getStart(target.sourceFile), summary: target.summary }))
      .sort((left, right) => right.position - left.position);
    for (const edit of edits) {
      source = `${source.slice(0, edit.position)}/**\n * ${edit.summary}\n */\n${source.slice(edit.position)}`;
    }
    await writeFile(file, source, "utf8");
  }
  return targets.length;
}

async function collectTargets(repositoryRoot: string): Promise<PublicApiTarget[]> {
  const configPath = path.join(repositoryRoot, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repositoryRoot, undefined, configPath);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const checker = program.getTypeChecker();
  const sourceFiles = new Map(program.getSourceFiles().map((source) => [normalize(source.fileName), source]));
  const packagesRoot = path.join(repositoryRoot, "packages");
  const packageDirectories = (await readdir(packagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const seen = new Set<string>();
  const targets: PublicApiTarget[] = [];

  for (const directory of packageDirectories) {
    const packageDirectory = path.join(packagesRoot, directory);
    const manifest = JSON.parse(await readFile(path.join(packageDirectory, "package.json"), "utf8")) as PackageManifest;
    const entries = manifest.exports === undefined
      ? Object.values(manifest.bin ?? {})
      : collectEntryTargets(manifest.exports);
    for (const entry of entries) {
      if (entry.includes("*")) continue;
      const sourceFile = sourceFiles.get(normalize(path.resolve(packageDirectory, entry)));
      const module = sourceFile ? checker.getSymbolAtLocation(sourceFile) : undefined;
      if (!sourceFile || !module) continue;
      for (const exported of checker.getExportsOfModule(module)) {
        const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
        if (!isRuntimeSymbol(symbol)) continue;
        const declaration = symbol.declarations?.find((candidate) => isDocumentableDeclaration(candidate, packagesRoot));
        if (!declaration) continue;
        const insertionNode = insertionNodeFor(declaration);
        if (!insertionNode) continue;
        const declarationFile = declaration.getSourceFile();
        const source = relative(repositoryRoot, declarationFile.fileName);
        const key = `${source}:${insertionNode.getStart(declarationFile)}:${exported.getName()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const existing = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
        const summary = existing || summaryFor(exported.getName(), manifest.name, source);
        targets.push({
          package: manifest.name,
          name: exported.getName(),
          summary,
          source,
          line: declarationFile.getLineAndCharacterOfPosition(insertionNode.getStart(declarationFile)).line + 1,
          documented: existing.length > 0,
          sourceFile: declarationFile,
          insertionNode,
        });
      }
    }
  }
  return targets.sort((left, right) => left.package.localeCompare(right.package) || left.name.localeCompare(right.name));
}

function isRuntimeSymbol(symbol: ts.Symbol): boolean {
  return Boolean(symbol.flags & (
    ts.SymbolFlags.Function |
    ts.SymbolFlags.Class |
    ts.SymbolFlags.Variable |
    ts.SymbolFlags.Enum
  ));
}

function isDocumentableDeclaration(declaration: ts.Declaration, packagesRoot: string): boolean {
  const file = normalize(declaration.getSourceFile().fileName);
  const root = normalize(packagesRoot);
  return file.startsWith(`${root}/`) &&
    !file.includes("/packages/icons/src/linear/") &&
    !file.endsWith(".module.d.css.ts");
}

function insertionNodeFor(declaration: ts.Declaration): ts.Node | null {
  if (ts.isVariableDeclaration(declaration)) return declaration.parent.parent;
  if (ts.isFunctionDeclaration(declaration) || ts.isClassDeclaration(declaration) || ts.isEnumDeclaration(declaration)) return declaration;
  return null;
}

function summaryFor(name: string, packageName: string, source: string): string {
  const exact = exactSummaries[name];
  if (exact) return exact;
  const label = humanize(name);
  if (packageName === "@cocoframe/ui" && /^[A-Z]/.test(name)) {
    return `Renders the ${label} server-first UI primitive with semantic markup and no required browser runtime.`;
  }
  if (name.startsWith("parse")) return `Parses ${label.slice("parse ".length)} into its typed public representation.`;
  if (name.startsWith("format")) return `Formats ${label.slice("format ".length)} into deterministic canonical text.`;
  if (name.startsWith("validate")) return `Validates ${label.slice("validate ".length)} and returns a typed value or structured diagnostic.`;
  if (name.startsWith("compile")) return `Compiles ${label.slice("compile ".length)} into guarded parameterized output.`;
  if (name.startsWith("plan")) return `Builds a deterministic, database-independent ${label.slice("plan ".length)} plan.`;
  if (name.startsWith("preview")) return `Creates a non-executable ${label.slice("preview ".length)} preview for review before commit.`;
  if (name.startsWith("resolve")) return `Resolves ${label.slice("resolve ".length)} into its deterministic public value.`;
  if (name.startsWith("lex")) return `Tokenizes ${label.slice("lex ".length)} with stable source locations.`;
  if (name.startsWith("create")) return `Creates the public ${label.slice("create ".length)} contract for ${packageName}.`;
  if (name.startsWith("define")) return `Defines the typed ${label.slice("define ".length)} contract for ${packageName}.`;
  if (name.startsWith("render")) return `Renders ${label.slice("render ".length)} using CocoFrame's server-first output model.`;
  if (/^[A-Z0-9_]+$/.test(name)) return `Identifies the stable ${label.toLowerCase()} contract used by ${packageName}.`;
  if (source.includes("create-cocoframe")) return `Provides the ${label} operation used by the dependency-free project creator.`;
  return `Provides the public ${label} API for ${packageName}.`;
}

function humanize(name: string): string {
  return name
    .replaceAll("_", " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
}

function collectEntryTargets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Readonly<Record<string, unknown>>;
  const subpaths = Object.keys(record).filter((key) => key.startsWith("."));
  if (subpaths.length > 0) return subpaths.flatMap((key) => collectEntryTargets(record[key]));
  for (const condition of ["types", "default", "import", "node"]) {
    if (condition in record) return collectEntryTargets(record[condition]);
  }
  const first = Object.values(record)[0];
  return first === undefined ? [] : collectEntryTargets(first);
}

function relative(root: string, file: string): string {
  return path.relative(root, file).replaceAll("\\", "/");
}

function normalize(file: string): string {
  return path.resolve(file).replaceAll("\\", "/").toLowerCase();
}

async function main(): Promise<void> {
  if (process.argv.includes("--write")) {
    const count = await writeMissingPublicApiDocumentation(defaultRoot);
    process.stdout.write(`Documented ${count} public runtime symbols.\n`);
    return;
  }
  if (process.argv.includes("--json")) {
    const output = path.join(defaultRoot, ".cocoframe", "public-api.json");
    await access(path.dirname(output)).catch(async () => {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(path.dirname(output), { recursive: true });
    });
    await writeFile(output, `${JSON.stringify(await auditPublicApiDocumentation(defaultRoot), null, 2)}\n`, "utf8");
    process.stdout.write(`${relative(defaultRoot, output)}\n`);
    return;
  }
  const missing = await findUndocumentedPublicApi(defaultRoot);
  if (missing.length > 0) {
    for (const entry of missing) process.stderr.write(`${entry.source}:${entry.line} ${entry.name}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("All public runtime symbols have English JSDoc.\n");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
