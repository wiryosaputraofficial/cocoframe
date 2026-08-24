import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { createAgentBridge, type AgentBridgeOptions } from "./index.ts";

/**
 * Serves a local Agent Bridge over MCP stdio until the owning AI client disconnects.
 * Standard output remains reserved exclusively for the MCP JSON-RPC channel.
 */
export function serveAgentBridgeStdio(options: AgentBridgeOptions): StdioServerHandle {
  return serveStdio(async () => (await createAgentBridge(options)).server, {
    onerror(error) {
      process.stderr.write(`CocoFrame Agent Bridge: ${error.message}\n`);
    },
  });
}
