import { definePage } from "@cocoframe/core";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import FolderIcon from "@cocoframe/icons/linear/folder";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import Widget4Icon from "@cocoframe/icons/linear/widget-4";
import { SyntaxHighlighter } from "@cocoframe/ui";
import { ProjectCard, ProjectCta, ProjectHero, ProjectSection } from "../components/project-page.tsx";

const projectTree = `app/
├─ routes/
│  ├─ _layout.tsx
│  ├─ index.page.tsx
│  └─ api/health.route.ts
├─ components/
│  └─ feature-card.tsx
├─ islands/
│  └─ counter.island.tsx
└─ styles/
   └─ feature-card.module.css`;

const pageContract = `export default definePage({
  load: async (context) => data,
  meta: (data) => ({ title: data.title }),
  view: (data) => <Page data={data} />,
});`;

export default definePage({
  meta: {
    title: "Project conventions | CocoFrame",
    description: "CocoFrame file structure, naming rules, server-first boundaries, and AI-friendly maintenance conventions.",
    canonical: "https://cocoframe.dev/conventions",
  },
  view: () => <main class="project-page" id="top">
    <ProjectHero active="conventions" eyebrow="PROJECT CONVENTIONS" title={<>One place for<br />every concern.</>} description="Konvensi CocoFrame mengurangi pilihan yang ekuivalen. Saat lokasi, nama, dan lifecycle dapat diprediksi, perubahan lebih mudah direview, dipelihara, dan dihasilkan dengan konteks AI yang lebih kecil." icon={<StarsMinimalisticIcon size={86} />}>
      <a class="button button-primary" href="#structure">View structure</a>
      <a class="button button-ghost" href="/docs#conventions">Conventions docs</a>
    </ProjectHero>

    <ProjectSection id="structure" eyebrow="PROJECT SHAPE" title="The filename declares the boundary." description="Route discovery, island loading, dan CSS scoping berasal dari konvensi file yang eksplisit.">
      <div class="project-split project-split--structure">
        <div class="project-code reveal"><div><FolderIcon size={17} /><span>project tree</span><small>canonical</small></div><SyntaxHighlighter code={projectTree} language="text" label="Canonical CocoFrame project structure" /></div>
        <div class="project-card-grid project-card-grid--stacked">
          <ProjectCard icon={<CodeSquareIcon size={24} />} title="Routes own lifecycle"><p>Satu page mengelola <code>load</code>, <code>meta</code>, dan <code>view</code>. API contract berada pada satu <code>*.route.ts</code>.</p></ProjectCard>
          <ProjectCard icon={<Widget4Icon size={24} />} title="Components stay server-first"><p>Reusable markup berada di <code>components/</code>. State browser hanya masuk ke <code>*.island.tsx</code> ketika interaksi benar-benar membutuhkannya.</p></ProjectCard>
        </div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="PAGE CONTRACT" title="Load, describe, and render in one module." description="Tidak ada lifecycle paralel atau alias. Metadata dan HTML memakai data yang sama dengan escaping aktif secara default.">
      <div class="project-split">
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>article.page.tsx</span><small>server-first</small></div><SyntaxHighlighter code={pageContract} language="tsx" label="CocoFrame page contract example" /></div>
        <div class="project-checklist reveal"><h3>Page rules</h3><ul><li>SEO-critical data tersedia sebelum deferred content.</li><li>Halaman stream kecuali memiliki error boundary.</li><li>Raw HTML selalu membutuhkan API eksplisit.</li><li>Form invalid rerender dengan HTTP 422.</li><li>Mutation sukses biasanya redirect dengan HTTP 303.</li><li>Cache behavior dideklarasikan pada page.</li></ul></div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="MAINTENANCE RULES" title="Predictability is a performance feature." description="Aturan ini menjaga codebase kecil untuk manusia dan hemat token untuk AI.">
      <div class="project-policy-list reveal"><article><strong>Typed context</strong><p>Gunakan <code>ContextKey&lt;T&gt;</code>, bukan string-keyed global atau mutable singleton.</p></article><article><strong>Generated output</strong><p>Jalankan generator setelah contract berubah; jangan edit client, OpenAPI, manifest, atau CSS declaration.</p></article><article><strong>Security boundary</strong><p>Header security berada di middleware. CORS origin eksplisit dan cookie-authenticated unsafe request memakai CSRF.</p></article><article><strong>Focused verification</strong><p>Setiap perubahan behavior mendapat test terfokus, lalu check, test, inspect, dan build dijalankan sebelum handoff.</p></article></div>
    </ProjectSection>

    <ProjectSection eyebrow="NAMING" title="Names are stable interfaces." description="Nama yang konsisten membuat manifest, error, dan file dapat ditemukan tanpa scanning seluruh repository.">
      <div class="project-convention-table reveal" role="table" aria-label="CocoFrame naming conventions"><div role="row"><strong role="columnheader">Concern</strong><strong role="columnheader">Convention</strong><strong role="columnheader">Example</strong></div><div role="row"><span>Page</span><code>*.page.tsx</code><code>blog/[slug].page.tsx</code></div><div role="row"><span>API</span><code>*.route.ts</code><code>api/health.route.ts</code></div><div role="row"><span>Island</span><code>lowercase *.island.tsx</code><code>site-header.island.tsx</code></div><div role="row"><span>Scoped style</span><code>*.module.css</code><code>feature-card.module.css</code></div><div role="row"><span>Middleware</span><code>stable defineMiddleware ID</code><code>security.csrf</code></div></div>
    </ProjectSection>

    <ProjectCta title="Use the conventions as an AI handoff contract." description="Mulai dari architecture guide sebelum mengubah framework behavior." href="/docs#architecture" label="Read architecture" />
  </main>,
});
