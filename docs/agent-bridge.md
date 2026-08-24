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
| `docs.search` | `read` | Searches documentation and generated API references. |
| `component.find` | `read` | Finds reusable application and framework components. |
| `api.lookup` | `read` | Finds filename-discovered and contracted APIs. |
| `workflow.status` | `read` | Reads canonical lifecycle state. |
| `cocospecs.next` | `read` | Returns only the next adaptive CocoSpecs batch or an in-memory proposal. |
| `cocoref.audit` | `read` | Audits existing components before proposing missing UI. |
| `cocoqa.trace` | `read` | Traces acceptance criteria, cases, gates, evidence, defects, and approval. |
| `mutation.plan` | `write` | Validates and hashes an explicit file-write proposal without changing declared targets. |
| `mutation.execute` | `write` | Executes only an approved, unchanged, unexpired target subset once. |

Every tool advertises versioned input/output schemas, description, and permission
metadata. Responses are limited to 1 MiB. Workspace scans are bounded to 10,000
files and canonical lifecycle documents to 1 MiB.

## Controlled mutation workflow

1. The AI calls `mutation.plan` with `action: "files.write"` and one to twenty
   explicit `{ path, content }` changes.
2. Agent Bridge confines every path, rejects links that escape the workspace,
   blocks secret-bearing files and likely literal credentials, hashes current
   and proposed content, and stores proposal content only in process memory.
3. The returned operation lists target path, create/update mode, current hash,
   proposed hash, required role, expiry, and one combined reviewed hash.
4. A human decides through MCP elicitation, an editor's host-only
   `decideOperation` API, or a separate CLI command.
5. `mutation.execute` validates the session, role, approval, expiry, selected
   target hashes, current workspace state, and single-use claim.
6. Only the approved subset is written. Any later target is left unchanged.
7. A multi-file failure restores every already-written target. A rollback
   failure returns `PARTIAL_MUTATION` and blocks further execution.

For an out-of-band CLI decision:

```bash
cocoframe agent approve <operation-id> \
  --project . \
  --role application-developer

# Partial approval
cocoframe agent approve <operation-id> \
  --project . \
  --role application-developer \
  --targets app/routes/login.page.tsx,app/components/login-form.tsx

cocoframe agent deny <operation-id> --project . --role application-developer
cocoframe agent cancel <operation-id> --project . --role application-developer
cocoframe agent expire <operation-id> --project . --role application-developer
```

A CocoFrame framework repository requires the `framework-maintainer` role.
Application workspaces accept `application-developer` or `framework-maintainer`.
An AI-agent role is never accepted by the approval API.

## Approval integrity and records

MCP multi-round approval state uses an ephemeral 256-bit HMAC key and is bound to
the tool method and active session. The signed payload contains only operation
ID, session ID, and reviewed hash. Approval decisions are immutable, expire with
the operation after fifteen minutes by default, and are consumed before writes.
Changing a target after review returns `STATE_CONFLICT`.

`.cocoframe/agent/` stores versioned, hash-only session, plan, approval, claim,
execution, and audit records. It never stores prompts, proposal content, diffs,
request bodies, credentials, tokens, cookies, authorization headers, or secrets.
The directory is ignored by Git.

## Deliberate limits

Phase 3 supports create/update file writes only. It provides no deletion,
arbitrary shell, subprocess, dependency installation, Git operation, commit,
push, pull request, npm publish, deployment, database mutation, migration,
external-service action, background job, or outside-workspace access. Generated
artifacts must still be refreshed through their owning CocoFrame commands.

Verify Agent Bridge with `tests/agent.test.ts`,
`tests/agent-lifecycle.test.ts`, `tests/agent-mutation.test.ts`,
`npm run check`, `npm test`, and `npm run inspect`.