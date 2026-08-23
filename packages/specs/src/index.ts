/**
 * Identifies the persisted CocoSpecs document format supported by this package.
 */
export const COCOSPECS_VERSION = 1 as const;

export type CocoSpecMode = "quick" | "standard" | "thorough";
export type CocoSpecState = "draft" | "ready" | "approved";
export type CocoSpecAnswerStatus = "answered" | "assumed" | "deferred" | "not-applicable";
export type CocoSpecQuestionType = "text" | "list" | "choice" | "structured";
export type CocoSpecSection =
  | "intent"
  | "users"
  | "flow"
  | "interface"
  | "authentication"
  | "data"
  | "integration"
  | "quality"
  | "delivery";

export type CocoSpecValue = string | number | boolean | null | readonly CocoSpecValue[] | {
  readonly [key: string]: CocoSpecValue;
};

export interface CocoSpecProjectContext {
  readonly routes?: readonly string[];
  readonly islands?: readonly string[];
  readonly dependencies?: readonly string[];
}

export interface CocoSpecFeature {
  readonly id: string;
  readonly title: string;
  readonly brief: string;
}

export interface CocoSpecAnswer {
  readonly status: CocoSpecAnswerStatus;
  readonly value?: CocoSpecValue;
  readonly updatedAt: string;
}

export interface CocoSpec {
  readonly version: typeof COCOSPECS_VERSION;
  readonly feature: CocoSpecFeature;
  readonly mode: CocoSpecMode;
  readonly state: CocoSpecState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly project?: CocoSpecProjectContext;
  readonly answers: Readonly<Record<string, CocoSpecAnswer>>;
}

export interface CreateCocoSpecOptions {
  readonly feature: string;
  readonly title?: string;
  readonly brief?: string;
  readonly mode?: CocoSpecMode;
  readonly project?: CocoSpecProjectContext;
  readonly now?: string | Date;
}

export interface AnswerCocoSpecOptions {
  readonly status?: CocoSpecAnswerStatus;
  readonly now?: string | Date;
}

export interface CocoSpecQuestion {
  readonly id: string;
  readonly section: CocoSpecSection;
  readonly prompt: string;
  readonly why: string;
  readonly type: CocoSpecQuestionType;
  readonly required: boolean;
  readonly options?: readonly string[];
  readonly responseHint?: string;
}

export interface CocoSpecIssue {
  readonly questionId: string;
  readonly section: CocoSpecSection;
  readonly code: "missing-answer" | "deferred-answer";
  readonly message: string;
}

export interface CocoSpecCheckResult {
  readonly complete: boolean;
  readonly state: CocoSpecState;
  readonly answered: number;
  readonly total: number;
  readonly issues: readonly CocoSpecIssue[];
}

export interface CocoSpecArtifacts {
  readonly "prd.md": string;
  readonly "flow.mmd": string;
  readonly "data-model.mmd": string;
  readonly "acceptance.md": string;
  readonly "decisions.md": string;
  readonly "tasks.md": string;
}

interface QuestionDefinition extends CocoSpecQuestion {
  readonly minimumMode: CocoSpecMode;
  readonly applies?: (spec: CocoSpec) => boolean;
}

const modeRank: Readonly<Record<CocoSpecMode, number>> = { quick: 0, standard: 1, thorough: 2 };

