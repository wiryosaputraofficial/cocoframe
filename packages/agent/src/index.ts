import { createRequestStateCodec, acceptedContent, inputRequired, inputResponse, McpServer } from "@modelcontextprotocol/server";
import { randomBytes } from "node:crypto";
import * as z from "zod/v4";
import {
  auditCocoRefLifecycle,
  readCocoQaTrace,
  readCocoSpecsNext,
} from "./lifecycle.ts";
import {
  AgentMutationManager,
  readAgentOperationPlan,
  recordAgentApproval,
  type AgentApprovalDecision,
  type AgentApprovalDecisionKind,
  type AgentApprovalRole,
  type AgentExecutionRecord,
  type AgentFileChange,
  type AgentMutationTarget,
  type AgentOperationPlan,
  type RecordApprovalInput,
} from "./mutation.ts";
import {
  assertAgentWorkflowCurrent,
  validateAgentWorkflow,
  type AgentReferenceDecision,
  type AgentTargetRequirement,
  type AgentTargetVerification,
  type AgentWorkflowBinding,
  type AgentWorkflowIntent,
  type AgentWorkflowRequest,
} from "./workflow.ts";
import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  type AgentBridge,
  type AgentBridgeOptions,
  type AgentDiagnostic,
  type AgentPermission,
  type AgentProjectSnapshot,
  type AgentToolDescriptor,
} from "./types.ts";
import {
  assertSafeTree,
  diagnosticFrom,
  findApis,
  findComponents,
  readWorkflowRecords,
  resolveWorkspaceRoot,
  sanitizeAgentOutput,
  searchDocumentation,
  throwIfCancelled,
} from "./workspace.ts";

export {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  type AgentApi,
  type AgentBridge,
  type AgentBridgeOptions,
  type AgentComponent,
  type AgentDependency,
  type AgentDiagnostic,
  type AgentDiagnosticCode,
  type AgentGeneratedCapability,
  type AgentIsland,
  type AgentMiddleware,
  type AgentPermission,
  type AgentProjectInspector,
  type AgentProjectSnapshot,
  type AgentProposedFile,
  type AgentProposedRouteInspector,
  type AgentRoute,
  type AgentToolDescriptor,
} from "./types.ts";
export {
  AgentMutationManager,
  readAgentOperationPlan,
  recordAgentApproval,
  type AgentApprovalDecision,
  type AgentApprovalDecisionKind,
  type AgentApprovalRole,
  type AgentExecutionRecord,
  type AgentFileChange,
  type AgentMutationTarget,
  type AgentOperationPlan,
  type RecordApprovalInput,
} from "./mutation.ts";
export {
  type AgentReferenceDecision,
  type AgentTargetRequirement,
  type AgentTargetVerification,
  type AgentWorkflowBinding,
  type AgentWorkflowIntent,
  type AgentWorkflowRequest,
} from "./workflow.ts";

const diagnosticSchema = z.object({
  code: z.enum([
    "CONNECTION_FAILED", "UNSUPPORTED_PROTOCOL_VERSION", "INVALID_WORKSPACE", "WORKSPACE_ACCESS_DENIED",
    "INVALID_TOOL_INPUT", "CAPABILITY_UNAVAILABLE", "WORKFLOW_CONTEXT_REQUIRED", "SPECIFICATION_REQUIRED",
    "SPECIFICATION_NOT_APPROVED", "REFERENCE_DECISION_REQUIRED", "COCOREF_REQUIRED", "COMPONENT_AUDIT_REQUIRED",
    "APPROVAL_REQUIRED", "APPROVAL_EXPIRED", "STATE_CONFLICT", "MUTATION_FAILED", "PARTIAL_MUTATION",
    "OPERATION_TIMEOUT", "OPERATION_CANCELLED", "INVALID_CANONICAL_STATE", "QUALITY_GATE_FAILED",
    "LINK_TARGET_MISSING", "TARGET_NOT_REACHABLE", "INERT_INTERACTION", "VISUAL_ALIGNMENT_FAILED",
    "VISUAL_EVIDENCE_REQUIRED", "GENERATED_ARTIFACT_STALE", "EXTERNAL_SERVICE_UNAVAILABLE", "SENSITIVE_OUTPUT_BLOCKED",
  ]),
  message: z.string(),
  recovery: z.string(),
});

