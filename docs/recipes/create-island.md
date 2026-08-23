# Create an Island

Create `app/islands/<name>.island.tsx`; the stable lowercase `name` must match the
filename.

```tsx
import { bind, defineIsland, signal } from "@cocoframe/client";

export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => <button onClick={() => count.value++}>{bind(count)}</button>;
  },
});
```

Prefer `enhance(root, props)` when existing server HTML only needs delegated
behavior. Prefer `bind(signal)` or `bind(computed(...))` for changing text.
Static pages must remain free of the bootstrap. Verify with client tests,
`npm run inspect`, production build assets, and full E2E.
