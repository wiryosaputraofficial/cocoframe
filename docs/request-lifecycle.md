# CocoFrame Request Lifecycle

This trace connects runtime code to the architectural request flow. Read it for
changes involving routing, middleware, pages, APIs, actions, streaming, errors,
or the Node adapter.

## End-to-end flow

```text
Node HTTP request
  -> @cocoframe/server-node creates one AbortSignal
  -> validates trusted-proxy use and constructs a Web Request
  -> reads non-GET/HEAD body with the configured byte limit
  -> CocoFrameApp.fetch
  -> production allowed-host check
  -> method-aware route match (HEAD may fall back to GET)
  -> typed RequestContext and per-request ContextKey storage
  -> middleware in configured order
  -> page | action | API | health | SEO | 404 dispatch
  -> Web Response
  -> Node adapter streams chunks with write backpressure
```

The same request signal is carried by the Web `Request` through application
handling and response streaming. Timeout or client disconnect aborts the shared
flow. The Node adapter returns sanitized JSON errors for body limit, timeout,
and unexpected adapter failures.

## Registration and matching

The CLI discovers filesystem routes and builds a virtual application entry. It
registers pages with `app.page(pattern, definition)` and APIs with
`app.api(pattern, definition)`.

A page always registers GET. A page with `action` also registers POST at the
same pattern. APIs register their declared method. Static routes use direct map
lookup; dynamic routes are compiled on registration and ordered by specificity.

Before middleware runs, production requests are checked against `allowedHosts`
when configured. Rejected hosts receive HTTP 421 with `cache-control: no-store`.
Development intentionally bypasses this application host check.

## Request context and middleware

For every request, core creates a `RequestContext` containing:

- the Web `Request` and parsed URL;
- matched path parameters and `URLSearchParams` query;
- typed `get`/`set` storage keyed by `ContextKey<T>` identity.

Middleware runs once in declaration order and may short-circuit with a response.
Calling `next()` more than once is rejected. Stable middleware IDs are exposed
in `cocoframe inspect` in actual execution order.

## Page GET

```text
page.load(context)
  -> page.meta(data, context)
  -> page.status(data, context)
  -> page.view(data, context)
  -> streaming response OR buffered error-boundary response
```

The status precedence is an explicit action-render status, then page status,
then HTTP 200. Invalid status values fail rendering.

Without a page `error` boundary, core returns a streaming HTML response. With an
`error` boundary, it intentionally renders the complete node to a string first,
so a render failure can still return a correct buffered HTTP 500 page. A page
error response is marked `noindex, nofollow`.

The document renderer applies escaped metadata, title defaults, SEO fields,
stylesheets, and runtime assets. Static pages do not receive the island
bootstrap. A document containing an island receives the configured client
module; deferred content uses the external stream module.

## Page POST action and forms

```text
POST route
  -> page.action(context)
  -> Response: return it unchanged
  -> ActionRender: rerender the page with its status
  -> void: redirect to the same path and query with HTTP 303
```

`createForm(schema)` wraps this action flow. It parses HTML form data and runs
the schema once. On validation failure it stores field state in a typed context
key, removes configured and conventionally named sensitive values, and asks
core to rerender with HTTP 422. On success, the submit callback controls the
response or falls through to the normal 303 behavior.

Cookie-authenticated forms pair `CsrfField` with `csrfProtection`. The field
reads the request token from typed context; the security middleware validates
trusted origin and the double-submit value before unsafe work proceeds.

## Contracted API

```text
matched API
  -> collect raw params, query, and optional body
  -> validate every declared input section
  -> aggregate validation issues
  -> api.handle({ ...context, input })
  -> pass through a custom Response, or validate and JSON-encode plain output
```

Input contract failures return HTTP 400 with `VALIDATION_ERROR` and
machine-readable paths. Output contract failures return HTTP 500 with
`OUTPUT_VALIDATION_ERROR`; detailed output issues are development-only. A
stable API ID adds the serializable contract to the manifest used by inspect,
typed-client generation, and OpenAPI generation.

## Unmatched and system requests

After middleware, an unmatched request is checked in this order:

1. Configured liveness and readiness endpoints.
2. Automatic `/robots.txt` and `/sitemap.xml` endpoints.
3. The generic HTTP 404 page.

Readiness catches application check failures and returns only `ready` or
`not-ready`; it does not expose dependency details. Sitemap generation includes
only static GET page routes, excluding API, action, system, parameterized, and
catch-all patterns.

## Streaming and failure behavior

The JSX renderer emits ordered escaped chunks. `defer(promise, fallback)` emits
a stable boundary immediately; completed content arrives in inert templates and
the external stream runtime applies it. Deferred failures preserve the fallback
and do not expose server details.

Unhandled pre-stream failures become a sanitized HTTP 500 in production and an
escaped development diagnostic in development. Development failures that occur
during streaming use the same accessible external-script error overlay. Browser
runtime failures also report through that overlay only in development.

Security middleware wraps the existing response body when adding headers, so it
must preserve streaming rather than consume and rebuild the body.

## Lifecycle-sensitive tests

- Core dispatch, status, pages, APIs, streaming, SEO, and failures: `tests/core.test.ts`.
- Route ordering and matching: `tests/router.test.ts`.
- Node body limits, aborts, proxy trust, backpressure, and shutdown: `tests/server-node.test.ts`.
- Forms and security middleware: `tests/forms.test.ts` and `tests/security.test.ts`.
- Production islands, strict CSP, form 422/303, deferred streaming, and 404: `tests/e2e/runtime.spec.ts`.
- Development runtime overlay: `tests/e2e/development.spec.ts`.
