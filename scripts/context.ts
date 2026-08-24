import { execFile as execFileCallback } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";
import { auditPublicApiDocumentation } from "./public-docs.ts";

const execFile = promisify(execFileCallback);
const defaultRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export interface PublicEntry {
  readonly subpath: string;
  readonly source: string;
  readonly symbols: readonly string[];
  readonly documentation: Readonly<Record<string, string>>;
}

export interface PackageContext {
  readonly name: string;
  readonly version: string;
  readonly directory: string;
  readonly dependencies: readonly string[];
  readonly entries: readonly PublicEntry[];
  readonly sourceFileCount: number;
  readonly documentation: string | null;
  readonly tests: readonly string[];
}

export interface RepositoryContext {
  readonly framework: string;
  readonly version: number;
  readonly packageVersion: string;
  readonly generatedBy: string;
  readonly sourceOfTruth: readonly string[];
  readonly documents: readonly string[];
  readonly commands: Readonly<Record<string, string>>;
  readonly packageCount: number;
  readonly packages: readonly PackageContext[];
  readonly generatedArtifacts: readonly {
    readonly input: string;
    readonly output: string;
    readonly command: string;
  }[];
}

export interface AiContext extends RepositoryContext {
  readonly application: unknown;
}

interface PackageManifest {
  readonly name: string;
  readonly version: string;
  readonly exports?: unknown;
  readonly bin?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
}

interface EntryTarget {
  readonly subpath: string;
  readonly target: string;
}

