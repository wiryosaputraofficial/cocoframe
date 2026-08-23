# CocoRef

CocoRef is CocoFrame's reference-driven component approval workflow. It helps an
AI agent use an image or website as design evidence without silently duplicating
existing UI or introducing an unreviewed component.

Use CocoSpecs first when product behavior, user flow, data, permissions, or
acceptance criteria are incomplete. Use CocoRef when the visual direction comes
from an image or website:

```text
CocoSpecs -> approved product behavior
CocoRef   -> approved component choices
CocoFrame -> implementation and verification
```

## Required behavior for AI agents

1. Create a CocoRef and attach one image or website at a time.
2. Run the inventory audit before proposing a new component.
3. Compare every visible requirement against `@cocoframe/ui`, application
   components, islands, and previously approved CocoRef components.
4. Record each requirement as `reuse` or `missing`, with a concrete rationale.
5. For every missing component, ask the user for explicit consent before running
   `consent`. Never interpret the original build request as component consent.
6. Edit the generated temporary TSX and CSS, then publish the actual candidate
   through the local preview route.
7. If the user does not approve, record exact feedback, revise the same
   candidate, and preview it again. Continue until approval or cancellation.
8. On approval, promote the exact previewed source. On approval or cancellation,
   remove the temporary source and preview route.

## CLI workflow

```bash
cocoframe ref create dashboard --image ./references/dashboard.png
# or: cocoframe ref create dashboard --website https://example.com/dashboard

cocoframe ref audit dashboard
# AI reviews the inventory and writes requirements.json
cocoframe ref audit dashboard --requirements ./requirements.json

cocoframe ref consent dashboard activity-feed
# AI edits .cocoframe/cocoref/dashboard/activity-feed/activity-feed.tsx
cocoframe ref preview dashboard activity-feed

cocoframe ref feedback dashboard activity-feed "Use denser spacing"
cocoframe ref preview dashboard activity-feed
cocoframe ref approve dashboard activity-feed
# or: cocoframe ref cancel dashboard activity-feed
```

The requirements file is explicit and machine-readable:

```json
[
  {
    "id": "primary-action",
    "description": "Primary call to action",
    "decision": "reuse",
    "existingComponent": "ui:Button",
    "rationale": "The semantic Button primitive supports the required state."
  },
  {
    "id": "activity-feed",
    "description": "Expandable grouped activity feed",
    "decision": "missing",
    "rationale": "No captured component supports grouped expandable events."
  }
]
```

## Sources of truth and generated files

`refs/<name>/ref.json` is canonical. It records references, the inventory
snapshot, component requirements, lifecycle state, feedback, and decisions.
The adjacent `reference-report.md`, `component-map.md`, and `decisions.md` files
are deterministic review views and must not become parallel decision sources.

Local image references are copied under `refs/<name>/references/` so the audit
remains reproducible. Website URLs are recorded as external evidence.

Candidate source lives under `.cocoframe/cocoref/<name>/<component>/`. The CLI
creates a temporary page under `app/routes/__cocoref/` that imports that exact
TSX component. Development watches both locations. Production builds exclude
all `__cocoref` routes, and preview URLs accept only local HTTP hosts.

Approval refuses to overwrite an existing application component. It copies the
previewed TSX and CSS to `app/components/`, regenerates exact CSS declarations,
records approval, and removes the temporary candidate and route. Cancellation
preserves the decision history but removes the same temporary files.

## Lifecycle

```text
collecting-reference
  -> auditing-components
  -> awaiting-consent
  -> building-candidate
  -> preview-ready
       -> revising -> preview-ready (repeat)
       -> approved component -> ready
       -> cancelled
```

Reused requirements can move directly to `ready`. Missing requirements cannot
reach preview without consent and cannot reach approval without a preview.

## Security and quality boundaries

- A reference is evidence, not executable code and not permission to copy
  inaccessible or proprietary source.
- Never send project secrets, cookies, authenticated page data, or private URLs
  to a model or third-party service.
- Inspect remote references with the minimum required access and record only the
  URL and reviewed design decisions.
- Preserve accessibility, responsive behavior, server-first rendering, and
  existing design tokens even when a reference omits them.
- Use an island only when the approved interaction genuinely requires browser
  state.
- Run focused component tests plus `check`, `inspect`, `build`, and browser tests
  for visual, responsive, or interactive work.