const routeSchema = z.object({ kind: z.enum(["page", "api"]), pattern: z.string(), file: z.string(), layouts: z.array(z.string()) });
const apiSchema = z.object({ id: z.string(), method: z.string(), pattern: z.string(), file: z.string(), source: z.enum(["route", "openapi"]) });
const componentSchema = z.object({ name: z.string(), kind: z.enum(["application", "framework"]), source: z.string(), file: z.string().optional() });
const islandSchema = z.object({ name: z.string(), file: z.string() });
const middlewareSchema = z.object({ id: z.string(), source: z.string(), file: z.string() });
const dependencySchema = z.object({ name: z.string(), range: z.string(), kind: z.enum(["dependency", "devDependency", "peerDependency", "optionalDependency"]) });
const generatedCapabilitySchema = z.object({ kind: z.enum(["openapi", "client", "api-reference", "context", "assets", "deployment", "design-profile"]), file: z.string() });
const paginationSchema = z.object({ limit: z.number().int(), truncated: z.boolean(), nextCursor: z.string().optional() });

const baseInputSchema = z.object({ protocolVersion: z.number().int().optional() });
const paginatedInputSchema = baseInputSchema.extend({ cursor: z.string().regex(/^\d+$/).optional(), limit: z.number().int().min(1).max(500).default(100) });
const projectInputSchema = paginatedInputSchema;
const docsInputSchema = paginatedInputSchema.extend({ query: z.string().trim().min(1).max(200) });
const componentInputSchema = paginatedInputSchema.extend({ query: z.string().trim().max(200).default("") });
const apiInputSchema = paginatedInputSchema.extend({ query: z.string().trim().max(200).default("") });
const workflowInputSchema = paginatedInputSchema.extend({ lifecycle: z.enum(["all", "cocospec", "cocoref", "cocoqa"]).default("all") });const cocoSpecsInputSchema = baseInputSchema.extend({
  feature: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200).optional(),
  brief: z.string().trim().max(2_000).optional(),
  mode: z.enum(["quick", "standard", "thorough"]).default("standard"),
  limit: z.number().int().min(1).max(4).default(4),
});
const cocoRefRequirementInputSchema = z.object({
  id: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  query: z.string().trim().min(1).max(200).optional(),
});
const cocoRefAuditInputSchema = baseInputSchema.extend({
  name: z.string().trim().min(1).max(100),
  requirements: z.array(cocoRefRequirementInputSchema).max(50).default([]),
});
const cocoQaInputSchema = baseInputSchema.extend({
  feature: z.string().trim().min(1).max(100),
  mode: z.enum(["standard", "thorough"]).default("standard"),
  limit: z.number().int().min(1).max(4).default(4),
});const fileChangeSchema = z.object({
  path: z.string().trim().min(1).max(500),
  content: z.string().max(256 * 1024),
});
const targetRequirementSchema = z.object({
  source: z.string().trim().min(1).max(500),
  target: z.string().trim().min(1).max(2_000),
  accessibleName: z.string().trim().min(1).max(300),
  keyboard: z.literal(true),
  visibleFocus: z.literal(true),
  actionMatchesLabel: z.literal(true),
  externalEvidence: z.object({
    provider: z.string().trim().min(1).max(100),
    status: z.literal("verified"),
    summary: z.string().trim().min(1).max(1_000),
  }).optional(),
});
const workflowRequestSchema = z.object({
  version: z.literal(1),
  intent: z.enum(["mechanical", "user-facing"]),
  feature: z.string().trim().min(1).max(100).optional(),
  visual: z.boolean(),
  referenceDecision: z.enum(["reference", "no-reference", "not-applicable"]).optional(),
  cocoRef: z.string().trim().min(1).max(100).optional(),
  targets: z.array(targetRequirementSchema).max(100).default([]),
});
const mutationPlanInputSchema = baseInputSchema.extend({
  action: z.literal("files.write"),
  changes: z.array(fileChangeSchema).min(1).max(20),
  workflow: workflowRequestSchema.optional(),
});
const mutationExecuteInputSchema = baseInputSchema.extend({
  operationId: z.string().uuid(),
});
const approvalFormSchema = z.object({
  role: z.enum(["application-developer", "framework-maintainer"]),
  actorLabel: z.string().trim().min(1).max(100).optional(),
  approvedTargets: z.string().trim().max(5_000).optional(),
});

