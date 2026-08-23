# CocoFrame AI guide

Read `docs/ai-context.md` to locate the owning package, relevant lifecycle,
generated artifacts, and verification required for the task.

- Keep public APIs small, typed, explicit, and dependency-light.
- For a new user-facing feature, workflow, data model, or integration whose
  behavior is not already fully specified, create or resume a CocoSpec, ask only
  its next adaptive question batch, and record reviewed answers. Generate review
  artifacts and obtain explicit `approved` state before implementation. Small
  mechanical fixes do not require a full product interview.
- For image- or website-reference work, create or resume a CocoRef, audit
  existing UI before proposing new components, and ask for explicit consent for
  every missing component. Promote only the exact previewed source after approval;
  remove temporary previews on approval or cancellation.
- After implementation, create or resume CocoQA from the approved CocoSpec and
  completed CocoRef when applicable. Ask its adaptive quality questions before
  execution, run required gates, record sanitized evidence and defects, and do
  not claim release readiness until the canonical QA state is `approved`.
- Server rendering is the default. Browser JavaScript must be opt-in.
- Interactive components live in `app/islands/*.island.tsx` and use one stable,
  lowercase `defineIsland` name matching the filename.
- Reusable styles use `*.module.css`; do not hard-code generated scoped names.
- Pages stream unless they declare an `error` boundary, which intentionally
  buffers that page so failures can still produce a correct 500 response.
- Mutations use a page `action` or an API route; successful form actions should
  normally return a 303 redirect.
- Declare cache behavior on the page instead of setting ad-hoc HTML headers.
- Contracted APIs have one stable `id`, validate input and output with
  `@cocoframe/schema`, and return plain data unless a custom `Response` is required.
- Run `npm run generate` after an API contract changes; never edit generated
  clients, OpenAPI, or CSS module declarations manually. Run `npm run docs:api`
  after public package exports, signatures, or JSDoc change; never edit the
  generated API reference manually.
- Use `defer` only for supplementary content. Keep SEO-critical copy and
  structured metadata immediate, and provide an accessible fallback.
- Keep session secrets server-only. `@cocoframe/auth` verifies session integrity but
  does not replace authorization checks or password hashing.
- Put cross-cutting request behavior in ordered middleware declared by
  `cocoframe.config.ts`; use typed context keys instead of string-keyed globals.
- Give reusable middleware a stable `defineMiddleware` ID so it appears clearly
  in `cocoframe inspect`.
- Keep security headers outside render code. Any CSP change must be tested with
  static pages, islands, and deferred streaming.
- CORS origins must be explicit. Do not combine credentialed CORS with wildcard
  origins.
- Apply CSRF protection to cookie-authenticated unsafe requests. Do not log CSRF
  tokens, cookies, authorization headers, or request bodies.
- Rate-limit keys must come from verified identity or a configured trusted proxy;
  never trust forwarded client headers implicitly. The built-in limiter is local
  to one process.
- Database adapters must always release acquired connections and must declare
  transaction support explicitly.
- Use parameterized SQLite queries. Keep migrations ordered, immutable, and
  uniquely identified after deployment.
- PostgreSQL code passes values separately from SQL and runs production
  migrations through the advisory-locked migration helper.
- Generated clients must remain Fetch-standard and UI-framework-independent so
  the same contract works for web and mobile.
- Keep one AbortSignal across Node body parsing, application handling, and
  response streaming. Never buffer a body merely to enforce its size limit.
- Never trust forwarded host, protocol, or client IP unless the direct peer is
  explicitly configured as a trusted proxy.
- Production apps exposed to untrusted Host headers should declare explicit
  `allowedHosts`; do not use wildcard hosts.
- Production browser assets use content hashes and must be resolved through the
  generated asset manifest; development filenames remain stable.
- Readiness failures return only availability state, never dependency errors or
  credentials. Shutdown must mark readiness false before draining requests.
- Use one `createForm(schema)` controller for parsing, values, and errors; do not
  duplicate validation rules in a page action.
- Invalid forms rerender with HTTP 422 and preserve non-sensitive string values.
  Successful form mutations normally redirect with 303.
- Cookie-authenticated forms include `CsrfField` and matching CSRF middleware.
  Never retain password or secret field values after validation failure.
- Prefer `@cocoframe/ui` semantic primitives before creating an application-specific
  equivalent. UI primitives stay server-first and browser-runtime-free unless
  interactivity genuinely requires an island.
- Use `bind(signal)` or `bind(computed(...))` when only reactive text changes.
  Reading `.value` in an island view intentionally opts into a boundary re-render.
- A page owns `load`, `meta`, and `view`; do not create parallel conventions.
- Escape dynamic HTML by default. Raw HTML must require an explicit API.
- Prefer Web Standard `Request` and `Response` at framework boundaries.
- Add a focused test for every behavior change.
- Do not add a package when a small, tested implementation is sufficient.
- Do not expose compiler or bundler details through application APIs.

Run `npm test`, `npm run check`, and `npm run inspect` before handoff. Run
`npm run test:e2e` for browser runtime, island, form, CSP, visual, or responsive
changes, and run both benchmarks before handing off a performance-sensitive
change.