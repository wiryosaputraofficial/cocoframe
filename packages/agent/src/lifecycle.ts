import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  checkCocoSpec,
  createCocoSpec,
  nextQuestions,
  parseCocoSpec,
  slugifyFeature,
  type CocoSpec,
  type CocoSpecMode,
} from "@cocoframe/specs";
import { parseCocoRef, slugifyCocoRef, type CocoRef } from "@cocoframe/cocoref";
import { checkCocoUx, parseCocoUx, type CocoUx } from "@cocoframe/ux";
import {
  checkCocoQa,
  createCocoQa,
  nextCocoQaQuestions,
  parseCocoQa,
  parseDesignProfile,
  hashDesignProfile,
  productDesignCriteria,
  slugifyCocoQa,
  type CocoQaMode,
} from "@cocoframe/qa";
import type { AgentComponent, AgentProjectSnapshot } from "./types.ts";
import { diagnosticError, throwIfCancelled } from "./workspace.ts";

const MAX_CANONICAL_BYTES = 1024 * 1024;

export interface CocoSpecsNextInput {
  readonly feature: string;
  readonly title?: string;
  readonly brief?: string;
  readonly mode: CocoSpecMode;
  readonly limit: number;
}

export interface CocoRefAuditInput {
  readonly name: string;
  readonly requirements: readonly {
    readonly id: string;
    readonly description: string;
    readonly query?: string;
  }[];
}

export interface CocoQaTraceInput {
  readonly feature: string;
  readonly mode: CocoQaMode;
  readonly limit: number;
}

export interface CocoUxInspectInput {
  readonly feature: string;
}

/** Returns the canonical CocoUX contract and completeness diagnostics without creating preview files. */
export async function readCocoUxLifecycle(root: string, input: CocoUxInspectInput, signal?: AbortSignal) {
  throwIfCancelled(signal);
  const feature = slugifyFeature(input.feature);
  const canonicalFile = `ux/${feature}/ux.json`;
  const value = await readOptionalCanonical(root, canonicalFile, signal);
  if (value === undefined) throw diagnosticError("INVALID_CANONICAL_STATE", `CocoUX does not exist: ${canonicalFile}.`, "Create CocoUX from an approved CocoSpec and the current component inventory before designing the experience.");
  const ux = parseCanonical("CocoUX", canonicalFile, value, parseCocoUx);
  const check = checkCocoUx(ux);
  return {
    lifecycle: "cocoux" as const,
    feature: ux.feature,
    state: ux.state,
    revision: ux.revision,
    canonicalFile,
    sources: ux.sources,
    inventory: ux.inventory,
    actors: ux.actors,
    journeys: ux.journeys,
    screens: ux.screens,
    states: ux.states,
    transitions: ux.transitions,
    interactions: ux.interactions,
    visualRecommendations: ux.visualRecommendations,
    componentDecisions: ux.componentDecisions,
    check,
    latestPreview: ux.previews.at(-1),
    approval: ux.approval,
    handoff: ux.handoff,
    mutationRequired: false as const,
    nextAction: ux.state === "handed-off"
      ? "Continue CocoRef component audit and exact-source approval; CocoUX approval did not promote application source."
      : ux.state === "approved"
        ? "Hand the hash-bound PNG evidence and UX contract to CocoRef."
        : ux.state === "preview-ready"
          ? "Ask a human application developer or framework maintainer to approve or request a revision."
          : check.readyForPreview
            ? "Generate and capture the managed local visual preview through an approved mutation."
            : "Resolve the returned journey, state, interaction, visual, and consent diagnostics before preview.",
  };
}

