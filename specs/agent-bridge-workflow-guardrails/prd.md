# Agent Bridge Workflow Guardrails

> CocoSpecs v1 · thorough mode · approved

## Summary

Make Agent Bridge enforce the complete AI-first feature workflow instead of merely exposing optional tools. For every user request that creates or changes a user-facing feature, page, component, route, or link, the AI must inspect the project, create or resume CocoSpecs before planning or mutation, ask only the next adaptive question batch, obtain specification approval, explicitly request and assess an image or website reference, use CocoRef when a reference exists, record an explicit no-reference decision before AI-led design when none exists, audit reusable components before proposing new ones, require mutation approval, and run CocoQA with Product Design Quality. Any generated navigation link, CTA, route, page, anchor, or API reference must resolve to an existing accessible target and be verified through route inspection plus runtime or E2E evidence. Unsupported or skipped lifecycle steps must return stable machine-readable diagnostics rather than silently continuing.

## Users and permissions

Application developers and product users provide intent, answer CocoSpecs and reference questions, and approve application mutations. Product Owners or Designers review visual direction and references. QA or Release Reviewers approve quality evidence. Framework Maintainers approve changes in a CocoFrame framework workspace. The MCP host manages connection and elicitation. AI agents may inspect, interview, plan, and execute approved operations but can never approve their own specification, component, mutation, waiver, or QA result.

## Success outcome

A supported AI client cannot silently skip the required workflow for user-facing creation or change. It inspects the workspace, completes and receives approval for CocoSpecs, records a visual-reference decision and completes CocoRef when applicable, audits reusable capabilities, obtains mutation approval, proves every created link or route resolves to an accessible working target, runs visual QA including alignment across approved responsive states, and completes CocoQA with traceable evidence and explicit human approval. Missing prerequisites return stable diagnostics and leave the workspace unchanged.

## Entry points

- A feature or change request sent by a user through a supported MCP AI client.
- A local CocoFrame workspace opened through cocoframe agent <project>.
- An editor integration that connects to Agent Bridge for the selected workspace.
- A resume request that names an existing canonical CocoSpec feature ID.
- A direct mutation.plan attempt, which must first pass workflow prerequisite validation instead of bypassing lifecycle discovery.

## Happy path

1. The user connects a supported AI client to Agent Bridge and submits a request.
2. Agent Bridge validates the workspace, protocol version, permissions, and supported capabilities.
3. The AI classifies the request as read-only assistance or a user-facing mutation.
4. The AI calls project.inspect and searches documentation, components, routes, and APIs.
5. For a user-facing mutation, the AI creates or resumes CocoSpecs before implementation planning or mutation.
6. The AI asks only the next adaptive CocoSpecs question batch until the specification is complete.
7. The user reviews and explicitly approves the CocoSpec.
8. For visual work, the AI asks whether an image or website reference exists and records the decision.
9. When a reference exists, the AI runs CocoRef, audits existing components, requests consent for missing components, previews them, and waits for approval.
10. When no reference exists, the AI records no-reference and proposes a direction from the Design Profile and reusable components.
11. The AI produces an implementation plan tied to approved acceptance criteria and lifecycle states.
12. Agent Bridge requests explicit approval for the exact mutation targets.
13. The AI executes only approved targets and refreshes generated artifacts through their owning commands when required.
14. The AI inspects every created or changed link, CTA, route, anchor, page, and API reference against the project route graph.
15. The AI verifies target reachability, accessible names, keyboard operation, and intended navigation or action through runtime or E2E evidence.
16. The AI runs CocoQA with Product Design Quality, including alignment, spacing, contrast, overflow, responsive states, text zoom, and reference fidelity when applicable.
17. The user reviews and explicitly approves the final QA state.
18. The AI reports lifecycle decisions, reused components, mutations, link evidence, visual evidence, defects, and unresolved risks.

## Alternate and failure paths

- Read-only explanation, audit, or recommendation stops after project.inspect and search without lifecycle mutation.
- An existing approved CocoSpec skips interviewing and continues to the reference decision.
- Non-visual work records the visual-reference decision as not-applicable.
- Visual work without a reference records no-reference and uses the Design Profile plus reusable components for AI-led direction.
- Visual work with an image or website reference completes CocoRef before implementation.
- An existing component or route satisfies the request and is reused without creating an equivalent.
- A missing component enters CocoRef consent, preview, feedback, revision, and approval.
- Partial mutation approval changes only approved targets and leaves all other targets unchanged.
- An existing page is reused without creating a new route.
- A requested internal link has no target, so the route or page is implemented and verified before the link is accepted.
- Visual alignment QA fails, so defects are recorded, implementation is revised, and affected visual gates rerun.
- Interview, reference review, mutation approval, or QA approval is paused and later resumed from canonical state.
- An implementation already exists, so coding is skipped and route integrity, traceability, visual QA, and CocoQA still run.

