/** The persisted CocoRef contract version. */
export const COCOREF_VERSION = 1 as const;

export type CocoRefState =
  | "collecting-reference"
  | "auditing-components"
  | "awaiting-consent"
  | "building-candidate"
  | "preview-ready"
  | "revising"
  | "ready"
  | "cancelled";

export type CocoRefRequirementStatus =
  | "reused"
  | "awaiting-consent"
  | "building"
  | "preview-ready"
  | "revising"
  | "approved"
  | "declined"
  | "cancelled";

export interface CocoReference {
  readonly kind: "image" | "website";
  readonly source: string;
  readonly note?: string;
  readonly addedAt: string;
}

export interface CocoRefInventoryItem {
  readonly id: string;
  readonly kind: "ui" | "component" | "island" | "approved-cocoref";
  readonly name: string;
  readonly file?: string;
}

export interface CocoRefFeedback {
  readonly message: string;
  readonly createdAt: string;
}

export interface CocoRefCandidate {
  readonly componentFile: string;
  readonly styleFile?: string;
  readonly previewRoute: string;
  readonly previewUrl: string;
  readonly targetComponentFile: string;
  readonly targetStyleFile?: string;
  readonly revision: number;
  readonly feedback: readonly CocoRefFeedback[];
}

export interface CocoRefRequirement {
  readonly id: string;
  readonly description: string;
  readonly rationale: string;
  readonly status: CocoRefRequirementStatus;
  readonly existingComponent?: string;
  readonly candidate?: CocoRefCandidate;
  readonly updatedAt: string;
}

export interface CocoRefDecision {
  readonly requirementId: string;
  readonly action: "reuse" | "missing" | "consent" | "decline" | "preview" | "feedback" | "approve" | "cancel";
  readonly detail: string;
  readonly createdAt: string;
}

