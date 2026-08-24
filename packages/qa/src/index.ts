export * from "./design.ts";

/** The persisted CocoQA contract version. */
export const COCOQA_VERSION = 1 as const;

export type CocoQaMode = "standard" | "thorough";
export type CocoQaState = "draft" | "ready" | "running" | "failed" | "passed" | "approved";
export type CocoQaAnswerStatus = "answered" | "assumed" | "deferred" | "not-applicable";
export type CocoQaResultStatus = "pending" | "running" | "passed" | "failed" | "blocked" | "not-applicable";
export type CocoQaCategory = "functional" | "edge-case" | "accessibility" | "responsive" | "security" | "performance" | "compatibility" | "visual";
export type CocoQaSeverity = "critical" | "high" | "medium" | "low";

export type CocoQaValue = null | string | number | boolean | readonly CocoQaValue[] | { readonly [key: string]: CocoQaValue };

export interface CocoQaSource {
  readonly kind: "cocospec" | "cocoref" | "design-profile" | "manual";
  readonly id: string;
  readonly file?: string;
  readonly state: string;
}

export interface CocoQaQuestion {
  readonly id: string;
  readonly category: CocoQaCategory;
  readonly prompt: string;
  readonly why: string;
  readonly responseHint?: string;
  readonly required: true;
}

export interface CocoQaAnswer {
  readonly status: CocoQaAnswerStatus;
  readonly value?: CocoQaValue;
  readonly updatedAt: string;
}

export interface CocoQaCase {
  readonly id: string;
  readonly title: string;
  readonly category: CocoQaCategory;
  readonly source: string;
  readonly required: boolean;
  readonly status: Exclude<CocoQaResultStatus, "running">;
  readonly evidence?: string;
  readonly updatedAt?: string;
}

export interface CocoQaGate {
  readonly id: string;
  readonly script: string;
  readonly required: boolean;
  readonly status: CocoQaResultStatus;
  readonly durationMs?: number;
  readonly exitCode?: number;
  readonly updatedAt?: string;
}

