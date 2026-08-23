# Add Middleware

Put cross-cutting request behavior in `cocoframe.config.ts`. Reusable middleware
uses a stable ID and typed context keys.

```ts
const userKey = createContextKey<User>("current-user");

const loadUser = defineMiddleware("auth.load-user", async (context, next) => {
  const user = await verifiedUser(context.request);
  if (user) context.set(userKey, user);
  return next();
});

export default defineConfig({ middleware: [requestId(), loadUser] });
```

Order is execution order. Middleware may short-circuit but may call `next()` at
most once. Header middleware must preserve the response stream. Verify the stable
ID and order with `npm run inspect` plus focused behavior tests.