const questionCatalog: readonly QuestionDefinition[] = [
  question("objective", "intent", "What user or business problem must this feature solve?", "Keeps implementation focused on an outcome instead of requested UI alone.", "text", "quick"),
  question("actors", "users", "Which user types or roles use this feature, and what permissions differ?", "Defines authorization boundaries and role-specific behavior.", "list", "quick"),
  question("success-outcome", "intent", "What observable outcome means the feature succeeded for the user?", "Provides a testable product outcome.", "text", "quick"),
  question("happy-path", "flow", "List the happy-path steps from entry to successful completion in order.", "Produces the primary user flow and implementation sequence.", "list", "quick", { responseHint: "Use an ordered JSON string array when answering through an AI agent." }),
  question("acceptance-criteria", "quality", "List the acceptance criteria that must be demonstrably true.", "Turns product intent into verifiable behavior.", "list", "quick", { responseHint: "Use concise Given/When/Then statements or a JSON string array." }),
  question("entry-points", "flow", "From which routes, screens, links, or external events can users enter this flow?", "Prevents missing navigation and deep-link behavior.", "list", "standard"),
  question("alternate-paths", "flow", "Which valid alternate paths can occur besides the happy path?", "Captures branches before they become implementation surprises.", "list", "standard"),
  question("error-states", "flow", "Which failures can occur, what should users see, and how can they recover?", "Defines recoverable, secure, and testable failure behavior.", "list", "standard"),
  question("out-of-scope", "intent", "What is explicitly outside this feature's scope?", "Stops adjacent requirements from silently expanding delivery.", "list", "standard"),
  question("existing-capabilities", "intent", "Which existing routes, components, services, schemas, or functions must be reused?", "Helps AI avoid redundant framework and application code.", "list", "standard"),
  question("ui-states", "interface", "Define initial, loading, empty, success, validation, disabled, and error UI states that apply.", "Makes the interface complete rather than happy-path-only.", "list", "standard"),
  question("accessibility", "interface", "What keyboard, focus, labeling, announcement, and contrast behavior is required?", "Makes accessibility part of the contract instead of a later patch.", "list", "standard"),
  question("responsive", "interface", "How should the feature behave from narrow mobile screens through large displays?", "Defines responsive behavior before layout implementation.", "text", "standard"),
  question("persistence", "data", "Does this feature use no persistence, existing data, new data, or both existing and new data?", "Determines whether a data model and migration plan are required.", "choice", "quick", { options: ["none", "existing", "new", "existing-and-new"] }),
  question("integrations", "integration", "Which internal services or external providers participate, including failure and timeout behavior?", "Makes integration ownership and degraded behavior explicit.", "list", "standard"),
  question("security-requirements", "quality", "What authentication, authorization, privacy, abuse-prevention, and sensitive-data rules apply?", "Prevents security decisions from being inferred during implementation.", "list", "standard"),
  question("observability", "quality", "Which safe events, metrics, traces, and alerts prove the feature is operating correctly?", "Defines production evidence without logging sensitive data.", "list", "thorough"),
  question("performance", "quality", "What latency, payload, concurrency, or browser-performance limits must hold?", "Turns non-functional expectations into measurable constraints.", "list", "thorough"),
  question("rollout", "delivery", "Does delivery require migration sequencing, feature flags, compatibility, or rollback behavior?", "Makes deployment and recovery part of the implementation plan.", "list", "thorough"),

  question("identity-methods", "authentication", "Which sign-in methods are supported: email, username, phone, passkey, magic link, OAuth, or another method?", "Determines validation, UI, provider, and credential-handling branches.", "list", "quick", { applies: isAuthenticationSpec }),
  question("account-source", "authentication", "Where do accounts and identity status come from, and does that source already exist?", "Avoids creating a second identity source or redundant user model.", "text", "standard", { applies: isAuthenticationSpec }),
  question("post-auth-destination", "authentication", "Where is the user sent after success, and may roles or return URLs change that destination?", "Defines redirect precedence and prevents unsafe open redirects.", "text", "quick", { applies: isAuthenticationSpec }),
  question("account-states", "authentication", "How should unverified, disabled, locked, deleted, or invitation-only accounts behave?", "Completes authentication beyond valid and invalid credentials.", "list", "standard", { applies: isAuthenticationSpec }),
  question("session-policy", "authentication", "Define session storage, lifetime, renewal, sign-out, remember-me, and concurrent-session behavior.", "Makes session security and user expectations explicit.", "structured", "standard", { applies: isAuthenticationSpec }),
  question("recovery", "authentication", "Are registration, password recovery, account verification, or step-up authentication included?", "Clarifies adjacent identity flows and scope.", "list", "standard", { applies: isAuthenticationSpec }),
  question("abuse-protection", "authentication", "Define rate limits, lockout behavior, bot protection, and security-event handling without leaking account existence.", "Protects the authentication boundary from enumeration and automated abuse.", "structured", "standard", { applies: isAuthenticationSpec }),
  question("oauth-providers", "authentication", "Which OAuth providers, scopes, callback URLs, and account-linking rules apply?", "Activates only when an OAuth method is requested.", "structured", "standard", { applies: usesOauth }),
  question("role-routing", "authentication", "List role-specific destinations and the authorization rule for each destination.", "Separates post-login navigation from actual route authorization.", "structured", "standard", { applies: usesRoles }),

  question("data-model", "data", "Define entities, fields, identifiers, constraints, and relationships needed by this feature.", "Produces an implementable database proposal without inventing schema details.", "structured", "standard", {
    applies: usesPersistence,
    responseHint: "Prefer { entities: [{ name, fields: [{ name, type, key, nullable }] }], relationships: [{ from, to, type, label }] }.",
  }),
  question("data-lifecycle", "data", "Define ownership, retention, deletion, audit, privacy, and backfill behavior for affected data.", "Completes the lifecycle beyond initial storage.", "structured", "thorough", { applies: usesPersistence }),
  question("migration-plan", "delivery", "How will existing data be migrated, validated, rolled back, and kept compatible during deployment?", "Prevents schema rollout from being left implicit.", "structured", "thorough", { applies: usesNewPersistence }),
];

