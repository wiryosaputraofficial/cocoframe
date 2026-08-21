import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(repositoryRoot, ".cocoframe");
const tarballRoot = path.join(generatedRoot, "tarballs");
const smokeRoot = path.join(generatedRoot, "npm-smoke");
const npmCli = process.env.npm_execpath;

if (!npmCli) throw new Error("Run the smoke test through an npm script so npm_execpath is available.");
await resetSmokeDirectory();

try {
  const tarballManifest = JSON.parse(await readFile(path.join(tarballRoot, "manifest.json"), "utf8"));
  const tarballs = tarballManifest.packages.map((entry) => path.join(tarballRoot, entry.filename));
  await writeFile(path.join(smokeRoot, "package.json"), `${JSON.stringify({ name: "cocoframe-npm-smoke", private: true, type: "module" }, null, 2)}\n`, "utf8");
  await npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs]);

  const runtimeImports = tarballManifest.packages
    .map((entry) => entry.name)
    .filter((name) => name !== "@cocoframe/cli" && name !== "create-cocoframe");
  await writeFile(path.join(smokeRoot, "verify-imports.mjs"), [
    `const packages = ${JSON.stringify(runtimeImports)};`,
    "for (const packageName of packages) await import(packageName);",
    "await import('@cocoframe/icons/linear/home');",
    "await import('@cocoframe/ui/syntax');",
    "console.log(`Imported ${packages.length} runtime packages and public subpaths.`);",
  ].join("\n"));
  await node(["verify-imports.mjs"]);

  const creator = path.join("node_modules", "create-cocoframe", "src", "cli.js");
  await node([creator, "app", "--skip-install"]);
  const tsc = path.join(repositoryRoot, "node_modules", "typescript", "bin", "tsc");
  await node([tsc, "-p", path.join(smokeRoot, "app", "tsconfig.json"), "--noEmit"]);

  const cli = path.join("node_modules", "@cocoframe", "cli", "dist", "main.js");
  await node([cli, "inspect", "app"]);
  await node([cli, "build", "app"]);

  await writeFile(path.join(smokeRoot, "verify-app.mjs"), [
    "const app = (await import('./app/.cocoframe/server.mjs')).default;",
    "const page = await app.fetch(new Request('http://localhost/'));",
    "if (page.status !== 200) throw new Error(`Unexpected page status: ${page.status}`);",
    "const html = await page.text();",
    "if (!html.includes('Your CocoFrame project is ready.')) throw new Error('Starter SSR content is missing.');",
    "const health = await app.fetch(new Request('http://localhost/api/health'));",
    "if (health.status !== 200) throw new Error(`Unexpected health status: ${health.status}`);",
    "const data = await health.json();",
    "if (data.ok !== true || data.framework !== 'cocoframe') throw new Error('Typed health response is invalid.');",
    "console.log('Starter SSR and typed API passed.');",
  ].join("\n"));
  await node(["verify-app.mjs"]);
  console.log("CocoFrame npm tarball smoke test passed.");
} finally {
  await resetSmokeDirectory();
}

async function npm(args) {
  return execute(process.execPath, [npmCli, ...args]);
}

async function node(args) {
  return execute(process.execPath, args);
}

async function execute(command, args) {
  const result = await run(command, args, { cwd: smokeRoot, maxBuffer: 32 * 1024 * 1024 });
  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim()) console.error(result.stderr.trim());
  return result;
}

async function resetSmokeDirectory() {
  const expectedPrefix = generatedRoot + path.sep;
  const resolved = path.resolve(smokeRoot);
  if (!resolved.startsWith(expectedPrefix)) throw new Error(`Refusing to remove non-generated directory: ${resolved}`);
  await rm(resolved, { recursive: true, force: true });
  await mkdir(resolved, { recursive: true });
}
