import { access, copyFile, mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { uiComponents } from "@cocoframe/ui";
import {
  addCocoReference,
  approveCocoRefCandidate,
  auditCocoRef,
  cancelCocoRefCandidate,
  consentCocoRefCandidate,
  createCocoRef,
  declineCocoRefCandidate,
  markCocoRefPreview,
  parseCocoRef,
  renderCocoRefArtifacts,
  requestCocoRefRevision,
  slugifyCocoRef,
  type CocoRef,
  type CocoRefAuditRequirement,
  type CocoRefInventoryItem,
} from "@cocoframe/cocoref";
import { generateCssTypes } from "./project.ts";

interface RefCommandIo {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

interface ParsedArguments {
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string | true>>;
}

const artifactNames = ["reference-report.md", "component-map.md", "decisions.md"] as const;

export async function runRefCommand(
  args: readonly string[],
  currentDirectory = process.cwd(),
  io: RefCommandIo = { log: console.log, error: console.error },
): Promise<number> {
  const [operation = "help", ...rest] = args;
  const parsed = parseArguments(rest);
  validateArguments(operation, parsed);
  const projectRoot = path.resolve(optionString(parsed.options, "project") ?? currentDirectory);
  const json = parsed.options.json === true;

  if (operation === "help") {
    io.log(refHelp());
    return 0;
  }

  const nameInput = parsed.positional[0];
  if (!nameInput) throw new Error(`cocoframe ref ${operation} requires a reference name.`);
  const name = slugifyCocoRef(nameInput);

  if (operation === "create") {
    const file = refFile(projectRoot, name);
    if (await exists(file)) throw new Error(`CocoRef already exists: ${relative(projectRoot, file)}.`);
    const reference = await referenceFromOptions(projectRoot, name, parsed.options);
    if (!reference) throw new Error("cocoframe ref create requires --image <file> or --website <url>.");
    const title = optionString(parsed.options, "title");
    const ref = createCocoRef({
      name,
      ...(title ? { title } : {}),
      references: [reference],
    });
    await writeRef(projectRoot, ref);
    await writeArtifacts(projectRoot, ref);
    printStatus(io, projectRoot, ref, json, `Created ${relative(projectRoot, file)}.`);
    return 0;
  }

  let ref = await readRef(projectRoot, name);

  if (operation === "add") {
    const reference = await referenceFromOptions(projectRoot, name, parsed.options);
    if (!reference) throw new Error("cocoframe ref add requires --image <file> or --website <url>.");
    ref = addCocoReference(ref, reference);
    await persist(projectRoot, ref);
    printStatus(io, projectRoot, ref, json, "Added the reference and invalidated the previous component audit.");
    return 0;
  }

  if (operation === "audit") {
    const inventory = await discoverComponentInventory(projectRoot);
    const requirementFile = optionString(parsed.options, "requirements");
    const requirements = requirementFile ? await readAuditRequirements(path.resolve(projectRoot, requirementFile)) : undefined;
    ref = auditCocoRef(ref, { inventory, ...(requirements ? { requirements } : {}) });
    await persist(projectRoot, ref);
    if (!requirements && !json) {
      io.log(`Captured ${inventory.length} available components. Have the AI compare the reference, then rerun audit with --requirements <file>.`);
      io.log("Each requirement must explicitly choose reuse or missing; missing items require user consent.");
    }
    printStatus(io, projectRoot, ref, json);
    return 0;
  }

  if (operation === "status") {
    printStatus(io, projectRoot, ref, json);
    return 0;
  }

  const requirementInput = parsed.positional[1];
  if (!requirementInput) throw new Error(`cocoframe ref ${operation} requires a component requirement ID.`);
  const requirementId = slugifyCocoRef(requirementInput);

  if (operation === "consent") {
    ref = consentCocoRefCandidate(ref, requirementId);
    await scaffoldCandidate(projectRoot, ref, requirementId);
    await persist(projectRoot, ref);
    printStatus(io, projectRoot, ref, json, `Consent recorded. Edit ${candidateRelative(name, requirementId, `${requirementId}.tsx`)}, then run preview.`);
    return 0;
  }

  if (operation === "decline") {
    ref = declineCocoRefCandidate(ref, requirementId);
    await persist(projectRoot, ref);
    printStatus(io, projectRoot, ref, json, "Declined. Ask whether to revise the design, reuse another component, or cancel this requirement.");
    return 0;
  }

  if (operation === "preview") {
    const files = candidateFiles(name, requirementId, previewPort(parsed.options));
    await requireCandidateFiles(projectRoot, files);
    ref = markCocoRefPreview(ref, requirementId, files);
    await persist(projectRoot, ref);
    const candidate = requirement(ref, requirementId).candidate!;
    printStatus(io, projectRoot, ref, json, `Preview ready: ${candidate.previewUrl}`);
    return 0;
  }

  if (operation === "feedback") {
    const message = parsed.positional.slice(2).join(" ").trim();
    if (!message) throw new Error("cocoframe ref feedback requires a concrete feedback message.");
    ref = requestCocoRefRevision(ref, requirementId, message);
    await persist(projectRoot, ref);
    printStatus(io, projectRoot, ref, json, "Feedback recorded. Update the same candidate source, then run preview again.");
    return 0;
  }

  if (operation === "approve") {
    const candidate = requirement(ref, requirementId).candidate;
    if (!candidate) throw new Error(`CocoRef requirement ${requirementId} has no preview candidate.`);
    assertExpectedCandidate(name, requirementId, candidate);
    await promoteCandidate(projectRoot, candidate);
    ref = approveCocoRefCandidate(ref, requirementId);
    await persist(projectRoot, ref);
    await removeCandidate(projectRoot, name, requirementId);
    await generateCssTypes(projectRoot);
    printStatus(io, projectRoot, ref, json, `Approved and promoted ${candidate.targetComponentFile}. Temporary preview removed.`);
    return 0;
  }

  if (operation === "cancel") {
    ref = cancelCocoRefCandidate(ref, requirementId);
    await persist(projectRoot, ref);
    await removeCandidate(projectRoot, name, requirementId);
    printStatus(io, projectRoot, ref, json, "Candidate cancelled. Temporary source and preview route removed.");
    return 0;
  }

  throw new Error(`Unknown CocoRef command: ${operation}.\n\n${refHelp()}`);
}

async function referenceFromOptions(
  projectRoot: string,
  name: string,
  options: Readonly<Record<string, string | true>>,
): Promise<{ kind: "image" | "website"; source: string; note?: string } | undefined> {
  const image = optionString(options, "image");
  const website = optionString(options, "website");
  if (image && website) throw new Error("Add one CocoRef reference at a time; use either --image or --website.");
  const note = optionString(options, "note");
  if (website) return { kind: "website", source: website, ...(note ? { note } : {}) };
  if (!image) return undefined;
  const source = path.resolve(projectRoot, image);
  await access(source);
  const extension = path.extname(source).toLowerCase();
  if (![".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"].includes(extension)) {
    throw new Error("CocoRef image must be AVIF, GIF, JPEG, PNG, SVG, or WebP.");
  }
  const directory = path.join(projectRoot, "refs", name, "references");
  await mkdir(directory, { recursive: true });
  const target = await availableReferenceFile(directory, path.basename(source));
  await copyFile(source, target);
  return { kind: "image", source: relative(projectRoot, target), ...(note ? { note } : {}) };
}

async function availableReferenceFile(directory: string, basename: string): Promise<string> {
  const extension = path.extname(basename);
  const stem = path.basename(basename, extension);
  for (let index = 1; index < 10_000; index++) {
    const file = path.join(directory, index === 1 ? basename : `${stem}-${index}${extension}`);
    if (!(await exists(file))) return file;
  }
  throw new Error("CocoRef could not allocate a unique reference filename.");
}

async function discoverComponentInventory(projectRoot: string): Promise<readonly CocoRefInventoryItem[]> {
  const items: CocoRefInventoryItem[] = uiComponents.map((name) => ({ id: `ui:${name}`, kind: "ui", name }));
  for (const [directory, kind, prefix, pattern] of [
    [path.join(projectRoot, "app", "components"), "component", "component", /\.tsx?$/],
    [path.join(projectRoot, "app", "islands"), "island", "island", /\.island\.tsx?$/],
  ] as const) {
    for (const file of await discoverFiles(directory, pattern)) {
      const relativeFile = relative(projectRoot, file);
      const basename = path.basename(file).replace(/\.island\.tsx?$|\.tsx?$/g, "");
      items.push({ id: `${prefix}:${basename}`, kind, name: basename, file: relativeFile });
    }
  }
  const refsRoot = path.join(projectRoot, "refs");
  for (const file of await discoverFiles(refsRoot, /^ref\.json$/)) {
    const prior = parseCocoRef(JSON.parse(await readFile(file, "utf8")));
    for (const item of prior.requirements.filter(({ status, candidate }) => status === "approved" && candidate)) {
      items.push({ id: `cocoref:${item.id}`, kind: "approved-cocoref", name: item.id, file: item.candidate!.targetComponentFile });
    }
  }
  return [...new Map(items.map((item) => [item.id, item])).values()].sort((left, right) => left.id.localeCompare(right.id));
}

async function discoverFiles(directory: string, pattern: RegExp): Promise<readonly string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return discoverFiles(file, pattern);
      return pattern.test(entry.name) ? [file] : [];
    }));
    return files.flat().sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function readAuditRequirements(file: string): Promise<readonly CocoRefAuditRequirement[]> {
  const value: unknown = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(value)) throw new Error("CocoRef requirements file must contain a JSON array.");
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`CocoRef requirement ${index + 1} must be an object.`);
    if (item.decision !== "reuse" && item.decision !== "missing") throw new Error(`CocoRef requirement ${index + 1} decision must be reuse or missing.`);
    return {
      id: stringField(item, "id", index),
      description: stringField(item, "description", index),
      decision: item.decision,
      rationale: stringField(item, "rationale", index),
      ...(typeof item.existingComponent === "string" ? { existingComponent: item.existingComponent } : {}),
    };
  });
}

