import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import ArrowUpIcon from "@cocoframe/icons/linear/arrow-up";
import type { CocoNode } from "@cocoframe/jsx";
import { SyntaxHighlighter } from "@cocoframe/ui";
import type { SyntaxLanguage } from "@cocoframe/ui/syntax";
import DocsSidebar from "../islands/docs-sidebar.island.tsx";
import DocsSearch from "../islands/docs-search.island.tsx";
import PackageCommand from "../islands/package-command.island.tsx";

interface GuideSectionProps {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly code?: string;
  readonly language?: SyntaxLanguage;
  readonly children?: CocoNode;
}

const pageExample = `import { definePage } from "@cocoframe/core";

export default definePage({
  load: ({ params, query }) => ({
    slug: params.slug,
    preview: query.get("preview") === "1",
  }),
  meta: ({ slug }) => ({
    title: slug,
    description: "Article " + slug,
  }),
  cache: { browser: 60, edge: 300 },
  view: ({ slug, preview }) => (
    <main><h1>{slug}</h1><p>Preview: {String(preview)}</p></main>
  ),
});`;

const islandExample = `import { bind, defineIsland, signal } from "@cocoframe/client";

export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => (
      <button onClick={() => count.value++}>
        Clicked {bind(count)} times
      </button>
    );
  },
});`;

const formExample = `import { definePage, redirect } from "@cocoframe/core";
import { createForm, CsrfField } from "@cocoframe/forms";
import { schema } from "@cocoframe/schema";
import { Button, FormField, Input } from "@cocoframe/ui";

const profileForm = createForm(schema.object({
  name: schema.string({ min: 2, max: 80 }),
}));

export default definePage({
  meta: { title: "Profile" },
  action: profileForm.action(async (input) => {
    await saveProfile(input);
    return redirect("/profile?saved=1", 303);
  }),
  view: (_data, context) => {
    const state = profileForm.state(context);
    const name = profileForm.field("name", state);
    return <form method="post">
      <CsrfField context={context} />
      <FormField label="Name" htmlFor={name.id} error={state.errors.name?.[0]}>
        <Input {...name} required />
      </FormField>
      <Button type="submit">Save</Button>
    </form>;
  },
});`;

const apiExample = `import { defineApi } from "@cocoframe/core";
import { schema } from "@cocoframe/schema";

export default defineApi({
  id: "greet-person",
  method: "GET",
  input: {
    params: schema.object({ name: schema.string({ min: 2 }) }),
    query: schema.object({ excited: schema.optional(schema.boolean({ coerce: true })) }),
  },
  output: schema.object({ message: schema.string() }),
  handle: ({ input }) => ({
    message: "Hello, " + input.params.name + (input.query.excited ? "!" : "."),
  }),
});`;