/** Returns only the next adaptive CocoSpecs batch and never persists a proposed draft. */
export async function readCocoSpecsNext(
  root: string,
  snapshot: AgentProjectSnapshot,
  input: CocoSpecsNextInput,
  signal?: AbortSignal,
) {
  throwIfCancelled(signal);
  const feature = slugifyFeature(input.feature);
  const canonicalFile = `specs/${feature}/spec.json`;
  const existing = await readOptionalCanonical(root, canonicalFile, signal);
  let spec: CocoSpec;
  let source: "canonical" | "proposed";
  if (existing === undefined) {
    spec = createCocoSpec({
      feature,
      ...(input.title ? { title: input.title } : {}),
      ...(input.brief ? { brief: input.brief } : {}),
      mode: input.mode,
      project: {
        routes: snapshot.routes.map(({ file }) => file),
        islands: snapshot.islands.map(({ file }) => file),
        dependencies: snapshot.dependencies.map(({ name }) => name),
      },
    });
    source = "proposed";
  } else {
    spec = parseCanonical("CocoSpec", canonicalFile, existing, parseCocoSpec);
    source = "canonical";
  }
  const progress = checkCocoSpec(spec);
  return {
    lifecycle: "cocospec" as const,
    feature: { id: spec.feature.id, title: spec.feature.title },
    mode: spec.mode,
    state: spec.state,
    source,
    canonicalFile,
    progress: { answered: progress.answered, total: progress.total, complete: progress.complete },
    questions: nextQuestions(spec, input.limit),
    mutationRequired: source === "proposed",
    nextAction: source === "proposed"
      ? "Request approval to create the canonical CocoSpec before recording answers."
      : spec.state === "approved"
        ? "Use the approved acceptance criteria to prepare implementation or CocoQA."
        : "Ask only this question batch, then request approval before recording reviewed answers.",
  };
}

/** Audits existing components before returning any missing-component proposal. */
export async function auditCocoRefLifecycle(
  root: string,
  snapshot: AgentProjectSnapshot,
  input: CocoRefAuditInput,
  signal?: AbortSignal,
) {
  throwIfCancelled(signal);
  const name = slugifyCocoRef(input.name);
  const canonicalFile = `refs/${name}/ref.json`;
  const existing = await readOptionalCanonical(root, canonicalFile, signal);
  const canonical = existing === undefined ? undefined : parseCanonical("CocoRef", canonicalFile, existing, parseCocoRef);
  const requirements = input.requirements.length > 0 ? input.requirements : canonicalRequirements(canonical);
  if (requirements.length === 0) {
    throw diagnosticError(
      "INVALID_TOOL_INPUT",
      "CocoRef audit requires at least one component requirement when no canonical CocoRef requirements exist.",
      "Provide requirement IDs, descriptions, and optional component search queries.",
    );
  }
  const audited = requirements.map((requirement) => {
    const matches = matchComponents(snapshot.components, requirement.query ?? requirement.description);
    return {
      id: slugifyCocoRef(requirement.id),
      description: requirement.description.trim(),
      decision: matches.length > 0 ? "reuse" as const : "missing" as const,
      matches,
      ...(matches.length === 0 ? { consentRequired: true as const } : {}),
    };
  });
  return {
    lifecycle: "cocoref" as const,
    name,
    state: canonical?.state ?? "proposed",
    source: canonical ? "canonical" as const : "proposed" as const,
    canonicalFile,
    auditedExistingComponents: true as const,
    inventory: snapshot.components,
    requirements: audited,
    missingComponents: audited.filter(({ decision }) => decision === "missing"),
    mutationRequired: !canonical,
    nextAction: audited.some(({ decision }) => decision === "missing")
      ? "Ask the user for explicit consent for each missing component before creating any preview."
      : "Reuse the matched components; do not create redundant component implementations.",
  };
}

