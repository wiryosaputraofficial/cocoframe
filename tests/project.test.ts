import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { buildProject, developmentErrorEvent, discoverGlobalStyles, discoverIcons, discoverIslands, discoverRoutes, discoverUiComponents, generateClient, generateCssTypes, generateOpenApi, routePatternFromFile, serveProjectAsset } from "../packages/cli/src/project.ts";
import { parseCocoQL, parseCocoQLMutation } from "../packages/cocoql/src/index.ts";
import { componentCatalogOrder, sortComponentCatalogEntries } from "../examples/basic/app/components/component-navigation.ts";

test("converts page filenames into route patterns", () => {
  const root = path.join("project", "app", "routes");
  assert.equal(routePatternFromFile(root, path.join(root, "index.page.tsx")), "/");
  assert.equal(routePatternFromFile(root, path.join(root, "blog", "[slug].page.tsx")), "/blog/:slug");
  assert.equal(routePatternFromFile(root, path.join(root, "docs", "[...rest].page.tsx")), "/docs/*rest");
});

test("orders component catalog sections exactly like the component sidebar", () => {
  const scrambled = [
    { id: "button-group", name: "ButtonGroup" },
    { id: "container", name: "Container" },
    { id: "safe-area", name: "SafeArea" },
    { id: "button", name: "Button" },
    { id: "aspect-ratio", name: "AspectRatio" },
    { id: "app-shell", name: "AppShell" },
  ];

  assert.deepEqual(sortComponentCatalogEntries(scrambled).map(({ id }) => id), [
    "app-shell", "safe-area", "aspect-ratio", "container", "button", "button-group",
  ]);
  const chartIndex = componentCatalogOrder.indexOf("chart");
  assert.deepEqual(componentCatalogOrder.slice(chartIndex, chartIndex + 6), ["chart", "chart-bars", "chart-radial", "chart-radar", "chart-points", "chart-mixed"]);
});

test("serializes watcher failures as one safe development event", () => {
  const event = developmentErrorEvent(new TypeError("broken\nbuild"));
  assert.match(event, /^event: build-error\ndata: /);
  const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
  const payload = JSON.parse(data ?? "{}") as { type: string; message: string; stack: string; phase: string };
  assert.equal(payload.type, "TypeError");
  assert.equal(payload.message, "broken\nbuild");
  assert.match(payload.stack, /^TypeError: broken\nbuild/);
  assert.equal(payload.phase, "building");
  assert.equal(event.endsWith("\n\n"), true);
});

