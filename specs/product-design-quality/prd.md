# Product Design Quality

> CocoSpecs v1 · thorough mode · approved

## Summary

Extend CocoQA with provider-independent product design principles that audit component reuse, design-token consistency, spacing, color, contrast, iconography, overflow, responsive behavior, and visual fidelity to completed CocoRef references. Allow project-level semantic customization of color, radius, spacing, and component appearance without forking primitives or creating redundant components.

## Users and permissions

["Application developer: selects the project design profile, reuses components, and fixes defects.","Designer or product owner: supplies references and approves visual direction.","QA or release reviewer: reviews evidence and grants final design QA approval.","Framework maintainer: owns default tokens, product-design rubric, and component contracts.","AI agent: audits and proposes changes but cannot approve its own work."]

## Success outcome

A supported AI can audit approved references, the existing component inventory, and project design tokens; reuse existing components first; produce a consistent customizable interface; and prove spacing, color, contrast, iconography, overflow, responsive behavior, and visual fidelity before CocoQA can be approved.

## Entry points

- AI or MCP workflows after CocoSpecs approval and CocoRef completion when a visual reference exists.
- The cocoframe qa create, resume, and run CLI lifecycle for new features and existing implementation audits.
- Agent Bridge read-only design inspection and CocoQA lifecycle tools.
- Project design-profile discovery through CocoFrame configuration.
- Automatic re-audit when approved references, component source, or design tokens change.

## Happy path

1. The user requests a feature with an optional visual reference.
2. The AI inspects the component inventory and project design profile.
3. CocoRef compares the reference requirements with existing components.
4. The AI selects reusable components before proposing any new component.
5. Every missing component follows CocoRef consent, preview, revision, and approval.
6. The user defines or approves semantic colors, spacing, radius, typography, elevation, and icon rules.
7. The AI implements the interface using approved primitives and tokens.
8. CocoQA runs the product-design principle audit.
9. The rendered result is compared with approved CocoRef criteria when a reference exists.
10. Contrast, overflow, responsive, spacing, and consistency defects are recorded.
11. The AI fixes defects and reruns the required checks.
12. A human reviewer grants explicit final design QA approval.

## Alternate and failure paths

- No visual reference exists, so design-system checks run while fidelity checks are explicitly not applicable.
- The project has no design profile, so safe defaults are proposed and require user approval.
- The project already has tokens, so they are audited and reused.
- An existing component satisfies the requirement and is reused without creating a new component.
- A semantic token override is sufficient to match the reference, so no component variant is added.
- A component is missing and proceeds through CocoRef consent, preview, revision, and approval.
- Multiple themes or brands use separate semantic token profiles under one typed contract.
- Browser evidence is unavailable, so static checks continue and visual checks remain blocked.
- A human reviewer accepts an intentional low-severity deviation with a recorded rationale.
- A reference, token, or component changes after approval, invalidating the prior approval and requiring a new audit.

- INVALID_DESIGN_PROFILE: report the invalid token fields and require a schema-valid profile.
- UNRESOLVED_TOKEN_REFERENCE: report a missing alias or cycle and require explicit token repair.
- COMPONENT_REUSE_NOT_AUDITED: refuse a new component proposal until inventory inspection completes.
- CONTRAST_FAILED: identify the foreground and background pair, measured ratio, required target, and affected element.
- OVERFLOW_DETECTED: identify the viewport, element, clipping or horizontal overflow, and reproduction evidence.
- INCONSISTENT_SPACING: identify values outside the approved scale and their locations.
- INCONSISTENT_ICONOGRAPHY: identify inconsistent family, size, stroke, alignment, or accessible labeling.
- REFERENCE_UNAVAILABLE: preserve lifecycle state and ask for a valid completed CocoRef or reference.
- VISUAL_FIDELITY_FAILED: report the approved criterion and deviation that exceeded its tolerance.
- EVIDENCE_UNAVAILABLE: keep the relevant gate blocked and provide a safe retry path.
- SENSITIVE_VISUAL_EVIDENCE_BLOCKED: refuse persistence until sensitive regions are removed or redacted.
- DESIGN_STATE_CONFLICT: invalidate stale review after reference, token, or component source changes.
- COMPONENT_IMPACT_CONFLICT: report affected consumers and require a reviewed compatibility plan.
- DESIGN_GATE_TIMEOUT: abort safely, clean temporary evidence, and allow a bounded retry.
- Every diagnostic is stable and machine-readable, includes recovery guidance, and never changes approval state silently.