/** Returns CocoQA traceability or a non-persisted proposal derived from an approved CocoSpec. */
export async function readCocoQaTrace(
  root: string,
  input: CocoQaTraceInput,
  signal?: AbortSignal,
) {
  throwIfCancelled(signal);
  const feature = slugifyCocoQa(input.feature);
  const specFile = `specs/${feature}/spec.json`;
  const specValue = await readOptionalCanonical(root, specFile, signal);
  if (specValue === undefined) {
    throw diagnosticError("INVALID_CANONICAL_STATE", `CocoQA requires a canonical CocoSpec: ${specFile}.`, "Create, complete, and approve the CocoSpec before invoking CocoQA.");
  }
  const spec = parseCanonical("CocoSpec", specFile, specValue, parseCocoSpec);
  if (spec.state !== "approved") {
    throw diagnosticError("INVALID_CANONICAL_STATE", `CocoQA requires an approved CocoSpec; ${feature} is ${spec.state}.`, "Complete and explicitly approve the CocoSpec before invoking CocoQA.");
  }
  const canonicalFile = `qa/${feature}/qa.json`;
  const existing = await readOptionalCanonical(root, canonicalFile, signal);
  const acceptanceCriteria = stringList(spec.answers["acceptance-criteria"]?.value);
  const refFile = "refs/" + feature + "/ref.json";
  const refValue = await readOptionalCanonical(root, refFile, signal);
  const ref = refValue === undefined ? undefined : parseCanonical("CocoRef", refFile, refValue, parseCocoRef);
  if (ref && ref.state !== "ready") {
    throw diagnosticError("COCOREF_REQUIRED", "CocoQA requires a ready CocoRef when " + refFile + " exists; it is " + ref.state + ".", "Complete or cancel the reference lifecycle explicitly before creating CocoQA.");
  }
  const referenceCriteria = ref?.requirements
    .filter(({ status }) => status === "reused" || status === "approved")
    .map(({ id, description }) => ({ id, description })) ?? [];
  const uxFile = "ux/" + feature + "/ux.json";
  const uxValue = await readOptionalCanonical(root, uxFile, signal);
  const ux = uxValue === undefined ? undefined : parseCanonical("CocoUX", uxFile, uxValue, parseCocoUx);
  if (ux && ux.state !== "approved" && ux.state !== "handed-off") {
    throw diagnosticError("INVALID_CANONICAL_STATE", `CocoQA requires approved or handed-off CocoUX when ${uxFile} exists; it is ${ux.state}.`, "Complete visual review and obtain human CocoUX approval before creating CocoQA.");
  }
  const designFile = "cocoframe.design.json";
  const designValue = await readOptionalCanonical(root, designFile, signal);
  const designProfile = designValue === undefined
    ? undefined
    : parseCanonical("Design Profile", designFile, designValue, parseDesignProfile);
  const designHash = designProfile ? await hashDesignProfile(designProfile) : undefined;
  const qa = existing === undefined
    ? createCocoQa({
      feature,
      title: spec.feature.title,
      mode: input.mode,
      sources: [
        { kind: "cocospec", id: feature, file: specFile, state: spec.state },
        ...(ux ? [{ kind: "cocoux" as const, id: ux.feature.id, file: uxFile, state: ux.state }] : []),
        ...(ref ? [{ kind: "cocoref" as const, id: ref.name, file: refFile, state: ref.state }] : []),
        ...(designProfile && designHash ? [{ kind: "design-profile" as const, id: designProfile.id, file: designFile, state: "sha256:" + designHash }] : []),
      ],
      acceptanceCriteria,
      ...(ux ? { uxCriteria: criteriaFromUx(ux) } : {}),
      ...(referenceCriteria.length ? { referenceCriteria } : {}),
      ...(designProfile ? { designCriteria: productDesignCriteria(designProfile, { hasReference: Boolean(ref) }) } : {}),
    })
    : parseCanonical("CocoQA", canonicalFile, existing, parseCocoQa);
  const qaDesignSource = qa.sources.find(({ kind }) => kind === "design-profile");
  if (existing !== undefined && qaDesignSource &&
      (!designProfile || !designHash || qaDesignSource.state !== "sha256:" + designHash)) {
    throw diagnosticError(
      "STATE_CONFLICT",
      "The Design Profile changed after the canonical CocoQA plan was reviewed.",
      "Inspect the current Design Profile, rebuild the CocoQA plan, and request approval again.",
    );
  }
  const traceDesignProfile = existing === undefined || qaDesignSource ? designProfile : undefined;
  const traceDesignHash = existing === undefined || qaDesignSource ? designHash : undefined;
  const check = checkCocoQa(qa);
  return {
    lifecycle: "cocoqa" as const,
    feature: qa.feature,
    mode: qa.mode,
    state: qa.state,
    approved: qa.state === "approved",
    source: existing === undefined ? "proposed" as const : "canonical" as const,
    canonicalFile,
    sources: qa.sources,
    acceptanceCriteria,
    ...(traceDesignProfile && traceDesignHash ? { designProfile: { id: traceDesignProfile.id, file: designFile, hash: traceDesignHash } } : {}),
    questions: nextCocoQaQuestions(qa, input.limit),
    cases: qa.cases,
    gates: qa.gates,
    defects: qa.defects,
    unresolved: check.issues,
    mutationRequired: existing === undefined,
    nextAction: existing === undefined
      ? "Request approval to create the canonical CocoQA plan before recording decisions or evidence."
      : qa.state === "approved"
        ? "Report traceable QA evidence and approval state."
        : "Ask only this QA question batch; execution and evidence recording require separately approved mutations.",
  };
}

