import { lstat, mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertSafeTree,
  type DoctorCheck,
  type DoctorDiagnostic,
  type DoctorOptions,
  type DoctorReport,
} from "@cocoframe/agent";
import { inspectProjectReadOnly } from "./inspect-readonly.ts";
import { buildProject, discoverStyles } from "./project.ts";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_DIAGNOSTICS = 1_000;
const DEEP_TIMEOUT_MS = 60_000;
const FRESHNESS_TOLERANCE_MS = 1_000;

interface PackageManifest {
  readonly name?: string;
  readonly version?: string;
  readonly workspaces?: readonly string[];
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

/** Runs the canonical read-only CocoFrame Doctor engine. */
export async function diagnoseProject(projectInput: string, options: DoctorOptions = {}, signal?: AbortSignal): Promise<DoctorReport> {
  const mode = options.deep ? "deep" as const : "default" as const;
  const strict = options.strict === true;
  const checks: DoctorCheck[] = [];
  const diagnostics: DoctorDiagnostic[] = [];
  let projectRoot = path.resolve(projectInput);

  const addCheck = (id: string, found: readonly DoctorDiagnostic[] = [], skipped = false) => {
    diagnostics.push(...found);
    const status = skipped ? "skipped" as const
      : found.some(({ severity }) => severity === "error") ? "error" as const
      : found.some(({ severity }) => severity === "warning") ? "warning" as const
      : "passed" as const;
    checks.push({ id, status });
  };

  try {
    throwIfCancelled(signal);
    try {
      projectRoot = await realpath(projectRoot);
    } catch {
      addCheck("project.manifest", [problem("PROJECT_NOT_FOUND", "error", "project", "The selected directory is not a readable CocoFrame project.", ["package.json was not found in the selected directory."], "Select a CocoFrame project root and retry.")]);
      return report(mode, strict, "error", checks, diagnostics);
    }

    const manifestResult = await readManifest(projectRoot);
    if (!manifestResult.manifest) {
      addCheck("project.manifest", [manifestResult.diagnostic!]);
      return report(mode, strict, "error", checks, diagnostics);
    }
    const manifest = manifestResult.manifest;
    if (!isCocoFrameManifest(manifest)) {
      addCheck("project.manifest", [problem("PROJECT_NOT_FOUND", "error", "project", "The selected directory is not a CocoFrame project.", ["package.json does not declare a CocoFrame package or workspace."], "Run Doctor from the generated application root.")]);
      return report(mode, strict, "error", checks, diagnostics);
    }
    addCheck("project.manifest");

    const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
    addCheck("environment.node", nodeMajor >= 24 ? [] : [problem("NODE_VERSION_UNSUPPORTED", "error", "environment", "CocoFrame requires Node.js 24 or newer.", [`Detected Node.js major version ${Number.isFinite(nodeMajor) ? nodeMajor : "unknown"}.`], "Install a supported Node.js release and rerun Doctor.")]);

    throwIfCancelled(signal);
    try {
      await assertSafeTree(projectRoot, "app", signal);
      addCheck("project.workspace-safety");
    } catch (error) {
      addCheck("project.workspace-safety", [problem("WORKSPACE_ACCESS_DENIED", "error", "security", "The application tree contains an unsafe or inaccessible entry.", [safeAgentMessage(error)], "Keep application files inside the project and replace linked entries with regular files.")]);
    }

    throwIfCancelled(signal);
    let snapshot: Awaited<ReturnType<typeof inspectProjectReadOnly>> | undefined;
    try {
      snapshot = await inspectProjectReadOnly(projectRoot, signal);
      const duplicate = snapshot.routes.find((route, index) => snapshot!.routes.findIndex((candidate) => candidate.kind === route.kind && candidate.pattern === route.pattern) !== index);
      const discoveryDiagnostics: DoctorDiagnostic[] = duplicate ? [problem("ROUTE_DUPLICATE", "error", "project", `Multiple ${duplicate.kind} routes resolve to the same pattern.`, [duplicate.pattern], "Rename one route file so every route pattern is unique.")] : [];
      if (snapshot.routes.length === 0) discoveryDiagnostics.push(problem("PROJECT_ROUTES_MISSING", "warning", "project", "The project has no discoverable page or API routes.", ["app/routes contains no *.page.ts(x) or *.route.ts(x) files."], "Add a route or confirm that Doctor is running from the application root."));
      addCheck("project.discovery", discoveryDiagnostics);
    } catch {
      addCheck("project.discovery", [problem("PROJECT_DISCOVERY_FAILED", "error", "project", "CocoFrame could not inspect the application structure.", ["Static project discovery failed."], "Check route, island, style, and manifest syntax, then rerun Doctor.")]);
    }

    if (snapshot) {
      addCheck("dependencies.cocoframe", await dependencyDiagnostics(projectRoot, snapshot.dependencies));
      addCheck("project.islands", await islandDiagnostics(projectRoot, snapshot.islands));
      addCheck("generated.freshness", await generatedDiagnostics(projectRoot, snapshot));
    } else {
      addCheck("dependencies.cocoframe", [], true);
      addCheck("project.islands", [], true);
      addCheck("generated.freshness", [], true);
    }

    const config = await configurationDiagnostics(projectRoot);
    addCheck("configuration.static", config.configuration);
    addCheck("security.static", config.security);

    if (options.deep) addCheck("build.production", await deepBuildDiagnostics(projectRoot, signal));
    else addCheck("build.production", [], true);

    const limited = limitDiagnostics(diagnostics);
    const status = limited.items.some(({ severity }) => severity === "error") ? "error"
      : limited.items.some(({ severity }) => severity === "warning") ? "warning"
      : "healthy";
    return report(mode, strict, status, checks, limited.items, limited.truncated);
  } catch (error) {
    const cancelled = signal?.aborted === true;
    const diagnostic = problem(
      cancelled ? "OPERATION_CANCELLED" : "DOCTOR_INTERNAL_FAILURE",
      "error",
      "internal",
      cancelled ? "CocoFrame Doctor was cancelled before completion." : "CocoFrame Doctor encountered an unexpected internal failure.",
      [cancelled ? "The active operation was cancelled." : "No project source or sensitive value was included in this failure."],
      cancelled ? "Retry the command when ready." : "Retry with the latest CocoFrame release and report this diagnostic code if it persists.",
    );
    checks.push({ id: "doctor.internal", status: "error" });
    return report(mode, strict, cancelled ? "cancelled" : "internal-error", checks, [diagnostic]);
  }
}

function report(
  mode: "default" | "deep",
  strict: boolean,
  status: DoctorReport["status"],
  checks: readonly DoctorCheck[],
  diagnostics: readonly DoctorDiagnostic[],
  truncated = false,
): DoctorReport {
  const orderedChecks = [...checks].sort((left, right) => left.id.localeCompare(right.id));
  const severityOrder = { error: 0, warning: 1 } as const;
  const orderedDiagnostics = [...diagnostics].sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity] || left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
  return {
    framework: "cocoframe",
    contractVersion: 1,
    mode,
    strict,
    status,
    project: ".",
    checks: orderedChecks,
    diagnostics: orderedDiagnostics,
    summary: {
      checks: orderedChecks.length,
      passed: orderedChecks.filter(({ status: value }) => value === "passed").length,
      warning: orderedChecks.filter(({ status: value }) => value === "warning").length,
      error: orderedChecks.filter(({ status: value }) => value === "error").length,
      skipped: orderedChecks.filter(({ status: value }) => value === "skipped").length,
      internalFailure: status === "internal-error",
    },
    truncated,
  };
}

