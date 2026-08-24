import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { approveCocoSpec, answerCocoSpec, createCocoSpec, nextQuestions, type CocoSpecQuestion, type CocoSpecValue } from "@cocoframe/specs";
import { answerCocoQa, createCocoQa, nextCocoQaQuestions, recordCocoQaCase } from "@cocoframe/qa";
import { createAgentBridge } from "../packages/agent/src/index.ts";
import { inspectProjectReadOnly } from "../packages/cli/src/inspect-readonly.ts";

test("returns only the next CocoSpecs batch for proposed and canonical specifications", async () => {
  const exampleRoot = path.resolve("examples/basic");
  const before = await fileState(exampleRoot);
  const exampleBridge = await createAgentBridge({ workspaceRoot: exampleRoot, inspectProject: inspectProjectReadOnly });
  const proposed = await exampleBridge.execute("cocospecs.next", {
    feature: "phase-two-login",
    brief: "Members sign in and continue to the dashboard.",
    mode: "standard",
    limit: 2,
  });
  assert.equal(proposed.ok, true);
  const proposedData = proposed.data as {
    source: string;
    mutationRequired: boolean;
    canonicalFile: string;
    questions: readonly { id: string }[];
  };
  assert.equal(proposedData.source, "proposed");
  assert.equal(proposedData.mutationRequired, true);
  assert.equal(proposedData.canonicalFile, "specs/phase-two-login/spec.json");
  assert.equal(proposedData.questions.length, 2);
  assert.equal(await exists(path.join(exampleRoot, proposedData.canonicalFile)), false);
  assert.deepEqual(await fileState(exampleRoot), before);

  const repositoryBridge = await createAgentBridge({ workspaceRoot: path.resolve("."), inspectProject: inspectProjectReadOnly });
  const resumed = await repositoryBridge.execute("cocospecs.next", { feature: "agent-bridge", limit: 4 });
  assert.equal(resumed.ok, true);
  const resumedData = resumed.data as { source: string; state: string; mutationRequired: boolean; questions: readonly unknown[] };
  assert.equal(resumedData.source, "canonical");
  assert.equal(resumedData.state, "approved");
  assert.equal(resumedData.mutationRequired, false);
  assert.deepEqual(resumedData.questions, []);
});

test("audits existing components before proposing missing CocoRef components", async () => {
  const root = path.resolve("examples/basic");
  const before = await fileState(root);
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });
  const result = await bridge.execute("cocoref.audit", {
    name: "adaptive-dashboard",
    requirements: [
      { id: "primary-button", description: "A primary action button", query: "Button" },
      { id: "adaptive-timeline", description: "A timeline visualization", query: "NonexistentAdaptiveTimeline" },
    ],
  });
  assert.equal(result.ok, true);
  const data = result.data as {
    auditedExistingComponents: boolean;
    requirements: readonly { id: string; decision: string; matches: readonly { name: string }[]; consentRequired?: boolean }[];
    missingComponents: readonly { id: string }[];
  };
  assert.equal(data.auditedExistingComponents, true);
  assert.equal(data.requirements[0]?.decision, "reuse");
  assert.ok(data.requirements[0]?.matches.some(({ name }) => name === "Button"));
  assert.equal(data.requirements[1]?.decision, "missing");
  assert.equal(data.requirements[1]?.consentRequired, true);
  assert.deepEqual(data.missingComponents.map(({ id }) => id), ["adaptive-timeline"]);
  assert.deepEqual(await fileState(root), before);
});