test("discovers example layouts and islands", async () => {
  const project = path.resolve("examples/basic");
  const routes = await discoverRoutes(project);
  const home = routes.find((route) => route.pattern === "/");
  const notFound = routes.find((route) => route.pattern === "/*path");
  const templates = routes.find((route) => route.pattern === "/templates");
  const cocoql = routes.find((route) => route.pattern === "/cocoql");
  assert.equal(home?.layouts.length, 1);
  assert.equal(notFound?.kind, "page");
  assert.equal(notFound?.layouts.length, 1);
  assert.match(home?.layouts[0] ?? "", /_layout\.tsx$/);
  assert.equal(templates?.kind, "page");
  assert.equal(templates?.layouts.length, 1);
  assert.equal(cocoql?.kind, "page");
  assert.equal(cocoql?.layouts.length, 1);
  for (const projectPage of ["/about", "/versioning", "/deployment", "/conventions", "/contact"]) {
    const route = routes.find((candidate) => candidate.pattern === projectPage);
    assert.equal(route?.kind, "page");
    assert.equal(route?.layouts.length, 1);
  }
  assert.deepEqual((await discoverIslands(project)).map((island) => island.name), ["component-browser", "copy-command", "counter", "docs-search", "docs-sidebar", "icon-explorer", "package-command", "site-header", "template-catalog", "testimonials"]);
  assert.deepEqual(await discoverUiComponents(project), [
    "Accordion", "Alert", "AlertDialog", "AppShell", "AspectRatio", "Attachment", "Avatar", "Badge", "BottomNavigation", "BottomSheet", "Breadcrumb", "Bubble", "Button", "ButtonGroup", "Calendar", "Card", "Carousel", "Chart", "Checkbox", "Citation", "Code", "Collapsible", "Combobox", "Command", "Container", "ContextMenu", "DataTable", "DatePicker", "DateRangePicker", "Details", "Dialog", "Direction", "Divider", "DropdownMenu", "EmptyState", "FileUpload", "FilterBar", "FormField", "Grid", "Heading", "HoverCard", "IconButton", "IconInput", "Inline", "Input", "InputGroup", "InputOtp", "Item", "Kbd", "Label", "LiveRegion", "Marker", "MegaMenu", "Menubar", "Message", "MessageScroller", "MultiSelect", "NavigationMenu", "NumberField", "Offcanvas", "PageHeader", "Pagination", "Popover", "Progress", "PromptComposer", "Questionnaire", "RadioGroup", "Resizable", "SafeArea", "ScrollArea", "SearchField", "Select", "Sidebar", "SiteHeader", "Skeleton", "SkipLink", "Slider", "Spinner", "Stack", "Stat", "Stepper", "Switch", "SyntaxHighlighter", "Table", "Tabs", "Text", "Textarea", "Theme", "ThinkingIndicator", "Toast", "Toaster", "Toggle", "ToggleGroup", "Toolbar", "Tooltip", "TreeView", "VisuallyHidden",
  ]);
  assert.deepEqual(await discoverIcons(project), [
    "*", "accessibility", "add-circle", "align-horizontal-center", "align-left", "align-right", "alt-arrow-down", "arrow-right", "arrow-up", "bell", "bolt", "book-2", "box-minimalistic", "branching-paths-up", "calendar", "camera", "chat-round", "chat-round-dots", "check-circle", "checklist", "clock-circle", "close-circle", "cloud-check", "code-square", "database", "document", "document-text", "folder", "global", "graph-up", "hamburger-menu", "heart", "home", "layers-minimalistic", "letter", "magnifier", "map-point", "palette", "pen", "question-circle", "refresh-circle", "server-square", "settings", "shield-check", "star", "stars-minimalistic", "trash-bin-minimalistic", "user", "users-group-rounded", "video-frame-play-horizontal", "widget-4",
  ]);
});

test("keeps the public documentation aligned with the complete framework surface", async () => {
  const docs = await readFile(path.resolve("examples/basic/app/routes/docs.page.tsx"), "utf8");
  const sidebar = await readFile(path.resolve("examples/basic/app/islands/docs-sidebar.island.tsx"), "utf8");
  const search = await readFile(path.resolve("examples/basic/app/islands/docs-search.island.tsx"), "utf8");
  const packageCommand = await readFile(path.resolve("examples/basic/app/islands/package-command.island.tsx"), "utf8");
  const header = await readFile(path.resolve("examples/basic/app/islands/site-header.island.tsx"), "utf8");
  const shell = await readFile(path.resolve("examples/basic/app/components/marketing-shell.tsx"), "utf8");
  const guideStyles = await readFile(path.resolve("examples/basic/app/styles/40-documentation-guide.css"), "utf8");
  const versioning = await readFile(path.resolve("examples/basic/app/routes/versioning.page.tsx"), "utf8");
  const readme = await readFile(path.resolve("README.md"), "utf8");

  for (const id of ["project-creator", "charts", "api-reference", "observability", "recipes", "troubleshooting", "versioning", "roadmap", "contributing"]) {
    assert.match(docs, new RegExp(`id="${id}"`));
    assert.match(sidebar, new RegExp(`#${id}`));
  }
  for (const packageName of ["@cocoframe/core", "@cocoframe/jsx", "@cocoframe/router", "@cocoframe/client", "@cocoframe/ui", "@cocoframe/icons", "@cocoframe/schema", "@cocoframe/forms", "@cocoframe/auth", "@cocoframe/database", "@cocoframe/database-sqlite", "@cocoframe/database-postgres", "@cocoframe/security", "@cocoframe/observability", "@cocoframe/cocoql", "@cocoframe/server-node", "@cocoframe/server-web", "@cocoframe/cli"]) {
    assert.match(docs, new RegExp(packageName.replace("/", "\\/")));
  }
  assert.match(docs, /create-cocoframe/);
  assert.ok((docs.match(/<GuideSection id=/g) ?? []).length >= 33);
  assert.match(search, /Package API Reference/);
  assert.match(search, /Versioning & Roadmap/);
  assert.doesNotMatch(header, /href="#(?:signin)?"/);
  assert.doesNotMatch(shell, /href="#"/);
  assert.match(readme, /97 semantic primitives/);
  assert.match(readme, /twelve chart types/);
  assert.match(readme, /https:\/\/github\.com\/wiryosaputraofficial\/cocoframe\.git/);
  for (const source of [readme, docs, packageCommand]) {
    assert.match(source, /npm create cocoframe@latest my-app/);
  }
  assert.match(docs, /Installation from npm/);
  assert.match(versioning, /19 npm packages/);
  assert.doesNotMatch(versioning, /Not published yet/);
  assert.match(packageCommand, /cd my-app/);
  assert.equal((docs.match(/<article><span>[1-4]<\/span>/g) ?? []).length, 4);
  assert.match(guideStyles, /\.guide-table>\[role=row\]>\*\{min-width:0;max-width:100%\}/);
  assert.match(guideStyles, /\.guide-table code\{white-space:normal;overflow-wrap:anywhere;word-break:break-word\}/);
});