const projectDataSchema = z.object({
  framework: z.literal("cocoframe"), version: z.literal(1), projectRoot: z.string(), packageName: z.string(), packageVersion: z.string(),
  routes: z.array(routeSchema), apis: z.array(apiSchema), components: z.array(componentSchema), islands: z.array(islandSchema),
  middleware: z.array(middlewareSchema), dependencies: z.array(dependencySchema), generatedCapabilities: z.array(generatedCapabilitySchema),
  pagination: paginationSchema,
});
const docsDataSchema = z.object({
  matches: z.array(z.object({ title: z.string(), file: z.string(), line: z.number().int(), excerpt: z.string() })),
  total: z.number().int(), nextCursor: z.string().optional(),
});
const componentDataSchema = z.object({ components: z.array(componentSchema), total: z.number().int(), auditedExistingComponents: z.literal(true), nextCursor: z.string().optional() });
const apiDataSchema = z.object({ apis: z.array(apiSchema), total: z.number().int(), nextCursor: z.string().optional() });
const workflowDataSchema = z.object({
  records: z.array(z.object({ lifecycle: z.enum(["cocospec", "cocoref", "cocoqa"]), id: z.string(), state: z.string(), version: z.number().int(), file: z.string(), valid: z.boolean(), issue: z.string().optional() })),
  total: z.number().int(), nextCursor: z.string().optional(),
});const cocoSpecQuestionSchema = z.object({
  id: z.string(), section: z.enum(["intent", "users", "flow", "interface", "authentication", "data", "integration", "quality", "delivery"]),
  prompt: z.string(), why: z.string(), type: z.enum(["text", "list", "choice", "structured"]), required: z.boolean(),
  options: z.array(z.string()).optional(), responseHint: z.string().optional(),
});
const cocoSpecsDataSchema = z.object({
  lifecycle: z.literal("cocospec"), feature: z.object({ id: z.string(), title: z.string() }),
  mode: z.enum(["quick", "standard", "thorough"]), state: z.enum(["draft", "ready", "approved"]),
  source: z.enum(["canonical", "proposed"]), canonicalFile: z.string(),
  progress: z.object({ answered: z.number().int(), total: z.number().int(), complete: z.boolean() }),
  questions: z.array(cocoSpecQuestionSchema), mutationRequired: z.boolean(), nextAction: z.string(),
});
const cocoRefDecisionSchema = z.object({
  id: z.string(), description: z.string(), decision: z.enum(["reuse", "missing"]),
  matches: z.array(componentSchema), consentRequired: z.literal(true).optional(),
});
const cocoRefDataSchema = z.object({
  lifecycle: z.literal("cocoref"), name: z.string(), state: z.string(), source: z.enum(["canonical", "proposed"]), canonicalFile: z.string(),
  auditedExistingComponents: z.literal(true), inventory: z.array(componentSchema), requirements: z.array(cocoRefDecisionSchema),
  missingComponents: z.array(cocoRefDecisionSchema), mutationRequired: z.boolean(), nextAction: z.string(),
});
const cocoQaQuestionSchema = z.object({
  id: z.string(), category: z.enum(["functional", "edge-case", "accessibility", "responsive", "security", "performance", "compatibility", "visual"]),
  prompt: z.string(), why: z.string(), responseHint: z.string(), required: z.boolean(),
});
const cocoQaCaseSchema = z.object({
  id: z.string(), title: z.string(), category: z.string(), source: z.string(), required: z.boolean(), status: z.string(),
  evidence: z.string().optional(), updatedAt: z.string().optional(),
});
const cocoQaGateSchema = z.object({
  id: z.string(), script: z.string(), required: z.boolean(), status: z.string(), durationMs: z.number().int().optional(),
  exitCode: z.number().int().optional(), updatedAt: z.string().optional(),
});
const cocoQaDefectSchema = z.object({
  id: z.string(), title: z.string(), severity: z.string(), status: z.string(), steps: z.array(z.string()),
  expected: z.string().optional(), actual: z.string().optional(), evidence: z.string().optional(), resolution: z.string().optional(),
  createdAt: z.string(), updatedAt: z.string(),
});
const cocoQaDataSchema = z.object({
  lifecycle: z.literal("cocoqa"), feature: z.object({ id: z.string(), title: z.string() }), mode: z.enum(["standard", "thorough"]),
  state: z.string(), approved: z.boolean(), source: z.enum(["canonical", "proposed"]), canonicalFile: z.string(),
  sources: z.array(z.object({ kind: z.enum(["cocospec", "cocoref", "design-profile", "manual"]), id: z.string(), file: z.string().optional(), state: z.string() })),
  acceptanceCriteria: z.array(z.string()),
  designProfile: z.object({ id: z.string(), file: z.string(), hash: z.string() }).optional(),
  questions: z.array(cocoQaQuestionSchema), cases: z.array(cocoQaCaseSchema),
  gates: z.array(cocoQaGateSchema), defects: z.array(cocoQaDefectSchema),
  unresolved: z.array(z.object({ kind: z.enum(["question", "case", "gate", "defect"]), id: z.string(), message: z.string() })),
  mutationRequired: z.boolean(), nextAction: z.string(),
});const mutationTargetSchema = z.object({
  path: z.string(), mode: z.enum(["create", "update"]), currentHash: z.string(), proposedHash: z.string(), size: z.number().int().nonnegative(),
});
const workflowBindingSchema = z.object({
  version: z.literal(1), intent: z.enum(["mechanical", "user-facing"]), featureId: z.string().optional(),
  inspectionHash: z.string(), specificationHash: z.string().optional(),
  referenceDecision: z.enum(["reference", "no-reference", "not-applicable"]).optional(),
  cocoRefHash: z.string().optional(), componentInventoryHash: z.string(), designProfileHash: z.string().optional(),
  targetVerificationHash: z.string(), verifiedTargetCount: z.number().int().nonnegative(),
  externalTargetCount: z.number().int().nonnegative(), visualQaRequired: z.boolean(),
  requiredVisualPrinciples: z.array(z.string()),
});
const targetVerificationSchema = z.object({
  source: z.string(), target: z.string(), kind: z.enum(["internal-route", "internal-anchor", "api", "external"]),
  evidence: z.enum(["inspected", "planned", "document", "provider"]),
});
const operationPlanSchema = z.object({
  version: z.literal(1), id: z.string(), sessionId: z.string(), toolId: z.literal("mutation.execute"), action: z.literal("files.write"),
  permissionLevel: z.literal("write"), requiredRole: z.enum(["application-developer", "framework-maintainer"]),
  workflow: workflowBindingSchema, declaredTargets: z.array(mutationTargetSchema), reviewedHashes: z.string(),
  status: z.literal("pending"), createdAt: z.string(), expiresAt: z.string(),
});
const mutationPlanDataSchema = z.object({
  operation: operationPlanSchema,
  verifiedTargets: z.array(targetVerificationSchema),
  approval: z.object({ required: z.literal(true), channel: z.literal("mcp-elicitation-or-host"), roles: z.array(z.enum(["application-developer", "framework-maintainer"])) }),
});
const executionDataSchema = z.object({
  version: z.literal(1), id: z.string(), operationId: z.string(), sessionId: z.string(),
  outcome: z.enum(["completed", "cancelled", "failed", "rolled-back", "partial"]), startedAt: z.string(), completedAt: z.string(),
  affectedTargets: z.array(z.string()), diagnosticCodes: z.array(z.string()),
  workflow: z.object({
    featureId: z.string().optional(), referenceDecision: z.enum(["reference", "no-reference", "not-applicable"]).optional(),
    verifiedTargetCount: z.number().int().nonnegative(), visualQaRequired: z.boolean(),
    qualityState: z.enum(["required", "not-required"]), nextAction: z.string(),
  }),
});