## Interface states

- Initial: show CocoSpec and CocoRef sources, component inventory, design profile, and planned checks.
- Loading or running: show the active gate and factual progress without fabricated percentages.
- Empty reference: explain that fidelity is not applicable while design-system checks still run.
- Empty design profile: use framework defaults and request approval before persisting a new profile.
- Success: show principle scorecards, reused components, token decisions, evidence, and approval readiness.
- Validation: show the invalid token path, expected value, and corrective action.
- Disabled: final approval remains unavailable while required questions, cases, gates, or critical and high defects are unresolved.
- Blocked: distinguish unavailable evidence from a failed design check.
- Error: show a stable diagnostic, affected component or viewport, sanitized evidence, and retry guidance.
- Stale: invalidate prior approval when a reference, token, or component source changes.
- Cancelled: remove temporary visual evidence and preserve the last valid canonical state.

### Accessibility

- Target WCAG 2.2 AA at minimum.
- Normal text contrast is at least 4.5:1; large text and meaningful UI graphics are at least 3:1.
- Visible focus indicators have at least 3:1 contrast against adjacent colors.
- Every review, defect-navigation, and approval flow is usable by keyboard.
- Focus order follows semantic and visual order, and dialogs restore focus correctly.
- Gate, defect, validation, and approval states use semantic live-region announcements where appropriate.
- Decorative icons are hidden from assistive technology and meaningful icons have accessible names.
- Information is never communicated through color alone.
- The interface remains usable at 200 percent text zoom and under WCAG reflow conditions.
- The design system supports forced colors, reduced motion, and high-contrast preferences.
- Touch targets use an approved ergonomic size and do not overlap.
- Automated checks supplement rather than replace manual keyboard and screen-reader review.

### Responsive behavior

Required audit viewports include at least 320px, 390px mobile, 768px tablet, 1366px laptop, and 4K. Layouts must reflow without unintended horizontal overflow, clipped content, overlapping controls, or unreadable wrapping. Navigation, tables, evidence panels, dialogs, token editors, and scorecards must use responsive primitives or intentional local scrolling. Design tokens may use an approved responsive scale without changing semantic meaning. Fidelity comparison runs at every approved reference viewport rather than one desktop screenshot. Text zoom and long localized content are included.

## Authentication and security

Not applicable.

- Read-only audits never modify source files, Git state, package state, or generated artifacts.
- Token and component mutations require explicit Agent Bridge approval.
- Every path remains inside the approved workspace and is checked against symlink and junction escapes.
- Design profiles accept only typed allow-listed token values and reject arbitrary CSS, HTML, url functions, scripts, and executable expressions.
- Screenshots are persisted only to declared evidence targets.
- Cookies, tokens, authorization headers, request bodies, user content, and secrets are removed or redacted from evidence.
- Core CocoQA does not crawl websites or fetch authenticated references.
- External reference acquisition remains the responsibility of the provider and CocoRef lifecycle.
- Image size, dimensions, count, and processing duration are bounded to prevent resource abuse.
- Logs never contain source content, screenshot pixels, raw token values, or private absolute paths.
- An AI agent cannot grant approval to its own result.
- Critical and high design defects cannot be waived.
- Stale approval cannot execute after the design state changes.

## Data and integrations

### Does this feature use no persistence, existing data, new data, or both existing and new data?

existing-and-new

### Define entities, fields, identifiers, constraints, and relationships needed by this feature.