/**
 * Converts a feature name into the stable lowercase identifier used by CocoSpecs directories and manifests.
 */
export function slugifyFeature(value: string): string {
  const slug = value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!slug) throw new Error("A CocoSpec feature name must contain at least one letter or number.");
  return slug;
}

/**
 * Creates a versioned draft CocoSpec and records the initial brief as the first product decision.
 */
export function createCocoSpec(options: CreateCocoSpecOptions): CocoSpec {
  const id = slugifyFeature(options.feature);
  const timestamp = timestampOf(options.now);
  const brief = options.brief?.trim() ?? "";
  const spec: CocoSpec = {
    version: COCOSPECS_VERSION,
    feature: {
      id,
      title: options.title?.trim() || titleFromSlug(id),
      brief,
    },
    mode: options.mode ?? "standard",
    state: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(options.project ? { project: normalizeProjectContext(options.project) } : {}),
    answers: brief ? {
      objective: { status: "answered", value: brief, updatedAt: timestamp },
    } : {},
  };
  return withDerivedState(spec);
}

/**
 * Parses untrusted JSON-compatible input into a validated CocoSpec document.
 */
export function parseCocoSpec(input: unknown): CocoSpec {
  if (!isRecord(input)) throw new Error("CocoSpec must be a JSON object.");
  if (input.version !== COCOSPECS_VERSION) throw new Error(`Unsupported CocoSpec version: ${String(input.version)}.`);
  if (!isRecord(input.feature)) throw new Error("CocoSpec feature is required.");
  const id = requiredString(input.feature.id, "feature.id");
  if (slugifyFeature(id) !== id) throw new Error("CocoSpec feature.id must be a stable lowercase slug.");
  const mode = input.mode;
  if (mode !== "quick" && mode !== "standard" && mode !== "thorough") throw new Error("CocoSpec mode is invalid.");
  const state = input.state;
  if (state !== "draft" && state !== "ready" && state !== "approved") throw new Error("CocoSpec state is invalid.");
  const createdAt = validTimestamp(input.createdAt, "createdAt");
  const updatedAt = validTimestamp(input.updatedAt, "updatedAt");
  if (!isRecord(input.answers)) throw new Error("CocoSpec answers must be an object.");
  const answers: Record<string, CocoSpecAnswer> = {};
  for (const [questionId, raw] of Object.entries(input.answers)) {
    if (!questionCatalog.some(({ id: knownId }) => knownId === questionId)) throw new Error(`Unknown CocoSpec question: ${questionId}.`);
    if (!isRecord(raw)) throw new Error(`CocoSpec answer ${questionId} must be an object.`);
    const status = raw.status;
    if (status !== "answered" && status !== "assumed" && status !== "deferred" && status !== "not-applicable") {
      throw new Error(`CocoSpec answer ${questionId} has an invalid status.`);
    }
    const answerUpdatedAt = validTimestamp(raw.updatedAt, `answers.${questionId}.updatedAt`);
    if (raw.value !== undefined && !isCocoSpecValue(raw.value)) throw new Error(`CocoSpec answer ${questionId} contains a non-JSON value.`);
    if ((status === "answered" || status === "assumed") && !hasMeaningfulValue(raw.value)) {
      throw new Error(`CocoSpec answer ${questionId} requires a value.`);
    }
    answers[questionId] = {
      status,
      ...(raw.value !== undefined ? { value: raw.value } : {}),
      updatedAt: answerUpdatedAt,
    };
  }
  const parsed: CocoSpec = {
    version: COCOSPECS_VERSION,
    feature: {
      id,
      title: requiredString(input.feature.title, "feature.title"),
      brief: typeof input.feature.brief === "string" ? input.feature.brief : "",
    },
    mode,
    state,
    createdAt,
    updatedAt,
    ...(input.project === undefined ? {} : { project: parseProjectContext(input.project) }),
    answers,
  };
  const complete = checkCocoSpec(parsed).complete;
  if (state === "approved" && !complete) throw new Error("An approved CocoSpec cannot contain unresolved required questions.");
  return parsed;
}

