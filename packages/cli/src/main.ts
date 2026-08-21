#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { watch } from "node:fs";
import { pathToFileURL } from "node:url";
import { createServer, gracefulShutdown, type NodeServerOptions } from "@cocoframe/server-node";
import { buildProject, developmentErrorEvent, discoverGlobalStyles, discoverIcons, discoverIslands, discoverRoutes, discoverStyles, discoverUiComponents, generateClient, generateCssTypes, generateOpenApi, serveProjectAsset } from "./project.ts";

const [command = "help", inputRoot = "."] = process.argv.slice(2);
const projectRoot = path.resolve(inputRoot);

if (command === "inspect") {
  const routes = await discoverRoutes(projectRoot);
  const islands = await discoverIslands(projectRoot);
  const styles = await discoverStyles(projectRoot);
  const globalStyles = await discoverGlobalStyles(projectRoot);
  const uiComponents = await discoverUiComponents(projectRoot);
  const icons = await discoverIcons(projectRoot);
  const inspectBundle = await buildProject(projectRoot, false);
  const inspectApp = (await import(`${pathToFileURL(inspectBundle).href}?inspect=${Date.now()}`)).default;
  console.log(JSON.stringify({
    framework: "cocoframe",
    version: 1,
    projectRoot,
    routes: routes.map(({ file, kind, pattern, layouts }) => ({
      kind,
      pattern,
      file: path.relative(projectRoot, file).replaceAll("\\", "/"),
      layouts: layouts.map((layout) => path.relative(projectRoot, layout).replaceAll("\\", "/")),
    })),
    islands: islands.map(({ file, name }) => ({
      name,
      file: path.relative(projectRoot, file).replaceAll("\\", "/"),
    })),
    styles: styles.map(({ file, classes }) => ({
      file: path.relative(projectRoot, file).replaceAll("\\", "/"),
      classes,
    })),
    globalStyles: globalStyles.map((file) => path.relative(projectRoot, file).replaceAll("\\", "/")),
    ui: { components: uiComponents },
    icons: { linear: icons },
    contracts: inspectApp.contracts(),
    middleware: inspectApp.middleware(),
    systemRoutes: inspectApp.manifest().filter(({ pattern }: { pattern: string }) => pattern.startsWith("/_health/")),
  }, null, 2));
} else if (command === "dev") {
  process.setSourceMapsEnabled(true);
  const outputFile = await buildProject(projectRoot, true);
  const module = await import(`${pathToFileURL(outputFile).href}?t=${Date.now()}`);
  let app = module.default;
  const encoder = new TextEncoder();
  const reloadClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const server = createServer(async (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/coco-assets/events") {
      let client: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          client = controller;
          reloadClients.add(controller);
          controller.enqueue(encoder.encode("retry: 3000\n: connected\n\n"));
        },
        cancel() {
          reloadClients.delete(client);
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-store",
          connection: "keep-alive",
        },
      });
    }
    return await serveProjectAsset(request, projectRoot) ?? app.fetch(request);
  }, nodeServerOptions());

  let rebuildTimer: NodeJS.Timeout | undefined;
  let rebuilding = false;
  let rebuildQueued = false;
  const rebuild = async () => {
    if (rebuilding) {
      rebuildQueued = true;
      return;
    }
    rebuilding = true;
    try {
      const nextOutput = await buildProject(projectRoot, true);
      app = (await import(`${pathToFileURL(nextOutput).href}?t=${Date.now()}`)).default;
      for (const client of reloadClients) {
        try {
          client.enqueue(encoder.encode("data: reload\n\n"));
        } catch {
          reloadClients.delete(client);
        }
      }
      console.log(`Rebuilt ${app.manifest().length} routes.`);
    } catch (error) {
      const event = encoder.encode(developmentErrorEvent(error));
      for (const client of reloadClients) {
        try {
          client.enqueue(event);
        } catch {
          reloadClients.delete(client);
        }
      }
      console.error("Rebuild failed:", error instanceof Error ? error.message : error);
    } finally {
      rebuilding = false;
      if (rebuildQueued) {
        rebuildQueued = false;
        void rebuild();
      }
    }
  };
  const scheduleRebuild = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => void rebuild(), 250);
  };
  const watcher = watch(path.join(projectRoot, "app"), { recursive: true }, scheduleRebuild);
  let publicWatcher: ReturnType<typeof watch> | undefined;
  try {
    publicWatcher = watch(path.join(projectRoot, "public"), { recursive: true }, scheduleRebuild);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const configWatcher = watch(projectRoot, { recursive: false }, (_event, filename) => {
    if (filename && ["cocoframe.config.ts", "cocoframe.config.js"].includes(filename.toString())) scheduleRebuild();
  });
  server.on("close", () => {
    watcher.close();
    publicWatcher?.close();
    configWatcher.close();
  });
  installShutdown(server);
  server.listen(port, "127.0.0.1", () => {
    console.log(`CocoFrame development server: http://127.0.0.1:${port}`);
    console.log(`${app.manifest().length} routes loaded from ${projectRoot}`);
    console.log("Watching app files for changes.");
  });
} else if (command === "build") {
  const outputFile = await buildProject(projectRoot, false);
  console.log(`CocoFrame server bundle: ${outputFile}`);
} else if (command === "start") {
  const outputFile = path.join(projectRoot, ".cocoframe", "server.mjs");
  const productionApp = (await import(`${pathToFileURL(outputFile).href}?start=${Date.now()}`)).default;
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const host = process.env.HOST ?? "0.0.0.0";
  let shuttingDown = false;
  const server = createServer(async (request) => {
    if (shuttingDown && new URL(request.url).pathname === "/_health/ready") {
      return Response.json({ status: "not-ready" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    return await serveProjectAsset(request, projectRoot, false) ?? productionApp.fetch(request);
  }, nodeServerOptions());
  installShutdown(server, () => { shuttingDown = true; });
  server.listen(port, host, () => {
    console.log(`CocoFrame production server: http://${host}:${port}`);
    console.log(`${productionApp.manifest().length} routes loaded.`);
  });
} else if (command === "generate") {
  const clientFile = await generateClient(projectRoot);
  const cssFiles = await generateCssTypes(projectRoot);
  const openApiFile = await generateOpenApi(projectRoot);
  console.log(`CocoFrame typed client: ${clientFile}`);
  console.log(`CocoFrame CSS types: ${cssFiles.length}`);
  console.log(`CocoFrame OpenAPI: ${openApiFile}`);
} else if (command === "openapi") {
  const openApiFile = await generateOpenApi(projectRoot);
  console.log(`CocoFrame OpenAPI: ${openApiFile}`);
} else {
  console.log("CocoFrame CLI\n\nCommands:\n  cocoframe inspect [project]\n  cocoframe dev [project]\n  cocoframe build [project]\n  cocoframe start [project]\n  cocoframe generate [project]\n  cocoframe openapi [project]");
}

function nodeServerOptions(): NodeServerOptions {
  const trustedProxies = (process.env.COCOFRAME_TRUSTED_PROXIES ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return {
    maxBodyBytes: environmentInteger("COCOFRAME_MAX_BODY_BYTES", 1_048_576),
    requestTimeoutMs: environmentInteger("COCOFRAME_REQUEST_TIMEOUT_MS", 30_000),
    ...(trustedProxies.length > 0 ? { trustedProxies } : {}),
  };
}

function installShutdown(server: ReturnType<typeof createServer>, markNotReady?: () => void): void {
  let closing = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (closing) return;
    closing = true;
    console.log(`Received ${signal}; draining active requests.`);
    markNotReady?.();
    const delay = environmentInteger("COCOFRAME_SHUTDOWN_DELAY_MS", 0);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    const result = await gracefulShutdown(server, { timeoutMs: environmentInteger("COCOFRAME_SHUTDOWN_TIMEOUT_MS", 10_000) });
    if (result.forced) {
      console.error("Shutdown deadline reached; remaining connections were closed.");
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

function environmentInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}