function resultSchema<Data extends z.ZodType>(data: Data, permission: AgentPermission = "read") {
  return z.object({
    protocolVersion: z.literal(AGENT_BRIDGE_PROTOCOL_VERSION),
    tool: z.string(),
    permission: z.literal(permission),
    ok: z.boolean(),
    durationMs: z.number().nonnegative(),
    data: data.optional(),
    diagnostic: diagnosticSchema.optional(),
  });
}

interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly permission?: AgentPermission;
  readonly inputSchema: z.ZodType<Record<string, unknown>>;
  readonly outputSchema: z.ZodType<Record<string, unknown>>;
  readonly inputSchemaVersion?: number;
  readonly outputSchemaVersion?: number;
  readonly run: (input: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
}

/**
 * Creates a validated, read-only Agent Bridge and its MCP server.
 * No filesystem state is created or changed by this operation.
 */
export async function createAgentBridge(options: AgentBridgeOptions): Promise<AgentBridge> {
  const workspaceRoot = await resolveWorkspaceRoot(options.workspaceRoot);
  const inspect = async (signal?: AbortSignal) => {
    await assertSafeTree(workspaceRoot, "app", signal);
    return options.inspectProject(workspaceRoot, signal);
  };
  const inspectProposedRoutes = async (changes: readonly AgentFileChange[]) =>
    options.inspectProposedRoutes ? await options.inspectProposedRoutes(workspaceRoot, changes) : [];
  const mutation = new AgentMutationManager({
    root: workspaceRoot,
    ...(options.sessionId ? { sessionId: options.sessionId } : {}),
    ...(options.now ? { now: options.now } : {}),
    ...(options.approvalMinutes === undefined ? {} : { approvalMinutes: options.approvalMinutes }),
    validateWorkflow: async (request, expected, changes, signal) =>
      assertAgentWorkflowCurrent(workspaceRoot, await inspect(signal), changes, request, expected, await inspectProposedRoutes(changes), signal),
  });
  const definitions: readonly ToolDefinition[] = [
    {
      name: "project.inspect",
      description: "Inspect routes, APIs, reusable components, islands, middleware, dependencies, and existing generated capabilities without modifying the workspace.",
      inputSchema: projectInputSchema,
      outputSchema: resultSchema(projectDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        const snapshot = await inspect(signal);
        const offset = cursorOffset(input.cursor);
        const limit = input.limit as number;
        return pageSnapshot(snapshot, offset, limit);
      },
    },
    {
      name: "docs.search",
      description: "Search CocoFrame workspace documentation and generated API references before proposing a new implementation.",
      inputSchema: docsInputSchema,
      outputSchema: resultSchema(docsDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        return searchDocumentation(workspaceRoot, input.query as string, cursorOffset(input.cursor), input.limit as number, signal);
      },
    },
    {
      name: "component.find",
      description: "Audit reusable application and @cocoframe/ui components before any missing component is proposed through CocoRef.",
      inputSchema: componentInputSchema,
      outputSchema: resultSchema(componentDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        return findComponents(await inspect(signal), input.query as string, cursorOffset(input.cursor), input.limit as number);
      },
    },
    {
      name: "api.lookup",
      description: "Find existing filename-discovered and contracted APIs before suggesting a redundant endpoint or service.",
      inputSchema: apiInputSchema,
      outputSchema: resultSchema(apiDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        return findApis(await inspect(signal), input.query as string, cursorOffset(input.cursor), input.limit as number);
      },
    },
    {
      name: "workflow.status",
      description: "Read canonical CocoSpecs, CocoRef, and CocoQA lifecycle states without changing or regenerating their artifacts.",
      inputSchema: workflowInputSchema,
      outputSchema: resultSchema(workflowDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        return readWorkflowRecords(workspaceRoot, input.lifecycle as string, cursorOffset(input.cursor), input.limit as number, signal);
      },
    },    {
      name: "cocospecs.next",
      description: "Start an in-memory CocoSpec proposal or resume the canonical CocoSpec and return only its next adaptive question batch without changing workspace state.",
      inputSchema: cocoSpecsInputSchema,
      outputSchema: resultSchema(cocoSpecsDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        return readCocoSpecsNext(workspaceRoot, await inspect(signal), input as never, signal);
      },
    },
    {
      name: "cocoref.audit",
      description: "Audit existing application and framework components before proposing any missing reference component; no preview or file is created.",
      inputSchema: cocoRefAuditInputSchema,
      outputSchema: resultSchema(cocoRefDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        return auditCocoRefLifecycle(workspaceRoot, await inspect(signal), input as never, signal);
      },
    },
    {
      name: "cocoqa.trace",
      description: "Read or propose CocoQA traceability from an approved canonical CocoSpec, including adaptive questions, cases, gates, evidence, defects, and approval state.",
      inputSchema: cocoQaInputSchema,
      outputSchema: resultSchema(cocoQaDataSchema),
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion);
        return readCocoQaTrace(workspaceRoot, input as never, signal);
      },
    },    {
      name: "mutation.plan",
      description: "Create a hash-only, expiring operation plan for explicit workspace file writes. Proposed source content remains in memory and no declared target is changed.",
      permission: "write",
      inputSchema: mutationPlanInputSchema,
      outputSchema: resultSchema(mutationPlanDataSchema, "write"),
      inputSchemaVersion: 2,
      outputSchemaVersion: 2,
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion, "write");
        const changes = input.changes as unknown as readonly AgentFileChange[];
        const request = input.workflow as unknown as AgentWorkflowRequest | undefined;
        const validated = await validateAgentWorkflow(workspaceRoot, await inspect(signal), changes, request, await inspectProposedRoutes(changes), signal);
        const operation = await mutation.planFiles(changes, validated.binding, request!, signal);
        return {
          operation,
          verifiedTargets: validated.targets,
          approval: { required: true as const, channel: "mcp-elicitation-or-host" as const, roles: [operation.requiredRole] },
        };
      },
    },
    {
      name: "mutation.execute",
      description: "Execute only the approved target subset of one unexpired, unchanged, single-use operation plan. No shell, deletion, package install, Git, publish, deploy, database, or external action is available.",
      permission: "write",
      inputSchema: mutationExecuteInputSchema,
      outputSchema: resultSchema(executionDataSchema, "write"),
      inputSchemaVersion: 2,
      outputSchemaVersion: 2,
      run: async (input, signal) => {
        assertProtocolVersion(input.protocolVersion, "write");
        return mutation.execute(input.operationId as string, signal);
      },
    },
  ];

  const execute = async (name: string, input: unknown, signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>> => {
    const started = performance.now();
    const definition = definitions.find((candidate) => candidate.name === name);
    if (!definition) return failure(name, started, "read", { code: "CAPABILITY_UNAVAILABLE", message: `Agent Bridge does not provide the requested capability: ${name}.`, recovery: "Use a tool returned by MCP tool discovery or ask the user how to proceed." });
    const permission = definition.permission ?? "read";
    const parsed = definition.inputSchema.safeParse(input);
    if (!parsed.success) return failure(name, started, permission, { code: "INVALID_TOOL_INPUT", message: parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; "), recovery: "Correct the reported fields and retry with schema-valid input." });
    try {
      throwIfCancelled(signal);
      const data = sanitizeAgentOutput(await definition.run(parsed.data, signal));
      throwIfCancelled(signal);
      const result = { protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION, tool: name, permission, ok: true, durationMs: elapsed(started), data };
      if (Buffer.byteLength(JSON.stringify(result)) > 1024 * 1024) return failure(name, started, permission, { code: "CAPABILITY_UNAVAILABLE", message: "The operation result exceeded the 1 MiB response limit.", recovery: "Request a smaller page with the cursor and limit fields." });
      return result;
    } catch (error) {
      return failure(name, started, permission, diagnosticFrom(error));
    }
  };

  const approvalState = createRequestStateCodec<{ readonly operationId: string; readonly reviewedHashes: string; readonly sessionId: string }>({
    key: randomBytes(32),
    ttlSeconds: Math.max(60, Math.round((options.approvalMinutes ?? 15) * 60)),
    bind: (context) => `${context.mcpReq.method}\0${mutation.sessionId}`,
  });
  const server = new McpServer(
    { name: "cocoframe-agent-bridge", version: "0.0.1" },
    {
      instructions: "Inspect and reuse existing CocoFrame capabilities first. User-facing work must complete approved CocoSpecs, an explicit visual-reference decision, CocoRef when applicable, verified interaction targets, and required visual QA. Mutations require exact workflow- and hash-bound plans plus human approval; an AI agent cannot approve its own operation.",
      requestState: { verify: approvalState.verify },
    },
  );
  for (const definition of definitions) {
    const mcpInputSchema = definition.inputSchema.catch({ __cocoframeInvalidInput: true });
    server.registerTool(definition.name, {
      description: definition.description,
      inputSchema: mcpInputSchema,
      outputSchema: definition.outputSchema,
      _meta: {
        "io.cocoframe/agent": {
          protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
          inputSchemaVersion: definition.inputSchemaVersion ?? 1,
          outputSchemaVersion: definition.outputSchemaVersion ?? 1,
          permission: definition.permission ?? "read",
        },
      },
    }, async (input, context) => {
      let result = await execute(definition.name, input, context.mcpReq.signal);
      if (definition.name === "mutation.execute") {
        const operationId = input.operationId as string;
        const response = inputResponse(context.mcpReq.inputResponses, "approval");
        const state = context.mcpReq.requestState<{ readonly operationId: string; readonly reviewedHashes: string; readonly sessionId: string }>();
        if (response.kind === "elicit" && (response.action === "decline" || response.action === "cancel")) {
          const plan = await readAgentOperationPlan(workspaceRoot, operationId);
          await mutation.decide(operationId, { decision: response.action === "decline" ? "deny" : "cancel", role: plan.requiredRole });
          result = await execute(definition.name, input, context.mcpReq.signal);
        } else if (response.kind === "elicit" && response.action === "accept") {
          const approval = acceptedContent(context.mcpReq.inputResponses, "approval", approvalFormSchema);
          const plan = await readAgentOperationPlan(workspaceRoot, operationId);
          if (!approval || !state || state.operationId !== operationId || state.sessionId !== mutation.sessionId || state.reviewedHashes !== plan.reviewedHashes) {
            result = failure(definition.name, performance.now(), "write", {
              code: "STATE_CONFLICT",
              message: "The MCP approval response is not bound to this exact operation, session, and reviewed hash.",
              recovery: "Discard the response and request a new approval for the current operation plan.",
            });
          } else {
            const approvedTargets = approval.approvedTargets?.split(",").map((target) => target.trim()).filter(Boolean);
            await mutation.decide(operationId, { decision: "approve", role: approval.role, ...(approval.actorLabel ? { actorLabel: approval.actorLabel } : {}), ...(approvedTargets?.length ? { approvedTargets } : {}) });
            result = await execute(definition.name, input, context.mcpReq.signal);
          }
        }
        if ((result.diagnostic as { readonly code?: string } | undefined)?.code === "APPROVAL_REQUIRED") {
          const plan = await readAgentOperationPlan(workspaceRoot, operationId);
          const requestState = await approvalState.mint({ operationId, reviewedHashes: plan.reviewedHashes, sessionId: mutation.sessionId }, context);
          return inputRequired({
            requestState,
            inputRequests: {
              approval: inputRequired.elicit({
                message: `Approve ${plan.action} for ${plan.declaredTargets.length} target(s)?\n${plan.declaredTargets.map((target) => `${target.path} [${target.mode}] ${target.proposedHash}`).join("\n")}\nApproval expires at ${plan.expiresAt}.`,
                requestedSchema: approvalFormSchema,
              }),
            },
          });
        }
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
        ...(result.ok === false ? { isError: true } : {}),
      };
    });
  }

  const tools: AgentToolDescriptor[] = definitions.map((definition) => ({
    name: definition.name,
    description: definition.description,
    permission: definition.permission ?? "read",
    protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
    inputSchemaVersion: definition.inputSchemaVersion ?? 1,
    outputSchemaVersion: definition.outputSchemaVersion ?? 1,
    inputSchema: z.toJSONSchema(definition.inputSchema) as Record<string, unknown>,
    outputSchema: z.toJSONSchema(definition.outputSchema) as Record<string, unknown>,
  }));
  return { workspaceRoot, sessionId: mutation.sessionId, server, tools, execute, decideOperation: (operationId, input) => mutation.decide(operationId, input) };
}

function pageSnapshot(snapshot: AgentProjectSnapshot, offset: number, limit: number) {
  const collections = [snapshot.routes, snapshot.apis, snapshot.components, snapshot.islands, snapshot.middleware, snapshot.dependencies, snapshot.generatedCapabilities];
  const maximum = Math.max(...collections.map((items) => items.length));
  return {
    ...snapshot,
    routes: snapshot.routes.slice(offset, offset + limit),
    apis: snapshot.apis.slice(offset, offset + limit),
    components: snapshot.components.slice(offset, offset + limit),
    islands: snapshot.islands.slice(offset, offset + limit),
    middleware: snapshot.middleware.slice(offset, offset + limit),
    dependencies: snapshot.dependencies.slice(offset, offset + limit),
    generatedCapabilities: snapshot.generatedCapabilities.slice(offset, offset + limit),
    pagination: { limit, truncated: offset + limit < maximum, ...(offset + limit < maximum ? { nextCursor: String(offset + limit) } : {}) },
  };
}

function assertProtocolVersion(value: unknown, permission: AgentPermission = "read"): void {
  if (value === 1 && permission === "read") return;
  if (value !== undefined && value !== AGENT_BRIDGE_PROTOCOL_VERSION) {
    throw Object.assign(new Error("Unsupported Agent Bridge protocol version."), {
      agentDiagnostic: {
        code: "UNSUPPORTED_PROTOCOL_VERSION",
        message: `Agent Bridge protocol version ${String(value)} is not supported; expected ${AGENT_BRIDGE_PROTOCOL_VERSION}.`,
        recovery: "Upgrade the client or Agent Bridge to a mutually supported version.",
      } satisfies AgentDiagnostic,
    });
  }
}

function cursorOffset(value: unknown): number {
  return value === undefined ? 0 : Number.parseInt(value as string, 10);
}

function failure(name: string, started: number, permission: AgentPermission, diagnostic: AgentDiagnostic): Readonly<Record<string, unknown>> {
  return { protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION, tool: name, permission, ok: false, durationMs: elapsed(started), diagnostic };
}

function elapsed(started: number): number {
  return Math.max(0, Math.round((performance.now() - started) * 100) / 100);
}
