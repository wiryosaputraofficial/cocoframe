# @cocoframe/jsx

Typed CocoFrame component nodes, escaping, and ordered asynchronous HTML rendering.

- `jsx`, `jsxs`, and `Fragment` implement the TSX runtime.
- `renderToChunks` streams ordered HTML; `renderToString` explicitly buffers it.
- `escapeText` and `escapeAttribute` protect dynamic values.
- `raw` is the explicit trusted-HTML escape hatch.
- `defer` describes a supplementary streaming boundary.

```tsx
const Greeting = ({ name }: { name: string }) => <h1>Hello {name}</h1>;
const html = await renderToString(<Greeting name="CocoFrame" />);
```

Dynamic content is escaped by default and rendering performs one traversal.
Do not introduce an implicit raw-HTML path or buffer streaming APIs. Verify with
`tests/jsx.test.ts` and core streaming tests.
