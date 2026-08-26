# CocoUX

> CocoSpecs v1 · thorough mode · approved

## Summary

CocoUX helps developers and AI design user journeys, complete interface states, interaction contracts, and evidence-based visual recommendations before implementation.

## Users and permissions

["Framework maintainer defines CocoUX rules and templates.","Product and UX designers author UX contracts.","Application developers and AI agents consume approved contracts.","Canonical creation, revision, and approval require an authorized human reviewer."]

## Success outcome

From one product brief, CocoUX produces a consistent machine-readable UX contract containing journeys, a complete state matrix, interaction contracts, and visual recommendations ready for implementation and CocoQA.

## Entry points

- CLI commands: cocoframe ux create, resume, answer, check, generate, preview, feedback, approve, handoff, cancel, and status.
- Agent Bridge exposes the same canonical CocoUX lifecycle through provider-independent tools with human approval boundaries.
- An approved CocoSpec can prefill product behavior and acceptance context.
- Project inspection supplies route, component, island, dependency, and design-token inventory.
- An optional Design Profile guides reference-free visual direction.
- An optional completed CocoRef supplies fidelity constraints when an external image or website reference already exists.

## Happy path

1. Audit the project, routes, reusable components, islands, and design tokens.
2. Create or resume ux/<feature>/ux.json.
3. Define actors, goals, entry points, and journeys.
4. Complete the required states and transitions.
5. Define interaction, keyboard, feedback, and recovery behavior.
6. Recommend layout, hierarchy, components, tokens, motion, and responsive behavior.
7. Audit component reuse and obtain explicit consent before previewing any missing component.
8. Generate a development-only server-rendered website preview under managed CocoUX paths.
9. Capture deterministic PNG screenshots for approved viewports, themes, and important states with source hashes.
10. Validate conflicts, dead ends, missing states, accessibility, and visual completeness.
11. Collect user feedback and revise the same temporary preview until the visual direction is approved or cancelled.
12. On CocoUX approval, copy the approved screenshots into refs/<feature>/references and create a linked CocoRef from the UX contract.
13. CocoRef audits reuse and missing components, obtains per-component consent, previews exact candidates, and promotes source only after CocoRef approval.
14. Remove temporary CocoUX preview source after handoff or cancellation.
15. Developer or AI implements only the fully approved contracts.

## Alternate and failure paths

- Start from an approved CocoSpec or a standalone reviewed brief.
- Create a new UX contract or revise an existing unapproved revision.
- Without an external reference, use the project Design Profile and Product Design Quality rules.
- With an external reference, use a linked CocoRef and preserve its fidelity decisions.
- When all visible requirements can reuse inventory, preview without proposing application-specific equivalents.
- When a component is missing, pause for explicit consent before generating its temporary preview candidate.
- User feedback revises the same managed preview and creates a new screenshot revision.
- Approval hands the exact approved screenshots and UX contract to CocoRef; rejection revises or cancels without application promotion.

- Invalid input or schema returns a field-specific stable diagnostic and correction guidance.
- Journey dead ends or incomplete transitions identify the affected node, trigger, and missing outcome.
- Missing required states identify incomplete rows in the state matrix.
- Inaccessible interaction reports missing keyboard, focus, announcement, feedback, or recovery behavior.
- A changed project snapshot marks recommendations stale and requires a fresh inventory audit.
- Unavailable components produce reuse alternatives or an explicit consent request; they are never silently created.
- CocoSpec, Design Profile, CocoRef, or UX contract conflicts block approval until canonical sources are aligned.
- Preview render or screenshot failure preserves canonical state and offers a deterministic retry.
- Source-hash mismatch blocks approval and handoff so only the reviewed preview can continue.
- Limits, timeout, or cancellation return sanitized diagnostics and clean managed temporary artifacts.

## Interface states

