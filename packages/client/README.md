# @cocoframe/client

Opt-in browser reactivity and island boundaries for server-rendered CocoFrame pages.

## Public surface

- `defineIsland({ name, setup, enhance? })` creates a stable interactive boundary.
- `signal(initial)` and `computed(fn)` provide reactive state.
- `bind(signal)` updates only a bound text node.
- `configureIslandAssets()` connects stable island names to built module URLs.
- Browser subpaths provide bootstrap, deferred streaming, and development diagnostics.

```tsx
export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => <button onClick={() => count.value++}>{bind(count)}</button>;
  },
});
```

The filename and lowercase island name must match. Prefer `bind` for reactive text;
reading `.value` in the view intentionally rerenders the boundary. Verify runtime
changes with `tests/client.test.ts` and full E2E.
