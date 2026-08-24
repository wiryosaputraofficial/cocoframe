import type { McpServer } from "@modelcontextprotocol/server";
import type { AgentApprovalDecision, RecordApprovalInput } from "./mutation.ts";

/** Version of CocoFrame's provider-independent Agent Bridge contract. */
export const AGENT_BRIDGE_PROTOCOL_VERSION = 2 as const;

/** Permission class advertised for every Agent Bridge tool. */
export type AgentPermission = "read" | "write" | "execute" | "external";

/** Stable diagnostic codes returned by Agent Bridge operations. */
export type AgentDiagnosticCode =
  | "CONNECTION_FAILED"
  | "UNSUPPORTED_PROTOCOL_VERSION"
  | "INVALID_WORKSPACE"
  | "WORKSPACE_ACCESS_DENIED"
  | "INVALID_TOOL_INPUT"
  | "CAPABILITY_UNAVAILABLE"
  | "WORKFLOW_CONTEXT_REQUIRED"
  | "SPECIFICATION_REQUIRED"
  | "SPECIFICATION_NOT_APPROVED"
  | "REFERENCE_DECISION_REQUIRED"
  | "COCOREF_REQUIRED"
  | "COMPONENT_AUDIT_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_EXPIRED"
  | "STATE_CONFLICT"
  | "MUTATION_FAILED"
  | "PARTIAL_MUTATION"
  | "OPERATION_TIMEOUT"
  | "OPERATION_CANCELLED"
  | "INVALID_CANONICAL_STATE"
  | "QUALITY_GATE_FAILED"
  | "LINK_TARGET_MISSING"
  | "TARGET_NOT_REACHABLE"
  | "INERT_INTERACTION"
  | "VISUAL_ALIGNMENT_FAILED"
  | "VISUAL_EVIDENCE_REQUIRED"
  | "GENERATED_ARTIFACT_STALE"
  | "EXTERNAL_SERVICE_UNAVAILABLE"
  | "SENSITIVE_OUTPUT_BLOCKED";

/** Machine-readable failure with a corrective next action. */
export interface AgentDiagnostic {
  readonly code: AgentDiagnosticCode;
  readonly message: string;
  readonly recovery: string;
}

/** A page or API route discovered without building the application. */
export interface AgentRoute {
  readonly kind: "page" | "api";
  readonly pattern: string;
  readonly file: string;
  readonly layouts: readonly string[];
}

/** A contracted or filename-discovered application API. */
export interface AgentApi {
  readonly id: string;
  readonly method: string;
  readonly pattern: string;
  readonly file: string;
  readonly source: "route" | "openapi";
}

/** A reusable application or framework UI component. */
export interface AgentComponent {
  readonly name: string;
  readonly kind: "application" | "framework";
  readonly source: string;
  readonly file?: string;
}

/** An opt-in browser island found in the application. */
export interface AgentIsland {
  readonly name: string;
  readonly file: string;
}

/** Middleware statically declared by the application configuration. */
export interface AgentMiddleware {
  readonly id: string;
  readonly source: string;
  readonly file: string;
}

/** A package dependency declared by the inspected workspace. */
export interface AgentDependency {
  readonly name: string;
  readonly range: string;
  readonly kind: "dependency" | "devDependency" | "peerDependency" | "optionalDependency";
}

/** An existing generated artifact that can be consumed but is never rewritten by inspection. */
export interface AgentGeneratedCapability {
  readonly kind: "openapi" | "client" | "api-reference" | "context" | "assets" | "deployment" | "design-profile";
  readonly file: string;
}

/** Canonical read-only application snapshot supplied to Agent Bridge. */
export interface AgentProjectSnapshot {
  readonly framework: "cocoframe";
  readonly version: 1;
  readonly projectRoot: string;
  readonly packageName: string;
  readonly packageVersion: string;
  readonly routes: readonly AgentRoute[];
  readonly apis: readonly AgentApi[];
  readonly components: readonly AgentComponent[];
  readonly islands: readonly AgentIsland[];
  readonly middleware: readonly AgentMiddleware[];
  readonly dependencies: readonly AgentDependency[];
  readonly generatedCapabilities: readonly AgentGeneratedCapability[];
}

/** Read-only project inspection adapter injected by a CocoFrame host such as the CLI. */
export type AgentProjectInspector = (projectRoot: string, signal?: AbortSignal) => Promise<AgentProjectSnapshot>;

export interface AgentProposedFile {
  readonly path: string;
  readonly content: string;
}

/** Canonical host adapter that derives routes from proposed files without writing them. */
export type AgentProposedRouteInspector = (
  projectRoot: string,
  changes: readonly AgentProposedFile[],
) => readonly AgentRoute[] | Promise<readonly AgentRoute[]>;

/** Configuration for one local Agent Bridge instance. */
export interface AgentBridgeOptions {
  readonly workspaceRoot: string;
  readonly inspectProject: AgentProjectInspector;
  /** Uses the host's canonical route convention to validate planned destinations before writes. */
  readonly inspectProposedRoutes?: AgentProposedRouteInspector;
  /** Optional stable session identifier supplied by an editor host. */
  readonly sessionId?: string;
  /** Testable clock used for approval expiry and audit timestamps. */
  readonly now?: () => Date;
  /** Approval lifetime; defaults to the approved fifteen-minute policy. */
  readonly approvalMinutes?: number;
}

/** Discoverable contract metadata for one provider-independent Agent Bridge tool. */
export interface AgentToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly permission: AgentPermission;
  readonly protocolVersion: typeof AGENT_BRIDGE_PROTOCOL_VERSION;
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

/** In-process Agent Bridge used by MCP transports and focused integration tests. */
export interface AgentBridge {
  readonly workspaceRoot: string;
  readonly sessionId: string;
  readonly server: McpServer;
  readonly tools: readonly AgentToolDescriptor[];
  execute(name: string, input: unknown, signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>>;
  /** Host-only approval channel; this method is intentionally not registered as an MCP tool. */
  decideOperation(operationId: string, input: RecordApprovalInput): Promise<AgentApprovalDecision>;
}
