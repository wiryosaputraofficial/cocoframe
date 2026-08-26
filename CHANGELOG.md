# Changelog

## 2026-08-26 - CocoQL PostgreSQL, CocoUX, and CocoFrame Doctor

### CocoQL PostgreSQL

- Complete parameterized PostgreSQL reads and guarded transactional mutations.
- Add UUID, JSON/JSONB, array, full-text search, CTE, predicate, distinct,
  cursor, lock, `RETURNING`, and `ON CONFLICT` support.
- Add acquisition/query timeouts, AbortSignal cancellation, connection
  recovery, bounded retries, result limits, sanitized errors, and telemetry.
- Add advisory-locked checksum-verified migrations and PostgreSQL 14–18 real
  integration coverage.

### CocoUX

- Add provider-independent actors, reachable journeys, complete state matrices,
  accessible interactions, transitions, and reuse-first visual recommendations.
- Add managed server-rendered previews and hash-bound PNG evidence across
  mobile, tablet, desktop, and 4K viewports.
- Add revision feedback, explicit human approval, temporary-preview cleanup,
  and CocoRef handoff without promoting preview source.
- Bind CocoUX evidence into Agent Bridge and CocoQA.

### CocoFrame Doctor and QA

- Add deterministic default and isolated deep project diagnosis through
  `cocoframe doctor`.
- Add stable human/JSON diagnostics for environment, package versions, routes,
  islands, generated artifacts, static configuration, security, and builds.
- Add strict CI behavior, sanitized evidence, cancellation, stable exit codes,
  and Agent Bridge integration.
- Expand CocoQA coverage for approved CocoUX journeys, states, interactions,
  screenshots, references, and Product Design Quality.

### Documentation and packages

- Add complete CocoQL PostgreSQL, CocoUX, CocoDoctor, CLI, configuration,
  deployment, troubleshooting, package, workflow, contribution, and security
  documentation.
- Add a responsive GitHub Pages documentation site built from the canonical
  `docs/` Markdown source.
- Publish `@cocoframe/cocoql@0.2.0` and
  `@cocoframe/database-postgres@0.1.0`.
- Publish `@cocoframe/ux@0.0.1`, `@cocoframe/qa@0.1.0`,
  `@cocoframe/agent@0.1.0`, `@cocoframe/cli@0.1.0`, and
  `create-cocoframe@0.0.9`.

## 0.0.8 - 2026-08-24

### Agent Bridge Workflow Guardrails

- Require project inspection and an approved CocoSpec before user-facing mutation planning.
- Require an explicit visual-reference decision, with CocoRef component auditing when a reference is provided and a hash-bound Design Profile when it is not.
- Bind mutation approvals to versioned workflow state and revalidate that state immediately before execution.
- Verify changed routes, links, anchors, APIs, and external-target evidence before implementation can be reported complete.
- Add Product Design Quality alignment criteria and mandatory CocoQA cases for target reachability and interaction integrity.
- Trace completed CocoRef criteria into CocoQA fidelity coverage.
- Preserve provider-independent MCP contracts and stable machine-readable workflow diagnostics.

### Published packages

- `@cocoframe/qa@0.0.3`
- `@cocoframe/agent@0.0.3`
- `@cocoframe/cli@0.0.8`
- `create-cocoframe@0.0.8`
