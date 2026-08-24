import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCocoRef } from "@cocoframe/cocoref";
import { parseDesignProfile } from "@cocoframe/qa";
import { parseCocoSpec, slugifyFeature } from "@cocoframe/specs";
import type { AgentFileChange } from "./mutation.ts";
import type { AgentProjectSnapshot } from "./types.ts";
import { diagnosticError, throwIfCancelled } from "./workspace.ts";

export type AgentWorkflowIntent = "mechanical" | "user-facing";
export type AgentReferenceDecision = "reference" | "no-reference" | "not-applicable";

export interface AgentTargetRequirement {
  readonly source: string;
  readonly target: string;
  readonly accessibleName: string;
  readonly keyboard: true;
  readonly visibleFocus: true;
  readonly actionMatchesLabel: true;
  readonly externalEvidence?: {
    readonly provider: string;
    readonly status: "verified";
    readonly summary: string;
  };
}

/** Client-declared workflow context. Canonical state is always re-read by Agent Bridge. */
export interface AgentWorkflowRequest {
  readonly version: 1;
  readonly intent: AgentWorkflowIntent;
  readonly feature?: string;
  readonly visual: boolean;
  readonly referenceDecision?: AgentReferenceDecision;
  readonly cocoRef?: string;
  readonly targets?: readonly AgentTargetRequirement[];
}

/** Hash-only workflow evidence persisted with an operation plan. */
export interface AgentWorkflowBinding {
  readonly version: 1;
  readonly intent: AgentWorkflowIntent;
  readonly featureId?: string;
  readonly inspectionHash: string;
  readonly specificationHash?: string;
  readonly referenceDecision?: AgentReferenceDecision;
  readonly cocoRefHash?: string;
  readonly componentInventoryHash: string;
  readonly designProfileHash?: string;
  readonly targetVerificationHash: string;
  readonly verifiedTargetCount: number;
  readonly externalTargetCount: number;
  readonly visualQaRequired: boolean;
  readonly requiredVisualPrinciples: readonly string[];
}

export interface AgentTargetVerification {
  readonly source: string;
  readonly target: string;
  readonly kind: "internal-route" | "internal-anchor" | "api" | "external";
  readonly evidence: "inspected" | "planned" | "document" | "provider";
}

export interface AgentWorkflowValidation {
  readonly binding: AgentWorkflowBinding;
  readonly targets: readonly AgentTargetVerification[];
}

const visualPrinciples = [
  "alignment", "spacing", "contrast", "overflow", "responsive", "accessibility",
] as const;
const routeFilePattern = /\.(page|route)\.tsx?$/;

