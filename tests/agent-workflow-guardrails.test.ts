import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import {
  answerCocoSpec,
  approveCocoSpec,
  createCocoSpec,
  nextQuestions,
  type CocoSpecQuestion,
  type CocoSpecValue,
} from "@cocoframe/specs";
import { createAgentBridge, type AgentOperationPlan, type AgentWorkflowRequest } from "../packages/agent/src/index.ts";
import { inspectProjectReadOnly, inspectProposedRoutesReadOnly } from "../packages/cli/src/inspect-readonly.ts";
import { buildProject } from "../packages/cli/src/project.ts";

const timestamp = "2026-08-24T00:00:00.000Z";

test("keeps protocol v1 read-only and refuses mutations without workflow prerequisites", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly, inspectProposedRoutes: inspectProposedRoutesReadOnly });

  const legacyRead = await bridge.execute("project.inspect", { protocolVersion: 1, limit: 10 });
  assert.equal(legacyRead.ok, true);

  const noWorkflow = await bridge.execute("mutation.plan", {
    action: "files.write",
    changes: [{ path: "app/value.ts", content: "export const value = true;\n" }],
  });
  assert.equal(diagnostic(noWorkflow), "WORKFLOW_CONTEXT_REQUIRED");
  assert.equal(await exists(path.join(root, "app", "value.ts")), false);

  const legacyMutation = await bridge.execute("mutation.plan", {
    protocolVersion: 1,
    action: "files.write",
    workflow: { version: 1, intent: "mechanical", visual: false },
    changes: [{ path: "app/value.ts", content: "export const value = true;\n" }],
  });
  assert.equal(diagnostic(legacyMutation), "UNSUPPORTED_PROTOCOL_VERSION");

  const visualBypass = await bridge.execute("mutation.plan", {
    protocolVersion: 2,
    action: "files.write",
    workflow: { version: 1, intent: "mechanical", visual: false },
    changes: [{ path: "app/routes/index.page.tsx", content: "export default { view: () => <main /> };\n" }],
  });
  assert.equal(diagnostic(visualBypass), "WORKFLOW_CONTEXT_REQUIRED");
});

test("requires approved CocoSpecs and an explicit visual-reference decision", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly, inspectProposedRoutes: inspectProposedRoutesReadOnly });
  const changes = [{ path: "app/routes/index.page.tsx", content: "export default { view: () => <main /> };\n" }];

  const missingSpec = await bridge.execute("mutation.plan", {
    action: "files.write",
    workflow: { version: 1, intent: "user-facing", feature: "navigation", visual: true },
    changes,
  });
  assert.equal(diagnostic(missingSpec), "SPECIFICATION_REQUIRED");

  await writeApprovedSpec(root, "navigation");
  const missingDecision = await bridge.execute("mutation.plan", {
    action: "files.write",
    workflow: { version: 1, intent: "user-facing", feature: "navigation", visual: true },
    changes,
  });
  assert.equal(diagnostic(missingDecision), "REFERENCE_DECISION_REQUIRED");

  const missingRef = await bridge.execute("mutation.plan", {
    action: "files.write",
    workflow: { version: 1, intent: "user-facing", feature: "navigation", visual: true, referenceDecision: "reference" },
    changes,
  });
  assert.equal(diagnostic(missingRef), "COCOREF_REQUIRED");
});

