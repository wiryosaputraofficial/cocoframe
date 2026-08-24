import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { AgentDiagnostic, AgentProjectSnapshot } from "./types.ts";

const MAX_FILES = 10_000;
const MAX_FILE_BYTES = 256 * 1024;
const ignoredDirectories = new Set([".git", ".cocoframe", "node_modules", "dist", "coverage"]);

export interface SearchMatch {
  readonly title: string;
  readonly file: string;
  readonly line: number;
  readonly excerpt: string;
}

export interface WorkflowRecord {
  readonly lifecycle: "cocospec" | "cocoref" | "cocoqa";
  readonly id: string;
  readonly state: string;
  readonly version: number;
  readonly file: string;
  readonly valid: boolean;
  readonly issue?: string;
}

export async function resolveWorkspaceRoot(input: string): Promise<string> {
  const resolved = path.resolve(input);
  let canonical: string;
  try {
    canonical = await realpath(resolved);
  } catch {
    throw diagnosticError("INVALID_WORKSPACE", "The selected directory is not a readable workspace.", "Select an existing CocoFrame project root and retry.");
  }
  const manifest = await readJson(path.join(canonical, "package.json")).catch(() => null);
  if (!isRecord(manifest) || !isCocoFrameManifest(manifest, canonical)) {
    throw diagnosticError("INVALID_WORKSPACE", "The selected directory is not a valid CocoFrame workspace.", "Select the correct project root and run workspace inspection again.");
  }
  return canonical;
}

export async function assertSafeTree(root: string, relativeDirectory: string, signal?: AbortSignal): Promise<void> {
  const directory = await confinedExistingPath(root, relativeDirectory);
  if (!directory) return;
  let visited = 0;
  const queue = [directory];
  while (queue.length > 0) {
    throwIfCancelled(signal);
    const current = queue.shift()!;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (++visited > MAX_FILES) throw diagnosticError("CAPABILITY_UNAVAILABLE", "Workspace inspection exceeded the 10,000-file safety limit.", "Narrow the workspace or remove generated and vendored files, then retry.");
      if (entry.isSymbolicLink()) throw diagnosticError("WORKSPACE_ACCESS_DENIED", `Linked workspace entry is not allowed: ${relative(root, path.join(current, entry.name))}.`, "Replace the link with a file inside the approved workspace or request explicit access.");
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) queue.push(path.join(current, entry.name));
    }
  }
}

export async function searchDocumentation(
  root: string,
  query: string,
  offset: number,
  limit: number,
  signal?: AbortSignal,
): Promise<{ readonly matches: readonly SearchMatch[]; readonly total: number; readonly nextCursor?: string }> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const candidates = await documentationFiles(root, signal);
  const matches: Array<SearchMatch & { score: number }> = [];
  for (const file of candidates) {
    throwIfCancelled(signal);
    const info = await stat(file);
    if (info.size > MAX_FILE_BYTES) continue;
    const source = await readFile(file, "utf8");
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index] ?? "";
      const lower = line.toLowerCase();
      const score = words.reduce((total, word) => total + (lower.includes(word) ? 1 : 0), 0);
      if (score === 0 || (words.length > 1 && score < words.length)) continue;
      matches.push({
        title: headingBefore(lines, index) ?? path.basename(file),
        file: relative(root, file),
        line: index + 1,
        excerpt: redact(line.trim()).slice(0, 500),
        score,
      });
    }
  }
  matches.sort((left, right) => right.score - left.score || left.file.localeCompare(right.file) || left.line - right.line);
  const page = matches.slice(offset, offset + limit).map(({ score: _score, ...match }) => match);
  return { matches: page, total: matches.length, ...(offset + limit < matches.length ? { nextCursor: String(offset + limit) } : {}) };
}

export function findComponents(snapshot: AgentProjectSnapshot, query: string, offset: number, limit: number) {
  const needle = query.trim().toLowerCase();
  const all = snapshot.components.filter((component) => !needle
    || component.name.toLowerCase().includes(needle)
    || component.source.toLowerCase().includes(needle)
    || component.file?.toLowerCase().includes(needle));
  return {
    components: all.slice(offset, offset + limit),
    total: all.length,
    auditedExistingComponents: true,
    ...(offset + limit < all.length ? { nextCursor: String(offset + limit) } : {}),
  };
}

export function findApis(snapshot: AgentProjectSnapshot, query: string, offset: number, limit: number) {
  const needle = query.trim().toLowerCase();
  const all = snapshot.apis.filter((api) => !needle
    || api.id.toLowerCase().includes(needle)
    || api.method.toLowerCase().includes(needle)
    || api.pattern.toLowerCase().includes(needle));
  return { apis: all.slice(offset, offset + limit), total: all.length, ...(offset + limit < all.length ? { nextCursor: String(offset + limit) } : {}) };
}

