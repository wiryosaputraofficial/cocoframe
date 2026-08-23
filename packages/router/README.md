# @cocoframe/router

Small method-aware router for static, parameterized, and catch-all patterns.

- `Router<Handler>` registers, matches, and reports route manifests.
- `normalizePath(pathname)` applies one path convention.
- `HttpMethod` and `RouteMatch` describe the typed boundary.

```ts
const router = new Router<Handler>();
router.add("GET", "/posts/:slug", handler);
const match = router.match("GET", "/posts/hello");
```

Static routes use direct map lookup. Dynamic patterns compile once during
registration and sort by specificity; never compile regular expressions per
request. Verify with `tests/router.test.ts` and route discovery tests.
