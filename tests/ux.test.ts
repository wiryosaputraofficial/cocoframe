import assert from "node:assert/strict";
import test from "node:test";
import { checkCocoUx, createCocoUx } from "@cocoframe/ux";

test("creates a deterministic CocoUX draft with actionable completeness diagnostics", () => {
  const ux = createCocoUx({ feature: "account-settings", brief: "Design account settings.", now: "2026-08-26T00:00:00.000Z" });
  const check = checkCocoUx(ux);
  assert.equal(ux.state, "draft");
  assert.equal(check.readyForPreview, false);
  assert.ok(check.diagnostics.some(({ code }) => code === "UX_ACTORS_MISSING"));
});