export interface CocoQaDefect {
  readonly id: string;
  readonly title: string;
  readonly severity: CocoQaSeverity;
  readonly status: "open" | "resolved" | "accepted";
  readonly steps: readonly string[];
  readonly expected?: string;
  readonly actual?: string;
  readonly evidence?: string;
  readonly resolution?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CocoQa {
  readonly version: typeof COCOQA_VERSION;
  readonly feature: { readonly id: string; readonly title: string };
  readonly mode: CocoQaMode;
  readonly state: CocoQaState;
  readonly sources: readonly CocoQaSource[];
  readonly answers: Readonly<Record<string, CocoQaAnswer>>;
  readonly cases: readonly CocoQaCase[];
  readonly gates: readonly CocoQaGate[];
  readonly defects: readonly CocoQaDefect[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedAt?: string;
}

export interface CreateCocoQaOptions {
  readonly feature: string;
  readonly title?: string;
  readonly mode?: CocoQaMode;
  readonly sources?: readonly CocoQaSource[];
  readonly acceptanceCriteria?: readonly string[];
  readonly referenceCriteria?: readonly { readonly id: string; readonly description: string }[];
  readonly designCriteria?: readonly { readonly id: string; readonly description: string; readonly category: "visual" | "responsive" | "accessibility" }[];
  readonly gates?: readonly { readonly id: string; readonly script: string; readonly required?: boolean }[];
  readonly now?: string | Date;
}

export interface CocoQaCheckIssue {
  readonly kind: "question" | "case" | "gate" | "defect";
  readonly id: string;
  readonly message: string;
}

export interface CocoQaCheckResult {
  readonly passed: boolean;
  readonly state: CocoQaState;
  readonly issues: readonly CocoQaCheckIssue[];
}

export interface CocoQaArtifacts {
  readonly "test-plan.md": string;
  readonly "traceability.md": string;
  readonly "qa-report.md": string;
  readonly "defects.md": string;
}

const questionCatalog: readonly (CocoQaQuestion & { readonly minimumMode: CocoQaMode; readonly applies?: (qa: CocoQa) => boolean })[] = [
  question("target-environments", "compatibility", "Which environments must this feature pass in?", "Defines the actual release targets instead of assuming local development is sufficient.", "List local, staging, production-like, edge, or other required environments.", "standard"),
  question("browsers-devices", "responsive", "Which browsers, devices, and viewport ranges are required?", "Makes compatibility and responsive coverage explicit.", "List browser families, device classes, and minimum/maximum viewport widths.", "standard"),
  question("test-data", "functional", "Which fixtures, accounts, roles, and data states are safe to use?", "Prevents tests from inventing credentials or mutating unsafe data.", "Describe sanitized fixtures and setup/cleanup requirements; never include secrets.", "standard"),
  question("release-blockers", "functional", "Which failures must block release, and which results may be explicitly waived?", "Aligns pass/fail policy before execution.", "List release-blocking severities, gates, and any allowed waiver authority.", "standard"),
  question("accessibility-target", "accessibility", "Which accessibility standard and assistive interactions must be verified?", "A reference or happy path may omit keyboard, focus, labels, and screen-reader behavior.", "For example: WCAG 2.2 AA, keyboard-only flow, focus order, and live announcements.", "standard"),
  question("security-abuse", "security", "Which security, authorization, privacy, and abuse cases require negative testing?", "Successful behavior alone does not prove safe failure behavior.", "List unauthorized roles, malformed input, CSRF/CSP, rate limits, data exposure, and logging constraints.", "standard"),
  question("performance-thresholds", "performance", "Which measurable performance thresholds must pass?", "Avoids subjective performance approval.", "Provide relevant latency, bundle, throughput, or rendering budgets and measurement conditions.", "thorough"),
  question("compatibility-risks", "compatibility", "Which migrations, integrations, or legacy behaviors require regression coverage?", "Makes cross-system and upgrade risk visible.", "List affected versions, contracts, integrations, rollback checks, and unchanged behavior.", "thorough"),
  question("exploratory-charter", "edge-case", "Which areas need exploratory testing beyond scripted acceptance cases?", "Scripted checks rarely cover every interaction or unusual sequence.", "Describe risk-focused charters, time boxes, and evidence expectations.", "thorough"),
  question("design-profile-scope", "visual", "Which approved Design Profile, theme states, and component inventory are in scope?", "Binds design evidence to the reviewed token and reusable-component state.", "Record the profile, themes, profile hash, inventory source, and any approved component exceptions.", "standard", hasDesignCases),
  question("design-evidence", "visual", "Which measurements and manual reviews must prove each Product Design Quality principle?", "Turns spacing, color, iconography, overflow, contrast, and fidelity expectations into traceable evidence.", "Map each design case to sanitized screenshots, computed measurements, accessibility results, or reviewer evidence.", "standard", hasDesignCases),
  question("design-viewports", "responsive", "Which exact viewport, zoom, theme, and interaction states require visual verification?", "Prevents a single desktop screenshot from being treated as complete responsive evidence.", "Include 320, 390, 768, 1366, 4K, text zoom, and any reference-specific states that apply.", "standard", hasDesignCases),
  question("design-waivers", "visual", "Who may accept low- or medium-severity design deviations, and which deviations always block release?", "Keeps visual approval explicit while preventing critical accessibility or overflow defects from being waived casually.", "Name the reviewer role and state that critical/high contrast, accessibility, destructive overflow, and unapproved-component defects block release.", "thorough", hasDesignCases),
];

/** Creates a versioned QA plan with traceable acceptance, reference, and framework cases. */
export function createCocoQa(options: CreateCocoQaOptions): CocoQa {
  const id = slugifyCocoQa(options.feature);
  const now = timestampOf(options.now);
  const acceptance = uniqueStrings(options.acceptanceCriteria ?? []);
  const references = options.referenceCriteria ?? [];
  const design = options.designCriteria ?? [];
  const cases: CocoQaCase[] = [
    ...acceptance.map((title, index): CocoQaCase => ({ id: `acceptance-${index + 1}`, title, category: "functional", source: `cocospec:acceptance-${index + 1}`, required: true, status: "pending" })),
    ...references.map((item): CocoQaCase => ({ id: `reference-${slugifyCocoQa(item.id)}`, title: `Approved reference component: ${requiredString(item.description, "reference description")}`, category: "visual", source: `cocoref:${slugifyCocoQa(item.id)}`, required: true, status: "pending" })),
    ...design.map((item): CocoQaCase => ({ id: "design-" + slugifyCocoQa(item.id), title: requiredString(item.description, "design criterion description"), category: item.category, source: "design:" + slugifyCocoQa(item.id), required: true, status: "pending" })),
    { id: "framework-server-first", title: "Useful server-rendered output exists without browser JavaScript.", category: "compatibility", source: "cocoframe:server-first", required: true, status: "pending" },
    { id: "framework-accessibility", title: "Keyboard, focus, labels, errors, and semantic structure satisfy the approved accessibility target.", category: "accessibility", source: "cocoframe:accessibility", required: true, status: "pending" },
    { id: "framework-responsive", title: "The feature remains usable across the approved viewport and device range without horizontal overflow.", category: "responsive", source: "cocoframe:responsive", required: true, status: "pending" },
  ];
  const gates = (options.gates ?? []).map((gate): CocoQaGate => ({
    id: slugifyCocoQa(gate.id),
    script: safeScriptName(gate.script),
    required: gate.required ?? true,
    status: "pending",
  }));
  const draft: CocoQa = {
    version: COCOQA_VERSION,
    feature: { id, title: options.title?.trim() || titleFromSlug(id) },
    mode: options.mode ?? "standard",
    state: "draft",
    sources: uniqueSources(options.sources ?? [{ kind: "manual", id, state: "reviewed" }]),
    answers: {},
    cases: uniqueCases(cases),
    gates: uniqueGates(gates),
    defects: [],
    createdAt: now,
    updatedAt: now,
  };
  return withDerivedState(draft);
}

/** Returns the applicable QA interview questions for the selected depth. */
export function cocoQaQuestions(qa: CocoQa): readonly CocoQaQuestion[] {
  return questionCatalog
    .filter(({ minimumMode, applies }) => (qa.mode === "thorough" || minimumMode === "standard") && (applies?.(qa) ?? true))
    .map(({ minimumMode: _minimumMode, applies: _applies, ...item }) => item);
}

/** Returns at most four unresolved QA questions for the next interview turn. */
export function nextCocoQaQuestions(qa: CocoQa, limit = 4): readonly CocoQaQuestion[] {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("CocoQA question limit must be a positive integer.");
  return cocoQaQuestions(qa).filter(({ id }) => !resolvedAnswer(qa.answers[id])).slice(0, limit);
}

/** Records one reviewed QA decision and invalidates prior approval. */
export function answerCocoQa(
  qa: CocoQa,
  questionId: string,
  value: CocoQaValue | undefined,
  options: { readonly status?: CocoQaAnswerStatus; readonly now?: string | Date } = {},
): CocoQa {
  if (!cocoQaQuestions(qa).some(({ id }) => id === questionId)) throw new Error(`Unknown or inactive CocoQA question: ${questionId}.`);
  const status = options.status ?? "answered";
  if ((status === "answered" || status === "assumed") && !meaningful(value)) throw new Error(`CocoQA answer ${questionId} requires a value.`);
  if (value !== undefined && !isValue(value)) throw new Error(`CocoQA answer ${questionId} must be JSON-compatible.`);
  const timestamp = timestampOf(options.now);
  const { approvedAt: _approvedAt, ...unapproved } = qa;
  return withDerivedState({
    ...unapproved,
    answers: { ...qa.answers, [questionId]: { status, ...(value !== undefined ? { value } : {}), updatedAt: timestamp } },
    updatedAt: timestamp,
  });
}

/** Records an automated gate state without storing potentially sensitive process output. */
export function recordCocoQaGate(
  qa: CocoQa,
  gateId: string,
  status: CocoQaGate["status"],
  options: { readonly durationMs?: number; readonly exitCode?: number; readonly now?: string | Date } = {},
): CocoQa {
  const id = slugifyCocoQa(gateId);
  const index = qa.gates.findIndex((gate) => gate.id === id);
  if (index < 0) throw new Error(`Unknown CocoQA gate: ${id}.`);
  if (status === "not-applicable" && qa.gates[index]!.required) throw new Error(`Required CocoQA gate ${id} cannot be not-applicable.`);
  const timestamp = timestampOf(options.now);
  const gates = [...qa.gates];
  gates[index] = {
    ...gates[index]!, status,
    ...(options.durationMs === undefined ? {} : { durationMs: nonNegativeInteger(options.durationMs, "gate durationMs") }),
    ...(options.exitCode === undefined ? {} : { exitCode: integer(options.exitCode, "gate exitCode") }),
    updatedAt: timestamp,
  };
  return invalidateApproval({ ...qa, gates, updatedAt: timestamp });
}

/** Records manual or automated evidence for one traceable QA case. */
export function recordCocoQaCase(
  qa: CocoQa,
  caseId: string,
  status: CocoQaCase["status"],
  evidence?: string,
  now?: string | Date,
): CocoQa {
  const id = slugifyCocoQa(caseId);
  const index = qa.cases.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`Unknown CocoQA case: ${id}.`);
  if (status === "not-applicable" && qa.cases[index]!.required) throw new Error(`Required CocoQA case ${id} cannot be not-applicable.`);
  if ((status === "passed" || status === "failed" || status === "blocked") && !evidence?.trim()) throw new Error(`CocoQA case ${id} requires concise evidence.`);
  const timestamp = timestampOf(now);
  const cases = [...qa.cases];
  cases[index] = { ...cases[index]!, status, ...(evidence?.trim() ? { evidence: evidence.trim() } : {}), updatedAt: timestamp };
  return invalidateApproval({ ...qa, cases, updatedAt: timestamp });
}

/** Adds a reproducible defect to the QA record. */
export function addCocoQaDefect(
  qa: CocoQa,
  input: Omit<CocoQaDefect, "status" | "createdAt" | "updatedAt">,
  now?: string | Date,
): CocoQa {
  const id = slugifyCocoQa(input.id);
  if (qa.defects.some((defect) => defect.id === id)) throw new Error(`CocoQA defect already exists: ${id}.`);
  const timestamp = timestampOf(now);
  const steps = uniqueStrings(input.steps);
  if (!steps.length) throw new Error("CocoQA defect requires reproduction steps.");
  const defect: CocoQaDefect = {
    id,
    title: requiredString(input.title, "defect title"),
    severity: validSeverity(input.severity),
    status: "open",
    steps,
    ...(input.expected?.trim() ? { expected: input.expected.trim() } : {}),
    ...(input.actual?.trim() ? { actual: input.actual.trim() } : {}),
    ...(input.evidence?.trim() ? { evidence: input.evidence.trim() } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return invalidateApproval({ ...qa, defects: [...qa.defects, defect], updatedAt: timestamp });
}

/** Resolves or explicitly accepts one defect with a required rationale. */
export function closeCocoQaDefect(
  qa: CocoQa,
  defectId: string,
  status: "resolved" | "accepted",
  resolution: string,
  now?: string | Date,
): CocoQa {
  const id = slugifyCocoQa(defectId);
  const index = qa.defects.findIndex((defect) => defect.id === id);
  if (index < 0) throw new Error(`Unknown CocoQA defect: ${id}.`);
  if (status === "accepted" && (qa.defects[index]!.severity === "critical" || qa.defects[index]!.severity === "high")) {
    throw new Error("Critical or high CocoQA defects must be resolved, not accepted.");
  }
  const timestamp = timestampOf(now);
  const defects = [...qa.defects];
  defects[index] = { ...defects[index]!, status, resolution: requiredString(resolution, "defect resolution"), updatedAt: timestamp };
  return invalidateApproval({ ...qa, defects, updatedAt: timestamp });
}

/** Checks interview completeness, required results, and unresolved defects. */
export function checkCocoQa(qa: CocoQa): CocoQaCheckResult {
  const issues: CocoQaCheckIssue[] = [];
  for (const item of cocoQaQuestions(qa)) {
    const answer = qa.answers[item.id];
    if (!answer || answer.status === "deferred") issues.push({ kind: "question", id: item.id, message: `Required QA decision is unresolved: ${item.prompt}` });
  }
  for (const item of qa.cases.filter(({ required }) => required)) {
    if (item.status !== "passed") issues.push({ kind: "case", id: item.id, message: `Required QA case is ${item.status}: ${item.title}` });
  }
  for (const gate of qa.gates.filter(({ required }) => required)) {
    if (gate.status !== "passed") issues.push({ kind: "gate", id: gate.id, message: `Required quality gate is ${gate.status}: npm run ${gate.script}` });
  }
  for (const defect of qa.defects.filter(({ status }) => status === "open")) {
    issues.push({ kind: "defect", id: defect.id, message: `Open ${defect.severity} defect: ${defect.title}` });
  }
  return { passed: issues.length === 0, state: qa.state, issues };
}

/** Marks a fully passing QA record as explicitly approved for release. */
export function approveCocoQa(qa: CocoQa, now?: string | Date): CocoQa {
  const result = checkCocoQa(qa);
  if (!result.passed) throw new Error(`CocoQA cannot be approved with ${result.issues.length} unresolved issue(s).`);
  const timestamp = timestampOf(now);
  return { ...qa, state: "approved", approvedAt: timestamp, updatedAt: timestamp };
}

/** Validates a canonical persisted CocoQA record. */
export function parseCocoQa(value: unknown): CocoQa {
  if (!isRecord(value)) throw new Error("CocoQA must be an object.");
  if (value.version !== COCOQA_VERSION) throw new Error(`Unsupported CocoQA version: ${String(value.version)}.`);
  if (!isRecord(value.feature)) throw new Error("CocoQA feature must be an object.");
  const mode = value.mode;
  if (mode !== "standard" && mode !== "thorough") throw new Error("CocoQA mode is invalid.");
  if (!Array.isArray(value.sources) || !Array.isArray(value.cases) || !Array.isArray(value.gates) || !Array.isArray(value.defects) || !isRecord(value.answers)) {
    throw new Error("CocoQA sources, answers, cases, gates, and defects have invalid containers.");
  }
  const createdAt = validTimestamp(value.createdAt, "createdAt");
  const updatedAt = validTimestamp(value.updatedAt, "updatedAt");
  const answers: Record<string, CocoQaAnswer> = {};
  for (const [id, raw] of Object.entries(value.answers)) {
    if (!isRecord(raw)) throw new Error(`CocoQA answer ${id} must be an object.`);
    const status = raw.status;
    if (status !== "answered" && status !== "assumed" && status !== "deferred" && status !== "not-applicable") throw new Error(`CocoQA answer ${id} status is invalid.`);
    if (raw.value !== undefined && !isValue(raw.value)) throw new Error(`CocoQA answer ${id} value is invalid.`);
    answers[id] = { status, ...(raw.value !== undefined ? { value: raw.value } : {}), updatedAt: validTimestamp(raw.updatedAt, `answer ${id} updatedAt`) };
  }
  const parsed: CocoQa = {
    version: COCOQA_VERSION,
    feature: { id: slugifyCocoQa(requiredString(value.feature.id, "feature id")), title: requiredString(value.feature.title, "feature title") },
    mode,
    state: "draft",
    sources: uniqueSources(value.sources.map(parseSource)),
    answers,
    cases: uniqueCases(value.cases.map(parseCase)),
    gates: uniqueGates(value.gates.map(parseGate)),
    defects: uniqueDefects(value.defects.map(parseDefect)),
    createdAt,
    updatedAt,
    ...(value.approvedAt === undefined ? {} : { approvedAt: validTimestamp(value.approvedAt, "approvedAt") }),
  };
  const derived = parsed.approvedAt ? { ...parsed, state: "approved" as const } : withDerivedState(parsed);
  if (value.state !== derived.state) throw new Error(`CocoQA state is inconsistent: expected ${derived.state}.`);
  if (derived.state === "approved" && !checkCocoQa(derived).passed) throw new Error("Approved CocoQA contains unresolved issues.");
  return derived;
}

/** Renders deterministic QA plan, traceability, report, and defect views. */
export function renderCocoQaArtifacts(qa: CocoQa): CocoQaArtifacts {
  const questions = cocoQaQuestions(qa).map((item) => `- **${item.prompt}** ${answerText(qa.answers[item.id])}`);
  const cases = qa.cases.map((item) => `| \`${item.id}\` | ${item.category} | ${item.required ? "yes" : "no"} | ${item.status} | ${cell(item.title)} | ${cell(item.evidence ?? "—")} |`);
  const gates = qa.gates.map((gate) => `| \`${gate.id}\` | \`npm run ${gate.script}\` | ${gate.required ? "yes" : "no"} | ${gate.status} | ${gate.durationMs ?? "—"} |`);
  const defects = qa.defects.map((defect) => `| \`${defect.id}\` | ${defect.severity} | ${defect.status} | ${cell(defect.title)} | ${cell(defect.resolution ?? "—")} |`);
  const traceability = qa.cases.map((item) => `| ${cell(item.source)} | \`${item.id}\` | ${item.status} | ${cell(item.evidence ?? "—")} |`);
  const result = checkCocoQa(qa);
  return {
    "test-plan.md": `# Test Plan: ${qa.feature.title}\n\n> CocoQA v${qa.version} · ${qa.mode} · ${qa.state}\n\n## Sources\n\n${qa.sources.map((source) => `- ${source.kind}: \`${source.id}\` (${source.state})${source.file ? ` — \`${source.file}\`` : ""}`).join("\n")}\n\n## QA decisions\n\n${questions.join("\n")}\n\n## Test cases\n\n| Case | Category | Required | Status | Intent | Evidence |\n| --- | --- | --- | --- | --- | --- |\n${cases.join("\n")}\n\n## Automated gates\n\n| Gate | Command | Required | Status | Duration ms |\n| --- | --- | --- | --- | --- |\n${gates.join("\n") || "| — | — | — | No configured gate | — |"}\n`,
    "traceability.md": `# Traceability: ${qa.feature.title}\n\n| Source requirement | QA case | Status | Evidence |\n| --- | --- | --- | --- |\n${traceability.join("\n")}\n`,
    "qa-report.md": `# QA Report: ${qa.feature.title}\n\n**Result:** ${result.passed ? "PASS" : "NOT READY"}\n\n**State:** ${qa.state}\n\n## Automated gates\n\n| Gate | Command | Required | Status | Duration ms |\n| --- | --- | --- | --- | --- |\n${gates.join("\n") || "| — | — | — | No configured gate | — |"}\n\n## Unresolved issues\n\n${result.issues.map((issue) => `- [ ] ${issue.kind} \`${issue.id}\`: ${issue.message}`).join("\n") || "No unresolved issues."}\n`,
    "defects.md": `# Defects: ${qa.feature.title}\n\n| Defect | Severity | Status | Title | Resolution |\n| --- | --- | --- | --- | --- |\n${defects.join("\n") || "| — | — | — | No defects recorded. | — |"}\n\n${qa.defects.map((defect) => `## ${defect.id}: ${defect.title}\n\n${defect.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\n- Expected: ${defect.expected ?? "Not recorded."}\n- Actual: ${defect.actual ?? "Not recorded."}\n- Evidence: ${defect.evidence ?? "Not recorded."}\n`).join("\n")}\n`,
  };
}

