import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { diagnoseProject } from "../packages/cli/src/doctor.ts";
import { runDoctorCommand } from "../packages/cli/src/doctor-command.ts";

test("diagnoses the reference project quickly without changing its source", async () => {
  const root = path.resolve("examples/basic");
  const before = await sourceState(root);
  const started = performance.now();
  const result = await diagnoseProject(root);
  assert.ok(performance.now() - started < 2_000);
  assert.equal(result.contractVersion, 1);
  assert.equal(result.status, "healthy");
  assert.equal(result.summary.error, 0);
  assert.ok(result.checks.some(({ id, status }) => id === "build.production" && status === "skipped"));
  assert.deepEqual(await sourceState(root), before);
});

test("emits valid JSON and applies strict warning exit behavior", async (context) => {
  const root = await fixture(context, "doctor-warning");
  await mkdir(path.join(root, "app", "routes", "api"), { recursive: true });
  await writeFile(path.join(root, "app", "routes", "api", "ping.route.ts"), "export default { id: 'ping', method: 'GET' };\n");

  const output: string[] = [];
  const normal = await runDoctorCommand([root, "--json"], root, { log: (value) => output.push(value), error: (value) => output.push(value) });
  assert.equal(normal, 0);
  const result = JSON.parse(output.join("\n")) as { contractVersion: number; status: string; diagnostics: Array<{ code: string }> };
  assert.equal(result.contractVersion, 1);
  assert.equal(result.status, "warning");
  assert.ok(result.diagnostics.some(({ code }) => code === "GENERATED_ARTIFACT_MISSING"));
  const strict = await runDoctorCommand([root, "--strict"], root, { log: () => undefined, error: () => undefined });
  assert.equal(strict, 1);
});

test("returns actionable project, island, and security diagnostics without secrets", async (context) => {
  const missing = await diagnoseProject(path.join(os.tmpdir(), "cocoframe-doctor-does-not-exist"));
  assert.equal(missing.status, "error");
  assert.equal(missing.diagnostics[0]?.code, "PROJECT_NOT_FOUND");

  const root = await fixture(context, "doctor-errors");
  await mkdir(path.join(root, "app", "islands"), { recursive: true });
  await writeFile(path.join(root, "app", "islands", "counter.island.tsx"), "export default defineIsland({ name: 'different', setup: () => () => null });\n");
  await writeFile(path.join(root, "cocoframe.config.ts"), "const token = 'super-secret-token'; export default { allowedHosts: ['*'] };\n");
  const result = await diagnoseProject(root);
  assert.equal(result.status, "error");
  assert.ok(result.diagnostics.some(({ code }) => code === "ISLAND_NAME_MISMATCH"));
  assert.ok(result.diagnostics.some(({ code }) => code === "ALLOWED_HOSTS_WILDCARD"));
  assert.doesNotMatch(JSON.stringify(result), /super-secret-token/);
  for (const diagnostic of result.diagnostics) {
    assert.ok(diagnostic.code);
    assert.ok(diagnostic.category);
    assert.ok(diagnostic.message);
    assert.ok(diagnostic.evidence.length > 0);
    assert.ok(diagnostic.suggestion);
    assert.equal(diagnostic.documentation, "/docs/doctor#diagnostics");
  }
});

test("runs an isolated deep build and honors cancellation", async () => {
  const root = path.resolve("examples/basic");
  const before = await sourceState(root);
  const deep = await diagnoseProject(root, { deep: true });
  assert.equal(deep.status, "healthy");
  assert.ok(deep.checks.some(({ id, status }) => id === "build.production" && status === "passed"));
  assert.deepEqual(await sourceState(root), before);

  const controller = new AbortController();
  controller.abort();
  const cancelled = await diagnoseProject(root, {}, controller.signal);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.diagnostics[0]?.code, "OPERATION_CANCELLED");
});

test("documents the CLI and shared Agent Bridge contract", async () => {
  const readme = await readFile(path.resolve("README.md"), "utf8");
  const cli = await readFile(path.resolve("packages/cli/README.md"), "utf8");
  const agent = await readFile(path.resolve("docs/agent-bridge.md"), "utf8");
  const topics = await readFile(path.resolve("examples/basic/app/components/docs-topics.tsx"), "utf8");
  for (const source of [readme, cli, topics]) assert.match(source, /cocoframe doctor/);
  assert.match(agent, /project\.doctor/);
  assert.match(topics, /topic\("doctor"/);
});

async function fixture(context: test.TestContext, name: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), `${name}-`));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "app", "routes"), { recursive: true });
  await mkdir(path.join(root, "node_modules", "@cocoframe", "core"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name, version: "1.0.0", dependencies: { "@cocoframe/core": "0.0.4" } }));
  await writeFile(path.join(root, "node_modules", "@cocoframe", "core", "package.json"), JSON.stringify({ name: "@cocoframe/core", version: "0.0.4" }));
  await writeFile(path.join(root, "app", "routes", "index.page.tsx"), "export default { view: () => null };\n");
  return root;
}

async function sourceState(root: string): Promise<readonly string[]> {
  const found: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const directory = queue.shift()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if ([".cocoframe", "node_modules"].includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(file);
      else {
        const info = await stat(file);
        found.push(`${path.relative(root, file).replaceAll("\\", "/")}:${info.size}:${info.mtimeMs}`);
      }
    }
  }
  return found.sort();
}
