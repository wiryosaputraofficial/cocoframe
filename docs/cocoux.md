# CocoUX

CocoUX turns an approved product intent into a reviewable experience contract: actors, user journeys, complete interface states, transitions, accessible interactions, reuse-first visual recommendations, and real PNG previews. Its canonical source is `ux/<feature>/ux.json`.

## Lifecycle

```text
CocoSpec approved
  -> create and audit inventory
  -> design journeys
  -> review every required state
  -> define interactions and transitions
  -> recommend visuals and obtain missing-component consent
  -> generate managed server-rendered preview
  -> capture PNG evidence
  -> human approval or revision
  -> hand approved evidence to CocoRef
  -> CocoRef audits and approves exact source separately
  -> CocoQA verifies implementation against CocoUX and CocoRef
```

CocoUX reviews `initial`, `loading`, `empty`, `success`, `validation`, `disabled`, `error`, `offline`, and `permission` for every screen. A state may be marked not applicable only with a rationale. Every journey has one reachable root and at least one terminal outcome. Interactions record target, trigger, keyboard behavior, focus, feedback, and recovery.

## Commands

```bash
cocoframe ux create checkout --brief "Design the checkout experience." --spec checkout
cocoframe ux resume checkout
cocoframe ux answer checkout --input ./checkout-ux.json
cocoframe ux check checkout
cocoframe ux generate checkout
cocoframe ux preview checkout
cocoframe ux feedback checkout "Make the order summary easier to scan."
cocoframe ux approve checkout --role application-developer
cocoframe ux handoff checkout
```

`answer` accepts either the complete `CocoUxDesign` JSON object or one section such as `states` followed by `--input <file>`. `generate` writes deterministic Mermaid and Markdown review views and managed preview source. `preview` renders local server-first routes and captures applicable states at 320×568, 390×844, 768×1024, 1366×768, and 3840×2160. Use `--theme` to bind the selected theme and `--port` to select the isolated local preview server.

## Files and evidence

- Canonical contract: `ux/<feature>/ux.json`
- Review views: `journey-map.mmd`, `state-diagram.mmd`, `interaction-matrix.md`, `visual-brief.md`, and `decisions.md`
- Temporary source and captures: `.cocoframe/cocoux/<feature>/`
- Temporary routes: `app/routes/__cocoux/<feature>/`
- Immutable approved PNGs: `ux/<feature>/visuals/revision-<n>/`
- CocoRef handoff copies: `refs/<name>/references/`

Each PNG record binds the state, viewport, theme, preview source hash, image hash, UX contract hash, revision, and description. Production builds exclude every `__cocoux` route. Handoff or cancellation removes managed temporary source and routes.

## Approval boundary

CocoUX approval means only: “this visual direction may be handed to CocoRef.” It never promotes temporary TSX or CSS into `app/`. CocoRef remains responsible for auditing the approved screenshots against the current inventory, asking explicit consent for each missing component, rendering the exact candidate source, collecting feedback, and promoting only approved source.

AI may inspect CocoUX with Agent Bridge `cocoux.inspect`, but it cannot approve visual direction. The CLI and Agent Bridge call the same `@cocoframe/ux` parser and completeness engine.

## Safety and limits

Preview capture uses local HTTP only, deterministic contract content, workspace-confined paths, and no arbitrary external assets or authenticated/private production data. One revision is limited to 50 PNGs, 5 MiB each, and 100 MiB total; the canonical contract is limited to 1 MiB and 1,000 diagnostics. Capture is serial and carries one cancellation signal through each operation.

After implementation, create CocoQA with both UX and reference bindings when applicable:

```bash
cocoframe qa create checkout --spec checkout --ux checkout --ref checkout
```

CocoQA derives required cases from approved journeys, interface states, interactions, and screenshot evidence. Release readiness still requires explicit CocoQA approval.
