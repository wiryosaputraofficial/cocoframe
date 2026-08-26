/** Persisted CocoUX contract version. */
export const COCOUX_VERSION = 1 as const;

/** Lifecycle state of one canonical CocoUX document. */
export type CocoUxLifecycleState =
  | "draft"
  | "auditing"
  | "designing-journey"
  | "designing-states"
  | "designing-interactions"
  | "recommending-visuals"
  | "awaiting-consent"
  | "ready-for-preview"
  | "building-preview"
  | "preview-ready"
  | "revising"
  | "approved"
  | "handed-off"
  | "stale"
  | "cancelled";

/** Required interface state kinds reviewed for every CocoUX screen. */
export type CocoUxStateKind = "initial" | "loading" | "empty" | "success" | "validation" | "disabled" | "error" | "offline" | "permission" | "custom";

/** Canonical source bound to a UX decision. */
export interface CocoUxSourceBinding {
  readonly id: string;
  readonly kind: "cocospec" | "cocoref" | "design-profile" | "project-snapshot";
  readonly file?: string;
  readonly state: string;
  readonly hash: string;
}

/** Reusable project capability captured before visual recommendations. */
export interface CocoUxInventoryItem {
  readonly id: string;
  readonly kind: "ui" | "component" | "island" | "token" | "approved-cocoref";
  readonly name: string;
  readonly file?: string;
}

/** User or system actor participating in a journey. */
export interface CocoUxActor {
  readonly id: string;
  readonly name: string;
  readonly goals: readonly string[];
  readonly permissions: readonly string[];
}

/** One ordered journey step and its reachable successors. */
export interface CocoUxJourneyStep {
  readonly id: string;
  readonly order: number;
  readonly screenId: string;
  readonly action: string;
  readonly stateId: string;
  readonly outcome: string;
  readonly nextStepIds: readonly string[];
}

/** User journey from an explicit entry to an observable outcome. */
export interface CocoUxJourney {
  readonly id: string;
  readonly actorId: string;
  readonly goal: string;
  readonly entryPoints: readonly string[];
  readonly steps: readonly CocoUxJourneyStep[];
  readonly alternatePaths: readonly string[];
  readonly successOutcome: string;
}

/** Route or surface that owns a complete state matrix. */
export interface CocoUxScreen {
  readonly id: string;
  readonly routeOrSurface: string;
  readonly purpose: string;
}

/** One reviewed interface state. */
export interface CocoUxUiState {
  readonly id: string;
  readonly screenId: string;
  readonly kind: CocoUxStateKind;
  readonly applicability: "applicable" | "not-applicable";
  readonly rationale: string;
  readonly entryCondition: string;
  readonly content: string;
  readonly availableActions: readonly string[];
  readonly recovery?: string;
}

/** Explicit state transition with feedback and recovery. */
export interface CocoUxTransition {
  readonly id: string;
  readonly fromStateId: string;
  readonly toStateId: string;
  readonly trigger: string;
  readonly guard?: string;
  readonly feedback: string;
  readonly outcome: string;
  readonly recovery: string;
}

/** Accessible behavior of one interactive target. */
export interface CocoUxInteraction {
  readonly id: string;
  readonly stateId: string;
  readonly target: string;
  readonly trigger: string;
  readonly behavior: string;
  readonly keyboard: string;
  readonly focus: string;
  readonly announcement?: string;
  readonly feedback: string;
  readonly recovery: string;
}

/** Reuse-first recommendation for a screen and its states. */
export interface CocoUxVisualRecommendation {
  readonly id: string;
  readonly screenId: string;
  readonly stateIds: readonly string[];
  readonly hierarchy: readonly string[];
  readonly layout: Readonly<Record<string, string>>;
  readonly components: readonly string[];
  readonly tokens: Readonly<Record<string, string>>;
  readonly typography: Readonly<Record<string, string>>;
  readonly color: Readonly<Record<string, string>>;
  readonly motion: Readonly<Record<string, string>>;
  readonly responsive: Readonly<Record<string, string>>;
  readonly rationale: string;
}

/** Inventory decision for one recommended component. */
export interface CocoUxComponentDecision {
  readonly id: string;
  readonly recommendationId: string;
  readonly component: string;
  readonly decision: "reuse" | "missing";
  readonly inventoryId?: string;
  readonly rationale: string;
  readonly consent: "pending" | "approved" | "declined" | "not-required";
}

/** Concrete user feedback attached to a preview revision. */
export interface CocoUxFeedback {
  readonly message: string;
  readonly createdAt: string;
}

/** PNG screenshot and the exact preview contract that produced it. */
export interface CocoUxScreenshotEvidence {
  readonly id: string;
  readonly stateId: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly theme: string;
  readonly file: string;
  readonly sourceHash: string;
  readonly imageHash: string;
  readonly uxContractHash: string;
  readonly description: string;
}

/** One managed server-rendered preview revision. */
export interface CocoUxPreviewRevision {
  readonly revision: number;
  readonly sourcePaths: readonly string[];
  readonly sourceHashes: Readonly<Record<string, string>>;
  readonly previewUrl: string;
  readonly status: "ready" | "revising" | "approved" | "cancelled";
  readonly feedback: readonly CocoUxFeedback[];
  readonly screenshots: readonly CocoUxScreenshotEvidence[];
  readonly createdAt: string;
}

/** Human approval of an exact UX contract and preview revision. */
export interface CocoUxApproval {
  readonly revision: number;
  readonly reviewerRole: "application-developer" | "framework-maintainer";
  readonly contractHash: string;
  readonly previewHash: string;
  readonly approvedAt: string;
}

/** Completed transfer of approved visual evidence to CocoRef. */
export interface CocoUxHandoff {
  readonly refId: string;
  readonly refFile: string;
  readonly screenshotFiles: readonly string[];
  readonly hashes: Readonly<Record<string, string>>;
  readonly status: "completed";
  readonly createdAt: string;
}

