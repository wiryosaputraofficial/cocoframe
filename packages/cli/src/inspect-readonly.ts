import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type {
  AgentApi,
  AgentComponent,
  AgentDependency,
  AgentGeneratedCapability,
  AgentMiddleware,
  AgentProjectSnapshot,
} from "@cocoframe/agent";
import {
  discoverGlobalStyles,
  discoverIcons,
  discoverIslands,
  discoverRoutes,
  discoverStyles,
  discoverUiComponents,
} from "./project.ts";

interface PackageManifest {
  readonly name?: string;
  readonly version?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
}

/** Collects the CocoFrame application surface without running a build or writing generated artifacts. */
export async function inspectProjectReadOnly(projectRoot: string, signal?: AbortSignal): Promise<AgentProjectSnapshot> {
  const manifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8")) as PackageManifest;
  const routes = await optional(() => discoverRoutes(projectRoot));
  const islands = await optional(() => discoverIslands(projectRoot));
  await optional(() => discoverStyles(projectRoot));
  await optional(() => discoverGlobalStyles(projectRoot));
  const usedUiComponents = await optional(() => discoverUiComponents(projectRoot));
  await optional(() => discoverIcons(projectRoot));
  throwIfCancelled(signal);

  const normalizedRoutes = routes.map(({ file, kind, pattern, layouts }) => ({
    kind,
    pattern,
    file: relative(projectRoot, file),
    layouts: layouts.map((layout) => relative(projectRoot, layout)),
  }));
  const apis = await discoverApis(projectRoot, normalizedRoutes.filter(({ kind }) => kind === "api"), signal);
  const components = [
    ...await discoverApplicationComponents(projectRoot, signal),
    ...usedUiComponents.map((name): AgentComponent => ({ name, kind: "framework", source: "@cocoframe/ui" })),
  ].sort((left, right) => left.name.localeCompare(right.name) || left.source.localeCompare(right.source));

  return {
    framework: "cocoframe",
    version: 1,
    projectRoot,
    packageName: manifest.name ?? path.basename(projectRoot),
    packageVersion: manifest.version ?? "0.0.0",
    routes: normalizedRoutes,
    apis,
    components,
    islands: islands.map(({ file, name }) => ({ name, file: relative(projectRoot, file) })),
    middleware: await discoverMiddleware(projectRoot),
    dependencies: dependenciesFrom(manifest),
    generatedCapabilities: await discoverGeneratedCapabilities(projectRoot),
  };
}

async function discoverApis(
  root: string,
  routes: readonly { readonly pattern: string; readonly file: string }[],
  signal?: AbortSignal,
): Promise<readonly AgentApi[]> {
  const found = new Map<string, AgentApi>();
  for (const route of routes) {
    throwIfCancelled(signal);
    const source = await readFile(path.join(root, route.file), "utf8");
    const id = /\bid\s*:\s*["']([^"']+)["']/.exec(source)?.[1] ?? route.pattern;
    const method = /\bmethod\s*:\s*["']([A-Za-z]+)["']/.exec(source)?.[1]?.toUpperCase() ?? "ANY";
    const api = { id, method, pattern: route.pattern, file: route.file, source: "route" as const };
    found.set(`${method} ${route.pattern}`, api);
  }
  const openApiFile = path.join(root, "app", "generated", "openapi.json");
  if (await exists(openApiFile)) {
    try {
      const document = JSON.parse(await readFile(openApiFile, "utf8")) as { readonly paths?: Readonly<Record<string, Readonly<Record<string, unknown>>>> };
      for (const [openApiPath, operations] of Object.entries(document.paths ?? {})) {
        for (const [method, operation] of Object.entries(operations)) {
          if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) continue;
          const record = isRecord(operation) ? operation : {};
          const pattern = openApiPath.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, ":$1");
          const key = `${method.toUpperCase()} ${pattern}`;
          const existing = found.get(key);
          found.set(key, {
            id: typeof record.operationId === "string" ? record.operationId : existing?.id ?? pattern,
            method: method.toUpperCase(),
            pattern,
            file: existing?.file ?? relative(root, openApiFile),
            source: "openapi",
          });
        }
      }
    } catch {
      // The generated file is still surfaced as a capability; parsing never rewrites it.
    }
  }
  return [...found.values()].sort((left, right) => left.pattern.localeCompare(right.pattern) || left.method.localeCompare(right.method));
}