test("keeps CocoQA acceptance, evidence, defects, gates, and approval state traceable and redacted", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));

  let spec = createCocoSpec({ feature: "reporting", brief: "Members review a generated report.", mode: "standard", now: "2026-08-24T00:00:00.000Z" });
  for (let iteration = 0; iteration < 100; iteration++) {
    const [question] = nextQuestions(spec, 1);
    if (!question) break;
    spec = answerCocoSpec(spec, question.id, answerFor(question), { now: "2026-08-24T00:00:00.000Z" });
  }
  spec = approveCocoSpec(spec, "2026-08-24T00:00:00.000Z");
  await mkdir(path.join(root, "specs", "reporting"), { recursive: true });
  await writeFile(path.join(root, "specs", "reporting", "spec.json"), JSON.stringify(spec, null, 2));

  const acceptance = spec.answers["acceptance-criteria"]?.value as readonly string[];
  let qa = createCocoQa({
    feature: "reporting",
    acceptanceCriteria: acceptance,
    gates: [{ id: "test", script: "test", required: true }],
    sources: [{ kind: "cocospec", id: "reporting", file: "specs/reporting/spec.json", state: "approved" }],
    now: "2026-08-24T00:00:00.000Z",
  });
  for (let iteration = 0; iteration < 20; iteration++) {
    const [question] = nextCocoQaQuestions(qa, 1);
    if (!question) break;
    qa = answerCocoQa(qa, question.id, `Reviewed ${question.id}.`, { now: "2026-08-24T00:00:00.000Z" });
  }
  qa = recordCocoQaCase(qa, "acceptance-1", "passed", "Authorization: Bearer super-secret-token", "2026-08-24T00:00:00.000Z");
  await mkdir(path.join(root, "qa", "reporting"), { recursive: true });
  await writeFile(path.join(root, "qa", "reporting", "qa.json"), JSON.stringify(qa, null, 2));

  const before = await fileState(root);
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });
  const result = await bridge.execute("cocoqa.trace", { feature: "reporting", limit: 2 });
  assert.equal(result.ok, true);
  const data = result.data as {
    source: string;
    acceptanceCriteria: readonly string[];
    questions: readonly unknown[];
    cases: readonly unknown[];
    gates: readonly unknown[];
    defects: readonly unknown[];
    approved: boolean;
  };
  assert.equal(data.source, "canonical");
  assert.equal(data.acceptanceCriteria.length, 1);
  assert.equal(data.questions.length, 0);
  assert.ok(data.cases.length >= 4);
  assert.equal(data.gates.length, 1);
  assert.deepEqual(data.defects, []);
  assert.equal(data.approved, false);
  assert.doesNotMatch(JSON.stringify(result), /super-secret-token/);
  assert.match(JSON.stringify(result), /REDACTED/);
  assert.deepEqual(await fileState(root), before);
});

test("returns stable canonical-state diagnostics without modifying invalid lifecycle files", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "specs", "broken"), { recursive: true });
  const file = path.join(root, "specs", "broken", "spec.json");
  await writeFile(file, "{ invalid json");
  const before = await readFile(file, "utf8");

  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });
  const invalid = await bridge.execute("cocospecs.next", { feature: "broken" });
  assert.equal((invalid.diagnostic as { code: string }).code, "INVALID_CANONICAL_STATE");
  const missingQa = await bridge.execute("cocoqa.trace", { feature: "missing" });
  assert.equal((missingQa.diagnostic as { code: string }).code, "INVALID_CANONICAL_STATE");
  assert.equal(await readFile(file, "utf8"), before);
});

function answerFor(question: CocoSpecQuestion): CocoSpecValue {
  if (question.id === "acceptance-criteria") return ["Given a generated report, when a member opens it, then its content is readable."];
  if (question.id === "happy-path") return ["Open report", "Review content"];
  if (question.id === "persistence") return "none";
  if (question.type === "choice") return question.options?.[0] ?? "none";
  if (question.type === "list") return [`Reviewed ${question.id}`];
  if (question.type === "structured") return { decision: `Reviewed ${question.id}` };
  return `Reviewed ${question.id}`;
}

async function fixtureWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "cocoframe-agent-lifecycle-"));
  await mkdir(path.join(root, "app"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({
    name: "agent-lifecycle-fixture",
    version: "1.0.0",
    scripts: { test: "node --test" },
    dependencies: { "@cocoframe/core": "0.0.4" },
  }));
  return root;
}

async function exists(file: string): Promise<boolean> {
  try { await stat(file); return true; } catch { return false; }
}

async function fileState(root: string): Promise<readonly string[]> {
  const state: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const directory = queue.shift()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(file);
      else {
        const info = await stat(file);
        state.push(`${path.relative(root, file).replaceAll("\\", "/")}:${info.size}:${info.mtimeMs}`);
      }
    }
  }
  return state.sort();
}
