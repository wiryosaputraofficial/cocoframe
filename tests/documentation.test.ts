import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createRepositoryContext } from "../scripts/context.ts";

test("keeps AI documentation complete for every public package and common task", async () => {
  const root = path.resolve(".");
  const context = await createRepositoryContext(root);

  assert.equal(context.packageCount, 23);
  assert.deepEqual(
    context.packages.filter((entry) => entry.documentation === null).map((entry) => entry.name),
    [],
  );
  assert.deepEqual(
    context.packages.filter((entry) => entry.tests.length === 0).map((entry) => entry.name),
    [],
  );

  const requiredDocuments = [
    "docs/ai-context.md",
    "docs/agent-bridge.md",
    "docs/cocospecs.md",
    "docs/cocoref.md",
    "docs/cocoqa.md",
    "docs/repository-map.md",
    "docs/request-lifecycle.md",
    "docs/generated-artifacts.md",
    "docs/testing.md",
    "docs/errors.md",
    "docs/compatibility.md",
    "examples/basic/app/generated/api-reference.ts",
    "docs/recipes/README.md",
    "docs/recipes/create-page.md",
    "docs/recipes/create-island.md",
    "docs/recipes/create-form.md",
    "docs/recipes/create-api.md",
    "docs/recipes/add-middleware.md",
    "docs/recipes/add-auth-session.md",
    "docs/recipes/add-database.md",
    "docs/recipes/debug-streaming.md",
    "docs/decisions/0001-server-first.md",
    "docs/decisions/0002-islands.md",
    "docs/decisions/0003-web-standards.md",
    "docs/decisions/0004-error-boundary-buffering.md",
    "docs/decisions/0005-contract-source.md",
  ];
  await Promise.all(requiredDocuments.map((file) => access(path.join(root, file))));
});
