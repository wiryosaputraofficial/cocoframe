import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagesRoot = path.join(repositoryRoot, "packages");
const compiledRoot = path.join(repositoryRoot, ".cocoframe", "package-build");
const stageRoot = path.join(repositoryRoot, ".cocoframe", "npm");
const command = process.argv[2] ?? "stage";

const descriptions = {
  "@cocoframe/auth": "Signed-cookie session primitives for CocoFrame applications.",
  "@cocoframe/cli": "Development, build, inspection, generation, and production tooling for CocoFrame.",
  "@cocoframe/client": "Opt-in islands, signals, and streaming browser runtime for CocoFrame.",
  "@cocoframe/cocoql": "AI-first schema-aware query planning and parameterized SQL compilation.",
  "@cocoframe/core": "Server-first page, API, layout, middleware, SEO, and application contracts for CocoFrame.",
  "@cocoframe/database": "Driver-neutral database connection and transaction lifecycle for CocoFrame.",
  "@cocoframe/database-postgres": "PostgreSQL adapter, transactions, and advisory-locked migrations for CocoFrame.",
  "@cocoframe/database-sqlite": "SQLite adapter, transactions, and ordered migrations for CocoFrame.",
  "@cocoframe/forms": "Schema-backed progressive form controllers and accessible validation state for CocoFrame.",
  "@cocoframe/icons": "Tree-shakeable typed Solar Linear icon components for CocoFrame.",
  "@cocoframe/jsx": "Typed escaped TSX runtime and streaming renderer for CocoFrame.",
  "@cocoframe/observability": "Request identity, timing, and structured event middleware for CocoFrame.",
  "@cocoframe/router": "Small method-aware static and parameterized router for CocoFrame.",
  "@cocoframe/schema": "Dependency-free runtime schemas, coercion, validation, and TypeScript inference.",
  "@cocoframe/security": "CSP, CORS, CSRF, rate limiting, and request safety middleware for CocoFrame.",
  "@cocoframe/server-node": "Node HTTP adapter and graceful shutdown lifecycle for CocoFrame.",
  "@cocoframe/server-web": "Fetch-standard edge and serverless handler for CocoFrame.",
  "@cocoframe/ui": "Server-first semantic UI components, charts, syntax highlighting, and utilities for CocoFrame.",
  "create-cocoframe": "Dependency-free project creator for CocoFrame applications.",
};

if (command === "clean") {
  await removeGeneratedDirectory(compiledRoot);
  await removeGeneratedDirectory(stageRoot);
  console.log("CocoFrame package build directories cleaned.");
} else if (command === "stage") {
  await stagePackages();
} else {
  throw new Error(`Unknown package staging command: ${command}`);
}

