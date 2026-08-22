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
    description: "Artikel " + slug,
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
        Diklik {bind(count)} kali
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
    description: "Panduan lengkap penggunaan CocoFrame: pages, routing, components, islands, forms, API, database, security, testing, dan deployment.",
    canonical: "https://cocoframe.dev/docs",
    image: "/assets/cocoframe-hero-isometric.png",
    type: "article",
    jsonLd: { "@context": "https://schema.org", "@type": "TechArticle", headline: "CocoFrame Documentation", inLanguage: "id" },
  },
  view: () => <main id="top" class="docs-layout">
    <DocsSidebar kind="documentation" />
    <div class="docs-content">
      <section class="docs-hero" id="introduction">
        <div class="docs-hero-copy reveal"><span class="eyebrow">DOCUMENTATION</span><h1>Build smarter with<br /><span>CocoFrame</span></h1><p>Panduan penggunaan API CocoFrame yang tersedia pada versi MVP saat ini—dari halaman pertama sampai production runtime.</p></div>
        <div class="docs-hero-art reveal"><div class="hero-art-glow"></div><img src="/assets/cocoframe-hero-isometric.png" alt="Ilustrasi isometrik CocoFrame" width="768" height="512" /></div>
      </section>

      <section class="docs-panel quick-start" id="quick-start">
        <div class="panel-heading"><div><h2>Quick Start</h2><p>Buat aplikasi CocoFrame dari npm dan jalankan dengan Node.js 24 atau lebih baru.</p></div><a href="#project-structure">Pelajari strukturnya <span aria-hidden="true"><ArrowRightIcon size={15} /></span></a></div>
        <div class="quick-steps"><article><span>1</span><div><h3>Create project</h3><p>Jalankan creator resmi dari registry npm.</p></div><b aria-hidden="true"><ArrowRightIcon size={16} /></b></article><article><span>2</span><div><h3>Install otomatis</h3><p>Creator memasang dependency publik yang dibutuhkan.</p></div><b aria-hidden="true"><ArrowRightIcon size={16} /></b></article><article><span>3</span><div><h3>Start development</h3><p>Masuk ke directory project dan jalankan development server.</p></div><b aria-hidden="true"><ArrowRightIcon size={16} /></b></article><article><span>4</span><div><h3>Open the app</h3><p>Buka <code>http://127.0.0.1:3000</code>.</p></div></article></div>
        <PackageCommand />
        <p class="guide-note"><strong>Project creator sudah tersedia di npm:</strong> <a href="#project-creator"><code>npm create cocoframe@latest my-app</code></a> memasang runtime publik dan menghasilkan starter server-first yang siap dikembangkan.</p>
      </section>

      <section class="docs-panel docs-explore" id="guides"><div class="panel-heading"><div><h2>Explore the Docs</h2><p>Cari area framework yang ingin Anda gunakan.</p></div></div><DocsSearch /></section>

      <article class="docs-guide" aria-label="Panduan lengkap CocoFrame">
        <GuideSection id="installation" label="GET STARTED" title="Installation from npm" description="Buat project dari package resmi dengan Node.js 24+, lalu jalankan development server pada port 3000." language="bash" code={`npm create cocoframe@latest my-app\ncd my-app\nnpm run dev`}>
          <p>Creator memasang dependency secara otomatis. Setelah server siap, buka <code>http://127.0.0.1:3000</code>; perubahan file aplikasi dipantau selama development.</p>
          <p>Sebelum deployment, jalankan <code>npm run check</code>, <code>npm run inspect</code>, dan <code>npm run build</code>. Gunakan <code>npm start</code> untuk menjalankan bundle production setelah build.</p>
          <p>Untuk penggunaan package internal, import selalu melalui namespace <code>@cocoframe/*</code>. Jangan mengimpor file source package lain dengan path relatif dari aplikasi.</p>
        </GuideSection>

        <GuideSection id="project-creator" label="GET STARTED" title="Project creator" description="Creator dependency-free menghasilkan empat template resmi yang server-first, responsif, dan memakai UI serta icons CocoFrame." language="bash" code={`# Starter (default)\nnpm create cocoframe@latest my-app\n\n# Pilih template resmi\nnpm create cocoframe@latest my-dashboard -- --template dashboard\ncd my-dashboard\nnpm run dev`}>
          <p>Perintah publik mengambil <code>create-cocoframe</code> dan seluruh package <code>@cocoframe/*</code> dari registry npm. Gunakan clone GitHub hanya ketika berkontribusi pada source framework.</p>
          <ul>
            <li>Gunakan <code>--template starter|marketing|dashboard|documentation</code> untuk memilih fondasi aplikasi. Semuanya memakai <code>@cocoframe/ui</code> dan <code>@cocoframe/icons</code>.</li>
            <li>Gunakan <code>--package-manager npm|pnpm|yarn|bun</code> untuk memilih package manager.</li>
            <li>Gunakan <code>--skip-install</code> untuk CI atau workflow AI yang ingin memeriksa file sebelum memasang dependency.</li>
            <li>Creator menolak filesystem root dan directory yang sudah berisi file agar data project lama tidak tertimpa.</li>
          </ul>
          <p><code>npm create cocoframe@latest my-app</code> adalah jalur instalasi resmi dan sudah diverifikasi melalui type-check, inspect, production build, SSR, dan typed API.</p>
        </GuideSection>

        <GuideSection id="project-structure" label="CONVENTION" title="Project structure" description="Struktur sengaja dibuat predictable agar mudah dipelihara dan hemat konteks untuk AI." language="text" code={`my-app/\n├─ app/\n│  ├─ components/          # server components\n│  ├─ islands/             # *.island.tsx\n│  ├─ generated/           # typed client + OpenAPI\n│  ├─ routes/              # pages, APIs, layouts\n│  └─ styles/              # global CSS / CSS modules\n├─ public/                  # aset statis\n├─ cocoframe.config.ts      # konfigurasi aplikasi\n└─ package.json`}>
          <p>Semua output build berada di <code>.cocoframe/</code>; output development terpisah di <code>.cocoframe/dev/</code>.</p>
        </GuideSection>

        <GuideSection id="configuration" label="CONFIG" title="Application configuration" description="Konfigurasi global berada di satu file dan divalidasi oleh TypeScript." code={`import { defineConfig } from "@cocoframe/core";\nimport { requestId } from "@cocoframe/observability";\nimport { securityHeaders } from "@cocoframe/security";\n\nexport default defineConfig({\n  language: "id",\n  siteName: "My App",\n  siteUrl: "https://example.com",\n  openapi: { title: "My App API", version: "1.0.0" },\n  middleware: [requestId(), securityHeaders()],\n  health: { readiness: async () => true },\n});`}>
          <p>Opsi utama: <code>language</code>, <code>siteName</code>, <code>siteUrl</code>, <code>stylesheets</code>, <code>openapi</code>, <code>middleware</code>, <code>health</code>, dan asset runtime.</p>
        </GuideSection>

        <GuideSection id="routing" label="ROUTING" title="Pages and file-based routing" description="Nama file menentukan URL. Route statis diprioritaskan sebelum parameter dinamis." code={pageExample}>
          <RouteTable />
          <p><code>load(context)</code> berjalan di server. Hasilnya diteruskan ke <code>meta(data, context)</code> dan <code>view(data, context)</code>. Request context menyediakan <code>request</code>, <code>url</code>, <code>params</code>, <code>query</code>, serta context store typed.</p>
          <p>Gunakan <code>[...path].page.tsx</code> untuk catch-all route dan deklarasikan <code>status: 404</code> agar halaman not-found kustom tetap mengirim status HTTP serta metadata SEO yang akurat.</p>
        </GuideSection>

        <GuideSection id="layouts" label="LAYOUTS" title="Nested layouts" description="File _layout.tsx membungkus semua page pada directory yang sama dan turunannya." code={`import { defineLayout } from "@cocoframe/core";\n\nexport default defineLayout(({ children, context }) => (\n  <>\n    <header><a href="/">My App</a></header>\n    <main data-path={context.url.pathname}>{children}</main>\n    <footer>Built with CocoFrame</footer>\n  </>\n));`}>
          <p>Layout root berada di <code>app/routes/_layout.tsx</code>. Tambahkan layout lain di subdirectory route untuk nesting otomatis.</p>
        </GuideSection>

        <GuideSection id="data-fetching" label="SERVER FIRST" title="Data loading, cache, and errors" description="Data utama dimuat sebelum render. Cache policy menghasilkan header browser dan edge yang sesuai." code={`export default definePage({\n  load: async ({ params }) => findPost(params.slug),\n  meta: (post) => ({ title: post.title, type: "article" }),\n  cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },\n  error: (error) => <main><h1>Unable to load post</h1></main>,\n  view: (post) => <article><h1>{post.title}</h1></article>,\n});`}>
          <p>Gunakan <code>cache.private: true</code> untuk halaman personal. Untuk form atau data sensitif, gunakan <code>browser: 0</code>.</p>
        </GuideSection>

        <GuideSection id="components" label="FRONTEND" title="Server components and styling" description="Komponen adalah fungsi TSX typed. Secara default komponen tidak mengirim JavaScript ke browser." code={`import type { CocoNode } from "@cocoframe/jsx";\nimport styles from "./feature-card.module.css";\n\nexport function FeatureCard(props: { title: string; children?: CocoNode }) {\n  return <article class={styles.card}>\n    <h2>{props.title}</h2>{props.children}\n  </article>;\n}`}>
          <p>File <code>*.module.css</code> di-scope dan dibuatkan declaration typed. CSS global di dalam <code>app/</code> diekstrak otomatis. Package <code>@cocoframe/ui</code> menyediakan 80 primitive dan pattern typed untuk layout, form, data display, navigation, overlay, feedback, hingga AI/chat. Seluruh preview, props, dan contoh import tersedia di halaman <a href="/components#catalog">Components</a>.</p>
        </GuideSection>

        <GuideSection id="charts" label="DATA VISUALIZATION" title="Typed server-first charts" description="Chart merender SVG responsif tanpa dependency browser dan mendukung dua belas tipe visualisasi." code={`import { Chart } from "@cocoframe/ui";

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
          <p>Tipe yang tersedia: <code>line</code>, <code>area</code>, <code>bar</code>, <code>horizontal-bar</code>, <code>stacked-bar</code>, <code>pie</code>, <code>doughnut</code>, <code>polar-area</code>, <code>radar</code>, <code>scatter</code>, <code>bubble</code>, dan <code>mixed</code>.</p>
          <p>Setiap chart mempunyai caption, SVG berlabel, tooltip native, legend opsional, empty state, serta tabel data tersembunyi untuk pembaca layar. Lihat seluruh varian dan props di <a href="/components#chart">Chart Components</a>.</p>
        </GuideSection>

        <GuideSection id="icons" label="ICONOGRAPHY" title="Solar Linear icon library" description="Sebanyak 1.246 ikon tersedia sebagai server component typed, tanpa JavaScript browser dan tanpa stylesheet bawaan." code={`import HomeIcon from "@cocoframe/icons/linear/home";\nimport BellIcon from "@cocoframe/icons/linear/bell";\n\nexport function Navigation() {\n  return <nav>\n    <a href="/"><HomeIcon label="Home" size={24} /> Home</a>\n    <button aria-label="Notifications"><BellIcon /></button>\n  </nav>;\n}`}>
          <p>Impor ikon melalui subpath langsung agar build hanya memuat ikon yang dipakai. Ikon dekoratif otomatis memakai <code>aria-hidden</code>; berikan <code>label</code> ketika ikon menyampaikan makna tanpa teks pendamping. Warna mengikuti <code>currentColor</code>, sedangkan ukuran, ketebalan garis, class, dan arah cermin dapat diatur melalui props.</p>
          <p>Artwork Solar Icons dibuat oleh 480 Design dan dilisensikan di bawah CC BY 4.0. Pertahankan atribusi yang tersedia dalam <code>@cocoframe/icons/THIRD_PARTY_NOTICE.md</code> saat mendistribusikan produk.</p>
        </GuideSection>

        <GuideSection id="islands" label="INTERACTIVITY" title="Interactive islands and signals" description="Gunakan island hanya pada bagian yang membutuhkan event atau state browser." code={islandExample}>
          <p>File island harus berada di <code>app/islands/*.island.tsx</code>, mempunyai nama unik lowercase, dan props-nya harus JSON-serializable. <code>bind(signal)</code> memperbarui text node secara langsung; membaca <code>signal.value</code> di view akan merender ulang island.</p>
        </GuideSection>

        <GuideSection id="forms" label="FORMS" title="Server-validated forms" description="Form tetap berfungsi tanpa JavaScript, mempertahankan nilai aman, dan merender ulang dengan status 422 saat invalid." code={formExample}>
          <p>Daftarkan <code>csrfProtection()</code> pada config dan sertakan <code>CsrfField</code>. Password, token, passcode, dan secret tidak pernah dipertahankan setelah error; field lain dapat ditandai lewat <code>sensitiveFields</code>.</p>
        </GuideSection>

        <GuideSection id="validation" label="SCHEMA" title="Runtime validation" description="Satu schema memberi type inference, validasi runtime, dokumentasi kontrak, dan input form/API." code={`import { schema, type Infer } from "@cocoframe/schema";\n\nconst userSchema = schema.object({\n  name: schema.string({ min: 2, max: 80 }),\n  age: schema.number({ integer: true, min: 18, coerce: true }),\n  role: schema.enumeration(["admin", "member"]),\n  website: schema.optional(schema.string({ format: "url" })),\n});\n\ntype UserInput = Infer<typeof userSchema>;`}>
          <p>Tersedia: string, number, boolean, literal, enumeration, union, array, record, date, object, optional, dan transform. <code>ValidationError.issues</code> berisi path, message, expected, dan received.</p>
        </GuideSection>

        <GuideSection id="api-routes" label="API" title="Typed API routes" description="File *.route.ts mendefinisikan method, schema input/output, dan handler dalam satu kontrak." code={apiExample}>
          <p>Input mendukung <code>params</code>, <code>query</code>, dan JSON <code>body</code>. Validasi gagal menghasilkan HTTP 400; output schema juga divalidasi agar server tidak mengirim bentuk data yang salah.</p>
        </GuideSection>

        <GuideSection id="api" label="CLIENT" title="Generated client and OpenAPI" description="Generator membaca kontrak API dan menghasilkan Fetch client yang dapat dipakai web maupun mobile." code={`npm run generate\n# menghasilkan:\n# app/generated/cocoframe-client.ts\n# app/generated/openapi.json\n# app/**/*.module.d.css.ts\n\nimport { createCocoFrameClient } from "./generated/cocoframe-client.ts";\n\nconst api = createCocoFrameClient({\n  baseUrl: "https://api.example.com",\n  headers: { authorization: "Bearer token" },\n});\nconst result = await api.greetPerson({\n  params: { name: "Coco" },\n  query: { excited: true },\n});`}>
          <p>Client hanya bergantung pada Fetch standards dan menerima custom <code>fetch</code>, headers, serta credentials—cocok untuk browser, React Native, Capacitor, atau runtime mobile lain.</p>
        </GuideSection>

        <GuideSection id="api-reference" label="REFERENCE" title="Public package API reference" description="Gunakan package root yang stabil berikut. Import internal source atau generated file package lain bukan bagian dari public API.">
          <PackageReferenceTable />
          <p>Props lengkap setiap primitive UI tersedia di <a href="/components#catalog">Component Reference</a>. Nama dan cara import seluruh ikon tersedia di <a href="/icons">Icon Explorer</a>. Detail grammar serta safety CocoQL tersedia di <a href="/cocoql#language">CocoQL Reference</a>.</p>
        </GuideSection>

        <GuideSection id="middleware" label="MIDDLEWARE" title="Request context and middleware" description="Middleware berjalan sesuai urutan config dan dapat berbagi nilai request-scoped melalui ContextKey typed." code={`import { createContextKey, defineMiddleware } from "@cocoframe/core";\n\nexport const userKey = createContextKey<{ id: string }>("user");\n\nexport const loadUser = defineMiddleware("app.load-user", async (context, next) => {\n  const user = await authenticate(context.request);\n  if (user) context.set(userKey, user);\n  return next();\n});`}>
          <p>Middleware bawaan mempunyai ID stabil dan terlihat pada <code>cocoframe inspect</code>. Jangan menyimpan state request pada global variable.</p>
        </GuideSection>

        <GuideSection id="observability" label="OBSERVABILITY" title="Request IDs and structured logs" description="Observability middleware memvalidasi request ID, meneruskannya ke response, dan mencatat timing tanpa mengunci aplikasi ke vendor telemetry." code={`import { requestId, requestLogger } from "@cocoframe/observability";

