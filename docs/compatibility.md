# CocoFrame Compatibility Policy

CocoFrame is currently an architectural MVP. Until a stable release, changes may
still evolve, but public contracts remain deliberate and migration impact must be
documented.

## Public surface

The following are public compatibility boundaries:

- package exports declared in `packages/*/package.json`;
- exported TypeScript types, functions, classes, and constants at those entries;
- page, route, island, middleware, config, schema, form, and adapter conventions;
- Web Request/Response behavior, public status codes, headers, and error codes;
- API contract manifests, generated Fetch clients, OpenAPI, CSS declarations,
  asset/deployment manifests, and `cocoframe inspect` output;
- documented CLI commands and project templates.

Unexported implementation details, `.cocoframe` build contents beyond documented
manifests, and test-only helpers are internal.

## Change rules

- Prefer additive changes that preserve existing typed calls and runtime output.
- A breaking change updates the package version, public docs, focused tests,
  examples, generated artifacts, and a migration note together.
- Deprecations identify the replacement and planned removal version; do not add
  silent aliases or a second lifecycle convention.
- Generated client and OpenAPI changes originate from one reviewed API contract.
- Manifest format changes increment their explicit version.
- Security fixes may tighten invalid behavior immediately, with the impact clearly documented.

Before handoff, use `.cocoframe/context.json` to review public symbols and
downstream outputs, then run the verification selected in `docs/testing.md`.

## PostgreSQL

`@cocoframe/database-postgres` supports PostgreSQL server majors 14 through 18.
Every supported major runs the real-driver integration suite in CI. A server
major is removed only after it leaves the upstream support window and the change
is documented in a package release.