/** Validates lifecycle, reuse, target, and visual prerequisites without modifying the workspace. */
export async function validateAgentWorkflow(
  root: string,
  snapshot: AgentProjectSnapshot,
  changes: readonly AgentFileChange[],
  request: AgentWorkflowRequest | undefined,
  proposedRoutes: readonly AgentProjectSnapshot["routes"][number][] = [],
  signal?: AbortSignal,
): Promise<AgentWorkflowValidation> {
  throwIfCancelled(signal);
  if (!request) {
    throw diagnosticError("WORKFLOW_CONTEXT_REQUIRED", "A mutation requires a versioned Agent Bridge workflow binding.", "Inspect the project, complete the applicable lifecycle, and retry with the workflow field.");
  }
  if (request.version !== 1 || (request.intent !== "mechanical" && request.intent !== "user-facing")) {
    throw diagnosticError("WORKFLOW_CONTEXT_REQUIRED", "The supplied workflow binding is unsupported or invalid.", "Use workflow version 1 and a supported intent.");
  }
  const hasVisualImpact = changes.some(({ path: file }) => isVisualTarget(file));
  if (request.intent === "mechanical" && (request.visual || hasVisualImpact)) {
    throw diagnosticError("WORKFLOW_CONTEXT_REQUIRED", "Visual or user-facing targets cannot use the mechanical workflow.", "Start or resume CocoSpecs and declare a user-facing workflow.");
  }

  const inspectionHash = hash(snapshotValue(snapshot));
  const componentInventoryHash = hash(snapshot.components);
  let featureId: string | undefined;
  let specificationHash: string | undefined;
  let referenceDecision: AgentReferenceDecision | undefined;
  let cocoRefHash: string | undefined;
  let designProfileHash: string | undefined;

  if (request.intent === "user-facing") {
    if (!request.feature?.trim()) {
      throw diagnosticError("SPECIFICATION_REQUIRED", "A user-facing mutation must bind to a canonical CocoSpec.", "Start or resume CocoSpecs, approve it, and provide its feature ID.");
    }
    featureId = slugifyFeature(request.feature);
    const specFile = path.join(root, "specs", featureId, "spec.json");
    const spec = await canonicalJson(specFile, "SPECIFICATION_REQUIRED", "No canonical CocoSpec exists for this feature.");
    let parsedSpec;
    try { parsedSpec = parseCocoSpec(spec); } catch {
      throw diagnosticError("INVALID_CANONICAL_STATE", "The bound CocoSpec is invalid or corrupted.", "Preserve and repair the canonical CocoSpec, then validate it again.");
    }
    if (parsedSpec.state !== "approved") {
      throw diagnosticError("SPECIFICATION_NOT_APPROVED", "The bound CocoSpec is not approved.", "Finish the adaptive interview, regenerate review artifacts, and obtain explicit approval.");
    }
    specificationHash = hash(parsedSpec);
    referenceDecision = request.referenceDecision;
    if (!referenceDecision) {
      throw diagnosticError("REFERENCE_DECISION_REQUIRED", "A user-facing workflow requires an explicit visual-reference decision.", "Record reference, no-reference, or not-applicable before planning implementation.");
    }
    if (request.visual && referenceDecision === "not-applicable") {
      throw diagnosticError("REFERENCE_DECISION_REQUIRED", "Visual work cannot mark its reference decision as not applicable.", "Provide a reference or explicitly confirm that no reference is available.");
    }
    if (!request.visual && referenceDecision !== "not-applicable") {
      throw diagnosticError("REFERENCE_DECISION_REQUIRED", "Non-visual work must use the not-applicable reference decision.", "Correct the visual scope or reference decision and retry.");
    }
    if (request.visual && referenceDecision === "reference") {
      if (!request.cocoRef?.trim()) {
        throw diagnosticError("COCOREF_REQUIRED", "Reference-driven visual work must bind to a completed CocoRef.", "Run CocoRef, audit existing components, and approve or reuse every requirement.");
      }
      const refId = slugifyFeature(request.cocoRef);
      const refValue = await canonicalJson(path.join(root, "refs", refId, "ref.json"), "COCOREF_REQUIRED", "The bound CocoRef does not exist.");
      let ref;
      try { ref = parseCocoRef(refValue); } catch {
        throw diagnosticError("INVALID_CANONICAL_STATE", "The bound CocoRef is invalid or corrupted.", "Preserve and repair the canonical CocoRef, then validate it again.");
      }
      if (ref.state !== "ready") {
        throw diagnosticError("COCOREF_REQUIRED", "The bound CocoRef is not ready.", "Complete component auditing, consent, preview, and approval before implementation.");
      }
      if (!ref.auditedAt) {
        throw diagnosticError("COMPONENT_AUDIT_REQUIRED", "CocoRef has no completed existing-component audit.", "Audit the current application and framework component inventory first.");
      }
      cocoRefHash = hash(ref);
    }
    if (request.visual && referenceDecision === "no-reference") {
      const profile = snapshot.generatedCapabilities.find(({ kind }) => kind === "design-profile");
      if (!profile) {
        throw diagnosticError("CAPABILITY_UNAVAILABLE", "No approved Design Profile is available for reference-free visual direction.", "Create or restore cocoframe.design.json, then inspect the project again.");
      }
      try {
        const parsed = parseDesignProfile(await canonicalJson(path.join(root, profile.file), "CAPABILITY_UNAVAILABLE", "The Design Profile cannot be read."));
        designProfileHash = hash(parsed);
      } catch (error) {
        if (hasDiagnostic(error)) throw error;
        throw diagnosticError("INVALID_CANONICAL_STATE", "The Design Profile is invalid or corrupted.", "Repair and validate cocoframe.design.json before planning visual work.");
      }
    }
  }

  const targets = await verifyTargets(root, snapshot, proposedRoutes, changes, request.targets ?? [], signal);
  const binding: AgentWorkflowBinding = {
    version: 1,
    intent: request.intent,
    ...(featureId ? { featureId } : {}),
    inspectionHash,
    ...(specificationHash ? { specificationHash } : {}),
    ...(referenceDecision ? { referenceDecision } : {}),
    ...(cocoRefHash ? { cocoRefHash } : {}),
    componentInventoryHash,
    ...(designProfileHash ? { designProfileHash } : {}),
    targetVerificationHash: hash(targets),
    verifiedTargetCount: targets.length,
    externalTargetCount: targets.filter(({ kind }) => kind === "external").length,
    visualQaRequired: request.visual || hasVisualImpact,
    requiredVisualPrinciples: request.visual || hasVisualImpact ? visualPrinciples : [],
  };
  return { binding, targets };
}

