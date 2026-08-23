# @cocoframe/core

The page, API, middleware, request-context, SEO document, and Web Standard
application handler contract.

## Public surface

- `definePage`, `defineLayout`, and `withLayouts` define server-rendered pages.
- `defineApi` defines optional schema-backed API contracts.
- `defineConfig`, `defineMiddleware`, and `createContextKey` define application-wide behavior and typed request state.
- `CocoFrameApp` registers routes and exposes `fetch(Request)`.
- `rerender`, `redirect`, and `json` express standard response behavior.
- `defer` streams supplementary content with a fallback.

```tsx
export default definePage({
  load: () => ({ name: "CocoFrame" }),
  meta: ({ name }) => ({ title: name }),
  view: ({ name }) => <h1>{name}</h1>,
});
```

Pages own `load`, `meta`, and `view`. They stream unless an `error` boundary
intentionally buffers them. Framework boundaries use Web `Request` and `Response`.
Read `docs/request-lifecycle.md`; verify changes with `tests/core.test.ts`.
