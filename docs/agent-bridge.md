# Agent Bridge

Agent Bridge gives supported AI clients one provider-independent MCP surface for
understanding and safely changing a CocoFrame workspace. Discovery and lifecycle
preparation remain read-only. File writes use an exact, role-aware approval
boundary; AI agents cannot approve their own operations.

## Start a local MCP server

Install `@cocoframe/cli`, then configure an MCP client to run:

```json
{
  "mcpServers": {
    "cocoframe": {
      "command": "cocoframe",
      "args": ["agent", "."]
    }
  }
}
```

Standard output carries only MCP JSON-RPC. Sanitized operational errors use
standard error. The client owns the process lifetime.

## Tools and permissions

| Tool | Permission | Purpose |
| --- | --- | --- |
| `project.inspect` | `read` | Returns routes, APIs, components, islands, middleware, dependencies, and generated capabilities. |
| `project.doctor` | `read` | Returns the same versioned, actionable read-only diagnostics as `cocoframe doctor --json`. |
| `docs.search` | `read` | Searches documentation and generated API references. |
| `component.find` | `read` | Finds reusable application and framework components. |
| `api.lookup` | `read` | Finds filename-discovered and contracted APIs. |
| `workflow.status` | `read` | Reads canonical lifecycle state. |
| `cocospecs.next` | `read` | Returns only the next adaptive CocoSpecs batch or an in-memory proposal. |
| `cocoux.inspect` | `read` | Reads journeys, states, interactions, visual recommendations, PNG evidence, and handoff state through the canonical CocoUX engine. |
| `cocoref.audit` | `read` | Audits existing components before proposing missing UI. |
| `cocoqa.trace` | `read` | Traces acceptance criteria, cases, gates, evidence, defects, and approval. |
| `mutation.plan` | `write` | Validates and hashes an explicit file-write proposal without changing declared targets. |
| `mutation.execute` | `write` | Executes only an approved, unchanged, unexpired target subset once. |

Every tool advertises versioned input/output schemas, description, and permission
metadata. Protocol v2 mutation schemas include workflow and target verification;
read-only protocol v1 calls remain compatible. Responses are limited to 1 MiB.
Workspace scans are bounded to 10,000 files and canonical lifecycle documents to
1 MiB.

## Controlled mutation workflow

Agent Bridge protocol v2 makes the lifecycle order enforceable instead of a
prompt convention. Protocol v1 clients may continue to call read-only tools, but
every v1 mutation is rejected.

1. Call `project.inspect` and `project.doctor`, then search documentation, components, and APIs for
   reusable capabilities.
2. Call `cocospecs.next`. Create or resume the canonical CocoSpec through the
   owning CLI/editor lifecycle, answer only the returned adaptive batch, and
   obtain explicit CocoSpec approval.
3. When journey or visual direction must be designed, complete CocoUX, review its
   local PNG evidence, and obtain human approval. CocoUX approval allows only a
   CocoRef handoff and never source promotion.
4. For user-facing work, record one visual decision: `reference`,
   `no-reference`, or `not-applicable`. A reference requires a ready CocoRef
   whose existing-component audit is complete. Reference-free visual work
   requires the current Design Profile.
5. Call `mutation.plan` with protocol v2, one workflow binding, exact file
   changes, and one accessibility declaration for every changed static
   `href`, `to`, or `action` target.
6. Agent Bridge re-inspects the workspace, validates canonical lifecycle state,
   uses the CLI's route convention to verify existing and proposed destinations,
   and creates a hash-only plan without changing source files.
7. A human approves all or a subset of the exact targets through MCP elicitation,
   an editor host, or the separate CLI approval command.
8. Call `mutation.execute`. The bridge revalidates inspection, lifecycle,
   target, workflow, approval, expiry, and file hashes immediately before writing.
9. Run or resume CocoQA. Runtime target reachability, interaction accessibility,
   visual alignment, responsive/overflow behavior, and CocoRef fidelity when
   applicable remain required evidence. A completed file write is not release
   approval.

A user-facing plan has this shape:

```json
{
  "protocolVersion": 2,
  "action": "files.write",
  "workflow": {
    "version": 1,
    "intent": "user-facing",
    "feature": "login",
    "visual": true,
    "referenceDecision": "no-reference",
    "targets": [
      {
        "source": "app/routes/index.page.tsx",
        "target": "/login",
        "accessibleName": "Sign in",
        "keyboard": true,
        "visibleFocus": true,
        "actionMatchesLabel": true
      }
    ]
  },
  "changes": [
    {
      "path": "app/routes/login.page.tsx",
      "content": "..."
    }
  ]
}
```

For an out-of-band CLI decision:

```bash
cocoframe agent approve <operation-id> --project . --role application-developer

# Partial approval
cocoframe agent approve <operation-id> --project . --role application-developer --targets app/routes/login.page.tsx,app/components/login-form.tsx

cocoframe agent deny <operation-id> --project . --role application-developer
cocoframe agent cancel <operation-id> --project . --role application-developer
cocoframe agent expire <operation-id> --project . --role application-developer
```

A CocoFrame framework repository requires the `framework-maintainer` role.
Application workspaces accept `application-developer` or
`framework-maintainer`. An AI-agent role is never accepted by the approval API.
## Approval integrity and records

MCP multi-round approval state uses an ephemeral 256-bit HMAC key and is bound to
the tool method and active session. The signed payload contains only operation
ID, session ID, and reviewed hash. Approval decisions are immutable, expire with
the operation after fifteen minutes by default, and are consumed before writes.
Changing a target, inspected capability, approved CocoSpec, CocoRef, component
inventory, or Design Profile after review returns `STATE_CONFLICT`.

`.cocoframe/agent/` stores versioned, hash-only session, plan, approval, claim,
execution, and audit records. It never stores prompts, proposal content, diffs,
request bodies, credentials, tokens, cookies, authorization headers, or secrets.
The directory is ignored by Git.

## Deliberate limits

Phase 3 supports create/update file writes only. It provides no deletion,
arbitrary shell, subprocess, dependency installation, Git operation, commit,
push, pull request, npm publish, deployment, database mutation, migration,
provider-owned crawling or browser automation, background job, or
outside-workspace access. External target checks accept only sanitized provider
evidence. Generated
artifacts must still be refreshed through their owning CocoFrame commands.

Verify Agent Bridge with `tests/agent.test.ts`,
`tests/agent-lifecycle.test.ts`, `tests/agent-mutation.test.ts`,
`npm run check`, `npm test`, and `npm run inspect`.