test("keeps the template website aligned with every buildable creator template", async () => {
  const { templates: catalog } = JSON.parse(await readFile(path.resolve("packages/create-cocoframe/templates/catalog.json"), "utf8")) as { templates: Array<{ id: string; components: string[]; icons: string[] }> };
  const island = await readFile(path.resolve("examples/basic/app/islands/template-catalog.island.tsx"), "utf8");
  const page = await readFile(path.resolve("examples/basic/app/routes/templates.page.tsx"), "utf8");

  assert.deepEqual(catalog.map((template) => template.id), ["starter", "marketing", "dashboard", "documentation"]);
  for (const template of catalog) {
    assert.match(island, new RegExp(`slug: "${template.id}"`));
    for (const component of template.components) assert.match(island, new RegExp(`\\b${component}\\b`));
    for (const icon of template.icons) assert.match(island, new RegExp(icon));
  }
  assert.match(island, /--template \$\{template\}/);
  assert.match(page, /Setiap template memakai komponen UI dan Solar icons bawaan CocoFrame/);
  assert.doesNotMatch(island, /SaaS Starter|E-Commerce Store|Portfolio/);
});
test("keeps every CocoQL cookbook snippet valid and copy-ready", async () => {
  const source = await readFile(path.resolve("examples/basic/app/components/cocoql-cookbook.tsx"), "utf8");
  const snippets = [...source.matchAll(/code: `([\s\S]*?)`,\r?\n\s+outcome/g)].map((match) => match[1] ?? "");
  assert.equal(snippets.length, 14);
  for (const snippet of snippets) {
    if (/^(preview|create )/.test(snippet) || /\n(update|delete)\n/.test(snippet)) parseCocoQLMutation(snippet);
    else parseCocoQL(snippet);
  }
});

test("isolates development output from production artifacts", async () => {
  const project = path.resolve("examples/basic");
  const output = await buildProject(project, true);
  assert.equal(output, path.join(project, ".cocoframe", "dev", "server.mjs"));
  assert.match(await readFile(path.join(project, ".cocoframe", "dev", "assets.json"), "utf8"), /\/coco-assets\/client\.js/);
  assert.match(await readFile(path.join(project, ".cocoframe", "dev", "public", "coco-assets", "styles.css"), "utf8"), /\.coco-dev-overlay/);
  assert.ok((await discoverGlobalStyles(project)).some((file) => file.endsWith("00-base.css")));
  const icon = await serveProjectAsset(new Request("https://example.com/assets/cocoframe-icon.png"), project);
  assert.equal(icon?.status, 200);
  assert.equal(icon?.headers.get("content-type"), "image/png");
});