- {"code":"WORKFLOW_CONTEXT_REQUIRED","message":"The requested mutation is not bound to a validated workflow context.","recovery":"Begin or resume the feature workflow and bind the operation to its inspected workspace and lifecycle records."}
- {"code":"SPECIFICATION_REQUIRED","message":"A user-facing mutation requires a canonical CocoSpec.","recovery":"Create or resume CocoSpecs and answer only the next adaptive question batch."}
- {"code":"SPECIFICATION_NOT_APPROVED","message":"The bound CocoSpec is not approved.","recovery":"Complete, generate, review, and explicitly approve the specification."}
- {"code":"REFERENCE_DECISION_REQUIRED","message":"Visual work has no recorded reference decision.","recovery":"Ask whether an image or website reference exists and record reference, no-reference, or not-applicable."}
- {"code":"COCOREF_REQUIRED","message":"A provided visual reference has not completed CocoRef.","recovery":"Audit reusable components and complete the reference consent, preview, and approval lifecycle."}
- {"code":"COMPONENT_AUDIT_REQUIRED","message":"Reusable capabilities were not audited before a new component was proposed.","recovery":"Run project inspection, documentation search, and component discovery before revising the proposal."}
- {"code":"APPROVAL_REQUIRED","message":"The declared mutation has not received valid human approval.","recovery":"Present exact targets and wait for approve, revise, partial approval, or deny."}
- {"code":"LINK_TARGET_MISSING","message":"An internal link, CTA, route, anchor, page, or API reference has no matching target.","recovery":"Create or select a real accessible target, inspect the route graph again, and rerun link verification."}
- {"code":"TARGET_NOT_REACHABLE","message":"A declared navigation target does not return an expected successful or redirect response.","recovery":"Repair the route or target and repeat runtime or E2E verification."}
- {"code":"INERT_INTERACTION","message":"A visible link or control does not perform the action communicated by its label.","recovery":"Implement the intended navigation or action and verify keyboard and pointer operation."}
- {"code":"VISUAL_ALIGNMENT_FAILED","message":"Required grid, container, baseline, icon-label, card, or column alignment is outside the approved rules.","recovery":"Record a visual defect, correct the layout using approved tokens or components, and rerun affected viewports."}
- {"code":"VISUAL_EVIDENCE_REQUIRED","message":"Required visual or alignment evidence is missing.","recovery":"Capture sanitized computed measurements, screenshots, accessibility results, and reviewer evidence for the declared states."}
- {"code":"GENERATED_ARTIFACT_STALE","message":"A generated route, client, OpenAPI, CSS declaration, or API reference is stale.","recovery":"Run the owning CocoFrame generator and verify freshness without editing generated output manually."}
- {"code":"STATE_CONFLICT","message":"The workspace or lifecycle source changed after review.","recovery":"Cancel execution, inspect current state, rebuild the plan, and request approval again."}
- {"code":"CAPABILITY_UNAVAILABLE","message":"Agent Bridge cannot perform a required verification or operation.","recovery":"Return the structured capability gap and ask the user whether to provide external evidence, use a supported path, or cancel."}

## Interface states

- {"state":"initial","behavior":"MCP is connected but capability discovery and workflow validation have not completed."}
- {"state":"loading","behavior":"Inspect, search, lifecycle validation, or evidence collection is running, reports its stage, and remains cancellable."}
- {"state":"empty","behavior":"No canonical CocoSpec, reference decision, or QA record exists; the result names only the next required action."}
- {"state":"success","behavior":"A readiness summary lists satisfied prerequisites, bound canonical sources, verified targets, and the next allowed action."}
- {"state":"validation","behavior":"Mutation is blocked and every missing or stale prerequisite is returned with a corrective diagnostic."}
- {"state":"disabled","behavior":"Approval or execution is unavailable when state is incomplete, stale, expired, denied, cancelled, consumed, or role-invalid."}
- {"state":"error","behavior":"A versioned structured diagnostic contains code, message, failed stage, affected target when safe, and recovery."}
- {"state":"preview","behavior":"A missing visual component uses the existing temporary CocoRef preview route and approval loop."}
- {"state":"completed","behavior":"The final summary includes lifecycle states, verified links, visual-alignment evidence, gates, defects, approvals, and unresolved risks."}
- {"state":"presentation","behavior":"Agent Bridge provides structured MCP data and native elicitation; it does not create a standalone GUI."}