/** Revalidates canonical workflow hashes immediately before an approved write. */
export async function assertAgentWorkflowCurrent(
  root: string,
  snapshot: AgentProjectSnapshot,
  changes: readonly AgentFileChange[],
  request: AgentWorkflowRequest,
  expected: AgentWorkflowBinding,
  proposedRoutes: readonly AgentProjectSnapshot["routes"][number][] = [],
  signal?: AbortSignal,
): Promise<void> {
  const current = await validateAgentWorkflow(root, snapshot, changes, request, proposedRoutes, signal);
  if (hash(current.binding) !== hash(expected)) {
    throw diagnosticError("STATE_CONFLICT", "Workspace or lifecycle state changed after the mutation was reviewed.", "Inspect the project again, rebuild the plan, and request a new approval.");
  }
}

async function verifyTargets(
  root: string,
  snapshot: AgentProjectSnapshot,
  proposedRoutes: readonly AgentProjectSnapshot["routes"][number][],
  changes: readonly AgentFileChange[],
  declared: readonly AgentTargetRequirement[],
  signal?: AbortSignal,
): Promise<readonly AgentTargetVerification[]> {
  const discovered = changes.flatMap(extractTargets);
  const plannedRoutes = proposedRoutes;
  const results: AgentTargetVerification[] = [];
  for (const item of discovered) {
    throwIfCancelled(signal);
    if (/^javascript:/i.test(item.target) || item.target === "#") {
      throw diagnosticError("INERT_INTERACTION", `The interaction target in ${item.source} is inert.`, "Provide a real route, anchor, or accessible action before planning the mutation.");
    }
    const requirement = declared.find(({ source, target }) => normalize(source) === item.source && target === item.target);
    if (!requirement) {
      throw diagnosticError("LINK_TARGET_MISSING", `The changed target ${item.target} in ${item.source} has no verification declaration.`, "Declare its accessible behavior and verify the destination before planning the mutation.");
    }
    if (!requirement.accessibleName.trim() || !requirement.keyboard || !requirement.visibleFocus || !requirement.actionMatchesLabel) {
      throw diagnosticError("INERT_INTERACTION", `The interaction ${item.target} in ${item.source} lacks required accessibility behavior.`, "Provide an accessible name, keyboard behavior, visible focus, and an action matching its label.");
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(item.target) || item.target.startsWith("//")) {
      if (!requirement.externalEvidence?.provider.trim() || !requirement.externalEvidence.summary.trim()) {
        throw diagnosticError("TARGET_NOT_REACHABLE", `External target ${item.target} has no provider-supplied verification evidence.`, "Verify it through a bounded provider and attach sanitized evidence, or report it as unresolved.");
      }
      results.push({ ...item, kind: "external", evidence: "provider" });
      continue;
    }
    const [pathname, anchor] = item.target.split("#", 2);
    if (!pathname && anchor) {
      const change = changes.find(({ path: file }) => normalize(file) === item.source)!;
      if (!containsAnchor(change.content, anchor)) {
        throw diagnosticError("LINK_TARGET_MISSING", `Anchor #${anchor} does not exist in ${item.source}.`, "Create the labeled anchor or correct the link target.");
      }
      results.push({ ...item, kind: "internal-anchor", evidence: "document" });
      continue;
    }
    const route = pathname || "/";
    const existing = snapshot.routes.find(({ pattern }) => routeMatches(pattern, route));
    const planned = plannedRoutes.find(({ pattern }) => routeMatches(pattern, route));
    if (!existing && !planned) {
      throw diagnosticError("LINK_TARGET_MISSING", `No inspected or planned route matches ${route}.`, "Create the destination in the same approved plan or correct the target.");
    }
    if (anchor) {
      const targetFile = planned?.file ?? existing?.file;
      const proposed = changes.find(({ path: file }) => normalize(file) === normalize(targetFile ?? ""));
      const source = proposed?.content ?? await readFile(path.join(root, targetFile!), "utf8");
      if (!containsAnchor(source, anchor)) {
        throw diagnosticError("LINK_TARGET_MISSING", `Anchor #${anchor} does not exist at ${route}.`, "Create the labeled anchor or correct the link target.");
      }
    }
    const kind = (planned?.kind ?? existing?.kind) === "api" ? "api" as const : "internal-route" as const;
    results.push({ ...item, kind, evidence: planned ? "planned" : "inspected" });
  }
  if (declared.length !== discovered.length) {
    throw diagnosticError("INVALID_TOOL_INPUT", "Target verification declarations must exactly match changed static href, to, and action targets.", "Remove stale declarations or include the corresponding changed interaction.");
  }
  return results.sort((left, right) => left.source.localeCompare(right.source) || left.target.localeCompare(right.target));
}

