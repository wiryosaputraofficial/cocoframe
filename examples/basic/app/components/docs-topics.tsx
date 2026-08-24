import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import Book2Icon from "@cocoframe/icons/linear/book-2";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DocumentTextIcon from "@cocoframe/icons/linear/document-text";
import type { CocoNode } from "@cocoframe/jsx";
import { SyntaxHighlighter } from "@cocoframe/ui";
import type { SyntaxLanguage } from "@cocoframe/ui/syntax";
import { apiReference } from "../generated/api-reference.ts";

interface DocsSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly checklist?: readonly string[];
  readonly code?: string;
  readonly language?: SyntaxLanguage;
}

export interface DocsTopic {
  readonly slug: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly sections: readonly DocsSection[];
}

const topic = (slug: string, label: string, title: string, description: string, sections: readonly DocsSection[]): DocsTopic => ({ slug, label, title, description, sections });

export const docsTopics = [
  topic("getting-started", "GET STARTED", "Install CocoFrame and ship useful HTML first", "Create a typed server-first application, inspect its public surface, and produce a verified production build.", [
    { id: "requirements", title: "Requirements", paragraphs: ["Use Node.js 24 or newer and a current npm-compatible package manager. The official creator installs a coordinated, exactly pinned CocoFrame package set."], checklist: ["Node.js 24+", "An empty target directory", "A supported npm, pnpm, yarn, or bun workflow"] },
    { id: "create", title: "Create and run a project", paragraphs: ["The starter includes a server-rendered page, typed health API, optional island, responsive CSS, production scripts, and an AI guide."], code: "npm create cocoframe@latest my-app\ncd my-app\nnpm run dev", language: "bash" },
    { id: "verify", title: "Verify before changing code", paragraphs: ["Inspection is the fastest way for humans and AI to understand the current routes, islands, UI usage, contracts, middleware, and system endpoints."], code: "npm run check\nnpm run inspect\nnpm run build", language: "bash" },
  ]),
  topic("pages", "SERVER RENDERING", "Pages, routing, layouts, data, and cache", "Keep each page lifecycle in one typed definition and return complete semantic HTML without requiring browser JavaScript.", [
    { id: "page", title: "One page lifecycle", paragraphs: ["A page owns load, meta, view, optional action, status, cache, and error behavior. File names determine URL patterns."], code: `import { definePage } from "@cocoframe/core";

export default definePage({
  load: ({ params }) => ({ slug: params.slug }),
  meta: ({ slug }) => ({ title: slug }),
  cache: { browser: 60, edge: 300 },
  view: ({ slug }) => <main><h1>{slug}</h1></main>,
});` },
    { id: "routing", title: "File-based routing", paragraphs: ["Use index.page.tsx for a directory root, [id].page.tsx for one parameter, and [...rest].page.tsx for a catch-all. Static routes are matched before dynamic routes."], checklist: ["Keep layouts in _layout.tsx", "Keep API handlers in *.route.ts", "Use npm run inspect to verify the resulting pattern"] },
    { id: "streaming", title: "Streaming and failures", paragraphs: ["Pages stream by default. Declaring a page error boundary intentionally buffers that page so a render failure can still produce an accurate HTTP 500 response. Use defer only for supplementary content."] },
  ]),
  topic("islands", "OPT-IN JAVASCRIPT", "Interactive islands and fine-grained state", "Add browser JavaScript only around genuine interaction while preserving useful server-rendered output.", [
    { id: "define", title: "Define one stable island", paragraphs: ["Interactive files live under app/islands and use a stable lowercase name matching the filename. Props must remain JSON-serializable."], code: `import { bind, defineIsland, signal } from "@cocoframe/client";

export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => <button onClick={() => count.value++}>{bind(count)}</button>;
  },
});` },
    { id: "reactivity", title: "Choose the smallest update boundary", paragraphs: ["Use bind(signal) or bind(computed(...)) when only reactive text changes. Reading .value in the island view opts into a boundary rerender."] },
    { id: "verify", title: "Browser verification", paragraphs: ["Test keyboard behavior, strict CSP, hydration, console errors, reduced motion, and server output before JavaScript mounts."], code: "npm run test:e2e", language: "bash" },
  ]),
  topic("forms", "PROGRESSIVE MUTATIONS", "Forms, validation, actions, and CSRF", "Use one schema-backed controller for parsing, values, accessible errors, and mutation behavior.", [
    { id: "controller", title: "One validation source", paragraphs: ["createForm(schema) owns parsing and field errors. Invalid forms rerender with HTTP 422 and preserve only non-sensitive string values; successful mutations normally redirect with 303."], checklist: ["Do not duplicate schema rules in the page action", "Never retain passwords or secret fields", "Show errors next to their labelled controls"] },
    { id: "csrf", title: "Cookie-authenticated forms", paragraphs: ["Pair CsrfField with matching CSRF middleware for unsafe cookie-authenticated requests. Never log tokens, cookies, authorization headers, or request bodies."] },
  ]),
  topic("apis", "TYPED CONTRACTS", "API routes and generated mobile-ready clients", "Define one stable contract, validate both directions, and generate Fetch-standard clients and OpenAPI.", [
    { id: "contract", title: "Define a contracted API", paragraphs: ["A contracted API has one stable ID and schema-validated input and output. Return plain data unless a custom Response is required."], code: `import { defineApi } from "@cocoframe/core";
import { schema } from "@cocoframe/schema";

export default defineApi({
  id: "greet-person",
  method: "GET",
  input: { params: schema.object({ name: schema.string() }) },
  output: schema.object({ message: schema.string() }),
  handle: ({ input }) => ({ message: "Hello, " + input.params.name }),
});` },
    { id: "generate", title: "Regenerate every consumer", paragraphs: ["After a contract changes, regenerate the typed client, OpenAPI, and CSS declarations. Generated files are review evidence, not editing targets."], code: "npm run generate", language: "bash" },
  ]),
  topic("database", "PERSISTENCE", "Database adapters, transactions, and migrations", "Keep connection ownership explicit, SQL parameterized, and deployed migrations immutable.", [
    { id: "adapters", title: "Driver-neutral lifecycle", paragraphs: ["The database facade always releases acquired connections and exposes transactions only when the selected adapter declares support."], checklist: ["Use values separately from SQL", "Rollback failed transactions", "Release connections on success and failure"] },
    { id: "sqlite", title: "SQLite", paragraphs: ["Use the built-in Node SQLite adapter for serialized access, parameterized queries, transactions, and ordered migrations."] },
    { id: "postgres", title: "PostgreSQL", paragraphs: ["Use structurally compatible pools and run production migrations through the advisory-locked migration helper."] },
  ]),
  topic("security", "SECURE BOUNDARIES", "Security, sessions, middleware, and observability", "Apply security at request boundaries with explicit trust, safe logging, and inspectable middleware order.", [
    { id: "headers", title: "Browser and origin policy", paragraphs: ["Keep CSP and security headers outside render code. Credentialed CORS uses explicit origins, and production applications should declare allowed hosts."] },
    { id: "identity", title: "Sessions are not authorization", paragraphs: ["Signed sessions verify integrity but do not replace authorization checks or password hashing. Keep session secrets server-only."] },
    { id: "proxy", title: "Proxy and rate-limit trust", paragraphs: ["Forwarded host, protocol, and client IP are trusted only when the direct peer is explicitly configured. Rate-limit keys come from verified identity or trusted proxy configuration."] },
    { id: "logs", title: "Safe observability", paragraphs: ["Structured request events may include validated request IDs, timing, methods, paths, and response status. Do not log cookies, tokens, request bodies, or internal readiness failures."] },
  ]),
  topic("components", "DESIGN SYSTEM", "Server-first components, charts, icons, and styles", "Reuse semantic primitives before creating application-specific equivalents and keep static UI free of browser runtime.", [
    { id: "ui", title: "Semantic UI first", paragraphs: ["CocoFrame UI primitives render semantic HTML on the server. Add an island only when interaction genuinely requires browser state."], checklist: ["Prefer @cocoframe/ui", "Use *.module.css for reusable styles", "Never hard-code generated scoped class names"] },
    { id: "charts", title: "Accessible SVG charts", paragraphs: ["Charts are responsive server-rendered SVG with accessible labels and support multiple datasets without requiring client JavaScript."] },
    { id: "icons", title: "Tree-shakeable typed icons", paragraphs: ["Import icons through direct @cocoframe/icons/linear/* subpaths. Icons are decorative by default and accept a label when they carry meaning."] },
  ]),
  topic("testing", "QUALITY", "Testing, inspection, browser matrices, and package smoke", "Select the smallest focused test while developing, then run the complete gates required for the affected behavior.", [
    { id: "layers", title: "Quality layers", paragraphs: ["Type checks, Node unit/integration tests, project inspection, generation, production builds, browser E2E, package smoke, and benchmarks cover different public contracts."], code: "npm run check\nnpm test\nnpm run inspect\nnpm run build\nnpm run test:e2e\nnpm run packages:smoke", language: "bash" },
    { id: "browser", title: "Browser matrix", paragraphs: ["The official suite covers development Chromium, production Chromium/Firefox/WebKit, and responsive Chromium viewports from 320px through 4K."] },
  ]),
  topic("deployment", "PRODUCTION", "Build, deploy, observe, and shut down safely", "Produce hashed assets and one server bundle, then preserve host, proxy, readiness, and shutdown invariants in production.", [
    { id: "build", title: "Production artifacts", paragraphs: ["The production build writes the server module, hashed browser assets, asset and deployment manifests, and copied public files."], code: "npm run build\nnpm start", language: "bash" },
    { id: "node", title: "Node and containers", paragraphs: ["Expose PORT, configure explicit allowed hosts and trusted proxies, install liveness/readiness probes, and forward shutdown signals to the process."], checklist: ["Mark readiness false before draining", "Set request timeout and body-size policy", "Serve hashed assets with immutable caching"] },
    { id: "fetch", title: "Fetch and edge hosts", paragraphs: ["Use webHandler(app) from @cocoframe/server-web and verify that the target platform preserves Web Standard streaming and AbortSignal behavior."] },
  ]),
  topic("cocospecs", "AI DISCOVERY", "CocoSpecs product discovery", "Turn an incomplete feature request into reviewed requirements, flows, data decisions, acceptance criteria, and implementation tasks.", [
    { id: "lifecycle", title: "Interview before implementation", paragraphs: ["The adaptive interview asks no more than four unresolved questions per batch. Implementation begins only after the canonical spec state is approved."], code: "cocoframe spec create login --brief \"Members sign in.\"\ncocoframe spec resume login\ncocoframe spec check login\ncocoframe spec generate login\ncocoframe spec approve login", language: "bash" },
    { id: "artifacts", title: "Canonical and generated files", paragraphs: ["specs/<feature>/spec.json is canonical. PRD, Mermaid flow and data model, acceptance criteria, decisions, and tasks are deterministic review views."] },
  ]),
  topic("cocoref", "AI VISUAL WORKFLOW", "CocoRef reference-driven components", "Audit an image or website against the existing component system and ask before creating anything missing.", [
    { id: "audit", title: "Inventory before creation", paragraphs: ["Every visible requirement is recorded as reuse or missing. A page request is not consent to create a missing component."], code: "cocoframe ref create dashboard --image ./dashboard.png\ncocoframe ref audit dashboard --requirements ./requirements.json", language: "bash" },
    { id: "approval", title: "Preview the exact source", paragraphs: ["The local preview renders the actual temporary TSX candidate. Feedback reopens it; approval promotes it and removes the temporary route. Production excludes all temporary CocoRef routes."] },
  ]),
  topic("cocoqa", "AI QUALITY WORKFLOW", "CocoQA evidence and release approval", "Ask what passing means, trace tests to approved intent, run known gates, resolve defects, and request explicit approval.", [
    { id: "plan", title: "Create quality scope", paragraphs: ["CocoQA requires an approved CocoSpec and can include a completed CocoRef. Adaptive questions make environments, devices, safe test data, accessibility, security, and release blockers explicit."], code: "cocoframe qa create login --spec login --ref login-reference\ncocoframe qa resume login", language: "bash" },
    { id: "evidence", title: "Evidence before approval", paragraphs: ["Required cases and known npm gates must pass and no defect may remain open. Raw command output is not persisted."], code: "cocoframe qa run login\ncocoframe qa record login acceptance-1 pass --evidence \"Login E2E passed.\"\ncocoframe qa check login\ncocoframe qa approve login", language: "bash" },
  ]),
  topic("agent-bridge", "AI CLIENT INTEGRATION", "Agent Bridge over local MCP", "Connect supported AI clients to one provider-independent surface for discovery, lifecycle preparation, and human-approved controlled file changes.", [
    { id: "connect", title: "Connect through stdio", paragraphs: ["The AI client launches the bridge and owns its lifetime. Standard output carries only MCP JSON-RPC; sanitized diagnostics use standard error."], code: "cocoframe agent .", language: "bash" },
    { id: "discover", title: "Discover before creating", paragraphs: ["Project inspection returns routes, APIs, components, islands, middleware, dependencies, and existing generated capabilities. Dedicated search tools find documentation, reusable components, APIs, and canonical lifecycle state."], checklist: ["Call project.inspect first", "Search docs and reusable capabilities", "Use CocoSpecs, CocoRef, and CocoQA state as canonical"] },
    { id: "lifecycles", title: "Prepare lifecycle state", paragraphs: ["Phase 2 returns only the next CocoSpecs batch, audits components before CocoRef proposes missing UI, and keeps CocoQA acceptance, evidence, defects, gates, and approval state traceable. New records remain in-memory proposals."], checklist: ["cocospecs.next", "cocoref.audit", "cocoqa.trace"] },
    { id: "mutation", title: "Approve exact changes", paragraphs: ["mutation.plan keeps proposal content in memory and records only paths and SHA-256 hashes. mutation.execute requires an unexpired human decision bound to the operation, session, role, reviewed hashes, and selected targets."], code: "cocoframe agent approve <operation-id> --project . --role application-developer", language: "bash", checklist: ["Partial approval changes only selected targets", "Target conflicts fail closed", "Multi-file failures roll back"] },
    { id: "boundary", title: "Controlled mutation boundary", paragraphs: ["Agent Bridge exposes file create/update only. It provides no delete, shell, dependency installation, Git, publish, deploy, database, external, or outside-workspace action."], checklist: ["Single-use approval", "15-minute expiry", "Hash-only audit records"] },
  ]),  topic("cocoql", "AI DATA", "CocoQL schema-aware reads and guarded mutations", "Give AI a small deterministic query language with explicit schema, permissions, safety policy, previews, and parameterized SQL.", [
    { id: "pipeline", title: "Validate before compilation", paragraphs: ["Lex, parse, validate, authorize, plan, enforce safety, then compile. Structured diagnostics preserve stages, codes, paths, and source locations for self-correction."] },
    { id: "writes", title: "Preview guarded writes", paragraphs: ["Mutation previews are non-executable. Update and delete operations require explicit guards, permission checks, safety policy, and confirmation before parameterized compilation."], checklist: ["Default-deny permissions", "No raw SQL from AI", "MySQL and PostgreSQL dialects"] },
  ]),
] as const satisfies readonly DocsTopic[];