{"storage":"typed-file-based-no-database","entities":[{"name":"DesignProfile","fields":[{"name":"version","type":"literal-1","key":false,"nullable":false},{"name":"id","type":"string","key":true,"nullable":false},{"name":"name","type":"string","key":false,"nullable":false},{"name":"extends","type":"string","key":false,"nullable":true},{"name":"themes","type":"Record<string, SemanticTokenSet>","key":false,"nullable":false},{"name":"spacing","type":"TokenScale","key":false,"nullable":false},{"name":"radius","type":"TokenScale","key":false,"nullable":false},{"name":"typography","type":"TypographyScale","key":false,"nullable":false},{"name":"elevation","type":"TokenScale","key":false,"nullable":false},{"name":"breakpoints","type":"BreakpointScale","key":false,"nullable":false},{"name":"icons","type":"IconPolicy","key":false,"nullable":false},{"name":"updatedAt","type":"ISO timestamp","key":false,"nullable":false}]},{"name":"SemanticTokenSet","fields":[{"name":"colors","type":"typed semantic surface, text, border, action, focus, status, and overlay colors","key":false,"nullable":false}]},{"name":"DesignAudit","fields":[{"name":"id","type":"string","key":true,"nullable":false},{"name":"qaId","type":"string","key":false,"nullable":false},{"name":"profileId","type":"string","key":false,"nullable":false},{"name":"profileHash","type":"sha256","key":false,"nullable":false},{"name":"referenceId","type":"string","key":false,"nullable":true},{"name":"referenceHash","type":"sha256","key":false,"nullable":true},{"name":"state","type":"draft|running|failed|passed|approved","key":false,"nullable":false},{"name":"createdAt","type":"ISO timestamp","key":false,"nullable":false},{"name":"updatedAt","type":"ISO timestamp","key":false,"nullable":false},{"name":"approvedAt","type":"ISO timestamp","key":false,"nullable":true}]},{"name":"DesignAuditCase","fields":[{"name":"id","type":"string","key":true,"nullable":false},{"name":"auditId","type":"string","key":false,"nullable":false},{"name":"principle","type":"reuse|tokens|spacing|color|contrast|typography|radius|elevation|iconography|overflow|responsive|accessibility|fidelity","key":false,"nullable":false},{"name":"target","type":"sanitized component ID","key":false,"nullable":false},{"name":"viewport","type":"string","key":false,"nullable":true},{"name":"status","type":"CocoQaResultStatus","key":false,"nullable":false},{"name":"required","type":"boolean","key":false,"nullable":false},{"name":"evidenceIds","type":"string[]","key":false,"nullable":false}]},{"name":"DesignEvidence","fields":[{"name":"id","type":"string","key":true,"nullable":false},{"name":"caseId","type":"string","key":false,"nullable":false},{"name":"kind","type":"measurement|screenshot|trace|manual-review","key":false,"nullable":false},{"name":"summary","type":"string","key":false,"nullable":false},{"name":"relativePath","type":"string","key":false,"nullable":true},{"name":"contentHash","type":"sha256","key":false,"nullable":true},{"name":"sanitized","type":"literal-true","key":false,"nullable":false},{"name":"createdAt","type":"ISO timestamp","key":false,"nullable":false}]}],"relationships":[{"from":"DesignProfile","to":"DesignAudit","type":"one-to-many","label":"evaluated by"},{"from":"CocoQa","to":"DesignAudit","type":"one-to-many with one current","label":"tracks design audits"},{"from":"CocoRef","to":"DesignAuditCase","type":"zero-or-one-to-many","label":"supplies fidelity criteria"},{"from":"DesignAudit","to":"DesignAuditCase","type":"one-to-many","label":"contains"},{"from":"DesignAuditCase","to":"DesignEvidence","type":"one-to-many","label":"proved by"},{"from":"DesignAuditCase","to":"CocoQaDefect","type":"one-to-many","label":"may produce"},{"from":"CocoRefComponentDecision","to":"DesignAuditCase","type":"one-to-many","label":"supplies reuse status"}]}

### Define ownership, retention, deletion, audit, privacy, and backfill behavior for affected data.

