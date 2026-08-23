# Create a Page

Create `app/routes/<path>.page.tsx` and keep `load`, `meta`, and `view` together.

```tsx
import { definePage } from "@cocoframe/core";

export default definePage({
  load: ({ params }) => ({ slug: params.slug }),
  meta: ({ slug }) => ({ title: `Post ${slug}`, description: "Post details" }),
  cache: { browser: 60, edge: 300 },
  view: ({ slug }) => <main><h1>{slug}</h1></main>,
});
```

Use `index.page.tsx` for a directory root, `[slug].page.tsx` for one parameter,
and `[...path].page.tsx` for a catch-all. Nested `_layout.tsx` files are inherited.
Keep SEO-critical content immediate. Verify discovery with `npm run inspect` and
page behavior with `tests/core.test.ts` or a focused project test.
