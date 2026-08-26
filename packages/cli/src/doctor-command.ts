import path from "node:path";
import process from "node:process";
import type { DoctorDiagnostic, DoctorReport } from "@cocoframe/agent";
import { diagnoseProject } from "./doctor.ts";

interface DoctorCommandIo {
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

/** Runs cocoframe doctor with stable human and JSON output. */
export async function runDoctorCommand(
  args: readonly string[],
  currentDirectory = process.cwd(),
  io: DoctorCommandIo = { log: console.log, error: console.error },
): Promise<number> {
  const parsed = parseArguments(args);
  const projectRoot = path.resolve(currentDirectory, parsed.project ?? ".");
  const result = await diagnoseProject(projectRoot, { deep: parsed.deep, strict: parsed.strict });
  if (parsed.json) io.log(JSON.stringify(result, null, 2));
  else renderHuman(result, io);
  if (result.status === "internal-error" || result.status === "cancelled") return 2;
  if (result.status === "error" || parsed.strict && result.status === "warning") return 1;
  return 0;
}

function parseArguments(args: readonly string[]): { readonly project?: string; readonly deep: boolean; readonly strict: boolean; readonly json: boolean } {
  let project: string | undefined;
  let deep = false;
  let strict = false;
  let json = false;
  for (const value of args) {
    if (value === "--deep") deep = true;
    else if (value === "--strict") strict = true;
    else if (value === "--json") json = true;
    else if (value.startsWith("--")) throw new Error(`Unknown cocoframe doctor option: ${value}.`);
    else if (project) throw new Error("cocoframe doctor accepts at most one project path.");
    else project = value;
  }
  return { ...(project ? { project } : {}), deep, strict, json };
}

function renderHuman(result: DoctorReport, io: DoctorCommandIo): void {
  io.log("CocoFrame Doctor");
  io.log(`Mode: ${result.mode}${result.strict ? " (strict)" : ""}`);
  io.log("");
  for (const check of result.checks) io.log(`${checkMark(check.status)} ${check.id}: ${check.status}`);
  for (const diagnostic of result.diagnostics) renderDiagnostic(diagnostic, io);
  io.log("");
  io.log(`Result: ${result.status}; ${result.summary.passed} passed, ${result.summary.warning} warning, ${result.summary.error} error, ${result.summary.skipped} skipped.`);
  if (result.truncated) io.log("Result was truncated at 1,000 diagnostics.");
}

function renderDiagnostic(diagnostic: DoctorDiagnostic, io: DoctorCommandIo): void {
  io.log("");
  io.log(`[${diagnostic.severity.toUpperCase()} ${diagnostic.code}] ${diagnostic.message}`);
  for (const evidence of diagnostic.evidence) io.log(`  Evidence: ${evidence}`);
  io.log(`  Suggestion: ${diagnostic.suggestion}`);
  io.log(`  Documentation: ${diagnostic.documentation}`);
}

function checkMark(status: DoctorReport["checks"][number]["status"]): string {
  if (status === "passed") return "PASS";
  if (status === "warning") return "WARN";
  if (status === "error") return "FAIL";
  return "SKIP";
}