/**
 * Returns the currently applicable questions after evaluating mode, feature intent, and prior answers.
 */
export function questionsFor(spec: CocoSpec): readonly CocoSpecQuestion[] {
  return questionCatalog
    .filter(({ minimumMode, applies }) => modeRank[minimumMode] <= modeRank[spec.mode] && (applies?.(spec) ?? true))
    .map(({ minimumMode: _minimumMode, applies: _applies, ...question }) => question);
}

/**
 * Returns a small adaptive batch of unresolved questions for the next AI interview turn.
 */
export function nextQuestions(spec: CocoSpec, limit = 4): readonly CocoSpecQuestion[] {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("CocoSpec question limit must be a positive integer.");
  return questionsFor(spec).filter((question) => !isResolved(spec.answers[question.id])).slice(0, limit);
}

/**
 * Records one reviewed answer and invalidates prior approval when a product decision changes.
 */
export function answerCocoSpec(
  spec: CocoSpec,
  questionId: string,
  value: CocoSpecValue | undefined,
  options: AnswerCocoSpecOptions = {},
): CocoSpec {
  const active = questionsFor(spec).find(({ id }) => id === questionId);
  if (!active) throw new Error(`CocoSpec question is unknown or not currently applicable: ${questionId}.`);
  const status = options.status ?? "answered";
  if ((status === "answered" || status === "assumed") && !hasMeaningfulValue(value)) {
    throw new Error(`CocoSpec answer ${questionId} requires a value.`);
  }
  if (value !== undefined && !isCocoSpecValue(value)) throw new Error(`CocoSpec answer ${questionId} must be JSON-compatible.`);
  const timestamp = timestampOf(options.now);
  const draft: CocoSpec = {
    ...spec,
    state: "draft",
    updatedAt: timestamp,
    answers: {
      ...spec.answers,
      [questionId]: {
        status,
        ...(value !== undefined ? { value } : {}),
        updatedAt: timestamp,
      },
    },
  };
  return withDerivedState(draft);
}

/**
 * Checks adaptive question coverage and returns structured issues suitable for humans or AI agents.
 */
export function checkCocoSpec(spec: CocoSpec): CocoSpecCheckResult {
  const questions = questionsFor(spec);
  const issues: CocoSpecIssue[] = [];
  for (const question of questions) {
    if (!question.required) continue;
    const answer = spec.answers[question.id];
    if (!answer) {
      issues.push({
        questionId: question.id,
        section: question.section,
        code: "missing-answer",
        message: `Required question \"${question.prompt}\" has not been answered.`,
      });
    } else if (answer.status === "deferred") {
      issues.push({
        questionId: question.id,
        section: question.section,
        code: "deferred-answer",
        message: `Required question \"${question.prompt}\" is still deferred.`,
      });
    }
  }
  return {
    complete: issues.length === 0,
    state: spec.state,
    answered: questions.filter((question) => isResolved(spec.answers[question.id])).length,
    total: questions.length,
    issues,
  };
}

/**
 * Marks a complete specification as explicitly approved before implementation begins.
 */
export function approveCocoSpec(spec: CocoSpec, now?: string | Date): CocoSpec {
  const result = checkCocoSpec(spec);
  if (!result.complete) {
    throw new Error(`CocoSpec cannot be approved with unresolved questions: ${result.issues.map(({ questionId }) => questionId).join(", ")}.`);
  }
  return { ...spec, state: "approved", updatedAt: timestampOf(now) };
}

/**
 * Renders deterministic review artifacts from the canonical machine-readable CocoSpec.
 */
