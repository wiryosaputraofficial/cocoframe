# CocoFrame Doctor

CocoFrame Doctor is the canonical read-only diagnostic engine for developers,
CI, and AI clients. It turns common project failures into stable codes,
sanitized evidence, and actionable suggestions before a developer has to debug
the framework manually.

Doctor is delivered by `@cocoframe/cli` and shares its report types with
`@cocoframe/agent`.

## Run Doctor

```bash
cocoframe doctor
cocoframe doctor ./apps/storefront
cocoframe doctor --json
cocoframe doctor --deep
cocoframe doctor --deep --strict
```

Default mode performs static checks. Deep mode adds the canonical production
build in a temporary output directory.

## Modes and guarantees

| Behavior | Default | `--deep` |
| --- | --- | --- |
| Validate project manifest and Node version | Yes | Yes |
| Validate workspace confinement | Yes | Yes |
| Discover routes, islands, dependencies, and generated capabilities | Yes | Yes |
| Check package installation/version alignment | Yes | Yes |
| Check island name/filename alignment | Yes | Yes |
| Check generated client, OpenAPI, and CSS declaration freshness | Yes | Yes |
| Check unsafe static host, CORS, and proxy configuration | Yes | Yes |
| Build production output | Skipped | Isolated temporary directory |
| Execute the built application | No | No |
| Install packages or access the network | No | No |
| Change project source or generated artifacts | No | No |

The deep build has a 60-second limit. Temporary output is removed after the
check; a timeout is cleaned once the underlying build settles.

## Human output

```text
CocoFrame Doctor
Mode: default

PASS project.manifest: passed
PASS environment.node: passed
PASS project.discovery: passed
SKIP build.production: skipped

Result: healthy; 8 passed, 0 warning, 0 error, 1 skipped.
```

Diagnostics include a severity, stable code, message, sanitized evidence,
suggestion, and documentation path.

## JSON contract

```bash
cocoframe doctor --json > doctor-report.json
```

Representative shape:

```json
{
  "framework": "cocoframe",
  "contractVersion": 1,
  "mode": "default",
  "strict": false,
  "status": "warning",
  "project": ".",
  "checks": [
    { "id": "generated.freshness", "status": "warning" }
  ],
  "diagnostics": [
    {
      "code": "GENERATED_ARTIFACT_STALE",
      "severity": "warning",
      "category": "generated",
      "message": "Generated client artifact is older than an API route.",
      "evidence": ["app/generated/cocoframe-client.ts"],
      "suggestion": "Run cocoframe generate.",
      "documentation": "/docs/doctor#diagnostics"
    }
  ],
  "summary": {
    "checks": 9,
    "passed": 7,
    "warning": 1,
    "error": 0,
    "skipped": 1,
    "internalFailure": false
  },
  "truncated": false
}
```

Consumers should branch on `contractVersion`, `status`, check IDs, and
diagnostic codes—not prose formatting.

## Exit codes and CI

| Exit | Meaning |
| --- | --- |
| `0` | Healthy, or warnings accepted in non-strict mode. |
| `1` | At least one error, or at least one warning with `--strict`. |
| `2` | Operation cancelled or Doctor encountered an internal failure. |

Recommended CI step:

```bash
npx cocoframe doctor --deep --strict --json
```

Store the sanitized report as ordinary test evidence if desired. Do not attach
environment dumps, lockfile credentials, or unrelated application data.

## Checks

| Check ID | What it validates |
| --- | --- |
| `project.manifest` | Readable regular `package.json` and CocoFrame package/workspace identity. |
| `environment.node` | Node.js 24 or newer. |
| `project.workspace-safety` | Application entries are confined, regular, and safely accessible. |
| `project.discovery` | Static routes, islands, styles, and manifest structure can be inspected; route patterns are unique. |
| `dependencies.cocoframe` | Declared CocoFrame dependencies are installed and satisfy their versions. |
| `project.islands` | Each stable lowercase island name matches its filename. |
| `generated.freshness` | Client, OpenAPI, and CSS declarations exist and are not older than owning source. |
| `configuration.static` | Configuration is safely readable without executing it. |
| `security.static` | Static host/CORS/proxy trust does not contain known wildcard hazards. |
| `build.production` | Deep mode can produce the canonical production bundle in isolation. |