export async function createRepositoryContext(repositoryRoot = defaultRoot): Promise<RepositoryContext> {
  const rootManifest = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8")) as {
    readonly name: string;
    readonly version: string;
    readonly scripts: Readonly<Record<string, string>>;
  };
  const packageRoot = path.join(repositoryRoot, "packages");
  const packageDirectories = (await readdir(packageRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const program = createTypeScriptProgram(repositoryRoot);
  const checker = program.getTypeChecker();
  const sourceFiles = new Map(program.getSourceFiles().map((source) => [normalizeFile(source.fileName), source]));
  const publicDocumentation = await auditPublicApiDocumentation(repositoryRoot);
  const packages = await Promise.all(packageDirectories.map(async (directory): Promise<PackageContext> => {
    const packageDirectory = path.join(packageRoot, directory);
    const manifest = JSON.parse(await readFile(path.join(packageDirectory, "package.json"), "utf8")) as PackageManifest;
    const targets = manifest.exports === undefined
      ? Object.entries(manifest.bin ?? {}).map(([name, target]) => ({ subpath: `bin:${name}`, target }))
      : collectEntryTargets(manifest.exports);
    const entries = targets
      .map(({ subpath, target }): PublicEntry => {
        const absoluteTarget = path.resolve(packageDirectory, target);
        const source = sourceFiles.get(normalizeFile(absoluteTarget));
        const module = source ? checker.getSymbolAtLocation(source) : undefined;
        const symbols = module
          ? checker.getExportsOfModule(module).map((symbol) => symbol.getName()).sort()
          : [];
        const documentation = Object.fromEntries(publicDocumentation
          .filter((entry) => entry.package === manifest.name && symbols.includes(entry.name))
          .map((entry) => [entry.name, entry.summary]));
        return { subpath, source: relative(repositoryRoot, absoluteTarget), symbols, documentation };
      })
      .sort((left, right) => left.subpath.localeCompare(right.subpath));
    const readme = path.join(packageDirectory, "README.md");
    const testCandidates = directory === "cli" ? ["tests/project.test.ts"] : [`tests/${directory}.test.ts`];
    return {
      name: manifest.name,
      version: manifest.version,
      directory: relative(repositoryRoot, packageDirectory),
      dependencies: Object.keys(manifest.dependencies ?? {}).sort(),
      entries,
      sourceFileCount: await countSourceFiles(path.join(packageDirectory, "src")),
      documentation: await exists(readme) ? relative(repositoryRoot, readme) : null,
      tests: (await Promise.all(testCandidates.map(async (candidate) =>
        await exists(path.join(repositoryRoot, candidate)) ? candidate : null
      ))).filter((candidate): candidate is string => candidate !== null),
    };
  }));
  packages.sort((left, right) => left.name.localeCompare(right.name));

  const documentCandidates = [
    "AGENTS.md",
    "docs/ai-context.md",
    "docs/agent-bridge.md",
    "docs/architecture.md",
    "docs/repository-map.md",
    "docs/request-lifecycle.md",
    "docs/generated-artifacts.md",
    "docs/testing.md",
    "docs/errors.md",
    "docs/compatibility.md",
    "docs/recipes/README.md",
  ];
  const documents = (await Promise.all(documentCandidates.map(async (document) =>
    await exists(path.join(repositoryRoot, document)) ? document : null
  ))).filter((document): document is string => document !== null);

  return {
    framework: rootManifest.name,
    version: 1,
    packageVersion: rootManifest.version,
    generatedBy: "scripts/context.ts",
    sourceOfTruth: ["AGENTS.md", "docs/architecture.md", "package public entries", "tests", "examples/basic"],
    documents,
    commands: Object.fromEntries(Object.entries(rootManifest.scripts).sort(([left], [right]) => left.localeCompare(right))),
    packageCount: packages.length,
    packages,
    generatedArtifacts: [
      { input: "API contract IDs and schemas", output: "examples/basic/app/generated/cocoframe-client.ts", command: "npm run generate" },
      { input: "API contract manifest and OpenAPI config", output: "examples/basic/app/generated/openapi.json", command: "npm run generate" },
      { input: "*.module.css selectors", output: "adjacent *.module.d.css.ts", command: "npm run generate" },
      { input: "public package exports, declarations, and JSDoc", output: "examples/basic/app/generated/api-reference.ts", command: "npm run docs:api" },
      { input: "application routes, islands, styles, config, and public files", output: "examples/basic/.cocoframe", command: "npm run build" },
    ],
  };
}

export async function createAiContext(repositoryRoot = defaultRoot): Promise<AiContext> {
  const repository = await createRepositoryContext(repositoryRoot);
  const { stdout } = await execFile(process.execPath, ["packages/cli/src/main.ts", "inspect", "examples/basic"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const application = JSON.parse(stdout) as { projectRoot?: string };
  if (application && typeof application === "object" && "projectRoot" in application) {
    application.projectRoot = "examples/basic";
  }
  return { ...repository, application };
}

export async function writeAiContext(repositoryRoot = defaultRoot): Promise<string> {
  const context = await createAiContext(repositoryRoot);
  const output = path.join(repositoryRoot, ".cocoframe", "context.json");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(context, null, 2)}\n`, "utf8");
  return output;
}

function createTypeScriptProgram(repositoryRoot: string): ts.Program {
  const configPath = path.join(repositoryRoot, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repositoryRoot, undefined, configPath);
  return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
}

function collectEntryTargets(value: unknown, subpath = "."): EntryTarget[] {
  if (typeof value === "string") return [{ subpath, target: value }];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Readonly<Record<string, unknown>>;
  const subpaths = Object.keys(record).filter((key) => key.startsWith("."));
  if (subpaths.length > 0) return subpaths.flatMap((key) => collectEntryTargets(record[key], key));
  for (const condition of ["types", "default", "import", "node"]) {
    if (condition in record) return collectEntryTargets(record[condition], subpath);
  }
  const first = Object.values(record)[0];
  return first === undefined ? [] : collectEntryTargets(first, subpath);
}

async function countSourceFiles(directory: string): Promise<number> {
  if (!await exists(directory)) return 0;
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await countSourceFiles(child);
    else if (/\.(?:[cm]?[jt]sx?|css)$/.test(entry.name)) count += 1;
  }
  return count;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function relative(root: string, file: string): string {
  return path.relative(root, file).replaceAll("\\", "/");
}

function normalizeFile(file: string): string {
  return path.resolve(file).replaceAll("\\", "/").toLowerCase();
}

async function main(): Promise<void> {
  const output = await writeAiContext(defaultRoot);
  if (process.argv.includes("--stdout")) {
    process.stdout.write(await readFile(output, "utf8"));
    return;
  }
  process.stdout.write(`${relative(defaultRoot, output)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
