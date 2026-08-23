# @cocoframe/qa

`@cocoframe/qa` is CocoFrame's provider-independent quality approval contract.
It connects approved product requirements and component decisions to adaptive QA
questions, traceable test cases, automated quality gates, defects, evidence, and
final approval.

```ts
import {
  answerCocoQa,
  approveCocoQa,
  createCocoQa,
  nextCocoQaQuestions,
  recordCocoQaCase,
  recordCocoQaGate,
} from "@cocoframe/qa";

let qa = createCocoQa({
  feature: "login",
  acceptanceCriteria: ["Valid users reach the dashboard."],
  gates: [{ id: "test", script: "test", required: true }],
});

for (const question of nextCocoQaQuestions(qa)) {
  qa = answerCocoQa(qa, question.id, "Reviewed QA decision");
}

qa = recordCocoQaGate(qa, "test", "passed", { durationMs: 420 });
qa = recordCocoQaCase(qa, "acceptance-1", "passed", "Playwright login test");
qa = approveCocoQa(qa);
```

Use `cocoframe qa` for the filesystem and automated-gate workflow. The canonical
source is `qa/<feature>/qa.json`; generated Markdown files are review views.