### Accessibility

- Every native MCP elicitation field has a concise label, description, validation message, and logical focus order.
- Interview, reference, mutation, and QA approval interactions are operable with a keyboard.
- Status, failure, selection, and approval are never communicated by color alone.
- Errors and state transitions are available as plain structured text suitable for assistive announcements.
- Every generated link and interactive control has an accessible name that matches its navigation or action.
- Visible focus indicators and meaningful text or control contrast meet WCAG 2.2 AA.
- CocoRef previews and generated pages use semantic headings, landmarks, reading order, labels, and keyboard navigation.
- Generated visual interfaces remain usable at 200 percent text zoom, in forced colors, and with reduced motion.
- Visual alignment must not change semantic reading order or keyboard focus order.
- Inert, unnamed, unreachable, or misleading controls are release-blocking defects.

### Responsive behavior

["Structured MCP contracts remain provider-independent and contain no screen-size-dependent protocol behavior.","Generated UI and CocoRef previews are verified at 320x568, 390x844, 768x1024, 1366x768, and 3840x2160.","Verification includes 200 percent text zoom, long content, light and dark themes, forced colors, and reduced motion.","Grid, container, text baseline, icon-label, card, column, CTA, and navigation alignment remain consistent across approved states.","No approved state has unintended horizontal overflow, clipping, overlap, broken reading order, or inert controls.","When CocoRef exists, alignment and fidelity are compared at every approved reference viewport.","Without CocoRef, alignment is evaluated against the Design Profile, semantic components, and declared layout rules.","Critical or high alignment, overflow, accessibility, or unreachable-target defects always block release."]

## Authentication and security

Not applicable.

- Read-only operations never change source files, generated artifacts, Git state, package state, databases, or external systems.
- Every mutation requires role-valid human approval that is hash-bound, target-specific, expiring, immutable, subset-selectable, and single-use.
- Framework workspaces require framework-maintainer approval; application workspaces accept application-developer or framework-maintainer.
- An AI agent cannot approve its own specification, reference component, mutation, design waiver, or QA result.
- Every supplied or discovered path remains confined to the approved workspace; traversal and linked escapes are rejected.
- Secrets, cookies, authorization headers, tokens, request bodies, private screenshot content, and URL query credentials are never exposed or persisted.
- Canonical workflow source hashes and current target hashes are revalidated immediately before mutation execution.
- Input fields, output size, scan count, target count, evidence count, file size, timeout, and concurrency are bounded.
- Agent Bridge performs no external URL requests, image understanding, browser automation, arbitrary shell, Git, package, deployment, or database operation.
- Visual evidence must be sanitized and declared; suspected sensitive evidence returns SENSITIVE_VISUAL_EVIDENCE_BLOCKED.
- Malformed input and unsupported protocol versions return versioned corrective diagnostics without crashing.
- Cancellation stops remaining work, cleans temporary state when applicable, and preserves the last valid canonical state.

## Data and integrations

### Does this feature use no persistence, existing data, new data, or both existing and new data?

existing

### Define entities, fields, identifiers, constraints, and relationships needed by this feature.