export interface CocoRef {
  readonly version: typeof COCOREF_VERSION;
  readonly name: string;
  readonly title: string;
  readonly state: CocoRefState;
  readonly references: readonly CocoReference[];
  readonly inventory: readonly CocoRefInventoryItem[];
  readonly auditedAt?: string;
  readonly requirements: readonly CocoRefRequirement[];
  readonly decisions: readonly CocoRefDecision[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCocoRefOptions {
  readonly name: string;
  readonly title?: string;
  readonly references?: readonly Omit<CocoReference, "addedAt">[];
  readonly now?: string | Date;
}

export interface CocoRefAuditRequirement {
  readonly id: string;
  readonly description: string;
  readonly decision: "reuse" | "missing";
  readonly existingComponent?: string;
  readonly rationale: string;
}

export interface CocoRefAudit {
  readonly inventory: readonly CocoRefInventoryItem[];
  readonly requirements?: readonly CocoRefAuditRequirement[];
}

export interface CocoRefCandidateFiles {
  readonly componentFile: string;
  readonly styleFile?: string;
  readonly previewRoute: string;
  readonly previewUrl: string;
  readonly targetComponentFile: string;
  readonly targetStyleFile?: string;
}

export interface CocoRefArtifacts {
  readonly "reference-report.md": string;
  readonly "component-map.md": string;
  readonly "decisions.md": string;
}

/** Creates a reference-driven component review without inventing analysis results. */
export function createCocoRef(options: CreateCocoRefOptions): CocoRef {
  const name = slugifyCocoRef(options.name);
  const now = timestampOf(options.now);
  const references = (options.references ?? []).map((reference) => normalizeReference(reference, now));
  const draft: CocoRef = {
    version: COCOREF_VERSION,
    name,
    title: options.title?.trim() || titleFromSlug(name),
    state: "collecting-reference",
    references,
    inventory: [],
    requirements: [],
    decisions: [],
    createdAt: now,
    updatedAt: now,
  };
  return withDerivedState(draft);
}

/** Adds an image or website reference and invalidates the prior audit. */
export function addCocoReference(
  ref: CocoRef,
  reference: Omit<CocoReference, "addedAt">,
  now?: string | Date,
): CocoRef {
  const timestamp = timestampOf(now);
  const { auditedAt: _auditedAt, ...withoutAudit } = ref;
  return withDerivedState({
    ...withoutAudit,
    references: [...ref.references, normalizeReference(reference, timestamp)],
    inventory: [],
    requirements: [],
    updatedAt: timestamp,
  });
}

/** Records an AI component audit; every reuse must point to the captured inventory. */
export function auditCocoRef(ref: CocoRef, audit: CocoRefAudit, now?: string | Date): CocoRef {
  if (!ref.references.length) throw new Error("CocoRef requires at least one reference before component auditing.");
  const timestamp = timestampOf(now);
  const inventory = uniqueInventory(audit.inventory);
  const requirements = (audit.requirements ?? []).map((requirement): CocoRefRequirement => {
    const id = slugifyCocoRef(requirement.id);
    const description = requiredString(requirement.description, `requirement ${id} description`);
    const rationale = requiredString(requirement.rationale, `requirement ${id} rationale`);
    if (requirement.decision === "reuse") {
      const existingComponent = requiredString(requirement.existingComponent, `requirement ${id} existingComponent`);
      if (!inventory.some((item) => item.id === existingComponent)) {
        throw new Error(`CocoRef requirement ${id} reuses an unknown inventory item: ${existingComponent}.`);
      }
      return { id, description, rationale, status: "reused", existingComponent, updatedAt: timestamp };
    }
    if (requirement.existingComponent !== undefined) {
      throw new Error(`Missing CocoRef requirement ${id} cannot declare existingComponent.`);
    }
    return { id, description, rationale, status: "awaiting-consent", updatedAt: timestamp };
  });
  if (new Set(requirements.map(({ id }) => id)).size !== requirements.length) {
    throw new Error("CocoRef requirement IDs must be unique.");
  }
  const decisions = requirements.map((requirement): CocoRefDecision => ({
    requirementId: requirement.id,
    action: requirement.status === "reused" ? "reuse" : "missing",
    detail: requirement.status === "reused"
      ? `Reuse ${requirement.existingComponent}: ${requirement.rationale}`
      : requirement.rationale,
    createdAt: timestamp,
  }));
  const { auditedAt: _auditedAt, ...withoutAudit } = ref;
  return withDerivedState({
    ...withoutAudit,
    inventory,
    ...(audit.requirements === undefined ? {} : { auditedAt: timestamp }),
    requirements,
    decisions,
    updatedAt: timestamp,
  });
}

/** Records explicit user consent before any missing component candidate is created. */
export function consentCocoRefCandidate(ref: CocoRef, requirementId: string, now?: string | Date): CocoRef {
  return updateRequirement(ref, requirementId, ["awaiting-consent", "declined"], now, (requirement, timestamp) => ({
    requirement: { ...requirement, status: "building", updatedAt: timestamp },
    decision: { requirementId: requirement.id, action: "consent", detail: "User approved creation of a temporary component candidate.", createdAt: timestamp },
  }));
}

/** Records that the user declined creation; implementation must not silently proceed. */
export function declineCocoRefCandidate(ref: CocoRef, requirementId: string, now?: string | Date): CocoRef {
  return updateRequirement(ref, requirementId, ["awaiting-consent"], now, (requirement, timestamp) => ({
    requirement: { ...requirement, status: "declined", updatedAt: timestamp },
    decision: { requirementId: requirement.id, action: "decline", detail: "User declined creation of the missing component.", createdAt: timestamp },
  }));
}

/** Publishes the actual temporary TSX candidate through a development-only preview route. */
export function markCocoRefPreview(
  ref: CocoRef,
  requirementId: string,
  files: CocoRefCandidateFiles,
  now?: string | Date,
): CocoRef {
  return updateRequirement(ref, requirementId, ["building", "revising"], now, (requirement, timestamp) => {
    const candidate: CocoRefCandidate = {
      componentFile: safeRelativeFile(files.componentFile, "componentFile"),
      ...(files.styleFile ? { styleFile: safeRelativeFile(files.styleFile, "styleFile") } : {}),
      previewRoute: safeRelativeFile(files.previewRoute, "previewRoute"),
      previewUrl: validPreviewUrl(files.previewUrl),
      targetComponentFile: safeApplicationComponent(files.targetComponentFile, "targetComponentFile"),
      ...(files.targetStyleFile ? { targetStyleFile: safeApplicationComponent(files.targetStyleFile, "targetStyleFile") } : {}),
      revision: (requirement.candidate?.revision ?? 0) + 1,
      feedback: requirement.candidate?.feedback ?? [],
    };
    return {
      requirement: { ...requirement, status: "preview-ready", candidate, updatedAt: timestamp },
      decision: { requirementId: requirement.id, action: "preview", detail: `Revision ${candidate.revision} available at ${candidate.previewUrl}.`, createdAt: timestamp },
    };
  });
}

/** Reopens an unapproved candidate with concrete user feedback. */
export function requestCocoRefRevision(ref: CocoRef, requirementId: string, message: string, now?: string | Date): CocoRef {
  return updateRequirement(ref, requirementId, ["preview-ready"], now, (requirement, timestamp) => {
    if (!requirement.candidate) throw new Error(`CocoRef requirement ${requirement.id} has no candidate.`);
    const detail = requiredString(message, "feedback message");
    return {
      requirement: {
        ...requirement,
        status: "revising",
        candidate: { ...requirement.candidate, feedback: [...requirement.candidate.feedback, { message: detail, createdAt: timestamp }] },
        updatedAt: timestamp,
      },
      decision: { requirementId: requirement.id, action: "feedback", detail, createdAt: timestamp },
    };
  });
}

/** Approves a previewed candidate; the CLI then promotes its exact source files. */
export function approveCocoRefCandidate(ref: CocoRef, requirementId: string, now?: string | Date): CocoRef {
  return updateRequirement(ref, requirementId, ["preview-ready"], now, (requirement, timestamp) => ({
    requirement: { ...requirement, status: "approved", updatedAt: timestamp },
    decision: { requirementId: requirement.id, action: "approve", detail: "User approved the previewed candidate for application use.", createdAt: timestamp },
  }));
}

/** Cancels a missing-component branch while preserving its decision history. */
export function cancelCocoRefCandidate(ref: CocoRef, requirementId: string, now?: string | Date): CocoRef {
  return updateRequirement(
    ref,
    requirementId,
    ["awaiting-consent", "building", "preview-ready", "revising", "declined"],
    now,
    (requirement, timestamp) => ({
      requirement: { ...requirement, status: "cancelled", updatedAt: timestamp },
      decision: { requirementId: requirement.id, action: "cancel", detail: "User cancelled this component candidate.", createdAt: timestamp },
    }),
  );
}

/** Validates and parses the persisted canonical CocoRef document. */
export function parseCocoRef(value: unknown): CocoRef {
  if (!isRecord(value)) throw new Error("CocoRef must be an object.");
  if (value.version !== COCOREF_VERSION) throw new Error(`Unsupported CocoRef version: ${String(value.version)}.`);
  const parsed = createCocoRef({
    name: requiredString(value.name, "name"),
    title: requiredString(value.title, "title"),
    now: validTimestamp(value.createdAt, "createdAt"),
  });
  if (!Array.isArray(value.references) || !Array.isArray(value.inventory) || !Array.isArray(value.requirements) || !Array.isArray(value.decisions)) {
    throw new Error("CocoRef references, inventory, requirements, and decisions must be arrays.");
  }
  const references = value.references.map(parseReference);
  const inventory = uniqueInventory(value.inventory.map(parseInventory));
  const requirements = value.requirements.map(parseRequirement);
  const decisions = value.decisions.map(parseDecision);
  const updatedAt = validTimestamp(value.updatedAt, "updatedAt");
  const auditedAt = value.auditedAt === undefined ? undefined : validTimestamp(value.auditedAt, "auditedAt");
  const result = withDerivedState({
    ...parsed,
    references,
    inventory,
    ...(auditedAt ? { auditedAt } : {}),
    requirements,
    decisions,
    updatedAt,
  });
  if (value.state !== result.state) throw new Error(`CocoRef state is inconsistent: expected ${result.state}.`);
  return result;
}

/** Renders deterministic human review views from `ref.json`. */
export function renderCocoRefArtifacts(ref: CocoRef): CocoRefArtifacts {
  const referenceRows = ref.references.map((reference) =>
    `| ${reference.kind} | ${markdownCell(reference.source)} | ${markdownCell(reference.note ?? "—")} |`,
  );
  const requirementRows = ref.requirements.map((requirement) =>
    `| \`${requirement.id}\` | ${requirement.status} | ${markdownCell(requirement.existingComponent ?? "—")} | ${markdownCell(requirement.rationale)} |`,
  );
  const decisionRows = ref.decisions.map((decision) =>
    `| ${decision.createdAt} | \`${decision.requirementId}\` | ${decision.action} | ${markdownCell(decision.detail)} |`,
  );
  return {
    "reference-report.md": `# Reference Report: ${ref.title}\n\n> CocoRef v${ref.version} · ${ref.state}\n\n## References\n\n| Type | Source | Note |\n| --- | --- | --- |\n${referenceRows.join("\n") || "| — | No reference recorded | — |"}\n\n## Component audit\n\n${ref.auditedAt ? `Audited at ${ref.auditedAt}.` : "Component audit has not been completed."}\n\n| Requirement | Status | Reuse | Rationale |\n| --- | --- | --- | --- |\n${requirementRows.join("\n") || "| — | pending | — | AI must identify the visible component requirements. |"}\n`,
    "component-map.md": `# Component Map: ${ref.title}\n\n## Available inventory\n\n${ref.inventory.map((item) => `- \`${item.id}\` — ${item.kind}${item.file ? ` — \`${item.file}\`` : ""}`).join("\n") || "No inventory snapshot yet."}\n\n## Planned usage\n\n${ref.requirements.map((item) => `- **${item.description}**: ${item.status}${item.existingComponent ? ` via \`${item.existingComponent}\`` : ""}${item.status === "approved" && item.candidate ? `; promoted to \`${item.candidate.targetComponentFile}\`` : item.candidate ? `; preview ${item.candidate.previewUrl}` : ""}`).join("\n") || "No component requirements recorded."}\n`,
    "decisions.md": `# CocoRef Decisions: ${ref.title}\n\n| Time | Requirement | Action | Detail |\n| --- | --- | --- | --- |\n${decisionRows.join("\n") || "| — | — | — | No decisions recorded. |"}\n`,
  };
}

/** Converts arbitrary labels into stable lowercase IDs used by files and state. */
export function slugifyCocoRef(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("CocoRef name must contain at least one letter or number.");
  return slug;
}

function updateRequirement(
  ref: CocoRef,
  requirementId: string,
  expected: readonly CocoRefRequirementStatus[],
  now: string | Date | undefined,
  update: (requirement: CocoRefRequirement, timestamp: string) => { requirement: CocoRefRequirement; decision: CocoRefDecision },
): CocoRef {
  const id = slugifyCocoRef(requirementId);
  const index = ref.requirements.findIndex((requirement) => requirement.id === id);
  if (index < 0) throw new Error(`Unknown CocoRef requirement: ${id}.`);
  const current = ref.requirements[index]!;
  if (!expected.includes(current.status)) {
    throw new Error(`CocoRef requirement ${id} cannot transition from ${current.status}; expected ${expected.join(" or ")}.`);
  }
  const timestamp = timestampOf(now);
  const result = update(current, timestamp);
  const requirements = [...ref.requirements];
  requirements[index] = result.requirement;
  return withDerivedState({ ...ref, requirements, decisions: [...ref.decisions, result.decision], updatedAt: timestamp });
}

function withDerivedState(ref: CocoRef): CocoRef {
  let state: CocoRefState;
  if (!ref.references.length) state = "collecting-reference";
  else if (!ref.auditedAt) state = "auditing-components";
  else if (ref.requirements.some(({ status }) => status === "awaiting-consent" || status === "declined")) state = "awaiting-consent";
  else if (ref.requirements.some(({ status }) => status === "building")) state = "building-candidate";
  else if (ref.requirements.some(({ status }) => status === "revising")) state = "revising";
  else if (ref.requirements.some(({ status }) => status === "preview-ready")) state = "preview-ready";
  else if (ref.requirements.length && ref.requirements.every(({ status }) => status === "cancelled")) state = "cancelled";
  else state = "ready";
  return { ...ref, state };
}

function normalizeReference(reference: Omit<CocoReference, "addedAt">, addedAt: string): CocoReference {
  if (reference.kind !== "image" && reference.kind !== "website") throw new Error("CocoRef reference kind must be image or website.");
  const source = requiredString(reference.source, "reference source");
  if (reference.kind === "website") {
    const url = new URL(source);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("CocoRef website references must use HTTP or HTTPS.");
  }
  return { kind: reference.kind, source, ...(reference.note?.trim() ? { note: reference.note.trim() } : {}), addedAt };
}

function parseReference(value: unknown): CocoReference {
  if (!isRecord(value)) throw new Error("CocoRef reference must be an object.");
  return normalizeReference({
    kind: value.kind as "image" | "website",
    source: requiredString(value.source, "reference source"),
    ...(typeof value.note === "string" ? { note: value.note } : {}),
  }, validTimestamp(value.addedAt, "reference addedAt"));
}

function parseInventory(value: unknown): CocoRefInventoryItem {
  if (!isRecord(value)) throw new Error("CocoRef inventory item must be an object.");
  const kind = value.kind;
  if (kind !== "ui" && kind !== "component" && kind !== "island" && kind !== "approved-cocoref") throw new Error("CocoRef inventory kind is invalid.");
  return {
    id: requiredString(value.id, "inventory id"),
    kind,
    name: requiredString(value.name, "inventory name"),
    ...(typeof value.file === "string" ? { file: safeRelativeFile(value.file, "inventory file") } : {}),
  };
}

function parseRequirement(value: unknown): CocoRefRequirement {
  if (!isRecord(value)) throw new Error("CocoRef requirement must be an object.");
  const status = value.status;
  const statuses: readonly CocoRefRequirementStatus[] = ["reused", "awaiting-consent", "building", "preview-ready", "revising", "approved", "declined", "cancelled"];
  if (!statuses.includes(status as CocoRefRequirementStatus)) throw new Error("CocoRef requirement status is invalid.");
  const candidate = value.candidate === undefined ? undefined : parseCandidate(value.candidate);
  if ((status === "preview-ready" || status === "revising" || status === "approved") && !candidate) throw new Error(`CocoRef ${status} requirement requires candidate metadata.`);
  return {
    id: slugifyCocoRef(requiredString(value.id, "requirement id")),
    description: requiredString(value.description, "requirement description"),
    rationale: requiredString(value.rationale, "requirement rationale"),
    status: status as CocoRefRequirementStatus,
    ...(typeof value.existingComponent === "string" ? { existingComponent: value.existingComponent } : {}),
    ...(candidate ? { candidate } : {}),
    updatedAt: validTimestamp(value.updatedAt, "requirement updatedAt"),
  };
}

function parseCandidate(value: unknown): CocoRefCandidate {
  if (!isRecord(value) || !Array.isArray(value.feedback)) throw new Error("CocoRef candidate must be an object with feedback.");
  const revision = value.revision;
  if (!Number.isSafeInteger(revision) || (revision as number) < 1) throw new Error("CocoRef candidate revision must be a positive integer.");
  return {
    componentFile: safeRelativeFile(value.componentFile, "candidate componentFile"),
    ...(typeof value.styleFile === "string" ? { styleFile: safeRelativeFile(value.styleFile, "candidate styleFile") } : {}),
    previewRoute: safeRelativeFile(value.previewRoute, "candidate previewRoute"),
    previewUrl: validPreviewUrl(value.previewUrl),
    targetComponentFile: safeApplicationComponent(value.targetComponentFile, "candidate targetComponentFile"),
    ...(typeof value.targetStyleFile === "string" ? { targetStyleFile: safeApplicationComponent(value.targetStyleFile, "candidate targetStyleFile") } : {}),
    revision: revision as number,
    feedback: value.feedback.map((feedback) => {
      if (!isRecord(feedback)) throw new Error("CocoRef feedback must be an object.");
      return { message: requiredString(feedback.message, "feedback message"), createdAt: validTimestamp(feedback.createdAt, "feedback createdAt") };
    }),
  };
}

function parseDecision(value: unknown): CocoRefDecision {
  if (!isRecord(value)) throw new Error("CocoRef decision must be an object.");
  const actions = ["reuse", "missing", "consent", "decline", "preview", "feedback", "approve", "cancel"] as const;
  if (!actions.includes(value.action as typeof actions[number])) throw new Error("CocoRef decision action is invalid.");
  return {
    requirementId: slugifyCocoRef(requiredString(value.requirementId, "decision requirementId")),
    action: value.action as typeof actions[number],
    detail: requiredString(value.detail, "decision detail"),
    createdAt: validTimestamp(value.createdAt, "decision createdAt"),
  };
}

function uniqueInventory(items: readonly CocoRefInventoryItem[]): readonly CocoRefInventoryItem[] {
  const normalized = items.map((item) => parseInventory(item));
  const byId = new Map(normalized.map((item) => [item.id, item]));
  if (byId.size !== normalized.length) throw new Error("CocoRef inventory IDs must be unique.");
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function safeRelativeFile(value: unknown, name: string): string {
  const file = requiredString(value, name).replaceAll("\\", "/");
  if (file.startsWith("/") || /^[A-Za-z]:\//.test(file) || file.split("/").includes("..")) throw new Error(`CocoRef ${name} must be a safe project-relative path.`);
  return file;
}

function safeApplicationComponent(value: unknown, name: string): string {
  const file = safeRelativeFile(value, name);
  if (!file.startsWith("app/components/")) throw new Error(`CocoRef ${name} must be under app/components/.`);
  return file;
}

function validPreviewUrl(value: unknown): string {
  const raw = requiredString(value, "previewUrl");
  const url = new URL(raw);
  if (url.protocol !== "http:" || (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")) {
    throw new Error("CocoRef previews must use a local HTTP URL.");
  }
  if (!url.pathname.startsWith("/__cocoref/")) throw new Error("CocoRef preview URL must use /__cocoref/.");
  return url.toString().replace(/\/$/, "");
}

function timestampOf(value?: string | Date): string {
  const date = value instanceof Date ? value : value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("CocoRef timestamp is invalid.");
  return date.toISOString();
}

function validTimestamp(value: unknown, name: string): string {
  if (typeof value !== "string" || Number.isNaN(new Date(value).valueOf())) throw new Error(`CocoRef ${name} must be an ISO timestamp.`);
  return value;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`CocoRef ${name} must be a non-empty string.`);
  return value.trim();
}

function titleFromSlug(slug: string): string {
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