test("verifies planned destinations, binds approval to lifecycle hashes, and requires post-write QA", async (context) => {
  const root = await fixtureWorkspace(true);
  context.after(async () => rm(root, { recursive: true, force: true }));
  await writeApprovedSpec(root, "navigation");
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly, inspectProposedRoutes: inspectProposedRoutesReadOnly });
  const indexSource = 'export default { meta: { title: "Home", description: "Navigation entry." }, view: () => ({ kind: "element", tag: "a", props: { href: "/dashboard", children: "Open dashboard" } }) };\n';
  const dashboardSource = 'export default { meta: { title: "Dashboard", description: "Verified destination." }, view: () => ({ kind: "element", tag: "main", props: { id: "dashboard", children: "Dashboard" } }) };\n';
  const baseWorkflow: AgentWorkflowRequest = {
    version: 1,
    intent: "user-facing",
    feature: "navigation",
    visual: true,
    referenceDecision: "no-reference",
    targets: [{
      source: "app/routes/index.page.tsx",
      target: "/dashboard",
      accessibleName: "Open dashboard",
      keyboard: true,
      visibleFocus: true,
      actionMatchesLabel: true,
    }],
  };

  const missingDestination = await bridge.execute("mutation.plan", {
    action: "files.write",
    workflow: baseWorkflow,
    changes: [{ path: "app/routes/index.page.tsx", content: indexSource }],
  });
  assert.equal(diagnostic(missingDestination), "LINK_TARGET_MISSING");

  const planned = await bridge.execute("mutation.plan", {
    protocolVersion: 2,
    action: "files.write",
    workflow: baseWorkflow,
    changes: [
      { path: "app/routes/index.page.tsx", content: indexSource },
      { path: "app/routes/dashboard.page.tsx", content: dashboardSource },
    ],
  });
  assert.equal(planned.ok, true);
  const data = planned.data as { operation: AgentOperationPlan; verifiedTargets: readonly { target: string; evidence: string }[] };
  assert.deepEqual(data.verifiedTargets, [{ source: "app/routes/index.page.tsx", target: "/dashboard", kind: "internal-route", evidence: "planned" }]);
  assert.equal(data.operation.workflow.visualQaRequired, true);
  assert.ok(data.operation.workflow.requiredVisualPrinciples.includes("alignment"));
  assert.equal(data.operation.workflow.verifiedTargetCount, 1);
  assert.equal(await exists(path.join(root, "app", "routes", "dashboard.page.tsx")), false);

  const persisted = await readFile(path.join(root, ".cocoframe", "agent", "operations", data.operation.id, "plan.json"), "utf8");
  assert.doesNotMatch(persisted, /Open dashboard|href=|\/dashboard\"/);

  await bridge.decideOperation(data.operation.id, { decision: "approve", role: "application-developer" });
  const executed = await bridge.execute("mutation.execute", { protocolVersion: 2, operationId: data.operation.id });
  assert.equal(executed.ok, true);
  const execution = executed.data as { workflow: { qualityState: string; nextAction: string } };
  assert.equal(execution.workflow.qualityState, "required");
  assert.match(execution.workflow.nextAction, /CocoQA/);
  assert.equal(await exists(path.join(root, "app", "routes", "dashboard.page.tsx")), true);

  const bundle = await buildProject(root, false);
  const app = (await import(pathToFileURL(bundle).href + "?target=" + Date.now())).default;
  const response = await app.fetch(new Request("http://localhost/dashboard"));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Dashboard/);
  assert.doesNotMatch(html, /404|Not Found/i);
});

test("blocks inert and unverified external targets with stable diagnostics", async (context) => {
  const root = await fixtureWorkspace(true);
  context.after(async () => rm(root, { recursive: true, force: true }));
  await writeApprovedSpec(root, "navigation");
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly, inspectProposedRoutes: inspectProposedRoutesReadOnly });

  const common = {
    version: 1 as const,
    intent: "user-facing" as const,
    feature: "navigation",
    visual: true,
    referenceDecision: "no-reference" as const,
  };
  const inert = await bridge.execute("mutation.plan", {
    action: "files.write",
    workflow: { ...common, targets: [{ source: "app/routes/index.page.tsx", target: "#", accessibleName: "Continue", keyboard: true, visibleFocus: true, actionMatchesLabel: true }] },
    changes: [{ path: "app/routes/index.page.tsx", content: 'export default { view: () => <a href="#">Continue</a> };\n' }],
  });
  assert.equal(diagnostic(inert), "INERT_INTERACTION");

  const external = await bridge.execute("mutation.plan", {
    action: "files.write",
    workflow: { ...common, targets: [{ source: "app/routes/index.page.tsx", target: "https://example.com", accessibleName: "Example", keyboard: true, visibleFocus: true, actionMatchesLabel: true }] },
    changes: [{ path: "app/routes/index.page.tsx", content: 'export default { view: () => <a href="https://example.com">Example</a> };\n' }],
  });
  assert.equal(diagnostic(external), "TARGET_NOT_REACHABLE");
});

