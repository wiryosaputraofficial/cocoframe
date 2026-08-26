# CocoFrame Product Workflow

CocoFrame separates product decisions, experience design, reference-driven
source approval, implementation, diagnostics, and release approval. Each stage
has one canonical machine-readable record and an explicit human boundary.

## End-to-end flow

```text
product brief
    │
    ▼
CocoSpec ── approved requirements, flows, data, acceptance criteria
    │
    ▼
CocoUX ──── journeys, states, interactions, visual recommendations, PNGs
    │
    ▼
CocoRef ─── inventory audit, missing-component consent, exact-source preview
    │
    ▼
implementation ── application source and generated contracts
    │
    ├── CocoDoctor: project/dependency/config/security/build diagnosis
    ▼
CocoQA ───── traceability, gates, evidence, defects, explicit release approval
```

The stages are intentionally not aliases for one another:

| Stage | Approves | Does not approve |
| --- | --- | --- |
| CocoSpec | Reviewed product intent and acceptance criteria | UX direction, source changes, or release readiness |
| CocoUX | Hash-bound visual direction and journey/state/interaction contract | Promotion of preview source |
| CocoRef | Exact previewed component source for promotion | Overall feature release |
| Agent Bridge mutation approval | One reviewed hash-bound file operation | Product or QA approval |
| CocoQA | Traceable release evidence for the reviewed sources | Future unreviewed changes |

## 1. Discover with CocoSpecs

```bash
cocoframe spec create checkout \
  --brief "A signed-in customer completes checkout." \
  --mode standard
cocoframe spec resume checkout
cocoframe spec answer checkout <question-id> <answer>
cocoframe spec check checkout
cocoframe spec generate checkout
cocoframe spec approve checkout
```

Source of truth: `specs/checkout/spec.json`.

Review before approval:

- actors, scope, success outcomes, and non-goals;
- journeys and failure paths;
- data, integrations, roles, authorization, and persistence decisions;
- measurable acceptance criteria;
- visible assumptions and deferred questions.

Generated Markdown and Mermaid files are derived review views. Change the
canonical answers and regenerate them.

## 2. Design with CocoUX

```bash
cocoframe ux create checkout \
  --brief "Design a fast, accessible checkout." \
  --spec checkout
cocoframe ux resume checkout
cocoframe ux answer checkout --input ./checkout-ux.json
cocoframe ux check checkout
cocoframe ux generate checkout
cocoframe ux preview checkout --theme light
cocoframe ux feedback checkout "Increase the order-summary hierarchy."
cocoframe ux approve checkout --role application-developer
cocoframe ux handoff checkout
```

Source of truth: `ux/checkout/ux.json`.

CocoUX requires reachable journeys, complete screen states, accessible
interaction behavior, inventory reuse decisions, and rationale for every
not-applicable state. Preview capture covers applicable states at mobile,
tablet, desktop, and 4K viewports. Approved PNGs are bound to the UX contract,
preview source, viewport, theme, revision, and image hash.

Approval means the visual direction may proceed to CocoRef. Temporary preview
TSX and CSS are not application source.

## 3. Audit and approve exact source with CocoRef

When CocoUX hands off approved screenshots, a CocoRef record and references are
created. A reference may also begin directly from an image or website:

```bash
cocoframe ref create checkout --image ./references/checkout.png
cocoframe ref audit checkout --requirements ./requirements.json
cocoframe ref consent checkout order-summary
cocoframe ref preview checkout order-summary
cocoframe ref feedback checkout order-summary "Reduce vertical spacing."
cocoframe ref approve checkout order-summary
```

Source of truth: `refs/checkout/ref.json`.

The audit must prefer `@cocoframe/ui` and existing application components. Each
missing component requires explicit consent. Approval promotes only the exact
previewed source; cancellation and approval remove temporary preview routes.

If no visual reference is required, record that decision explicitly. Agent
Bridge mutations still require a reviewed visual-reference decision.

## 4. Implement within the approved contract

Implementation uses the normal CocoFrame conventions:

- server rendering by default;
- islands only for genuine browser behavior;
- page-owned `load`, `meta`, `view`, `action`, and `error` behavior;
- schema-backed API and form validation;
- middleware for cross-cutting request behavior;
- parameterized database values and explicit authorization;
- generated clients, OpenAPI, and CSS declarations refreshed from source.

Useful checks during implementation:

```bash
npm run check
npm run inspect
cocoframe doctor
npm run generate
npm run build
```

## 5. Diagnose with CocoFrame Doctor

```bash
cocoframe doctor
cocoframe doctor --json
cocoframe doctor --deep --strict
```

Doctor is deterministic and read-only. It identifies environment, package,
route, island, generated-artifact, configuration, security, and isolated-build
problems. It helps developers and AI clients find likely causes faster, but it
does not replace behavior tests or CocoQA approval.

## 6. Prove release readiness with CocoQA

```bash
cocoframe qa create checkout \
  --spec checkout \
  --ux checkout \
  --ref checkout \
  --mode thorough
cocoframe qa resume checkout
cocoframe qa answer checkout <question-id> <answer>
cocoframe qa run checkout
cocoframe qa record checkout <case-id> pass --evidence "Sanitized evidence"
cocoframe qa check checkout
cocoframe qa approve checkout
```

Source of truth: `qa/checkout/qa.json`.

CocoQA derives coverage from acceptance criteria, journeys, states,
interactions, reference evidence, and an optional Design Profile. It records
allow-listed automated gates, manual cases, sanitized evidence, and defects.
Approval fails while required questions are deferred, cases or gates are not
passing, or defects remain open.

## Change invalidation

Hash binding prevents stale approval from silently authorizing changed work:

- changing a CocoSpec decision invalidates downstream assumptions;
- changing CocoUX design or preview evidence invalidates UX approval;
- changing a CocoRef candidate after preview requires another review;
- changing a QA answer, case, gate, defect, or bound source invalidates QA
  approval;
- changing a proposed Agent Bridge target or hash invalidates mutation approval.

Resume the affected stage, regenerate review artifacts, and obtain explicit
approval again.

## Responsibility matrix

| Activity | Developer/AI may perform | Human approval required |
| --- | --- | --- |
| Inspect repository and propose product questions | Yes | No |
| Record reviewed product answers | Yes | User confirms the answers |
| Generate UX preview and PNG evidence | Yes | UX approval |
| Propose a missing reference component | Yes | Consent before source work |
| Promote exact component source | Only through approved CocoRef flow | CocoRef approval |
| Plan an Agent Bridge mutation | Yes | Role-correct mutation approval |
| Run allow-listed QA gates | Yes | No additional approval |
| Accept unresolved QA risk | No silent waiver | Explicit reviewed policy/defect decision |
| Declare release readiness | Only after canonical checks pass | CocoQA approval |

## Repository artifacts

```text
specs/<feature>/spec.json        canonical product state
ux/<feature>/ux.json             canonical UX state
ux/<feature>/visuals/            immutable approved screenshots
refs/<name>/ref.json             canonical reference/source state
qa/<feature>/qa.json             canonical QA and approval state
.cocoframe/cocoux/               temporary UX previews
.cocoframe/cocoref/              temporary reference previews
.cocoframe/agent/                local controlled-operation records
```

See [Generated artifacts](generated-artifacts.md) for ownership and edit rules.
