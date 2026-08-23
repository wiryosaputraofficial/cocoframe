# CocoSpecs

CocoSpecs is CocoFrame's provider-independent discovery contract for AI-assisted
application work. It turns an initial request into reviewed product decisions
before implementation begins.

Use CocoSpecs for a new user-facing feature, workflow, data model, integration,
or other request whose behavior is not already fully specified. A small
mechanical correction does not require a full product interview.

## Lifecycle

```text
Initial request
  -> inspect existing project context
  -> create or resume specs/<feature>/spec.json
  -> ask the next adaptive question batch
  -> record answers, assumptions, deferrals, and not-applicable decisions
  -> check completeness
  -> generate PRD, flow, data model, acceptance criteria, decisions, and tasks
  -> obtain explicit approval
  -> implement against acceptance criteria
  -> verify behavior and update the spec when a decision changes
```

The canonical file is `specs/<feature>/spec.json`. It records a version, feature
identity, interview mode, approval state, project snapshot, and typed
JSON-compatible answers. The generated Markdown and Mermaid files are review
views; do not maintain different product decisions in those files.

## CLI workflow

```bash
cocoframe spec create login \
  --brief "Users sign in and continue to the dashboard."

cocoframe spec resume login
cocoframe spec answer login actors '["Member", "Administrator"]'
cocoframe spec answer login persistence existing
cocoframe spec check login
cocoframe spec generate login
cocoframe spec approve login
```

Pass `--json` to `create`, `resume`, `check`, `generate`, or `approve` when an AI
agent needs machine-readable output. Pass `--project <path>` when the application
is not the current directory. The `create` command snapshots existing route,
island, and dependency names so an agent can reuse existing capabilities rather
than creating redundant ones.

Answers normally use status `answered`. Use `--status assumed` only for an
explicitly disclosed framework or product assumption, `--status deferred` for a
decision that remains blocking, and `--status not-applicable` for a reviewed
question that does not apply. Required deferred answers keep `spec check` from
succeeding.

## Adaptive interviews

`nextQuestions(spec)` returns at most four unresolved questions by default. The
active set depends on the feature, interview mode, and earlier answers:

- authentication requests activate identity, account-state, session, redirect,
  recovery, and abuse-prevention decisions;
- OAuth answers activate provider, scope, callback, and account-linking details;
- role-based actors activate destination and authorization questions;
- persistence answers activate a structured data-model proposal;
- thorough mode adds observability, performance, data lifecycle, migration,
  rollout, compatibility, and rollback decisions.

An AI agent should ask only the returned questions, explain options in plain
language, and record the answer before requesting the next batch. It must not
silently invent a required product, security, or data decision.

## Generated files

After completeness succeeds, `cocoframe spec generate <feature>` writes:

| File | Purpose |
| --- | --- |
| `prd.md` | Product intent, users, flow, UI states, security, data, integrations, and non-functional requirements. |
| `flow.mmd` | Mermaid flowchart derived from the reviewed happy and failure paths. |
| `data-model.mmd` | Mermaid ER diagram when structured entities and relationships are provided. |
| `acceptance.md` | Checkable acceptance criteria used by implementation and tests. |
| `decisions.md` | Every active question, status, and recorded value. |
| `tasks.md` | CocoFrame-aware implementation and verification sequence. |

Generation requires a complete interview but does not imply approval. Review the
artifacts, resolve corrections in `spec.json`, regenerate, and run
`cocoframe spec approve <feature>`. Any later answer change invalidates approval
and returns the document to `ready` or `draft` state.

## Programmatic API

```ts
import {
  answerCocoSpec,
  approveCocoSpec,
  checkCocoSpec,
  createCocoSpec,
  nextQuestions,
  renderCocoSpecArtifacts,
} from "@cocoframe/specs";

let spec = createCocoSpec({
  feature: "login",
  brief: "Users sign in and continue to the dashboard.",
  mode: "standard",
});

for (const question of nextQuestions(spec)) {
  spec = answerCocoSpec(spec, question.id, collectReviewedAnswer(question));
}

const result = checkCocoSpec(spec);
if (result.complete) {
  const artifacts = renderCocoSpecArtifacts(spec);
  spec = approveCocoSpec(spec);
}
```

The core package has no AI SDK, filesystem, UI framework, or database dependency.
AI tools, the CocoFrame CLI, and future provider adapters share the same stable
document contract.
