import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { auditPublicApiDocumentation, findUndocumentedPublicApi } from "../scripts/public-docs.ts";

test("keeps every public runtime symbol documented for developers and AI", async () => {
  const root = path.resolve(".");
  const documentation = await auditPublicApiDocumentation(root);
  const missing = await findUndocumentedPublicApi(root);

  assert.ok(documentation.length > 100);
  assert.deepEqual(missing, []);
  assert.match(
    documentation.find((entry) => entry.package === "@cocoframe/core" && entry.name === "definePage")?.summary ?? "",
    /server-rendered page lifecycle/,
  );
  assert.match(
    documentation.find((entry) => entry.package === "@cocoframe/client" && entry.name === "bind")?.summary ?? "",
    /one text node/,
  );
});
