import assert from "node:assert/strict";
import type { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { availableTemplates, parseArguments, scaffoldProject } from "../packages/create-cocoframe/src/index.js";
import { buildProject, discoverIcons, discoverIslands, discoverRoutes, discoverUiComponents } from "../packages/cli/src/project.ts";

test("parses create-cocoframe options deterministically", () => {
  assert.deepEqual(parseArguments(["my-app", "--package-manager", "pnpm", "--skip-install"]), {
    projectDirectory: "my-app",
    packageManager: "pnpm",
    template: "starter",
    install: false,
    help: false,
    version: false,
  });
  assert.equal(parseArguments(["app"], "yarn/4.0.0 npm/? node/v24").packageManager, "yarn");
  assert.equal(parseArguments(["app", "--template", "dashboard"], undefined).template, "dashboard");
  assert.throws(() => parseArguments(["app", "--template", "unknown"]), /unknown template/i);
  assert.throws(() => parseArguments([]), /project directory is required/i);
  assert.throws(() => parseArguments(["app", "--package-manager", "unknown"]), /unsupported package manager/i);
  assert.throws(() => parseArguments(["app", "--mystery"]), /unknown option/i);
});

test("scaffolds a buildable server-first application without installing", async () => {
  const temporaryRoot = path.resolve(".tmp-tests");
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot, "create-cocoframe-"));
  const target = path.join(fixtureRoot, "My Starter");

  try {
    const result = await scaffoldProject({
      projectDirectory: target,
      packageManager: "npm",
      install: false,
    });

    assert.equal(result.packageName, "my-starter");
    assert.equal(result.installed, false);
    const manifest = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
    assert.equal(manifest.name, "my-starter");
    assert.equal(manifest.scripts.dev, "cocoframe dev .");
    assert.equal(manifest.dependencies["@cocoframe/core"], "0.0.3");
    assert.match(await readFile(path.join(target, "app/routes/index.page.tsx"), "utf8"), /my-starter — CocoFrame/);
    await access(path.join(target, ".gitignore"));
    await assert.rejects(access(path.join(target, "_gitignore")));

    const routes = await discoverRoutes(target);
    assert.deepEqual(routes.map(({ pattern }) => pattern), ["/", "/api/health"]);
    assert.deepEqual((await discoverIslands(target)).map(({ name }) => name), ["counter"]);
    assert.match(await buildProject(target, true), /[\\/]\.cocoframe[\\/]dev[\\/]server\.mjs$/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("scaffolds every official template with CocoFrame components and icons", async () => {
  const catalog = JSON.parse(await readFile(path.resolve("packages/create-cocoframe/templates/catalog.json"), "utf8"));
  assert.deepEqual(catalog.templates.map((item: { id: string }) => item.id), availableTemplates);
  const temporaryRoot = path.resolve(".tmp-tests");
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot, "create-cocoframe-templates-"));

  try {
    for (const template of availableTemplates) {
      const target = path.join(fixtureRoot, template);
      const result = await scaffoldProject({ projectDirectory: target, template, install: false });
      assert.equal(result.template, template);
      const components = await discoverUiComponents(target);
      const icons = await discoverIcons(target);
      assert.ok(components.length > 0, `${template} must use @cocoframe/ui`);
      assert.ok(icons.length > 0, `${template} must use @cocoframe/icons`);
      const manifestItem = catalog.templates.find((item: { id: string }) => item.id === template);
      assert.deepEqual(components, [...manifestItem.components].sort());
      assert.deepEqual(icons, [...manifestItem.icons].sort());
      assert.match(await buildProject(target, true), /[\\/]\.cocoframe[\\/]dev[\\/]server\.mjs$/);
    }
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
test("launches dependency installation through the platform-safe command", async () => {
  const temporaryRoot = path.resolve(".tmp-tests");
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot, "create-cocoframe-install-"));
  const target = path.join(fixtureRoot, "starter");
  let invocation: { command: string; args: readonly string[]; cwd: string | undefined } | undefined;
  const spawnCommand = ((command: string, args: readonly string[], options: { cwd?: string }) => {
    invocation = { command, args, cwd: options.cwd };
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("exit", 0, null));
    return child;
  }) as unknown as typeof spawn;

  try {
    const result = await scaffoldProject({
      projectDirectory: target,
      packageManager: "npm",
      install: true,
      spawnCommand,
    });
    assert.equal(result.installed, true);
    assert.equal(invocation?.cwd, target);
    if (process.platform === "win32") {
      assert.equal(invocation?.command, process.env.ComSpec ?? "cmd.exe");
      assert.deepEqual(invocation?.args, ["/d", "/s", "/c", "npm", "install"]);
    } else {
      assert.equal(invocation?.command, "npm");
      assert.deepEqual(invocation?.args, ["install"]);
    }
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("refuses to overwrite a non-empty project directory", async () => {
  const temporaryRoot = path.resolve(".tmp-tests");
  await mkdir(temporaryRoot, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(temporaryRoot, "create-cocoframe-nonempty-"));
  await writeFile(path.join(fixtureRoot, "keep.txt"), "user data", "utf8");

  try {
    await assert.rejects(
      scaffoldProject({ projectDirectory: fixtureRoot, install: false }),
      /target directory is not empty/i,
    );
    assert.equal(await readFile(path.join(fixtureRoot, "keep.txt"), "utf8"), "user data");
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});