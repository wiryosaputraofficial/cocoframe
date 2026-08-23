import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  answerCocoSpec,
  approveCocoSpec,
  checkCocoSpec,
  createCocoSpec,
  nextQuestions,
  parseCocoSpec,
  renderCocoSpecArtifacts,
  slugifyFeature,
  type CocoSpec,
  type CocoSpecAnswerStatus,
  type CocoSpecMode,
  type CocoSpecProjectContext,
  type CocoSpecValue,
} from "@cocoframe/specs";

interface SpecCommandIo {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

interface ParsedArguments {
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string | true>>;
}

const generatedArtifactNames = ["prd.md", "flow.mmd", "data-model.mmd", "acceptance.md", "decisions.md", "tasks.md"] as const;

export async function runSpecCommand(
  args: readonly string[],
  currentDirectory = process.cwd(),
  io: SpecCommandIo = { log: console.log, error: console.error },
): Promise<number> {
  const [operation = "help", ...rest] = args;
  const parsed = parseArguments(rest);
  const projectRoot = path.resolve(optionString(parsed.options, "project") ?? currentDirectory);
  const json = parsed.options.json === true;
  validateArguments(operation, parsed);

  if (operation === "help") {
    io.log(specHelp());
    return 0;
  }

  const featureInput = parsed.positional[0];
  if (!featureInput) throw new Error(`cocoframe spec ${operation} requires a feature name.`);
  const feature = slugifyFeature(featureInput);

  if (operation === "create") {
    const file = specFile(projectRoot, feature);
    if (await exists(file)) throw new Error(`CocoSpec already exists: ${relative(projectRoot, file)}. Use \"spec resume\" instead.`);
    const mode = parseMode(optionString(parsed.options, "mode") ?? "standard");
    const title = optionString(parsed.options, "title");
    const brief = optionString(parsed.options, "brief");
    const spec = createCocoSpec({
      feature,
      ...(title ? { title } : {}),
      ...(brief ? { brief } : {}),
      mode,
      project: await inspectProjectContext(projectRoot),
    });
    await writeSpec(projectRoot, spec);
    printStatus(io, projectRoot, spec, json, `Created ${relative(projectRoot, file)}.`);
    return 0;
  }

  const spec = await readSpec(projectRoot, feature);
  if (operation === "resume" || operation === "status") {
    printStatus(io, projectRoot, spec, json);
    return 0;
  }

  if (operation === "answer") {
    const questionId = parsed.positional[1];
    if (!questionId) throw new Error("cocoframe spec answer requires a question ID.");
    const status = parseStatus(optionString(parsed.options, "status") ?? "answered");
    const rawValue = parsed.positional.slice(2).join(" ");
    if (!rawValue && status !== "deferred" && status !== "not-applicable") {
      throw new Error("cocoframe spec answer requires a value, or --status deferred/not-applicable.");
    }
    const updated = answerCocoSpec(spec, questionId, rawValue ? parseValue(rawValue) : undefined, { status });
    await writeSpec(projectRoot, updated);
    printStatus(io, projectRoot, updated, json, `Recorded ${questionId}.`);
    return 0;
  }

  if (operation === "check") {
    const result = checkCocoSpec(spec);
    if (json) io.log(JSON.stringify(result, null, 2));
    else if (result.complete) io.log(`CocoSpec ${feature} is complete (${result.answered}/${result.total}) and ready for review.`);
    else {
      io.error(`CocoSpec ${feature} is incomplete (${result.answered}/${result.total}).`);
      for (const issue of result.issues) io.error(`- ${issue.questionId}: ${issue.message}`);
    }
    return result.complete ? 0 : 1;
  }

  if (operation === "generate") {
    const result = checkCocoSpec(spec);
    if (!result.complete) throw new Error(`CocoSpec ${feature} has ${result.issues.length} unresolved required question(s). Run \"cocoframe spec resume ${feature}\".`);
    const files = await writeArtifacts(projectRoot, spec);
    if (json) io.log(JSON.stringify({ feature, state: spec.state, files: files.map((file) => relative(projectRoot, file)) }, null, 2));
    else {
      io.log(`Generated CocoSpecs artifacts for ${feature}:`);
      for (const file of files) io.log(`- ${relative(projectRoot, file)}`);
    }
    return 0;
  }

  if (operation === "approve") {
    const approved = approveCocoSpec(spec);
    await writeSpec(projectRoot, approved);
    await writeArtifacts(projectRoot, approved);
    if (json) io.log(JSON.stringify({ feature, state: approved.state, spec: relative(projectRoot, specFile(projectRoot, feature)) }, null, 2));
    else io.log(`Approved CocoSpec ${feature}. Implementation may now begin against its acceptance criteria.`);
    return 0;
  }

  throw new Error(`Unknown CocoSpecs command: ${operation}.\n\n${specHelp()}`);
}

async function inspectProjectContext(projectRoot: string): Promise<CocoSpecProjectContext> {
  const routes = await discoverFiles(projectRoot, path.join(projectRoot, "app", "routes"), (file) => /\.(?:page|route)\.[cm]?[jt]sx?$/.test(file));
  const islands = await discoverFiles(projectRoot, path.join(projectRoot, "app", "islands"), (file) => /\.island\.[cm]?[jt]sx?$/.test(file));
  let dependencies: readonly string[] = [];
  try {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8")) as {
      readonly dependencies?: Readonly<Record<string, string>>;
    };
    dependencies = Object.keys(manifest.dependencies ?? {}).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { routes, islands, dependencies };
}

async function discoverFiles(projectRoot: string, directory: string, include: (file: string) => boolean): Promise<readonly string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return discoverFiles(projectRoot, fullPath, include);
      return include(entry.name) ? [path.relative(projectRoot, fullPath).replaceAll("\\", "/")] : [];
    }));
    return nested.flat().sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function readSpec(projectRoot: string, feature: string): Promise<CocoSpec> {
  const file = specFile(projectRoot, feature);
  try {
    return parseCocoSpec(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`CocoSpec does not exist: ${relative(projectRoot, file)}.`);
    throw error;
  }
}

