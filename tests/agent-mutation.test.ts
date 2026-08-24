import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createAgentBridge, type AgentOperationPlan } from "../packages/agent/src/index.ts";
import { runAgentCommand } from "../packages/cli/src/agent-command.ts";
import { inspectProjectReadOnly } from "../packages/cli/src/inspect-readonly.ts";

test("executes only a human-approved target subset and keeps records hash-only", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });
  const before = await sourceState(root);

  const planned = await bridge.execute("mutation.plan", {
    action: "files.write",
    changes: [
      { path: "app/approved.ts", content: "export const approved = true;\n" },
      { path: "app/not-approved.ts", content: "export const untouched = true;\n" },
    ],
  });
  assert.equal(planned.ok, true);
  assert.equal(planned.permission, "write");
  const plan = (planned.data as { operation: AgentOperationPlan }).operation;
  assert.equal(plan.declaredTargets.length, 2);
  assert.equal(plan.requiredRole, "application-developer");
  assert.deepEqual(await sourceState(root), before);

  const unapproved = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal((unapproved.diagnostic as { code: string }).code, "APPROVAL_REQUIRED");
  assert.deepEqual(await sourceState(root), before);

  const output: string[] = [];
  assert.equal(await runAgentCommand([
    "approve", plan.id,
    "--project", root,
    "--role", "application-developer",
    "--actor", "workspace owner",
    "--targets", "app/approved.ts",
    "--json",
  ], root, { log: (message) => output.push(message), error: () => undefined }), 0);
  assert.equal(JSON.parse(output[0]!).decision, "approve");

  const executed = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal(executed.ok, true);
  const execution = executed.data as { outcome: string; affectedTargets: readonly string[] };
  assert.equal(execution.outcome, "completed");
  assert.deepEqual(execution.affectedTargets, ["app/approved.ts"]);
  assert.equal(await readFile(path.join(root, "app", "approved.ts"), "utf8"), "export const approved = true;\n");
  assert.equal(await exists(path.join(root, "app", "not-approved.ts")), false);

  const records = await recordText(root);
  assert.doesNotMatch(records, /export const approved/);
  assert.doesNotMatch(records, /export const untouched/);
  assert.match(records, /approved\.ts/);

  const repeated = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal((repeated.diagnostic as { code: string }).code, "STATE_CONFLICT");
});

test("denied, cancelled, expired, and duplicate approvals never mutate targets", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));
  let clock = new Date("2026-08-24T00:00:00.000Z");
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly, now: () => clock });

  const denied = await planOne(bridge, "app/denied.ts", "denied");
  await bridge.decideOperation(denied.id, { decision: "deny", role: "application-developer" });
  const deniedResult = await bridge.execute("mutation.execute", { operationId: denied.id });
  assert.equal((deniedResult.diagnostic as { code: string }).code, "OPERATION_CANCELLED");
  assert.equal(await exists(path.join(root, "app", "denied.ts")), false);
  await assert.rejects(
    () => bridge.decideOperation(denied.id, { decision: "approve", role: "application-developer" }),
    (error) => diagnosticCode(error) === "STATE_CONFLICT",
  );

  const cancelled = await planOne(bridge, "app/cancelled.ts", "cancelled");
  await bridge.decideOperation(cancelled.id, { decision: "cancel", role: "application-developer" });
  const cancelledResult = await bridge.execute("mutation.execute", { operationId: cancelled.id });
  assert.equal((cancelledResult.diagnostic as { code: string }).code, "OPERATION_CANCELLED");
  assert.equal(await exists(path.join(root, "app", "cancelled.ts")), false);

  const expired = await planOne(bridge, "app/expired.ts", "expired");
  await bridge.decideOperation(expired.id, { decision: "approve", role: "application-developer" });
  clock = new Date("2026-08-24T00:16:00.000Z");
  const expiredResult = await bridge.execute("mutation.execute", { operationId: expired.id });
  assert.equal((expiredResult.diagnostic as { code: string }).code, "APPROVAL_EXPIRED");
  assert.equal(await exists(path.join(root, "app", "expired.ts")), false);
});

test("detects reviewed-state conflicts and consumes the single-use operation safely", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));
  const file = path.join(root, "app", "existing.ts");
  await writeFile(file, "export const value = 1;\n");
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });
  const plan = await planOne(bridge, "app/existing.ts", "export const value = 2;\n");
  await bridge.decideOperation(plan.id, { decision: "approve", role: "application-developer" });
  await writeFile(file, "export const value = 3;\n");

  const result = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal((result.diagnostic as { code: string }).code, "STATE_CONFLICT");
  assert.equal(await readFile(file, "utf8"), "export const value = 3;\n");
  const repeated = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal((repeated.diagnostic as { code: string }).code, "STATE_CONFLICT");
});

