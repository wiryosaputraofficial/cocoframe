import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(repositoryRoot, ".cocoframe");
const stageRoot = path.join(generatedRoot, "npm");
const tarballRoot = path.join(generatedRoot, "tarballs");
const npmCli = process.env.npm_execpath;

if (!npmCli) throw new Error("Run package packing through an npm script so npm_execpath is available.");
await removeTarballDirectory();
await mkdir(tarballRoot, { recursive: true });

const releaseManifest = JSON.parse(await readFile(path.join(stageRoot, "release-manifest.json"), "utf8"));
validateReleaseGraph(releaseManifest.packages);
const packed = [];

for (const release of releaseManifest.packages) {
  const packageDirectory = path.join(stageRoot, release.directory);
  const manifest = JSON.parse(await readFile(path.join(packageDirectory, "package.json"), "utf8"));
  await validatePackageDirectory(packageDirectory, manifest);
  const { stdout } = await run(process.execPath, [npmCli, "pack", packageDirectory, "--pack-destination", tarballRoot, "--json", "--ignore-scripts"], {
    cwd: repositoryRoot,
    maxBuffer: 16 * 1024 * 1024,
  });
  const [result] = JSON.parse(stdout);
  validatePackedFiles(manifest, result.files);
  packed.push({
    name: result.name,
    version: result.version,
    filename: result.filename,
    size: result.size,
    unpackedSize: result.unpackedSize,
    integrity: result.integrity,
    shasum: result.shasum,
    files: result.entryCount,
  });
  console.log(`${result.name}@${result.version}: ${result.entryCount} files, ${result.size} bytes`);
}

await writeFile(path.join(tarballRoot, "manifest.json"), `${JSON.stringify({ version: 1, packages: packed }, null, 2)}\n`, "utf8");
console.log(`CocoFrame tarballs: ${packed.length} packages in ${tarballRoot}`);

function validateReleaseGraph(releases) {
  if (!Array.isArray(releases) || releases.length === 0) throw new Error("Release manifest contains no packages.");
  const versions = new Map(releases.map((release) => [release.name, release.version]));
  if (releases.at(-1)?.name !== "create-cocoframe") throw new Error("create-cocoframe must be released last.");
  for (const release of releases) {
    for (const dependency of release.dependencies) {
      if (!versions.has(dependency)) throw new Error(`${release.name} references missing internal package ${dependency}.`);
    }
  }
}

async function validatePackageDirectory(directory, manifest) {
  for (const required of ["README.md", "LICENSE", "package.json"]) {
    if (!(await exists(path.join(directory, required)))) throw new Error(`${manifest.name} is missing ${required}.`);
  }
  if (manifest.name.startsWith("@cocoframe/") && manifest.publishConfig?.access !== "public") {
    throw new Error(`${manifest.name} must publish with public access.`);
  }
  if (manifest.bin) {
    for (const target of Object.values(manifest.bin)) await assertExportTarget(directory, target, manifest.name);
  }
  if (manifest.exports) {
    for (const target of Object.values(manifest.exports)) await validateExportValue(directory, target, manifest.name);
  }
  for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
    if (dependency.startsWith("@cocoframe/") && !/^\d+\.\d+\.\d+$/.test(version)) {
      throw new Error(`${manifest.name} must pin internal dependency ${dependency} exactly.`);
    }
  }
}

async function validateExportValue(directory, value, packageName) {
  if (typeof value === "string") {
    await assertExportTarget(directory, value, packageName);
    return;
  }
  if (value && typeof value === "object") {
    for (const target of Object.values(value)) await validateExportValue(directory, target, packageName);
  }
}

async function assertExportTarget(directory, target, packageName) {
  const normalized = target.replace(/^\.\//, "");
  if (!normalized.includes("*")) {
    if (!(await exists(path.join(directory, normalized)))) throw new Error(`${packageName} export target is missing: ${target}`);
    return;
  }
  const parent = path.join(directory, path.dirname(normalized));
  const basenamePattern = path.basename(normalized);
  const marker = basenamePattern.indexOf("*");
  const basenamePrefix = basenamePattern.slice(0, marker);
  const suffix = basenamePattern.slice(marker + 1);
  const entries = await readdir(parent);
  if (!entries.some((entry) => entry.startsWith(basenamePrefix) && entry.endsWith(suffix))) {
    throw new Error(`${packageName} wildcard export has no targets: ${target}`);
  }
}

function validatePackedFiles(manifest, files) {
  const paths = files.map((file) => file.path);
  if (paths.some((file) => /(^|\/)\.env($|\.)|\.npmrc$|\.pem$|\.key$/.test(file))) {
    throw new Error(`${manifest.name} tarball contains a sensitive file name.`);
  }
  if (manifest.name !== "create-cocoframe" && paths.some((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))) {
    throw new Error(`${manifest.name} tarball contains uncompiled TypeScript source.`);
  }
  if (!paths.includes("package.json") || !paths.includes("README.md") || !paths.includes("LICENSE")) {
    throw new Error(`${manifest.name} tarball is missing required metadata.`);
  }
}

async function removeTarballDirectory() {
  const expectedPrefix = generatedRoot + path.sep;
  const resolved = path.resolve(tarballRoot);
  if (!resolved.startsWith(expectedPrefix)) throw new Error(`Refusing to remove non-generated directory: ${resolved}`);
  await rm(resolved, { recursive: true, force: true });
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}