export default definePage({
  meta: {
    title: "Documentation — CocoFrame",
    description: "Complete CocoFrame guide covering pages, routing, components, islands, forms, APIs, databases, security, testing, and deployment.",
    canonical: "https://cocoframe.dev/docs",
    image: "/assets/cocoframe-hero-isometric.png",
    type: "article",
    jsonLd: { "@context": "https://schema.org", "@type": "TechArticle", headline: "CocoFrame Documentation", inLanguage: "en" },
  },
  view: () => <main id="top" class="docs-layout">
    <DocsSidebar kind="documentation" />
    <div class="docs-content">
      <section class="docs-hero" id="introduction">
        <div class="docs-hero-copy reveal"><span class="eyebrow">DOCUMENTATION</span><h1>Build smarter with<br /><span>CocoFrame</span></h1><p>A guide to the CocoFrame APIs available in the current MVP—from your first page to the production runtime.</p></div>
        <div class="docs-hero-art reveal"><div class="hero-art-glow"></div><img src="/assets/cocoframe-hero-isometric.png" alt="CocoFrame isometric illustration" width="768" height="512" /></div>
      </section>

      <section class="docs-panel quick-start" id="quick-start">
        <div class="panel-heading"><div><h2>Quick Start</h2><p>Create a CocoFrame application from npm and run it with Node.js 24 or newer.</p></div><a href="#project-structure">Explore the structure <span aria-hidden="true"><ArrowRightIcon size={15} /></span></a></div>
        <div class="quick-steps"><article><span>1</span><div><h3>Create project</h3><p>Run the official creator from the npm registry.</p></div><b aria-hidden="true"><ArrowRightIcon size={16} /></b></article><article><span>2</span><div><h3>Automatic installation</h3><p>The creator installs the required public dependencies.</p></div><b aria-hidden="true"><ArrowRightIcon size={16} /></b></article><article><span>3</span><div><h3>Start development</h3><p>Enter the project directory and start the development server.</p></div><b aria-hidden="true"><ArrowRightIcon size={16} /></b></article><article><span>4</span><div><h3>Open the app</h3><p>Open <code>http://127.0.0.1:3000</code>.</p></div></article></div>
        <PackageCommand />
        <p class="guide-note"><strong>The project creator is available on npm:</strong> <a href="#project-creator"><code>npm create cocoframe@latest my-app</code></a> installs the public runtime and generates a server-first starter ready for development.</p>
      </section>

      <section class="docs-panel docs-explore" id="guides"><div class="panel-heading"><div><h2>Explore the Docs</h2><p>Find the framework area you want to use.</p></div></div><DocsSearch /></section>

      <article class="docs-guide" aria-label="Complete CocoFrame guide">
        <GuideSection id="installation" label="GET STARTED" title="Installation from npm" description="Create a project from the official package with Node.js 24+, then run the development server on port 3000." language="bash" code={`npm create cocoframe@latest my-app\ncd my-app\nnpm run dev`}>
          <p>The creator installs dependencies automatically. When the server is ready, open <code>http://127.0.0.1:3000</code>; application file changes are watched during development.</p>
          <p>Before deployment, run <code>npm run check</code>, <code>npm run inspect</code>, and <code>npm run build</code>. Use <code>npm start</code> to run the production bundle after the build.</p>
          <p>Always import internal packages through the <code>@cocoframe/*</code> namespace. Do not import another package source file through a relative application path.</p>
        </GuideSection>

        <GuideSection id="project-creator" label="GET STARTED" title="Project creator" description="The dependency-free creator generates four official server-first, responsive templates using CocoFrame UI and icons." language="bash" code={`# Starter (default)\nnpm create cocoframe@latest my-app\n\n# Choose an official template\nnpm create cocoframe@latest my-dashboard -- --template dashboard\ncd my-dashboard\nnpm run dev`}>
          <p>The public command downloads <code>create-cocoframe</code> and every <code>@cocoframe/*</code> package from the npm registry. Clone GitHub only when contributing to the framework source.</p>
          <ul>
            <li>Use <code>--template starter|marketing|dashboard|documentation</code> to select an application foundation. Every template uses <code>@cocoframe/ui</code> and <code>@cocoframe/icons</code>.</li>
            <li>Use <code>--package-manager npm|pnpm|yarn|bun</code> to select a package manager.</li>
            <li>Use <code>--skip-install</code> for CI or AI workflows that inspect files before installing dependencies.</li>
            <li>The creator rejects filesystem roots and non-empty directories to protect existing project data.</li>
          </ul>
          <p><code>npm create cocoframe@latest my-app</code> is the official installation path and is verified through type checking, inspection, production builds, SSR, and typed APIs.</p>
        </GuideSection>

        <GuideSection id="cocospecs" label="AI-FIRST" title="CocoSpecs product discovery" description="Turn an initial feature request into reviewed product requirements, flows, data decisions, acceptance criteria, and implementation tasks before writing code." language="bash" code={`cocoframe spec create login --brief "Users sign in and continue to the dashboard."\ncocoframe spec resume login\ncocoframe spec check login\ncocoframe spec generate login\ncocoframe spec approve login`}>
          <p>The interview asks no more than four unresolved questions per batch. Authentication, OAuth, role routing, persistence, migration, observability, and delivery questions appear only when the feature and prior answers make them relevant.</p>
          <p><code>specs/&lt;feature&gt;/spec.json</code> is the source of truth. Generated PRD, Mermaid flow and data model, acceptance criteria, decisions, and tasks are review views. Implementation begins only after the canonical state is <code>approved</code>. See the <a href="/cocospecs">dedicated CocoSpecs overview</a> for the complete product workflow.</p>
        </GuideSection>

        <GuideSection id="cocoref" label="AI VISUAL WORKFLOW" title="CocoRef adaptive reference components" description="Use an image or website as design evidence, audit existing components, and require approval before a missing component becomes application source." language="bash" code={`cocoframe ref create dashboard --image ./references/dashboard.png
cocoframe ref audit dashboard --requirements ./requirements.json
cocoframe ref consent dashboard activity-feed
cocoframe ref preview dashboard activity-feed
cocoframe ref feedback dashboard activity-feed "Use denser spacing"
cocoframe ref approve dashboard activity-feed`}>
          <p><code>refs/&lt;name&gt;/ref.json</code> is canonical. The audit maps each visual requirement to an existing UI primitive, application component, island, or an explicitly missing component.</p>
          <p>Missing components stop until the user grants consent. The local preview renders the actual temporary TSX candidate; feedback reopens it for revision. Approval promotes that exact source into <code>app/components/</code>, while approval and cancellation both remove the temporary preview. See the <a href="/cocoref">dedicated CocoRef overview</a>.</p>
        </GuideSection>

        <GuideSection id="cocoqa" label="AI QUALITY WORKFLOW" title="CocoQA evidence and release approval" description="Turn approved requirements into explicit quality decisions, traceable test cases, allow-listed project gates, defect records, and release approval." language="bash" code={`cocoframe qa create login --spec login --ref login-reference
cocoframe qa resume login
cocoframe qa run login
cocoframe qa record login acceptance-1 pass --evidence "Login E2E passed."
cocoframe qa check login
cocoframe qa approve login`}>
          <p><code>qa/&lt;feature&gt;/qa.json</code> is canonical. CocoQA asks about target environments, devices, safe test data, release blockers, accessibility, security, and—when thorough mode is selected—performance and regression risk.</p>
          <p>Required cases and gates must pass and every defect must be closed before approval. Raw command output is not persisted. See the <a href="/cocoqa">dedicated CocoQA overview</a>.</p>
        </GuideSection>

        <GuideSection id="project-structure" label="CONVENTION" title="Project structure" description="The structure is intentionally predictable, making it easy to maintain and context-efficient for AI." language="text" code={`my-app/\n├─ app/\n│  ├─ components/          # server components\n│  ├─ islands/             # *.island.tsx\n│  ├─ generated/           # typed client + OpenAPI\n│  ├─ routes/              # pages, APIs, layouts\n│  └─ styles/              # global CSS / CSS modules\n├─ specs/\n│  └─ feature-name/        # canonical spec + generated review artifacts\n├─ refs/\n│  └─ reference-name/      # CocoRef audit, approvals, and reference evidence\n├─ qa/\n│  └─ feature-name/        # CocoQA evidence, defects, and release approval\n├─ public/                  # static assets\n├─ cocoframe.config.ts      # application configuration\n└─ package.json`}>
          <p>All build output lives in <code>.cocoframe/</code>; development output is isolated in <code>.cocoframe/dev/</code>.</p>
        </GuideSection>

        <GuideSection id="configuration" label="CONFIG" title="Application configuration" description="Global configuration lives in one file and is validated by TypeScript." code={`import { defineConfig } from "@cocoframe/core";\nimport { requestId } from "@cocoframe/observability";\nimport { securityHeaders } from "@cocoframe/security";\n\nexport default defineConfig({\n  language: "en",\n  siteName: "My App",\n  siteUrl: "https://example.com",\n  allowedHosts: ["example.com", "www.example.com"],\n  openapi: { title: "My App API", version: "1.0.0" },\n  middleware: [requestId(), securityHeaders()],\n  health: { readiness: async () => true },\n});`}>
          <p>Primary options: <code>language</code>, <code>siteName</code>, <code>siteUrl</code>, <code>allowedHosts</code>, <code>stylesheets</code>, <code>openapi</code>, <code>middleware</code>, <code>health</code>, and runtime assets.</p>
          <p><code>allowedHosts</code> validates the host before production routing and middleware. Use explicit hostnames with ports when needed; wildcards are rejected. Development skips this check so local tooling continues to work.</p>
        </GuideSection>

        <GuideSection id="routing" label="ROUTING" title="Pages and file-based routing" description="Filenames determine URLs. Static routes take priority over dynamic parameters." code={pageExample}>
          <RouteTable />
          <p><code>load(context)</code> runs on the server. Its result is passed to <code>meta(data, context)</code> and <code>view(data, context)</code>. Request context provides <code>request</code>, <code>url</code>, <code>params</code>, <code>query</code>, and a typed context store.</p>
          <p>Use <code>[...path].page.tsx</code> for catch-all routes and declare <code>status: 404</code> so a custom not-found page still sends an accurate HTTP status and SEO metadata.</p>
        </GuideSection>

        <GuideSection id="layouts" label="LAYOUTS" title="Nested layouts" description="An _layout.tsx file wraps every page in its directory and descendants." code={`import { defineLayout } from "@cocoframe/core";\n\nexport default defineLayout(({ children, context }) => (\n  <>\n    <header><a href="/">My App</a></header>\n    <main data-path={context.url.pathname}>{children}</main>\n    <footer>Built with CocoFrame</footer>\n  </>\n));`}>
          <p>The root layout lives at <code>app/routes/_layout.tsx</code>. Add layouts in route subdirectories for automatic nesting.</p>
        </GuideSection>

        <GuideSection id="data-fetching" label="SERVER FIRST" title="Data loading, cache, and errors" description="Primary data loads before rendering. The cache policy generates the appropriate browser and edge headers." code={`export default definePage({\n  load: async ({ params }) => findPost(params.slug),\n  meta: (post) => ({ title: post.title, type: "article" }),\n  cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },\n  error: (error) => <main><h1>Unable to load post</h1></main>,\n  view: (post) => <article><h1>{post.title}</h1></article>,\n});`}>
          <p>Use <code>cache.private: true</code> for personal pages. For forms or sensitive data, use <code>browser: 0</code>.</p>
        </GuideSection>

        <GuideSection id="components" label="FRONTEND" title="Server components and styling" description="Components are typed TSX functions. By default, they send no JavaScript to the browser." code={`import type { CocoNode } from "@cocoframe/jsx";\nimport styles from "./feature-card.module.css";\n\nexport function FeatureCard(props: { title: string; children?: CocoNode }) {\n  return <article class={styles.card}>\n    <h2>{props.title}</h2>{props.children}\n  </article>;\n}`}>
          <p>Files named <code>*.module.css</code> are scoped and receive typed declarations. Global CSS inside <code>app/</code> is extracted automatically. The <code>@cocoframe/ui</code> package provides 97 typed primitives and patterns for layout, mobile shells, forms, data display, workflow navigation, accessibility, overlays, feedback, and AI/chat. Every preview, prop, and import example is available on the <a href="/components#catalog">Components</a>.</p>
        </GuideSection>

        <GuideSection id="charts" label="DATA VISUALIZATION" title="Typed server-first charts" description="Chart renders responsive SVG without browser dependencies and supports twelve visualization types." code={`import { Chart } from "@cocoframe/ui";

const months = ["Jan", "Feb", "Mar", "Apr"];
const datasets = [
  { label: "Requests", data: [24, 42, 35, 58], tone: "primary" },
  { label: "Conversions", data: [12, 18, 26, 31], tone: "blue" },
];

export function Analytics() {
  return <Chart
    type="line"
    label="Monthly traffic"
    description="Requests and conversions."
    labels={months}
    datasets={datasets}
    showLegend
  />;
}`}>
          <p>Available types: <code>line</code>, <code>area</code>, <code>bar</code>, <code>horizontal-bar</code>, <code>stacked-bar</code>, <code>pie</code>, <code>doughnut</code>, <code>polar-area</code>, <code>radar</code>, <code>scatter</code>, <code>bubble</code>, and <code>mixed</code>.</p>
          <p>Every chart includes a caption, labeled SVG, native tooltip, optional legend, empty state, and a hidden data table for screen readers. Explore every variant and prop in <a href="/components#chart">Chart Components</a>.</p>
        </GuideSection>

        <GuideSection id="icons" label="ICONOGRAPHY" title="Solar Linear icon library" description="1,246 icons are available as typed server components with no browser JavaScript or bundled stylesheet." code={`import HomeIcon from "@cocoframe/icons/linear/home";\nimport BellIcon from "@cocoframe/icons/linear/bell";\n\nexport function Navigation() {\n  return <nav>\n    <a href="/"><HomeIcon label="Home" size={24} /> Home</a>\n    <button aria-label="Notifications"><BellIcon /></button>\n  </nav>;\n}`}>
          <p>Import icons through direct subpaths so the build loads only the icons you use. Decorative icons automatically use <code>aria-hidden</code>; provide a <code>label</code> when an icon conveys meaning without accompanying text. Color follows <code>currentColor</code>, while size, stroke width, class, and mirroring are controlled through props.</p>
          <p>Solar Icons artwork was created by 480 Design and is licensed under CC BY 4.0. Preserve the attribution in <code>@cocoframe/icons/THIRD_PARTY_NOTICE.md</code> when distributing a product.</p>
        </GuideSection>

        <GuideSection id="islands" label="INTERACTIVITY" title="Interactive islands and signals" description="Use islands only where browser events or state are required." code={islandExample}>
          <p>Island files must live in <code>app/islands/*.island.tsx</code>, have a unique lowercase name, and use JSON-serializable props. Reactive bindings update text nodes directly; reading <code>signal.value</code> in a view rerenders the island.</p>
        </GuideSection>

        <GuideSection id="forms" label="FORMS" title="Server-validated forms" description="Forms work without JavaScript, preserve safe values, and rerender invalid submissions with status 422." code={formExample}>
          <p>Register <code>csrfProtection()</code> in configuration and include <code>CsrfField</code>. Passwords, tokens, passcodes, and secrets are never preserved after errors; mark other fields through <code>sensitiveFields</code>.</p>
        </GuideSection>

        <GuideSection id="validation" label="SCHEMA" title="Runtime validation" description="One schema provides type inference, runtime validation, contract documentation, and form/API input." code={`import { schema, type Infer } from "@cocoframe/schema";\n\nconst userSchema = schema.object({\n  name: schema.string({ min: 2, max: 80 }),\n  age: schema.number({ integer: true, min: 18, coerce: true }),\n  role: schema.enumeration(["admin", "member"]),\n  website: schema.optional(schema.string({ format: "url" })),\n});\n\ntype UserInput = Infer<typeof userSchema>;`}>
          <p>Available builders: string, number, boolean, literal, enumeration, union, array, record, date, object, optional, and transform. <code>ValidationError.issues</code> contains path, message, expected, and received.</p>
        </GuideSection>

        <GuideSection id="api-routes" label="API" title="Typed API routes" description="A *.route.ts file defines its method, input/output schemas, and handler in one contract." code={apiExample}>
          <p>Input supports <code>params</code>, <code>query</code>, and a JSON <code>body</code>. Invalid input returns HTTP 400; output is also validated to prevent malformed data.</p>
        </GuideSection>

        <GuideSection id="api" label="CLIENT" title="Generated client and OpenAPI" description="The generator reads API contracts and produces a Fetch client for web and mobile." code={`npm run generate\n# generates:\n# app/generated/cocoframe-client.ts\n# app/generated/openapi.json\n# app/**/*.module.d.css.ts\n\nimport { createCocoFrameClient } from "./generated/cocoframe-client.ts";\n\nconst api = createCocoFrameClient({\n  baseUrl: "https://api.example.com",\n  headers: { authorization: "Bearer token" },\n});\nconst result = await api.greetPerson({\n  params: { name: "Coco" },\n  query: { excited: true },\n});`}>
          <p>The client depends only on Fetch standards and accepts custom <code>fetch</code>, headers, and credentials for browsers and mobile runtimes.</p>
        </GuideSection>

        <GuideSection id="api-reference" label="REFERENCE" title="Public package API reference" description="Use the stable package roots below. Internal source and generated files from other packages are not public API.">
          <PackageReferenceTable />
          <p>Complete props for every UI primitive are available in <a href="/components#catalog">Component Reference</a>. Names and import instructions for every icon are available in <a href="/icons">Icon Explorer</a>. CocoQL grammar and safety details are available in <a href="/cocoql#language">CocoQL Reference</a>.</p>
        </GuideSection>

        <GuideSection id="middleware" label="MIDDLEWARE" title="Request context and middleware" description="Middleware runs in configuration order and shares request-scoped values through typed ContextKey instances." code={`import { createContextKey, defineMiddleware } from "@cocoframe/core";\n\nexport const userKey = createContextKey<{ id: string }>("user");\n\nexport const loadUser = defineMiddleware("app.load-user", async (context, next) => {\n  const user = await authenticate(context.request);\n  if (user) context.set(userKey, user);\n  return next();\n});`}>
          <p>Built-in middleware has stable IDs visible in <code>cocoframe inspect</code>. Never store request state in global variables.</p>
        </GuideSection>

        <GuideSection id="observability" label="OBSERVABILITY" title="Request IDs and structured logs" description="Observability middleware validates request IDs, forwards them to responses, and records timing without locking the application to a telemetry vendor." code={`import { requestId, requestLogger } from "@cocoframe/observability";

const middleware = [
  requestId({ headerName: "x-request-id", trustIncoming: false }),
  requestLogger({
    write: (event) => {
      // Forward JSON-safe events to your logger or telemetry exporter.
      console.log(JSON.stringify(event));
    },
  }),
];`}>
          <p>Log events contain only method, path, status, duration, and request ID. Never add cookies, authorization headers, CSRF tokens, request bodies, or secrets to the writer.</p>
        </GuideSection>

        <GuideSection id="security" label="SECURITY" title="Security defaults" description="The security package provides browser headers, CORS allowlists, double-submit CSRF, and in-memory rate limiting." code={`import { cors, csrfProtection, rateLimit, securityHeaders } from "@cocoframe/security";\n\nconst middleware = [\n  securityHeaders(),\n  cors({ origins: ["https://mobile.example"], credentials: true }),\n  csrfProtection({ match: ({ url }) => url.pathname.startsWith("/account") }),\n  rateLimit({ limit: 100, windowMs: 60_000, key: ({ request }) => verifiedUserId(request) }),\n];`}>
          <p>The built-in rate limiter is per process; use shared storage for distributed deployments. Proxy identity is trusted only when proxy addresses are configured explicitly.</p>
        </GuideSection>

        <GuideSection id="authentication" label="AUTH" title="Signed cookie sessions" description="The auth package handles session integrity and expiration, not OAuth, password hashing, or a complete identity system." code={`import { createContextKey } from "@cocoframe/core";\nimport { createSessionAuth, protectSession, sessionMiddleware, type Session } from "@cocoframe/auth";\n\nconst sessionKey = createContextKey<Session<{ userId: string }>>("session");\nconst auth = createSessionAuth<{ userId: string }>({\n  secret: process.env.SESSION_SECRET!, // minimum 32 bytes\n  cookieName: "app_session",\n  secure: true,\n});\n\nconst middleware = [\n  sessionMiddleware(auth, sessionKey),\n  protectSession(sessionKey, { match: ({ url }) => url.pathname.startsWith("/admin") }),\n];`}>
          <p><code>auth.commit(data)</code> produces a Set-Cookie header, <code>auth.read(request)</code> reads the session, and <code>auth.clear()</code> removes it.</p>
        </GuideSection>

        <GuideSection id="database" label="DATABASE" title="SQLite and PostgreSQL adapters" description="The database core provides acquisition, release, and transaction lifecycles without locking applications to an ORM." code={`import { openSqlite } from "@cocoframe/database-sqlite";\n\nconst database = openSqlite({ filename: "app.db" });\nconst users = await database.run((db) =>\n  db.all<{ id: number; name: string }>(\n    "SELECT id, name FROM users WHERE active = ?", [1],\n  ),\n);\n\nawait database.transaction(async (db) => {\n  await db.run("UPDATE users SET active = ? WHERE id = ?", [0, 42]);\n});`}>
          <p><code>@cocoframe/database-postgres</code> accepts a structurally compatible pool. Both adapters support parameterized queries, transactions, and ordered idempotent migrations.</p>
        </GuideSection>

        <GuideSection id="recipes" label="END TO END" title="Recipe: validated CRUD page" description="This example connects a schema, form action, database, status 422, and redirect 303 in one page convention." code={`import { definePage, redirect } from "@cocoframe/core";
import { openSqlite } from "@cocoframe/database-sqlite";
import { createForm, CsrfField } from "@cocoframe/forms";
import { schema } from "@cocoframe/schema";
import { Button, FormField, Input } from "@cocoframe/ui";

const database = openSqlite({ filename: "app.db" });
const taskForm = createForm(schema.object({
  title: schema.string({ min: 2, max: 120 }),
}));

export default definePage({
  load: () => database.run((db) =>
    db.all<{ id: number; title: string }>(
      "SELECT id, title FROM tasks ORDER BY id DESC",
    ),
  ),
  action: taskForm.action(async ({ title }) => {
    await database.run((db) =>
      db.run("INSERT INTO tasks (title) VALUES (?)", [title]),
    );
    return redirect("/tasks", 303);
  }),
  view: (tasks, context) => {
    const state = taskForm.state(context);
    const title = taskForm.field("title", state);
    return <main>
      <form method="post">
        <CsrfField context={context} />
        <FormField label="Task" htmlFor={title.id} error={state.errors.title?.[0]}>
          <Input {...title} required />
        </FormField>
        <Button type="submit">Add task</Button>
      </form>
      <ul>{tasks.map((task) => <li>{task.title}</li>)}</ul>
    </main>;
  },
});`}>
          <p>Install <code>csrfProtection()</code> for cookie-authenticated routes. Create an immutable migration for the <code>tasks</code> table, keep authorization separate from session verification, and never store request-scoped database handles in mutable global state.</p>
          <p>For mobile, expose the same operation with <code>defineApi</code>, run <code>npm run generate</code>, and use the generated Fetch client. Mobile UI does not depend on the CocoFrame renderer.</p>
        </GuideSection>

        <GuideSection id="cocoql" label="AI DATABASE" title="CocoQL and Query Plan" description="CocoQL turns a small read-only language into a validated Query Plan before a dialect compiler produces parameterized SQL." language="typescript" code={`import {
  authorizeCocoQL,
  CocoQLError,
  compileCocoQLToMySql,
  defineCocoQLPermissions,
  formatCocoQLPlan,
  parseCocoQL,
  planCocoQL,
} from "@cocoframe/cocoql";

const analyst = defineCocoQLPermissions({
  version: "0.1",
  entities: {
    orders: { fields: ["id", "status", "total", "customer_id"], relations: ["customer"], aggregates: ["count", "sum"] },
    customers: { fields: ["id", "name"] },
  },
});

const source = \`from orders
with customer
filter created_at in this_month
filter status = paid
group customer.name
select customer.name,sum(total) as revenue,count(id) as order_count
sort revenue desc
take 20\`;

try {
  const query = parseCocoQL(source);
  authorizeCocoQL(query, commerceSchema, analyst);
  const plan = planCocoQL(query, commerceSchema);
  console.log(formatCocoQLPlan(plan));
  const result = compileCocoQLToMySql(plan, commerceSchema);
} catch (error) {
  if (error instanceof CocoQLError) console.log(JSON.stringify(error));
}`}>
          <p>Query Plan 0.1 is database-independent: it contains only public entities and fields, relation paths, structured filters, sorting, and limits. Table names, physical columns, and join conditions remain in the trusted schema and are used only by dialect compilers.</p>
          <p>Use <code>with customer</code> before accessing <code>customer.name</code>. Nested paths such as <code>with projects.invoices</code> are planned parent-first. CocoQL never guesses relations from entity names.</p>
          <p>Fields of type <code>date</code> and <code>datetime</code> accept semantic ranges such as <code>today</code>, <code>this_month</code>, and <code>last 7 days</code>. The planner converts them into half-open UTC ranges; use <code>{`{ now }`}</code> for deterministic testing and replay.</p>
          <p>Grouped reads use <code>group customer.name</code> and aliased expressions such as <code>sum(total) as revenue</code>. Every selected non-aggregate field must be grouped; <code>sort revenue desc</code> then refers explicitly to the aggregate alias.</p>
          <p>Every failure uses the <code>CocoQLIssue 0.1</code> envelope. Use <code>error</code> for branching, <code>stage</code> to identify the pipeline phase, and <code>location</code> and <code>path</code> to correct the exact clause. <code>JSON.stringify(error)</code> omits the stack trace.</p>
          <p><code>authorizeCocoQL</code> and <code>authorizeCocoQLMutation</code> apply default-deny policies after semantic validation and before planning. Read fields, relations, aggregates, <code>create</code>/<code>update</code> fields, and <code>delete</code> permission must be explicit.</p>
          <p><code>defineCocoQLSafetyPolicy</code> limits reads and mutations deterministically. Use <code>previewCocoQLMutation</code> to inspect intent without SQL; updates and deletes require filters, and executable writes require <code>confirm affected &lt;= N</code>.</p>
          <p><code>compileCocoQLMutation</code> produces parameterized SQL with <code>verifyBeforeCommit</code>. The compiler never executes the database; adapters must check affected rows in the same transaction and roll back when the confirmation limit is exceeded.</p>
          <p>Use <code>compileCocoQLPostgres</code> and <code>compileCocoQLMutationPostgres</code> for PostgreSQL. Both consume the same plan, use <code>$1</code>, <code>$2</code>, and subsequent placeholders, and validate forged plans before producing SQL.</p>
          <p>Use <code>compileCocoQL(source, schema)</code> as a complete pipeline shortcut. The compiler still validates plans created outside <code>planCocoQL</code>; forged operators, cross-entity references, malformed date ranges, and schema-incompatible joins fail with <code>INVALID_PLAN</code>. Plan validation does not replace application authorization.</p>
          <p>See examples in <a href="/cocoql#permissions">Permissions</a>, <a href="/cocoql#safety">Safety Policy</a>, <a href="/cocoql#mutation-preview">Mutation Preview</a>, <a href="/cocoql#mutations">Guarded Mutations</a>, <a href="/cocoql#postgresql">PostgreSQL</a>, and <a href="/cocoql#query-plan">Query Plan</a>.</p>
        </GuideSection>

        <GuideSection id="performance" label="SSR" title="Streaming, defer, SEO, and caching" description="Primary HTML is always server-rendered. Non-critical content can resolve later without inline executable scripts." code={`import { defer } from "@cocoframe/core";\n\nconst Recommendations = () => defer(\n  loadRecommendations(),\n  <p>Loading recommendations...</p>,\n);\n\nexport default definePage({\n  meta: { title: "Product", description: "Product detail" },\n  cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },\n  view: () => <main><h1>Product</h1><Recommendations /></main>,\n});`}>
          <p>Never place titles, primary copy, structured data, or important SEO content inside <code>defer</code>. Only static pages enter <code>/sitemap.xml</code> automatically; API, action, and system routes are excluded. <code>/robots.txt</code> points to the sitemap.</p>
        </GuideSection>

        <GuideSection id="testing" label="QUALITY" title="Testing and inspection" description="Use the compiler, Node test runner, inspection, production build, and browser E2E as quality gates." language="bash" code={`npm run check\nnpm test\nnpm run inspect\nnpm run build\n\n# install browsers once, then run all E2E tests\nnpx playwright install chromium firefox webkit\nnpm run test:e2e\n\n# Chromium only for faster local iteration\nnpm run test:e2e:chromium\n\n# benchmark renderer operations / local HTTP\nnpm run benchmark\nnpm run benchmark:http\nnpm run benchmark:http:concurrent`}>
          <p>Application tests can call <code>app.fetch(new Request(url))</code> directly without opening a port. The E2E suite starts separate development and production servers, then tests islands, the development error overlay, CSP, forms, streaming, 404 pages, live search, sorting, keyboard dialogs, and browser consoles in Chromium, Firefox, and WebKit.</p>
          <p>Responsive projects visit critical pages at 320px, 390px phones, tablets, laptops, and 4K. Checks cover horizontal overflow, keyboard focus, mobile menus, image assets, and aspect ratios.</p>
        </GuideSection>
        <GuideSection id="deployment" label="PRODUCTION" title="Build and deployment" description="Production builds produce a server bundle, public assets, an asset manifest, and deployment metadata." language="bash" code={`npm run build\nnpm start\n\n# primary output\n.cocoframe/server.mjs\n.cocoframe/public/\n.cocoframe/assets.json\n.cocoframe/deploy.json`}>
          <DeploymentTargetTable />
          <p>The Node server supports body limits, request timeouts, trusted proxies, liveness/readiness probes, and graceful shutdown. For Fetch or edge platforms, use <code>webHandler(app)</code> from <code>@cocoframe/server-web</code>.</p>
        </GuideSection>

        <GuideSection id="environment" label="RUNTIME" title="Environment variables and health" description="The Node runtime reads the following explicit environment variables." >
          <EnvironmentTable />
          <p>Health endpoints are available at <code>/_health/live</code> and <code>/_health/ready</code>. Readiness can check databases or dependencies through configuration.</p>
        </GuideSection>

        <GuideSection id="cli" label="REFERENCE" title="CLI reference" description="The CLI accepts a project directory as its final argument and defaults to the current directory." language="bash" code={`cocoframe inspect [project]   # route, island, UI, API, middleware manifest\ncocoframe dev [project]       # development server + watcher\ncocoframe build [project]     # production bundle\ncocoframe start [project]     # run the production bundle\ncocoframe generate [project]  # client, OpenAPI, CSS declarations\ncocoframe openapi [project]   # OpenAPI only\ncocoframe spec create <feature> --brief "..."\ncocoframe spec resume <feature>\ncocoframe spec check|generate|approve <feature>\ncocoframe ref create|audit|preview|approve <reference>\ncocoframe qa create|run|check|approve <feature>`}>
          <p>The same commands are available in this repository through npm scripts: <code>npm run inspect</code>, <code>npm run dev</code>, <code>npm run build</code>, and <code>npm run generate</code>.</p>
        </GuideSection>

        <GuideSection id="troubleshooting" label="SUPPORT" title="Troubleshooting checklist" description="Start with these deterministic checks before changing configuration or adding dependencies." language="bash" code={`npm run check
npm test
npm run inspect
npm run generate
npm run build`}>
          <ul class="guide-checklist">
            <li><strong>Route not found:</strong> check route patterns and order with <code>npm run inspect</code>; ensure the file suffix is <code>.page.tsx</code> or <code>.route.ts</code>.</li>
            <li><strong>Island inactive:</strong> ensure the file is in <code>app/islands</code>, its lowercase <code>defineIsland</code> name matches the filename, and props are JSON-serializable.</li>
            <li><strong>Generated client changed:</strong> run <code>npm run generate</code>; never edit the client, OpenAPI, or CSS declarations manually.</li>
            <li><strong>Form always returns 403:</strong> pair <code>CsrfField</code> with CSRF middleware and never cache personal form pages publicly.</li>
            <li><strong>Readiness failed:</strong> inspect dependencies in server logs. The readiness endpoint returns availability only and intentionally hides internal errors.</li>
            <li><strong>Asset missing after build:</strong> use the URL from the asset manifest; production filenames use content hashes.</li>
          </ul>
          <p>If the issue persists, provide the Node version, <code>npm run inspect</code> output, minimal reproduction steps, and a sanitized error through the <a href="/contact">contact page</a>.</p>
        </GuideSection>

        <GuideSection id="versioning" label="RELEASES" title="Versioning and upgrade policy" description="The current framework release is version 0.0.4 and remains an architectural MVP progressing toward a stable API.">
          <ul class="guide-checklist">
            <li>Stable public APIs are always exported from <code>@cocoframe/*</code> package roots.</li>
            <li>Regenerate clients, OpenAPI, manifests, and CSS declarations after upgrades.</li>
            <li>Applied database migrations are immutable; new changes use the next migration ID.</li>
            <li>Before upgrading, run check, test, inspect, and build, then save the output as a baseline.</li>
            <li>Breaking changes before 1.0 must include migration steps and before/after examples.</li>
          </ul>
          <p><code>create-cocoframe@0.0.5</code> and the coordinated runtime package set are publicly available on npm. Internal package dependencies are pinned to the versions released together.</p>
        </GuideSection>

        <GuideSection id="roadmap" label="ROADMAP" title="Current roadmap" description="These priorities keep the framework small while addressing remaining production needs.">
          <RoadmapTable />
        </GuideSection>

        <GuideSection id="contributing" label="CONTRIBUTING" title="Contribution workflow" description="Framework changes must be small, typed, covered by focused tests, and must not expand the browser runtime without a genuine need." language="bash" code={`npm install
npm run check
npm test
npm run inspect
npm run build

# benchmark when changes affect performance
npm run benchmark
npm run benchmark:http`}>
          <p>Read <code>docs/architecture.md</code> before changing behavior. Use Web Standard <code>Request</code>/<code>Response</code> at boundaries, default to server rendering, and use islands only for browser interaction.</p>
          <p>API contract changes require <code>npm run generate</code>. Never edit generated output, existing migrations, or scoped CSS names manually.</p>
        </GuideSection>

        <GuideSection id="conventions" label="AI-FRIENDLY" title="Conventions and maintenance" description="Choose one location for each concern so changes remain local and AI context stays small.">
          <ul class="guide-checklist"><li>One page or API contract per route file.</li><li>Static components belong in <code>components/</code>; browser state belongs only in <code>islands/</code>.</li><li>Schemas are the source of truth for forms and APIs.</li><li>Use ContextKey for request state; never use mutable global state.</li><li>Generated files are never edited manually.</li><li>Run check, test, and build before merging.</li></ul>
        </GuideSection>
      </article>
    </div>
  </main>,
});

function GuideSection({ id, label, title, description, code, language = "tsx", children }: GuideSectionProps) {
  return <section class="guide-section" id={id}><header><span class="eyebrow">{label}</span><h2>{title}</h2><p>{description}</p></header>{code ? <SyntaxHighlighter class="guide-code" code={code} language={language} label={`${title} code example`} /> : null}<div class="guide-body">{children}</div><a class="guide-top" href="#top">Back to top <span aria-hidden="true"><ArrowUpIcon size={14} /></span></a></section>;
}

function RouteTable() {
  return <div class="guide-table" role="table" aria-label="Routing file conventions"><div role="row"><strong role="columnheader">File</strong><strong role="columnheader">URL</strong></div><div role="row"><code>index.page.tsx</code><code>/</code></div><div role="row"><code>about.page.tsx</code><code>/about</code></div><div role="row"><code>blog/[slug].page.tsx</code><code>/blog/:slug</code></div><div role="row"><code>docs/[...rest].page.tsx</code><code>/docs/*rest</code></div><div role="row"><code>api/users.route.ts</code><code>/api/users</code></div></div>;
}

function EnvironmentTable() {
  return <div class="guide-table env-table" role="table" aria-label="Environment variables"><div role="row"><strong role="columnheader">Variable</strong><strong role="columnheader">Default</strong></div><div role="row"><code>COCOFRAME_MAX_BODY_BYTES</code><code>1048576</code></div><div role="row"><code>COCOFRAME_REQUEST_TIMEOUT_MS</code><code>30000</code></div><div role="row"><code>COCOFRAME_TRUSTED_PROXIES</code><span>empty</span></div><div role="row"><code>COCOFRAME_SHUTDOWN_DELAY_MS</code><code>0</code></div><div role="row"><code>COCOFRAME_SHUTDOWN_TIMEOUT_MS</code><code>10000</code></div><div role="row"><code>PORT</code><code>3000</code></div><div role="row"><code>HOST</code><code>0.0.0.0 (start)</code></div></div>;
}

function PackageReferenceTable() {
  const packages = [
    ["@cocoframe/core", "Application lifecycle", "definePage, defineApi, defineLayout, defineConfig, defineMiddleware, createContextKey, json, redirect, defer"],
    ["@cocoframe/jsx", "Typed TSX runtime", "jsx, Fragment, raw, defer, renderToString, renderToChunks"],
    ["@cocoframe/router", "Low-level routing", "Router, normalizePath, HttpMethod"],
    ["@cocoframe/client", "Opt-in browser runtime", "defineIsland, signal, computed, bind, mountReactive"],
    ["@cocoframe/ui", "Server-first design system", "97 semantic primitives, Chart, SyntaxHighlighter, styles.css, utilities.css"],
    ["@cocoframe/icons", "Solar Linear icon set", "1.246 typed icon subpaths, solarLinearIconNames"],
    ["@cocoframe/schema", "Runtime validation", "schema, ValidationError, Infer"],
    ["@cocoframe/forms", "Progressive forms", "createForm, CsrfField, FormState"],
    ["@cocoframe/auth", "Signed cookie sessions", "createSessionAuth, sessionMiddleware, protectSession"],
    ["@cocoframe/database", "Adapter contract", "defineDatabaseAdapter, createDatabase"],
    ["@cocoframe/database-sqlite", "SQLite adapter", "openSqlite, createSqliteAdapter, SqliteMigration"],
    ["@cocoframe/database-postgres", "PostgreSQL adapter", "openPostgres, createPostgresAdapter, PostgresMigration"],
    ["@cocoframe/security", "HTTP security middleware", "securityHeaders, cors, csrfProtection, rateLimit"],
    ["@cocoframe/observability", "Request telemetry", "requestId, requestLogger, requestIdKey"],
    ["@cocoframe/cocoql", "AI-first query language", "parse, validate, authorize, plan, safety, MySQL/PostgreSQL compilers"],
    ["@cocoframe/specs", "AI product discovery", "create, answer, check, approve, adaptive questions, PRD and Mermaid artifacts"],
    ["@cocoframe/cocoref", "Reference component approval", "create, audit, consent, preview, feedback, approve, deterministic reports"],
    ["@cocoframe/qa", "AI quality approval", "create, answer, run gates, record evidence, defects, check, approve"],
    ["@cocoframe/server-node", "Node HTTP adapter", "createServer, gracefulShutdown, clientAddress"],
    ["@cocoframe/server-web", "Fetch/edge adapter", "webHandler"],
    ["@cocoframe/cli", "Project tooling", "dev, build, start, inspect, generate, openapi, spec, ref, qa"],
    ["create-cocoframe", "Project scaffolding", "starter template, package-manager selection, safe directory checks, skip-install"],
  ] as const;
  return <div class="guide-table guide-table--packages" role="table" aria-label="Public CocoFrame packages"><div role="row"><strong role="columnheader">Package</strong><strong role="columnheader">Responsibility</strong><strong role="columnheader">Primary API</strong></div>{packages.map(([name, responsibility, api]) => <div role="row"><code>{name}</code><span>{responsibility}</span><code>{api}</code></div>)}</div>;
}

function DeploymentTargetTable() {
  return <div class="guide-table guide-table--three" role="table" aria-label="Deployment targets"><div role="row"><strong role="columnheader">Target</strong><strong role="columnheader">Entry</strong><strong role="columnheader">Notes</strong></div><div role="row"><strong>Node server</strong><code>.cocoframe/server.mjs</code><span>Body limits, timeouts, trusted proxies, health, and graceful shutdown.</span></div><div role="row"><strong>Fetch / edge</strong><code>webHandler(app)</code><span>Use Web Standard Request and Response; verify platform streaming support.</span></div><div role="row"><strong>Container</strong><code>npm start</code><span>Expose PORT, install health probes, and send shutdown signals to the process.</span></div></div>;
}

function RoadmapTable() {
  const items = [
    ["Package publishing", "Available", "19 public packages use staged builds, exact dependency pins, tarball validation, and template smoke tests."],
    ["Distributed rate limiting", "Planned", "A storage interface for multi-instance deployments."],
    ["Telemetry exporters", "Planned", "A vendor-neutral adapter over structured request events."],
    ["CSP nonce & integrity helpers", "Planned", "Security enhancements without exposing bundler internals."],
    ["Compression", "Planned", "Streaming-safe response compression in runtime adapters."],
    ["Deployment adapters", "Planned", "Additional targets based on Fetch standards and the deployment manifest."],
  ] as const;
  return <div class="guide-table guide-table--roadmap" role="table" aria-label="CocoFrame roadmap"><div role="row"><strong role="columnheader">Capability</strong><strong role="columnheader">Status</strong><strong role="columnheader">Scope</strong></div>{items.map(([capability, status, scope]) => <div role="row"><strong>{capability}</strong><span class="guide-status">{status}</span><span>{scope}</span></div>)}</div>;
}