async function scaffoldCandidate(projectRoot: string, ref: CocoRef, requirementId: string): Promise<void> {
  const item = requirement(ref, requirementId);
  const files = candidateFiles(ref.name, requirementId, 3000);
  const component = path.join(projectRoot, files.componentFile);
  const style = path.join(projectRoot, files.styleFile);
  const declaration = style.replace(/\.css$/, ".d.css.ts");
  const route = path.join(projectRoot, files.previewRoute);
  for (const file of [component, style, route]) {
    if (await exists(file)) throw new Error(`CocoRef candidate file already exists: ${relative(projectRoot, file)}.`);
  }
  await mkdir(path.dirname(component), { recursive: true });
  await mkdir(path.dirname(route), { recursive: true });
  const title = titleFromSlug(requirementId);
  await writeFile(component, `import styles from "./${requirementId}.module.css";\n\nexport interface ${pascalCase(requirementId)}Props {\n  readonly title?: string;\n}\n\n/** Candidate for: ${commentText(item.description)} */\nexport default function ${pascalCase(requirementId)}({ title = ${JSON.stringify(title)} }: ${pascalCase(requirementId)}Props) {\n  return (\n    <section class={styles.root}>\n      <p class={styles.eyebrow}>CocoRef candidate</p>\n      <h2 class={styles.title}>{title}</h2>\n      <p class={styles.body}>{${JSON.stringify(item.description)}}</p>\n    </section>\n  );\n}\n`, "utf8");
  await writeFile(style, `.root {\n  display: grid;\n  gap: 0.75rem;\n  max-width: 48rem;\n  margin: 3rem auto;\n  padding: 2rem;\n  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);\n  border-radius: 1rem;\n}\n\n.eyebrow { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }\n.title { margin: 0; font-size: clamp(1.5rem, 4vw, 2.5rem); }\n.body { margin: 0; line-height: 1.6; }\n`, "utf8");
  await writeFile(declaration, `// Temporary CocoRef declaration. Exact types are generated after approval.\ndeclare const classes: Readonly<Record<string, string>>;\nexport default classes;\n`, "utf8");
  const importPath = relative(path.dirname(route), component).replace(/^(?!\.)/, "./");
  await writeFile(route, `// Temporary development-only route managed by cocoframe ref.\nimport { definePage } from "@cocoframe/core";\nimport Candidate from ${JSON.stringify(importPath)};\n\nexport default definePage({\n  meta: { title: ${JSON.stringify(`${title} · CocoRef preview`)}, robots: "noindex, nofollow" },\n  view() {\n    return <main><Candidate /></main>;\n  },\n});\n`, "utf8");
}