const middleware = [
  requestId({ headerName: "x-request-id", trustIncoming: false }),
  requestLogger({
    write: (event) => {
      // Forward JSON-safe events to your logger or telemetry exporter.
      console.log(JSON.stringify(event));
    },
  }),
];`}>
          <p>Event log hanya berisi method, path, status, durasi, dan request ID. Jangan menambahkan cookie, authorization header, CSRF token, body request, atau data rahasia ke writer.</p>
        </GuideSection>

        <GuideSection id="security" label="SECURITY" title="Security defaults" description="Security package menyediakan browser headers, CORS allowlist, double-submit CSRF, dan rate limit in-memory." code={`import { cors, csrfProtection, rateLimit, securityHeaders } from "@cocoframe/security";\n\nconst middleware = [\n  securityHeaders(),\n  cors({ origins: ["https://mobile.example"], credentials: true }),\n  csrfProtection({ match: ({ url }) => url.pathname.startsWith("/account") }),\n  rateLimit({ limit: 100, windowMs: 60_000, key: ({ request }) => verifiedUserId(request) }),\n];`}>
          <p>Rate limiter bawaan bersifat per-process; gunakan store bersama untuk deployment terdistribusi. Identitas proxy tidak dipercaya kecuali alamat proxy dikonfigurasi secara eksplisit.</p>
        </GuideSection>

        <GuideSection id="authentication" label="AUTH" title="Signed cookie sessions" description="Auth package menangani integritas dan masa berlaku session, bukan OAuth, hashing password, atau sistem identitas lengkap." code={`import { createContextKey } from "@cocoframe/core";\nimport { createSessionAuth, protectSession, sessionMiddleware, type Session } from "@cocoframe/auth";\n\nconst sessionKey = createContextKey<Session<{ userId: string }>>("session");\nconst auth = createSessionAuth<{ userId: string }>({\n  secret: process.env.SESSION_SECRET!, // minimal 32 byte\n  cookieName: "app_session",\n  secure: true,\n});\n\nconst middleware = [\n  sessionMiddleware(auth, sessionKey),\n  protectSession(sessionKey, { match: ({ url }) => url.pathname.startsWith("/admin") }),\n];`}>
          <p><code>auth.commit(data)</code> menghasilkan header Set-Cookie, <code>auth.read(request)</code> membaca session, dan <code>auth.clear()</code> menghapusnya.</p>
        </GuideSection>

        <GuideSection id="database" label="DATABASE" title="SQLite and PostgreSQL adapters" description="Core database menyediakan lifecycle acquire/release dan transaction tanpa mengunci aplikasi ke ORM." code={`import { openSqlite } from "@cocoframe/database-sqlite";\n\nconst database = openSqlite({ filename: "app.db" });\nconst users = await database.run((db) =>\n  db.all<{ id: number; name: string }>(\n    "SELECT id, name FROM users WHERE active = ?", [1],\n  ),\n);\n\nawait database.transaction(async (db) => {\n  await db.run("UPDATE users SET active = ? WHERE id = ?", [0, 42]);\n});`}>
          <p><code>@cocoframe/database-postgres</code> menerima pool yang structurally compatible. Kedua adapter mendukung query parameterized, transactions, dan ordered idempotent migrations.</p>
        </GuideSection>

        <GuideSection id="recipes" label="END TO END" title="Recipe: validated CRUD page" description="Contoh berikut menghubungkan schema, form action, database, status 422, dan redirect 303 dalam satu page convention." code={`import { definePage, redirect } from "@cocoframe/core";
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
          <p>Pasang <code>csrfProtection()</code> untuk route cookie-authenticated. Buat migration immutable untuk tabel <code>tasks</code>, gunakan authorization terpisah dari session verification, dan jangan menyimpan database handle request-scoped di global mutable state.</p>
          <p>Untuk mobile, expose operasi yang sama sebagai <code>defineApi</code>, jalankan <code>npm run generate</code>, lalu gunakan Fetch client yang dihasilkan. UI mobile tidak perlu bergantung pada renderer CocoFrame.</p>
        </GuideSection>

        <GuideSection id="cocoql" label="AI DATABASE" title="CocoQL and Query Plan" description="CocoQL mengubah bahasa read-only yang kecil menjadi Query Plan tervalidasi sebelum compiler dialect menghasilkan SQL parameterized." language="typescript" code={`import {
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
          <p>Query Plan 0.1 bersifat database-independent: isinya hanya entity dan field publik, relation path, filter terstruktur, sorting, serta limit. Nama tabel, kolom fisik, dan kondisi join tetap berada di schema tepercaya dan baru dipakai oleh compiler dialect.</p>
          <p>Gunakan <code>with customer</code> sebelum mengakses <code>customer.name</code>. Nested path seperti <code>with projects.invoices</code> otomatis direncanakan parent-first. CocoQL tidak pernah menebak relation dari nama entity.</p>
          <p>Field <code>date</code> dan <code>datetime</code> menerima semantic range seperti <code>today</code>, <code>this_month</code>, atau <code>last 7 days</code>. Planner mengubahnya menjadi rentang UTC half-open; gunakan opsi <code>{`{ now }`}</code> untuk testing dan replay yang deterministik.</p>
          <p>Grouped read memakai <code>group customer.name</code> dan expression ber-alias seperti <code>sum(total) as revenue</code>. Semua field biasa yang dipilih wajib di-group; <code>sort revenue desc</code> kemudian mengacu ke alias aggregate secara eksplisit.</p>
          <p>Semua kegagalan menggunakan envelope <code>CocoQLIssue 0.1</code>. Gunakan <code>error</code> untuk branching, <code>stage</code> untuk mengetahui bagian pipeline, serta <code>location</code> dan <code>path</code> untuk memperbaiki clause yang tepat. <code>JSON.stringify(error)</code> tidak menyertakan stack trace.</p>
          <p><code>authorizeCocoQL</code> dan <code>authorizeCocoQLMutation</code> menerapkan policy default-deny setelah semantic validation dan sebelum plan. Read field, relation, aggregate, serta field <code>create</code>/<code>update</code> dan izin <code>delete</code> harus dinyatakan eksplisit.</p>
          <p><code>defineCocoQLSafetyPolicy</code> membatasi read dan mutation secara deterministik. Gunakan <code>previewCocoQLMutation</code> untuk memeriksa intent tanpa SQL; update/delete wajib memiliki filter, dan write executable wajib memakai <code>confirm affected &lt;= N</code>.</p>
          <p><code>compileCocoQLMutation</code> menghasilkan SQL berparameter beserta <code>verifyBeforeCommit</code>. Compiler tidak mengeksekusi database; adapter wajib memeriksa affected rows di transaksi yang sama dan rollback ketika melebihi konfirmasi.</p>
          <p>Gunakan <code>compileCocoQLPostgres</code> dan <code>compileCocoQLMutationPostgres</code> untuk PostgreSQL. Keduanya mengonsumsi plan yang sama, memakai placeholder <code>$1</code>, <code>$2</code>, dan seterusnya, serta tetap memvalidasi forged plan sebelum menghasilkan SQL.</p>
          <p>Gunakan <code>compileCocoQL(source, schema)</code> sebagai shortcut pipeline lengkap. Plan yang dibuat di luar <code>planCocoQL</code> tetap divalidasi compiler; operator palsu, referensi lintas entity, rentang tanggal rusak, dan join yang tidak cocok dengan schema gagal dengan <code>INVALID_PLAN</code>. Validasi plan tidak menggantikan authorization aplikasi.</p>
          <p>Lihat contoh pada <a href="/cocoql#permissions">Permissions</a>, <a href="/cocoql#safety">Safety Policy</a>, <a href="/cocoql#mutation-preview">Mutation Preview</a>, <a href="/cocoql#mutations">Guarded Mutations</a>, <a href="/cocoql#postgresql">PostgreSQL</a>, dan <a href="/cocoql#query-plan">Query Plan</a>.</p>
        </GuideSection>

        <GuideSection id="performance" label="SSR" title="Streaming, defer, SEO, and caching" description="HTML utama selalu server-rendered. Konten non-kritis dapat diselesaikan belakangan tanpa inline executable script." code={`import { defer } from "@cocoframe/core";\n\nconst Recommendations = () => defer(\n  loadRecommendations(),\n  <p>Loading recommendations...</p>,\n);\n\nexport default definePage({\n  meta: { title: "Product", description: "Product detail" },\n  cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },\n  view: () => <main><h1>Product</h1><Recommendations /></main>,\n});`}>
          <p>Jangan menaruh title, copy utama, structured data, atau konten SEO penting di dalam <code>defer</code>. Static pages masuk otomatis ke <code>/sitemap.xml</code>; <code>/robots.txt</code> menunjuk ke sitemap.</p>
        </GuideSection>

        <GuideSection id="testing" label="QUALITY" title="Testing and inspection" description="Gunakan compiler, Node test runner, manifest inspection, dan production build sebagai quality gate." language="bash" code={`npm run check\nnpm test\nnpm run inspect\nnpm run build\n\n# benchmark ops renderer / HTTP lokal\nnpm run benchmark\nnpm run benchmark:http\nnpm run benchmark:http:concurrent`}>
          <p>Test aplikasi dapat memanggil <code>app.fetch(new Request(url))</code> langsung tanpa membuka port. Uji browser tetap diperlukan untuk islands dan responsive UI.</p>
        </GuideSection>

        <GuideSection id="deployment" label="PRODUCTION" title="Build and deployment" description="Production build menghasilkan server bundle, public assets, manifest asset, dan deployment metadata." language="bash" code={`npm run build\nnpm start\n\n# output utama\n.cocoframe/server.mjs\n.cocoframe/public/\n.cocoframe/assets.json\n.cocoframe/deploy.json`}>
          <DeploymentTargetTable />
          <p>Node server mendukung body limit, request timeout, trusted proxies, liveness/readiness probes, dan graceful shutdown. Untuk platform Fetch/edge gunakan <code>webHandler(app)</code> dari <code>@cocoframe/server-web</code>.</p>
        </GuideSection>

        <GuideSection id="environment" label="RUNTIME" title="Environment variables and health" description="Runtime Node membaca environment variable eksplisit berikut." >
          <EnvironmentTable />
          <p>Health endpoints tersedia di <code>/_health/live</code> dan <code>/_health/ready</code>. Readiness dapat memeriksa database atau dependency melalui config.</p>
        </GuideSection>

        <GuideSection id="cli" label="REFERENCE" title="CLI reference" description="CLI menerima project directory sebagai argumen terakhir; default-nya current directory." language="bash" code={`cocoframe inspect [project]   # route, island, UI, API, middleware manifest\ncocoframe dev [project]       # development server + watcher\ncocoframe build [project]     # production bundle\ncocoframe start [project]     # jalankan production bundle\ncocoframe generate [project]  # client, OpenAPI, CSS declarations\ncocoframe openapi [project]   # hanya OpenAPI`}>
          <p>Dalam repository ini command yang sama tersedia melalui script npm: <code>npm run inspect</code>, <code>npm run dev</code>, <code>npm run build</code>, dan <code>npm run generate</code>.</p>
        </GuideSection>

        <GuideSection id="troubleshooting" label="SUPPORT" title="Troubleshooting checklist" description="Mulai dari pemeriksaan deterministik berikut sebelum mengubah konfigurasi atau menambah dependency." language="bash" code={`npm run check
npm test
npm run inspect
npm run generate
npm run build`}>
          <ul class="guide-checklist">
            <li><strong>Route tidak ditemukan:</strong> periksa pola dan urutan route melalui <code>npm run inspect</code>; pastikan suffix file adalah <code>.page.tsx</code> atau <code>.route.ts</code>.</li>
            <li><strong>Island tidak aktif:</strong> pastikan file berada di <code>app/islands</code>, nama <code>defineIsland</code> lowercase cocok dengan filename, dan props JSON-serializable.</li>
            <li><strong>Generated client berubah:</strong> jalankan <code>npm run generate</code>; jangan edit client, OpenAPI, atau CSS declarations secara manual.</li>
            <li><strong>Form selalu 403:</strong> cocokkan <code>CsrfField</code> dengan middleware CSRF dan jangan cache halaman form personal sebagai public.</li>
            <li><strong>Readiness gagal:</strong> periksa dependency dari server log. Endpoint readiness hanya mengembalikan status availability dan sengaja tidak membocorkan error internal.</li>
            <li><strong>Asset tidak ditemukan setelah build:</strong> gunakan URL dari asset manifest; production filename memakai content hash.</li>
          </ul>
          <p>Jika masalah tetap terjadi, siapkan versi Node, output <code>npm run inspect</code>, langkah reproduksi minimal, serta error yang sudah disanitasi lalu kirim melalui <a href="/contact">halaman kontak</a>.</p>
        </GuideSection>

        <GuideSection id="versioning" label="RELEASES" title="Versioning and upgrade policy" description="Rilis publik awal berada pada versi 0.0.1 dan tetap berstatus architectural MVP menuju API yang stabil.">
          <ul class="guide-checklist">
            <li>Public API yang stabil selalu diekspor dari root package <code>@cocoframe/*</code>.</li>
            <li>Generated client, OpenAPI, manifest, dan CSS declaration harus dibuat ulang setelah upgrade.</li>
            <li>Migration database yang sudah diterapkan bersifat immutable; perubahan baru memakai migration ID berikutnya.</li>
            <li>Sebelum upgrade, jalankan check, test, inspect, build, lalu simpan output sebagai baseline.</li>
            <li>Breaking change sebelum 1.0 harus dicatat bersama langkah migrasi dan contoh sebelum/sesudah.</li>
          </ul>
          <p><code>create-cocoframe@0.0.2</code> dan 18 package scoped <code>@cocoframe/*</code> sudah tersedia publik di npm. Gunakan staged publishing untuk rilis lanjutan setelah package bootstrap ini.</p>
        </GuideSection>

        <GuideSection id="roadmap" label="ROADMAP" title="Current roadmap" description="Prioritas berikut menjaga framework tetap kecil sambil menutup kebutuhan production yang belum tersedia.">
          <RoadmapTable />
        </GuideSection>

        <GuideSection id="contributing" label="CONTRIBUTING" title="Contribution workflow" description="Perubahan framework harus kecil, typed, memiliki test fokus, dan tidak memperbesar browser runtime tanpa kebutuhan nyata." language="bash" code={`npm install
npm run check
npm test
npm run inspect
npm run build

# benchmark bila perubahan memengaruhi performa
npm run benchmark
npm run benchmark:http`}>
          <p>Baca <code>docs/architecture.md</code> sebelum mengubah behavior. Gunakan Web Standard <code>Request</code>/<code>Response</code> pada boundary, server rendering sebagai default, dan island hanya untuk interaksi browser.</p>
          <p>Perubahan API contract wajib diikuti <code>npm run generate</code>. Jangan mengedit output generated, migration lama, atau scoped CSS name secara manual.</p>
        </GuideSection>

        <GuideSection id="conventions" label="AI-FRIENDLY" title="Conventions and maintenance" description="Pilih satu tempat untuk setiap concern agar perubahan tetap lokal dan konteks untuk AI tetap kecil.">
          <ul class="guide-checklist"><li>Satu page atau API contract per route file.</li><li>Komponen statis di <code>components/</code>; state browser hanya di <code>islands/</code>.</li><li>Schema menjadi sumber kebenaran untuk form dan API.</li><li>ContextKey untuk state request; tidak memakai global mutable state.</li><li>Generated files tidak diedit manual.</li><li>Jalankan check, test, dan build sebelum merge.</li></ul>
        </GuideSection>
      </article>
    </div>
  </main>,
});

function GuideSection({ id, label, title, description, code, language = "tsx", children }: GuideSectionProps) {
  return <section class="guide-section" id={id}><header><span class="eyebrow">{label}</span><h2>{title}</h2><p>{description}</p></header>{code ? <SyntaxHighlighter class="guide-code" code={code} language={language} label={`${title} code example`} /> : null}<div class="guide-body">{children}</div><a class="guide-top" href="#top">Kembali ke atas <span aria-hidden="true"><ArrowUpIcon size={14} /></span></a></section>;
}

function RouteTable() {
  return <div class="guide-table" role="table" aria-label="Konvensi file routing"><div role="row"><strong role="columnheader">File</strong><strong role="columnheader">URL</strong></div><div role="row"><code>index.page.tsx</code><code>/</code></div><div role="row"><code>about.page.tsx</code><code>/about</code></div><div role="row"><code>blog/[slug].page.tsx</code><code>/blog/:slug</code></div><div role="row"><code>docs/[...rest].page.tsx</code><code>/docs/*rest</code></div><div role="row"><code>api/users.route.ts</code><code>/api/users</code></div></div>;
}

function EnvironmentTable() {
  return <div class="guide-table env-table" role="table" aria-label="Environment variables"><div role="row"><strong role="columnheader">Variable</strong><strong role="columnheader">Default</strong></div><div role="row"><code>COCOFRAME_MAX_BODY_BYTES</code><code>1048576</code></div><div role="row"><code>COCOFRAME_REQUEST_TIMEOUT_MS</code><code>30000</code></div><div role="row"><code>COCOFRAME_TRUSTED_PROXIES</code><span>kosong</span></div><div role="row"><code>COCOFRAME_SHUTDOWN_DELAY_MS</code><code>0</code></div><div role="row"><code>COCOFRAME_SHUTDOWN_TIMEOUT_MS</code><code>10000</code></div><div role="row"><code>PORT</code><code>3000</code></div><div role="row"><code>HOST</code><code>0.0.0.0 (start)</code></div></div>;
}

function PackageReferenceTable() {
  const packages = [
    ["@cocoframe/core", "Application lifecycle", "definePage, defineApi, defineLayout, defineConfig, defineMiddleware, createContextKey, json, redirect, defer"],
    ["@cocoframe/jsx", "Typed TSX runtime", "jsx, Fragment, raw, defer, renderToString, renderToChunks"],
    ["@cocoframe/router", "Low-level routing", "Router, normalizePath, HttpMethod"],
    ["@cocoframe/client", "Opt-in browser runtime", "defineIsland, signal, computed, bind, mountReactive"],
    ["@cocoframe/ui", "Server-first design system", "80 semantic primitives, Chart, SyntaxHighlighter, styles.css, utilities.css"],
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
    ["@cocoframe/server-node", "Node HTTP adapter", "createServer, gracefulShutdown, clientAddress"],
    ["@cocoframe/server-web", "Fetch/edge adapter", "webHandler"],
    ["@cocoframe/cli", "Project tooling", "dev, build, start, inspect, generate, openapi"],
    ["create-cocoframe", "Project scaffolding", "starter template, package-manager selection, safe directory checks, skip-install"],
  ] as const;
  return <div class="guide-table guide-table--packages" role="table" aria-label="Public CocoFrame packages"><div role="row"><strong role="columnheader">Package</strong><strong role="columnheader">Responsibility</strong><strong role="columnheader">Primary API</strong></div>{packages.map(([name, responsibility, api]) => <div role="row"><code>{name}</code><span>{responsibility}</span><code>{api}</code></div>)}</div>;
}

function DeploymentTargetTable() {
  return <div class="guide-table guide-table--three" role="table" aria-label="Deployment targets"><div role="row"><strong role="columnheader">Target</strong><strong role="columnheader">Entry</strong><strong role="columnheader">Notes</strong></div><div role="row"><strong>Node server</strong><code>.cocoframe/server.mjs</code><span>Body limit, timeout, trusted proxy, health, dan graceful shutdown.</span></div><div role="row"><strong>Fetch / edge</strong><code>webHandler(app)</code><span>Gunakan Web Standard Request dan Response; verifikasi dukungan streaming platform.</span></div><div role="row"><strong>Container</strong><code>npm start</code><span>Expose PORT, pasang health probes, dan kirim signal shutdown ke process.</span></div></div>;
}

function RoadmapTable() {
  const items = [
    ["Package publishing", "In progress", "Creator sudah siap; build distribusi runtime, provenance, dan release npm masih diperlukan."],
    ["Distributed rate limiting", "Planned", "Store interface untuk deployment multi-instance."],
    ["Telemetry exporters", "Planned", "Adapter vendor-neutral di atas structured request events."],
    ["CSP nonce & integrity helpers", "Planned", "Security enhancement tanpa mengekspos bundler internals."],
    ["Compression", "Planned", "Streaming-safe response compression pada adapter runtime."],
    ["Deployment adapters", "Planned", "Target tambahan berbasis Fetch standards dan deployment manifest."],
  ] as const;
  return <div class="guide-table guide-table--roadmap" role="table" aria-label="CocoFrame roadmap"><div role="row"><strong role="columnheader">Capability</strong><strong role="columnheader">Status</strong><strong role="columnheader">Scope</strong></div>{items.map(([capability, status, scope]) => <div role="row"><strong>{capability}</strong><span class="guide-status">{status}</span><span>{scope}</span></div>)}</div>;
}
