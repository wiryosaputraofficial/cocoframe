# @cocoframe/specs

`@cocoframe/specs` turns an initial product request into an AI-readable,
reviewable implementation specification. It provides a provider-independent
adaptive interview, completeness checks, approval state, and deterministic PRD,
Mermaid flowchart, data-model, acceptance-criteria, decision-log, and task output.

```ts
import {
  answerCocoSpec,
  createCocoSpec,
  nextQuestions,
  renderCocoSpecArtifacts,
} from "@cocoframe/specs";

let spec = createCocoSpec({
  feature: "login",
  brief: "Users sign in and continue to the dashboard.",
});

for (const question of nextQuestions(spec)) {
  spec = answerCocoSpec(spec, question.id, "A reviewed product decision");
}

const artifacts = renderCocoSpecArtifacts(spec);
```

The canonical source is `specs/<feature>/spec.json`. Generated Markdown and
Mermaid files are views of that source and must not become parallel sources of
truth. Use `cocoframe spec` for the filesystem workflow.