/** Converts labels to safe stable identifiers. */
export function slugifyCocoQa(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("CocoQA identifier must contain at least one letter or number.");
  return slug;
}

function withDerivedState(qa: CocoQa): CocoQa {
  let state: CocoQaState;
  if (qa.gates.some(({ status }) => status === "running")) state = "running";
  else if (qa.gates.some(({ required, status }) => required && status === "failed") || qa.cases.some(({ required, status }) => required && (status === "failed" || status === "blocked")) || qa.defects.some(({ status }) => status === "open")) state = "failed";
  else if (!cocoQaQuestions(qa).every(({ id }) => resolvedAnswer(qa.answers[id]))) state = "draft";
  else if (checkCocoQaWithoutState(qa)) state = "passed";
  else state = "ready";
  return { ...qa, state };
}

function invalidateApproval(qa: CocoQa): CocoQa {
  const { approvedAt: _approvedAt, ...unapproved } = qa;
  return withDerivedState(unapproved);
}

function checkCocoQaWithoutState(qa: CocoQa): boolean {
  return qa.cases.filter(({ required }) => required).every(({ status }) => status === "passed")
    && qa.gates.filter(({ required }) => required).every(({ status }) => status === "passed")
    && qa.defects.every(({ status }) => status !== "open");
}

function question(id: string, category: CocoQaCategory, prompt: string, why: string, responseHint: string, minimumMode: CocoQaMode, applies?: (qa: CocoQa) => boolean) {
  return { id, category, prompt, why, responseHint, minimumMode, ...(applies ? { applies } : {}), required: true as const };
}

