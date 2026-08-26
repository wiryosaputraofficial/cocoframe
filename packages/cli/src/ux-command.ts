import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, readdir, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "@cocoframe/server-node";
import { createCocoRef, parseCocoRef, renderCocoRefArtifacts, slugifyCocoRef } from "@cocoframe/cocoref";
import { parseCocoSpec, slugifyFeature } from "@cocoframe/specs";
import { uiComponents } from "@cocoframe/ui";
import {
  approveCocoUx,
  bindCocoUxApprovedEvidence,
  cancelCocoUx,
  checkCocoUx,
  createCocoUx,
  defineCocoUxDesign,
  handoffCocoUxToRef,
  markCocoUxPreview,
  parseCocoUx,
  renderCocoUxArtifacts,
  requestCocoUxRevision,
  setCocoUxSection,
  type CocoUx,
  type CocoUxDesign,
  type CocoUxInventoryItem,
  type CocoUxScreenshotEvidence,
  type CocoUxSourceBinding,
} from "@cocoframe/ux";
import { inspectProjectReadOnly } from "./inspect-readonly.ts";
import { buildProject, serveProjectAsset } from "./project.ts";

interface UxCommandIo {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

interface ParsedArguments {
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string | true>>;
}

export interface CocoUxCaptureRequest {
  readonly url: string;
  readonly file: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly theme: string;
  readonly signal?: AbortSignal;
}

export interface UxCommandServices {
  readonly capture?: (request: CocoUxCaptureRequest) => Promise<void>;
}

const artifactNames = ["journey-map.mmd", "state-diagram.mmd", "interaction-matrix.md", "visual-brief.md", "decisions.md"] as const;
const viewports = [
  { name: "mobile-compact", width: 320, height: 568 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 768 },
  { name: "4k", width: 3840, height: 2160 },
] as const;

/** Runs the file-backed CocoUX lifecycle through the same pure contract used by Agent Bridge. */
export async function runUxCommand(
  args: readonly string[],
  currentDirectory = process.cwd(),
  io: UxCommandIo = { log: console.log, error: console.error },
  services: UxCommandServices = {},
): Promise<number> {
  const [operation = "help", ...rest] = args;
  const parsed = parseArguments(rest);
  validateArguments(operation, parsed);
  const projectRoot = path.resolve(optionString(parsed.options, "project") ?? currentDirectory);
  const json = parsed.options.json === true;
  if (operation === "help") { io.log(uxHelp()); return 0; }

  const featureInput = parsed.positional[0];
  if (!featureInput) throw new Error(`cocoframe ux ${operation} requires a feature name.`);
  const feature = slugifyFeature(featureInput);

  if (operation === "create") {
    const file = uxFile(projectRoot, feature);
    if (await exists(file)) throw new Error(`CocoUX already exists: ${relative(projectRoot, file)}.`);
    const brief = optionString(parsed.options, "brief");
    if (!brief) throw new Error("cocoframe ux create requires --brief <goal>.");
    const snapshot = await inspectProjectReadOnly(projectRoot);
    const sources: CocoUxSourceBinding[] = [{ id: "project-snapshot", kind: "project-snapshot", state: "captured", hash: sha256(JSON.stringify(snapshot)) }];
    const specName = optionString(parsed.options, "spec");
    if (specName) {
      const specId = slugifyFeature(specName);
      const specPath = path.join(projectRoot, "specs", specId, "spec.json");
      const spec = parseCocoSpec(JSON.parse(await readFile(specPath, "utf8")));
      if (spec.state !== "approved") throw new Error(`CocoUX requires an approved CocoSpec; ${specId} is ${spec.state}.`);
      sources.push({ id: specId, kind: "cocospec", file: relative(projectRoot, specPath), state: spec.state, hash: await fileHash(specPath) });
    }
    const refName = optionString(parsed.options, "ref");
    if (refName) {
      const refId = slugifyCocoRef(refName);
      const refPath = path.join(projectRoot, "refs", refId, "ref.json");
      const ref = parseCocoRef(JSON.parse(await readFile(refPath, "utf8")));
      if (ref.state !== "ready") throw new Error(`CocoUX requires a completed CocoRef source; ${refId} is ${ref.state}.`);
      sources.push({ id: refId, kind: "cocoref", file: relative(projectRoot, refPath), state: ref.state, hash: await fileHash(refPath) });
    }
    const designProfile = path.join(projectRoot, "cocoframe.design.json");
    if (await exists(designProfile)) sources.push({ id: "design-profile", kind: "design-profile", file: "cocoframe.design.json", state: "captured", hash: await fileHash(designProfile) });
    const inventory: CocoUxInventoryItem[] = [
      ...uiComponents.map((name) => ({ id: `ui:${name}`, kind: "ui" as const, name })),
      ...snapshot.components.filter(({ kind }) => kind === "application").map(({ name, file }) => ({ id: `component:${slugifyLoose(name)}`, kind: "component" as const, name, ...(file ? { file } : {}) })),
      ...snapshot.islands.map(({ name, file }) => ({ id: `island:${slugifyLoose(name)}`, kind: "island" as const, name, file })),
    ];
    const title = optionString(parsed.options, "title");
    const ux = createCocoUx({ feature, ...(title ? { title } : {}), brief, sources, inventory });
    await persist(projectRoot, ux);
    printStatus(io, projectRoot, ux, json, `Created ${relative(projectRoot, file)} after auditing ${inventory.length} reusable capabilities.`);
    return 0;
  }

  let ux = await readUx(projectRoot, feature);
  if (operation === "resume" || operation === "status") { printStatus(io, projectRoot, ux, json); return 0; }

  if (operation === "answer") {
    const input = optionString(parsed.options, "input");
    if (!input) throw new Error("cocoframe ux answer requires --input <json-file>.");
    const value: unknown = JSON.parse(await readFile(path.resolve(projectRoot, input), "utf8"));
    const section = parsed.positional[1] as keyof CocoUxDesign | undefined;
    if (section) {
      if (!["actors", "journeys", "screens", "states", "transitions", "interactions", "visualRecommendations", "componentDecisions"].includes(section)) throw new Error(`Unknown CocoUX section: ${section}.`);
      ux = setCocoUxSection(ux, section, value as never);
    } else ux = defineCocoUxDesign(ux, value as CocoUxDesign);
    await persist(projectRoot, ux);
    printStatus(io, projectRoot, ux, json, section ? `Recorded reviewed ${section}.` : "Recorded the reviewed UX design contract.");
    return 0;
  }

  if (operation === "check") {
    const result = checkCocoUx(ux);
    if (json) io.log(JSON.stringify(result, null, 2));
    else if (result.readyForPreview) io.log(`CocoUX ${feature} is complete and ready for preview.`);
    else for (const diagnostic of result.diagnostics) io.error(`- ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message} ${diagnostic.recovery}`);
    return result.readyForPreview ? 0 : 1;
  }

  if (operation === "generate") {
    await writeArtifacts(projectRoot, ux);
    if (checkCocoUx(ux).readyForPreview) await scaffoldPreview(projectRoot, ux);
    printStatus(io, projectRoot, ux, json, "Generated deterministic review artifacts and managed preview source.");
    return 0;
  }

  if (operation === "preview") {
    if (!checkCocoUx(ux).readyForPreview) throw new Error(`CocoUX ${feature} is incomplete. Run "cocoframe ux check ${feature}".`);
    const files = await scaffoldPreview(projectRoot, ux);
    const port = integerOption(parsed.options, "port", 3212);
    const theme = slugifyLoose(optionString(parsed.options, "theme") ?? "light");
    const applicableStates = ux.states.filter(({ applicability }) => applicability === "applicable");
    if (applicableStates.length * viewports.length > 50) throw new Error("CocoUX capture exceeds the 50-screenshot revision limit. Mark inapplicable states or split the feature.");
    const contractHash = await fileHash(uxFile(projectRoot, feature));
    const sourceHashes = Object.fromEntries(await Promise.all(files.sourcePaths.map(async (file) => [file, await fileHash(path.join(projectRoot, file))])));
    const sourceHash = sha256(JSON.stringify(sourceHashes));
    const screenshotsDirectory = path.join(projectRoot, ".cocoframe", "cocoux", feature, "screenshots");
    await rm(screenshotsDirectory, { recursive: true, force: true });
    await mkdir(screenshotsDirectory, { recursive: true });
    const capture = services.capture ?? await defaultCapture(projectRoot, port);
    const screenshots: CocoUxScreenshotEvidence[] = [];
    try {
      for (const state of applicableStates) for (const viewport of viewports) {
        const id = `${state.id}-${viewport.name}-${theme}`;
        const relativeFile = `.cocoframe/cocoux/${feature}/screenshots/${id}.png`;
        const file = path.join(projectRoot, relativeFile);
        const url = `http://127.0.0.1:${port}/__cocoux/${feature}/${state.id}`;
        await capture({ url, file, viewport, theme });
        const info = await stat(file);
        if (info.size > 5 * 1024 * 1024) throw new Error(`CocoUX screenshot exceeds 5 MiB: ${relativeFile}.`);
        screenshots.push({ id, stateId: state.id, viewport: { width: viewport.width, height: viewport.height }, theme, file: relativeFile, sourceHash, imageHash: await fileHash(file), uxContractHash: contractHash, description: `${state.kind} state at ${viewport.width}×${viewport.height} (${theme})` });
      }
    } finally {
      await closeDefaultCapture(capture);
    }
    const total = (await Promise.all(screenshots.map(({ file }) => stat(path.join(projectRoot, file))))).reduce((sum, item) => sum + item.size, 0);
    if (total > 100 * 1024 * 1024) throw new Error("CocoUX screenshot evidence exceeds 100 MiB.");
    ux = markCocoUxPreview(ux, { sourcePaths: files.sourcePaths, sourceHashes, previewUrl: `http://127.0.0.1:${port}/__cocoux/${feature}/${applicableStates[0]!.id}`, screenshots });
    await persist(projectRoot, ux);
    printStatus(io, projectRoot, ux, json, `Captured ${screenshots.length} real PNG preview(s). Review ${ux.previews.at(-1)!.previewUrl}`);
    return 0;
  }

  if (operation === "feedback") {
    const message = parsed.positional.slice(1).join(" ").trim();
    if (!message) throw new Error("cocoframe ux feedback requires a concrete feedback message.");
    ux = requestCocoUxRevision(ux, message);
    await persist(projectRoot, ux);
    printStatus(io, projectRoot, ux, json, "Feedback recorded; update the managed preview source and capture a new revision.");
    return 0;
  }

  if (operation === "approve") {
    const role = optionString(parsed.options, "role") ?? "application-developer";
    if (role !== "application-developer" && role !== "framework-maintainer") throw new Error("CocoUX reviewer role must be application-developer or framework-maintainer.");
    const preview = ux.previews.at(-1);
    if (!preview || ux.state !== "preview-ready") throw new Error("CocoUX approval requires a preview-ready revision.");
    for (const source of preview.sourcePaths) {
      if (await fileHash(path.join(projectRoot, source)) !== preview.sourceHashes[source]) throw new Error(`CocoUX preview source changed after capture: ${source}. Capture again.`);
    }
    const approvedDirectory = path.join(projectRoot, "ux", feature, "visuals", `revision-${preview.revision}`);
    await mkdir(approvedDirectory, { recursive: true });
    const files: Record<string, string> = {};
    for (const screenshot of preview.screenshots) {
      const source = path.join(projectRoot, screenshot.file);
      if (await fileHash(source) !== screenshot.imageHash) throw new Error(`CocoUX screenshot changed after capture: ${screenshot.file}. Capture again.`);
      const target = path.join(approvedDirectory, `${screenshot.id}.png`);
      if (await exists(target)) throw new Error(`Refusing to overwrite approved CocoUX evidence: ${relative(projectRoot, target)}.`);
      await copyFile(source, target);
      files[screenshot.id] = relative(projectRoot, target);
    }
    ux = bindCocoUxApprovedEvidence(ux, files);
    const contractHash = sha256(JSON.stringify({ ...ux, approval: undefined, handoff: undefined }));
    const previewHash = sha256(JSON.stringify(ux.previews.at(-1)!.screenshots.map(({ id, imageHash }) => ({ id, imageHash }))));
    ux = approveCocoUx(ux, { reviewerRole: role, contractHash, previewHash });
    await persist(projectRoot, ux);
    printStatus(io, projectRoot, ux, json, `Approved visual direction revision ${preview.revision}. Application source was not promoted; run handoff to seed CocoRef.`);
    return 0;
  }

  if (operation === "handoff") {
    if (ux.state !== "approved" || !ux.approval) throw new Error("CocoUX handoff requires approved visual direction.");
    const refName = slugifyCocoRef(optionString(parsed.options, "ref") ?? feature);
    const refPath = path.join(projectRoot, "refs", refName, "ref.json");
    if (await exists(refPath)) throw new Error(`CocoRef already exists: ${relative(projectRoot, refPath)}.`);
    const screenshots = ux.previews.at(-1)!.screenshots;
    const referenceDirectory = path.join(projectRoot, "refs", refName, "references");
    await mkdir(referenceDirectory, { recursive: true });
    const copied: string[] = [];
    const hashes: Record<string, string> = {};
    for (const screenshot of screenshots) {
      const target = path.join(referenceDirectory, path.basename(screenshot.file));
      await copyFile(path.join(projectRoot, screenshot.file), target);
      const file = relative(projectRoot, target);
      copied.push(file);
      hashes[file] = await fileHash(target);
    }
    const ref = createCocoRef({ name: refName, title: ux.feature.title, references: copied.map((source) => ({ kind: "image" as const, source, note: `Generated by CocoUX ${feature}; UX contract ux/${feature}/ux.json; approval ${ux.approval!.contractHash}. CocoRef still owns component audit, consent, exact preview, and source promotion.` })) });
    await writeRef(projectRoot, ref);
    ux = handoffCocoUxToRef(ux, { refId: refName, refFile: relative(projectRoot, refPath), screenshotFiles: copied, hashes });
    await persist(projectRoot, ux);
    await removeManagedPreview(projectRoot, feature);
    printStatus(io, projectRoot, ux, json, `Handed approved PNG evidence to CocoRef ${refName}. Temporary CocoUX preview source was removed.`);
    return 0;
  }

  if (operation === "cancel") {
    ux = cancelCocoUx(ux);
    await persist(projectRoot, ux);
    await removeManagedPreview(projectRoot, feature);
    printStatus(io, projectRoot, ux, json, "Cancelled CocoUX and removed temporary preview source.");
    return 0;
  }
  throw new Error(`Unknown CocoUX command: ${operation}.\n\n${uxHelp()}`);
}

async function scaffoldPreview(projectRoot: string, ux: CocoUx): Promise<{ readonly sourcePaths: readonly string[] }> {
  const directory = path.join(projectRoot, ".cocoframe", "cocoux", ux.feature.id);
  const component = path.join(directory, "preview.tsx");
  const style = path.join(directory, "preview.module.css");
  await mkdir(directory, { recursive: true });
  const stateData = Object.fromEntries(ux.states.map((state) => [state.id, { kind: state.kind, rationale: state.rationale, content: state.content, actions: state.availableActions, recovery: state.recovery ?? "Return to the previous step." }]));
  const journey = ux.journeys[0];
  await writeFile(component, `// Temporary CocoUX visual source. CocoUX approval never promotes this file.\nimport styles from "./preview.module.css";\n\nconst states = ${JSON.stringify(stateData, null, 2)} as const;\n\nexport default function CocoUxPreview({ stateId }: { readonly stateId: keyof typeof states }) {\n  const state = states[stateId];\n  return (\n    <main class={styles.shell} data-theme="light">\n      <aside class={styles.sidebar}>\n        <p class={styles.brand}>CocoUX</p>\n        <p class={styles.kicker}>Journey workspace</p>\n        <h1>${escapeJsx(ux.feature.title)}</h1>\n        <p class={styles.brief}>${escapeJsx(ux.brief)}</p>\n        <ol class={styles.steps}>${(journey?.steps ?? []).map((step, index) => `<li class={${index === 0 ? "styles.activeStep" : "styles.step"}}><span>${index + 1}</span><div><strong>${escapeJsx(step.action)}</strong><small>${escapeJsx(step.outcome)}</small></div></li>`).join("")}</ol>\n      </aside>\n      <section class={styles.canvas}>\n        <header class={styles.toolbar}><div><p class={styles.kicker}>Live visual recommendation</p><h2>${escapeJsx(ux.screens[0]?.purpose ?? ux.feature.title)}</h2></div><span class={styles.badge}>{state.kind}</span></header>\n        <div class={styles.preview}>\n          <div class={styles.window}><div class={styles.windowBar}><i></i><i></i><i></i><span>${escapeJsx(ux.screens[0]?.routeOrSurface ?? "/")}</span></div><article class={styles.card}><p class={styles.kicker}>{state.kind} state</p><h3>{state.content}</h3><p>{state.rationale}</p><div class={styles.actions}>{state.actions.map((action, index) => <button class={index === 0 ? styles.primary : styles.secondary} type="button">{action}</button>)}</div><small class={styles.recovery}>{state.recovery}</small></article></div>\n        </div>\n        <footer class={styles.decision}><div><strong>Visual direction only</strong><span>Approval sends PNG evidence to CocoRef; it does not promote app source.</span></div><button class={styles.primary} type="button">Approve direction</button></footer>\n      </section>\n    </main>\n  );\n}\n`, "utf8");
  await writeFile(style, previewCss(), "utf8");
  const routeDirectory = path.join(projectRoot, "app", "routes", "__cocoux", ux.feature.id);
  await mkdir(routeDirectory, { recursive: true });
  for (const state of ux.states.filter(({ applicability }) => applicability === "applicable")) {
    const route = path.join(routeDirectory, `${state.id}.page.tsx`);
    const importPath = relative(path.dirname(route), component).replace(/^(?!\.)/, "./");
    await writeFile(route, `// Temporary development-only route managed by cocoframe ux.\nimport { definePage } from "@cocoframe/core";\nimport Preview from ${JSON.stringify(importPath)};\nexport default definePage({ meta: { title: ${JSON.stringify(`${ux.feature.title} · ${state.kind} · CocoUX`)}, robots: "noindex, nofollow" }, view() { return <Preview stateId=${JSON.stringify(state.id)} />; } });\n`, "utf8");
  }
  return { sourcePaths: [relative(projectRoot, component), relative(projectRoot, style)] };
}

function previewCss(): string {
  return `:root { color-scheme: light; }\n.shell { min-height: 100vh; display: grid; grid-template-columns: minmax(16rem, 22rem) 1fr; margin: 0; color: #172033; background: #eef2f8; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }\n.sidebar { padding: clamp(1.5rem, 3vw, 3rem); color: #f8fbff; background: radial-gradient(circle at 20% 0%, #3657ff 0, #182549 42%, #10172b 100%); }\n.brand { margin: 0 0 3rem; font-size: 1.1rem; font-weight: 900; letter-spacing: -.03em; }\n.kicker { margin: 0 0 .5rem; color: #71809d; font-size: .7rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }\n.sidebar .kicker { color: #9dacd1; }\nh1, h2, h3, p { margin-top: 0; }\nh1 { margin-bottom: .8rem; font-size: clamp(2rem, 4vw, 3.5rem); line-height: .96; letter-spacing: -.055em; }\n.brief { color: #c3cce2; line-height: 1.65; }\n.steps { display: grid; gap: .55rem; margin: 2.5rem 0 0; padding: 0; list-style: none; }\n.step, .activeStep { display: flex; gap: .8rem; padding: .85rem; border-radius: .9rem; color: #aeb9d4; }\n.activeStep { color: white; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }\n.step > span, .activeStep > span { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; flex: 0 0 auto; border-radius: 50%; background: rgba(255,255,255,.1); font-size: .75rem; font-weight: 800; }\n.step strong, .activeStep strong, .step small, .activeStep small { display: block; }\n.step small, .activeStep small { margin-top: .25rem; opacity: .7; line-height: 1.35; }\n.canvas { min-width: 0; display: grid; grid-template-rows: auto 1fr auto; }\n.toolbar, .decision { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.15rem clamp(1rem, 3vw, 2.5rem); background: rgba(255,255,255,.88); border-bottom: 1px solid #dce2ec; backdrop-filter: blur(16px); }\n.toolbar h2 { margin: 0; font-size: clamp(1.05rem, 2vw, 1.45rem); letter-spacing: -.025em; }\n.badge { padding: .45rem .7rem; color: #2443cf; background: #e9edff; border-radius: 999px; font-size: .7rem; font-weight: 900; text-transform: uppercase; }\n.preview { display: grid; place-items: center; padding: clamp(1rem, 4vw, 4rem); overflow: hidden; background-image: linear-gradient(#dfe5ef 1px, transparent 1px), linear-gradient(90deg,#dfe5ef 1px,transparent 1px); background-size: 24px 24px; }\n.window { width: min(100%, 64rem); border: 1px solid #cbd4e2; border-radius: 1.2rem; overflow: hidden; background: white; box-shadow: 0 2rem 5rem rgba(36,52,84,.18); }\n.windowBar { display: flex; align-items: center; gap: .4rem; padding: .75rem 1rem; color: #75829a; background: #f6f8fb; border-bottom: 1px solid #e2e7ef; font-size: .75rem; }\n.windowBar i { width: .62rem; height: .62rem; border-radius: 50%; background: #c8cfdb; }\n.windowBar span { margin-left: .5rem; }\n.card { max-width: 42rem; margin: 0 auto; padding: clamp(2rem, 7vw, 6rem) clamp(1.25rem, 6vw, 4rem); text-align: center; }\n.card h3 { margin-bottom: 1rem; font-size: clamp(1.8rem, 5vw, 3.8rem); line-height: 1.02; letter-spacing: -.05em; }\n.card > p:not(.kicker) { color: #63708a; font-size: 1.02rem; line-height: 1.65; }\n.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .65rem; margin: 2rem 0 1rem; }\n.primary, .secondary { min-height: 2.8rem; padding: .7rem 1rem; border-radius: .75rem; border: 1px solid transparent; font: inherit; font-weight: 800; }\n.primary { color: white; background: #2948dc; box-shadow: 0 .45rem 1.2rem rgba(41,72,220,.22); }\n.secondary { color: #293653; background: white; border-color: #ccd4e2; }\n.recovery { display: block; color: #8290a8; }\n.decision { border-top: 1px solid #dce2ec; border-bottom: 0; }\n.decision strong, .decision span { display: block; }\n.decision span { margin-top: .2rem; color: #71809a; font-size: .78rem; }\n@media (max-width: 760px) { .shell { grid-template-columns: 1fr; } .sidebar { padding: 1.3rem; } .brand { margin-bottom: 1.5rem; } .steps { display: none; } .canvas { min-height: 65vh; } .toolbar, .decision { align-items: flex-start; padding: 1rem; } .decision { flex-direction: column; } .decision .primary { width: 100%; } .preview { padding: 1rem; } }\n`;
}

async function defaultCapture(projectRoot: string, port: number): Promise<UxCommandServices["capture"] & { close: () => Promise<void> }> {
  const output = await buildProject(projectRoot, true);
  const app = (await import(`${pathToFileURL(output).href}?cocoux=${Date.now()}`)).default;
  const server = createServer(async (request) => await serveProjectAsset(request, projectRoot) ?? app.fetch(request));
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  let browser: Awaited<ReturnType<(typeof import("playwright"))["chromium"]["launch"]>> | undefined;
  const capture = Object.assign(async (request: CocoUxCaptureRequest) => {
    browser ??= await (await import("playwright")).chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: request.viewport, colorScheme: request.theme === "dark" ? "dark" : "light" });
    try {
      await page.goto(request.url, { waitUntil: "networkidle", timeout: 30_000 });
      await page.screenshot({ path: request.file, fullPage: false });
    } finally { await page.close(); }
  }, { close: async () => { await browser?.close(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); } });
  return capture;
}

