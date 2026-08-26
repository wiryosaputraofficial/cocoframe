# CocoFrame Error Catalog

Stable public error codes let applications, tests, and AI diagnose failures
without parsing prose.

| Status/code | Owner | Meaning | First check |
| --- | --- | --- | --- |
| `400 VALIDATION_ERROR` | core/schema | Contracted API params, query, or body failed schema validation. | Inspect aggregated `issues` paths and the route input schema. |
| `422 VALIDATION_ERROR` | core forms compatibility | A schema-backed form action requested validation rerendering. | Inspect field issues and retained non-sensitive values. |
| HTTP 422 form rerender | forms | `createForm` rejected form data and stored accessible field state. | Check content type, schema, and `controller.field` usage. |
| `421 HOST_NOT_ALLOWED` | core | Production host is outside explicit `allowedHosts`. | Check normalized host and deployment config; wildcards are invalid. |
| `500 OUTPUT_VALIDATION_ERROR` | core/schema | API handler returned data outside its declared output schema. | Compare plain handler data with the output contract; details are development-only. |
| `403 CORS_ORIGIN_DENIED` | security | Preflight origin is not explicitly allowed. | Check the exact origin and CORS allowlist/predicate. |
| `405 CORS_METHOD_DENIED` | security | Requested preflight method is not allowed. | Check configured methods. |
| `403 CSRF_ORIGIN_DENIED` | security | Unsafe request origin is neither same-origin nor trusted. | Check Origin and trusted-origin configuration. |
| `403 CSRF_TOKEN_INVALID` | security/forms | Double-submit cookie and header/form token do not match. | Check cookie policy, `CsrfField`, and middleware scope. |
| `429 RATE_LIMITED` | security | Explicit application key exceeded the local window. | Check verified key derivation, limit/window, and process topology. |
| `413 PAYLOAD_TOO_LARGE` | server-node | Body exceeded `maxBodyBytes` during incremental reading. | Check payload and runtime limit; do not add a second buffering layer. |
| `408 REQUEST_TIMEOUT` | server-node | Shared request lifecycle exceeded `requestTimeoutMs`. | Trace the request signal through handler and streaming work. |
| `500 INTERNAL_SERVER_ERROR` | server-node | Unexpected adapter failure before headers were sent. | Inspect controlled server logs; public response is intentionally sanitized. |
| HTTP 404 | core | No route or system/SEO endpoint matched. | Run `npm run inspect` and check filename-derived patterns. |
| HTTP 500 page error | core | Page load/meta/view/render failed. | Check whether the page has a buffering `error` boundary and inspect development diagnostics. |

## CocoFrame Doctor diagnostics

`cocoframe doctor` returns contract version 1 diagnostics with a stable `code`,
severity, category, sanitized evidence, suggestion, and documentation reference.
Common codes include:

| Code | Meaning | Recovery |
| --- | --- | --- |
| `PROJECT_NOT_FOUND` | The selected directory is not a CocoFrame project. | Run Doctor from the generated application root. |
| `COCOFRAME_DEPENDENCY_MISSING` | A declared CocoFrame package is not installed. | Install dependencies. |
| `COCOFRAME_DEPENDENCY_VERSION_MISMATCH` | The installed package does not satisfy the declared version. | Restore the coordinated package versions. |
| `ISLAND_NAME_MISMATCH` | `defineIsland` name differs from the island filename. | Make the stable lowercase names identical. |
| `GENERATED_ARTIFACT_MISSING` / `GENERATED_ARTIFACT_STALE` | Client, OpenAPI, or CSS declarations need regeneration. | Run `cocoframe generate`. |
| `ALLOWED_HOSTS_WILDCARD` / `CREDENTIAL_CORS_WILDCARD` | Production trust configuration is unsafe. | Declare explicit trusted hosts or origins. |
| `DEEP_BUILD_FAILED` / `DEEP_CHECK_TIMEOUT` | The isolated production build failed or exceeded its limit. | Run `cocoframe build` for full local compiler diagnostics. |
| `DOCTOR_INTERNAL_FAILURE` | Doctor itself failed unexpectedly. | Upgrade, retry, and report the stable code if it persists. |

CocoQL has versioned structured stages, codes, paths, and source locations; use
`docs/cocoql-structured-errors.md` instead of extending this table with language-
specific diagnostics. Public production errors must not expose secrets,
dependency failures, cookies, authorization headers, request bodies, or stacks.
