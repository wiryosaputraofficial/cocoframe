import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createAiContext } from "../scripts/context.ts";

test("generates a compact AI manifest from repository sources of truth", async () => {
  const context = await createAiContext(path.resolve("."));

  assert.equal(context.framework, "cocoframe");
  assert.equal(context.packageCount, 19);
  assert.equal(context.packages.length, 19);
  assert.ok(context.documents.includes("docs/ai-context.md"));
  assert.ok(context.documents.includes("docs/repository-map.md"));

  const core = context.packages.find((candidate) => candidate.name === "@cocoframe/core");
  assert.ok(core);
  assert.ok(core.entries.find((entry) => entry.subpath === ".")?.symbols.includes("definePage"));
  assert.match(core.entries.find((entry) => entry.subpath === ".")?.documentation.definePage ?? "", /server-rendered page lifecycle/);
  assert.deepEqual(core.tests, ["tests/core.test.ts"]);

  const application = context.application as {
    projectRoot: string;
    routes: Array<{ pattern: string }>;
    islands: Array<{ name: string }>;
    contracts: Array<{ id: string }>;
  };
  assert.equal(application.projectRoot, "examples/basic");
  assert.ok(application.routes.some(({ pattern }) => pattern === "/components"));
  assert.ok(application.islands.some(({ name }) => name === "counter"));
  assert.ok(application.contracts.some(({ id }) => id === "greet-person"));
});