/** Versioned canonical CocoUX document. */
export interface CocoUx {
  readonly version: typeof COCOUX_VERSION;
  readonly feature: { readonly id: string; readonly title: string };
  readonly brief: string;
  readonly state: CocoUxLifecycleState;
  readonly revision: number;
  readonly sources: readonly CocoUxSourceBinding[];
  readonly inventory: readonly CocoUxInventoryItem[];
  readonly actors: readonly CocoUxActor[];
  readonly journeys: readonly CocoUxJourney[];
  readonly screens: readonly CocoUxScreen[];
  readonly states: readonly CocoUxUiState[];
  readonly transitions: readonly CocoUxTransition[];
  readonly interactions: readonly CocoUxInteraction[];
  readonly visualRecommendations: readonly CocoUxVisualRecommendation[];
  readonly componentDecisions: readonly CocoUxComponentDecision[];
  readonly previews: readonly CocoUxPreviewRevision[];
  readonly decisions: readonly { readonly action: string; readonly detail: string; readonly createdAt: string }[];
  readonly approval?: CocoUxApproval;
  readonly handoff?: CocoUxHandoff;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** UX design fields replaced together or section-by-section. */
export interface CocoUxDesign {
  readonly actors: readonly CocoUxActor[];
  readonly journeys: readonly CocoUxJourney[];
  readonly screens: readonly CocoUxScreen[];
  readonly states: readonly CocoUxUiState[];
  readonly transitions: readonly CocoUxTransition[];
  readonly interactions: readonly CocoUxInteraction[];
  readonly visualRecommendations: readonly CocoUxVisualRecommendation[];
  readonly componentDecisions: readonly CocoUxComponentDecision[];
}

/** Stable CocoUX validation diagnostic. */
export interface CocoUxDiagnostic {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly category: "journey" | "state" | "interaction" | "visual" | "source" | "preview";
  readonly path: string;
  readonly message: string;
  readonly recovery: string;
}

/** Result of validating UX completeness and graph integrity. */
export interface CocoUxCheckResult {
  readonly valid: boolean;
  readonly readyForPreview: boolean;
  readonly diagnostics: readonly CocoUxDiagnostic[];
  readonly counts: { readonly actors: number; readonly journeys: number; readonly screens: number; readonly states: number; readonly transitions: number; readonly interactions: number; readonly visuals: number };
}

/** Deterministic review artifacts generated from one canonical UX document. */
export interface CocoUxArtifacts {
  readonly "journey-map.mmd": string;
  readonly "state-diagram.mmd": string;
  readonly "interaction-matrix.md": string;
  readonly "visual-brief.md": string;
  readonly "decisions.md": string;
}

const requiredStateKinds: readonly Exclude<CocoUxStateKind, "custom">[] = ["initial", "loading", "empty", "success", "validation", "disabled", "error", "offline", "permission"];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hashPattern = /^[a-f0-9]{64}$/;

/** Creates an empty canonical UX contract without inventing product decisions. */
export function createCocoUx(options: { readonly feature: string; readonly title?: string; readonly brief: string; readonly sources?: readonly CocoUxSourceBinding[]; readonly inventory?: readonly CocoUxInventoryItem[]; readonly now?: string | Date }): CocoUx {
  const id = slug(options.feature, "feature");
  const now = timestamp(options.now);
  return {
    version: COCOUX_VERSION,
    feature: { id, title: options.title?.trim() || titleFromSlug(id) },
    brief: required(options.brief, "brief"),
    state: "draft",
    revision: 1,
    sources: uniqueBy((options.sources ?? []).map(parseSource), "source"),
    inventory: uniqueBy((options.inventory ?? []).map(parseInventory), "inventory"),
    actors: [], journeys: [], screens: [], states: [], transitions: [], interactions: [], visualRecommendations: [], componentDecisions: [], previews: [], decisions: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Replaces UX design decisions and invalidates any prior preview approval or handoff. */
export function defineCocoUxDesign(ux: CocoUx, design: CocoUxDesign, now?: string | Date): CocoUx {
  const at = timestamp(now);
  const parsed = parseDesign(design);
  return deriveState({
    ...withoutReview(ux),
    ...parsed,
    revision: ux.revision + 1,
    decisions: [...ux.decisions, { action: "design", detail: "Reviewed UX design decisions were updated.", createdAt: at }],
    updatedAt: at,
  });
}

/** Replaces one typed UX design section and invalidates prior preview approval. */
export function setCocoUxSection<K extends keyof CocoUxDesign>(ux: CocoUx, section: K, value: CocoUxDesign[K], now?: string | Date): CocoUx {
  return defineCocoUxDesign(ux, {
    actors: ux.actors,
    journeys: ux.journeys,
    screens: ux.screens,
    states: ux.states,
    transitions: ux.transitions,
    interactions: ux.interactions,
    visualRecommendations: ux.visualRecommendations,
    componentDecisions: ux.componentDecisions,
    [section]: value,
  }, now);
}

/** Validates graph reachability, complete states, interaction behavior, and component reuse. */
export function checkCocoUx(ux: CocoUx): CocoUxCheckResult {
  const diagnostics: CocoUxDiagnostic[] = [];
  const add = (code: string, category: CocoUxDiagnostic["category"], path: string, message: string, recovery: string, severity: CocoUxDiagnostic["severity"] = "error") => diagnostics.push({ code, severity, category, path, message, recovery });
  if (!ux.actors.length) add("UX_ACTORS_MISSING", "journey", "actors", "At least one actor is required.", "Define the users or systems that own each journey.");
  if (!ux.journeys.length) add("UX_JOURNEYS_MISSING", "journey", "journeys", "At least one user journey is required.", "Define an entry, ordered steps, and a success outcome.");
  if (!ux.screens.length) add("UX_SCREENS_MISSING", "state", "screens", "At least one screen or surface is required.", "Define the surfaces that own complete state matrices.");
  const actors = new Set(ux.actors.map(({ id }) => id));
  const screens = new Set(ux.screens.map(({ id }) => id));
  const states = new Set(ux.states.map(({ id }) => id));
  for (const journey of ux.journeys) {
    if (!actors.has(journey.actorId)) add("UX_ACTOR_UNKNOWN", "journey", `journeys.${journey.id}.actorId`, `Journey ${journey.id} references an unknown actor.`, "Use an actor ID declared by this contract.");
    if (!journey.steps.length) add("UX_JOURNEY_EMPTY", "journey", `journeys.${journey.id}.steps`, `Journey ${journey.id} has no steps.`, "Add at least one ordered step.");
    const ids = new Set(journey.steps.map(({ id }) => id));
    const incoming = new Set<string>();
    for (const step of journey.steps) {
      if (!screens.has(step.screenId)) add("UX_SCREEN_UNKNOWN", "journey", `journeys.${journey.id}.${step.id}.screenId`, `Step ${step.id} references an unknown screen.`, "Use a screen ID declared by this contract.");
      if (!states.has(step.stateId)) add("UX_STATE_UNKNOWN", "journey", `journeys.${journey.id}.${step.id}.stateId`, `Step ${step.id} references an unknown state.`, "Use a state ID declared by this contract.");
      for (const next of step.nextStepIds) {
        if (!ids.has(next)) add("UX_STEP_UNKNOWN", "journey", `journeys.${journey.id}.${step.id}.nextStepIds`, `Step ${step.id} references unknown successor ${next}.`, "Use a step ID inside the same journey.");
        incoming.add(next);
      }
    }
    const roots = journey.steps.filter(({ id }) => !incoming.has(id));
    if (roots.length !== 1) add("UX_JOURNEY_ROOT_INVALID", "journey", `journeys.${journey.id}.steps`, `Journey ${journey.id} must have exactly one reachable root step.`, "Remove disconnected roots or cycles and keep one entry step.");
    if (roots[0]) {
      const visited = reachableSteps(roots[0].id, new Map(journey.steps.map((step) => [step.id, step])));
      for (const step of journey.steps) if (!visited.has(step.id)) add("UX_JOURNEY_DEAD_END", "journey", `journeys.${journey.id}.${step.id}`, `Step ${step.id} is unreachable from the journey entry.`, "Connect or remove the unreachable step.");
    }
    if (!journey.steps.some(({ nextStepIds }) => nextStepIds.length === 0)) add("UX_JOURNEY_TERMINAL_MISSING", "journey", `journeys.${journey.id}.steps`, `Journey ${journey.id} has no terminal outcome.`, "Add a final step with an observable outcome and no successor.");
  }
  for (const screen of ux.screens) {
    const kinds = new Set(ux.states.filter(({ screenId }) => screenId === screen.id).map(({ kind }) => kind));
    for (const kind of requiredStateKinds) if (!kinds.has(kind)) add("UX_REQUIRED_STATE_MISSING", "state", `screens.${screen.id}.${kind}`, `Screen ${screen.id} has not reviewed its ${kind} state.`, `Add an applicable or not-applicable ${kind} state with rationale.`);
  }
  for (const state of ux.states) {
    if (!screens.has(state.screenId)) add("UX_SCREEN_UNKNOWN", "state", `states.${state.id}.screenId`, `State ${state.id} references an unknown screen.`, "Use a declared screen ID.");
    if (state.applicability === "not-applicable" && !state.rationale.trim()) add("UX_STATE_RATIONALE_MISSING", "state", `states.${state.id}.rationale`, `Non-applicable state ${state.id} requires a rationale.`, "Explain why this state cannot occur.");
  }
  for (const transition of ux.transitions) {
    if (!states.has(transition.fromStateId) || !states.has(transition.toStateId)) add("UX_TRANSITION_STATE_UNKNOWN", "state", `transitions.${transition.id}`, `Transition ${transition.id} references an unknown state.`, "Use declared source and destination state IDs.");
  }
  for (const interaction of ux.interactions) {
    if (!states.has(interaction.stateId)) add("UX_INTERACTION_STATE_UNKNOWN", "interaction", `interactions.${interaction.id}.stateId`, `Interaction ${interaction.id} references an unknown state.`, "Use a declared state ID.");
    for (const [field, value] of [["target", interaction.target], ["trigger", interaction.trigger], ["feedback", interaction.feedback], ["keyboard", interaction.keyboard], ["focus", interaction.focus], ["recovery", interaction.recovery]] as const) {
      if (!value.trim()) add("UX_INTERACTION_INCOMPLETE", "interaction", `interactions.${interaction.id}.${field}`, `Interaction ${interaction.id} has no ${field} behavior.`, `Define explicit ${field} behavior.`);
    }
  }
  const recommendations = new Map(ux.visualRecommendations.map((item) => [item.id, item]));
  const inventory = new Set(ux.inventory.map(({ id }) => id));
  for (const recommendation of ux.visualRecommendations) {
    if (!screens.has(recommendation.screenId)) add("UX_VISUAL_SCREEN_UNKNOWN", "visual", `visualRecommendations.${recommendation.id}.screenId`, `Visual recommendation ${recommendation.id} references an unknown screen.`, "Use a declared screen ID.");
    if (!Object.keys(recommendation.tokens).length) add("UX_VISUAL_TOKENS_MISSING", "visual", `visualRecommendations.${recommendation.id}.tokens`, `Visual recommendation ${recommendation.id} has no reviewed design tokens.`, "Bind the recommendation to existing project tokens.");
    for (const component of recommendation.components) {
      if (!ux.componentDecisions.some((decision) => decision.recommendationId === recommendation.id && decision.component === component)) add("UX_COMPONENT_UNAUDITED", "visual", `visualRecommendations.${recommendation.id}.components`, `Component ${component} has no reuse or missing decision.`, "Audit the component against captured inventory.");
    }
  }
  for (const decision of ux.componentDecisions) {
    if (!recommendations.has(decision.recommendationId)) add("UX_RECOMMENDATION_UNKNOWN", "visual", `componentDecisions.${decision.id}.recommendationId`, `Component decision ${decision.id} references an unknown recommendation.`, "Use a declared visual recommendation ID.");
    if (decision.decision === "reuse" && (!decision.inventoryId || !inventory.has(decision.inventoryId))) add("UX_REUSE_TARGET_UNKNOWN", "visual", `componentDecisions.${decision.id}.inventoryId`, `Reuse decision ${decision.id} does not point to captured inventory.`, "Select an existing inventory item.");
    if (decision.decision === "missing" && decision.consent !== "approved") add("UX_COMPONENT_CONSENT_REQUIRED", "visual", `componentDecisions.${decision.id}.consent`, `Missing component ${decision.component} requires explicit consent before preview.`, "Record approved consent or choose an existing component.");
  }
  const sorted = diagnostics.sort((left, right) => left.code.localeCompare(right.code) || left.path.localeCompare(right.path));
  return {
    valid: sorted.every(({ severity }) => severity !== "error"),
    readyForPreview: sorted.length === 0,
    diagnostics: sorted.slice(0, 1_000),
    counts: { actors: ux.actors.length, journeys: ux.journeys.length, screens: ux.screens.length, states: ux.states.length, transitions: ux.transitions.length, interactions: ux.interactions.length, visuals: ux.visualRecommendations.length },
  };
}

/** Records the exact rendered preview source and screenshot evidence. */
export function markCocoUxPreview(ux: CocoUx, input: Omit<CocoUxPreviewRevision, "revision" | "status" | "feedback" | "createdAt">, now?: string | Date): CocoUx {
  const check = checkCocoUx(ux);
  if (!check.readyForPreview) throw new Error(`CocoUX preview requires a complete contract; ${check.diagnostics.length} diagnostic(s) remain.`);
  if (input.screenshots.length < 1 || input.screenshots.length > 50) throw new Error("CocoUX preview requires 1-50 screenshot records.");
  const at = timestamp(now);
  const revision = (ux.previews.at(-1)?.revision ?? 0) + 1;
  const preview: CocoUxPreviewRevision = {
    revision,
    sourcePaths: uniqueStrings(input.sourcePaths.map((file) => safeManagedPath(file, ".cocoframe/cocoux/"))),
    sourceHashes: parseHashes(input.sourceHashes, "preview source hash"),
    previewUrl: localPreviewUrl(input.previewUrl, ux.feature.id),
    status: "ready",
    feedback: ux.previews.at(-1)?.feedback ?? [],
    screenshots: input.screenshots.map(parseScreenshot),
    createdAt: at,
  };
  return {
    ...withoutApprovalAndHandoff(ux),
    state: "preview-ready",
    previews: [...ux.previews, preview],
    decisions: [...ux.decisions, { action: "preview", detail: `Preview revision ${revision} captured with ${preview.screenshots.length} screenshot(s).`, createdAt: at }],
    updatedAt: at,
  };
}

/** Reopens the latest preview with concrete user feedback. */
export function requestCocoUxRevision(ux: CocoUx, message: string, now?: string | Date): CocoUx {
  const preview = ux.previews.at(-1);
  if (!preview || ux.state !== "preview-ready") throw new Error("CocoUX feedback requires a preview-ready revision.");
  const at = timestamp(now);
  const previews = [...ux.previews];
  previews[previews.length - 1] = { ...preview, status: "revising", feedback: [...preview.feedback, { message: required(message, "feedback"), createdAt: at }] };
  return { ...withoutApprovalAndHandoff(ux), state: "revising", previews, decisions: [...ux.decisions, { action: "feedback", detail: required(message, "feedback"), createdAt: at }], updatedAt: at };
}

/** Rebinds preview PNG records to immutable workspace evidence before approval. */
export function bindCocoUxApprovedEvidence(ux: CocoUx, files: Readonly<Record<string, string>>, now?: string | Date): CocoUx {
  const preview = ux.previews.at(-1);
  if (!preview || ux.state !== "preview-ready") throw new Error("CocoUX evidence binding requires a preview-ready revision.");
  const at = timestamp(now);
  const screenshots = preview.screenshots.map((screenshot) => {
    const file = files[screenshot.id];
    if (!file) throw new Error(`CocoUX approved evidence is missing screenshot ${screenshot.id}.`);
    return { ...screenshot, file: safeRelativePath(file) };
  });
  const previews = [...ux.previews];
  previews[previews.length - 1] = { ...preview, screenshots };
  return { ...ux, previews, decisions: [...ux.decisions, { action: "bind-evidence", detail: `Preview revision ${preview.revision} copied to immutable UX evidence.`, createdAt: at }], updatedAt: at };
}

/** Approves only visual direction for a hash-bound CocoRef handoff. */
export function approveCocoUx(ux: CocoUx, input: { readonly reviewerRole: CocoUxApproval["reviewerRole"]; readonly contractHash: string; readonly previewHash: string }, now?: string | Date): CocoUx {
  const preview = ux.previews.at(-1);
  if (!preview || ux.state !== "preview-ready") throw new Error("CocoUX approval requires a preview-ready revision.");
  if (!preview.screenshots.length) throw new Error("CocoUX approval requires screenshot evidence.");
  const at = timestamp(now);
  const approval: CocoUxApproval = { revision: preview.revision, reviewerRole: input.reviewerRole, contractHash: hash(input.contractHash, "contractHash"), previewHash: hash(input.previewHash, "previewHash"), approvedAt: at };
  const previews = [...ux.previews];
  previews[previews.length - 1] = { ...preview, status: "approved" };
  return { ...ux, state: "approved", previews, approval, decisions: [...ux.decisions, { action: "approve", detail: `Visual direction revision ${preview.revision} approved for CocoRef handoff.`, createdAt: at }], updatedAt: at };
}

/** Records a completed handoff without granting application-source approval. */
export function handoffCocoUxToRef(ux: CocoUx, input: Omit<CocoUxHandoff, "status" | "createdAt">, now?: string | Date): CocoUx {
  if (ux.state !== "approved" || !ux.approval) throw new Error("CocoUX handoff requires approved visual direction.");
  const at = timestamp(now);
  const handoff: CocoUxHandoff = { refId: slug(input.refId, "refId"), refFile: safeRelativePath(input.refFile), screenshotFiles: uniqueStrings(input.screenshotFiles.map(safeRelativePath)), hashes: parseHashes(input.hashes, "handoff hash"), status: "completed", createdAt: at };
  return { ...ux, state: "handed-off", handoff, decisions: [...ux.decisions, { action: "handoff", detail: `Approved visual direction handed to CocoRef ${handoff.refId}.`, createdAt: at }], updatedAt: at };
}

/** Cancels an unhanded UX workflow while preserving reviewed decision history. */
export function cancelCocoUx(ux: CocoUx, now?: string | Date): CocoUx {
  if (ux.state === "handed-off") throw new Error("A completed CocoUX handoff cannot be cancelled.");
  const at = timestamp(now);
  const previews = ux.previews.map((preview) => preview.status === "approved" ? preview : { ...preview, status: "cancelled" as const });
  return { ...withoutApprovalAndHandoff(ux), state: "cancelled", previews, decisions: [...ux.decisions, { action: "cancel", detail: "CocoUX workflow cancelled; canonical history retained.", createdAt: at }], updatedAt: at };
}

/** Parses an untrusted persisted CocoUX document into its typed canonical form. */
export function parseCocoUx(value: unknown): CocoUx {
  if (!record(value)) throw new Error("CocoUX document must be an object.");
  if (value.version !== COCOUX_VERSION) throw new Error(`Unsupported CocoUX version: ${String(value.version)}.`);
  if (!record(value.feature)) throw new Error("CocoUX feature is required.");
  const base = createCocoUx({ feature: required(value.feature.id, "feature.id"), title: required(value.feature.title, "feature.title"), brief: required(value.brief, "brief"), sources: array(value.sources, "sources").map(parseSource), inventory: array(value.inventory, "inventory").map(parseInventory), now: required(value.createdAt, "createdAt") });
  const design = parseDesign({ actors: array(value.actors, "actors"), journeys: array(value.journeys, "journeys"), screens: array(value.screens, "screens"), states: array(value.states, "states"), transitions: array(value.transitions, "transitions"), interactions: array(value.interactions, "interactions"), visualRecommendations: array(value.visualRecommendations, "visualRecommendations"), componentDecisions: array(value.componentDecisions, "componentDecisions") });
  const state = lifecycle(value.state);
  const previews = array(value.previews, "previews").map(parsePreview);
  const decisions = array(value.decisions, "decisions").map(parseDecision);
  const parsed: CocoUx = {
    ...base,
    ...design,
    state,
    revision: positiveInteger(value.revision, "revision"),
    previews,
    decisions,
    ...(value.approval === undefined ? {} : { approval: parseApproval(value.approval) }),
    ...(value.handoff === undefined ? {} : { handoff: parseHandoff(value.handoff) }),
    updatedAt: validTimestamp(value.updatedAt, "updatedAt"),
  };
  if (parsed.state === "approved" && !parsed.approval) throw new Error("Approved CocoUX requires approval metadata.");
  if (parsed.state === "handed-off" && (!parsed.approval || !parsed.handoff)) throw new Error("Handed-off CocoUX requires approval and handoff metadata.");
  return parsed;
}

/** Renders deterministic journey, state, interaction, visual, and decision review views. */
export function renderCocoUxArtifacts(ux: CocoUx): CocoUxArtifacts {
  const journeyLines = ["flowchart TD"];
  for (const journey of ux.journeys) {
    journeyLines.push(`    ${nodeId(journey.id)}_start([${mermaid(journey.goal)}])`);
    for (const step of [...journey.steps].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))) {
      journeyLines.push(`    ${nodeId(step.id)}[\"${mermaid(step.action)}\\n${mermaid(step.outcome)}\"]`);
      if (step.order === Math.min(...journey.steps.map(({ order }) => order))) journeyLines.push(`    ${nodeId(journey.id)}_start --> ${nodeId(step.id)}`);
      for (const next of step.nextStepIds) journeyLines.push(`    ${nodeId(step.id)} --> ${nodeId(next)}`);
    }
  }
  const stateLines = ["stateDiagram-v2"];
  for (const screen of ux.screens) {
    stateLines.push(`    state \"${mermaid(screen.purpose)}\" as ${nodeId(screen.id)} {`);
    for (const state of ux.states.filter(({ screenId }) => screenId === screen.id)) stateLines.push(`        state \"${mermaid(state.kind)}\" as ${nodeId(state.id)}`);
    for (const transition of ux.transitions.filter((item) => ux.states.some(({ id, screenId }) => id === item.fromStateId && screenId === screen.id))) stateLines.push(`        ${nodeId(transition.fromStateId)} --> ${nodeId(transition.toStateId)}: ${mermaid(transition.trigger)} / ${mermaid(transition.outcome)}`);
    stateLines.push("    }");
  }
  const interactions = ux.interactions.map((item) => `| \`${item.id}\` | \`${item.stateId}\` | ${cell(item.target)} | ${cell(item.trigger)} | ${cell(item.keyboard)} | ${cell(item.focus)} | ${cell(item.feedback)} | ${cell(item.recovery)} |`).join("\n");
  const visuals = ux.visualRecommendations.map((item) => `## ${item.id}\n\n- Screen: \`${item.screenId}\`\n- States: ${item.stateIds.map((id) => `\`${id}\``).join(", ")}\n- Hierarchy: ${item.hierarchy.join(" → ")}\n- Components: ${item.components.join(", ")}\n- Tokens: ${Object.entries(item.tokens).map(([key, value]) => `\`${key}=${value}\``).join(", ")}\n- Rationale: ${item.rationale}\n`).join("\n");
  const decisions = ux.decisions.map((item) => `| ${item.createdAt} | ${cell(item.action)} | ${cell(item.detail)} |`).join("\n");
  return {
    "journey-map.mmd": `${journeyLines.join("\n")}\n`,
    "state-diagram.mmd": `${stateLines.join("\n")}\n`,
    "interaction-matrix.md": `# Interaction Matrix: ${ux.feature.title}\n\n| Interaction | State | Target | Trigger | Keyboard | Focus | Feedback | Recovery |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${interactions || "| — | — | — | — | — | — | — | — |"}\n`,
    "visual-brief.md": `# Visual Brief: ${ux.feature.title}\n\n> CocoUX v${ux.version} · ${ux.state} · revision ${ux.revision}\n\n${visuals || "No visual recommendation recorded."}\n`,
    "decisions.md": `# CocoUX Decisions: ${ux.feature.title}\n\n| Time | Action | Detail |\n| --- | --- | --- |\n${decisions || "| — | — | No decisions recorded. |"}\n`,
  };
}

