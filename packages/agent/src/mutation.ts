import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, open, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentDiagnostic } from "./types.ts";
import type { AgentWorkflowBinding, AgentWorkflowRequest } from "./workflow.ts";
import { diagnosticError, sanitizeAgentOutput, throwIfCancelled } from "./workspace.ts";

const AGENT_RECORD_VERSION = 1 as const;
const APPROVAL_MINUTES = 15;
const MAX_TARGETS = 20;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;
const ABSENT_HASH = "absent";
const forbiddenSegments = new Set([".git", ".cocoframe", "node_modules", "dist", "coverage"]);
const sensitiveFilePattern = new RegExp("(?:^|/)(?:\\.env(?:\\.|$)|[^/]*\\.(?:pem|key|p12|pfx)|id_(?:rsa|dsa|ecdsa|ed25519))$", "i");

export type AgentApprovalRole = "application-developer" | "framework-maintainer";
export type AgentApprovalDecisionKind = "approve" | "deny" | "cancel" | "expire";

export interface AgentFileChange {
  readonly path: string;
  readonly content: string;
}

export interface AgentMutationTarget {
  readonly path: string;
  readonly mode: "create" | "update";
  readonly currentHash: string;
  readonly proposedHash: string;
  readonly size: number;
}

export interface AgentOperationPlan {
  readonly version: 1;
  readonly id: string;
  readonly sessionId: string;
  readonly toolId: "mutation.execute";
  readonly action: "files.write";
  readonly permissionLevel: "write";
  readonly requiredRole: AgentApprovalRole;
  readonly workflow: AgentWorkflowBinding;
  readonly declaredTargets: readonly AgentMutationTarget[];
  readonly reviewedHashes: string;
  readonly status: "pending";
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface AgentApprovalDecision {
  readonly version: 1;
  readonly id: string;
  readonly operationId: string;
  readonly sessionId: string;
  readonly role: AgentApprovalRole;
  readonly actorLabel?: string;
  readonly decision: AgentApprovalDecisionKind;
  readonly approvedTargets: readonly string[];
  readonly approvedHashes: string;
  readonly decidedAt: string;
  readonly expiresAt: string;
}

export interface AgentExecutionRecord {
  readonly version: 1;
  readonly id: string;
  readonly operationId: string;
  readonly sessionId: string;
  readonly outcome: "completed" | "cancelled" | "failed" | "rolled-back" | "partial";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly affectedTargets: readonly string[];
  readonly diagnosticCodes: readonly string[];
  readonly workflow: {
    readonly featureId?: string;
    readonly referenceDecision?: AgentWorkflowBinding["referenceDecision"];
    readonly verifiedTargetCount: number;
    readonly visualQaRequired: boolean;
    readonly qualityState: "required" | "not-required";
    readonly nextAction: string;
  };
}

export interface RecordApprovalInput {
  readonly decision: AgentApprovalDecisionKind;
  readonly role: AgentApprovalRole;
  readonly actorLabel?: string;
  readonly approvedTargets?: readonly string[];
}

interface HeldOperation {
  readonly plan: AgentOperationPlan;
  readonly content: ReadonlyMap<string, string>;
  readonly workflowRequest: AgentWorkflowRequest;
}

interface AgentMutationManagerOptions {
  readonly root: string;
  readonly sessionId?: string;
  readonly now?: () => Date;
  readonly approvalMinutes?: number;
  readonly validateWorkflow?: (
    request: AgentWorkflowRequest,
    expected: AgentWorkflowBinding,
    changes: readonly AgentFileChange[],
    signal?: AbortSignal,
  ) => Promise<void>;
}

/** Owns one Agent Bridge session's hash-bound, serialized mutation lifecycle. */
export class AgentMutationManager {
  readonly sessionId: string;
  readonly #root: string;
  readonly #now: () => Date;
  readonly #approvalMinutes: number;
  readonly #validateWorkflow?: AgentMutationManagerOptions["validateWorkflow"];
  readonly #held = new Map<string, HeldOperation>();

  constructor(options: AgentMutationManagerOptions) {
    this.#root = options.root;
    this.sessionId = options.sessionId ?? randomUUID();
    this.#now = options.now ?? (() => new Date());
    this.#approvalMinutes = options.approvalMinutes ?? APPROVAL_MINUTES;
    this.#validateWorkflow = options.validateWorkflow;
  }