function candidateFiles(name: string, requirementId: string, port: number) {
  const base = candidateRelative(name, requirementId, requirementId);
  return {
    componentFile: `${base}.tsx`,
    styleFile: `${base}.module.css`,
    previewRoute: `app/routes/__cocoref/${name}/${requirementId}.page.tsx`,
    previewUrl: `http://127.0.0.1:${port}/__cocoref/${name}/${requirementId}`,
    targetComponentFile: `app/components/${requirementId}.tsx`,
    targetStyleFile: `app/components/${requirementId}.module.css`,
  };
}

function candidateRelative(name: string, requirementId: string, file: string): string {
  return `.cocoframe/cocoref/${name}/${requirementId}/${file}`;
}

async function requireCandidateFiles(projectRoot: string, files: ReturnType<typeof candidateFiles>): Promise<void> {
  for (const file of [files.componentFile, files.styleFile, files.previewRoute]) {
    if (!(await exists(path.join(projectRoot, file)))) throw new Error(`Missing CocoRef candidate file: ${file}. Run consent first.`);
  }
}

function assertExpectedCandidate(name: string, requirementId: string, candidate: NonNullable<CocoRef["requirements"][number]["candidate"]>): void {
  const expected = candidateFiles(name, requirementId, Number.parseInt(new URL(candidate.previewUrl).port || "80", 10));
  for (const key of ["componentFile", "styleFile", "previewRoute", "targetComponentFile", "targetStyleFile"] as const) {
    if (candidate[key] !== expected[key]) throw new Error(`CocoRef candidate ${key} does not match its contained managed path.`);
  }
}

