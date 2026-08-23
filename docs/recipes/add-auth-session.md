# Add a Signed Session

Create a server-only session primitive, store verified data in typed request
context, and keep authorization explicit.

```ts
const sessions = createSessionAuth<{ userId: string }>({ secret: SESSION_SECRET });
const sessionKey = createContextKey<Session<{ userId: string }>>("session");

export default defineConfig({
  middleware: [sessionMiddleware(sessions, sessionKey)],
});
```

Use `protectSession` only for authentication gates; handlers still check resource
permissions. Use a strong server-only secret, secure cookie policy in production,
and matching CSRF protection for cookie-authenticated unsafe requests. Never log
cookies or tokens. Verify auth and security tests.