test("generates a typed client from API contracts", async () => {
  const project = path.resolve("examples/basic");
  const clientFile = await generateClient(project);
  const source = await readFile(clientFile, "utf8");
  assert.match(source, /export async function greetPerson/);
  assert.match(source, /readonly "excited"\?: boolean/);
  assert.match(source, /Promise<GreetPersonOutput>/);
  assert.match(source, /export function createCocoFrameClient/);
  assert.match(source, /requestOptions\.fetch \?\? globalThis\.fetch/);

  let requestedUrl = "";
  let authorization = "";
  const generated = await import(`${pathToFileURL(clientFile).href}?test=${Date.now()}`);
  const client = generated.createCocoFrameClient({
    baseUrl: "https://mobile.example",
    headers: { authorization: "Bearer mobile-token" },
    fetch: async (input: URL | RequestInfo, init?: RequestInit) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return Response.json({ ok: true, framework: "cocoframe" });
    },
  });
  assert.deepEqual(await client.health(), { ok: true, framework: "cocoframe" });
  assert.equal(requestedUrl, "https://mobile.example/api/health");
  assert.equal(authorization, "Bearer mobile-token");
});

test("generates OpenAPI, exact CSS types, and deployment metadata", async () => {
  const project = path.resolve("examples/basic");
  const openApiFile = await generateOpenApi(project);
  const document = JSON.parse(await readFile(openApiFile, "utf8")) as { openapi: string; info: { title: string; version: string }; paths: Record<string, unknown> };
  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual({ title: document.info.title, version: document.info.version }, { title: "CocoFrame Example API", version: "1.0.0" });
  assert.ok(document.paths["/api/greet/{name}"]);
  const cssFiles = await generateCssTypes(project);
  assert.match(cssFiles[0] ?? "", /\.module\.d\.css\.ts$/);
  assert.match(await readFile(cssFiles[0]!, "utf8"), /readonly "card": string/);
  const deployment = JSON.parse(await readFile(path.join(project, ".cocoframe", "deploy.json"), "utf8")) as { target: string; assets: string };
  assert.equal(deployment.target, "node");
  assert.equal(deployment.assets, "assets.json");
  const assetManifest = JSON.parse(await readFile(path.join(project, ".cocoframe", "assets.json"), "utf8")) as {
    assets: { client: string; stream: string; stylesheets: string[]; islands: Record<string, string> };
  };
  assert.match(assetManifest.assets.client, /\/coco-assets\/client-[A-Za-z0-9_-]+\.js$/);
  assert.match(assetManifest.assets.stream, /\/coco-assets\/stream-[A-Za-z0-9_-]+\.js$/);
  assert.match(assetManifest.assets.stylesheets[0] ?? "", /\/coco-assets\/styles-[a-f0-9]+\.css$/);
  assert.match(assetManifest.assets.islands.counter ?? "", /\/coco-assets\/islands\/counter-[A-Za-z0-9_-]+\.js$/);
  assert.match(assetManifest.assets.islands["icon-explorer"] ?? "", /\/coco-assets\/islands\/icon-explorer-[A-Za-z0-9_-]+\.js$/);
  const builtApp = (await import(`${pathToFileURL(path.join(project, ".cocoframe", "server.mjs")).href}?assets=${Date.now()}`)).default;
  const home = await (await builtApp.fetch(new Request("https://example.com/"))).text();
  const streamed = await (await builtApp.fetch(new Request("https://example.com/stream"))).text();
  const icons = await (await builtApp.fetch(new Request("https://example.com/icons"))).text();
  const cocoqlPage = await (await builtApp.fetch(new Request("https://example.com/cocoql"))).text();
  const projectPages = await Promise.all(["about", "versioning", "deployment", "conventions", "contact"].map(async (route) => [route, await (await builtApp.fetch(new Request(`https://example.com/${route}`))).text()] as const));
  const filteredIcons = await (await builtApp.fetch(new Request("https://example.com/icons?q=wallet"))).text();
  assert.match(home, new RegExp(assetManifest.assets.client.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(home, new RegExp((assetManifest.assets.islands["site-header"] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(home, /class="solar solar-bolt-linear"/);
  assert.match(home, /class="solar solar-code-square-linear"/);
  assert.doesNotMatch(home, /[ϟ▧✦☁⌾◇]/);
  for (const [route, html] of projectPages) {
    assert.match(html, new RegExp(`href="/${route}" aria-current="page"`));
    assert.match(html, /class="project-page/);
  }
  for (const href of ["/about", "/versioning", "/deployment", "/conventions", "/contact"]) assert.match(home, new RegExp(`href="${href}"`));
  assert.match(projectPages.find(([route]) => route === "about")?.[1] ?? "", /Four decisions shape every package/);
  assert.match(projectPages.find(([route]) => route === "versioning")?.[1] ?? "", /Architectural MVP/);
  assert.match(projectPages.find(([route]) => route === "deployment")?.[1] ?? "", /\.cocoframe\/deploy\.json/);
  assert.match(projectPages.find(([route]) => route === "conventions")?.[1] ?? "", /site-header\.island\.tsx/);
  assert.match(projectPages.find(([route]) => route === "contact")?.[1] ?? "", /method="post"/);
  assert.match(streamed, new RegExp(assetManifest.assets.stream.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal((icons.match(/class="icon-catalog-card"/g) ?? []).length, 1246);
  assert.match(icons, /aria-current="page" href="\/icons"/);
  assert.match(icons, /@cocoframe\/icons\/linear\/home/);
  assert.match(icons, /1\.246 icons/);
  assert.equal((filteredIcons.match(/class="icon-catalog-card"/g) ?? []).length, 1246);
  assert.equal((filteredIcons.match(/class="icon-catalog-card" data-icon-name="[^"]+" hidden/g) ?? []).length, 1243);
  assert.match(filteredIcons, /class="icons-live-count">3<\/strong>/);
  assert.equal((filteredIcons.match(/id="icon-usage-modal"/g) ?? []).length, 1);
  assert.doesNotMatch(filteredIcons, /value="wallet[^"<]*[<>]/);
  assert.match(cocoqlPage, /id="structured-errors"/);
  assert.match(cocoqlPage, /id="permissions"/);
  assert.match(cocoqlPage, /id="safety"/);
  assert.match(cocoqlPage, /id="mutation-preview"/);
  assert.match(cocoqlPage, /id="mutations"/);
  assert.match(cocoqlPage, /id="postgresql"/);
  assert.match(cocoqlPage, /id="examples"/);
  assert.equal((cocoqlPage.match(/class="cocoql-example-card reveal"/g) ?? []).length, 14);
  assert.match(cocoqlPage, /COCOQL COOKBOOK · 14 EXAMPLES/);
  assert.match(cocoqlPage, /id="example-basic-read"/);
  assert.match(cocoqlPage, /id="example-nested-relation"/);
  assert.match(cocoqlPage, /id="example-grouped-aggregate"/);
  assert.match(cocoqlPage, /id="example-update-preview"/);
  assert.match(cocoqlPage, /id="example-delete"/);
  assert.match(cocoqlPage, /defineCocoQLSafetyPolicy/);
  assert.match(cocoqlPage, /coco-token--keyword">confirm<\/span>.*coco-token--keyword">affected<\/span>/s);
  assert.match(cocoqlPage, /verifyBeforeCommit/);
  assert.match(cocoqlPage, /POSTGRESQL DIALECT/);
  assert.match(cocoqlPage, /numbered parameters/i);
  assert.match(cocoqlPage, /PERMISSION_DENIED/);
  assert.match(cocoqlPage, /defineCocoQLPermissions/);
  assert.match(cocoqlPage, /CocoQLIssue/);
  assert.match(cocoqlPage, /stage/);
  assert.match(cocoqlPage, /semantic/);
  assert.match(cocoqlPage, /location.*path/s);

  const explorerAsset = assetManifest.assets.islands["icon-explorer"]!;
  const explorerSource = await readFile(path.join(project, ".cocoframe", "public", explorerAsset.replace(/^\//, "")), "utf8");
  assert.ok(explorerSource.length < 20_000, `Icon explorer should stay small, received ${explorerSource.length} bytes`);
  assert.doesNotMatch(explorerSource, /<path d=|solarLinearIcons/);
});