function extractTargets(change: AgentFileChange): readonly { source: string; target: string }[] {
  const source = normalize(change.path);
  const found: { source: string; target: string }[] = [];
  const pattern = /\b(?:href|to|action)\s*(?:=\s*(?:["']([^"']+)["']|\{\s*["']([^"']+)["']\s*\})|:\s*["']([^"']+)["'])/g;
  for (const match of change.content.matchAll(pattern)) {
    const target = (match[1] ?? match[2] ?? match[3])?.trim();
    if (target) found.push({ source, target });
  }
  return found;
}

function routeMatches(pattern: string, target: string): boolean {
  const clean = target.split(/[?#]/, 1)[0] || "/";
  const expected = pattern.split("/").filter(Boolean);
  const actual = clean.split("/").filter(Boolean);
  for (let index = 0; index < expected.length; index++) {
    const part = expected[index]!;
    if (part.startsWith("*")) return true;
    if (actual[index] === undefined || (!part.startsWith(":") && part !== actual[index])) return false;
  }
  return expected.length === actual.length;
}

function containsAnchor(source: string, anchor: string): boolean {
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(?:id|name)\\s*=\\s*(?:["']${escaped}["']|\\{\\s*["']${escaped}["']\\s*\\})`).test(source);
}

function isVisualTarget(file: string): boolean {
  const normalized = normalize(file);
  return /\.(?:tsx|css)$/.test(normalized) && (normalized.startsWith("app/") || normalized.startsWith("packages/ui/") || normalized.startsWith("packages/icons/"));
}

async function canonicalJson(file: string, code: "SPECIFICATION_REQUIRED" | "COCOREF_REQUIRED" | "CAPABILITY_UNAVAILABLE", message: string): Promise<unknown> {
  try { return JSON.parse(await readFile(file, "utf8")) as unknown; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw diagnosticError(code, message, "Complete the required canonical lifecycle and retry.");
    throw diagnosticError("INVALID_CANONICAL_STATE", "A required canonical workflow document is invalid JSON.", "Preserve and repair the document, then validate it again.");
  }
}

function snapshotValue(snapshot: AgentProjectSnapshot): unknown {
  const { projectRoot: _projectRoot, ...portable } = snapshot;
  return portable;
}

function hash(value: unknown): string { return createHash("sha256").update(stableJson(value)).digest("hex"); }
function normalize(value: string): string { return value.trim().replaceAll("\\", "/").replace(/^\.\//, ""); }
function hasDiagnostic(value: unknown): boolean { return typeof value === "object" && value !== null && "agentDiagnostic" in value; }
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
