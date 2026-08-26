import assert from "node:assert/strict";
import test from "node:test";
import {
  approveCocoUx,
  checkCocoUx,
  createCocoUx,
  defineCocoUxDesign,
  handoffCocoUxToRef,
  markCocoUxPreview,
  parseCocoUx,
  renderCocoUxArtifacts,
  requestCocoUxRevision,
  type CocoUx,
  type CocoUxDesign,
} from "@cocoframe/ux";

const HASH = "a".repeat(64);
const IMAGE_HASH = "b".repeat(64);
const NOW = "2026-08-26T00:00:00.000Z";

function design(): CocoUxDesign {
  const kinds = ["initial", "loading", "empty", "success", "validation", "disabled", "error", "offline", "permission"] as const;
  return {
    actors: [{ id: "developer", name: "Developer", goals: ["Review a visual direction"], permissions: ["review"] }],
    screens: [{ id: "workspace", routeOrSurface: "/workspace", purpose: "Plan a product experience" }],
    states: kinds.map((kind) => ({
      id: `workspace-${kind}`,
      screenId: "workspace",
      kind,
      applicability: "applicable" as const,
      rationale: `${kind} is reviewed.`,
      entryCondition: `The workspace enters ${kind}.`,
      content: `${kind} content`,
      availableActions: kind === "success" ? ["Approve direction"] : ["Continue"],
      recovery: "Return to the initial state.",
    })),
    journeys: [{
      id: "review-direction",
      actorId: "developer",
      goal: "Review a visual direction",
      entryPoints: ["CocoUX status"],
      steps: [
        { id: "open-workspace", order: 0, screenId: "workspace", stateId: "workspace-initial", action: "Open preview", outcome: "The preview is visible", nextStepIds: ["approve-direction"] },
        { id: "approve-direction", order: 1, screenId: "workspace", stateId: "workspace-success", action: "Approve direction", outcome: "Direction is ready for CocoRef", nextStepIds: [] },
      ],
      alternatePaths: ["Request a revision"],
      successOutcome: "The approved visual direction can be handed to CocoRef.",
    }],
    transitions: [{ id: "preview-approved", fromStateId: "workspace-initial", toStateId: "workspace-success", trigger: "Activate approve", feedback: "Show confirmation", outcome: "Direction approved", recovery: "Request a revision" }],
    interactions: [{ id: "approve-button", stateId: "workspace-success", target: "Approve button", trigger: "Pointer click or Enter", behavior: "Submit approval", keyboard: "Enter or Space", focus: "Keep focus on confirmation", announcement: "Visual direction approved", feedback: "Show handoff status", recovery: "Retry approval" }],
    visualRecommendations: [{ id: "workspace-layout", screenId: "workspace", stateIds: kinds.map((kind) => `workspace-${kind}`), hierarchy: ["Header", "Journey", "Preview", "Decision bar"], layout: { desktop: "two columns", mobile: "one column" }, components: ["Button"], tokens: { spacing: "space-4", radius: "radius-lg" }, typography: { title: "display" }, color: { accent: "brand" }, motion: { transition: "fast" }, responsive: { compact: "stack panels" }, rationale: "Keep review context beside the preview." }],
    componentDecisions: [{ id: "reuse-button", recommendationId: "workspace-layout", component: "Button", decision: "reuse", inventoryId: "ui:Button", rationale: "The semantic action already exists.", consent: "not-required" }],
  };
}

function completeUx(): CocoUx {
  const ux = createCocoUx({
    feature: "checkout-redesign",
    brief: "Design the checkout journey.",
    inventory: [{ id: "ui:Button", kind: "ui", name: "Button" }],
    now: NOW,
  });
  return defineCocoUxDesign(ux, design(), NOW);
}