## Diagnostics

| Code | Severity | Recovery |
| --- | --- | --- |
| `PROJECT_NOT_FOUND` | Error | Run Doctor from a generated CocoFrame application root. |
| `PROJECT_MANIFEST_INVALID` | Error | Replace linked/non-file manifests and repair JSON. |
| `PROJECT_FILE_TOO_LARGE` | Error | Keep inspected project files below the 1 MiB safety limit. |
| `NODE_VERSION_UNSUPPORTED` | Error | Install Node.js 24 or newer. |
| `WORKSPACE_ACCESS_DENIED` | Error | Replace linked/unsafe application entries with confined regular files. |
| `ROUTE_DUPLICATE` | Error | Rename a route so each kind/pattern pair is unique. |
| `PROJECT_ROUTES_MISSING` | Warning | Add a page/API route or choose the correct project root. |
| `PROJECT_DISCOVERY_FAILED` | Error | Repair route, island, style, or manifest syntax. |
| `COCOFRAME_DEPENDENCY_MISSING` | Error/warning | Install declared dependencies. Missing dev-only dependencies are warnings. |
| `COCOFRAME_DEPENDENCY_VERSION_MISMATCH` | Error | Restore coordinated declared/installed versions. |
| `PROJECT_FILE_UNREADABLE` | Error | Keep the file confined, regular, readable, and below 1 MiB. |
| `ISLAND_NAME_MISMATCH` | Error | Match `defineIsland({ name })` to the lowercase filename. |
| `GENERATED_ARTIFACT_MISSING` | Warning | Run `cocoframe generate`. |
| `GENERATED_ARTIFACT_STALE` | Warning | Regenerate after API or CSS module changes. |
| `ALLOWED_HOSTS_WILDCARD` | Error | List production hosts explicitly. |
| `CREDENTIAL_CORS_WILDCARD` | Error | Replace wildcard origins when credentials are enabled. |
| `TRUSTED_PROXY_WILDCARD` | Error | List only verified direct proxy addresses. |
| `DEEP_BUILD_FAILED` | Error | Run `cocoframe build` to inspect detailed compiler output. |
| `DEEP_CHECK_TIMEOUT` | Error | Investigate build cost or run the production build directly. |
| `OPERATION_CANCELLED` | Error | Retry when the caller is ready. |
| `DOCTOR_INTERNAL_FAILURE` | Error | Upgrade, retry, and report the stable code if reproducible. |

Doctor caps output at 1,000 diagnostics and sets `truncated: true` when the cap is
reached.

Freshness checks allow one second of filesystem timestamp tolerance so a clean
Git checkout is not reported stale merely because files were extracted in a
different order. A meaningful source edit still requires regeneration.

## Privacy and security

Doctor does not execute application or configuration source in default mode.
It does not contact package registries, databases, APIs, or websites. Evidence
is capped, sorted deterministically, and redacts common token, password, secret,
cookie, API-key, and authorization patterns.

The JSON report intentionally uses `project: "."` rather than leaking an
absolute local path. Internal failures do not include project source, secrets,
or stack traces.

## Doctor and AI clients

Agent Bridge exposes the same engine through project diagnostics so an AI can:

1. inspect the project contract;
2. run Doctor before guessing at a failure;
3. branch on stable codes;
4. propose the documented recovery;
5. rerun the exact check after a user-approved change.

Doctor does not authorize mutations. Agent Bridge mutation plans still require
workflow binding, role-correct approval, target hashes, and post-change QA.

## When Doctor is not enough

- Use `cocoframe build` for full compiler diagnostics after
  `DEEP_BUILD_FAILED`.
- Use `npm run inspect` to review the complete route and contract manifest.
- Use focused package tests for behavior regressions.
- Use browser E2E for islands, forms, CSP, visual, and responsive behavior.
- Use CocoQA for requirement traceability and release approval.

Continue with [Troubleshooting](troubleshooting.md) and the
[error catalog](errors.md).