- draft: a brief exists but the UX contract is incomplete.
- auditing: project inventory and canonical sources are being inspected.
- designing-journey: actors, goals, entries, steps, and branches are being completed.
- designing-states: required state matrices and transitions are being completed.
- designing-interactions: triggers, feedback, keyboard behavior, and recovery are being specified.
- recommending-visuals: hierarchy, layout, components, tokens, and motion are being recommended.
- awaiting-consent: at least one missing component requires explicit user permission.
- building-preview: the managed temporary website is rendering.
- preview-ready: versioned screenshots and the real local preview are ready for review.
- revising: concrete user feedback is being applied to the same candidate.
- approved: the visual direction may be handed to CocoRef but application source is not promoted.
- handed-off: approved screenshots and the UX contract are linked from CocoRef.
- stale: project, CocoSpec, Design Profile, or CocoRef state changed after audit.
- error or cancelled: state is recoverable, diagnostics are sanitized, and managed temporary files are cleaned.
- Every product UX contract reviews initial, loading, empty, success, validation, disabled, error, offline, and permission states; non-applicable states require a reviewed rationale.

### Accessibility

- Target WCAG 2.2 AA.
- Every interaction declares a keyboard equivalent and focus behavior.
- Focus order follows the journey and cannot become trapped.
- Loading, validation, success, and error feedback declares announcement semantics.
- Status is never communicated by color alone.
- Every screenshot has a text description and metadata and is never the sole decision source.
- Journey and state diagrams include deterministic text equivalents.
- Visual recommendations use verified contrast-safe design tokens.
- Motion recommendations include reduced-motion behavior.
- Preview QA includes keyboard, forced colors, 200 percent text zoom, labels, semantics, and visible focus.

### Responsive behavior

CocoUX renders real responsive layouts and captures evidence at 320x568, 390x844, 768x1024, 1366x768, and 3840x2160. It must not scale a desktop bitmap to simulate responsiveness. Every preview avoids horizontal overflow, preserves hierarchy and touch targets, and records viewport, theme, state, revision, and source hash.

## Authentication and security

Not applicable.

- Preview URLs are local HTTP only and development-only __cocoux routes are excluded from production builds.
- CocoUX never captures authenticated pages, cookies, tokens, authorization headers, private external pages, or real user data.
- Managed previews use deterministic fixture content and no production data.
- Version 1 performs no network request and permits no arbitrary external assets.
- All managed paths remain workspace-confined and reject symlink traversal.
- Screenshot metadata contains only relative paths, viewport, theme, state, revision, and hashes.
- Approval is bound to the canonical UX contract hash and preview source hash.
- AI and unknown roles cannot grant approval.
- Every missing component requires explicit user consent before candidate generation.
- Approval, handoff, cancellation, and failed partial generation clean managed temporary source and routes.
- Diagnostics and events do not expose source content, sensitive values, absolute paths, or image bytes.
- File count, file size, screenshot count, payload, and execution time have explicit safety limits.

## Data and integrations

### Does this feature use no persistence, existing data, new data, or both existing and new data?

new

### Define entities, fields, identifiers, constraints, and relationships needed by this feature.