{"entities":[{"name":"WorkflowBinding","fields":[{"name":"version","type":"integer","key":false,"nullable":false},{"name":"featureId","type":"slug","key":true,"nullable":false},{"name":"requestKind","type":"enum(read-only,user-facing-mutation,mechanical-mutation)","key":false,"nullable":false},{"name":"inspectionHash","type":"sha256","key":false,"nullable":false},{"name":"specId","type":"slug","key":false,"nullable":true},{"name":"specState","type":"enum(draft,ready,approved)","key":false,"nullable":true},{"name":"specHash","type":"sha256","key":false,"nullable":true},{"name":"referenceDecision","type":"enum(reference,no-reference,not-applicable)","key":false,"nullable":false},{"name":"refId","type":"slug","key":false,"nullable":true},{"name":"refState","type":"string","key":false,"nullable":true},{"name":"refHash","type":"sha256","key":false,"nullable":true},{"name":"componentAuditCompleted","type":"boolean","key":false,"nullable":false},{"name":"componentInventoryHash","type":"sha256","key":false,"nullable":false},{"name":"designProfileHash","type":"sha256","key":false,"nullable":true},{"name":"createdAt","type":"timestamp","key":false,"nullable":false}]},{"name":"TargetVerificationRequirement","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"kind","type":"enum(link,route,page,anchor,api,action,external-link)","key":false,"nullable":false},{"name":"sourcePath","type":"workspace-relative-path","key":false,"nullable":false},{"name":"target","type":"sanitized-target","key":false,"nullable":false},{"name":"requiredEvidence","type":"string-array","key":false,"nullable":false},{"name":"status","type":"enum(pending,passed,failed,blocked,not-applicable)","key":false,"nullable":false},{"name":"evidenceHash","type":"sha256","key":false,"nullable":true}]},{"name":"VisualQaRequirement","fields":[{"name":"id","type":"slug","key":true,"nullable":false},{"name":"principle","type":"enum(alignment,spacing,contrast,overflow,responsive,accessibility,fidelity)","key":false,"nullable":false},{"name":"viewports","type":"viewport-array","key":false,"nullable":false},{"name":"states","type":"string-array","key":false,"nullable":false},{"name":"required","type":"boolean","key":false,"nullable":false},{"name":"status","type":"enum(pending,passed,failed,blocked,not-applicable)","key":false,"nullable":false},{"name":"evidenceHash","type":"sha256","key":false,"nullable":true}]}],"relationships":[{"from":"AgentOperationPlan","to":"WorkflowBinding","type":"one-to-one","label":"is authorized by"},{"from":"WorkflowBinding","to":"CanonicalLifecycleSource","type":"many-to-many","label":"references by ID and hash"},{"from":"WorkflowBinding","to":"TargetVerificationRequirement","type":"one-to-many","label":"requires"},{"from":"WorkflowBinding","to":"VisualQaRequirement","type":"one-to-many","label":"requires"}],"storage":"Embed versioned records into existing .cocoframe/agent operation metadata; no database or parallel canonical root."}

### Define ownership, retention, deletion, audit, privacy, and backfill behavior for affected data.

{"ownership":"The workspace owner owns canonical lifecycle documents and local Agent Bridge records.","canonicalRetention":"CocoSpecs, CocoRef, CocoQA, and Design Profile files follow the project source-control and retention policy.","agentRetention":".cocoframe/agent remains Git-ignored and stores only versioned sanitized metadata and hashes until the workspace owner explicitly cleans it.","inMemoryRetention":"Proposal content exists only in the active Agent Bridge process and is discarded on completion, disconnect, cancellation, expiry, or process exit.","expiry":"Operations and approvals expire after 15 minutes by default.","cancellation":"Disconnect, cancellation, denial, or expiry removes in-memory proposal content and preserves only a sanitized hash-only audit record.","forbiddenPersistence":["Prompts","Source content or diffs","Request bodies","Raw external URLs or query strings","Screenshots or private visual content","Credentials, secrets, tokens, cookies, or authorization headers"],"backfill":"No automatic backfill is performed for legacy operation records.","legacyBehavior":"A legacy record without workflow binding remains readable for audit but cannot authorize a new mutation.","deletion":"Local audit-history deletion is an explicit workspace-owner operation outside Agent Bridge background behavior.","canonicalCancellation":"Cancelling an operation does not delete approved canonical lifecycle artifacts."}

- {"system":"Project inspection","ownership":"Agent Bridge read-only discovery","behavior":"Returns bounded routes, APIs, components, islands, middleware, dependencies, and generated capabilities.","failure":"Return a stable workspace or capability diagnostic without mutation."}
- {"system":"Documentation, component, and API discovery","ownership":"Existing Agent Bridge search tools","behavior":"Return reusable capabilities and source locations before new implementation.","failure":"Return bounded empty results or CAPABILITY_UNAVAILABLE; do not invent a capability."}
- {"system":"CocoSpecs","ownership":"@cocoframe/specs","behavior":"Owns adaptive product decisions, generated review artifacts, and specification approval.","failure":"Block user-facing mutation when the canonical specification is missing, incomplete, invalid, or unapproved."}
- {"system":"CocoRef","ownership":"@cocoframe/cocoref","behavior":"Owns reference audit, missing-component consent, preview, revision, approval, and cleanup.","failure":"Block reference-bound visual implementation when the reference lifecycle is incomplete or stale."}
- {"system":"CocoQA and Product Design Quality","ownership":"@cocoframe/qa","behavior":"Own traceability, link and visual evidence, gates, defects, and final approval.","failure":"Return failed or blocked cases and refuse release approval."}
- {"system":"Design Profile","ownership":"Project canonical configuration","behavior":"Provides semantic tokens, alignment rules, icon policy, breakpoints, and a source fingerprint.","failure":"Reject invalid or stale profiles and invalidate dependent approval."}
- {"system":"Mutation manager","ownership":"@cocoframe/agent","behavior":"Binds exact writes to workflow sources and human approval.","failure":"Fail closed on role, expiry, hash, state, target, or claim conflicts."}
- {"system":"MCP host","ownership":"Supported AI client or editor","behavior":"Provides connection lifecycle, native elicitation, cancellation, and human approval presentation.","failure":"Return CONNECTION_FAILED, OPERATION_CANCELLED, timeout, or capability diagnostics."}
- {"system":"AI provider evidence","ownership":"AI client/provider","behavior":"May supply sanitized image understanding, browser measurements, screenshots, and runtime or E2E evidence.","failure":"If evidence capability is unavailable, return CAPABILITY_UNAVAILABLE and do not claim link, fidelity, or visual gates passed."}
- {"system":"Generators","ownership":"Existing CocoFrame commands","behavior":"Refresh clients, OpenAPI, CSS declarations, assets, and API documentation from owning sources.","failure":"Return GENERATED_ARTIFACT_STALE until the host runs the required generator."}

## Existing project context

No project snapshot was recorded.

## Non-functional requirements

### Which safe events, metrics, traces, and alerts prove the feature is operating correctly?

{"events":["workflow.started","workflow.inspected","workflow.prerequisite_blocked","specification.approved","reference.decision_recorded","component.audit_completed","mutation.planned","mutation.approved","mutation.executed","target.verification_completed","visual_alignment.gate_completed","qa.completed"],"metrics":["Stage duration","Blocked prerequisite count by sanitized code","Reused component count","Missing or unreachable target count","Visual alignment defect count by severity","Required gate result","Approval outcome"],"correlation":"Use only session ID, operation ID, feature ID, and sanitized target hashes.","forbidden":["Prompts","File content or diffs","Request bodies","Secrets, credentials, cookies, or authorization headers","Raw external URLs or sensitive query strings","Screenshots or private visual content"],"alerts":["Repeated state conflicts","Partial mutation or rollback failure","Sensitive output blocking","Unreachable internal target","Critical or high visual alignment, overflow, contrast, or accessibility failure"],"telemetry":"No remote telemetry by default; a host may explicitly consume sanitized events."}

### What latency, payload, concurrency, or browser-performance limits must hold?

["Workflow prerequisite validation completes within 100 milliseconds after canonical sources are available.","Full preflight including bounded inspection and search completes within 2 seconds for a workspace containing up to 10000 files.","Internal route and link graph validation completes within 2 seconds for up to 10000 target usages.","Validation of up to 10000 sanitized visual measurements completes within 2 seconds.","Each read-only MCP stage has a maximum 30-second timeout and supports client cancellation.","A complete provider-owned visual audit is limited to 2 minutes.","Each MCP response remains limited to 1 MiB.","Each canonical lifecycle document remains limited to 1 MiB and a Design Profile to 256 KiB.","A mutation remains limited to 20 explicit targets and mutation execution is serialized per workspace.","No persistent background job continues after the AI client disconnects.","Workflow guardrails add no browser JavaScript, island, hydration, or visual runtime payload."]

## Out of scope

- Performing provider-owned image understanding, website crawling, or browser automation inside Agent Bridge.
- Providing arbitrary shell commands, Git operations, npm publishing, deployment, database mutation, migration, or external-service actions.
- Allowing AI agents to approve their own specification, reference candidate, mutation, design waiver, or QA result.
- Guaranteeing pixel-perfect design without an approved reference or Design Profile.
- Direct external-link crawling by Agent Bridge; provider-supplied evidence or an unresolved diagnostic remains required.
- Repairing every unrelated legacy link outside the declared change targets.
- Replacing CocoSpecs, CocoRef, CocoQA, or Product Design Quality with a parallel lifecycle.
- Providing a standalone visual editor, hosted visual-regression service, or persistent remote screenshot store.
- Guaranteeing compatibility with every MCP client or AI provider in the first release.

## Unresolved decisions

All required discovery questions are resolved.