async function stagePackages() {
  await removeGeneratedDirectory(stageRoot);
  await mkdir(stageRoot, { recursive: true });
  const directories = (await readdir(packagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const releases = [];

  for (const directory of directories) {
    const sourceDirectory = path.join(packagesRoot, directory);
    const manifestFile = path.join(sourceDirectory, "package.json");
    if (!(await exists(manifestFile))) continue;
    const sourceManifest = JSON.parse(await readFile(manifestFile, "utf8"));
    const targetDirectory = path.join(stageRoot, directory);
    await mkdir(targetDirectory, { recursive: true });

    if (sourceManifest.name === "create-cocoframe") {
      await cp(path.join(sourceDirectory, "src"), path.join(targetDirectory, "src"), { recursive: true });
      await cp(path.join(sourceDirectory, "template"), path.join(targetDirectory, "template"), { recursive: true });
    } else {
      const compiledSource = path.join(compiledRoot, directory, "src");
      if (!(await exists(compiledSource))) throw new Error(`Missing compiled output for ${sourceManifest.name}.`);
      await cp(compiledSource, path.join(targetDirectory, "dist"), { recursive: true });
    }

    await copyPackageAssets(directory, sourceDirectory, targetDirectory);
    const releaseManifest = releasePackageManifest(sourceManifest, directory);
    await writeJson(path.join(targetDirectory, "package.json"), releaseManifest);
    await writePackageReadme(sourceDirectory, targetDirectory, releaseManifest);
    releases.push({
      name: releaseManifest.name,
      version: releaseManifest.version,
      directory,
      dependencies: Object.keys(releaseManifest.dependencies ?? {}).filter((name) => name.startsWith("@cocoframe/")),
    });
  }

  const ordered = topologicalOrder(releases);
  await writeJson(path.join(stageRoot, "release-manifest.json"), {
    version: 1,
    generatedAt: new Date().toISOString(),
    packages: ordered,
  });
  console.log(`CocoFrame npm staging: ${ordered.length} packages in ${stageRoot}`);
  for (const release of ordered) console.log(`${release.name}@${release.version}`);
}

function releasePackageManifest(source, directory) {
  const manifest = {
    name: source.name,
    version: source.version,
    description: descriptions[source.name] ?? source.description,
    keywords: ["cocoframe", "typescript", "server-first", "web-framework"],
    type: "module",
    license: source.license ?? "GPL-3.0-only",
    engines: { node: ">=24" },
    publishConfig: { access: "public" },
    repository: {
      type: "git",
      url: "git+https://github.com/wiryosaputraofficial/cocoframe.git",
      directory: `packages/${directory}`,
    },
    bugs: { url: "https://github.com/wiryosaputraofficial/cocoframe/issues" },
    homepage: "https://github.com/wiryosaputraofficial/cocoframe#readme",
    ...(source.dependencies ? { dependencies: source.dependencies } : {}),
  };

  if (source.name === "create-cocoframe") {
    manifest.exports = source.exports;
    manifest.bin = source.bin;
    manifest.files = ["src", "template", "README.md", "LICENSE"];
    return manifest;
  }

  if (source.exports) manifest.exports = mapExports(source.exports);
  if (source.bin) manifest.bin = Object.fromEntries(Object.keys(source.bin).map((name) => [name, "dist/main.js"]));
  manifest.files = ["dist", "README.md", "LICENSE", ...packageAssetNames(directory)];
  return manifest;
}

function mapExports(exports) {
  return Object.fromEntries(Object.entries(exports).map(([key, value]) => [key, mapExportTarget(value)]));
}

function mapExportTarget(value) {
  if (typeof value !== "string") return value;
  if (value.startsWith("./src/") && /\.tsx?$/.test(value)) {
    const relative = value.slice("./src/".length).replace(/\.tsx?$/, "");
    return {
      types: `./dist/${relative}.d.ts`,
      import: `./dist/${relative}.js`,
      default: `./dist/${relative}.js`,
    };
  }
  if (value.startsWith("./src/") && value.endsWith(".css")) return `./${path.basename(value)}`;
  return value;
}

async function copyPackageAssets(directory, sourceDirectory, targetDirectory) {
  const license = directory === "icons" ? path.join(sourceDirectory, "LICENSE") : path.join(repositoryRoot, "LICENSE");
  await cp(license, path.join(targetDirectory, "LICENSE"));
  for (const asset of packageAssetNames(directory)) {
    const source = path.join(sourceDirectory, directory === "client" ? "src" : "", asset);
    if (await exists(source)) await cp(source, path.join(targetDirectory, asset));
  }
}

function packageAssetNames(directory) {
  if (directory === "client") return ["dev.css"];
  if (directory === "ui") return ["styles.css", "utilities.css"];
  if (directory === "icons") return ["THIRD_PARTY_NOTICE.md"];
  return [];
}

async function writePackageReadme(sourceDirectory, targetDirectory, manifest) {
  const sourceReadme = path.join(sourceDirectory, "README.md");
  if (await exists(sourceReadme)) {
    await cp(sourceReadme, path.join(targetDirectory, "README.md"));
    return;
  }
  const install = manifest.name.startsWith("@") ? `npm install ${manifest.name}` : "npm create cocoframe@latest my-app";
  const contents = `# ${manifest.name}\n\n${manifest.description}\n\n\`\`\`bash\n${install}\n\`\`\`\n\nSee the [CocoFrame repository](https://github.com/wiryosaputraofficial/cocoframe) for documentation and source.\n`;
  await writeFile(path.join(targetDirectory, "README.md"), contents, "utf8");
}

function topologicalOrder(releases) {
  const byName = new Map(releases.map((release) => [release.name, release]));
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  const visit = (release) => {
    if (visited.has(release.name)) return;
    if (visiting.has(release.name)) throw new Error(`Circular package dependency at ${release.name}.`);
    visiting.add(release.name);
    for (const dependency of release.dependencies.sort()) {
      const dependencyRelease = byName.get(dependency);
      if (dependencyRelease) visit(dependencyRelease);
    }
    visiting.delete(release.name);
    visited.add(release.name);
    ordered.push(release);
  };
  for (const release of releases) visit(release);
  const creator = ordered.find((release) => release.name === "create-cocoframe");
  return [...ordered.filter((release) => release !== creator), ...(creator ? [creator] : [])];
}

async function removeGeneratedDirectory(directory) {
  const generatedRoot = path.join(repositoryRoot, ".cocoframe") + path.sep;
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(generatedRoot)) throw new Error(`Refusing to remove non-generated directory: ${resolved}`);
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

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