function parseDesign(value: unknown): CocoUxDesign {
  if (!record(value)) throw new Error("CocoUX design must be an object.");
  return {
    actors: uniqueBy(array(value.actors, "actors").map(parseActor), "actor"),
    journeys: uniqueBy(array(value.journeys, "journeys").map(parseJourney), "journey"),
    screens: uniqueBy(array(value.screens, "screens").map(parseScreen), "screen"),
    states: uniqueBy(array(value.states, "states").map(parseState), "state"),
    transitions: uniqueBy(array(value.transitions, "transitions").map(parseTransition), "transition"),
    interactions: uniqueBy(array(value.interactions, "interactions").map(parseInteraction), "interaction"),
    visualRecommendations: uniqueBy(array(value.visualRecommendations, "visualRecommendations").map(parseVisual), "visual recommendation"),
    componentDecisions: uniqueBy(array(value.componentDecisions, "componentDecisions").map(parseComponentDecision), "component decision"),
  };
}

function parseSource(value: unknown): CocoUxSourceBinding { if (!record(value)) throw new Error("CocoUX source must be an object."); const kind = value.kind; if (kind !== "cocospec" && kind !== "cocoref" && kind !== "design-profile" && kind !== "project-snapshot") throw new Error("CocoUX source kind is invalid."); return { id: slug(value.id, "source id"), kind, ...(value.file === undefined ? {} : { file: safeRelativePath(value.file) }), state: required(value.state, "source state"), hash: hash(value.hash, "source hash") }; }
function parseInventory(value: unknown): CocoUxInventoryItem { if (!record(value)) throw new Error("CocoUX inventory item must be an object."); const kind = value.kind; if (kind !== "ui" && kind !== "component" && kind !== "island" && kind !== "token" && kind !== "approved-cocoref") throw new Error("CocoUX inventory kind is invalid."); return { id: required(value.id, "inventory id"), kind, name: required(value.name, "inventory name"), ...(value.file === undefined ? {} : { file: safeRelativePath(value.file) }) }; }
function parseActor(value: unknown): CocoUxActor { if (!record(value)) throw new Error("CocoUX actor must be an object."); return { id: slug(value.id, "actor id"), name: required(value.name, "actor name"), goals: strings(value.goals, "actor goals"), permissions: strings(value.permissions, "actor permissions") }; }
function parseJourney(value: unknown): CocoUxJourney { if (!record(value)) throw new Error("CocoUX journey must be an object."); return { id: slug(value.id, "journey id"), actorId: slug(value.actorId, "journey actorId"), goal: required(value.goal, "journey goal"), entryPoints: strings(value.entryPoints, "journey entryPoints"), steps: uniqueBy(array(value.steps, "journey steps").map(parseStep), "journey step"), alternatePaths: strings(value.alternatePaths, "journey alternatePaths"), successOutcome: required(value.successOutcome, "journey successOutcome") }; }
function parseStep(value: unknown): CocoUxJourneyStep { if (!record(value)) throw new Error("CocoUX journey step must be an object."); return { id: slug(value.id, "step id"), order: nonNegativeInteger(value.order, "step order"), screenId: slug(value.screenId, "step screenId"), action: required(value.action, "step action"), stateId: slug(value.stateId, "step stateId"), outcome: required(value.outcome, "step outcome"), nextStepIds: strings(value.nextStepIds, "step nextStepIds").map((id) => slug(id, "next step id")) }; }
function parseScreen(value: unknown): CocoUxScreen { if (!record(value)) throw new Error("CocoUX screen must be an object."); return { id: slug(value.id, "screen id"), routeOrSurface: required(value.routeOrSurface, "screen routeOrSurface"), purpose: required(value.purpose, "screen purpose") }; }
function parseState(value: unknown): CocoUxUiState { if (!record(value)) throw new Error("CocoUX state must be an object."); const kind = stateKind(value.kind); const applicability = value.applicability; if (applicability !== "applicable" && applicability !== "not-applicable") throw new Error("CocoUX state applicability is invalid."); return { id: slug(value.id, "state id"), screenId: slug(value.screenId, "state screenId"), kind, applicability, rationale: required(value.rationale, "state rationale"), entryCondition: required(value.entryCondition, "state entryCondition"), content: required(value.content, "state content"), availableActions: strings(value.availableActions, "state availableActions"), ...(value.recovery === undefined ? {} : { recovery: required(value.recovery, "state recovery") }) }; }
function parseTransition(value: unknown): CocoUxTransition { if (!record(value)) throw new Error("CocoUX transition must be an object."); return { id: slug(value.id, "transition id"), fromStateId: slug(value.fromStateId, "transition fromStateId"), toStateId: slug(value.toStateId, "transition toStateId"), trigger: required(value.trigger, "transition trigger"), ...(value.guard === undefined ? {} : { guard: required(value.guard, "transition guard") }), feedback: required(value.feedback, "transition feedback"), outcome: required(value.outcome, "transition outcome"), recovery: required(value.recovery, "transition recovery") }; }
function parseInteraction(value: unknown): CocoUxInteraction { if (!record(value)) throw new Error("CocoUX interaction must be an object."); return { id: slug(value.id, "interaction id"), stateId: slug(value.stateId, "interaction stateId"), target: required(value.target, "interaction target"), trigger: required(value.trigger, "interaction trigger"), behavior: required(value.behavior, "interaction behavior"), keyboard: required(value.keyboard, "interaction keyboard"), focus: required(value.focus, "interaction focus"), ...(value.announcement === undefined ? {} : { announcement: required(value.announcement, "interaction announcement") }), feedback: required(value.feedback, "interaction feedback"), recovery: required(value.recovery, "interaction recovery") }; }
function parseVisual(value: unknown): CocoUxVisualRecommendation { if (!record(value)) throw new Error("CocoUX visual recommendation must be an object."); return { id: slug(value.id, "visual id"), screenId: slug(value.screenId, "visual screenId"), stateIds: strings(value.stateIds, "visual stateIds").map((id) => slug(id, "visual stateId")), hierarchy: strings(value.hierarchy, "visual hierarchy"), layout: stringRecord(value.layout, "visual layout"), components: strings(value.components, "visual components"), tokens: stringRecord(value.tokens, "visual tokens"), typography: stringRecord(value.typography, "visual typography"), color: stringRecord(value.color, "visual color"), motion: stringRecord(value.motion, "visual motion"), responsive: stringRecord(value.responsive, "visual responsive"), rationale: required(value.rationale, "visual rationale") }; }
function parseComponentDecision(value: unknown): CocoUxComponentDecision { if (!record(value)) throw new Error("CocoUX component decision must be an object."); const decision = value.decision; const consent = value.consent; if (decision !== "reuse" && decision !== "missing") throw new Error("CocoUX component decision is invalid."); if (consent !== "pending" && consent !== "approved" && consent !== "declined" && consent !== "not-required") throw new Error("CocoUX component consent is invalid."); return { id: slug(value.id, "component decision id"), recommendationId: slug(value.recommendationId, "component recommendationId"), component: required(value.component, "component name"), decision, ...(value.inventoryId === undefined ? {} : { inventoryId: required(value.inventoryId, "component inventoryId") }), rationale: required(value.rationale, "component rationale"), consent }; }
function parseScreenshot(value: unknown): CocoUxScreenshotEvidence { if (!record(value) || !record(value.viewport)) throw new Error("CocoUX screenshot must include viewport metadata."); return { id: slug(value.id, "screenshot id"), stateId: slug(value.stateId, "screenshot stateId"), viewport: { width: positiveInteger(value.viewport.width, "viewport width"), height: positiveInteger(value.viewport.height, "viewport height") }, theme: slug(value.theme, "screenshot theme"), file: safeRelativePath(value.file), sourceHash: hash(value.sourceHash, "screenshot sourceHash"), imageHash: hash(value.imageHash, "screenshot imageHash"), uxContractHash: hash(value.uxContractHash, "screenshot uxContractHash"), description: required(value.description, "screenshot description") }; }
function parsePreview(value: unknown): CocoUxPreviewRevision { if (!record(value)) throw new Error("CocoUX preview must be an object."); const status = value.status; if (status !== "ready" && status !== "revising" && status !== "approved" && status !== "cancelled") throw new Error("CocoUX preview status is invalid."); return { revision: positiveInteger(value.revision, "preview revision"), sourcePaths: strings(value.sourcePaths, "preview sourcePaths").map((file) => safeManagedPath(file, ".cocoframe/cocoux/")), sourceHashes: parseHashes(value.sourceHashes, "preview source hashes"), previewUrl: localPreviewUrl(value.previewUrl), status, feedback: array(value.feedback, "preview feedback").map(parseFeedback), screenshots: array(value.screenshots, "preview screenshots").map(parseScreenshot), createdAt: validTimestamp(value.createdAt, "preview createdAt") }; }
function parseFeedback(value: unknown): CocoUxFeedback { if (!record(value)) throw new Error("CocoUX feedback must be an object."); return { message: required(value.message, "feedback message"), createdAt: validTimestamp(value.createdAt, "feedback createdAt") }; }
function parseDecision(value: unknown) { if (!record(value)) throw new Error("CocoUX decision must be an object."); return { action: required(value.action, "decision action"), detail: required(value.detail, "decision detail"), createdAt: validTimestamp(value.createdAt, "decision createdAt") }; }
function parseApproval(value: unknown): CocoUxApproval { if (!record(value)) throw new Error("CocoUX approval must be an object."); const role = value.reviewerRole; if (role !== "application-developer" && role !== "framework-maintainer") throw new Error("CocoUX approval role is invalid."); return { revision: positiveInteger(value.revision, "approval revision"), reviewerRole: role, contractHash: hash(value.contractHash, "approval contractHash"), previewHash: hash(value.previewHash, "approval previewHash"), approvedAt: validTimestamp(value.approvedAt, "approval approvedAt") }; }
function parseHandoff(value: unknown): CocoUxHandoff { if (!record(value) || value.status !== "completed") throw new Error("CocoUX handoff must be completed."); return { refId: slug(value.refId, "handoff refId"), refFile: safeRelativePath(value.refFile), screenshotFiles: strings(value.screenshotFiles, "handoff screenshotFiles").map(safeRelativePath), hashes: parseHashes(value.hashes, "handoff hashes"), status: "completed", createdAt: validTimestamp(value.createdAt, "handoff createdAt") }; }

