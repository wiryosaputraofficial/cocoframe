# @cocoframe/security

Streaming-safe browser security middleware.

- `securityHeaders(options?)` applies CSP and browser-hardening headers.
- `cors(options)` allows only explicit origins or a predicate.
- `csrfProtection(options?)` provides trusted-origin double-submit protection.
- `rateLimit(options)` uses an explicit application-defined key and bounded local storage.
- `csrfTokenKey` exposes the request token to `CsrfField`.

```ts
export default defineConfig({
  middleware: [securityHeaders(), csrfProtection()],
});
```

Never combine credentials with wildcard CORS, trust forwarded identity implicitly,
or log tokens and request bodies. Header middleware wraps the existing body and
must preserve streaming. Verify with `tests/security.test.ts` and full CSP/form E2E.