async function discoverApplicationComponents(root: string, signal?: AbortSignal): Promise<readonly AgentComponent[]> {
  const directory = path.join(root, "app", "components");
  if (!await exists(directory)) return [];
  const files = await walk(directory, signal);
  const components = new Map<string, AgentComponent>();
  for (const file of files.filter((candidate) => /\.tsx?$/.test(candidate))) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|class|const)\s+([A-Z][A-Za-z0-9_]*)/g)) {
      if (match[1]) components.set(`${match[1]}:${file}`, { name: match[1], kind: "application", source: relative(root, file), file: relative(root, file) });
    }
    const defaultName = /export\s+default\s+(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)/.exec(source)?.[1];
    if (defaultName) components.set(`${defaultName}:${file}`, { name: defaultName, kind: "application", source: relative(root, file), file: relative(root, file) });
  }
  return [...components.values()];
}

async function discoverMiddleware(root: string): Promise<readonly AgentMiddleware[]> {
  const file = await firstExisting([path.join(root, "cocoframe.config.ts"), path.join(root, "cocoframe.config.js")]);
  if (!file) return [];
  const source = await readFile(file, "utf8");
  const imports = new Map<string, string>();
  for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*["']([^"']+)["']/gs)) {
    for (const item of (match[1] ?? "").split(",")) {
      const [imported, local = imported] = item.trim().split(/\s+as\s+/);
      if (imported && local && match[2]) imports.set(local.trim(), match[2]);
    }
  }
  const middlewareSection = /\bmiddleware\s*:\s*\[([\s\S]*?)\]\s*,?\s*(?:\n\s*[A-Za-z]|\})/.exec(source)?.[1] ?? "";
  const result: AgentMiddleware[] = [];
  for (const [name, module] of imports) {
    if (name !== "defineConfig" && new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`).test(middlewareSection)) {
      result.push({ id: name, source: module, file: relative(root, file) });
    }
  }
  return result;
}

function dependenciesFrom(manifest: PackageManifest): readonly AgentDependency[] {
  const fields = [
    ["dependency", manifest.dependencies], ["devDependency", manifest.devDependencies],
    ["peerDependency", manifest.peerDependencies], ["optionalDependency", manifest.optionalDependencies],
  ] as const;
  return fields.flatMap(([kind, dependencies]) => Object.entries(dependencies ?? {}).map(([name, range]) => ({ name, range, kind })))
    .sort((left, right) => left.name.localeCompare(right.name) || left.kind.localeCompare(right.kind));
}

async function discoverGeneratedCapabilities(root: string): Promise<readonly AgentGeneratedCapability[]> {
  const candidates: readonly [AgentGeneratedCapability["kind"], string][] = [
    ["openapi", "app/generated/openapi.json"], ["client", "app/generated/cocoframe-client.ts"],
    ["api-reference", "app/generated/api-reference.ts"], ["context", ".cocoframe/context.json"],
    ["assets", ".cocoframe/assets.json"], ["deployment", ".cocoframe/deploy.json"],
    ["design-profile", "cocoframe.design.json"],
  ];
  const found: AgentGeneratedCapability[] = [];
  for (const [kind, file] of candidates) if (await exists(path.join(root, file))) found.push({ kind, file });
  return found;
}

async function walk(directory: string, signal?: AbortSignal): Promise<string[]> {
  throwIfCancelled(signal);
  const entries = await readdir(directory, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file, signal));
    else result.push(file);
  }
  return result;
}

async function optional<T>(operation: () => Promise<readonly T[]>): Promise<readonly T[]> {
  try { return await operation(); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

async function firstExisting(files: readonly string[]): Promise<string | null> {
  for (const file of files) if (await exists(file)) return file;
  return null;
}

async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch { return false; }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw Object.assign(new Error("The operation was cancelled before completion."), { agentDiagnostic: { code: "OPERATION_CANCELLED", message: "The operation was cancelled before completion.", recovery: "Retry the read-only operation when ready." } });
}

function relative(root: string, file: string): string { return path.relative(root, file).replaceAll("\\", "/"); }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }