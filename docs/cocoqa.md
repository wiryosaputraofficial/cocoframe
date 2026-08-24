# CocoQA

CocoQA is CocoFrame's evidence-based quality lifecycle for AI-assisted feature
delivery. It turns an approved CocoSpec, an optional completed CocoRef, project
quality scripts, and explicit user QA decisions into one traceable release
record.

The canonical source is `qa/<feature>/qa.json`. The Markdown files beside it are
deterministic review artifacts and must not be edited as an alternative source
of truth.

## Why it exists

AI can implement an acceptance criterion without knowing the required browsers,
safe test data, accessibility target, release blockers, or abuse cases. CocoQA
asks those decisions before execution, derives test cases from approved product
and reference evidence, then blocks approval until every required result passes.

It does not replace test frameworks. It coordinates existing test scripts and
records concise evidence without persisting command output that could contain
credentials, cookies, request bodies, or other sensitive values.

## Lifecycle

1. Approve the feature's CocoSpec.
2. Complete CocoRef when a visual reference is part of the feature.
3. Add or select a Design Profile when Product Design Quality applies.
4. Create the QA record from those sources.
4. Answer the adaptive QA questions in batches of at most four.
5. Run the discovered, allow-listed npm quality gates.
6. Record evidence for every traceable manual or automated case.
7. Record and resolve defects; critical and high defects cannot be accepted.
8. Check the record and request explicit release approval.

```bash
cocoframe qa create login --spec login --ref login-reference --design cocoframe.design.json
cocoframe qa resume login
cocoframe qa answer login target-environments '["staging","production-like"]'
cocoframe qa run login
cocoframe qa record login acceptance-1 pass --evidence "E2E login flow passed."
cocoframe qa defect login focus-loss --title "Focus is lost" --severity high --steps "Submit invalid form"
cocoframe qa resolve login focus-loss "Focus now moves to the error summary."
cocoframe qa check login
cocoframe qa approve login
```

`qa create` accepts only an approved CocoSpec and, when supplied, a completed
CocoRef. It discovers only known package scripts: `check`, `test`, `inspect`,
`build`, and `test:e2e`. The CLI does not execute arbitrary commands stored in a
QA record.

## Adaptive questions

Standard mode asks about target environments, browsers and devices, safe test
data, release blockers, accessibility, and security or abuse cases. Thorough
mode also asks for measurable performance thresholds, integration and migration
regressions, and an exploratory charter. When a Design Profile is present,
adaptive questions also bind theme and inventory scope, visual evidence, exact
viewports and zoom states, and design waiver authority. Required Product Design
cases include grid/container, baseline, icon-label, card, and column alignment.

Answers may be `answered`, `assumed`, `deferred`, or `not-applicable`. Assumptions
remain visible. Deferred questions block approval. Never place passwords, tokens,
cookies, production personal data, or other secrets in QA answers or evidence.

## Generated artifacts

- `qa.json`: versioned canonical state, sources, answers, cases, gates, defects,
  and approval.
- `test-plan.md`: reviewed scope, QA decisions, cases, and gates.
- `traceability.md`: source requirement to test-case and evidence mapping.
- `qa-report.md`: current release result and unresolved issues.
- `defects.md`: reproducible defects and their disposition.

Changing an answer, case, gate, or defect invalidates an earlier approval. A
record can become `approved` only when every required question is resolved,
every required case and gate has passed, and no defect remains open. Universal
framework cases require every changed internal destination to return successful
content or an intentional redirect, external destinations to have sanitized
provider evidence, and every changed link/control to have an accessible name,
keyboard behavior, visible focus, and an action matching its label.

## AI orchestration rules

- Read the approved CocoSpec and completed CocoRef; do not infer approval from a
  generated Markdown view.
- Ask the current `nextCocoQaQuestions()` batch before running checks.
- Use sanitized fixtures and evidence. Keep raw process output in the terminal,
  not in `qa.json`.
- A failed gate or case must remain failed until new execution evidence exists.
- Do not silently waive required coverage. Ask the user to change the approved
  policy or cancel the release.
- Audit existing UI primitives and application components before proposing a new
  component. Missing reference components continue through CocoRef consent.
- Bind design evidence to the reviewed Design Profile hash. A profile change
  invalidates the reviewed state and requires a rebuilt plan.
- Do not declare a feature ready for release until `cocoframe qa approve`
  succeeds.

See `docs/product-design-quality.md` for the complete design contract.