{"ownership":{"designProfile":["application-developer","framework-maintainer"],"approval":["human-qa-reviewer","human-release-reviewer"],"aiMayApprove":false},"retention":{"canonicalState":"inside-approved-workspace","temporaryScreenshots":"delete-after-completion-cancellation-or-timeout","rawScreenshots":"not-persisted-by-default","approvedScreenshots":"only-under-declared-qa-feature-evidence-target","defaultEvidence":["summary","hash","measurement","relative-path"]},"invalidation":["design-profile-change","reference-change","component-source-change","required-evidence-change"],"deletion":{"temporaryEvidence":"automatic-cleanup","persistentEvidence":"explicit-user-action","dependentCases":"blocked-until-evidence-is-restored"},"audit":{"records":["timestamps","hashes","actor-role","approval-transitions"],"excluded":["source-content","screenshot-pixels","raw-token-values","private-absolute-paths"]},"privacy":["no-secrets","no-personal-data","no-authenticated-page-content","no-cookies","no-authorization-headers"],"backfill":{"existingProjects":"derive-framework-defaults-in-memory","automaticFileCreation":false,"profileCreation":"requires-explicit-approval","olderCocoQa":"remain-readable","migration":"explicit-preserve-original-and-regenerate-review-artifacts"},"externalRetention":false,"databaseBackfill":false,"externalTelemetryByDefault":false}

- @cocoframe/qa owns the lifecycle and canonical quality state.
- @cocoframe/cocoref supplies approved visual criteria and component decisions.
- @cocoframe/ui and its existing Theme primitive consume the project design profile.
- @cocoframe/schema validates the versioned design profile.
- @cocoframe/icons supplies the approved icon catalog for consistency audits.
- cocoframe inspect and Agent Bridge provide component discovery and traceability.
- An approved Playwright or browser runner supplies viewport, overflow, contrast, and visual evidence.
- Provider-owned image understanding may participate only through provider-independent evidence contracts.
- The core workflow requires no network access.
- When a browser or provider is unavailable, static checks continue and dependent visual gates become blocked.
- Every integration uses bounded timeouts, supports cancellation, returns sanitized diagnostics, and stops work after client disconnect.

## Existing project context

No project snapshot was recorded.

## Non-functional requirements

### Which safe events, metrics, traces, and alerts prove the feature is operating correctly?

["Emit safe structured events for design.audit.started, completed, failed, and cancelled.","Emit design.component.reused and design.component.missing events with sanitized component identifiers.","Emit design.profile.validated and design.gate.completed events.","Emit design.defect.created and design.defect.resolved events.","Emit design.approval.invalidated and design.approval.granted events.","Measure audit and gate duration, outcome counts per principle, component reuse ratio, token-validation failures, defect counts by principle, and approval invalidation count.","Metric labels never contain filenames, URLs, screenshots, component content, or token values.","Correlate traces with workflow ID, QA ID, operation ID, gate ID, and sanitized component ID.","Produce structured local evidence without sending telemetry to an external service by default."]

### What latency, payload, concurrency, or browser-performance limits must hold?

["Parse and validate a normal design profile within 100 milliseconds.","Complete a static audit within 2 seconds for up to 500 components or 10000 token usages on the documented development baseline.","Limit each browser viewport gate to 30 seconds by default.","Limit the default complete visual audit to 2 minutes unless the user approves another bound.","Allow at most 10 visual evidence files per audit and 10 megabytes per file.","Limit one design profile to 256 kilobytes.","Allow only one mutation or design-approval execution for the same canonical QA state at a time.","Bound parallel read-only audits to protect CPU and memory.","Generate deterministic token CSS without adding browser JavaScript.","Theme application adds no island or hydration payload.","Audit tooling is excluded from the production browser bundle.","Cancellation stops browser work and removes temporary evidence."]

## Out of scope

- Providing or hosting an AI model that generates designs.
- Replacing the CocoRef lifecycle.
- Guaranteeing pixel-perfect output across every browser, operating system, and rendering engine.
- Performing website crawling, Figma ingestion, or provider-owned image understanding inside CocoQA.
- Building a WYSIWYG design editor.
- Providing cloud screenshot or visual-evidence storage.
- Allowing autonomous component mutations without explicit approval.
- Performing arbitrary CSS rewriting or creating components before reuse auditing.
- Automatically modifying third-party component source.
- Choosing creative direction or brand identity without user decisions.
- Adding browser JavaScript solely to apply visual tokens.
- Allowing an AI agent to grant final approval to its own design result.

## Unresolved decisions

All required discovery questions are resolved.