export function findDocsTopic(slug: string | undefined): DocsTopic | undefined {
  return docsTopics.find((candidate) => candidate.slug === slug);
}

export function DocsTopicView({ topic: current }: { readonly topic: DocsTopic }): CocoNode {
  const index = docsTopics.findIndex(({ slug }) => slug === current.slug);
  const previous = docsTopics[index - 1];
  const next = docsTopics[index + 1];
  return <>
    <header class="docs-topic-hero" id="top"><span class="eyebrow">{current.label}</span><h1>{current.title}</h1><p>{current.description}</p><nav aria-label="Breadcrumb"><a href="/docs">Documentation</a><span>/</span><strong>{current.title}</strong></nav></header>
    <article class="docs-topic-body">{current.sections.map((section) => <section id={section.id} class="docs-topic-section"><header><h2>{section.title}</h2></header>{section.paragraphs.map((paragraph) => <p>{paragraph}</p>)}{section.checklist ? <ul>{section.checklist.map((item) => <li>{item}</li>)}</ul> : null}{section.code ? <SyntaxHighlighter class="guide-code" code={section.code} language={section.language ?? "tsx"} label={`${section.title} example`} /> : null}</section>)}</article>
    <nav class="docs-topic-pagination" aria-label="Documentation topics">{previous ? <a href={`/docs/${previous.slug}`}><span>Previous</span><strong>{previous.title}</strong></a> : <a href="/docs"><span>Previous</span><strong>Documentation home</strong></a>}{next ? <a href={`/docs/${next.slug}`}><span>Next</span><strong>{next.title}</strong> <ArrowRightIcon size={15} /></a> : <a href="/docs/api-reference"><span>Next</span><strong>API reference</strong> <ArrowRightIcon size={15} /></a>}</nav>
  </>;
}