export function renderCocoSpecArtifacts(spec: CocoSpec): CocoSpecArtifacts {
  const check = checkCocoSpec(spec);
  const acceptance = valueLines(spec.answers["acceptance-criteria"]?.value);
  const pending = check.issues.map(({ questionId, message }) => `- [ ] \`${questionId}\`: ${message}`);
  const projectContext = [
    ...(spec.project?.routes?.map((route) => `- Route: \`${route}\``) ?? []),
    ...(spec.project?.islands?.map((island) => `- Island: \`${island}\``) ?? []),
    ...(spec.project?.dependencies?.map((dependency) => `- Dependency: \`${dependency}\``) ?? []),
  ];
  const prd = `# ${spec.feature.title}\n\n` +
    `> CocoSpecs v${spec.version} · ${spec.mode} mode · ${spec.state}\n\n` +
    `## Summary\n\n${answerText(spec, "objective", spec.feature.brief || "Pending product objective.")}\n\n` +
    `## Users and permissions\n\n${answerText(spec, "actors")}\n\n` +
    `## Success outcome\n\n${answerText(spec, "success-outcome")}\n\n` +
    `## Entry points\n\n${answerList(spec, "entry-points")}\n\n` +
    `## Happy path\n\n${answerList(spec, "happy-path", true)}\n\n` +
    `## Alternate and failure paths\n\n${answerList(spec, "alternate-paths")}\n\n${answerList(spec, "error-states")}\n\n` +
    `## Interface states\n\n${answerList(spec, "ui-states")}\n\n` +
    `### Accessibility\n\n${answerList(spec, "accessibility")}\n\n` +
    `### Responsive behavior\n\n${answerText(spec, "responsive")}\n\n` +
    `## Authentication and security\n\n${answersBySection(spec, "authentication")}\n\n${answerList(spec, "security-requirements")}\n\n` +
    `## Data and integrations\n\n${answersBySection(spec, "data")}\n\n${answerList(spec, "integrations")}\n\n` +
    `## Existing project context\n\n${projectContext.length ? projectContext.join("\n") : "No project snapshot was recorded."}\n\n` +
    `## Non-functional requirements\n\n${answersBySection(spec, "quality", new Set(["acceptance-criteria", "security-requirements"]))}\n\n` +
    `## Out of scope\n\n${answerList(spec, "out-of-scope")}\n\n` +
    `## Unresolved decisions\n\n${pending.length ? pending.join("\n") : "All required discovery questions are resolved."}\n`;

  return {
    "prd.md": prd,
    "flow.mmd": renderFlow(spec),
    "data-model.mmd": renderDataModel(spec),
    "acceptance.md": `# Acceptance Criteria: ${spec.feature.title}\n\n${acceptance.length ? acceptance.map((item) => `- [ ] ${item}`).join("\n") : "- [ ] Define acceptance criteria."}\n`,
    "decisions.md": renderDecisions(spec),
    "tasks.md": renderTasks(spec),
  };
}

function question(
  id: string,
  section: CocoSpecSection,
  prompt: string,
  why: string,
  type: CocoSpecQuestionType,
  minimumMode: CocoSpecMode,
  options: Partial<Pick<QuestionDefinition, "options" | "responseHint" | "applies">> = {},
): QuestionDefinition {
  return { id, section, prompt, why, type, minimumMode, required: true, ...options };
}

function withDerivedState(spec: CocoSpec): CocoSpec {
  return { ...spec, state: checkCocoSpec(spec).complete ? "ready" : "draft" };
}

function isResolved(answer: CocoSpecAnswer | undefined): boolean {
  return answer !== undefined && answer.status !== "deferred";
}

function isAuthenticationSpec(spec: CocoSpec): boolean {
  return /\b(auth|authentication|login|log-in|sign-in|signin|session|password|oauth|passkey|magic link)\b/i.test(featureText(spec));
}

function usesOauth(spec: CocoSpec): boolean {
  return isAuthenticationSpec(spec) && /\b(oauth|google|github|microsoft|apple|facebook|social)\b/i.test(valueText(spec.answers["identity-methods"]?.value));
}

function usesRoles(spec: CocoSpec): boolean {
  return isAuthenticationSpec(spec) && /\b(role|admin|administrator|staff|member|manager|moderator|permission)\b/i.test(valueText(spec.answers.actors?.value));
}