async function closeDefaultCapture(capture: UxCommandServices["capture"]): Promise<void> {
  const close = (capture as UxCommandServices["capture"] & { close?: () => Promise<void> })?.close;
  if (close) await close();
}

async function readUx(root: string, feature: string): Promise<CocoUx> {
  try { return parseCocoUx(JSON.parse(await readFile(uxFile(root, feature), "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`CocoUX does not exist: ux/${feature}/ux.json.`); throw error; }
}

async function persist(root: string, ux: CocoUx): Promise<void> { await writeUx(root, ux); await writeArtifacts(root, ux); }
async function writeUx(root: string, ux: CocoUx): Promise<void> { const file = uxFile(root, ux.feature.id); await mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.${process.pid}.tmp`; await writeFile(temp, `${JSON.stringify(ux, null, 2)}\n`, "utf8"); await rename(temp, file); }
async function writeArtifacts(root: string, ux: CocoUx): Promise<void> { const artifacts = renderCocoUxArtifacts(ux); const directory = path.dirname(uxFile(root, ux.feature.id)); await mkdir(directory, { recursive: true }); for (const name of artifactNames) await writeFile(path.join(directory, name), artifacts[name], "utf8"); }
async function writeRef(root: string, ref: ReturnType<typeof createCocoRef>): Promise<void> { const directory = path.join(root, "refs", ref.name); await mkdir(directory, { recursive: true }); const file = path.join(directory, "ref.json"); const temp = `${file}.${process.pid}.tmp`; await writeFile(temp, `${JSON.stringify(ref, null, 2)}\n`, "utf8"); await rename(temp, file); const artifacts = renderCocoRefArtifacts(ref); for (const [name, content] of Object.entries(artifacts)) await writeFile(path.join(directory, name), content, "utf8"); }

async function removeManagedPreview(root: string, feature: string): Promise<void> {
  const managed = path.resolve(root, ".cocoframe", "cocoux", feature);
  const managedRoot = path.resolve(root, ".cocoframe", "cocoux") + path.sep;
  if (!(`${managed}${path.sep}`).startsWith(managedRoot)) throw new Error("Refusing to remove CocoUX files outside the managed root.");
  await rm(managed, { recursive: true, force: true });
  const routeDirectory = path.resolve(root, "app", "routes", "__cocoux", feature);
  const routeRoot = path.resolve(root, "app", "routes", "__cocoux") + path.sep;
  if (!(`${routeDirectory}${path.sep}`).startsWith(routeRoot)) throw new Error("Refusing to remove CocoUX routes outside the managed route root.");
  if (await exists(routeDirectory)) for (const entry of await readdir(routeDirectory)) {
    const file = path.join(routeDirectory, entry);
    if ((await stat(file)).isFile() && !(await readFile(file, "utf8")).startsWith("// Temporary development-only route managed by cocoframe ux.")) throw new Error(`Refusing to remove an unmanaged CocoUX route: ${relative(root, file)}.`);
  }
  await rm(routeDirectory, { recursive: true, force: true });
  await removeEmpty(path.dirname(routeDirectory));
}

function printStatus(io: UxCommandIo, root: string, ux: CocoUx, json: boolean, notice?: string): void {
  const check = checkCocoUx(ux);
  if (json) { io.log(JSON.stringify({ ux: relative(root, uxFile(root, ux.feature.id)), feature: ux.feature.id, state: ux.state, revision: ux.revision, check, latestPreview: ux.previews.at(-1), approval: ux.approval, handoff: ux.handoff }, null, 2)); return; }
  if (notice) io.log(notice);
  io.log(`CocoUX ${ux.feature.id}: ${ux.state}; ${ux.journeys.length} journey(s), ${ux.screens.length} screen(s), ${ux.states.length} state(s), ${check.diagnostics.length} diagnostic(s).`);
  if (ux.state === "awaiting-consent") for (const item of ux.componentDecisions.filter(({ decision, consent }) => decision === "missing" && consent !== "approved")) io.log(`- Consent required for missing component ${item.component}: ${item.rationale}`);
}

function validateArguments(operation: string, parsed: ParsedArguments): void {
  const allowed: Readonly<Record<string, readonly string[]>> = {
    help: [], create: ["brief", "json", "project", "ref", "spec", "title"], resume: ["json", "project"], status: ["json", "project"], answer: ["input", "json", "project"], check: ["json", "project"], generate: ["json", "project"], preview: ["json", "port", "project", "theme"], feedback: ["json", "project"], approve: ["json", "project", "role"], handoff: ["json", "project", "ref"], cancel: ["json", "project"],
  };
  const names = allowed[operation];
  if (!names) throw new Error(`Unknown CocoUX command: ${operation}.`);
  for (const name of Object.keys(parsed.options)) if (!names.includes(name)) throw new Error(`Unknown option for cocoframe ux ${operation}: --${name}.`);
  const max = operation === "help" ? 0 : operation === "feedback" ? Number.POSITIVE_INFINITY : operation === "answer" ? 2 : 1;
  if (parsed.positional.length > max) throw new Error(`cocoframe ux ${operation} received too many positional arguments.`);
}

function parseArguments(args: readonly string[]): ParsedArguments { const positional: string[] = []; const options: Record<string, string | true> = {}; for (let index = 0; index < args.length; index++) { const value = args[index]; if (!value?.startsWith("--")) { if (value !== undefined) positional.push(value); continue; } const name = value.slice(2); if (name === "json") { options[name] = true; continue; } const next = args[index + 1]; if (!next || next.startsWith("--")) throw new Error(`Option --${name} requires a value.`); options[name] = next; index++; } return { positional, options }; }
function optionString(options: Readonly<Record<string, string | true>>, name: string): string | undefined { const value = options[name]; return typeof value === "string" ? value : undefined; }
function integerOption(options: Readonly<Record<string, string | true>>, name: string, fallback: number): number { const raw = optionString(options, name); if (!raw) return fallback; const value = Number.parseInt(raw, 10); if (!Number.isInteger(value) || value < 1 || value > 65_535) throw new Error(`--${name} must be an integer from 1 to 65535.`); return value; }
function uxFile(root: string, feature: string): string { return path.join(root, "ux", feature, "ux.json"); }
function relative(root: string, file: string): string { return path.relative(root, file).replaceAll("\\", "/"); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
async function fileHash(file: string): Promise<string> { return sha256(await readFile(file)); }
async function exists(file: string): Promise<boolean> { try { await access(file); return true; } catch { return false; } }
async function removeEmpty(directory: string): Promise<void> { try { await rmdir(directory); } catch (error) { if (!["ENOENT", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error; } }
function slugifyLoose(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item"; }
function escapeJsx(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("{", "&#123;").replaceAll("}", "&#125;"); }
function uxHelp(): string { return `CocoUX\n\nCommands:\n  cocoframe ux create <feature> --brief <goal> [--spec <approved-spec>] [--ref <completed-ref>]\n  cocoframe ux resume|status <feature> [--json]\n  cocoframe ux answer <feature> [section] --input <json-file>\n  cocoframe ux check <feature>\n  cocoframe ux generate <feature>\n  cocoframe ux preview <feature> [--port 3212] [--theme light]\n  cocoframe ux feedback <feature> <message>\n  cocoframe ux approve <feature> [--role application-developer]\n  cocoframe ux handoff <feature> [--ref <name>]\n  cocoframe ux cancel <feature>\n\nCocoUX approval accepts visual direction only. CocoRef separately audits components, asks consent, previews exact source, and controls promotion.`; }