function hasDesignCases(qa: CocoQa): boolean {
  return qa.cases.some(({ source }) => source.startsWith("design:"));
}

function resolvedAnswer(answer: CocoQaAnswer | undefined): boolean { return answer !== undefined && answer.status !== "deferred"; }
function answerText(answer: CocoQaAnswer | undefined): string { return !answer || answer.status === "deferred" ? "Pending." : answer.status === "not-applicable" ? "Not applicable." : valueText(answer.value); }
function valueText(value: CocoQaValue | undefined): string { return value === undefined ? "Pending." : typeof value === "string" ? value : JSON.stringify(value); }

function parseSource(value: unknown): CocoQaSource {
  if (!isRecord(value)) throw new Error("CocoQA source must be an object.");
  if (value.kind !== "cocospec" && value.kind !== "cocoref" && value.kind !== "design-profile" && value.kind !== "manual") throw new Error("CocoQA source kind is invalid.");
  return { kind: value.kind, id: slugifyCocoQa(requiredString(value.id, "source id")), ...(typeof value.file === "string" ? { file: safeRelative(value.file, "source file") } : {}), state: requiredString(value.state, "source state") };
}

function parseCase(value: unknown): CocoQaCase {
  if (!isRecord(value)) throw new Error("CocoQA case must be an object.");
  const status = resultStatus(value.status, false) as CocoQaCase["status"];
  return { id: slugifyCocoQa(requiredString(value.id, "case id")), title: requiredString(value.title, "case title"), category: category(value.category), source: requiredString(value.source, "case source"), required: boolean(value.required, "case required"), status, ...(typeof value.evidence === "string" ? { evidence: value.evidence } : {}), ...(value.updatedAt === undefined ? {} : { updatedAt: validTimestamp(value.updatedAt, "case updatedAt") }) };
}