{"entities":[{"name":"UxDocument","fields":[{"name":"version","type":"literal-1","key":true,"nullable":false},{"name":"feature","type":"FeatureIdentity","key":true,"nullable":false},{"name":"state","type":"UxLifecycleState","key":false,"nullable":false},{"name":"revision","type":"positive-integer","key":false,"nullable":false},{"name":"sourceHashes","type":"record<string,sha256>","key":false,"nullable":false},{"name":"createdAt","type":"timestamp","key":false,"nullable":false},{"name":"updatedAt","type":"timestamp","key":false,"nullable":false},{"name":"approvedAt","type":"timestamp","key":false,"nullable":true},{"name":"handedOffAt","type":"timestamp","key":false,"nullable":true}]},{"name":"SourceBinding","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"kind","type":"cocospec|cocoref|design-profile|project-snapshot","key":false,"nullable":false},{"name":"file","type":"relative-path","key":false,"nullable":true},{"name":"state","type":"string","key":false,"nullable":false},{"name":"hash","type":"sha256","key":false,"nullable":false}]},{"name":"Actor","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"name","type":"string","key":false,"nullable":false},{"name":"goals","type":"string[]","key":false,"nullable":false},{"name":"permissions","type":"string[]","key":false,"nullable":false}]},{"name":"Journey","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"actorId","type":"Actor.id","key":false,"nullable":false},{"name":"goal","type":"string","key":false,"nullable":false},{"name":"entryPoints","type":"string[]","key":false,"nullable":false},{"name":"stepIds","type":"JourneyStep.id[]","key":false,"nullable":false},{"name":"alternatePaths","type":"string[]","key":false,"nullable":false},{"name":"successOutcome","type":"string","key":false,"nullable":false}]},{"name":"JourneyStep","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"journeyId","type":"Journey.id","key":false,"nullable":false},{"name":"order","type":"non-negative-integer","key":false,"nullable":false},{"name":"screenId","type":"Screen.id","key":false,"nullable":false},{"name":"action","type":"string","key":false,"nullable":false},{"name":"stateId","type":"UiState.id","key":false,"nullable":false},{"name":"outcome","type":"string","key":false,"nullable":false},{"name":"nextStepIds","type":"JourneyStep.id[]","key":false,"nullable":false}]},{"name":"Screen","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"routeOrSurface","type":"string","key":false,"nullable":false},{"name":"purpose","type":"string","key":false,"nullable":false},{"name":"stateIds","type":"UiState.id[]","key":false,"nullable":false}]},{"name":"UiState","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"screenId","type":"Screen.id","key":false,"nullable":false},{"name":"kind","type":"initial|loading|empty|success|validation|disabled|error|offline|permission|custom","key":false,"nullable":false},{"name":"applicability","type":"applicable|not-applicable","key":false,"nullable":false},{"name":"rationale","type":"string","key":false,"nullable":false},{"name":"entryCondition","type":"string","key":false,"nullable":false},{"name":"content","type":"string","key":false,"nullable":false},{"name":"availableActions","type":"string[]","key":false,"nullable":false},{"name":"recovery","type":"string","key":false,"nullable":true}]},{"name":"Transition","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"fromStateId","type":"UiState.id","key":false,"nullable":false},{"name":"toStateId","type":"UiState.id","key":false,"nullable":false},{"name":"trigger","type":"string","key":false,"nullable":false},{"name":"guard","type":"string","key":false,"nullable":true},{"name":"feedback","type":"string","key":false,"nullable":false},{"name":"outcome","type":"string","key":false,"nullable":false},{"name":"recovery","type":"string","key":false,"nullable":true}]},{"name":"Interaction","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"stateId","type":"UiState.id","key":false,"nullable":false},{"name":"target","type":"string","key":false,"nullable":false},{"name":"trigger","type":"string","key":false,"nullable":false},{"name":"behavior","type":"string","key":false,"nullable":false},{"name":"keyboard","type":"string","key":false,"nullable":false},{"name":"focus","type":"string","key":false,"nullable":false},{"name":"announcement","type":"string","key":false,"nullable":true},{"name":"feedback","type":"string","key":false,"nullable":false},{"name":"recovery","type":"string","key":false,"nullable":true}]},{"name":"VisualRecommendation","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"screenId","type":"Screen.id","key":false,"nullable":false},{"name":"stateIds","type":"UiState.id[]","key":false,"nullable":false},{"name":"hierarchy","type":"string[]","key":false,"nullable":false},{"name":"layout","type":"structured","key":false,"nullable":false},{"name":"components","type":"string[]","key":false,"nullable":false},{"name":"tokens","type":"record<string,string>","key":false,"nullable":false},{"name":"typography","type":"structured","key":false,"nullable":false},{"name":"color","type":"structured","key":false,"nullable":false},{"name":"motion","type":"structured","key":false,"nullable":false},{"name":"responsive","type":"structured","key":false,"nullable":false},{"name":"rationale","type":"string","key":false,"nullable":false}]},{"name":"ComponentDecision","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"recommendationId","type":"VisualRecommendation.id","key":false,"nullable":false},{"name":"decision","type":"reuse|missing","key":false,"nullable":false},{"name":"inventoryId","type":"string","key":false,"nullable":true},{"name":"rationale","type":"string","key":false,"nullable":false},{"name":"consent","type":"pending|approved|declined|not-required","key":false,"nullable":false}]},{"name":"PreviewRevision","fields":[{"name":"revision","type":"positive-integer","key":true,"nullable":false},{"name":"sourcePaths","type":"relative-path[]","key":false,"nullable":false},{"name":"sourceHashes","type":"record<relative-path,sha256>","key":false,"nullable":false},{"name":"previewUrl","type":"local-http-url","key":false,"nullable":false},{"name":"status","type":"building|ready|revising|approved|cancelled","key":false,"nullable":false},{"name":"feedback","type":"Feedback[]","key":false,"nullable":false}]},{"name":"ScreenshotEvidence","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"previewRevision","type":"PreviewRevision.revision","key":false,"nullable":false},{"name":"stateId","type":"UiState.id","key":false,"nullable":false},{"name":"viewport","type":"width-height","key":false,"nullable":false},{"name":"theme","type":"string","key":false,"nullable":false},{"name":"file","type":"relative-png-path","key":false,"nullable":false},{"name":"sourceHash","type":"sha256","key":false,"nullable":false},{"name":"imageHash","type":"sha256","key":false,"nullable":false},{"name":"description","type":"string","key":false,"nullable":false}]},{"name":"Approval","fields":[{"name":"revision","type":"PreviewRevision.revision","key":true,"nullable":false},{"name":"reviewerRole","type":"application-developer|framework-maintainer","key":false,"nullable":false},{"name":"contractHash","type":"sha256","key":false,"nullable":false},{"name":"previewHash","type":"sha256","key":false,"nullable":false},{"name":"approvedAt","type":"timestamp","key":false,"nullable":false}]},{"name":"CocoRefHandoff","fields":[{"name":"refId","type":"slug","key":true,"nullable":false},{"name":"refFile","type":"relative-path","key":false,"nullable":false},{"name":"screenshotFiles","type":"relative-path[]","key":false,"nullable":false},{"name":"hashes","type":"record<relative-path,sha256>","key":false,"nullable":false},{"name":"status","type":"pending|completed|failed","key":false,"nullable":false},{"name":"createdAt","type":"timestamp","key":false,"nullable":false}]}],"relationships":[{"from":"UxDocument","to":"SourceBinding","type":"one-to-many","label":"binds canonical sources"},{"from":"UxDocument","to":"Actor","type":"one-to-many","label":"defines actors"},{"from":"Actor","to":"Journey","type":"one-to-many","label":"owns journeys"},{"from":"Journey","to":"JourneyStep","type":"one-to-many","label":"orders steps"},{"from":"Screen","to":"UiState","type":"one-to-many","label":"defines complete states"},{"from":"UiState","to":"Transition","type":"many-to-many","label":"connects states"},{"from":"UiState","to":"Interaction","type":"one-to-many","label":"exposes interactions"},{"from":"Screen","to":"VisualRecommendation","type":"one-to-many","label":"receives visual recommendations"},{"from":"VisualRecommendation","to":"ComponentDecision","type":"one-to-many","label":"audits component use"},{"from":"UxDocument","to":"PreviewRevision","type":"one-to-many","label":"tracks previews"},{"from":"PreviewRevision","to":"ScreenshotEvidence","type":"one-to-many","label":"captures evidence"},{"from":"PreviewRevision","to":"Approval","type":"zero-or-one","label":"receives visual-direction approval"},{"from":"UxDocument","to":"CocoRefHandoff","type":"zero-or-one","label":"hands off approved direction"}]}

### Define ownership, retention, deletion, audit, privacy, and backfill behavior for affected data.

{"ownership":"The project owns ux/<feature>/ux.json, approved review artifacts, and approved screenshots; canonical assets may be committed to Git.","retention":"Preserve canonical decisions, feedback metadata, approval hashes, and handoff history. Keep approved screenshots until the project explicitly removes the feature.","temporaryData":"Store candidate source, routes, partial captures, and rejected screenshots only under managed CocoUX temporary paths and remove them after successful handoff or cancellation.","invalidation":"Any change to journeys, states, transitions, interactions, visual recommendations, source bindings, Design Profile fingerprint, CocoRef state, or project snapshot invalidates approval and handoff readiness.","privacy":"Use deterministic fixture content only. Persist no production user data, authenticated content, cookies, authorization values, secrets, private URLs, or screenshot bytes in logs.","deletion":"Version 1 has no destructive delete command. Cancellation cleans temporary artifacts but preserves canonical decision history.","audit":"Keep append-only reviewed feedback, consent, approval, cancellation, and handoff records with timestamps and hashes but without source content.","backfill":"There is no v0 backfill. Future migrations create a backup, validate the migrated contract, and require an explicit user command; silent migration is forbidden."}

- CocoSpecs supplies approved product behavior and acceptance context.
- Project inspection supplies routes, islands, components, dependencies, generated capabilities, and design-token inventory.
- @cocoframe/ui, @cocoframe/icons, the Design Profile, and Product Design Quality supply reuse-first visual primitives and constraints.
- CocoRef owns external-reference fidelity, missing-component consent, exact-candidate approval, and application-source promotion.
- CocoQA derives traceable quality cases and owns release approval.
- Agent Bridge exposes the same provider-independent workflow to developers and AI.
- The local server-first isolated build renders managed preview source.
- A browser capture adapter creates PNG screenshots; version 1 has no external design provider.
- Preview builds time out after 60 seconds and each viewport/state capture times out after 30 seconds.
- Capture or adapter failure preserves canonical state, records a sanitized diagnostic, cleans partial artifacts, and supports deterministic retry.

## Existing project context

No project snapshot was recorded.

## Non-functional requirements

### Which safe events, metrics, traces, and alerts prove the feature is operating correctly?

["Emit safe events ux.created, ux.audit.completed, ux.validation.completed, ux.preview.started, ux.preview.completed, ux.preview.failed, ux.feedback.recorded, ux.approved, ux.handoff.completed, ux.handoff.failed, ux.cancelled, ux.cleanup.completed, and ux.cleanup.failed.","Event attributes are limited to feature ID, revision, status, duration, journey/state/interaction counts, reuse/missing counts, viewport, and hashes.","Track validation latency, preview build latency, capture latency, handoff latency, diagnostic counts, stale-contract count, and cleanup failures.","Alert on repeated preview failures, source-hash mismatches, failed cleanup, or failed handoff integrity checks.","Never log screenshot bytes, user-authored copy, secrets, absolute paths, source code, cookies, authorization data, or arbitrary diagnostic evidence."]

### What latency, payload, concurrency, or browser-performance limits must hold?

["create, resume, and status target under 200 ms on the reference project.","Static audit, validation, and deterministic artifact generation target under 2 seconds.","Audit at most 10,000 project files and read at most 1 MiB per file.","Preview build timeout is 60 seconds and screenshot capture timeout is 30 seconds per viewport/state.","Capture runs serially for deterministic output and bounded host load.","A capture run allows at most 50 screenshots, 5 MiB per PNG, and 100 MiB total output.","Canonical ux.json is limited to 1 MiB.","A contract allows at most 1,000 journey steps and returns at most 1,000 diagnostics.","Managed previews remain server-first; browser JavaScript is opt-in only for interactions that genuinely require an island.","Cancellation uses one AbortSignal across audit, generation, build, capture, and cleanup.","Performance-sensitive implementation must pass both repository benchmarks without material regression."]

## Out of scope

- A free-form pixel-level visual canvas or general-purpose design editor.
- AI-generated bitmap mockups disconnected from real rendered source in version 1.
- External Figma or design-provider integration in version 1.
- Executing untrusted application or configuration source outside the managed preview build.
- Network requests, authenticated-page capture, or collection of private external references.
- Automatic application-source mutation or promotion from CocoUX.
- Replacing CocoSpecs, CocoRef, Design Profile, Product Design Quality, or CocoQA.
- Production analytics collection or participant-based usability research.
- AI self-approval or implied consent for missing components.

## Unresolved decisions

All required discovery questions are resolved.