export async function readWorkflowRecords(root: string, lifecycle: string, offset: number, limit: number, signal?: AbortSignal) {
  const definitions = [
    { lifecycle: "cocospec" as const, directory: "specs", file: "spec.json" },
    { lifecycle: "cocoref" as const, directory: "refs", file: "ref.json" },
    { lifecycle: "cocoqa" as const, directory: "qa", file: "qa.json" },
  ].filter((item) => lifecycle === "all" || item.lifecycle === lifecycle);
  const records: WorkflowRecord[] = [];
  for (const definition of definitions) {
    const directory = await confinedExistingPath(root, definition.directory);
    if (!directory) continue;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      throwIfCancelled(signal);
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name, definition.file);
      if (!await exists(file)) continue;
      try {
        const value = await readJson(file);
        if (!isRecord(value) || typeof value.version !== "number" || typeof value.state !== "string") throw new Error("Canonical document must contain numeric version and string state fields.");
        records.push({ lifecycle: definition.lifecycle, id: entry.name, state: value.state, version: value.version, file: relative(root, file), valid: true });
      } catch (error) {
        records.push({ lifecycle: definition.lifecycle, id: entry.name, state: "invalid", version: 0, file: relative(root, file), valid: false, issue: redact(error instanceof Error ? error.message : String(error)) });
      }
    }
  }
  records.sort((left, right) => left.lifecycle.localeCompare(right.lifecycle) || left.id.localeCompare(right.id));
  return { records: records.slice(offset, offset + limit), total: records.length, ...(offset + limit < records.length ? { nextCursor: String(offset + limit) } : {}) };
}

export function diagnosticFrom(error: unknown): AgentDiagnostic {
  if (isRecord(error) && isRecord(error.agentDiagnostic)) return error.agentDiagnostic as unknown as AgentDiagnostic;
  return {
    code: "CAPABILITY_UNAVAILABLE",
    message: redact(error instanceof Error ? error.message : "The Agent Bridge operation failed."),
    recovery: "Inspect the workspace and retry with a supported read-only operation.",
  };
}

export function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw diagnosticError("OPERATION_CANCELLED", "The operation was cancelled before completion.", "Retry the read-only operation when ready.");
}

export function diagnosticError(code: AgentDiagnostic["code"], message: string, recovery: string): Error {
  return Object.assign(new Error(message), { agentDiagnostic: { code, message, recovery } satisfies AgentDiagnostic });
}

async function documentationFiles(root: string, signal?: AbortSignal): Promise<string[]> {
  const files: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    throwIfCancelled(signal);
    const current = queue.shift()!;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (files.length >= MAX_FILES) return files;
      if (entry.isSymbolicLink()) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) queue.push(full);
        continue;
      }
      const rel = relative(root, full);
      if (entry.name.endsWith(".md") || /(?:^|\/)app\/generated\/(?:api-reference\.ts|openapi\.json)$/.test(rel)) files.push(full);
    }
  }
  return files.sort();
}

async function confinedExistingPath(root: string, relativePath: string): Promise<string | null> {
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw diagnosticError("WORKSPACE_ACCESS_DENIED", "The requested path is outside the approved workspace.", "Use a path inside the approved project root or request explicit access.");
  if (!await exists(target)) return null;
  const canonical = await realpath(target);
  if (canonical !== root && !canonical.startsWith(`${root}${path.sep}`)) throw diagnosticError("WORKSPACE_ACCESS_DENIED", "A workspace path resolves outside the approved project root.", "Remove the linked path or request explicit access.");
  return canonical;
}

function isCocoFrameManifest(manifest: Record<string, unknown>, root: string): boolean {
  if (manifest.name === "cocoframe") return true;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const dependencies = manifest[field];
    if (isRecord(dependencies) && Object.keys(dependencies).some((name) => name.startsWith("@cocoframe/"))) return true;
  }
  return root.endsWith(`${path.sep}cocoframe`);
}

function headingBefore(lines: readonly string[], index: number): string | null {
  for (let cursor = index; cursor >= Math.max(0, index - 20); cursor--) {
    const heading = /^#{1,6}\s+(.+)$/.exec(lines[cursor] ?? "");
    if (heading?.[1]) return redact(heading[1].trim());
  }
  return null;
}

function redact(value: string): string {
  return value
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/-]+=*/gi, "$1 [REDACTED]")
    .replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

/** Redacts sensitive strings and sensitive-key values before any result leaves Agent Bridge. */
export function sanitizeAgentOutput(value: unknown, depth = 0): unknown {
  if (depth > 20) return "[TRUNCATED]";
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeAgentOutput(item, depth + 1));
  if (!isRecord(value)) return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = /^(?:password|secret|token|cookie|authorization|requestbody|request-body|body)$/i.test(key)
      ? "[REDACTED]"
      : sanitizeAgentOutput(item, depth + 1);
  }
  return output;
}
async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch { return false; }
}

function relative(root: string, file: string): string {
  return path.relative(root, file).replaceAll("\\", "/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
