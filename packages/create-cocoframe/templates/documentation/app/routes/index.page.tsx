import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import CheckIcon from "@cocoframe/icons/linear/check-circle";
import CodeIcon from "@cocoframe/icons/linear/code-square";
import MagnifierIcon from "@cocoframe/icons/linear/magnifier";
import { Alert, Badge, Card, Heading, SyntaxHighlighter, Table, Text } from "@cocoframe/ui";

const installCode = `npm create cocoframe@latest my-app\ncd my-app\nnpm run dev`;
const pageCode = `import { definePage } from "@cocoframe/core";\n\nexport default definePage({\n  meta: { title: "Hello" },\n  view: () => <h1>Hello from CocoFrame</h1>,\n});`;

export default definePage({
  meta: { title: "{{PROJECT_NAME}} — Documentation", description: "A searchable, server-first documentation template using official CocoFrame components and icons." },
  view: () => <main class="docs-page">
    <header class="docs-topbar"><a class="mobile-brand" href="/"><CodeIcon size={21} /> Atlas Docs</a><label class="docs-search"><MagnifierIcon size={17} /><span class="coco-visually-hidden">Search documentation</span><input type="search" placeholder="Search documentation…" /></label><a href="https://github.com/wiryosaputraofficial/cocoframe">GitHub</a></header>
    <article class="docs-article">
      <section id="introduction"><Badge variant="success"><CheckIcon size={14} /> Server-first documentation</Badge><Heading level={1} size="xlarge">Build documentation people can actually navigate.</Heading><Text size="large" tone="muted">Atlas Docs combines semantic navigation, accessible code samples, and a content layout that stays useful without browser JavaScript.</Text><div class="docs-actions"><a class="primary-link" href="#installation">Get started <ArrowRightIcon size={16} /></a><a class="secondary-link" href="#routing">Explore routing</a></div></section>

      <section id="installation"><Heading level={2}>Installation</Heading><Text tone="muted">Create a project from the public registry and start the local development server.</Text><Card class="code-card"><SyntaxHighlighter code={installCode} language="bash" label="Install CocoFrame" showLineNumbers /></Card><Alert variant="info"><strong>Tip:</strong> Run <code>npm run inspect</code> to give developers and AI assistants a compact project manifest.</Alert></section>

      <section id="routing"><Heading level={2}>File-based routing</Heading><Text tone="muted">A page owns its loader, metadata, and view. File names remain predictable and easy to scan.</Text><Card class="code-card"><SyntaxHighlighter code={pageCode} language="tsx" label="CocoFrame page" showLineNumbers /></Card><Table caption="Route conventions" headers={["File", "URL", "Purpose"]} rows={[["index.page.tsx", "/", "Static page"],["blog/[slug].page.tsx", "/blog/:slug", "Dynamic page"],["api/health.route.ts", "/api/health", "Typed API route"]]} striped /></section>

      <section id="configuration"><Heading level={2}>Configuration</Heading><Text tone="muted">Keep cross-cutting behavior explicit in <code>cocoframe.config.ts</code>.</Text><div class="concept-grid"><Card><CodeIcon size={22} /><Heading level={3} size="medium">Typed config</Heading><Text tone="muted">Editors validate middleware, metadata, health checks, and asset options.</Text></Card><Card><CheckIcon size={22} /><Heading level={3} size="medium">Secure defaults</Heading><Text tone="muted">Security behavior stays outside render code and remains easy to inspect.</Text></Card></div></section>
    </article>
  </main>,
});