  async planFiles(
    changes: readonly AgentFileChange[],
    workflow: AgentWorkflowBinding,
    workflowRequest: AgentWorkflowRequest,
    signal?: AbortSignal,
  ): Promise<AgentOperationPlan> {
    throwIfCancelled(signal);
    if (changes.length < 1 || changes.length > MAX_TARGETS) {
      throw diagnosticError("INVALID_TOOL_INPUT", `A mutation plan requires 1-${MAX_TARGETS} declared file targets.`, "Split the proposal into a smaller explicit operation.");
    }
    const seen = new Set<string>();
    let totalBytes = 0;
    const targets: AgentMutationTarget[] = [];
    const content = new Map<string, string>();
    for (const change of changes) {
      throwIfCancelled(signal);
      const relative = validateRelativeTarget(change.path);
      if (seen.has(relative)) throw diagnosticError("INVALID_TOOL_INPUT", `Duplicate mutation target: ${relative}.`, "Declare every target exactly once.");
      seen.add(relative);
      const bytes = Buffer.byteLength(change.content);
      totalBytes += bytes;
      if (bytes > MAX_FILE_BYTES || totalBytes > MAX_TOTAL_BYTES) {
        throw diagnosticError("INVALID_TOOL_INPUT", "Proposed mutation content exceeds the per-file or 1 MiB operation limit.", "Split the proposal into smaller reviewed operations.");
      }
      if (containsSensitiveMaterial(change.content)) {
        throw diagnosticError("SENSITIVE_OUTPUT_BLOCKED", `Proposed content for ${relative} may contain a literal secret.`, "Replace literal credentials with server-only environment lookups and re-plan.");
      }
      const target = await resolveMutationTarget(this.#root, relative);
      const current = await readCurrent(target);
      targets.push({
        path: relative,
        mode: current === undefined ? "create" : "update",
        currentHash: current === undefined ? ABSENT_HASH : digest(current),
        proposedHash: digest(change.content),
        size: bytes,
      });
      content.set(relative, change.content);
    }
    targets.sort((left, right) => left.path.localeCompare(right.path));
    const now = this.#now();
    const expiresAt = new Date(now.valueOf() + this.#approvalMinutes * 60_000);
    const plan: AgentOperationPlan = {
      version: AGENT_RECORD_VERSION,
      id: randomUUID(),
      sessionId: this.sessionId,
      toolId: "mutation.execute",
      action: "files.write",
      permissionLevel: "write",
      requiredRole: await requiredRole(this.#root),
      workflow,
      declaredTargets: targets,
      reviewedHashes: reviewedHash(targets, workflow),
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    await ensureSession(this.#root, this.sessionId, now);
    await writeRecord(planFile(this.#root, plan.id), plan, true);
    await writeAudit(this.#root, this.sessionId, "operation-planned", {
      operationId: plan.id,
      permissionLevel: plan.permissionLevel,
      targetCount: targets.length,
      reviewedHashes: plan.reviewedHashes,
    }, now);
    this.#held.set(plan.id, { plan, content, workflowRequest });
    return plan;
  }

  async decide(operationId: string, input: RecordApprovalInput): Promise<AgentApprovalDecision> {
    return recordAgentApproval(this.#root, operationId, input, this.#now());
  }

  async execute(operationId: string, signal?: AbortSignal): Promise<AgentExecutionRecord> {
    throwIfCancelled(signal);
    const held = this.#held.get(operationId);
    const plan = held?.plan ?? await readAgentOperationPlan(this.#root, operationId);
    if (plan.sessionId !== this.sessionId || !held) {
      throw diagnosticError("STATE_CONFLICT", "The operation content is not owned by this active Agent Bridge session.", "Rebuild the operation plan in the current client session and request approval again.");
    }
    const now = this.#now();
    if (now.valueOf() >= new Date(plan.expiresAt).valueOf()) {
      throw diagnosticError("APPROVAL_EXPIRED", "The operation plan expired before execution.", "Inspect current targets, rebuild the plan, and request a new approval.");
    }
    const approval = await readApproval(this.#root, operationId);
    if (!approval) {
      throw diagnosticError("APPROVAL_REQUIRED", "This operation would change workspace files and requires explicit human approval.", "Present the exact targets and reviewed hashes through the host approval interface.");
    }
    validateApproval(plan, approval, now);
    if (approval.decision === "expire") {
      throw diagnosticError("APPROVAL_EXPIRED", "The host explicitly expired this approval.", "Inspect current targets, rebuild the plan, and request a new approval.");
    }
    if (approval.decision === "deny" || approval.decision === "cancel") {
      throw diagnosticError("OPERATION_CANCELLED", `The operation was ${approval.decision === "deny" ? "denied" : "cancelled"} by the user.`, "Leave the workspace unchanged or prepare a revised plan.");
    }
    const selected = plan.declaredTargets.filter(({ path: target }) => approval.approvedTargets.includes(target));
    if (selected.length === 0) {
      throw diagnosticError("OPERATION_CANCELLED", "The approval selected no mutation targets.", "Approve at least one declared target or cancel the operation.");
    }
    const operationDirectory = operationDir(this.#root, operationId);
    await mkdir(operationDirectory, { recursive: true });
    let lock;
    try {
      lock = await open(path.join(operationDirectory, "execute.lock"), "wx");
    } catch {
      throw diagnosticError("STATE_CONFLICT", "This operation is already executing or has been claimed.", "Inspect its execution record before preparing another plan.");
    }
    const startedAt = now.toISOString();
    try {
      try {
        await writeRecord(claimFile(this.#root, operationId), { version: 1, operationId, claimedAt: startedAt }, true);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          throw diagnosticError("STATE_CONFLICT", "This single-use operation was already claimed.", "Inspect its execution record and prepare a new plan if more work is required.");
        }
        throw error;
      }
      throwIfCancelled(signal);
      if (this.#validateWorkflow) {
        const changes = plan.declaredTargets.map(({ path: target }) => ({
          path: target,
          content: held.content.get(target) ?? "",
        }));
        await this.#validateWorkflow(held.workflowRequest, plan.workflow, changes, signal);
      }
      for (const target of selected) {
        const absolute = await resolveMutationTarget(this.#root, target.path);
        const current = await readCurrent(absolute);
        const currentHash = current === undefined ? ABSENT_HASH : digest(current);
        if (currentHash !== target.currentHash) {
          throw diagnosticError("STATE_CONFLICT", `Workspace target changed after review: ${target.path}.`, "Reinspect the target, rebuild the plan, and request approval again.");
        }
        const proposed = held.content.get(target.path);
        if (proposed === undefined || digest(proposed) !== target.proposedHash) {
          throw diagnosticError("STATE_CONFLICT", `Reviewed proposal content is unavailable or changed for ${target.path}.`, "Rebuild the operation plan in the current session.");
        }
      }
      const previous = new Map<string, Uint8Array | undefined>();
      const affected: string[] = [];
      try {
        for (const target of selected) {
          throwIfCancelled(signal);
          const absolute = await resolveMutationTarget(this.#root, target.path);
          previous.set(target.path, await readCurrent(absolute));
          await mkdir(path.dirname(absolute), { recursive: true });
          await writeFile(absolute, held.content.get(target.path)!, "utf8");
          affected.push(target.path);
        }
      } catch (error) {
        const rollbackErrors: string[] = [];
        for (const target of [...affected].reverse()) {
          try {
            const absolute = await resolveMutationTarget(this.#root, target);
            const original = previous.get(target);
            if (original === undefined) await rm(absolute, { force: true });
            else await writeFile(absolute, original);
          } catch {
            rollbackErrors.push(target);
          }
        }
        const code = rollbackErrors.length > 0 ? "PARTIAL_MUTATION" : "MUTATION_FAILED";
        const record = await this.#record(plan, rollbackErrors.length > 0 ? "partial" : "rolled-back", startedAt, affected, [code]);
        this.#held.delete(operationId);
        if (rollbackErrors.length > 0) {
          throw diagnosticError("PARTIAL_MUTATION", "The mutation failed and one or more declared targets could not be rolled back.", "Block further execution and review the execution record and affected targets.");
        }
        if (isAgentError(error)) throw error;
        throw diagnosticError("MUTATION_FAILED", "The approved mutation failed and all changed targets were rolled back.", "Correct the cause, inspect current state, and prepare a new operation plan.");
      }
      const record = await this.#record(plan, "completed", startedAt, affected, []);
      this.#held.delete(operationId);
      return record;
    } finally {
      await lock.close();
      await rm(path.join(operationDirectory, "execute.lock"), { force: true });
    }
  }

  async #record(
    plan: AgentOperationPlan,
    outcome: AgentExecutionRecord["outcome"],
    startedAt: string,
    affectedTargets: readonly string[],
    diagnosticCodes: readonly string[],
  ): Promise<AgentExecutionRecord> {
    const completedAt = this.#now().toISOString();
    const record: AgentExecutionRecord = {
      version: 1,
      id: randomUUID(),
      operationId: plan.id,
      sessionId: plan.sessionId,
      outcome,
      startedAt,
      completedAt,
      affectedTargets,
      diagnosticCodes,
      workflow: {
        ...(plan.workflow.featureId ? { featureId: plan.workflow.featureId } : {}),
        ...(plan.workflow.referenceDecision ? { referenceDecision: plan.workflow.referenceDecision } : {}),
        verifiedTargetCount: plan.workflow.verifiedTargetCount,
        visualQaRequired: plan.workflow.visualQaRequired,
        qualityState: plan.workflow.visualQaRequired || plan.workflow.verifiedTargetCount > 0 ? "required" : "not-required",
        nextAction: plan.workflow.visualQaRequired || plan.workflow.verifiedTargetCount > 0
          ? "Run CocoQA, record runtime target and visual evidence, and obtain explicit QA approval before claiming release readiness."
          : "Report the approved mechanical mutation and verification evidence.",
      },
    };
    await writeRecord(executionFile(this.#root, plan.id), record, true);
    await writeAudit(this.#root, this.sessionId, "operation-executed", {
      operationId: plan.id,
      outcome,
      affectedTargetCount: affectedTargets.length,
      diagnosticCodes,
    }, this.#now());
    return record;
  }
}

/** Records a human or host decision outside the MCP tool surface. */
export async function recordAgentApproval(
  root: string,
  operationId: string,
  input: RecordApprovalInput,
  now = new Date(),
): Promise<AgentApprovalDecision> {
  const plan = await readAgentOperationPlan(root, operationId);
  if (input.role !== "application-developer" && input.role !== "framework-maintainer") {
    throw diagnosticError("INVALID_TOOL_INPUT", "AI agents and unknown roles cannot grant mutation approval.", "Use an application-developer or framework-maintainer host identity.");
  }
  if (input.decision === "approve" && plan.requiredRole === "framework-maintainer" && input.role !== "framework-maintainer") {
    throw diagnosticError("WORKSPACE_ACCESS_DENIED", "This framework workspace operation requires the framework-maintainer role.", "Ask an authorized framework maintainer to review the plan.");
  }
  const selected = input.decision === "approve"
    ? normalizeApprovedTargets(plan, input.approvedTargets)
    : [];
  const decision: AgentApprovalDecision = {
    version: 1,
    id: randomUUID(),
    operationId: plan.id,
    sessionId: plan.sessionId,
    role: input.role,
    ...(input.actorLabel?.trim() ? { actorLabel: String(sanitizeAgentOutput(input.actorLabel.trim())).slice(0, 100) } : {}),
    decision: input.decision,
    approvedTargets: selected,
    approvedHashes: reviewedHash(plan.declaredTargets.filter(({ path: target }) => selected.includes(target)), plan.workflow),
    decidedAt: now.toISOString(),
    expiresAt: plan.expiresAt,
  };
  await writeRecord(approvalFile(root, operationId), decision, true).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw diagnosticError("STATE_CONFLICT", "This operation already has an immutable approval decision.", "Inspect the existing decision or prepare a new plan.");
    }
    throw error;
  });
  await writeAudit(root, plan.sessionId, "approval-decided", {
    operationId: plan.id,
    decision: decision.decision,
    role: decision.role,
    approvedTargetCount: decision.approvedTargets.length,
    approvedHashes: decision.approvedHashes,
  }, now);
  return decision;
}

/** Reads and validates one persisted hash-only operation plan. */
export async function readAgentOperationPlan(root: string, operationId: string): Promise<AgentOperationPlan> {
  validateOperationId(operationId);
  const value = await readJsonRecord(planFile(root, operationId), "operation plan");
  if (!isRecord(value) || value.version !== 1 || value.id !== operationId || value.action !== "files.write" || value.permissionLevel !== "write"
    || value.toolId !== "mutation.execute" || value.status !== "pending" || !Array.isArray(value.declaredTargets)
    || !isWorkflowBinding(value.workflow)
    || typeof value.sessionId !== "string" || typeof value.reviewedHashes !== "string" || typeof value.createdAt !== "string"
    || typeof value.expiresAt !== "string" || (value.requiredRole !== "application-developer" && value.requiredRole !== "framework-maintainer")) {
    throw diagnosticError("INVALID_CANONICAL_STATE", "The Agent Bridge operation plan is invalid or corrupted.", "Preserve the record, inspect it, and prepare a new operation.");
  }
  const targets = value.declaredTargets.map(parseTarget);
  if (reviewedHash(targets, value.workflow) !== value.reviewedHashes) {
    throw diagnosticError("INVALID_CANONICAL_STATE", "The operation plan reviewed hash is inconsistent.", "Preserve the record and prepare a new operation.");
  }
  return { ...value, declaredTargets: targets } as unknown as AgentOperationPlan;
}

async function readApproval(root: string, operationId: string): Promise<AgentApprovalDecision | undefined> {
  try {
    return await readJsonRecord(approvalFile(root, operationId), "approval decision") as AgentApprovalDecision;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function validateApproval(plan: AgentOperationPlan, approval: AgentApprovalDecision, now: Date): void {
  if (approval.operationId !== plan.id || approval.sessionId !== plan.sessionId || approval.expiresAt !== plan.expiresAt) {
    throw diagnosticError("STATE_CONFLICT", "The approval is not bound to this operation plan and session.", "Prepare a new plan and approval.");
  }
  if (now.valueOf() >= new Date(approval.expiresAt).valueOf()) {
    throw diagnosticError("APPROVAL_EXPIRED", "The approval is no longer valid.", "Inspect current targets and request a new approval.");
  }
  const selected = plan.declaredTargets.filter(({ path: target }) => approval.approvedTargets.includes(target));
  if (reviewedHash(selected, plan.workflow) !== approval.approvedHashes) {
    throw diagnosticError("STATE_CONFLICT", "The approval hashes do not match the reviewed target subset.", "Prepare a new plan and approval.");
  }
}

function normalizeApprovedTargets(plan: AgentOperationPlan, selected?: readonly string[]): readonly string[] {
  const targets = selected?.length ? [...new Set(selected.map(validateRelativeTarget))] : plan.declaredTargets.map(({ path: target }) => target);
  const declared = new Set(plan.declaredTargets.map(({ path: target }) => target));
  if (targets.some((target) => !declared.has(target))) {
    throw diagnosticError("INVALID_TOOL_INPUT", "Approval includes an undeclared mutation target.", "Approve only targets listed by the operation plan.");
  }
  return targets.sort();
}

function parseTarget(value: unknown): AgentMutationTarget {
  if (!isRecord(value) || typeof value.path !== "string" || (value.mode !== "create" && value.mode !== "update")
    || typeof value.currentHash !== "string" || typeof value.proposedHash !== "string" || !Number.isSafeInteger(value.size)) {
    throw diagnosticError("INVALID_CANONICAL_STATE", "An operation plan target is invalid.", "Preserve the record and prepare a new operation.");
  }
  return { path: validateRelativeTarget(value.path), mode: value.mode, currentHash: value.currentHash, proposedHash: value.proposedHash, size: value.size as number };
}

function validateRelativeTarget(input: string): string {
  const relative = input.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (!relative || path.posix.isAbsolute(relative) || /^[A-Za-z]:\//.test(relative) || relative.split("/").some((segment) => !segment || segment === ".." || segment === "." || forbiddenSegments.has(segment))) {
    throw diagnosticError("WORKSPACE_ACCESS_DENIED", "Mutation targets must be explicit relative files inside the approved workspace.", "Use a safe workspace-relative file path.");
  }
  if (sensitiveFilePattern.test(relative)) {
    throw diagnosticError("SENSITIVE_OUTPUT_BLOCKED", "Agent Bridge cannot create or modify secret-bearing files.", "Use server-owned secret configuration outside Agent Bridge.");
  }
  return relative;
}

async function resolveMutationTarget(root: string, relative: string): Promise<string> {
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw diagnosticError("WORKSPACE_ACCESS_DENIED", "The mutation target is outside the approved workspace.", "Use a declared target inside the approved project root.");
  }
  let ancestor = path.dirname(target);
  while (ancestor !== root) {
    try {
      const canonical = await realpath(ancestor);
      if (canonical !== root && !canonical.startsWith(`${root}${path.sep}`)) {
        throw diagnosticError("WORKSPACE_ACCESS_DENIED", "A mutation target parent resolves outside the approved workspace.", "Remove the linked path and re-plan.");
      }
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      ancestor = path.dirname(ancestor);
    }
  }
  try {
    const canonical = await realpath(target);
    if (!canonical.startsWith(`${root}${path.sep}`)) {
      throw diagnosticError("WORKSPACE_ACCESS_DENIED", "A mutation target resolves outside the approved workspace.", "Remove the linked path and re-plan.");
    }
    const info = await stat(canonical);
    if (!info.isFile()) throw diagnosticError("WORKSPACE_ACCESS_DENIED", "Mutation targets must be regular files.", "Choose a regular file target.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return target;
}

async function readCurrent(file: string): Promise<Uint8Array | undefined> {
  try {
    const info = await stat(file);
    if (info.size > MAX_TOTAL_BYTES) throw diagnosticError("CAPABILITY_UNAVAILABLE", "An existing mutation target exceeds the 1 MiB rollback limit.", "Use a smaller explicit target or mutate it outside Agent Bridge.");
    return await readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function containsSensitiveMaterial(content: string): boolean {
  return /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}/i.test(content)
    || /\b(?:api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*["'][^"'\n]{8,}["']/i.test(content);
}

async function requiredRole(root: string): Promise<AgentApprovalRole> {
  try {
    const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as { name?: string };
    return manifest.name === "cocoframe" ? "framework-maintainer" : "application-developer";
  } catch {
    return "application-developer";
  }
}

async function ensureSession(root: string, sessionId: string, now: Date): Promise<void> {
  const file = path.join(recordsRoot(root), "sessions", `${sessionId}.json`);
  try {
    await access(file);
  } catch {
    await writeRecord(file, {
      version: 1,
      id: sessionId,
      protocolVersion: 2,
      workspaceIdentity: digest(root),
      permissions: ["read", "write"],
      createdAt: now.toISOString(),
    }, true);
  }
}

async function writeAudit(root: string, sessionId: string, eventType: string, metadata: unknown, now: Date): Promise<void> {
  const file = path.join(recordsRoot(root), "audit", `${now.valueOf()}-${randomUUID()}.json`);
  await writeRecord(file, {
    version: 1,
    id: randomUUID(),
    sessionId,
    requestId: randomUUID(),
    eventType,
    metadata: sanitizeAgentOutput(metadata),
    createdAt: now.toISOString(),
  }, true);
}

async function writeRecord(file: string, value: unknown, exclusive = false): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const data = `${JSON.stringify(sanitizeAgentOutput(value), null, 2)}\n`;
  if (exclusive) {
    await writeFile(file, data, { encoding: "utf8", flag: "wx" });
    return;
  }
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, data, "utf8");
  await rename(temporary, file);
}

async function readJsonRecord(file: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw error;
    throw diagnosticError("INVALID_CANONICAL_STATE", `The persisted Agent Bridge ${label} is invalid.`, "Preserve the record and prepare a new operation.");
  }
}

function reviewedHash(targets: readonly AgentMutationTarget[], workflow: AgentWorkflowBinding): string {
  return digest(JSON.stringify({
    targets: targets.map(({ path: target, currentHash, proposedHash }) => ({ path: target, currentHash, proposedHash })).sort((a, b) => a.path.localeCompare(b.path)),
    workflow,
  }));
}

function isWorkflowBinding(value: unknown): value is AgentWorkflowBinding {
  if (!isRecord(value) || value.version !== 1 || (value.intent !== "mechanical" && value.intent !== "user-facing")
    || typeof value.inspectionHash !== "string" || typeof value.componentInventoryHash !== "string"
    || typeof value.targetVerificationHash !== "string" || !Number.isSafeInteger(value.verifiedTargetCount)
    || !Number.isSafeInteger(value.externalTargetCount) || typeof value.visualQaRequired !== "boolean"
    || !Array.isArray(value.requiredVisualPrinciples) || value.requiredVisualPrinciples.some((item) => typeof item !== "string")) return false;
  if (value.intent === "user-facing" && (typeof value.featureId !== "string" || typeof value.specificationHash !== "string")) return false;
  return true;
}

function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function recordsRoot(root: string): string { return path.join(root, ".cocoframe", "agent"); }
function operationDir(root: string, id: string): string { validateOperationId(id); return path.join(recordsRoot(root), "operations", id); }
function planFile(root: string, id: string): string { return path.join(operationDir(root, id), "plan.json"); }
function approvalFile(root: string, id: string): string { return path.join(operationDir(root, id), "approval.json"); }
function claimFile(root: string, id: string): string { return path.join(operationDir(root, id), "claim.json"); }
function executionFile(root: string, id: string): string { return path.join(operationDir(root, id), "execution.json"); }

function validateOperationId(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) {
    throw diagnosticError("INVALID_TOOL_INPUT", "Operation ID is invalid.", "Use the exact operation ID returned by mutation.plan.");
  }
}

function isAgentError(value: unknown): value is Error & { agentDiagnostic: AgentDiagnostic } {
  return typeof value === "object" && value !== null && "agentDiagnostic" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
