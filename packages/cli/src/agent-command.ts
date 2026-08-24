import path from "node:path";
import process from "node:process";
import {
  readAgentOperationPlan,
  recordAgentApproval,
  type AgentApprovalDecisionKind,
  type AgentApprovalRole,
} from "@cocoframe/agent";
import { serveAgentBridgeStdio } from "@cocoframe/agent/stdio";
import { inspectProjectReadOnly } from "./inspect-readonly.ts";

interface AgentCommandIo {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

const decisions = new Set<AgentApprovalDecisionKind>(["approve", "deny", "cancel", "expire"]);

/** Starts MCP stdio or records a host-only approval decision outside the MCP tool surface. */
export async function runAgentCommand(
  args: readonly string[],
  currentDirectory = process.cwd(),
  io: AgentCommandIo = { log: console.log, error: console.error },
): Promise<number> {
  const [first = ".", ...rest] = args;
  if (!decisions.has(first as AgentApprovalDecisionKind)) {
    const projectInput = first === "serve" ? rest[0] ?? "." : first;
    if (first === "serve" && rest.length > 1) throw new Error("cocoframe agent serve accepts one project path.");
    if (first !== "serve" && rest.length > 0) throw new Error("cocoframe agent accepts one project path, or an approval command.");
    const projectRoot = path.resolve(currentDirectory, projectInput);
    const handle = serveAgentBridgeStdio({ workspaceRoot: projectRoot, inspectProject: inspectProjectReadOnly });
    const close = () => { void handle.close(); };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
    return 0;
  }

  const decision = first as AgentApprovalDecisionKind;
  const parsed = parseArguments(rest);
  const operationId = parsed.positional[0];
  if (!operationId || parsed.positional.length !== 1) throw new Error("cocoframe agent " + decision + " requires one operation ID.");
  const role = parsed.options.role;
  if (role !== "application-developer" && role !== "framework-maintainer") {
    throw new Error("cocoframe agent " + decision + " requires --role application-developer|framework-maintainer.");
  }
  const projectRoot = path.resolve(currentDirectory, parsed.options.project ?? ".");
  const plan = await readAgentOperationPlan(projectRoot, operationId);
  const approvedTargets = parsed.options.targets?.split(",").map((target) => target.trim()).filter(Boolean);
  const result = await recordAgentApproval(projectRoot, operationId, {
    decision,
    role: role as AgentApprovalRole,
    ...(parsed.options.actor ? { actorLabel: parsed.options.actor } : {}),
    ...(approvedTargets?.length ? { approvedTargets } : {}),
  });
  const output = {
    operationId: plan.id,
    action: plan.action,
    decision: result.decision,
    role: result.role,
    requiredRole: plan.requiredRole,
    approvedTargets: result.approvedTargets,
    reviewedHashes: result.approvedHashes,
    expiresAt: result.expiresAt,
  };
  if (parsed.options.json === "true") io.log(JSON.stringify(output, null, 2));
  else {
    io.log("Agent Bridge operation " + plan.id + ": " + result.decision + ".");
    io.log("Action: " + plan.action + "; role: " + result.role + "; expires: " + result.expiresAt + ".");
    for (const target of plan.declaredTargets) {
      const selected = result.approvedTargets.includes(target.path) ? "approved" : "unchanged";
      io.log("- [" + selected + "] " + target.path + " " + target.mode + " " + target.proposedHash);
    }
  }
  return 0;
}

function parseArguments(args: readonly string[]): {
  readonly positional: readonly string[];
  readonly options: Readonly<Record<string, string>>;
} {
  const positional: string[] = [];
  const options: Record<string, string> = {};
  const allowed = new Set(["actor", "json", "project", "role", "targets"]);
  for (let index = 0; index < args.length; index++) {
    const value = args[index]!;
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const name = value.slice(2);
    if (!allowed.has(name)) throw new Error("Unknown cocoframe agent option: --" + name + ".");
    if (name === "json") {
      options[name] = "true";
      continue;
    }
    const next = args[++index];
    if (!next || next.startsWith("--")) throw new Error("Option --" + name + " requires a value.");
    options[name] = next;
  }
  return { positional, options };
}
