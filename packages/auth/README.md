# @cocoframe/auth

Server-only signed-cookie session primitives built on Web Crypto.

## Public surface

- `createSessionAuth(options)` commits, verifies, expires, and clears typed session data.
- `sessionMiddleware(auth, key)` loads a verified session into typed request context.
- `protectSession(key, options)` applies route-selective authentication checks.
- `SessionOptions`, `Session`, `SessionAuth`, and `SessionProtection` describe the contract.

```ts
const sessions = createSessionAuth<{ userId: string }>({ secret });
const sessionKey = createContextKey<Session<{ userId: string }>>("session");

export default defineConfig({
  middleware: [sessionMiddleware(sessions, sessionKey), protectSession(sessionKey)],
});
```

This package protects session integrity; applications still own identity proofing,
password hashing, and authorization. Secrets stay server-only. Verify changes with
`tests/auth.test.ts` and the relevant core/security tests.
