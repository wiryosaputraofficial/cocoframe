import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  auditProductDesign,
  contrastRatio,
  designThemeTokens,
  hashDesignProfile,
  parseDesignProfile,
  productDesignCriteria,
} from "../packages/qa/src/index.ts";

async function exampleProfile() {
  return parseDesignProfile(JSON.parse(await readFile(path.resolve("examples/basic/cocoframe.design.json"), "utf8")));
}

test("parses, fingerprints, and compiles allow-listed project design tokens", async () => {
  const profile = await exampleProfile();
  const reparsed = parseDesignProfile(JSON.parse(JSON.stringify(profile)));
  assert.equal(profile.id, "cocoframe-foundation");
  assert.equal(await hashDesignProfile(profile), await hashDesignProfile(reparsed));
  const tokens = designThemeTokens(profile, "light");
  assert.equal(tokens["color-primary"], "#17684a");
  assert.equal(tokens["space-4"], "1.5rem");
  assert.equal(tokens.radius, "0.5rem");
  assert.equal(tokens["font-size-base"], "1rem");
  assert.equal(productDesignCriteria(profile, { hasReference: true }).length, 14);
  assert.ok(contrastRatio("#0f172a", "#ffffff") >= 4.5);
});

test("returns stable Product Design Quality diagnostics from sanitized provider evidence", async () => {
  const profile = await exampleProfile();
  assert.equal(auditProductDesign(profile, { componentsAudited: true }).passed, true);
  const result = auditProductDesign(profile, {
    componentsAudited: false,
    proposedComponents: ["AdaptiveCard"],
    referenceState: "unavailable",
    measurements: [
      { id: "mobile-overflow", principle: "overflow", status: "failed", summary: "A card clips at 320 pixels.", sanitized: true },
      { id: "card-alignment", principle: "alignment", status: "failed", summary: "Cards drift from the shared grid.", sanitized: true },
      { id: "private-reference", principle: "fidelity", status: "passed", summary: "Contains private account content.", sanitized: false },
    ],
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.diagnostics.map(({ code }) => code), [
    "COMPONENT_REUSE_NOT_AUDITED",
    "REFERENCE_UNAVAILABLE",
    "OVERFLOW_DETECTED",
    "VISUAL_ALIGNMENT_FAILED",
    "SENSITIVE_VISUAL_EVIDENCE_BLOCKED",
  ]);
});

test("rejects unknown, unsafe, and malformed Design Profile values", async () => {
  const profile = await exampleProfile();
  const unsafe = JSON.parse(JSON.stringify(profile));
  unsafe.themes.light.variables["unknown-token"] = "#ffffff";
  assert.throws(() => parseDesignProfile(unsafe), /Unknown design token/);
  const injected = JSON.parse(JSON.stringify(profile));
  injected.spacing["4"] = "1rem; color:red";
  assert.throws(() => parseDesignProfile(injected), /unsafe CSS value/);
  assert.throws(() => contrastRatio("red", "#ffffff"), /six-digit hexadecimal/);
});
test("keeps Design Profile parsing and large static audits within approved limits", async () => {
  const profilePath = path.resolve("examples/basic/cocoframe.design.json");
  const source = await readFile(profilePath, "utf8");
  assert.ok((await stat(profilePath)).size <= 256 * 1024);

  const parseStartedAt = performance.now();
  const profile = parseDesignProfile(JSON.parse(source));
  assert.ok(performance.now() - parseStartedAt < 100);

  const measurements = Array.from({ length: 10_000 }, (_, index) => ({
    id: "token-usage-" + index,
    principle: "tokens" as const,
    status: "passed" as const,
    summary: "Uses an approved semantic token.",
    sanitized: true,
  }));
  const auditStartedAt = performance.now();
  const result = auditProductDesign(profile, { componentsAudited: true, measurements });
  assert.ok(performance.now() - auditStartedAt < 2_000);
  assert.equal(result.passed, true);
});
