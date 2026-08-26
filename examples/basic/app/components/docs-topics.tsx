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
    { id: "postgres", title: "PostgreSQL 14–18", paragraphs: ["Use createCocoQLPostgresExecutor for permission-aware, safety-bounded reads and writes. It validates before acquiring, executes parameterized SQL in transactions, enforces timeouts and result/row guards, propagates AbortSignal cancellation, retries serialization/deadlock failures, and emits sanitized telemetry. Production migrations use advisory locks and immutable checksums."], checklist: ["Native UUID, JSONB, arrays, and full-text", "CTE, HAVING, DISTINCT, cursor, and row locks", "RETURNING and ON CONFLICT", "Real-server CI matrix"] },
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
  topic("doctor", "DIAGNOSTICS", "Find CocoFrame project problems before debugging manually", "Run one safe command to diagnose environment, dependency, project, generated-artifact, security, and optional isolated-build problems.", [
    { id: "run", title: "Fast read-only checks by default", paragraphs: ["Doctor statically inspects the project without executing configuration or application source, contacting the network, or changing files. Human output and JSON contract version 1 come from the same engine."], code: "cocoframe doctor\ncocoframe doctor --json", language: "bash" },
    { id: "modes", title: "Deep and strict modes", paragraphs: ["Use --deep to build into an isolated temporary output directory. Use --strict in CI when warning-only results must fail."], code: "cocoframe doctor --deep --strict\ncocoframe doctor --json --strict", language: "bash", checklist: ["Exit 0: healthy or non-strict warnings", "Exit 1: errors or strict warnings", "Exit 2: internal failure or cancellation"] },
    { id: "diagnostics", title: "Stable actionable diagnostics", paragraphs: ["Every diagnostic includes a stable code, severity, category, sanitized evidence, suggestion, and documentation reference. JSON contains no ANSI output, source contents, environment values, credentials, or timing noise."], checklist: ["PROJECT_NOT_FOUND", "COCOFRAME_DEPENDENCY_MISSING", "ISLAND_NAME_MISMATCH", "GENERATED_ARTIFACT_STALE", "ALLOWED_HOSTS_WILDCARD", "DEEP_BUILD_FAILED"] },
    { id: "ai", title: "The same contract for AI", paragraphs: ["Agent Bridge project.doctor calls the canonical Doctor engine in-process with workspace confinement and AbortSignal cancellation. AI and developers therefore diagnose the same project with the same contract."] },
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
  topic("cocoux", "AI EXPERIENCE DESIGN", "CocoUX journeys and visual direction", "Design reachable journeys, complete interface states, accessible interactions, and real website-like PNG previews before CocoRef approves exact source.", [
    { id: "contract", title: "Design the whole experience", paragraphs: ["CocoUX starts from approved intent and captured project inventory. Every screen reviews initial, loading, empty, success, validation, disabled, error, offline, and permission states, including explicit not-applicable rationales."], code: "cocoframe ux create checkout --brief \"Design checkout.\" --spec checkout\ncocoframe ux answer checkout --input ./checkout-ux.json\ncocoframe ux check checkout", language: "bash", checklist: ["One reachable journey root", "Observable terminal outcomes", "Keyboard, focus, feedback, and recovery", "Reuse existing components and tokens first"] },
    { id: "preview", title: "Review the website as PNG evidence", paragraphs: ["The managed server-rendered preview captures every applicable state at 320, 390, 768, 1366, and 4K widths. Each PNG binds viewport, theme, state, source hash, image hash, contract hash, and revision."], code: "cocoframe ux generate checkout\ncocoframe ux preview checkout\ncocoframe ux feedback checkout \"Clarify the order summary\"", language: "bash" },
    { id: "approval", title: "Two separate approvals", paragraphs: ["CocoUX approval accepts visual direction only and may hand PNGs to CocoRef. It never promotes temporary TSX or CSS. CocoRef separately audits components, asks consent for anything missing, previews exact source, and controls promotion."], code: "cocoframe ux approve checkout --role application-developer\ncocoframe ux handoff checkout\ncocoframe ref audit checkout --requirements ./requirements.json", language: "bash" },
    { id: "qa", title: "Trace implementation back to UX", paragraphs: ["CocoQA derives required cases from approved journeys, states, interactions, and screenshot evidence in addition to CocoSpec and CocoRef."], code: "cocoframe qa create checkout --spec checkout --ux checkout --ref checkout", language: "bash" },
  ]),
  topic("cocoref", "AI VISUAL WORKFLOW", "CocoRef reference-driven components", "Audit an image or website against the existing component system and ask before creating anything missing.", [
    { id: "audit", title: "Inventory before creation", paragraphs: ["Every visible requirement is recorded as reuse or missing. A page request is not consent to create a missing component."], code: "cocoframe ref create dashboard --image ./dashboard.png\ncocoframe ref audit dashboard --requirements ./requirements.json", language: "bash" },
    { id: "approval", title: "Preview the exact source", paragraphs: ["The local preview renders the actual temporary TSX candidate. Feedback reopens it; approval promotes it and removes the temporary route. Production excludes all temporary CocoRef routes."] },
  ]),
  topic("cocoqa", "AI QUALITY WORKFLOW", "CocoQA evidence and release approval", "Ask what passing means, trace tests to approved intent, run known gates, resolve defects, and request explicit approval.", [
    { id: "plan", title: "Create quality scope", paragraphs: ["CocoQA requires an approved CocoSpec and can include a completed CocoRef. Adaptive questions make environments, devices, safe test data, accessibility, security, and release blockers explicit."], code: "cocoframe qa create login --spec login --ref login-reference\ncocoframe qa resume login", language: "bash" },
    { id: "evidence", title: "Evidence before approval", paragraphs: ["Required cases and known npm gates must pass and no defect may remain open. Raw command output is not persisted."], code: "cocoframe qa run login\ncocoframe qa record login acceptance-1 pass --evidence \"Login E2E passed.\"\ncocoframe qa check login\ncocoframe qa approve login", language: "bash" },
  ]),
  topic("product-design-quality", "PRODUCT DESIGN", "Product Design Quality", "Keep AI-generated interfaces reusable, token-driven, accessible, responsive, and faithful to approved references.", [
    { id: "profile", title: "Customize without forking components", paragraphs: ["Define semantic color, spacing, radius, typography, elevation, breakpoints, and icon policy in cocoframe.design.json. Theme applies only allow-listed project overrides on the server."], code: "cocoframe qa create login --spec login --design cocoframe.design.json\ncocoframe qa resume login", language: "bash" },
    { id: "reuse", title: "Audit before creating", paragraphs: ["Search framework and application components first. If a reference needs a missing component, CocoRef consent and exact-source preview remain mandatory."], checklist: ["Reuse @cocoframe/ui first", "Use @cocoframe/icons linear family", "Record component inventory evidence"] },
    { id: "quality", title: "Prove visual quality", paragraphs: ["CocoQA traces spacing, color, contrast, typography, radius, elevation, iconography, overflow, responsive reflow, accessibility, and optional reference fidelity."], checklist: ["WCAG 2.2 AA", "320px through 4K plus zoom", "Sanitized evidence only", "Profile changes invalidate approval"] },
  ]),
  topic("agent-bridge", "AI CLIENT INTEGRATION", "Agent Bridge over local MCP", "Connect supported AI clients to one provider-independent surface for discovery, lifecycle preparation, and human-approved controlled file changes.", [
    { id: "connect", title: "Connect through stdio", paragraphs: ["The AI client launches the bridge and owns its lifetime. Standard output carries only MCP JSON-RPC; sanitized diagnostics use standard error."], code: "cocoframe agent .", language: "bash" },
    { id: "discover", title: "Discover before creating", paragraphs: ["Project inspection returns routes, APIs, components, islands, middleware, dependencies, and existing generated capabilities. Project Doctor adds actionable environment, configuration, generated-artifact, security, and build diagnostics."], checklist: ["Call project.inspect first", "Call project.doctor before debugging manually", "Search docs and reusable capabilities", "Use CocoSpecs, CocoUX, CocoRef, and CocoQA state as canonical"] },
    { id: "lifecycles", title: "Prepare lifecycle state", paragraphs: ["Read-only lifecycle tools return the next CocoSpecs batch, inspect complete CocoUX decisions and PNG evidence, audit components before CocoRef proposes missing UI, and keep CocoQA traceability visible. New records remain in-memory proposals."], checklist: ["cocospecs.next", "cocoux.inspect", "cocoref.audit", "cocoqa.trace"] },
    { id: "mutation", title: "Approve exact changes", paragraphs: ["mutation.plan keeps proposal content in memory and records only paths and SHA-256 hashes. mutation.execute requires an unexpired human decision bound to the operation, session, role, reviewed hashes, and selected targets."], code: "cocoframe agent approve <operation-id> --project . --role application-developer", language: "bash", checklist: ["Partial approval changes only selected targets", "Target conflicts fail closed", "Multi-file failures roll back"] },
    { id: "boundary", title: "Controlled mutation boundary", paragraphs: ["Agent Bridge exposes file create/update only. It provides no delete, shell, dependency installation, Git, publish, deploy, database, external, or outside-workspace action."], checklist: ["Single-use approval", "15-minute expiry", "Hash-only audit records"] },
  ]),  topic("cocoql", "AI DATA", "CocoQL schema-aware reads and guarded mutations", "Give AI a small deterministic query language with explicit schema, permissions, safety policy, previews, and parameterized SQL.", [
    { id: "pipeline", title: "Validate before compilation", paragraphs: ["Lex, parse, validate, authorize, plan, enforce safety, then compile. Structured diagnostics preserve stages, codes, paths, and source locations for self-correction."] },
    { id: "writes", title: "Preview guarded writes", paragraphs: ["Mutation previews are non-executable. Update and delete operations require explicit guards, permission checks, safety policy, and confirmation before parameterized compilation or managed PostgreSQL execution."], checklist: ["Default-deny permissions", "No raw SQL from AI", "MySQL compiler", "Managed PostgreSQL 14–18 executor"] },
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
