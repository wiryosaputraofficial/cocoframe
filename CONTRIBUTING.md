# Contributing to CocoFrame

Thank you for improving CocoFrame. This guide defines the expected setup,
change process, documentation, verification, and pull-request evidence for the
framework repository.

CocoFrame is currently an experimental `0.x` project. Keep changes small,
typed, explicit, dependency-light, and compatible with its server-first and Web
Standard boundaries.

## Before starting

Read:

1. [`AGENTS.md`](AGENTS.md) for repository-wide invariants and mandatory gates;
2. [`docs/architecture.md`](docs/architecture.md) for subsystem boundaries;
3. the owning package manifest, README, public entry point, and types;
4. focused tests for current behavior;
5. one representative application or fixture.

Use [`docs/repository-map.md`](docs/repository-map.md) to locate ownership and
[`docs/ai-context.md`](docs/ai-context.md) when working with an AI coding agent.

## Development setup

Requirements:

- Node.js 24 or newer;
- npm;
- Git;
- Chromium, Firefox, and WebKit for the full E2E matrix;
- PostgreSQL 14–18 only when running the real PostgreSQL integration suite.

```bash
git clone https://github.com/wiryosaputraofficial/cocoframe.git
cd cocoframe
npm install
npx playwright install chromium firefox webkit
npm run check
npm test
npm run inspect
```

Run the reference application:

```bash
npm run dev
```

Open `http://127.0.0.1:3000`. The documentation center is at `/docs`, generated
API reference at `/docs/api-reference`, UI catalog at `/components`, icon
catalog at `/icons`, and CocoQL center at `/cocoql`.

## Choose the owning subsystem

Do not solve a problem by adding a parallel convention. Typical ownership:

| Change | Owner |
| --- | --- |
| Component rendering and escaping | `@cocoframe/jsx` |
| Route matching | `@cocoframe/router` |
| Page/API/middleware lifecycle | `@cocoframe/core` |
| Islands and browser reactivity | `@cocoframe/client` |
| Project discovery/build/generation/Doctor | `@cocoframe/cli` |
| Runtime validation | `@cocoframe/schema` |
| Forms | `@cocoframe/forms` |
| CSP/CORS/CSRF/rate limiting | `@cocoframe/security` |
| Session integrity | `@cocoframe/auth` |
| Database lifecycle | `@cocoframe/database` and concrete adapter |
| CocoQL intent and planning | `@cocoframe/cocoql` |
| Product/UX/reference/QA workflow | `@cocoframe/specs`, `@cocoframe/ux`, `@cocoframe/cocoref`, `@cocoframe/qa` |
| AI protocol and controlled mutation | `@cocoframe/agent` |

See the complete [package catalog](docs/packages.md).

## Product and design changes

A new user-facing feature, workflow, data model, or integration whose behavior
is not already fully specified requires a CocoSpec before implementation:

```bash
cocoframe spec create <feature> --brief "<goal>"
```

Journey, state, interaction, or visual-direction work requires CocoUX. Image or
website reference implementation requires CocoRef and explicit consent for each
missing component. After implementation, create or resume CocoQA and do not
claim release readiness until its canonical state is approved.

Mechanical fixes that do not alter product behavior do not require a new
product interview, but still require a focused regression test and relevant
documentation.

## Implementation rules

- Server rendering is the default; browser JavaScript is opt-in through
  `app/islands/*.island.tsx`.
- Keep one stable lowercase island name matching its filename.
- A page owns `load`, `meta`, `view`, `action`, and `error` behavior.
- Use `defer` only for supplementary content with an accessible fallback.
- Use schema-backed contracted APIs with one stable ID.
- Use `createForm(schema)` as the single form parsing/value/error controller.
- Successful form mutations normally redirect with 303; invalid forms rerender
  with 422 and retain no sensitive values.
- Use ordered middleware and typed context keys for cross-cutting request state.
- Keep security headers outside render code; credentialed CORS is never
  wildcard; cookie-authenticated unsafe requests require CSRF.
- Pass database values separately from SQL and always release connections.
- Do not expose compiler or bundler implementation through application APIs.
- Add a focused test for every behavior change.
- Do not add a package when a small tested implementation is sufficient.

## Generated artifacts

Run `npm run generate` after changing an application API contract or CSS module
classes. Run `npm run docs:api` after changing package exports, signatures, or
JSDoc.

Never manually edit:

- generated Fetch clients;
- OpenAPI output;
- `*.module.d.css.ts` declarations;
- generated API-reference data;
- `.cocoframe` build/package/preview output;
- CocoSpec, CocoUX, CocoRef, or CocoQA derived review views.

See [`docs/generated-artifacts.md`](docs/generated-artifacts.md).

## Tests

During development, run the focused matching test:

```bash
node --test --test-concurrency=1 tests/core.test.ts
```

Required before handoff:

```bash
npm test
npm run check
npm run inspect
```

Additional gates:

- API contracts or CSS module output: `npm run generate`;
- package exports or JSDoc: `npm run docs:api` and `npm run docs:check`;
- production/bundler behavior: `npm run build`;
- browser runtime, islands, forms, CSP, visual, or responsive behavior:
  `npm run test:e2e`;
- publishable package changes: `npm run packages:smoke`;
- performance-sensitive changes: renderer and relevant HTTP/PostgreSQL
  benchmarks.

Read [`docs/testing.md`](docs/testing.md) for the full selection matrix.

## Documentation changes

Public behavior changes update the focused GitHub guide, owning package README,
examples, generated API reference, and migration/changelog note when relevant.

Documentation should:

- state prerequisites and version/status boundaries;
- use commands and symbols verified against implementation;
- distinguish canonical source from generated output;
- document failure, security, and cleanup behavior;
- use relative links within the repository and stable public links externally;
- avoid credentials, private URLs, machine-specific paths, and unsanitized logs.

The GitHub Pages site is built from `docs/`. Do not create a second copy of the
manual in a separate site generator.

## Commit and pull request

Use a focused commit message such as:

```text
feat: add cancellation to PostgreSQL reads
fix: preserve form status on validation rerender
docs: expand CocoFrame Doctor diagnostics
```

A pull request should include:

- the user-visible outcome;
- owning subsystem and public API impact;
- compatibility or migration impact;
- tests and gates actually run;
- generated artifacts refreshed;
- sanitized evidence for browser, performance, or database behavior;
- unresolved risks or intentionally unverified areas.

Do not describe a change as release-ready while a required gate is failing or a
canonical CocoQA record is not approved.

## Reporting defects and vulnerabilities

Use GitHub Issues for non-security defects and include the checklist from
[`docs/troubleshooting.md`](docs/troubleshooting.md). Report vulnerabilities
privately according to [`SECURITY.md`](SECURITY.md).
