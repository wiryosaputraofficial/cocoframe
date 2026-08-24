# @cocoframe/agent

Provider-independent, approval-aware Agent Bridge contracts for CocoFrame.

Start local MCP stdio with `cocoframe agent <project>`. The tool surface is:

- Discovery: `project.inspect`, `docs.search`, `component.find`, `api.lookup`,
  and `workflow.status`.
- Read-only lifecycle preparation: `cocospecs.next`, `cocoref.audit`, and
  `cocoqa.trace`.
- Controlled mutation: `mutation.plan` and `mutation.execute`.

`mutation.plan` declares at most twenty workspace-relative file writes, validates
confinement and secret rules, records current and proposed SHA-256 hashes, and
keeps proposal content only in the active process memory. It never changes a
declared target. `mutation.execute` succeeds only after an unexpired human or
host approval is bound to the same operation, session, reviewed hashes, role,
and selected target subset.

Modern MCP clients receive a native elicitation form whose retry state is
HMAC-protected. Editor hosts may call the non-MCP `decideOperation` method. A
user may also decide through the separate CLI channel:

```bash
cocoframe agent approve <operation-id> --project . --role application-developer
cocoframe agent deny <operation-id> --project . --role application-developer
```

Framework repositories require `framework-maintainer` approval. Decisions are
immutable, approvals are single-use and expire after fifteen minutes, target
changes invalidate execution, and multi-file failures are rolled back. Hash-only
session, plan, decision, execution, and audit records live under
`.cocoframe/agent/`, which is ignored by Git.

Agent Bridge never exposes delete, shell, install, Git, commit, publish, deploy,
database, external-service, or outside-workspace mutation capabilities.
Responses remain schema-discoverable and capped at 1 MiB.

Verify with `tests/agent.test.ts`, `tests/agent-lifecycle.test.ts`,
`tests/agent-mutation.test.ts`, `npm run check`, `npm test`, and
`npm run inspect`.