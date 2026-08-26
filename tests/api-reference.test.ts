import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { checkApiReference, createApiReference, renderApiReferenceModule } from "../scripts/api-reference.ts";

test("generates a deterministic API reference from every public package entry", async () => {
  const root = path.resolve(".");
  const reference = await createApiReference(root);
  const symbols = reference.packages.flatMap(({ entries }) => entries.flatMap((entry) => entry.symbols));

  assert.equal(reference.version, 1);
  assert.equal(reference.packages.length, 24);
  assert.ok(symbols.length > 200);
  const core = reference.packages.find(({ name }) => name === "@cocoframe/core");
  const definePage = core?.entries.flatMap(({ symbols: entries }) => entries).find(({ name }) => name === "definePage");
  assert.equal(definePage?.kind, "function");
  assert.match(definePage?.signature ?? "", /definePage/);
  assert.match(definePage?.summary ?? "", /server-rendered page lifecycle/);
  assert.match(definePage?.source ?? "", /packages\/core\/src\/index\.ts/);
  assert.ok((definePage?.line ?? 0) > 0);
  assert.match(renderApiReferenceModule(reference), /Do not edit manually/);
  await checkApiReference(root);
  assert.equal(await readFile(path.join(root, "examples/basic/app/generated/api-reference.ts"), "utf8"), renderApiReferenceModule(reference));
});