test("enforces the approved role matrix for framework workspaces", async (context) => {
  const root = await fixtureWorkspace("cocoframe");
  context.after(async () => rm(root, { recursive: true, force: true }));
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });
  const plan = await planOne(bridge, "packages/example.ts", "export const framework = true;\n");
  assert.equal(plan.requiredRole, "framework-maintainer");
  await assert.rejects(
    () => bridge.decideOperation(plan.id, { decision: "approve", role: "application-developer" }),
    (error) => diagnosticCode(error) === "WORKSPACE_ACCESS_DENIED",
  );
  await bridge.decideOperation(plan.id, { decision: "approve", role: "framework-maintainer" });
  const result = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal(result.ok, true);
});

test("blocks traversal, linked parents, secret files, literal secrets, and undeclared targets", async (context) => {
  const root = await fixtureWorkspace();
  const outside = await mkdtemp(path.join(os.tmpdir(), "cocoframe-agent-mutation-outside-"));
  context.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });

  for (const [target, content, code] of [
    ["../outside.ts", "safe", "WORKSPACE_ACCESS_DENIED"],
    [".env", "VALUE=safe", "SENSITIVE_OUTPUT_BLOCKED"],
    ["app/secret.ts", "const token = \"super-secret-token\";", "SENSITIVE_OUTPUT_BLOCKED"],
  ] as const) {
    const result = await bridge.execute("mutation.plan", { action: "files.write", changes: [{ path: target, content }] });
    assert.equal((result.diagnostic as { code: string }).code, code);
  }

  await symlink(outside, path.join(root, "app", "linked"), process.platform === "win32" ? "junction" : "dir");
  const linked = await bridge.execute("mutation.plan", {
    action: "files.write",
    changes: [{ path: "app/linked/escape.ts", content: "safe" }],
  });
  assert.equal((linked.diagnostic as { code: string }).code, "WORKSPACE_ACCESS_DENIED");

  const plan = await planOne(bridge, "app/declared.ts", "safe");
  await assert.rejects(
    () => bridge.decideOperation(plan.id, {
      decision: "approve",
      role: "application-developer",
      approvedTargets: ["app/undeclared.ts"],
    }),
    (error) => diagnosticCode(error) === "INVALID_TOOL_INPUT",
  );
});

test("rolls back every changed target when an approved multi-file mutation fails", async (context) => {
  const root = await fixtureWorkspace();
  context.after(async () => rm(root, { recursive: true, force: true }));
  const bridge = await createAgentBridge({ workspaceRoot: root, inspectProject: inspectProjectReadOnly });
  const planned = await bridge.execute("mutation.plan", {
    action: "files.write",
    changes: [
      { path: "app/first.ts", content: "first\n" },
      { path: "app/blocked/second.ts", content: "second\n" },
    ],
  });
  const plan = (planned.data as { operation: AgentOperationPlan }).operation;
  await bridge.decideOperation(plan.id, { decision: "approve", role: "application-developer" });
  await writeFile(path.join(root, "app", "blocked"), "parent is a file");

  const result = await bridge.execute("mutation.execute", { operationId: plan.id });
  assert.equal((result.diagnostic as { code: string }).code, "MUTATION_FAILED");
  assert.equal(await exists(path.join(root, "app", "first.ts")), false);
  assert.equal(await readFile(path.join(root, "app", "blocked"), "utf8"), "parent is a file");
  const execution = JSON.parse(await readFile(path.join(root, ".cocoframe", "agent", "operations", plan.id, "execution.json"), "utf8"));
  assert.equal(execution.outcome, "rolled-back");
});

async function planOne(
  bridge: Awaited<ReturnType<typeof createAgentBridge>>,
  target: string,
  content: string,
): Promise<AgentOperationPlan> {
  const result = await bridge.execute("mutation.plan", { action: "files.write", changes: [{ path: target, content }] });
  assert.equal(result.ok, true);
  return (result.data as { operation: AgentOperationPlan }).operation;
}

async function fixtureWorkspace(name = "agent-mutation-fixture"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "cocoframe-agent-mutation-"));
  await mkdir(path.join(root, "app"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({
    name,
    version: "1.0.0",
    dependencies: { "@cocoframe/core": "0.0.4" },
  }));
  return root;
}

async function sourceState(root: string): Promise<readonly string[]> {
  const state: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const directory = queue.shift()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === ".cocoframe" || entry.name === "node_modules") continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(file);
      else {
        const info = await stat(file);
        state.push(path.relative(root, file).replaceAll("\\", "/") + ":" + info.size + ":" + info.mtimeMs);
      }
    }
  }
  return state.sort();
}

async function recordText(root: string): Promise<string> {
  const chunks: string[] = [];
  const directory = path.join(root, ".cocoframe", "agent");
  const queue = [directory];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(file);
      else if (entry.name.endsWith(".json")) chunks.push(await readFile(file, "utf8"));
    }
  }
  return chunks.join("\n");
}

function diagnosticCode(error: unknown): string | undefined {
  return (error as { agentDiagnostic?: { code?: string } })?.agentDiagnostic?.code;
}

async function exists(file: string): Promise<boolean> {
  try { await stat(file); return true; } catch { return false; }
}