async function writeSpec(projectRoot: string, spec: CocoSpec): Promise<void> {
  const file = specFile(projectRoot, spec.feature.id);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function writeArtifacts(projectRoot: string, spec: CocoSpec): Promise<readonly string[]> {
  const directory = path.dirname(specFile(projectRoot, spec.feature.id));
  await mkdir(directory, { recursive: true });
  const artifacts = renderCocoSpecArtifacts(spec);
  const files: string[] = [];
  for (const name of generatedArtifactNames) {
    const file = path.join(directory, name);
    await writeFile(file, artifacts[name], "utf8");
    files.push(file);
  }
  return files;
}

function printStatus(io: SpecCommandIo, projectRoot: string, spec: CocoSpec, json: boolean, notice?: string): void {
  const result = checkCocoSpec(spec);
  const questions = nextQuestions(spec);
  if (json) {
    io.log(JSON.stringify({
      spec: relative(projectRoot, specFile(projectRoot, spec.feature.id)),
      feature: spec.feature,
      mode: spec.mode,
      state: spec.state,
      progress: { answered: result.answered, total: result.total },
      questions,
    }, null, 2));
    return;
  }
  if (notice) io.log(notice);
  io.log(`CocoSpec ${spec.feature.id}: ${result.answered}/${result.total} decisions resolved (${spec.state}).`);
  if (!questions.length) {
    io.log(`Run \"cocoframe spec generate ${spec.feature.id}\" to render review artifacts.`);
    return;
  }
  io.log("Next questions:");
  for (const question of questions) {
    io.log(`\n[${question.id}] ${question.prompt}`);
    io.log(`Why: ${question.why}`);
    if (question.options?.length) io.log(`Options: ${question.options.join(", ")}`);
    if (question.responseHint) io.log(`Format: ${question.responseHint}`);
  }
}

function validateArguments(operation: string, parsed: ParsedArguments): void {
  const allowedByOperation: Readonly<Record<string, readonly string[]>> = {
    help: [],
    create: ["brief", "json", "mode", "project", "title"],
    resume: ["json", "project"],
    status: ["json", "project"],
    answer: ["json", "project", "status"],
    check: ["json", "project"],
    generate: ["json", "project"],
    approve: ["json", "project"],
  };
  const allowed = allowedByOperation[operation];
  if (!allowed) throw new Error(`Unknown CocoSpecs command: ${operation}.`);
  for (const name of Object.keys(parsed.options)) {
    if (!allowed.includes(name)) throw new Error(`Unknown option for cocoframe spec ${operation}: --${name}.`);
  }
  if (operation === "help" && parsed.positional.length > 0) throw new Error("cocoframe spec help does not accept positional arguments.");
  if (operation !== "help" && operation !== "answer" && parsed.positional.length > 1) {
    throw new Error(`cocoframe spec ${operation} accepts one feature name.`);
  }
}

function parseArguments(args: readonly string[]): ParsedArguments {
  const positional: string[] = [];
  const options: Record<string, string | true> = {};
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (!value?.startsWith("--")) {
      if (value !== undefined) positional.push(value);
      continue;
    }
    const name = value.slice(2);
    if (name === "json") {
      options[name] = true;
      continue;
    }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Option --${name} requires a value.`);
    options[name] = next;
    index++;
  }
  return { positional, options };
}

function parseValue(value: string): CocoSpecValue {
  try {
    const parsed: unknown = JSON.parse(value);
    if (isJsonValue(parsed)) return parsed;
  } catch {
    // Plain text is the most common interactive answer.
  }
  return value;
}

function isJsonValue(value: unknown): value is CocoSpecValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return typeof value === "object" && Object.values(value as Record<string, unknown>).every(isJsonValue);
}

function optionString(options: Readonly<Record<string, string | true>>, name: string): string | undefined {
  const value = options[name];
  return typeof value === "string" ? value : undefined;
}

function parseMode(value: string): CocoSpecMode {
  if (value === "quick" || value === "standard" || value === "thorough") return value;
  throw new Error("CocoSpecs mode must be quick, standard, or thorough.");
}

function parseStatus(value: string): CocoSpecAnswerStatus {
  if (value === "answered" || value === "assumed" || value === "deferred" || value === "not-applicable") return value;
  throw new Error("CocoSpecs answer status must be answered, assumed, deferred, or not-applicable.");
}

function specFile(projectRoot: string, feature: string): string {
  return path.join(projectRoot, "specs", slugifyFeature(feature), "spec.json");
}

function relative(projectRoot: string, file: string): string {
  return path.relative(projectRoot, file).replaceAll("\\", "/");
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function specHelp(): string {
  return "CocoSpecs\n\nCommands:\n" +
    "  cocoframe spec create <feature> [--brief <text>] [--mode quick|standard|thorough] [--project <path>]\n" +
    "  cocoframe spec resume <feature> [--json] [--project <path>]\n" +
    "  cocoframe spec answer <feature> <question-id> [value] [--status <status>] [--project <path>]\n" +
    "  cocoframe spec check <feature> [--json] [--project <path>]\n" +
    "  cocoframe spec generate <feature> [--json] [--project <path>]\n" +
    "  cocoframe spec approve <feature> [--json] [--project <path>]";
}
