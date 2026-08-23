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
    <ProjectHero active="conventions" eyebrow="PROJECT CONVENTIONS" title={<>One place for<br />every concern.</>} description="CocoFrame conventions reduce equivalent choices. When locations, names, and lifecycles are predictable, changes are easier to review, maintain, and generate with less AI context." icon={<StarsMinimalisticIcon size={86} />}>
      <a class="button button-primary" href="#structure">View structure</a>
      <a class="button button-ghost" href="/docs#conventions">Conventions docs</a>
    </ProjectHero>

    <ProjectSection id="structure" eyebrow="PROJECT SHAPE" title="The filename declares the boundary." description="Route discovery, island loading, and CSS scoping follow explicit file conventions.">
      <div class="project-split project-split--structure">
        <div class="project-code reveal"><div><FolderIcon size={17} /><span>project tree</span><small>canonical</small></div><SyntaxHighlighter code={projectTree} language="text" label="Canonical CocoFrame project structure" /></div>
        <div class="project-card-grid project-card-grid--stacked">
          <ProjectCard icon={<CodeSquareIcon size={24} />} title="Routes own lifecycle"><p>One page owns <code>load</code>, <code>meta</code>, and <code>view</code>. Each API contract lives in one <code>*.route.ts</code> file.</p></ProjectCard>
          <ProjectCard icon={<Widget4Icon size={24} />} title="Components stay server-first"><p>Reusable markup lives in <code>components/</code>. Browser state enters <code>*.island.tsx</code> only when an interaction genuinely requires it.</p></ProjectCard>
        </div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="PAGE CONTRACT" title="Load, describe, and render in one module." description="There are no parallel lifecycle APIs or aliases. Metadata and HTML use the same data, with escaping enabled by default.">
      <div class="project-split">
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>article.page.tsx</span><small>server-first</small></div><SyntaxHighlighter code={pageContract} language="tsx" label="CocoFrame page contract example" /></div>
        <div class="project-checklist reveal"><h3>Page rules</h3><ul><li>SEO-critical data is available before deferred content.</li><li>Pages stream unless they declare an error boundary.</li><li>Raw HTML always requires an explicit API.</li><li>Invalid forms rerender with HTTP 422.</li><li>Successful mutations normally redirect with HTTP 303.</li><li>Cache behavior is declared on the page.</li></ul></div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="MAINTENANCE RULES" title="Predictability is a performance feature." description="These rules keep the codebase compact for people and token-efficient for AI.">
      <div class="project-policy-list reveal"><article><strong>Typed context</strong><p>Use <code>ContextKey&lt;T&gt;</code>, not string-keyed globals or mutable singletons.</p></article><article><strong>Generated output</strong><p>Run the generator after a contract changes; never edit clients, OpenAPI, manifests, or CSS declarations manually.</p></article><article><strong>Security boundary</strong><p>Security headers belong in middleware. CORS origins are explicit, and cookie-authenticated unsafe requests use CSRF protection.</p></article><article><strong>Focused verification</strong><p>Every behavior change gets a focused test, followed by check, test, inspect, and build before handoff.</p></article></div>
    </ProjectSection>

    <ProjectSection eyebrow="NAMING" title="Names are stable interfaces." description="Consistent names make manifests, errors, and files discoverable without scanning the entire repository.">
      <div class="project-convention-table reveal" role="table" aria-label="CocoFrame naming conventions"><div role="row"><strong role="columnheader">Concern</strong><strong role="columnheader">Convention</strong><strong role="columnheader">Example</strong></div><div role="row"><span>Page</span><code>*.page.tsx</code><code>blog/[slug].page.tsx</code></div><div role="row"><span>API</span><code>*.route.ts</code><code>api/health.route.ts</code></div><div role="row"><span>Island</span><code>lowercase *.island.tsx</code><code>site-header.island.tsx</code></div><div role="row"><span>Scoped style</span><code>*.module.css</code><code>feature-card.module.css</code></div><div role="row"><span>Middleware</span><code>stable defineMiddleware ID</code><code>security.csrf</code></div></div>
    </ProjectSection>

    <ProjectCta title="Use the conventions as an AI handoff contract." description="Start with the architecture guide before changing framework behavior." href="/docs#architecture" label="Read architecture" />
  </main>,
});