function parseGate(value: unknown): CocoQaGate {
  if (!isRecord(value)) throw new Error("CocoQA gate must be an object.");
  return { id: slugifyCocoQa(requiredString(value.id, "gate id")), script: safeScriptName(value.script), required: boolean(value.required, "gate required"), status: resultStatus(value.status, true), ...(value.durationMs === undefined ? {} : { durationMs: nonNegativeInteger(value.durationMs, "gate durationMs") }), ...(value.exitCode === undefined ? {} : { exitCode: integer(value.exitCode, "gate exitCode") }), ...(value.updatedAt === undefined ? {} : { updatedAt: validTimestamp(value.updatedAt, "gate updatedAt") }) };
}

function parseDefect(value: unknown): CocoQaDefect {
  if (!isRecord(value) || !Array.isArray(value.steps)) throw new Error("CocoQA defect must be an object with steps.");
  if (value.status !== "open" && value.status !== "resolved" && value.status !== "accepted") throw new Error("CocoQA defect status is invalid.");
  return { id: slugifyCocoQa(requiredString(value.id, "defect id")), title: requiredString(value.title, "defect title"), severity: validSeverity(value.severity), status: value.status, steps: uniqueStrings(value.steps.map((step) => requiredString(step, "defect step"))), ...(typeof value.expected === "string" ? { expected: value.expected } : {}), ...(typeof value.actual === "string" ? { actual: value.actual } : {}), ...(typeof value.evidence === "string" ? { evidence: value.evidence } : {}), ...(typeof value.resolution === "string" ? { resolution: value.resolution } : {}), createdAt: validTimestamp(value.createdAt, "defect createdAt"), updatedAt: validTimestamp(value.updatedAt, "defect updatedAt") };
}

