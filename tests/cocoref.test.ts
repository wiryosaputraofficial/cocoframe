import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

import path from "node:path";
import test from "node:test";
import { runRefCommand } from "../packages/cli/src/ref-command.ts";
import { buildProject } from "../packages/cli/src/project.ts";
import {
  approveCocoRefCandidate,
  auditCocoRef,
  consentCocoRefCandidate,
  createCocoRef,
  markCocoRefPreview,
  parseCocoRef,
  renderCocoRefArtifacts,
  requestCocoRefRevision,
} from "../packages/cocoref/src/index.ts";

const timestamp = "2026-08-23T00:00:00.000Z";

test("requires explicit consent and approval for missing reference components", () => {
  let ref = createCocoRef({
    name: "Dashboard Reference",
    references: [{ kind: "website", source: "https://example.com/dashboard" }],
    now: timestamp,
  });
  assert.equal(ref.name, "dashboard-reference");
  assert.equal(ref.state, "auditing-components");
  const inventoryOnly = auditCocoRef(ref, { inventory: [{ id: "ui:Button", kind: "ui", name: "Button" }] }, timestamp);
  assert.equal(inventoryOnly.state, "auditing-components");

  ref = auditCocoRef(ref, {
    inventory: [{ id: "ui:Button", kind: "ui", name: "Button" }],
    requirements: [
      { id: "primary-action", description: "Primary action", decision: "reuse", existingComponent: "ui:Button", rationale: "The existing semantic button is sufficient." },
      { id: "activity-feed", description: "Expandable activity feed", decision: "missing", rationale: "No inventory item supports grouped expandable activity." },
    ],
  }, timestamp);
  assert.equal(ref.state, "awaiting-consent");
  assert.throws(() => markCocoRefPreview(ref, "activity-feed", candidateFiles(), timestamp), /cannot transition/);

  ref = consentCocoRefCandidate(ref, "activity-feed", timestamp);
  assert.equal(ref.state, "building-candidate");
  ref = markCocoRefPreview(ref, "activity-feed", candidateFiles(), timestamp);
  assert.equal(ref.state, "preview-ready");
  ref = requestCocoRefRevision(ref, "activity-feed", "Reduce the spacing and show timestamps.", timestamp);
  assert.equal(ref.state, "revising");
  ref = markCocoRefPreview(ref, "activity-feed", candidateFiles(), timestamp);
  assert.equal(ref.requirements[1]?.candidate?.revision, 2);
  ref = approveCocoRefCandidate(ref, "activity-feed", timestamp);
  assert.equal(ref.state, "ready");
  assert.equal(ref.requirements[1]?.status, "approved");
  assert.match(renderCocoRefArtifacts(ref)["decisions.md"], /Reduce the spacing/);
  assert.match(renderCocoRefArtifacts(ref)["component-map.md"], /promoted to `app\/components\/activity-feed\.tsx`/);
  assert.doesNotMatch(renderCocoRefArtifacts(ref)["component-map.md"], /; preview http/);
  assert.deepEqual(parseCocoRef(JSON.parse(JSON.stringify(ref))), ref);
  assert.throws(() => parseCocoRef({ version: 2 }), /Unsupported CocoRef version/);
});

