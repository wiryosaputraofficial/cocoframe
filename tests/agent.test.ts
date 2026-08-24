import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { InMemoryTransport, type JSONRPCMessage } from "@modelcontextprotocol/server";
import { createAgentBridge } from "../packages/agent/src/index.ts";
import { inspectProjectReadOnly } from "../packages/cli/src/inspect-readonly.ts";

test("discovers versioned read-only Agent Bridge tools over MCP", async () => {
  const projectRoot = path.resolve("examples/basic");
  const before = await fileState(projectRoot);
  const bridge = await createAgentBridge({ workspaceRoot: projectRoot, inspectProject: inspectProjectReadOnly });

  assert.deepEqual(bridge.tools.map(({ name }) => name), ["project.inspect", "docs.search", "component.find", "api.lookup", "workflow.status", "cocospecs.next", "cocoref.audit", "cocoqa.trace", "mutation.plan", "mutation.execute"]);
  for (const tool of bridge.tools) {
    assert.equal(tool.permission, tool.name.startsWith("mutation.") ? "write" : "read");
    assert.equal(tool.protocolVersion, 2);
    assert.equal(tool.inputSchemaVersion, tool.name.startsWith("mutation.") ? 2 : 1);
    assert.equal(tool.outputSchemaVersion, tool.name.startsWith("mutation.") ? 2 : 1);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
  }

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const messages: JSONRPCMessage[] = [];
  clientTransport.onmessage = (message) => messages.push(message);
  await clientTransport.start();
  await bridge.server.connect(serverTransport);
  await clientTransport.send({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "agent-test", version: "1.0.0" } },
  });
  await response(messages, 1);
  await clientTransport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  await clientTransport.send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const listed = await response(messages, 2) as { readonly result?: { readonly tools?: readonly { readonly name: string; readonly inputSchema: unknown; readonly outputSchema?: unknown; readonly _meta?: Readonly<Record<string, unknown>> }[] } };
  assert.equal(listed.result?.tools?.length, 10);
  assert.deepEqual(listed.result?.tools?.map(({ name }) => name), bridge.tools.map(({ name }) => name));
  for (const tool of listed.result?.tools ?? []) {
    assert.ok(tool.inputSchema);
    assert.ok(tool.outputSchema);
    assert.deepEqual((tool._meta?.["io.cocoframe/agent"] as { permission?: string })?.permission, tool.name.startsWith("mutation.") ? "write" : "read");
  }
  await clientTransport.send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "docs.search", arguments: { query: "" } } });
  const invalidCall = await response(messages, 3) as { readonly result?: { readonly isError?: boolean; readonly structuredContent?: { readonly diagnostic?: { readonly code?: string } } } };
  assert.equal(invalidCall.result?.isError, true);
  assert.equal(invalidCall.result?.structuredContent?.diagnostic?.code, "INVALID_TOOL_INPUT");  await clientTransport.close();
  await bridge.server.close();
  assert.deepEqual(await fileState(projectRoot), before);
});

test("inspects and searches reusable CocoFrame capabilities without mutation", async () => {
  const bridge = await createAgentBridge({ workspaceRoot: path.resolve("examples/basic"), inspectProject: inspectProjectReadOnly });
  const inspected = await bridge.execute("project.inspect", { protocolVersion: 1, limit: 500 });
  assert.equal(inspected.ok, true);
  const data = inspected.data as Awaited<ReturnType<typeof inspectProjectReadOnly>> & { pagination: { truncated: boolean } };
  assert.ok(data.routes.some(({ pattern }) => pattern === "/"));
  assert.ok(data.apis.some(({ id }) => id === "greet-person"));
  assert.ok(data.components.some(({ name, source }) => name === "Button" && source === "@cocoframe/ui"));
  assert.ok(data.islands.some(({ name }) => name === "counter"));
  assert.ok(data.middleware.some(({ id }) => id === "requestId"));
  assert.ok(data.dependencies.some(({ name }) => name === "@cocoframe/core"));
  assert.ok(data.generatedCapabilities.some(({ kind }) => kind === "openapi"));
  assert.ok(data.generatedCapabilities.some(({ kind }) => kind === "design-profile"));
  assert.equal(data.pagination.truncated, false);

  const components = await bridge.execute("component.find", { query: "Button", limit: 20 });
  assert.equal(components.ok, true);
  assert.equal((components.data as { auditedExistingComponents: boolean }).auditedExistingComponents, true);
  const apis = await bridge.execute("api.lookup", { query: "greet", limit: 20 });
  assert.equal(apis.ok, true);
  const docs = await bridge.execute("docs.search", { query: "CocoSpecs", limit: 5 });
  assert.equal(docs.ok, true);
});