function uniqueSources(values: readonly CocoQaSource[]): readonly CocoQaSource[] { return uniqueBy(values.map(parseSource), (item) => `${item.kind}:${item.id}`, "source"); }
function uniqueCases(values: readonly CocoQaCase[]): readonly CocoQaCase[] { return uniqueBy(values.map(parseCase), (item) => item.id, "case"); }
function uniqueGates(values: readonly CocoQaGate[]): readonly CocoQaGate[] { return uniqueBy(values.map(parseGate), (item) => item.id, "gate"); }
function uniqueDefects(values: readonly CocoQaDefect[]): readonly CocoQaDefect[] { return uniqueBy(values, (item) => item.id, "defect"); }

function uniqueBy<T>(values: readonly T[], key: (item: T) => string, name: string): readonly T[] {
  const map = new Map(values.map((item) => [key(item), item]));
  if (map.size !== values.length) throw new Error(`CocoQA ${name} IDs must be unique.`);
  return [...map.values()];
}

function uniqueStrings(values: readonly string[]): readonly string[] { return [...new Set(values.map((value) => requiredString(value, "list item")))]; }
function safeScriptName(value: unknown): string { const script = requiredString(value, "script"); if (!/^[a-zA-Z0-9:_-]+$/.test(script)) throw new Error("CocoQA script must be a package.json script name."); return script; }
function safeRelative(value: string, name: string): string { const file = requiredString(value, name).replaceAll("\\", "/"); if (file.startsWith("/") || /^[A-Za-z]:\//.test(file) || file.split("/").includes("..")) throw new Error(`CocoQA ${name} must be project-relative.`); return file; }
function validSeverity(value: unknown): CocoQaSeverity { if (value !== "critical" && value !== "high" && value !== "medium" && value !== "low") throw new Error("CocoQA severity is invalid."); return value; }
function category(value: unknown): CocoQaCategory { const values: readonly CocoQaCategory[] = ["functional", "edge-case", "accessibility", "responsive", "security", "performance", "compatibility", "visual"]; if (!values.includes(value as CocoQaCategory)) throw new Error("CocoQA category is invalid."); return value as CocoQaCategory; }
function resultStatus(value: unknown, running: boolean): CocoQaResultStatus { const values: readonly CocoQaResultStatus[] = ["pending", ...(running ? ["running" as const] : []), "passed", "failed", "blocked", "not-applicable"]; if (!values.includes(value as CocoQaResultStatus)) throw new Error("CocoQA result status is invalid."); return value as CocoQaResultStatus; }
function boolean(value: unknown, name: string): boolean { if (typeof value !== "boolean") throw new Error(`CocoQA ${name} must be boolean.`); return value; }
function integer(value: unknown, name: string): number { if (!Number.isSafeInteger(value)) throw new Error(`CocoQA ${name} must be an integer.`); return value as number; }
function nonNegativeInteger(value: unknown, name: string): number { const result = integer(value, name); if (result < 0) throw new Error(`CocoQA ${name} must be non-negative.`); return result; }
function requiredString(value: unknown, name: string): string { if (typeof value !== "string" || !value.trim()) throw new Error(`CocoQA ${name} must be a non-empty string.`); return value.trim(); }
function validTimestamp(value: unknown, name: string): string { if (typeof value !== "string" || Number.isNaN(new Date(value).valueOf())) throw new Error(`CocoQA ${name} must be an ISO timestamp.`); return value; }
function timestampOf(value?: string | Date): string { const date = value instanceof Date ? value : value === undefined ? new Date() : new Date(value); if (Number.isNaN(date.valueOf())) throw new Error("CocoQA timestamp is invalid."); return date.toISOString(); }
function titleFromSlug(slug: string): string { return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
function cell(value: string): string { return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>"); }
function meaningful(value: unknown): boolean { if (typeof value === "string") return value.trim().length > 0; if (Array.isArray(value)) return value.length > 0; if (isRecord(value)) return Object.keys(value).length > 0; return value !== undefined && value !== null; }
function isValue(value: unknown): value is CocoQaValue { if (value === null || typeof value === "string" || typeof value === "boolean") return true; if (typeof value === "number") return Number.isFinite(value); if (Array.isArray(value)) return value.every(isValue); return isRecord(value) && Object.values(value).every(isValue); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