function usesPersistence(spec: CocoSpec): boolean {
  const value = valueText(spec.answers.persistence?.value).trim().toLowerCase();
  return value.length > 0 && !/^(none|no|not-applicable|n\/a)$/.test(value);
}

function usesNewPersistence(spec: CocoSpec): boolean {
  return usesPersistence(spec) && /\b(new|existing-and-new|both|migration|schema)\b/i.test(valueText(spec.answers.persistence?.value));
}

function featureText(spec: CocoSpec): string {
  return `${spec.feature.id} ${spec.feature.title} ${spec.feature.brief} ${valueText(spec.answers.objective?.value)}`;
}

function timestampOf(value?: string | Date): string {
  const date = value instanceof Date ? value : value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("CocoSpec timestamp is invalid.");
  return date.toISOString();
}

function validTimestamp(value: unknown, path: string): string {
  if (typeof value !== "string" || Number.isNaN(new Date(value).valueOf())) throw new Error(`CocoSpec ${path} must be an ISO timestamp.`);
  return value;
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`CocoSpec ${path} must be a non-empty string.`);
  return value;
}

function titleFromSlug(slug: string): string {
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function normalizeProjectContext(context: CocoSpecProjectContext): CocoSpecProjectContext {
  return {
    ...(context.routes ? { routes: sortedUnique(context.routes) } : {}),
    ...(context.islands ? { islands: sortedUnique(context.islands) } : {}),
    ...(context.dependencies ? { dependencies: sortedUnique(context.dependencies) } : {}),
  };
}

function parseProjectContext(input: unknown): CocoSpecProjectContext {
  if (!isRecord(input)) throw new Error("CocoSpec project context must be an object.");
  return normalizeProjectContext({
    ...(input.routes === undefined ? {} : { routes: stringArray(input.routes, "project.routes") }),
    ...(input.islands === undefined ? {} : { islands: stringArray(input.islands, "project.islands") }),
    ...(input.dependencies === undefined ? {} : { dependencies: stringArray(input.dependencies, "project.dependencies") }),
  });
}

function stringArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw new Error(`CocoSpec ${path} must be a string array.`);
  return value;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCocoSpecValue(value: unknown): value is CocoSpecValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isCocoSpecValue);
  return isRecord(value) && Object.values(value).every(isCocoSpecValue);
}

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null;
}

function valueText(value: CocoSpecValue | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function valueLines(value: CocoSpecValue | undefined): readonly string[] {
  if (Array.isArray(value)) return value.map(valueText).map(cleanListItem).filter(Boolean);
  if (typeof value !== "string") return value === undefined ? [] : [valueText(value)];
  const normalized = value.includes("->") ? value.split("->") : value.split(/\r?\n|;/);
  return normalized.map(cleanListItem).filter(Boolean);
}

function cleanListItem(value: string): string {
  return value.trim().replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "");
}

function answerText(spec: CocoSpec, id: string, fallback = "Pending decision."): string {
  const answer = spec.answers[id];
  if (!answer || answer.status === "deferred") return fallback;
  if (answer.status === "not-applicable") return "Not applicable.";
  return valueText(answer.value) || fallback;
}

function answerList(spec: CocoSpec, id: string, ordered = false): string {
  const answer = spec.answers[id];
  if (answer?.status === "not-applicable") return "Not applicable.";
  const lines = valueLines(answer?.value);
  if (!lines.length) return "Pending decision.";
  return lines.map((line, index) => ordered ? `${index + 1}. ${line}` : `- ${line}`).join("\n");
}

function answersBySection(spec: CocoSpec, section: CocoSpecSection, excluded = new Set<string>()): string {
  const entries = questionsFor(spec).filter((question) => question.section === section && !excluded.has(question.id));
  if (!entries.length) return "Not applicable.";
  return entries.map((entry) => `### ${entry.prompt}\n\n${answerText(spec, entry.id)}`).join("\n\n");
}

function renderFlow(spec: CocoSpec): string {
  const happy = valueLines(spec.answers["happy-path"]?.value);
  const errors = valueLines(spec.answers["error-states"]?.value);
  const lines = ["flowchart TD", `    start([${mermaidText(`Start: ${spec.feature.title}`)}])`];
  let previous = "start";
  happy.forEach((step, index) => {
    const id = `step${index + 1}`;
    lines.push(`    ${id}[\"${mermaidText(step)}\"]`, `    ${previous} --> ${id}`);
    previous = id;
  });
  lines.push(`    success([${mermaidText(answerText(spec, "success-outcome", "Successful completion"))}])`, `    ${previous} --> success`);
  errors.forEach((error, index) => {
    const id = `error${index + 1}`;
    lines.push(`    ${id}[\"${mermaidText(error)}\"]`, `    ${previous} -. failure .-> ${id}`);
  });
  return `${lines.join("\n")}\n`;
}

