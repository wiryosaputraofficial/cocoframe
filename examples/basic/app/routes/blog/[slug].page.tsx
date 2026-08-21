import { definePage } from "@cocoframe/core";

export default definePage({
  load: ({ params }) => ({
    slug: params.slug ?? "unknown",
    title: (params.slug ?? "unknown").replaceAll("-", " "),
  }),
  meta: ({ title, slug }) => ({
    title,
    description: `Server-rendered article for ${title}`,
    canonical: `https://example.com/blog/${slug}`,
    type: "article",
  }),
  view: ({ title, slug }) => (
    <main><a href="/">Back</a><article><h1>{title}</h1><p>Dynamic parameter: {slug}</p></article></main>
  ),
});