test("runs the CLI audit, actual preview, revision, promotion, and cleanup lifecycle", async () => {
  const temporaryRoot = path.resolve(".tmp-tests");
  await mkdir(temporaryRoot, { recursive: true });
  const project = await mkdtemp(path.join(temporaryRoot, "cocoframe-ref-"));
  try {
    await mkdir(path.join(project, "app", "components"), { recursive: true });
    await mkdir(path.join(project, "app", "routes"), { recursive: true });
    await writeFile(path.join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { jsx: "react-jsx", jsxImportSource: "@cocoframe/jsx" } }), "utf8");
    await writeFile(path.join(project, "app", "components", "existing-card.tsx"), "export function ExistingCard() { return <article />; }\n", "utf8");
    const requirementsFile = path.join(project, "requirements.json");
    await writeFile(requirementsFile, JSON.stringify([
      { id: "action", description: "Primary action", decision: "reuse", existingComponent: "ui:Button", rationale: "Button matches the requirement." },
      { id: "activity-feed", description: "Expandable activity feed", decision: "missing", rationale: "The current inventory has no matching component." },
    ]), "utf8");
    const output: string[] = [];
    const errors: string[] = [];
    const io = { log: (message: string) => output.push(message), error: (message: string) => errors.push(message) };

    assert.equal(await runRefCommand(["create", "dashboard", "--website", "https://example.com/dashboard", "--project", project], project, io), 0);
    assert.equal(await runRefCommand(["audit", "dashboard", "--requirements", requirementsFile, "--project", project], project, io), 0);
    assert.equal(await runRefCommand(["consent", "dashboard", "activity-feed", "--project", project], project, io), 0);
    assert.equal(await runRefCommand(["preview", "dashboard", "activity-feed", "--port", "3210", "--project", project], project, io), 0);
    const route = path.join(project, "app", "routes", "__cocoref", "dashboard", "activity-feed.page.tsx");
    assert.match(await readFile(route, "utf8"), /Temporary development-only route/);
    assert.match(await readFile(path.join(project, ".cocoframe", "cocoref", "dashboard", "activity-feed", "activity-feed.tsx"), "utf8"), /Expandable activity feed/);

    const developmentBundle = await buildProject(project, true);
    const developmentApp = (await import(`${new URL(`file:///${developmentBundle.replaceAll("\\\\", "/")}`).href}?ref=${Date.now()}`)).default;
    assert.ok(developmentApp.manifest().some(({ pattern }: { pattern: string }) => pattern === "/__cocoref/dashboard/activity-feed"));
    const previewHtml = await (await developmentApp.fetch(new Request("http://localhost/__cocoref/dashboard/activity-feed"))).text();
    assert.match(previewHtml, /Expandable activity feed/);
    assert.match(await readFile(path.join(project, ".cocoframe", "dev", "public", "coco-assets", "styles.css"), "utf8"), /CocoRef candidate|\.root_/);
    const productionBundle = await buildProject(project, false);
    const productionApp = (await import(`${new URL(`file:///${productionBundle.replaceAll("\\\\", "/")}`).href}?ref=${Date.now()}`)).default;
    assert.ok(!productionApp.manifest().some(({ pattern }: { pattern: string }) => pattern.startsWith("/__cocoref/")));

    assert.equal(await runRefCommand(["feedback", "dashboard", "activity-feed", "Use denser spacing", "--project", project], project, io), 0);
    assert.equal(await runRefCommand(["preview", "dashboard", "activity-feed", "--port", "3210", "--project", project], project, io), 0);
    assert.equal(await runRefCommand(["approve", "dashboard", "activity-feed", "--project", project], project, io), 0);

    const promoted = path.join(project, "app", "components", "activity-feed.tsx");
    assert.match(await readFile(promoted, "utf8"), /CocoRef candidate/);
    assert.match(await readFile(path.join(project, "app", "components", "activity-feed.module.d.css.ts"), "utf8"), /readonly "root": string/);
    await assert.rejects(access(route));
    await assert.rejects(access(path.join(project, ".cocoframe", "cocoref", "dashboard", "activity-feed")));
    const persisted = parseCocoRef(JSON.parse(await readFile(path.join(project, "refs", "dashboard", "ref.json"), "utf8")));
    assert.equal(persisted.state, "ready");
    assert.equal(persisted.requirements.find(({ id }) => id === "activity-feed")?.status, "approved");
    assert.equal(errors.length, 0);
    assert.ok(output.some((message) => message.includes("http://127.0.0.1:3210/__cocoref/dashboard/activity-feed")));
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

test("keeps temporary CocoRef routes out of production builds", async () => {
  const source = await readFile(path.resolve("packages/cli/src/project.ts"), "utf8");
  assert.match(source, /development[\s\S]*cocoref[\s\S]*cocoux/);
  assert.match(source, /discoveredRoutes\.filter/);
});

function candidateFiles() {
  return {
    componentFile: ".cocoframe/cocoref/dashboard-reference/activity-feed/activity-feed.tsx",
    styleFile: ".cocoframe/cocoref/dashboard-reference/activity-feed/activity-feed.module.css",
    previewRoute: "app/routes/__cocoref/dashboard-reference/activity-feed.page.tsx",
    previewUrl: "http://127.0.0.1:3000/__cocoref/dashboard-reference/activity-feed",
    targetComponentFile: "app/components/activity-feed.tsx",
    targetStyleFile: "app/components/activity-feed.module.css",
  };
}
