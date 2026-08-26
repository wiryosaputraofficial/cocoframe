# CocoFrame CLI Reference

The `cocoframe` executable owns project discovery, development, generation,
diagnostics, production builds, product workflow state, and the local Agent
Bridge. Install it through an application created by `create-cocoframe`, or add
`@cocoframe/cli` as a development dependency.

```bash
npm install --save-dev @cocoframe/cli
npx cocoframe --help
```

Generated templates expose the most common commands as npm scripts. The CLI is
an executable boundary, not an application library API.

## Project commands

| Command | Result |
| --- | --- |
| `cocoframe dev [project]` | Build development output, serve on loopback, watch application/config/public files, and send live-reload events. |
| `cocoframe build [project]` | Build the production server, hashed browser assets, asset manifest, and deployment manifest. |
| `cocoframe start [project]` | Serve an existing production build. |
| `cocoframe inspect [project]` | Print versioned JSON for routes, layouts, islands, styles, UI/icons, contracts, middleware, and system routes. |
| `cocoframe generate [project]` | Generate the Fetch client, OpenAPI 3.1 document, and CSS module declarations. |
| `cocoframe openapi [project]` | Regenerate only OpenAPI. |
| `cocoframe doctor [project] [options]` | Run stable read-only project diagnostics. |

`project` defaults to the current directory.

### Development server

```bash
PORT=3000 cocoframe dev .
```

Development binds to `127.0.0.1`. It watches `app/`, `public/`,
`cocoframe.config.ts`, CocoUX preview files, and CocoRef preview files. A failed
rebuild is reported to the development browser overlay without replacing the
last valid application.

### Inspect

```bash
cocoframe inspect . > inspect.json
```

Use inspect before scanning an unfamiliar application. It builds an isolated
inspect bundle to expose the actual contracted route and middleware surface.

### Generate

```bash
cocoframe generate .
```

Outputs:

- `app/generated/cocoframe-client.ts`;
- `app/generated/openapi.json`;
- one adjacent `*.module.d.css.ts` for each `*.module.css`.

Generation builds the application contract first. Never edit its outputs by
hand.

### Doctor

```bash
cocoframe doctor
cocoframe doctor ./apps/storefront --json
cocoframe doctor --deep --strict
```

Options:

| Option | Behavior |
| --- | --- |
| `--json` | Emit Doctor contract version 1 as JSON. |
| `--deep` | Add an isolated production build with a 60-second limit. |
| `--strict` | Treat a warning-only report as a failing exit status. |

Exit codes are `0` for accepted results, `1` for errors or strict warnings, and
`2` for cancellation or an internal Doctor failure. See
[CocoFrame Doctor](cocodoctor.md).

## CocoSpecs commands

```text
cocoframe spec create <feature> [--brief <text>]
  [--mode quick|standard|thorough] [--project <path>]
cocoframe spec resume <feature> [--json] [--project <path>]
cocoframe spec answer <feature> <question-id> [value]
  [--status answered|assumed|deferred|not-applicable] [--project <path>]
cocoframe spec check <feature> [--json] [--project <path>]
cocoframe spec generate <feature> [--json] [--project <path>]
cocoframe spec approve <feature> [--json] [--project <path>]
```

Canonical state is `specs/<feature>/spec.json`. Generated PRD, flow, data model,
acceptance criteria, decisions, and tasks are review views. Approval requires
all blocking questions and completeness checks to be resolved. See
[CocoSpecs](cocospecs.md).

## CocoUX commands

```text
cocoframe ux create <feature> --brief <goal>
  [--spec <approved-spec>] [--ref <completed-ref>]
cocoframe ux resume|status <feature> [--json]
cocoframe ux answer <feature> [section] --input <json-file>
cocoframe ux check <feature>
cocoframe ux generate <feature>
cocoframe ux preview <feature> [--port 3212] [--theme light]
cocoframe ux feedback <feature> <message>
cocoframe ux approve <feature> [--role application-developer]
cocoframe ux handoff <feature> [--ref <name>]
cocoframe ux cancel <feature>
```

`answer` accepts a complete `CocoUxDesign` JSON document or a named section.
`preview` generates local server-rendered preview routes and PNG evidence for
the applicable state/viewport matrix. Approval authorizes only the visual
direction; it never promotes preview TSX or CSS. See [CocoUX](cocoux.md).

