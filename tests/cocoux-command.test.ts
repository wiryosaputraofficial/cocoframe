import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { defineCocoUxDesign, parseCocoUx, type CocoUxDesign } from "@cocoframe/ux";
import { runUxCommand } from "../packages/cli/src/ux-command.ts";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63606060f80f0001040100b51c0c020000000049454e44ae426082", "hex");

function design(oneApplicableState = false): CocoUxDesign {
  const kinds = ["initial", "loading", "empty", "success", "validation", "disabled", "error", "offline", "permission"] as const;
  return {
    actors: [{ id: "developer", name: "Developer", goals: ["Review UX"], permissions: ["review"] }],
    screens: [{ id: "workspace", routeOrSurface: "/workspace", purpose: "Review the workspace" }],
    states: kinds.map((kind) => ({ id: `workspace-${kind}`, screenId: "workspace", kind, applicability: oneApplicableState && kind !== "initial" ? "not-applicable" as const : "applicable" as const, rationale: `${kind} reviewed`, entryCondition: `${kind} begins`, content: `${kind} content`, availableActions: ["Continue"], recovery: "Retry" })),
    journeys: [{ id: "review", actorId: "developer", goal: "Review UX", entryPoints: ["Preview"], steps: [{ id: "open", order: 0, screenId: "workspace", action: "Open", stateId: "workspace-initial", outcome: "Visible", nextStepIds: [] }], alternatePaths: ["Revise"], successOutcome: "Reviewed" }],
    transitions: [],
    interactions: [{ id: "continue", stateId: "workspace-initial", target: "Continue button", trigger: "Click or Enter", behavior: "Continue", keyboard: "Enter", focus: "Moves to heading", feedback: "State changes", recovery: "Retry" }],
    visualRecommendations: [{ id: "workspace-layout", screenId: "workspace", stateIds: kinds.map((kind) => `workspace-${kind}`), hierarchy: ["Header", "Content"], layout: { desktop: "columns" }, components: ["Button"], tokens: { spacing: "space-4" }, typography: { title: "display" }, color: { accent: "brand" }, motion: { transition: "fast" }, responsive: { mobile: "stack" }, rationale: "Clear hierarchy" }],
    componentDecisions: [{ id: "button", recommendationId: "workspace-layout", component: "Button", decision: "reuse", inventoryId: "ui:Button", rationale: "Existing primitive", consent: "not-required" }],
  };
}

test("CocoUX CLI captures PNG evidence and hands it to CocoRef without app-source promotion", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cocoux-command-"));
  await mkdir(path.join(root, "app", "routes"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0" }), "utf8");
  const logs: string[] = [];
  const io = { log: (message: string) => logs.push(message), error: (message: string) => logs.push(message) };
  assert.equal(await runUxCommand(["create", "checkout", "--brief", "Design checkout"], root, io), 0);
  const uxFile = path.join(root, "ux", "checkout", "ux.json");
  const draft = parseCocoUx(JSON.parse(await readFile(uxFile, "utf8")));
  const completed = defineCocoUxDesign(draft, design(), "2026-08-26T00:00:00.000Z");
  await writeFile(uxFile, `${JSON.stringify(completed, null, 2)}\n`, "utf8");
  assert.equal(await runUxCommand(["preview", "checkout"], root, io, { capture: async ({ file }) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, PNG); } }), 0);
  assert.equal(parseCocoUx(JSON.parse(await readFile(uxFile, "utf8"))).previews.at(-1)?.screenshots.length, 45);
  assert.equal(await runUxCommand(["approve", "checkout"], root, io), 0);
  const approved = parseCocoUx(JSON.parse(await readFile(uxFile, "utf8")));
  assert.equal(approved.state, "approved");
  assert.ok(approved.previews.at(-1)?.screenshots.every(({ file }) => file.startsWith("ux/checkout/visuals/")));
  assert.equal(await runUxCommand(["handoff", "checkout"], root, io), 0);
  const ref = JSON.parse(await readFile(path.join(root, "refs", "checkout", "ref.json"), "utf8"));
  assert.equal(ref.references.length, 45);
  await assert.rejects(readFile(path.join(root, "app", "components", "checkout.tsx"), "utf8"), /ENOENT/);
});

test("CocoUX CLI renders its managed preview through local HTTP and captures real PNGs", async (context) => {
  const fixtures = path.resolve(".cocoframe", "test-workspaces");
  await mkdir(fixtures, { recursive: true });
  const root = await mkdtemp(path.join(fixtures, "cocoux-browser-"));
  context.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "app", "routes"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "cocoux-browser-fixture", version: "1.0.0", dependencies: { "@cocoframe/core": "0.0.4" } }), "utf8");
  await writeFile(path.join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { jsx: "react-jsx", jsxImportSource: "@cocoframe/jsx" } }), "utf8");
  const io = { log: () => {}, error: () => {} };
  await runUxCommand(["create", "reporting", "--brief", "Design reporting"], root, io);
  const file = path.join(root, "ux", "reporting", "ux.json");
  const draft = parseCocoUx(JSON.parse(await readFile(file, "utf8")));
  await writeFile(file, `${JSON.stringify(defineCocoUxDesign(draft, design(true)), null, 2)}\n`, "utf8");
  assert.equal(await runUxCommand(["preview", "reporting", "--port", "3213"], root, io), 0);
  const preview = parseCocoUx(JSON.parse(await readFile(file, "utf8"))).previews.at(-1);
  assert.equal(preview?.screenshots.length, 5);
  for (const screenshot of preview?.screenshots ?? []) {
    const bytes = await readFile(path.join(root, screenshot.file));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