test("invalidates approval when canonical lifecycle state changes after review", async (context) => {
  const root = await fixtureWorkspace(true);
  context.after(async () => rm(root, { recursive: true, force: true }));
  await writeApprovedSpec(root, "navigation");
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly, inspectProposedRoutes: inspectProposedRoutesReadOnly });
  const planned = await bridge.execute("mutation.plan", {
    action: "files.write",
    workflow: {
      version: 1,
      intent: "user-facing",
      feature: "navigation",
      visual: true,
      referenceDecision: "no-reference",
      targets: [],
    },
    changes: [{ path: "app/routes/index.page.tsx", content: "export default { view: () => <main>Home</main> };\n" }],
  });
  assert.equal(planned.ok, true);
  const plan = (planned.data as { operation: AgentOperationPlan }).operation;
  await bridge.decideOperation(plan.id, { decision: "approve", role: "application-developer" });

  const specFile = path.join(root, "specs", "navigation", "spec.json");
  const spec = JSON.parse(await readFile(specFile, "utf8")) as { updatedAt: string };
  spec.updatedAt = "2026-08-24T00:01:00.000Z";
  await writeFile(specFile, JSON.stringify(spec, null, 2));

  const executed = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal(diagnostic(executed), "STATE_CONFLICT");
  assert.equal(await exists(path.join(root, "app", "routes", "index.page.tsx")), false);
});
async function fixtureWorkspace(withDesignProfile = false): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "cocoframe-agent-workflow-"));
  await mkdir(path.join(root, "app", "routes"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({
    name: "agent-workflow-fixture",
    version: "1.0.0",
    dependencies: { "@cocoframe/core": "0.0.4" },
  }));
  if (withDesignProfile) {
    await writeFile(path.join(root, "cocoframe.design.json"), await readFile(path.resolve("examples/basic/cocoframe.design.json")));
  }
  return root;
}

async function writeApprovedSpec(root: string, feature: string): Promise<void> {
  let spec = createCocoSpec({ feature, brief: "Create connected application navigation.", mode: "quick", now: timestamp });
  for (let iteration = 0; iteration < 50; iteration++) {
    const [question] = nextQuestions(spec, 1);
    if (!question) break;
    spec = answerCocoSpec(spec, question.id, answerFor(question), { now: timestamp });
  }
  spec = approveCocoSpec(spec, timestamp);
  await mkdir(path.join(root, "specs", feature), { recursive: true });
  await writeFile(path.join(root, "specs", feature, "spec.json"), JSON.stringify(spec, null, 2));
}

function answerFor(question: CocoSpecQuestion): CocoSpecValue {
  if (question.id === "acceptance-criteria") return ["Given a navigation target, when it is activated, then the destination is reachable."];
  if (question.id === "happy-path") return ["Open the entry page", "Activate the destination link", "View the destination"];
  if (question.id === "persistence") return "none";
  if (question.type === "choice") return question.options?.[0] ?? "none";
  if (question.type === "list") return [`Reviewed ${question.id}`];
  if (question.type === "structured") return { decision: `Reviewed ${question.id}` };
  return `Reviewed ${question.id}`;
}

function diagnostic(result: Readonly<Record<string, unknown>>): string | undefined {
  return (result.diagnostic as { code?: string } | undefined)?.code;
}

async function exists(file: string): Promise<boolean> {
  try { await stat(file); return true; } catch { return false; }
}