function deriveState(ux: CocoUx): CocoUx { const check = checkCocoUx(ux); if (check.readyForPreview) return { ...ux, state: "ready-for-preview" }; if (!ux.actors.length || !ux.journeys.length) return { ...ux, state: "designing-journey" }; if (!ux.screens.length || check.diagnostics.some(({ category }) => category === "state")) return { ...ux, state: "designing-states" }; if (check.diagnostics.some(({ category }) => category === "interaction")) return { ...ux, state: "designing-interactions" }; if (check.diagnostics.some(({ code }) => code === "UX_COMPONENT_CONSENT_REQUIRED")) return { ...ux, state: "awaiting-consent" }; return { ...ux, state: "recommending-visuals" }; }
function withoutReview(ux: CocoUx): CocoUx { return { ...withoutApprovalAndHandoff(ux), previews: [] }; }
function withoutApprovalAndHandoff(ux: CocoUx): CocoUx { const { approval: _approval, handoff: _handoff, ...rest } = ux; return rest; }
function reachableSteps(id: string, steps: ReadonlyMap<string, CocoUxJourneyStep>, seen = new Set<string>()): ReadonlySet<string> { if (seen.has(id)) return seen; seen.add(id); for (const next of steps.get(id)?.nextStepIds ?? []) reachableSteps(next, steps, seen); return seen; }
function lifecycle(value: unknown): CocoUxLifecycleState { const states: readonly CocoUxLifecycleState[] = ["draft", "auditing", "designing-journey", "designing-states", "designing-interactions", "recommending-visuals", "awaiting-consent", "ready-for-preview", "building-preview", "preview-ready", "revising", "approved", "handed-off", "stale", "cancelled"]; if (!states.includes(value as CocoUxLifecycleState)) throw new Error("CocoUX lifecycle state is invalid."); return value as CocoUxLifecycleState; }
function stateKind(value: unknown): CocoUxStateKind { const kinds: readonly CocoUxStateKind[] = [...requiredStateKinds, "custom"]; if (!kinds.includes(value as CocoUxStateKind)) throw new Error("CocoUX state kind is invalid."); return value as CocoUxStateKind; }
function uniqueBy<T extends { readonly id: string }>(items: readonly T[], label: string): readonly T[] { const ids = new Set<string>(); for (const item of items) { if (ids.has(item.id)) throw new Error(`Duplicate CocoUX ${label} ID: ${item.id}.`); ids.add(item.id); } return [...items].sort((a, b) => a.id.localeCompare(b.id)); }
function uniqueStrings(items: readonly string[]): readonly string[] { return [...new Set(items.map((item) => required(item, "value")))].sort(); }
function strings(value: unknown, label: string): readonly string[] { return uniqueStrings(array(value, label).map((item) => required(item, label))); }
function stringRecord(value: unknown, label: string): Readonly<Record<string, string>> { if (!record(value)) throw new Error(`${label} must be an object.`); return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [required(key, `${label} key`), required(item, `${label}.${key}`)])); }
function parseHashes(value: unknown, label: string): Readonly<Record<string, string>> { if (!record(value)) throw new Error(`${label} must be an object.`); return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [safeRelativePath(key), hash(item, `${label}.${key}`)])); }
function slug(value: unknown, label: string): string { const text = required(value, label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); if (!slugPattern.test(text)) throw new Error(`CocoUX ${label} must be a stable lowercase slug.`); return text; }
function hash(value: unknown, label: string): string { const text = required(value, label).toLowerCase(); if (!hashPattern.test(text)) throw new Error(`CocoUX ${label} must be a SHA-256 hash.`); return text; }
function required(value: unknown, label: string): string { if (typeof value !== "string" || !value.trim()) throw new Error(`CocoUX ${label} is required.`); return value.trim(); }
function positiveInteger(value: unknown, label: string): number { if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error(`CocoUX ${label} must be a positive integer.`); return value as number; }
function nonNegativeInteger(value: unknown, label: string): number { if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`CocoUX ${label} must be a non-negative integer.`); return value as number; }
function array(value: unknown, label: string): readonly unknown[] { if (!Array.isArray(value)) throw new Error(`CocoUX ${label} must be an array.`); return value; }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function safeRelativePath(value: unknown): string { const file = required(value, "relative path").replaceAll("\\", "/").replace(/^\.\//, ""); if (!file || file.startsWith("/") || /^[A-Za-z]:\//.test(file) || file.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("CocoUX path must be workspace-relative."); return file; }
function safeManagedPath(value: unknown, prefix: string): string { const file = safeRelativePath(value); if (!file.startsWith(prefix)) throw new Error(`CocoUX managed path must start with ${prefix}.`); return file; }
function localPreviewUrl(value: unknown, feature?: string): string { const url = new URL(required(value, "preview URL")); if (url.protocol !== "http:" || (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")) throw new Error("CocoUX preview URL must use local HTTP."); if (!url.pathname.startsWith(`/__cocoux/${feature ?? ""}`)) throw new Error("CocoUX preview URL must use the managed /__cocoux route."); return url.href; }
function validTimestamp(value: unknown, label: string): string { const text = required(value, label); if (!Number.isFinite(Date.parse(text))) throw new Error(`CocoUX ${label} must be an ISO timestamp.`); return new Date(text).toISOString(); }
function timestamp(value?: string | Date): string { return validTimestamp(value instanceof Date ? value.toISOString() : value ?? new Date().toISOString(), "timestamp"); }
function titleFromSlug(value: string): string { return value.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" "); }
function nodeId(value: string): string { return `n_${value.replace(/[^A-Za-z0-9_]/g, "_")}`; }
function mermaid(value: string): string { return value.replace(/[\"\[\]{}]/g, " ").replace(/\s+/g, " ").trim(); }
function cell(value: string): string { return value.replaceAll("|", "\\|").replace(/\r?\n/g, " "); }
