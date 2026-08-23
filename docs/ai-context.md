# CocoFrame AI Context

This document is the starting point for AI agents working in this repository. It
is an index and routing guide, not a replacement for the architecture, source,
tests, or package documentation.

## Goal

Help an agent answer these questions quickly and accurately before it changes
the framework:

1. Which subsystem owns the requested behavior?
2. What is the public contract of that subsystem?
3. Which invariants must remain true?
4. Which tests prove the behavior?
5. Which generated artifacts and downstream consumers are affected?

## Required reading order

Read only as deeply as the task requires, but always begin in this order:

1. `AGENTS.md` for repository-wide rules and required verification.
2. `docs/architecture.md` for system boundaries and request lifecycle.
3. The nearest package manifest, README, public entry point, and types for the
   subsystem being changed.
4. Focused tests for the current behavior.
5. One representative application or fixture that exercises the behavior.
6. Generator code before changing any generated contract or artifact.

When a nested directory contains another `AGENTS.md`, its instructions also
apply to files under that directory.

## Source-of-truth hierarchy

When documentation and implementation disagree, do not silently choose one.
Use this hierarchy to investigate the mismatch:

1. Public behavior asserted by tests and published types.
2. Public entry points and runtime implementation.
3. Architecture decisions and explicit repository rules.
4. Examples and guides.
5. Generated output.

Generated files are evidence of generator behavior, not the place to implement
a fix. Update the generator or source contract and regenerate the output.

## Framework invariants

Treat the following as architectural constraints unless the task explicitly
changes the architecture and updates its tests and documentation:

- Server rendering is the default; browser JavaScript is opt-in.
- Interactive components live in `app/islands/*.island.tsx` and use a stable,
  lowercase `defineIsland` name matching the filename.
- Pages stream by default. A page with an `error` boundary intentionally buffers
  so a render failure can still produce a correct HTTP 500 response.
- A page owns its `load`, `meta`, and `view` behavior.
- Supplementary content may use `defer`; SEO-critical content and structured
  metadata remain immediate and have an accessible fallback.
- Dynamic HTML is escaped by default. Raw HTML requires an explicit API.
- Mutations use a page `action` or API route. Successful form actions normally
  return a 303 redirect.
- Forms use one `createForm(schema)` controller for parsing, values, and errors.
  Invalid submissions rerender with HTTP 422 and preserve only non-sensitive
  string values.
- Cookie-authenticated unsafe requests require matching CSRF middleware and
  `CsrfField`. Tokens, cookies, authorization headers, and request bodies must
  not be logged.
- API contracts have one stable ID, validate input and output with
  `@cocoframe/schema`, and normally return plain data.
- Generated clients remain Fetch-standard and UI-framework-independent.
- Cache behavior belongs to the page contract, not ad-hoc HTML headers.
- Cross-cutting request behavior belongs in ordered middleware configured by
  `cocoframe.config.ts`; typed context keys replace string-keyed globals.
- Reusable middleware has a stable `defineMiddleware` ID.
- Security headers remain outside render code. CSP changes must be tested with
  static pages, islands, and deferred streaming.
- Credentialed CORS never uses wildcard origins. Production applications use
  explicit allowed hosts when exposed to untrusted Host headers.
- Forwarded host, protocol, and client IP are trusted only when the direct peer
  is an explicitly configured trusted proxy.
- Database code releases acquired connections, declares transaction support,
  and passes query values separately from SQL. Deployed migrations are ordered,
  immutable, and uniquely identified.
- One `AbortSignal` spans body parsing, application handling, and response
  streaming. A body is not buffered merely to enforce a size limit.
- Production assets use content hashes and resolve through the generated asset
  manifest; development filenames remain stable.
- Readiness failures expose availability only. Shutdown marks readiness false
  before draining requests.
- Public APIs stay small, typed, explicit, dependency-light, and do not expose
  compiler or bundler implementation details.

## Task routing

Use this table to decide what to inspect before editing. Confirm actual paths
with repository search; the concepts are stable even if implementation paths
move.

