import { definePage } from "@cocoframe/core";
import DocsSidebar from "../../islands/docs-sidebar.island.tsx";
import { ApiReferenceView, DocsTopicView, findDocsTopic } from "../../components/docs-topics.tsx";

export default definePage({
  load: ({ params, query }) => ({ slug: params.topic, topic: findDocsTopic(params.topic), selectedPackage: query.get("package") ?? undefined }),
  status: ({ slug, topic }) => slug === "api-reference" || topic ? 200 : 404,
  meta: ({ slug, topic }) => topic ? {
    title: `${topic.title} — CocoFrame Documentation`,
    description: topic.description,
    canonical: `https://cocoframe.dev/docs/${topic.slug}`,
    type: "article",
  } : slug === "api-reference" ? {
    title: "API Reference — CocoFrame Documentation",
    description: "Generated package, export, signature, type, deprecation, example, and source reference for CocoFrame's public API.",
    canonical: "https://cocoframe.dev/docs/api-reference",
    type: "article",
  } : {
    title: "Documentation topic not found — CocoFrame",
    description: "The requested CocoFrame documentation topic does not exist.",
    robots: "noindex, nofollow",
  },
  view: ({ slug, topic, selectedPackage }) => <main class="docs-layout docs-center-layout">
    <DocsSidebar kind="documentation" activePath={`/docs/${slug}`} />
    <div class="docs-content docs-topic-content">{topic ? <DocsTopicView topic={topic} /> : slug === "api-reference" ? <ApiReferenceView {...(selectedPackage ? { selectedPackage } : {})} /> : <section class="docs-topic-missing"><h1>Documentation topic not found</h1><p>Return to the documentation center to choose an available guide.</p><a class="button button-primary" href="/docs">Browse documentation</a></section>}</div>
  </main>,
});
