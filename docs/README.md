# CocoFrame Documentation

This directory is the canonical GitHub manual for CocoFrame. It documents the
current `0.x` framework, the released npm packages, the application lifecycle,
and the reviewed AI-assisted product workflow.

> CocoFrame is an architectural MVP. Use exact package versions for production
> experiments, review the [compatibility policy](compatibility.md), and validate
> every release with CocoQA and the required quality gates.

## Start here

| Reader | Recommended path |
| --- | --- |
| New application developer | [Getting started](getting-started.md) → [task recipes](recipes/README.md) → [configuration](configuration.md) → [deployment](deployment.md) |
| Framework evaluator | [Architecture](architecture.md) → [request lifecycle](request-lifecycle.md) → [compatibility](compatibility.md) → [testing](testing.md) |
| Product designer or product engineer | [Product workflow](product-workflow.md) → [CocoSpecs](cocospecs.md) → [CocoUX](cocoux.md) → [CocoRef](cocoref.md) → [CocoQA](cocoqa.md) |
| AI-agent integrator | [AI context](ai-context.md) → [Agent Bridge](agent-bridge.md) → [product workflow](product-workflow.md) → [generated artifacts](generated-artifacts.md) |
| Database engineer | [Database recipe](recipes/add-database.md) → [CocoQL language](cocoql-language-spec.md) → [PostgreSQL integration](cocoql-postgresql.md) |
| Maintainer | [Contributing](https://github.com/wiryosaputraofficial/cocoframe/blob/main/CONTRIBUTING.md) → [repository map](repository-map.md) → [testing](testing.md) → [security policy](https://github.com/wiryosaputraofficial/cocoframe/blob/main/SECURITY.md) |

## Five-minute application

Prerequisites: Node.js 24 or newer and npm, pnpm, Yarn, or Bun.

```bash
npm create cocoframe@latest my-app
cd my-app
npm run dev
```

Open `http://127.0.0.1:3000`, then inspect and diagnose the project:

```bash
npm run inspect
npx cocoframe doctor
```

Build and run the production output:

```bash
npm run build
npm start
```

The creator also provides `marketing`, `dashboard`, and `documentation`
templates. See [Getting started](getting-started.md) for structure, first page,
first island, first API, and the complete development loop.

## Product-to-release workflow

```text
brief
  → CocoSpec: product decisions and acceptance criteria
  → CocoUX: journeys, states, interactions, visual direction, PNG evidence
  → CocoRef: reference audit, component consent, exact-source preview
  → implementation: server-first application source
  → CocoDoctor: deterministic project diagnostics
  → CocoQA: traceability, gates, defects, release approval
```

CocoUX approval accepts only the previewed visual direction. CocoRef approval
controls promotion of exact component source. CocoQA approval is the final
release-readiness boundary. Read [Product workflow](product-workflow.md) for the
states, artifacts, commands, and approval responsibilities.

## Application development

- [Getting started](getting-started.md): installation, templates, project
  structure, first route, island, API, and production build.
- [Configuration](configuration.md): application metadata, middleware, health,
  hosts, runtime environment variables, and secure defaults.
- [CLI reference](cli-reference.md): every top-level and workflow command,
  options, output, and exit behavior.
- [Task recipes](recipes/README.md): minimal golden paths for pages, islands,
  forms, APIs, middleware, sessions, databases, and streaming failures.
- [Generated artifacts](generated-artifacts.md): source ownership, generation
  sequence, manifests, and files that must never be edited manually.
- [Deployment](deployment.md): production build, runtime contract, reverse
  proxies, health checks, graceful shutdown, and deployment checklist.
- [Troubleshooting](troubleshooting.md): deterministic diagnosis ordered from
  Doctor through focused subsystem checks.

## Architecture and contracts

- [Architecture](architecture.md): components, pages, routes, islands,
  adapters, packages, security boundaries, and performance invariants.
- [Request lifecycle](request-lifecycle.md): matching, middleware, page GET,
  form POST, contracted API, streaming, and failure behavior.
- [Repository map](repository-map.md): package ownership, public entry points,
  representative application, and high-value tests.
- [Compatibility policy](compatibility.md): public boundaries, `0.x` change
  rules, deprecations, manifests, and PostgreSQL support.
- [Error catalog](errors.md): stable HTTP, framework, Doctor, and recovery
  signals.
- [Architecture decisions](decisions/): server-first rendering, islands, Web
  Standards, error buffering, and contract ownership.

## AI-assisted product engineering

- [CocoSpecs](cocospecs.md): adaptive product discovery and reviewed decisions.
- [CocoUX](cocoux.md): actors, journeys, complete states, interactions, visual
  recommendations, and hash-bound PNG previews.
- [CocoRef](cocoref.md): image/website sources, reuse audit, missing-component
  consent, preview revisions, and exact-source promotion.
- [CocoQA](cocoqa.md): adaptive QA, requirement traceability, allow-listed
  gates, sanitized evidence, defects, and explicit approval.
- [Product Design Quality](product-design-quality.md): Design Profiles, tokens,
  inventory reuse, responsive evidence, alignment, contrast, and fidelity.
- [Agent Bridge](agent-bridge.md): provider-independent MCP discovery and
  controlled, role-aware, hash-bound mutation.
- [AI context](ai-context.md): repository routing and invariants for coding
  agents.

## CocoQL and databases

- [CocoQL language specification](cocoql-language-spec.md)
- [Grammar](cocoql-grammar.md), [schema](cocoql-schema.md), and
  [relations](cocoql-relations.md)
- [Permissions](cocoql-permissions.md), [safety](cocoql-safety.md), and
  [safety policy](cocoql-safety-policy.md)
- [Semantic dates](cocoql-semantic-dates.md),
  [aggregation](cocoql-aggregation.md), and [query plans](cocoql-query-plan.md)
- [Mutations](cocoql-mutations.md) and
  [mutation preview](cocoql-mutation-preview.md)
- [Structured errors](cocoql-structured-errors.md) and
  [AI guidelines](cocoql-ai-guidelines.md)
- [Complete PostgreSQL integration](cocoql-postgresql.md)

## Operations and quality

- [CocoFrame Doctor](cocodoctor.md): read-only diagnostics, CI use, JSON
  contract, check matrix, diagnostic catalog, and privacy guarantees.
- [Testing](testing.md): unit, integration, E2E browser matrix, package smoke,
  and performance gates.
- [Deployment](deployment.md): Node production bundle, assets, health,
  proxy trust, shutdown, and rollback.
- [Troubleshooting](troubleshooting.md): common failure paths and escalation
  evidence.
- [Changelog](https://github.com/wiryosaputraofficial/cocoframe/blob/main/CHANGELOG.md): release-level behavior and package versions.

## Package catalog and API reference

Use [packages.md](packages.md) to select the owning package, current version,
npm page, local README, and primary responsibility. Public exports and JSDoc are
generated from TypeScript source into the local website at
`/docs/api-reference`; run `npm run docs:api` after changing exports,
signatures, or JSDoc.

## Documentation source of truth

When documentation and implementation disagree, investigate in this order:

1. public behavior asserted by tests and published types;
2. package exports and runtime implementation;
3. repository rules and architecture decisions;
4. guides and examples;
5. generated output.

Generated clients, OpenAPI, CSS declarations, API reference data, build
manifests, and workflow review views are derived artifacts. Change their owning
source and regenerate them.

## Contributing and support

Use [CONTRIBUTING.md](https://github.com/wiryosaputraofficial/cocoframe/blob/main/CONTRIBUTING.md) for setup, change protocol, tests,
documentation standards, and pull-request evidence. Report security issues
privately according to [SECURITY.md](https://github.com/wiryosaputraofficial/cocoframe/blob/main/SECURITY.md). For ordinary defects,
include the sanitized `cocoframe doctor --json` report, reproduction steps,
expected behavior, actual behavior, Node version, and package versions.