| Task | Inspect first | Also verify |
| --- | --- | --- |
| Routing or pages | Router, page types, request dispatcher | load/meta/view ownership, status codes, streaming |
| Rendering or streaming | renderer, response writer, error boundaries | abort propagation, headers, buffered error behavior |
| Islands or reactivity | island registry/compiler, browser runtime | stable names, hydration payload, CSP, e2e |
| Forms or actions | `createForm`, action dispatch, form primitives | 422 values/errors, 303 success, secrets, CSRF |
| API contracts | contract definitions, schema integration | generated client/OpenAPI, Fetch compatibility |
| Middleware | config loading, middleware composition, context keys | ordering, stable IDs, inspect output |
| Authentication | session verification and cookie handling | authorization remains explicit; secrets stay server-only |
| Security | host/proxy/CORS/CSRF/CSP code | negative tests and no sensitive logging |
| Cache | page cache declarations and cache runtime | HTML/data distinction, invalidation, headers |
| Database | adapter interface, pool lifecycle, migrations | release paths, transactions, parameterized SQL |
| Assets or CSS modules | asset pipeline, manifest, CSS declarations | dev/prod names, generated declarations, e2e |
| UI primitives | `@cocoframe/ui` public surface | server-first output and zero browser runtime by default |
| Shutdown/readiness | server lifecycle and health handlers | readiness-before-drain and sanitized failures |
| Performance | hot path and benchmark fixture | both required benchmarks and behavioral tests |

## Fast discovery procedure

Before editing, collect a compact evidence set rather than reading the whole
repository linearly:

1. Locate public symbols and filenames with `rg`.
2. Read the public entry point and exported types.
3. Trace one happy path and one failure path through the runtime.
4. Locate tests that name the public behavior, status code, header, or error.
5. Locate representative usage in examples, fixtures, or applications.
6. Search for generated consumers and package-boundary imports.
7. Write down the expected behavior before changing code.

Useful searches:

```sh
rg --files -g "AGENTS.md" -g "package.json" -g "README*" -g "*.test.*" -g "*.spec.*"
rg "export |defineIsland|defineMiddleware|createForm|contract" .
rg "303|422|AbortSignal|allowedHosts|trusted proxy|CSRF|CSP" .
rg "generated|do not edit|OpenAPI|asset manifest" .
```

Exclude dependency, build, coverage, and generated-output directories when a
search becomes noisy. Never assume a symbol is unused until package entry
points, tests, examples, and generated consumers have been checked.

## Change protocol

For every framework behavior change:

1. State the current contract and the intended contract.
2. Identify the smallest owning subsystem and public API impact.
3. Add or update a focused test that fails for the old behavior.
4. Implement without editing generated output directly.
5. Run `npm run generate` when an API contract changes.
6. Update architecture or user documentation when the contract changes.
7. Run the verification matrix below.

Avoid broad cleanup in the same change unless it is required for correctness.
Preserve unrelated user changes in the working tree.

## Verification matrix

Always run before handoff:

```sh
npm test
npm run check
npm run inspect
```

Also run `npm run test:e2e` for browser runtime, islands, forms, CSP, visual, or
responsive changes. Run both repository benchmarks for performance-sensitive
changes. If a command cannot run, report the exact command, failure, and what
remains unverified.

## Handoff format

A useful AI handoff is short and evidence-based. Include:

- Outcome and user-visible behavior.
- Files changed and why.
- Public API or compatibility impact.
- Tests and checks run, with results.
- Generated artifacts refreshed, if any.
- Remaining risks, assumptions, or unverified areas.

Do not describe a task as complete while a required check is failing or has not
been run without clearly stating that limitation.

## Keeping this context accurate

Update this file when a cross-cutting invariant, task route, required command,
or source-of-truth rule changes. Keep detailed subsystem documentation near its
implementation and link to it from here; do not turn this file into a duplicate
manual for the entire framework.

The next useful companion documents are:

- `docs/repository-map.md`: package ownership, public entry points, and key tests.
- `docs/request-lifecycle.md`: one end-to-end request trace, including failures.
- `docs/generated-artifacts.md`: generators, inputs, outputs, and commands.
- `docs/testing.md`: test layers, fixtures, commands, and selection guidance.
- `docs/decisions/`: short architecture decision records for non-obvious choices.

Create those documents from verified source paths and tests. Do not populate
them from naming assumptions.
