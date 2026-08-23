# CocoFrame Testing Guide

Use the smallest focused test while developing, then run the repository gates
required by `AGENTS.md` before handoff.

## Test layers

| Layer | Command or location | Purpose |
| --- | --- | --- |
| Type contract | `npm run check` | Strict TypeScript verification across packages, examples, tests, and benchmarks. |
| Unit/integration | `npm test` | Serial Node tests in `tests/*.test.ts`; package behavior plus CLI/project integration. |
| Project inspection | `npm run inspect` | Validates the discoverable route, API, middleware, UI, icon, and asset surface of `examples/basic`. |
| Generation | `npm run generate` | Rebuilds contract client, OpenAPI, and CSS declarations from source. |
| Production build | `npm run build` | Produces the reference application's production server and hashed assets. |
| Browser E2E | `npm run test:e2e` | Development Chromium, production Chromium/Firefox/WebKit, and five responsive Chromium viewports. |
| Package smoke | `npm run packages:smoke` | Builds, packs, and exercises publishable package artifacts. |
| Performance | `npm run benchmark`, `npm run benchmark:http`, `npm run benchmark:http:concurrent` | Renderer, sequential HTTP, and concurrent HTTP baselines. |
| Full gate | `npm run quality` | Check, unit tests, inspect, build, and E2E. Generation remains an explicit additional gate when derived contracts are affected. |

## Focused unit test routing

Each package has a same-name test under `tests/`, except CLI project behavior is
covered by `tests/project.test.ts` and the creator by
`tests/create-cocoframe.test.ts`.

- Rendering/escaping: `tests/jsx.test.ts`.
- Route matching: `tests/router.test.ts`.
- Page/API/middleware dispatch and SEO: `tests/core.test.ts`.
- Signals/islands/bindings: `tests/client.test.ts`.
- Build, route discovery, generated contracts, assets, and docs alignment: `tests/project.test.ts`.
- Schema/forms/security/auth: their matching test files.
- Database contract and concrete adapters: `database*.test.ts`.
- UI and icons: `ui.test.ts` and `icons.test.ts`.
- CocoQL language, semantics, safety, permissions, planning, and SQL compilers: `cocoql.test.ts` plus the relevant `docs/cocoql-*.md` specification.

Run one Node test file during iteration with:

```sh
node --test --test-concurrency=1 tests/core.test.ts
```

Keep serial execution for tests that build or mutate shared reference output.

## Browser matrix

`playwright.config.ts` starts isolated development and production servers on
ports 3210 and 3211. It does not reuse existing servers.

- `development-chromium` runs `development.spec.ts` and verifies island mounting plus the accessible runtime-error overlay.
- `production-chromium`, `production-firefox`, and `production-webkit` run `runtime.spec.ts` and verify strict CSP, islands, catalog interaction, server forms, deferred streaming, and 404 behavior without client errors.
- `viewport-320`, `phone-6-inch`, `tablet`, `laptop`, and `4k` run `responsive.spec.ts` against critical pages, checking overflow, images, keyboard reachability, and responsive navigation.

Use `npm run test:e2e:runtime` for the runtime spec across its configured
projects, or `npm run test:e2e:chromium` for the bundled Chromium-focused matrix.
Run the full E2E command before handing off changes to browser runtime, islands,
forms, CSP, visual behavior, or responsive layout.

## Required selection by change

| Change | Minimum additional verification |
| --- | --- |
| Framework behavior in one package | Matching focused test, `npm test`, `npm run check`, `npm run inspect` |
| API contract or schema manifest | Above plus `npm run generate`; inspect client and OpenAPI diffs |
| CLI discovery/build/assets/CSS | `tests/project.test.ts`, generate/build as applicable, inspect, E2E when browser output changes |
| Island/reactivity/stream runtime | Client/core tests and full E2E |
| Forms/CSRF/CSP/security headers | Forms/security/core tests and full E2E |
| UI/icon or responsive output | UI/icon/project tests and full E2E |
| Node request lifecycle/proxy/shutdown | Server-node and core tests; add HTTP benchmark if hot-path performance may change |
| Performance-sensitive behavior | Behavioral gates plus all relevant baselines; run both required renderer and HTTP benchmarks at minimum |
| Published package surface | Typecheck, package build/pack smoke, and a representative consumer import |

## Test design rules

- Add a focused regression test for every behavior change.
- Assert public behavior: response status, headers, body, manifest, public type, generated contract, or visible browser behavior.
- Cover the failure path when it defines a security, cleanup, status, abort, or privacy invariant.
- Keep fixtures minimal. Use `examples/basic` when integration with discovery, generation, documentation, or production assets is the behavior under test.
- Do not weaken a test merely to accept a changed implementation. State and review the intended contract first.
- Avoid timing-only assertions when observable ordering, state, or output can be asserted directly.

## Handoff evidence

Report every command actually run and whether it passed. If a required command
was skipped or failed, include the exact reason and the remaining risk. Do not
summarize partial E2E coverage as the full browser matrix.