async function promoteCandidate(projectRoot: string, candidate: NonNullable<CocoRef["requirements"][number]["candidate"]>): Promise<void> {
  const pairs = [
    [candidate.componentFile, candidate.targetComponentFile],
    ...(candidate.styleFile && candidate.targetStyleFile ? [[candidate.styleFile, candidate.targetStyleFile] as const] : []),
  ] as const;
  for (const [source, target] of pairs) {
    const sourceFile = path.join(projectRoot, source);
    const targetFile = path.join(projectRoot, target);
    await access(sourceFile);
    if (await exists(targetFile)) throw new Error(`Refusing to overwrite existing application component: ${target}.`);
  }
  await mkdir(path.join(projectRoot, "app", "components"), { recursive: true });
  for (const [source, target] of pairs) await copyFile(path.join(projectRoot, source), path.join(projectRoot, target));
}

async function removeCandidate(projectRoot: string, name: string, requirementId: string): Promise<void> {
  const managedRoot = path.resolve(projectRoot, ".cocoframe", "cocoref") + path.sep;
  const candidateDirectory = path.resolve(projectRoot, ".cocoframe", "cocoref", name, requirementId);
  if (!(`${candidateDirectory}${path.sep}`).startsWith(managedRoot)) throw new Error("Refusing to remove a CocoRef candidate outside its managed root.");
  await rm(candidateDirectory, { recursive: true, force: true });
  const route = path.resolve(projectRoot, "app", "routes", "__cocoref", name, `${requirementId}.page.tsx`);
  const routeRoot = path.resolve(projectRoot, "app", "routes", "__cocoref") + path.sep;
  if (!route.startsWith(routeRoot)) throw new Error("Refusing to remove a CocoRef preview outside its managed route root.");
  if (await exists(route)) {
    const source = await readFile(route, "utf8");
    if (!source.startsWith("// Temporary development-only route managed by cocoframe ref.")) {
      throw new Error(`Refusing to remove a preview route without the CocoRef managed marker: ${relative(projectRoot, route)}.`);
    }
  }
  await rm(route, { force: true });
  await removeEmptyDirectory(path.dirname(route));
  await removeEmptyDirectory(path.dirname(path.dirname(route)));
}