test("CocoUX validates complete journey, states, interactions, and visual reuse", () => {
  const ux = completeUx();
  assert.equal(ux.state, "ready-for-preview");
  assert.deepEqual(checkCocoUx(ux).diagnostics, []);
  assert.deepEqual(parseCocoUx(JSON.parse(JSON.stringify(ux))), ux);
  assert.deepEqual(renderCocoUxArtifacts(ux), renderCocoUxArtifacts(ux));
});

test("CocoUX reports unreachable journeys, incomplete states, and missing component consent", () => {
  const value = design();
  const broken = defineCocoUxDesign(createCocoUx({ feature: "broken", brief: "Broken UX", now: NOW }), {
    ...value,
    journeys: [{ ...value.journeys[0]!, steps: [...value.journeys[0]!.steps, { id: "orphan", order: 2, screenId: "workspace", stateId: "workspace-empty", action: "Wait", outcome: "Nothing", nextStepIds: [] }] }],
    states: value.states.filter(({ kind }) => kind !== "offline"),
    componentDecisions: [{ id: "missing-button", recommendationId: "workspace-layout", component: "Button", decision: "missing", rationale: "No reusable button found.", consent: "pending" }],
  }, NOW);
  const codes = checkCocoUx(broken).diagnostics.map(({ code }) => code);
  assert.ok(codes.includes("UX_JOURNEY_ROOT_INVALID"));
  assert.ok(codes.includes("UX_JOURNEY_DEAD_END"));
  assert.ok(codes.includes("UX_REQUIRED_STATE_MISSING"));
  assert.ok(codes.includes("UX_COMPONENT_CONSENT_REQUIRED"));
});

test("CocoUX approval only enables a hash-bound CocoRef handoff", () => {
  const ux = completeUx();
  const preview = markCocoUxPreview(ux, {
    sourcePaths: [".cocoframe/cocoux/checkout-redesign/preview.tsx"],
    sourceHashes: { ".cocoframe/cocoux/checkout-redesign/preview.tsx": HASH },
    previewUrl: "http://127.0.0.1:3212/__cocoux/checkout-redesign/workspace-success",
    screenshots: [{ id: "workspace-success-desktop-light", stateId: "workspace-success", viewport: { width: 1366, height: 768 }, theme: "light", file: ".cocoframe/cocoux/checkout-redesign/screenshots/workspace-success-desktop-light.png", sourceHash: HASH, imageHash: IMAGE_HASH, uxContractHash: HASH, description: "Approved-state desktop preview" }],
  }, NOW);
  assert.equal(preview.state, "preview-ready");
  const revising = requestCocoUxRevision(preview, "Increase the primary action contrast.", NOW);
  assert.equal(revising.state, "revising");
  const refreshed = markCocoUxPreview(revising, {
    sourcePaths: [".cocoframe/cocoux/checkout-redesign/preview.tsx"],
    sourceHashes: { ".cocoframe/cocoux/checkout-redesign/preview.tsx": HASH },
    previewUrl: "http://localhost:3212/__cocoux/checkout-redesign/workspace-success",
    screenshots: [{ id: "workspace-success-desktop-light", stateId: "workspace-success", viewport: { width: 1366, height: 768 }, theme: "light", file: ".cocoframe/cocoux/checkout-redesign/screenshots/workspace-success-desktop-light.png", sourceHash: HASH, imageHash: IMAGE_HASH, uxContractHash: HASH, description: "Revised desktop preview" }],
  }, NOW);
  const approved = approveCocoUx(refreshed, { reviewerRole: "application-developer", contractHash: HASH, previewHash: IMAGE_HASH }, NOW);
  assert.equal(approved.state, "approved");
  assert.equal(approved.handoff, undefined);
  const handedOff = handoffCocoUxToRef(approved, { refId: "checkout-redesign", refFile: "refs/checkout-redesign/ref.json", screenshotFiles: ["refs/checkout-redesign/references/workspace-success-desktop-light.png"], hashes: { "refs/checkout-redesign/references/workspace-success-desktop-light.png": IMAGE_HASH } }, NOW);
  assert.equal(handedOff.state, "handed-off");
});