function renderDataModel(spec: CocoSpec): string {
  const answer = spec.answers["data-model"]?.value;
  if (!isRecord(answer) || !Array.isArray(answer.entities)) {
    return `flowchart TD\n    pending[\"${mermaidText(usesPersistence(spec) ? "Structured data model pending" : "No persistence required")}\"]\n`;
  }
  const entities = answer.entities.filter(isRecord);
  const lines = ["erDiagram"];
  for (const entity of entities) {
    const name = mermaidIdentifier(typeof entity.name === "string" ? entity.name : "Entity");
    lines.push(`    ${name} {`);
    const fields = Array.isArray(entity.fields) ? entity.fields.filter(isRecord) : [];
    if (!fields.length) lines.push("        string id PK");
    for (const field of fields) {
      const type = mermaidIdentifier(typeof field.type === "string" ? field.type : "string").toLowerCase();
      const fieldName = mermaidIdentifier(typeof field.name === "string" ? field.name : "field");
      const key = field.key === "PK" || field.key === "FK" || field.key === "UK" ? ` ${field.key}` : "";
      const comment = field.nullable === true ? ' "nullable"' : "";
      lines.push(`        ${type} ${fieldName}${key}${comment}`);
    }
    lines.push("    }");
  }
  const relationships = Array.isArray(answer.relationships) ? answer.relationships.filter(isRecord) : [];
  for (const relation of relationships) {
    const from = mermaidIdentifier(typeof relation.from === "string" ? relation.from : "Entity");
    const to = mermaidIdentifier(typeof relation.to === "string" ? relation.to : "Entity");
    const relationType = typeof relation.type === "string" && /^(\|\||o\|\||\}|\{)[|o}{.-]+$/.test(relation.type) ? relation.type : "||--o{";
    const label = mermaidText(typeof relation.label === "string" ? relation.label : "relates to");
    lines.push(`    ${from} ${relationType} ${to} : \"${label}\"`);
  }
  return `${lines.join("\n")}\n`;
}

function renderDecisions(spec: CocoSpec): string {
  const rows = questionsFor(spec).map((question) => {
    const answer = spec.answers[question.id];
    return `| \`${question.id}\` | ${question.section} | ${answer?.status ?? "pending"} | ${markdownCell(valueText(answer?.value)) || "—"} |`;
  });
  return `# Decision Log: ${spec.feature.title}\n\n| Decision | Area | Status | Value |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`;
}

function renderTasks(spec: CocoSpec): string {
  const tasks = [
    `- [${spec.state === "approved" ? "x" : " "}] Obtain explicit approval for \`spec.json\` and generated artifacts.`,
    "- [ ] Reuse the existing routes, components, contracts, and services recorded in the project context.",
    ...(usesPersistence(spec) ? ["- [ ] Implement and verify the approved data model and migration lifecycle."] : []),
    ...(isAuthenticationSpec(spec) ? ["- [ ] Implement authentication, session, authorization, redirect, and abuse-protection decisions."] : []),
    "- [ ] Implement the server-first happy path and all documented alternate and failure paths.",
    "- [ ] Implement accessible, responsive UI states; add an island only for genuine browser interaction.",
    "- [ ] Add focused tests for every acceptance criterion and relevant negative security case.",
    "- [ ] Run CocoFrame generation when contracts change, then run test, check, and inspect verification.",
  ];
  return `# Implementation Tasks: ${spec.feature.title}\n\n> Do not begin implementation until the canonical CocoSpec state is \`approved\`.\n\n${tasks.join("\n")}\n`;
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function mermaidText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', "'").replace(/[\r\n]+/g, " ").slice(0, 240);
}

function mermaidIdentifier(value: string): string {
  const identifier = value.trim().replace(/[^A-Za-z0-9_]/g, "_").replace(/^([0-9])/, "_$1");
  return identifier || "Entity";
}
