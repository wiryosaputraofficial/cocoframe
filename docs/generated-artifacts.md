# CocoFrame Generated Artifacts

Generated files are derived from application source and framework generators.
Never implement a change by editing generated output directly.

## Generator ownership

The generator and build implementation lives in
`packages/cli/src/project.ts`. `packages/cli/src/main.ts` exposes it through the
CLI. `tests/project.test.ts` verifies discovery, generation, build metadata,
asset hashing, and the reference application integration.

## Inputs and outputs

| Input | Generator/build step | Output | Commit/edit policy |
| --- | --- | --- | --- |
| `app/routes/**/*.route.ts` API IDs and schemas plus OpenAPI config | `npm run generate` / client generation | `app/generated/cocoframe-client.ts` | Derived; regenerate after contract changes. |
| The same API contract manifest | `npm run generate` or `npm run openapi` | `app/generated/openapi.json` | Derived; regenerate after contract or API metadata changes. |
| `*.module.css` class selectors | CSS type generation | Adjacent `*.module.d.css.ts` | Derived; never hand-edit. |
| Public package manifests, exports, TypeScript declarations, and JSDoc | `npm run docs:api` | `examples/basic/app/generated/api-reference.ts` | Derived public API data; checked by `npm run docs:check` and rendered at `/docs/api-reference`. |
| `specs/<feature>/spec.json` reviewed decisions | `cocoframe spec generate <feature>` | Adjacent `prd.md`, `flow.mmd`, `data-model.mmd`, `acceptance.md`, `decisions.md`, and `tasks.md` | Derived review views; edit answers in `spec.json`, then regenerate. |
| `refs/<name>/ref.json` references, inventory, and approvals | Every `cocoframe ref` state transition | Adjacent `reference-report.md`, `component-map.md`, and `decisions.md` | Derived review views; change state through `cocoframe ref`. |
| `qa/<feature>/qa.json` QA decisions, cases, gates, defects, and approval | Every `cocoframe qa` state transition | Adjacent `test-plan.md`, `traceability.md`, `qa-report.md`, and `defects.md` | Derived review views; record decisions and evidence through the canonical QA contract. |
| Approved CocoRef candidate | `cocoframe ref approve <name> <component>` | `app/components/<component>.tsx`, module CSS, and regenerated CSS declaration | Promoted application source; temporary candidate and preview route are removed. |
| Routes, layouts, config, islands, CSS, UI/icon imports, and public assets | Development build | `.cocoframe/dev/server.mjs`, `assets.json`, `deploy.json`, source maps, and `public/` | Temporary development output; do not use as source. |
| The same production inputs | Production build | `.cocoframe/server.mjs`, `assets.json`, `deploy.json`, and `public/` | Build output; do not hand-edit. |
| Package TypeScript source | `npm run packages:build` | `.cocoframe/package-build` plus staged package output | Publishing output; source remains under `packages/*/src`. |
| Playwright execution | `npm run test:e2e` | `.cocoframe/playwright-results` and CI HTML report | Test evidence; never source. |

The root scripts target `examples/basic`, so paths above are relative to that
application when those scripts run.

## Generation sequence

`npm run generate` invokes the CLI generate command. The generation path builds
the production application first, imports its `CocoFrameApp`, and reads the
runtime contract manifest. It then writes:

1. the Fetch-standard typed client;
2. exact CSS module declarations;
3. OpenAPI 3.1 from the same API contracts.

This shared source is intentional: runtime validation, inspect output, client
types, and OpenAPI must not drift into parallel contract systems.

`npm run docs:api` separately regenerates the public package reference from
package manifests, TypeScript declarations, and JSDoc. `npm run docs:check`
fails when that checked-in artifact is stale.

## Build sequence

`buildProject(projectRoot, development)` performs these high-level steps:

1. Discover routes, inherited layouts, islands, CSS modules, global styles,
   imported UI primitives, and direct icon imports.
2. Create a virtual server entry that registers routes and configures island
   asset URLs.
3. Build browser entries for client bootstrap, deferred streaming, development
   diagnostics when applicable, and each named island.
4. Extract UI, global, development, and scoped-module CSS into one stylesheet.
5. Copy the application's `public/` directory into generated public output.
6. Resolve built filenames and write `assets.json`.
7. Build `server.mjs` with the resolved assets embedded.
8. Write `deploy.json` for runtime/deployment tooling.

Development output uses stable filenames and source maps under
`.cocoframe/dev`. Production browser assets and CSS use content hashes under
`.cocoframe`, enabling immutable caching. The directories are separate so a
production build or generator does not replace files served by the development
watcher.

## Asset manifests

`assets.json` is versioned and maps logical runtime assets to built URLs:

- client bootstrap;
- deferred stream runtime;
- extracted stylesheets;
- every island name to its module URL.

`deploy.json` is versioned and identifies the Node target, server module,
public directory, and asset manifest. `cocoframe start` consumes production
output rather than rediscovering application source.

## Change impact rules

- API ID, method, path, input, output, or OpenAPI metadata change: run `npm run generate`; inspect the client and OpenAPI diff.
- CSS module class change: run generation; inspect the adjacent declaration.
- Island name or filename change: keep the stable lowercase name aligned, build, inspect the island manifest, and run E2E.
- Asset pipeline or hashing change: build and verify development and production manifests plus immutable production asset headers.
- Route discovery or layout convention change: update CLI discovery tests, run inspect, build, and relevant E2E.
- Package export change: run typecheck, package build/pack smoke checks when the publish surface is affected, and verify a consumer import.

## Safety checks

The build refuses to clean generated public assets if the resolved directory is
outside the application's `.cocoframe` root. Preserve this containment check in
all cleanup changes.

Before accepting generated diffs, confirm they were produced by the documented
command, contain no secrets or machine-specific paths, and correspond to a
reviewed source-contract change.