export function ApiReferenceView({ selectedPackage }: { readonly selectedPackage?: string }): CocoNode {
  const selected = apiReference.packages.find(({ name }) => name === selectedPackage);
  const symbolCount = apiReference.packages.reduce((count, item) => count + item.entries.reduce((entryCount, entry) => entryCount + entry.symbols.length, 0), 0);
  return <>
    <header class="docs-topic-hero docs-api-hero" id="top"><span class="eyebrow">GENERATED REFERENCE</span><h1>Public API reference</h1><p>{apiReference.packages.length} packages and {symbolCount} exported symbols generated directly from package manifests, TypeScript declarations, and JSDoc.</p><nav aria-label="Breadcrumb"><a href="/docs">Documentation</a><span>/</span><strong>API reference</strong></nav></header>
    {selected ? <article class="api-package-detail">
      <a class="api-back" href="/docs/api-reference">← All packages</a><header><span><CodeSquareIcon size={21} /></span><div><h2>{selected.name}</h2><p>{selected.description}</p></div><code>v{selected.version}</code></header>
      {selected.entries.map((entry) => <section class="api-entry"><div class="api-entry-heading"><div><span>IMPORT</span><code>{entry.importPath}</code></div><small>{entry.source}</small></div><div class="api-symbol-list">{entry.symbols.map((symbol) => <article id={`${selected.name.replace(/[^a-z0-9]+/gi, "-")}-${symbol.name}`} class="api-symbol"><header><div><span>{symbol.kind}</span>{symbol.deprecated ? <b>DEPRECATED</b> : null}</div><h3>{symbol.name}</h3><p>{symbol.summary}</p></header><pre><code>{symbol.signature}</code></pre>{symbol.examples.map((example) => <SyntaxHighlighter class="guide-code" code={example} language="tsx" label={`${symbol.name} example`} />)}<footer><DocumentTextIcon size={14} /> {symbol.source}:{symbol.line}</footer></article>)}</div></section>)}
    </article> : <section class="api-package-grid" aria-label="CocoFrame packages">{apiReference.packages.map((item) => { const count = item.entries.reduce((total, entry) => total + entry.symbols.length, 0); return <a href={`/docs/api-reference?package=${encodeURIComponent(item.name)}`}><span><Book2Icon size={22} /></span><div><h2>{item.name}</h2><p>{item.description}</p><small>{count} symbols · v{item.version}</small></div><ArrowRightIcon size={16} /></a>; })}</section>}
  </>;
}
