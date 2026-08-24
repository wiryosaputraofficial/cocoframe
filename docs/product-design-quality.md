# Product Design Quality

Product Design Quality extends CocoQA with a provider-independent design
contract. It makes component reuse, semantic tokens, visual consistency,
reference fidelity, responsive behavior, and accessibility traceable before
release approval.

The feature does not crawl websites, interpret images, or host a visual testing
provider. CocoRef owns approved reference criteria. A browser, AI client, or
other evidence provider supplies sanitized measurements; CocoQA owns the
canonical cases, evidence, defects, and approval state.

## Design Profile

A project may declare `cocoframe.design.json`. The version 1 profile contains:

- named themes with allow-listed semantic variables;
- spacing, radius, typography, and elevation scales;
- project breakpoints;
- an icon policy bound to `@cocoframe/icons` linear.

Values are data, not arbitrary CSS. Unknown variables, declarations containing
semicolons or braces, URL values, expressions, scripts, malformed colors, and
paths outside the project root are rejected.

```bash
cocoframe qa create login --spec login --ref login-reference --design cocoframe.design.json --mode thorough
```

The CLI stores only the profile path and SHA-256 fingerprint in CocoQA. If the
profile changes after review, `DESIGN_STATE_CONFLICT` requires a new plan and
approval.

## Theme customization

`Theme` accepts typed, allow-listed semantic token overrides and renders them
as server-side custom properties without browser JavaScript.

```tsx
import { Theme } from "@cocoframe/ui";

export const ProductShell = ({ children }) => (
  <Theme theme="light" tokens={{ "color-primary": "#17684a", radius: "0.75rem" }}>
    {children}
  </Theme>
);
```

Prefer project tokens over copied hardcoded component styles. Products can
change color, spacing, radius, typography, and elevation while reusable
component contracts stay server-first.

## Required CocoQA design cases

A Design Profile adds required cases for component reuse, semantic tokens,
spacing, color, WCAG 2.2 AA contrast, typography, radius, elevation,
iconography, overflow, responsive reflow, accessibility, and optional CocoRef
fidelity.

Normal text must meet 4.5:1 contrast. Large text, meaningful graphics, controls,
and focus indicators must meet 3:1. Responsive evidence covers 320, 390, 768,
1366, and 3840 pixels plus applicable text zoom, theme, and interaction states.

## AI workflow

1. Inspect the workspace and discover `cocoframe.design.json`.
2. Search `@cocoframe/ui`, application components, and icons before proposing a new component.
3. Use CocoRef for references and obtain missing-component consent.
4. Bind the profile fingerprint and component inventory to CocoQA.
5. Ask only the next adaptive design quality question batch.
6. Collect sanitized browser or provider evidence for every required case.
7. Record defects and rerun failed gates.
8. Request explicit QA approval only after all required cases and gates pass.

Agent Bridge exposes the profile as a read-only capability and includes its hash
in proposed CocoQA traceability. Mutations still use the existing explicit,
role-aware approval boundary.

## Stable diagnostics

The contract provides `INVALID_DESIGN_PROFILE`,
`UNRESOLVED_TOKEN_REFERENCE`, `COMPONENT_REUSE_NOT_AUDITED`,
`CONTRAST_FAILED`, `OVERFLOW_DETECTED`, `INCONSISTENT_SPACING`,
`INCONSISTENT_ICONOGRAPHY`, `REFERENCE_UNAVAILABLE`,
`VISUAL_FIDELITY_FAILED`, `EVIDENCE_UNAVAILABLE`,
`SENSITIVE_VISUAL_EVIDENCE_BLOCKED`, `DESIGN_STATE_CONFLICT`,
`COMPONENT_IMPACT_CONFLICT`, and `DESIGN_GATE_TIMEOUT`.

Every diagnostic has a recovery path. Sensitive screenshots, cookies,
authorization headers, tokens, and request bodies must never be persisted.