async function readManifest(root: string): Promise<{ readonly manifest?: PackageManifest; readonly diagnostic?: DoctorDiagnostic }> {
  const file = path.join(root, "package.json");
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile()) return { diagnostic: problem("PROJECT_MANIFEST_INVALID", "error", "project", "package.json must be a regular file inside the project.", ["package.json is linked or is not a regular file."], "Replace it with a regular project manifest.") };
    if (info.size > MAX_FILE_BYTES) return { diagnostic: problem("PROJECT_FILE_TOO_LARGE", "error", "security", "package.json exceeds the 1 MiB Doctor safety limit.", ["package.json was not read."], "Reduce the manifest size and retry.") };
    return { manifest: JSON.parse(await readFile(file, "utf8")) as PackageManifest };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return { diagnostic: problem(code === "ENOENT" ? "PROJECT_NOT_FOUND" : "PROJECT_MANIFEST_INVALID", "error", "project", code === "ENOENT" ? "The selected directory has no package.json." : "The project package.json is invalid or unreadable.", ["package.json could not be parsed safely."], "Select a CocoFrame project root or repair package.json.") };
  }
}

function isCocoFrameManifest(manifest: PackageManifest): boolean {
  const names = [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})];
  return manifest.name === "cocoframe" || names.some((name) => name.startsWith("@cocoframe/"));
}

async function dependencyDiagnostics(root: string, dependencies: readonly { readonly name: string; readonly range: string; readonly kind: string }[]): Promise<readonly DoctorDiagnostic[]> {
  const diagnostics: DoctorDiagnostic[] = [];
  for (const dependency of dependencies.filter(({ name }) => name.startsWith("@cocoframe/")).sort((a, b) => a.name.localeCompare(b.name))) {
    const installed = await installedManifest(root, dependency.name);
    if (!installed) {
      diagnostics.push(problem("COCOFRAME_DEPENDENCY_MISSING", dependency.kind === "dependency" ? "error" : "warning", "dependencies", `Declared CocoFrame dependency ${dependency.name} is not installed.`, [`Declared range: ${dependency.range}`], "Install project dependencies and rerun Doctor."));
      continue;
    }
    if (!versionSatisfies(dependency.range, installed.version)) {
      diagnostics.push(problem("COCOFRAME_DEPENDENCY_VERSION_MISMATCH", "error", "dependencies", `Installed ${dependency.name} does not satisfy its declared version.`, [`Declared ${dependency.range}; installed ${installed.version ?? "unknown"}.`], "Install the coordinated CocoFrame dependency versions declared by the project."));
    }
  }
  return diagnostics;
}

