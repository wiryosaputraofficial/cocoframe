# CocoFrame Troubleshooting

Use deterministic evidence before changing code or adding dependencies. Start
with the narrowest check that can identify the owner of the problem.

## First response

```bash
node --version
npm install
npm run check
npm run inspect
cocoframe doctor --json
cocoframe doctor --deep --strict
```

Node.js must be 24 or newer. Preserve the Doctor JSON, exact failing command,
expected result, actual result, and smallest reproduction. Remove credentials,
cookies, tokens, authorization headers, request bodies, production personal
data, and absolute private paths before sharing evidence.

## Project is not recognized

Symptoms: `PROJECT_NOT_FOUND`, invalid manifest, zero routes, or commands running
against the wrong directory.

Check:

```bash
pwd
node -p "require('./package.json').name"
cocoframe inspect .
```

Run from a generated application root whose manifest declares at least one
`@cocoframe/*` dependency. `package.json` must be a regular readable file.

## Dependency problems

Symptoms: `COCOFRAME_DEPENDENCY_MISSING`, version mismatch, package export not
found, or behavior inconsistent across machines.

```bash
npm install
npm ls --depth=0
npm view @cocoframe/cli version
cocoframe doctor --strict
```

Restore the versions declared by the project and commit the lockfile. CocoFrame
packages are coordinated; avoid mixing unpublished workspace output with
registry packages in a consumer reproduction.

## Route not found or duplicated

```bash
npm run inspect
```

Conventions:

- `app/routes/index.page.tsx` → `/`;
- `app/routes/about.page.tsx` → `/about`;
- `app/routes/users/[id].page.tsx` → `/users/:id`;
- `app/routes/docs/[...path].page.tsx` → `/docs/*path`;
- `*.route.ts`/`*.route.tsx` define API routes;
- `_layout.tsx` wraps pages in the same and nested directories.

Rename duplicate kind/pattern pairs. Do not register a parallel routing
convention.

## Island does not load

Doctor reports `ISLAND_NAME_MISMATCH` when the stable island name differs from
its filename.

```text
app/islands/counter.island.tsx
                    │
                    └── defineIsland({ name: "counter", ... })
```

Also check that props are JSON-safe, browser-only behavior remains inside the
island, event targets are accessible, and the production CSP allows the
external hashed island assets. Run the full browser E2E matrix after a runtime,
island, CSP, or responsive change.

## Generated files are missing or stale

Symptoms: missing typed client/OpenAPI/CSS declarations or
`GENERATED_ARTIFACT_MISSING`/`GENERATED_ARTIFACT_STALE`.

```bash
npm run generate
git diff -- app/generated '*.module.d.css.ts'
```

Change API contracts and CSS module source—not generated output. Regenerate
public API docs with `npm run docs:api` after package export, signature, or
JSDoc changes.

## Production build fails

```bash
cocoframe doctor --deep --strict
npm run build
```

Doctor deep mode intentionally returns a sanitized failure. Run the direct
build for detailed local compiler output. Check route imports, config imports,
island files, CSS modules, package versions, and generated contracts.

## Form returns 422

HTTP 422 is the expected invalid-form path. Use one `createForm(schema)`
controller for parsing, retained non-sensitive values, field errors, and
accessible props.

Check:

- form encoding and schema field names match;
- invalid submissions rerender through the same controller;
- sensitive values are never retained;
- successful mutations return a 303 redirect;
- cookie-authenticated unsafe requests include `CsrfField` and matching CSRF
  middleware.

## CSRF, CORS, host, or proxy rejection

| Failure | Check |
| --- | --- |
| `CSRF_ORIGIN_DENIED` | Exact Origin, deployment origin, trusted-origin configuration. |
| `CSRF_TOKEN_INVALID` | Double-submit cookie plus matching field/header token. |
| `CORS_ORIGIN_DENIED` | Explicit origin allowlist or predicate. |
| `CORS_METHOD_DENIED` | Configured allowed methods. |
| `HOST_NOT_ALLOWED` | Exact normalized production host in `allowedHosts`. |
| Doctor wildcard diagnostic | Remove wildcard hosts/origins/proxies. |

Never solve a rejection by combining credentials with wildcard CORS, trusting
all proxies, or disabling CSRF for cookie-authenticated mutations.

## Request timeout or large body

`PAYLOAD_TOO_LARGE` means the request exceeded
`COCOFRAME_MAX_BODY_BYTES`. `REQUEST_TIMEOUT` means the shared lifecycle
exceeded `COCOFRAME_REQUEST_TIMEOUT_MS`.

Keep one AbortSignal across parsing, application work, database calls, and
streaming. Do not add a second body buffer. Tune limits only after confirming
the expected payload and abuse boundary.

## Streaming behaves unexpectedly

- Pages stream unless they declare an `error` boundary.
- An error boundary intentionally buffers the page so a failure can return an
  accurate HTTP 500 response.
- `defer` is for supplementary content and leaves an accessible fallback.
- SEO-critical title, primary content, metadata, and structured data remain
  immediate.

Follow [Debug Streaming](recipes/debug-streaming.md) and inspect status, headers,
first chunks, fallback, and abort behavior separately.

## PostgreSQL integration fails

```bash
COCOFRAME_POSTGRES_URL=postgres://... npm run test:postgres
npm run benchmark:cocoql:postgres
```

The supported PostgreSQL server matrix is 14–18. Check pool acquisition,
`statement_timeout`, AbortSignal handling, SQLSTATE classification, result
limits, advisory-locked migration history, and connection release. Do not place
SQL, parameters, credentials, or server detail in public error evidence.

See [CocoQL PostgreSQL](cocoql-postgresql.md).

## CocoUX preview cannot be approved

Run:

```bash
cocoframe ux resume <feature>
cocoframe ux check <feature>
cocoframe ux preview <feature>
```

Resolve unreachable journeys, incomplete states, missing keyboard/focus/
feedback/recovery behavior, unresolved component decisions, or stale preview
hashes. Approval applies only to PNG-bound visual direction; source promotion
still belongs to CocoRef.

## CocoQA cannot be approved

```bash
cocoframe qa status <feature>
cocoframe qa check <feature>
cocoframe qa report <feature>
```

Approval remains blocked by deferred required questions, pending/failed/blocked
required cases, failed required gates, open defects, stale source hashes, or
missing design/reference evidence. Do not edit `qa.json` or generated reports to
bypass a gate; record new reviewed evidence through the workflow.

## GitHub issue checklist

For a non-security defect, include:

- concise expected and actual behavior;
- minimal repository or reproduction steps;
- Node.js, package-manager, OS, and exact CocoFrame package versions;
- failing command and sanitized output;
- `cocoframe doctor --json` output;
- whether development, production build, and E2E are affected;
- whether the issue reproduces without application-specific secrets/data.

Report vulnerabilities privately according to [SECURITY.md](https://github.com/wiryosaputraofficial/cocoframe/blob/main/SECURITY.md),
not in a public issue.