test("returns stable diagnostics for invalid version, input, and cancellation", async () => {
  const bridge = await createAgentBridge({ workspaceRoot: path.resolve("examples/basic"), inspectProject: inspectProjectReadOnly });
  const version = await bridge.execute("project.inspect", { protocolVersion: 999, limit: 10 });
  assert.equal((version.diagnostic as { code: string }).code, "UNSUPPORTED_PROTOCOL_VERSION");
  const input = await bridge.execute("docs.search", { query: "", limit: 10 });
  assert.equal((input.diagnostic as { code: string }).code, "INVALID_TOOL_INPUT");
  const controller = new AbortController();
  controller.abort();
  const cancelled = await bridge.execute("project.inspect", { limit: 10 }, controller.signal);
  assert.equal((cancelled.diagnostic as { code: string }).code, "OPERATION_CANCELLED");
});

test("confines linked workspace paths, redacts documentation, and refuses mutation tools", async (context) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "cocoframe-agent-workspace-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "cocoframe-agent-outside-"));
  context.after(async () => {
    await rm(workspace, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  await mkdir(path.join(workspace, "app"), { recursive: true });
  await writeFile(path.join(workspace, "package.json"), JSON.stringify({ name: "agent-fixture", version: "1.0.0", dependencies: { "@cocoframe/core": "0.0.4" } }));
  await writeFile(path.join(workspace, "security.md"), "# Credentials\nAuthorization: Bearer super-secret-token\n");
  await writeFile(path.join(outside, "outside.md"), "outside");

  const bridge = await createAgentBridge({ workspaceRoot: workspace, inspectProject: inspectProjectReadOnly });
  const docs = await bridge.execute("docs.search", { query: "Authorization", limit: 10 });
  assert.equal(docs.ok, true);
  assert.doesNotMatch(JSON.stringify(docs), /super-secret-token/);
  assert.match(JSON.stringify(docs), /REDACTED/);

  const mutation = await bridge.execute("file.write", { file: "app/page.tsx" });
  assert.equal((mutation.diagnostic as { code: string }).code, "CAPABILITY_UNAVAILABLE");
  assert.equal(await stat(path.join(workspace, "app")).then(() => true), true);

  await symlink(outside, path.join(workspace, "app", "escape"), process.platform === "win32" ? "junction" : "dir");
  const escaped = await bridge.execute("project.inspect", { limit: 10 });
  assert.equal((escaped.diagnostic as { code: string }).code, "WORKSPACE_ACCESS_DENIED");
  assert.doesNotMatch(JSON.stringify(escaped), /outside\.md/);
});
async function response(messages: JSONRPCMessage[], id: number): Promise<JSONRPCMessage> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const found = messages.find((message) => "id" in message && message.id === id);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for MCP response ${id}.`);
}

async function fileState(root: string): Promise<readonly string[]> {
  const state: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const directory = queue.shift()!;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) queue.push(file);
      else {
        const info = await stat(file);
        state.push(`${path.relative(root, file).replaceAll("\\", "/")}:${info.size}:${info.mtimeMs}`);
      }
    }
  }
  return state.sort();
}