async function installedManifest(root: string, name: string): Promise<PackageManifest | undefined> {
  let current = root;
  while (true) {
    const file = path.join(current, "node_modules", ...name.split("/"), "package.json");
    try {
      const info = await stat(file);
      if (info.size <= MAX_FILE_BYTES) return JSON.parse(await readFile(file, "utf8")) as PackageManifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return undefined;
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function versionSatisfies(range: string, installed?: string): boolean {
  if (!installed || range.startsWith("workspace:") || range === "*" || range === "latest") return installed !== undefined;
  const exact = /^(?:[~^])?(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const actual = /^(\d+)\.(\d+)\.(\d+)/.exec(installed);
  if (!exact || !actual) return true;
  if (!range.startsWith("^") && !range.startsWith("~")) return installed === `${exact[1]}.${exact[2]}.${exact[3]}`;
  if (range.startsWith("~")) return actual[1] === exact[1] && actual[2] === exact[2] && Number(actual[3]) >= Number(exact[3]);
  return actual[1] === exact[1] && Number(actual[1]) > 0 && (Number(actual[2]) > Number(exact[2]) || actual[2] === exact[2] && Number(actual[3]) >= Number(exact[3]));
}

async function islandDiagnostics(root: string, islands: readonly { readonly name: string; readonly file: string }[]): Promise<readonly DoctorDiagnostic[]> {
  const diagnostics: DoctorDiagnostic[] = [];
  for (const island of islands) {
    const source = await readSmallProjectFile(root, island.file);
    if (!source) {
      diagnostics.push(problem("PROJECT_FILE_UNREADABLE", "error", "project", `Island ${island.name} could not be read safely.`, [island.file], "Keep island source inside the project and below the 1 MiB file limit."));
      continue;
    }
    const definition = source.slice(Math.max(0, source.lastIndexOf("defineIsland")));
    const declared = /\bname\s*:\s*["']([a-z0-9-]+)["']/.exec(definition)?.[1];
    if (declared !== island.name) diagnostics.push(problem("ISLAND_NAME_MISMATCH", "error", "project", `Island ${island.name} must declare the same stable lowercase name as its filename.`, [island.file, `Declared name: ${declared ?? "missing"}.`], `Set defineIsland name to ${island.name}.`));
  }
  return diagnostics;
}

async function generatedDiagnostics(root: string, snapshot: Awaited<ReturnType<typeof inspectProjectReadOnly>>): Promise<readonly DoctorDiagnostic[]> {
  const diagnostics: DoctorDiagnostic[] = [];
  const generated = new Set(snapshot.generatedCapabilities.map(({ kind }) => kind));
  const apiFiles = snapshot.routes.filter(({ kind }) => kind === "api").map(({ file }) => path.join(root, file));
  if (apiFiles.length > 0) {
    for (const [kind, file] of [["client", "app/generated/cocoframe-client.ts"], ["openapi", "app/generated/openapi.json"]] as const) {
      if (!generated.has(kind)) {
        diagnostics.push(problem("GENERATED_ARTIFACT_MISSING", "warning", "generated", `Generated ${kind} artifact is missing.`, [file], "Run cocoframe generate."));
        continue;
      }
      if (await newerThan(apiFiles, path.join(root, file))) diagnostics.push(problem("GENERATED_ARTIFACT_STALE", "warning", "generated", `Generated ${kind} artifact is older than an API route.`, [file], "Run cocoframe generate."));
    }
  }
  for (const style of await discoverStyles(root).catch(() => [])) {
    const declaration = style.file.replace(/\.css$/, ".d.css.ts");
    if (await newerThan([style.file], declaration)) diagnostics.push(problem("GENERATED_ARTIFACT_STALE", "warning", "generated", "A CSS module declaration is missing or stale.", [relative(root, declaration)], "Run cocoframe generate."));
  }
  return diagnostics;
}

async function newerThan(sources: readonly string[], target: string): Promise<boolean> {
  try {
    const targetTime = (await stat(target)).mtimeMs;
    const sourceTimes = await Promise.all(sources.map(async (file) => (await stat(file)).mtimeMs));
    // Fresh checkouts can assign source and generated files slightly different
    // mtimes based only on extraction order. Require a meaningful difference so
    // Doctor still catches local edits without reporting checkout-order noise.
    return sourceTimes.some((value) => value > targetTime + FRESHNESS_TOLERANCE_MS);
  } catch {
    return true;
  }
}

async function configurationDiagnostics(root: string): Promise<{ readonly configuration: readonly DoctorDiagnostic[]; readonly security: readonly DoctorDiagnostic[] }> {
  const candidates = ["cocoframe.config.ts", "cocoframe.config.js"];
  let file: string | undefined;
  for (const candidate of candidates) {
    try {
      await lstat(path.join(root, candidate));
      file = candidate;
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") break;
    }
  }
  const configuration: DoctorDiagnostic[] = [];
  const security: DoctorDiagnostic[] = [];
  if (file) {
    const source = await readSmallProjectFile(root, file);
    if (!source) configuration.push(problem("PROJECT_FILE_UNREADABLE", "error", "configuration", "The CocoFrame configuration is linked, unreadable, or exceeds the file safety limit.", [file], "Keep configuration in a regular project file below 1 MiB."));
    else {
      if (/allowedHosts\s*:\s*\[[^\]]*["']\*["']/s.test(source)) security.push(problem("ALLOWED_HOSTS_WILDCARD", "error", "security", "allowedHosts cannot contain a wildcard.", [file], "Declare every production host explicitly."));
      if (/credentials\s*:\s*true/s.test(source) && /origins\s*:\s*\[[^\]]*["']\*["']/s.test(source)) security.push(problem("CREDENTIAL_CORS_WILDCARD", "error", "security", "Credentialed CORS cannot use a wildcard origin.", [file], "Replace the wildcard with explicit trusted origins."));
    }
  }
  if ((process.env.COCOFRAME_TRUSTED_PROXIES ?? "").split(",").some((value) => value.trim() === "*")) security.push(problem("TRUSTED_PROXY_WILDCARD", "error", "security", "COCOFRAME_TRUSTED_PROXIES cannot trust every peer.", ["The environment variable contains a wildcard; its full value was not read into the report."], "List only verified direct proxy addresses."));
  return { configuration, security };
}

async function deepBuildDiagnostics(root: string, signal?: AbortSignal): Promise<readonly DoctorDiagnostic[]> {
  throwIfCancelled(signal);
  const temporary = await mkdtemp(path.join(os.tmpdir(), "cocoframe-doctor-"));
  let timedOut = false;
  const build = buildProject(root, false, { outputRoot: path.join(temporary, "build") });
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("DOCTOR_DEEP_TIMEOUT"));
    }, DEEP_TIMEOUT_MS);
    timer.unref();
  });
  try {
    await Promise.race([build, timeout]);
    throwIfCancelled(signal);
    return [];
  } catch (error) {
    if (signal?.aborted) throw error;
    return [problem(timedOut ? "DEEP_CHECK_TIMEOUT" : "DEEP_BUILD_FAILED", "error", "build", timedOut ? "The isolated production build exceeded 60 seconds." : "The isolated production build failed.", ["No application bundle was imported or executed."], timedOut ? "Run cocoframe build directly to investigate or reduce project build cost." : "Run cocoframe build to view detailed local compiler diagnostics.")];
  } finally {
    if (timer) clearTimeout(timer);
    if (timedOut) void build.finally(() => rm(temporary, { recursive: true, force: true })).catch(() => undefined);
    else await rm(temporary, { recursive: true, force: true });
  }
}

async function readSmallProjectFile(root: string, relativeFile: string): Promise<string | undefined> {
  const file = path.resolve(root, relativeFile);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) return undefined;
  try {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_FILE_BYTES) return undefined;
    return await readFile(file, "utf8");
  } catch {
    return undefined;
  }
}

function problem(code: string, severity: DoctorDiagnostic["severity"], category: DoctorDiagnostic["category"], message: string, evidence: readonly string[], suggestion: string): DoctorDiagnostic {
  return { code, severity, category, message, evidence: evidence.map(redact), suggestion, documentation: "/docs/doctor#diagnostics" };
}

function safeAgentMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "agentDiagnostic" in error) {
    const diagnostic = (error as { readonly agentDiagnostic?: { readonly message?: string } }).agentDiagnostic;
    if (diagnostic?.message) return redact(diagnostic.message);
  }
  return "Workspace safety validation failed.";
}

function redact(value: string): string {
  return value
    .replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

function relative(root: string, file: string): string {
  return path.relative(root, file).replaceAll("\\", "/");
}

function limitDiagnostics(items: readonly DoctorDiagnostic[]): { readonly items: readonly DoctorDiagnostic[]; readonly truncated: boolean } {
  return { items: items.slice(0, MAX_DIAGNOSTICS), truncated: items.length > MAX_DIAGNOSTICS };
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("OPERATION_CANCELLED");
}