function criteriaFromUx(ux: CocoUx) {
  return [
    ...ux.journeys.map((journey) => ({ id: `journey-${journey.id}`, description: `Journey reaches its approved outcome: ${journey.successOutcome}`, category: "functional" as const })),
    ...ux.states.map((state) => ({ id: `state-${state.id}`, description: `${state.screenId} ${state.kind} state matches its reviewed content, actions, and recovery behavior.`, category: "edge-case" as const })),
    ...ux.interactions.map((interaction) => ({ id: `interaction-${interaction.id}`, description: `${interaction.target} preserves keyboard, focus, feedback, and recovery behavior.`, category: "accessibility" as const })),
    ...(ux.previews.at(-1)?.screenshots.map((screenshot) => ({ id: `visual-${screenshot.id}`, description: `Rendered output matches ${screenshot.file} at ${screenshot.viewport.width}×${screenshot.viewport.height}.`, category: screenshot.viewport.width <= 768 ? "responsive" as const : "visual" as const })) ?? []),
  ];
}

function canonicalRequirements(ref: CocoRef | undefined): CocoRefAuditInput["requirements"] {
  return ref?.requirements.map(({ id, description }) => ({ id, description })) ?? [];
}

function matchComponents(components: readonly AgentComponent[], query: string): readonly AgentComponent[] {
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  if (tokens.length === 0) return [];
  return components.filter((component) => {
    const haystack = `${component.name} ${component.source} ${component.file ?? ""}`.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  }).slice(0, 20);
}

async function readOptionalCanonical(root: string, relativeFile: string, signal?: AbortSignal): Promise<unknown | undefined> {
  throwIfCancelled(signal);
  const target = path.resolve(root, relativeFile);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw diagnosticError("WORKSPACE_ACCESS_DENIED", "The canonical lifecycle path is outside the approved workspace.", "Use a lifecycle identifier inside the approved workspace.");
  }
  try {
    const canonical = await realpath(target);
    if (!canonical.startsWith(`${root}${path.sep}`)) {
      throw diagnosticError("WORKSPACE_ACCESS_DENIED", "A canonical lifecycle file resolves outside the approved workspace.", "Remove the linked path and retry.");
    }
    const info = await stat(canonical);
    if (!info.isFile() || info.size > MAX_CANONICAL_BYTES) {
      throw diagnosticError("INVALID_CANONICAL_STATE", `Canonical lifecycle file is not a regular file within the ${MAX_CANONICAL_BYTES}-byte limit.`, "Preserve and repair the canonical document explicitly.");
    }
    return JSON.parse(await readFile(canonical, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    if (isAgentDiagnostic(error)) throw error;
    throw diagnosticError("INVALID_CANONICAL_STATE", `Canonical lifecycle document is invalid: ${relativeFile}.`, "Preserve the file, repair its validation errors explicitly, and retry.");
  }
}

function parseCanonical<T>(label: string, file: string, value: unknown, parse: (input: unknown) => T): T {
  try {
    return parse(value);
  } catch (error) {
    throw diagnosticError(
      "INVALID_CANONICAL_STATE",
      `${label} is invalid at ${file}: ${error instanceof Error ? error.message : "validation failed"}`,
      "Preserve the canonical document, repair it explicitly, and validate again.",
    );
  }
}

function stringList(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function isAgentDiagnostic(value: unknown): boolean {
  return typeof value === "object" && value !== null && "agentDiagnostic" in value;
}