## CocoRef commands

```text
cocoframe ref create <name> (--image <file> | --website <url>)
  [--title <text>] [--project <path>]
cocoframe ref add <name> (--image <file> | --website <url>) [--project <path>]
cocoframe ref audit <name> [--requirements <json-file>] [--project <path>]
cocoframe ref status <name> [--json] [--project <path>]
cocoframe ref consent|decline <name> <requirement> [--project <path>]
cocoframe ref preview <name> <requirement> [--port <number>] [--project <path>]
cocoframe ref feedback <name> <requirement> <message> [--project <path>]
cocoframe ref approve|cancel <name> <requirement> [--project <path>]
```

CocoRef audits the current component inventory before proposing source. Every
missing component requires explicit consent. Only the exact previewed source is
promoted after approval. See [CocoRef](cocoref.md).

## CocoQA commands

```text
cocoframe qa create <feature> --spec <approved-feature>
  [--ux <approved-ux>] [--ref <completed-reference>]
  [--design <profile>] [--mode standard|thorough]
cocoframe qa resume|status|plan|report <feature> [--json] [--project <path>]
cocoframe qa answer <feature> <question-id> [value] [--status <status>]
cocoframe qa run <feature> [--gate <gate-id>] [--project <path>]
cocoframe qa record <feature> <case-id> pass|fail|blocked|n/a --evidence <text>
cocoframe qa defect <feature> <defect-id> --title <text>
  --severity critical|high|medium|low --steps <text>
cocoframe qa resolve <feature> <defect-id> <resolution>
  [--as resolved|accepted]
cocoframe qa check|approve <feature> [--json] [--project <path>]
```

The canonical file is `qa/<feature>/qa.json`. Only allow-listed package scripts
can run as automated gates. Evidence is sanitized before it enters canonical
state. Approval requires resolved questions, passing required cases and gates,
and no open defect. See [CocoQA](cocoqa.md).

## Agent Bridge commands

Start MCP over standard input/output:

```bash
cocoframe agent .
cocoframe agent serve ./apps/storefront
```

Record a host-only mutation decision:

```text
cocoframe agent approve|deny|cancel|expire <operation-id>
  --role application-developer|framework-maintainer
  [--project <path>] [--targets <comma-separated-paths>]
  [--actor <label>] [--json]
```

Mutation approval is role-aware, hash-bound, target-bound, expiring, and
single-use. It is deliberately outside the MCP tool surface. Read
[Agent Bridge](agent-bridge.md) before enabling mutation tools.

## Production runtime environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` in production | Production listen host. |
| `PORT` | `3000` | Development or production listen port. |
| `COCOFRAME_MAX_BODY_BYTES` | `1048576` | Incremental request-body limit. |
| `COCOFRAME_REQUEST_TIMEOUT_MS` | `30000` | Shared request lifecycle deadline. |
| `COCOFRAME_TRUSTED_PROXIES` | empty | Comma-separated verified direct proxy addresses. Wildcards are invalid. |
| `COCOFRAME_SHUTDOWN_DELAY_MS` | `0` | Optional delay after readiness becomes false. |
| `COCOFRAME_SHUTDOWN_TIMEOUT_MS` | `10000` | Graceful-drain deadline before remaining connections close. |

All integer values must be non-negative integers. Proxy trust changes security
semantics; configure only direct peers that are actually controlled.

## Common application scripts

Generated projects include:

```json
{
  "scripts": {
    "dev": "cocoframe dev .",
    "build": "cocoframe build .",
    "start": "cocoframe start .",
    "check": "tsc --noEmit",
    "inspect": "cocoframe inspect .",
    "spec": "cocoframe spec",
    "ref": "cocoframe ref",
    "qa": "cocoframe qa",
    "generate": "cocoframe generate ."
  }
}
```

Add an `ux` script if the team prefers npm-script aliases:

```json
"ux": "cocoframe ux"
```

## Safety rules

- Do not edit generated clients, OpenAPI, CSS declarations, workflow review
  views, or `.cocoframe` output manually.
- Run Doctor before manually debugging an unfamiliar project.
- Do not treat CocoUX approval as source approval or CocoRef approval as release
  approval.
- Never place tokens, cookies, authorization headers, passwords, or production
  personal data in workflow answers or evidence.
