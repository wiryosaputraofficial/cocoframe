import { spawn } from "node:child_process";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCocoRef, slugifyCocoRef } from "@cocoframe/cocoref";
import {
  addCocoQaDefect,
  answerCocoQa,
  approveCocoQa,
  checkCocoQa,
  closeCocoQaDefect,
  createCocoQa,
  nextCocoQaQuestions,
  parseCocoQa,
  parseDesignProfile,
  hashDesignProfile,
  productDesignCriteria,
  auditProductDesign,
  recordCocoQaCase,
  recordCocoQaGate,
  renderCocoQaArtifacts,
  slugifyCocoQa,
  type CocoQa,
  type CocoQaAnswerStatus,
  type CocoQaMode,
  type CocoQaResultStatus,
  type CocoQaSeverity,
  type CocoQaValue,
} from "@cocoframe/qa";
import { parseCocoSpec, slugifyFeature, type CocoSpecValue } from "@cocoframe/specs";

interface QaCommandIo {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

interface ParsedArguments {
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string | true>>;
}

const artifactNames = ["test-plan.md", "traceability.md", "qa-report.md", "defects.md"] as const;
const qualityScripts = ["check", "test", "inspect", "build", "test:e2e"] as const;

export async function runQaCommand(
  args: readonly string[],
  currentDirectory = process.cwd(),
  io: QaCommandIo = { log: console.log, error: console.error },
): Promise<number> {
  const [operation = "help", ...rest] = args;
  const parsed = parseArguments(rest);
  validateArguments(operation, parsed);
  const projectRoot = path.resolve(optionString(parsed.options, "project") ?? currentDirectory);
  const json = parsed.options.json === true;

  if (operation === "help") {
    io.log(qaHelp());
    return 0;
  }

  const featureInput = parsed.positional[0];
  if (!featureInput) throw new Error(`cocoframe qa ${operation} requires a feature name.`);
  const feature = slugifyCocoQa(featureInput);

  if (operation === "create") {
    const file = qaFile(projectRoot, feature);
    if (await exists(file)) throw new Error(`CocoQA already exists: ${relative(projectRoot, file)}.`);
    const specName = optionString(parsed.options, "spec");
    if (!specName) throw new Error("cocoframe qa create requires --spec <approved-feature>.");
    const specId = slugifyFeature(specName);
    const specPath = path.join(projectRoot, "specs", specId, "spec.json");
    const spec = parseCocoSpec(JSON.parse(await readFile(specPath, "utf8")));
    if (spec.state !== "approved") throw new Error(`CocoQA requires an approved CocoSpec; ${specId} is ${spec.state}.`);
    const refName = optionString(parsed.options, "ref");
    const ref = refName ? parseCocoRef(JSON.parse(await readFile(path.join(projectRoot, "refs", slugifyCocoRef(refName), "ref.json"), "utf8"))) : undefined;
    if (ref && ref.state !== "ready") throw new Error(`CocoQA requires a completed CocoRef; ${ref.name} is ${ref.state}.`);
    const manifest = await readManifest(projectRoot);
    const design = await readDesignProfile(projectRoot, optionString(parsed.options, "design"));
    const acceptanceCriteria = valueLines(spec.answers["acceptance-criteria"]?.value);
    if (!acceptanceCriteria.length) throw new Error(`Approved CocoSpec ${specId} has no acceptance criteria.`);
    const qa = createCocoQa({
      feature,
      title: optionString(parsed.options, "title") ?? spec.feature.title,
      mode: parseMode(optionString(parsed.options, "mode") ?? "standard"),
      sources: [
        ...(design ? [{ kind: "design-profile" as const, id: design.profile.id, file: design.file, state: "sha256:" + design.hash }] : []),
        { kind: "cocospec", id: specId, file: relative(projectRoot, specPath), state: spec.state },
        ...(ref ? [{ kind: "cocoref" as const, id: ref.name, file: `refs/${ref.name}/ref.json`, state: ref.state }] : []),
      ],
      acceptanceCriteria,
      ...(design ? { designCriteria: productDesignCriteria(design.profile, { hasReference: Boolean(ref) }) } : {}),
      ...(ref ? { referenceCriteria: ref.requirements.filter(({ status }) => status === "approved" || status === "reused").map(({ id, description }) => ({ id, description })) } : {}),
      gates: qualityScripts.filter((script) => manifest.scripts[script]).map((script) => ({ id: script.replace(":", "-"), script, required: true })),
    });
    await persist(projectRoot, qa);
    printStatus(io, projectRoot, qa, json, `Created ${relative(projectRoot, file)} from approved CocoSpec ${specId}.`);
    return 0;
  }

  let qa = await readQa(projectRoot, feature);

  if (operation === "resume" || operation === "status" || operation === "plan" || operation === "report") {
    if (operation === "plan" || operation === "report") await writeArtifacts(projectRoot, qa);
    printStatus(io, projectRoot, qa, json, operation === "plan" ? "Generated the traceable QA plan." : operation === "report" ? "Generated the current QA report." : undefined);
    return 0;
  }

  if (operation === "answer") {
    const questionId = parsed.positional[1];
    if (!questionId) throw new Error("cocoframe qa answer requires a question ID.");
    const status = parseAnswerStatus(optionString(parsed.options, "status") ?? "answered");
    const rawValue = parsed.positional.slice(2).join(" ");
    if (!rawValue && status !== "deferred" && status !== "not-applicable") throw new Error("cocoframe qa answer requires a value or deferred/not-applicable status.");
    qa = answerCocoQa(qa, questionId, rawValue ? parseValue(rawValue) : undefined, { status });
    await persist(projectRoot, qa);
    printStatus(io, projectRoot, qa, json, `Recorded QA decision ${questionId}.`);
    return 0;
  }

  if (operation === "run") {
    if (nextCocoQaQuestions(qa).length) throw new Error(`CocoQA ${feature} has unresolved QA decisions. Run "cocoframe qa resume ${feature}" first.`);
    const requested = optionString(parsed.options, "gate");
    const gates = requested ? qa.gates.filter(({ id }) => id === slugifyCocoQa(requested)) : qa.gates;
    if (!gates.length) throw new Error(requested ? `Unknown CocoQA gate: ${requested}.` : "CocoQA has no automated quality gates.");
    let failed = false;
    for (const gate of gates) {
      if (!qualityScripts.includes(gate.script as typeof qualityScripts[number])) throw new Error(`CocoQA CLI refuses non-standard quality script: ${gate.script}.`);
      qa = recordCocoQaGate(qa, gate.id, "running");
      await persist(projectRoot, qa);
      io.log(`Running CocoQA gate ${gate.id}: npm run ${gate.script}`);
      const started = performance.now();
      const exitCode = await runNpmScript(projectRoot, gate.script);
      const durationMs = Math.round(performance.now() - started);
      qa = recordCocoQaGate(qa, gate.id, exitCode === 0 ? "passed" : "failed", { durationMs, exitCode });
      await persist(projectRoot, qa);
      if (exitCode !== 0) {
        failed = true;
        io.error(`CocoQA gate ${gate.id} failed with exit code ${exitCode}.`);
      } else io.log(`CocoQA gate ${gate.id} passed in ${durationMs}ms.`);
    }
    printStatus(io, projectRoot, qa, json);
    return failed ? 1 : 0;
  }

  if (operation === "record") {
    const caseId = parsed.positional[1];
    const result = parsed.positional[2];
    if (!caseId || !result) throw new Error("cocoframe qa record requires a case ID and result.");
    const evidence = optionString(parsed.options, "evidence") ?? parsed.positional.slice(3).join(" ");
    qa = recordCocoQaCase(qa, caseId, parseCaseStatus(result), evidence || undefined);
    await persist(projectRoot, qa);
    printStatus(io, projectRoot, qa, json, `Recorded ${caseId} as ${result}.`);
    return 0;
  }

  if (operation === "defect") {
    const defectId = parsed.positional[1];
    if (!defectId) throw new Error("cocoframe qa defect requires a defect ID.");
    const title = optionString(parsed.options, "title");
    const steps = optionString(parsed.options, "steps");
    if (!title || !steps) throw new Error("cocoframe qa defect requires --title and --steps.");
    const expected = optionString(parsed.options, "expected");
    const actual = optionString(parsed.options, "actual");
    const evidence = optionString(parsed.options, "evidence");
    qa = addCocoQaDefect(qa, {
      id: defectId,
      title,
      severity: parseSeverity(optionString(parsed.options, "severity") ?? "medium"),
      steps: steps.split(/\r?\n|;/).map((step) => step.trim()).filter(Boolean),
      ...(expected ? { expected } : {}),
      ...(actual ? { actual } : {}),
      ...(evidence ? { evidence } : {}),
    });
    await persist(projectRoot, qa);
    printStatus(io, projectRoot, qa, json, `Recorded ${defectId}.`);
    return 0;
  }

  if (operation === "resolve") {
    const defectId = parsed.positional[1];
    const resolution = optionString(parsed.options, "resolution") ?? parsed.positional.slice(2).join(" ");
    if (!defectId || !resolution) throw new Error("cocoframe qa resolve requires a defect ID and resolution.");
    const status = optionString(parsed.options, "as") ?? "resolved";
    if (status !== "resolved" && status !== "accepted") throw new Error("CocoQA defect closure must be resolved or accepted.");
    qa = closeCocoQaDefect(qa, defectId, status, resolution);
    await persist(projectRoot, qa);
    printStatus(io, projectRoot, qa, json, `Marked ${defectId} as ${status}.`);
    return 0;
  }

  if (operation === "check") {
    const result = checkCocoQa(qa);
    if (json) io.log(JSON.stringify(result, null, 2));
    else if (result.passed) io.log(`CocoQA ${feature} passed and is ready for release approval.`);
    else {
      io.error(`CocoQA ${feature} is not ready (${result.issues.length} issue(s)).`);
      for (const issue of result.issues) io.error(`- ${issue.kind} ${issue.id}: ${issue.message}`);
    }
    return result.passed ? 0 : 1;
  }

  if (operation === "approve") {
    qa = approveCocoQa(qa);
    await persist(projectRoot, qa);
    printStatus(io, projectRoot, qa, json, `Approved CocoQA ${feature}. The feature satisfies its recorded release evidence.`);
    return 0;
  }

  throw new Error(`Unknown CocoQA command: ${operation}.\n\n${qaHelp()}`);
}

async function runNpmScript(projectRoot: string, script: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const windows = process.platform === "win32";
    const command = windows ? process.env.ComSpec ?? "cmd.exe" : "npm";
    const args = windows ? ["/d", "/s", "/c", `npm run ${script}`] : ["run", script];
    const child = spawn(command, args, { cwd: projectRoot, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function readManifest(projectRoot: string): Promise<{ readonly scripts: Readonly<Record<string, string>> }> {
  const value: unknown = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
  if (!isRecord(value) || !isRecord(value.scripts)) throw new Error("CocoQA requires package.json scripts.");
  return { scripts: Object.fromEntries(Object.entries(value.scripts).filter((entry): entry is [string, string] => typeof entry[1] === "string")) };
}

async function readQa(projectRoot: string, feature: string): Promise<CocoQa> {
  const file = qaFile(projectRoot, feature);
  try {
    const qa = parseCocoQa(JSON.parse(await readFile(file, "utf8")));
    const source = qa.sources.find(({ kind }) => kind === "design-profile");
    if (source?.file) {
      const design = await readDesignProfile(projectRoot, source.file);
      if (!design || source.state !== "sha256:" + design.hash) {
        throw Object.assign(new Error("DESIGN_STATE_CONFLICT: The Design Profile changed after CocoQA review. Inspect the profile, rebuild the QA plan, and request approval again."), { code: "DESIGN_STATE_CONFLICT" });
      }
    }
    return qa;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("CocoQA does not exist: " + relative(projectRoot, file) + ".");
    throw error;
  }
}

async function readDesignProfile(projectRoot: string, requested?: string) {
  const relativeFile = requested ?? "cocoframe.design.json";
  const file = path.resolve(projectRoot, relativeFile);
  const rootPrefix = path.resolve(projectRoot) + path.sep;
  if (file !== path.resolve(projectRoot) && !file.startsWith(rootPrefix)) {
    throw new Error("WORKSPACE_ACCESS_DENIED: Design Profile must be inside the approved project root.");
  }
  if (!await exists(file)) {
    if (requested) throw new Error("Design Profile does not exist: " + relativeFile + ".");
    return undefined;
  }
  const profile = parseDesignProfile(JSON.parse(await readFile(file, "utf8")));
  const audit = auditProductDesign(profile, { componentsAudited: true });
  if (!audit.passed) {
    const details = audit.diagnostics.map(({ code, message }) => code + ": " + message).join(" ");
    throw new Error("Design Profile failed validation. " + details);
  }
  return { profile, file: relative(projectRoot, file), hash: await hashDesignProfile(profile) };
}

async function persist(projectRoot: string, qa: CocoQa): Promise<void> {
  const file = qaFile(projectRoot, qa.feature.id);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(qa, null, 2)}\n`, "utf8");
  await rename(temporary, file);
  await writeArtifacts(projectRoot, qa);
}

async function writeArtifacts(projectRoot: string, qa: CocoQa): Promise<void> {
  const directory = path.dirname(qaFile(projectRoot, qa.feature.id));
  await mkdir(directory, { recursive: true });
  const artifacts = renderCocoQaArtifacts(qa);
  for (const name of artifactNames) await writeFile(path.join(directory, name), artifacts[name], "utf8");
}

function printStatus(io: QaCommandIo, projectRoot: string, qa: CocoQa, json: boolean, notice?: string): void {
  const questions = nextCocoQaQuestions(qa);
  const result = checkCocoQa(qa);
  if (json) {
    io.log(JSON.stringify({ qa: relative(projectRoot, qaFile(projectRoot, qa.feature.id)), feature: qa.feature, mode: qa.mode, state: qa.state, questions, cases: qa.cases, gates: qa.gates, defects: qa.defects, issues: result.issues }, null, 2));
    return;
  }
  if (notice) io.log(notice);
  io.log(`CocoQA ${qa.feature.id}: ${qa.state}; ${qa.cases.filter(({ status }) => status === "passed").length}/${qa.cases.length} cases and ${qa.gates.filter(({ status }) => status === "passed").length}/${qa.gates.length} gates passed.`);
  if (questions.length) {
    io.log("Next QA questions:");
    for (const question of questions) {
      io.log(`\n[${question.id}] ${question.prompt}`);
      io.log(`Why: ${question.why}`);
      if (question.responseHint) io.log(`Format: ${question.responseHint}`);
    }
  }
  if (qa.defects.some(({ status }) => status === "open")) io.log(`${qa.defects.filter(({ status }) => status === "open").length} defect(s) remain open.`);
}

function validateArguments(operation: string, parsed: ParsedArguments): void {
  const options: Readonly<Record<string, readonly string[]>> = {
    help: [], create: ["design", "json", "mode", "project", "ref", "spec", "title"], resume: ["json", "project"], status: ["json", "project"], plan: ["json", "project"], report: ["json", "project"],
    answer: ["json", "project", "status"], run: ["gate", "json", "project"], record: ["evidence", "json", "project"], defect: ["actual", "evidence", "expected", "json", "project", "severity", "steps", "title"],
    resolve: ["as", "json", "project", "resolution"], check: ["json", "project"], approve: ["json", "project"],
  };
  const allowed = options[operation];
  if (!allowed) throw new Error(`Unknown CocoQA command: ${operation}.`);
  for (const name of Object.keys(parsed.options)) if (!allowed.includes(name)) throw new Error(`Unknown option for cocoframe qa ${operation}: --${name}.`);
  const unlimited = operation === "answer" || operation === "record" || operation === "resolve";
  const maximum = operation === "help" ? 0 : operation === "defect" ? 2 : ["create", "resume", "status", "plan", "report", "run", "check", "approve"].includes(operation) ? 1 : Number.POSITIVE_INFINITY;
  if (!unlimited && parsed.positional.length > maximum) throw new Error(`cocoframe qa ${operation} received too many positional arguments.`);
}

function parseArguments(args: readonly string[]): ParsedArguments {
  const positional: string[] = [];
  const options: Record<string, string | true> = {};
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (!value?.startsWith("--")) { if (value !== undefined) positional.push(value); continue; }
    const name = value.slice(2);
    if (name === "json") { options[name] = true; continue; }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Option --${name} requires a value.`);
    options[name] = next;
    index++;
  }
  return { positional, options };
}

function parseValue(value: string): CocoQaValue {
  try { const parsed: unknown = JSON.parse(value); if (isQaValue(parsed)) return parsed; }
  catch { /* Plain text is the common answer format. */ }
  return value;
}

function valueLines(value: CocoSpecValue | undefined): readonly string[] {
  if (Array.isArray(value)) return value.map(valueText).map(cleanItem).filter(Boolean);
  if (typeof value !== "string") return value === undefined ? [] : [valueText(value)];
  return value.split(/\r?\n|;/).map(cleanItem).filter(Boolean);
}

function valueText(value: CocoSpecValue): string { return typeof value === "string" ? value : JSON.stringify(value); }
function cleanItem(value: string): string { return value.trim().replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, ""); }
function qaFile(projectRoot: string, feature: string): string { return path.join(projectRoot, "qa", slugifyCocoQa(feature), "qa.json"); }
function relative(projectRoot: string, file: string): string { return path.relative(projectRoot, file).replaceAll("\\", "/"); }
function optionString(options: Readonly<Record<string, string | true>>, name: string): string | undefined { const value = options[name]; return typeof value === "string" ? value : undefined; }
function parseMode(value: string): CocoQaMode { if (value === "standard" || value === "thorough") return value; throw new Error("CocoQA mode must be standard or thorough."); }
function parseAnswerStatus(value: string): CocoQaAnswerStatus { if (value === "answered" || value === "assumed" || value === "deferred" || value === "not-applicable") return value; throw new Error("CocoQA answer status is invalid."); }
function parseCaseStatus(value: string): Exclude<CocoQaResultStatus, "running"> { const normalized = value === "pass" ? "passed" : value === "fail" ? "failed" : value === "n/a" ? "not-applicable" : value; if (normalized === "pending" || normalized === "passed" || normalized === "failed" || normalized === "blocked" || normalized === "not-applicable") return normalized; throw new Error("CocoQA case result must be pending, pass, fail, blocked, or n/a."); }
function parseSeverity(value: string): CocoQaSeverity { if (value === "critical" || value === "high" || value === "medium" || value === "low") return value; throw new Error("CocoQA severity must be critical, high, medium, or low."); }
function isQaValue(value: unknown): value is CocoQaValue { if (value === null || typeof value === "string" || typeof value === "boolean") return true; if (typeof value === "number") return Number.isFinite(value); if (Array.isArray(value)) return value.every(isQaValue); return isRecord(value) && Object.values(value).every(isQaValue); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
async function exists(file: string): Promise<boolean> { try { await access(file); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; } }

function qaHelp(): string {
  return "CocoQA\n\nCommands:\n" +
    "  cocoframe qa create <feature> --spec <approved-feature> [--ref <completed-reference>] [--design <profile>] [--mode standard|thorough]\n" +
    "  cocoframe qa resume|status|plan|report <feature> [--json] [--project <path>]\n" +
    "  cocoframe qa answer <feature> <question-id> [value] [--status <status>]\n" +
    "  cocoframe qa run <feature> [--gate <gate-id>] [--project <path>]\n" +
    "  cocoframe qa record <feature> <case-id> pass|fail|blocked|n/a --evidence <text>\n" +
    "  cocoframe qa defect <feature> <defect-id> --title <text> --severity <level> --steps <text>\n" +
    "  cocoframe qa resolve <feature> <defect-id> <resolution> [--as resolved|accepted]\n" +
    "  cocoframe qa check|approve <feature> [--json] [--project <path>]";
}