async function removeEmptyDirectory(directory: string): Promise<void> {
  try {
    await rmdir(directory);
  } catch (error) {
    if (!["ENOENT", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
  }
}

async function readRef(projectRoot: string, name: string): Promise<CocoRef> {
  const file = refFile(projectRoot, name);
  try {
    return parseCocoRef(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`CocoRef does not exist: ${relative(projectRoot, file)}.`);
    throw error;
  }
}

async function persist(projectRoot: string, ref: CocoRef): Promise<void> {
  await writeRef(projectRoot, ref);
  await writeArtifacts(projectRoot, ref);
}

async function writeRef(projectRoot: string, ref: CocoRef): Promise<void> {
  const file = refFile(projectRoot, ref.name);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(ref, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function writeArtifacts(projectRoot: string, ref: CocoRef): Promise<void> {
  const directory = path.dirname(refFile(projectRoot, ref.name));
  const artifacts = renderCocoRefArtifacts(ref);
  for (const name of artifactNames) await writeFile(path.join(directory, name), artifacts[name], "utf8");
}

function printStatus(io: RefCommandIo, projectRoot: string, ref: CocoRef, json: boolean, notice?: string): void {
  if (json) {
    io.log(JSON.stringify({ ref: relative(projectRoot, refFile(projectRoot, ref.name)), name: ref.name, state: ref.state, references: ref.references, inventory: ref.inventory, requirements: ref.requirements }, null, 2));
    return;
  }
  if (notice) io.log(notice);
  io.log(`CocoRef ${ref.name}: ${ref.state}; ${ref.references.length} reference(s), ${ref.inventory.length} inventory item(s).`);
  for (const item of ref.requirements) {
    io.log(`- [${item.status}] ${item.id}: ${item.description}`);
    if (item.status === "awaiting-consent") io.log(`  Ask the user: This component does not exist yet. May I create and preview it?`);
    if (item.candidate && item.status !== "approved") io.log(`  Preview: ${item.candidate.previewUrl}`);
  }
}

function requirement(ref: CocoRef, id: string): CocoRef["requirements"][number] {
  const item = ref.requirements.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown CocoRef requirement: ${id}.`);
  return item;
}

function validateArguments(operation: string, parsed: ParsedArguments): void {
  const allowedByOperation: Readonly<Record<string, readonly string[]>> = {
    help: [], create: ["image", "json", "note", "project", "title", "website"], add: ["image", "json", "note", "project", "website"],
    audit: ["json", "project", "requirements"], status: ["json", "project"], consent: ["json", "project"], decline: ["json", "project"],
    preview: ["json", "port", "project"], feedback: ["json", "project"], approve: ["json", "project"], cancel: ["json", "project"],
  };
  const allowed = allowedByOperation[operation];
  if (!allowed) throw new Error(`Unknown CocoRef command: ${operation}.`);
  for (const name of Object.keys(parsed.options)) if (!allowed.includes(name)) throw new Error(`Unknown option for cocoframe ref ${operation}: --${name}.`);
  const maximum = operation === "help" ? 0 : operation === "feedback" ? Number.POSITIVE_INFINITY : ["consent", "decline", "preview", "approve", "cancel"].includes(operation) ? 2 : 1;
  if (parsed.positional.length > maximum) throw new Error(`cocoframe ref ${operation} received too many positional arguments.`);
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
    if (name === "json") { options[name] = true; continue; }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Option --${name} requires a value.`);
    options[name] = next;
    index++;
  }
  return { positional, options };
}

function previewPort(options: Readonly<Record<string, string | true>>): number {
  const raw = optionString(options, "port") ?? process.env.PORT ?? "3000";
  const port = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error("CocoRef preview port must be between 1 and 65535.");
  return port;
}

function refFile(projectRoot: string, name: string): string {
  return path.join(projectRoot, "refs", slugifyCocoRef(name), "ref.json");
}

function optionString(options: Readonly<Record<string, string | true>>, name: string): string | undefined {
  const value = options[name];
  return typeof value === "string" ? value : undefined;
}

function relative(from: string, file: string): string {
  return path.relative(from, file).replaceAll("\\", "/");
}

async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

function stringField(value: Record<string, unknown>, field: string, index: number): string {
  const result = value[field];
  if (typeof result !== "string" || !result.trim()) throw new Error(`CocoRef requirement ${index + 1} ${field} must be a non-empty string.`);
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function titleFromSlug(slug: string): string {
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function pascalCase(slug: string): string {
  return titleFromSlug(slug).replaceAll(" ", "");
}

function commentText(value: string): string {
  return value.replaceAll("*/", "* /").replace(/[\r\n]+/g, " ");
}


function refHelp(): string {
  return "CocoRef\n\nCommands:\n" +
    "  cocoframe ref create <name> (--image <file> | --website <url>) [--title <text>] [--project <path>]\n" +
    "  cocoframe ref add <name> (--image <file> | --website <url>) [--project <path>]\n" +
    "  cocoframe ref audit <name> [--requirements <json-file>] [--project <path>]\n" +
    "  cocoframe ref status <name> [--json] [--project <path>]\n" +
    "  cocoframe ref consent|decline <name> <requirement> [--project <path>]\n" +
    "  cocoframe ref preview <name> <requirement> [--port <number>] [--project <path>]\n" +
    "  cocoframe ref feedback <name> <requirement> <message> [--project <path>]\n" +
    "  cocoframe ref approve|cancel <name> <requirement> [--project <path>]";
}
