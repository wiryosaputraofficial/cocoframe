# CocoFrame Agent Bridge

> CocoSpecs v1 · thorough mode · approved

## Summary

Provide an official, provider-independent AI bridge for CocoFrame that exposes typed and safe project inspection, documentation, API and component discovery, plus CocoSpecs, CocoRef, and CocoQA workflows through MCP and CLI. Start with read-only discovery and require explicit user approval for every mutation.

## Users and permissions

["Application developer: may inspect and search the approved application workspace, run CocoSpecs, CocoRef, and CocoQA lifecycles, propose mutations, and explicitly approve mutations within a workspace they control.","Framework maintainer: has the application-developer capabilities for the CocoFrame framework repository and may configure experimental Agent Bridge capability policy within the approved repository; release, publish, deployment, and external mutations remain separately authorized and outside Agent Bridge version 1.","AI agent: may discover tools, inspect, search, plan, execute read-only workflows, and request approval, but cannot grant its own approval, widen permissions, change the approved workspace root, or execute undeclared mutations."]

## Success outcome

An AI client can connect to CocoFrame, discover its capabilities, inspect an existing project, find reusable components and APIs, execute the CocoSpecs, CocoRef, and CocoQA lifecycles, and request explicit approval before any mutation—without relying on custom repository parsing or provider-specific logic.

## Entry points

- A user asks a supported AI client to build or change something in a CocoFrame project.
- A user starts the workflow through a CocoFrame CLI command.
- A user starts the workflow through an editor integration.
- A supported AI client establishes an MCP connection to Agent Bridge.

## Happy path

1. The user opens a CocoFrame project through a supported AI client.
2. The AI client connects to Agent Bridge using MCP.
3. Agent Bridge validates the workspace, protocol version, and available permissions.
4. The AI discovers the available CocoFrame tools and capabilities.
5. The user requests a feature, such as a login page.
6. The AI calls project.inspect to understand existing routes, APIs, components, islands, and dependencies.
7. The AI searches documentation and reusable components.
8. The AI creates or resumes a CocoSpec and asks the next adaptive question batch.
9. The user completes and approves the CocoSpec.
10. The AI prepares an implementation plan from the approved acceptance criteria.
11. Agent Bridge requests explicit approval before any operation that changes state.
12. The AI implements the feature using only approved capabilities and targets.
13. The AI runs CocoQA and the required quality gates.
14. The user approves the QA result.
15. The AI reports the changes, test evidence, unresolved risks, and final state.

## Alternate and failure paths

- Existing specification: a CocoSpec already exists, so the AI resumes its interview or uses the approved specification.
- Read-only assistance: the user requests only an explanation, audit, or recommendation, so Agent Bridge stops after inspect or search without requesting mutation approval.
- Existing capability reuse: the AI finds an existing route, API, or component that satisfies the request and recommends reuse without creating a new implementation.
- Missing component with CocoRef: the component is unavailable, so the AI starts CocoRef, requests consent, creates a preview, and waits for approval.
- No visual reference: the feature has no image or website reference, so the CocoRef lifecycle is skipped.
- Interview paused: the user cannot answer a CocoSpecs question yet, so the draft state is preserved and can be resumed later.
- Specification revision: the user changes an answer after approval, invalidating the old approval; artifacts are regenerated and approval is requested again.
- Mutation denied: the user rejects the change, so the AI may still provide a plan, proposed diff, or recommendation without changing the workspace.
- Partial approval: the user approves only some actions, so Agent Bridge executes only approved targets and leaves all other targets unchanged.
- QA finds defects: CocoQA records a defect or failed gate, the AI returns to remediation, reruns verification, and requests new QA approval.
- Existing approved implementation: the implementation already exists, so the AI skips coding and proceeds to traceability and CocoQA.
- Unsupported capability: Agent Bridge returns a structured capability gap and requests a user decision instead of invoking arbitrary shell commands.

- {"failure":"CONNECTION_FAILED","message":"Agent Bridge could not be reached.","recovery":"Check the Agent Bridge process and connection configuration, then retry."}
- {"failure":"UNSUPPORTED_PROTOCOL_VERSION","message":"The AI client and Agent Bridge use incompatible protocol versions.","recovery":"Upgrade the client or Agent Bridge to a mutually supported version."}
- {"failure":"INVALID_WORKSPACE","message":"The selected directory is not a valid CocoFrame workspace.","recovery":"Select the correct project root and run workspace inspection again."}
- {"failure":"WORKSPACE_ACCESS_DENIED","message":"The requested path is outside the approved workspace.","recovery":"Use a path inside the approved project root or request explicit access."}
- {"failure":"INVALID_TOOL_INPUT","message":"The tool request does not match its declared input schema.","recovery":"Correct the reported fields and retry with schema-valid input."}
- {"failure":"CAPABILITY_UNAVAILABLE","message":"Agent Bridge does not provide the requested capability.","recovery":"Use a supported alternative or ask the user how to proceed."}
- {"failure":"APPROVAL_REQUIRED","message":"This operation would change state and requires explicit user approval.","recovery":"Present the mutation plan and wait for the user to approve, revise, or deny it."}
- {"failure":"APPROVAL_EXPIRED","message":"The approval is no longer valid.","recovery":"Inspect the current workspace state and request a new approval."}
- {"failure":"STATE_CONFLICT","message":"The workspace changed after the operation was reviewed.","recovery":"Cancel execution, inspect the changed targets, rebuild the plan, and request approval again."}
- {"failure":"MUTATION_FAILED","message":"The approved mutation could not be completed.","recovery":"Keep the workspace unchanged or roll back safely, report the cause, and retry only after correction."}
- {"failure":"PARTIAL_MUTATION","message":"The operation changed only part of its declared targets.","recovery":"Block further execution, report every affected target, and apply a reviewed rollback or recovery plan."}
- {"failure":"OPERATION_TIMEOUT","message":"The operation exceeded its configured time limit.","recovery":"Abort the operation, clean temporary artifacts, and retry with an appropriate limit when safe."}
- {"failure":"OPERATION_CANCELLED","message":"The operation was cancelled before completion.","recovery":"Stop all remaining work, clean temporary artifacts, and preserve the last valid canonical state."}
- {"failure":"INVALID_CANONICAL_STATE","message":"The CocoSpec, CocoRef, or CocoQA document is invalid or corrupted.","recovery":"Preserve the file, report its validation issues, repair it explicitly, and validate again."}
- {"failure":"QUALITY_GATE_FAILED","message":"A required CocoQA quality gate did not pass.","recovery":"Record sanitized evidence and a defect, fix the issue, and rerun the required gate."}
- {"failure":"EXTERNAL_SERVICE_UNAVAILABLE","message":"A required external service is temporarily unavailable.","recovery":"Retry when safe or continue with an explicitly supported local or read-only workflow."}
- {"failure":"SENSITIVE_OUTPUT_BLOCKED","message":"The operation produced output that may contain sensitive information.","recovery":"Redact the sensitive fields and repeat the operation without exposing or persisting secrets."}

## Interface states

- Initial: return connection, workspace, protocol, capability, and permission readiness before tools are used.
- Loading: expose a machine-readable operation state and operation identifier while the host AI client owns visual progress presentation.
- Empty: return a valid empty collection with its meaning and supported next actions instead of treating no result as an error.
- Success: return a stable result envelope containing the completed action, affected or inspected targets, evidence, and next allowed actions.
- Validation: return versioned field-level schema issues with corrective paths and no partial mutation.
- Disabled: return the unavailable capability or permission, the reason it is disabled, and the action required to enable it.
- Error: return a stable diagnostic code, safe message, recovery guidance, retryability, and sanitized context without exposing sensitive values.

### Accessibility

- Every tool, capability, approval request, state, and diagnostic has a clear text label and description.
- No status or permission distinction depends on color, iconography, animation, or visual layout alone.
- Status changes and approval requirements are exposed semantically so a host AI client can announce them through assistive technology.
- CLI and host approval workflows remain fully keyboard-operable without pointer-only actions.
- Structured results preserve a deterministic reading order and concise summaries before detailed evidence.
- The host client owns focus management and contrast, while Agent Bridge supplies sufficient semantic state and labels to implement them accessibly.

### Responsive behavior

Agent Bridge is headless and its MCP contracts are viewport-independent. The host AI client or editor owns responsive visual layout. Human-readable CLI output must wrap safely in narrow terminals, while structured JSON output remains unchanged across terminal widths and display sizes; no essential information may depend on horizontal layout.

## Authentication and security

Not applicable.

- Local stdio MCP is the default transport and Agent Bridge opens no network listener by default.
- Every resolved path must remain within the explicitly approved workspace root.
- Path traversal, junction, and symbolic-link escapes are rejected before access.
- Every tool declares a read, write, execute, or external permission level.
- Mutation approval is bound to the exact action, declared targets, reviewed content hash, workspace state, client session, and expiry.
- Approval is single-use and is invalidated when the workspace or reviewed target state changes.
- Arbitrary shell execution and undeclared subprocess execution are prohibited.
- Results, diagnostics, events, and persisted records pass through sensitive-data redaction.
- Secrets, passwords, tokens, cookies, authorization headers, and request bodies must not be read, returned, logged, or persisted.
- Any future network transport must add explicit authentication, authorization, origin policy, rate limiting, and request-size limits without weakening local transport guarantees.

## Data and integrations

### Does this feature use no persistence, existing data, new data, or both existing and new data?

existing-and-new

### Define entities, fields, identifiers, constraints, and relationships needed by this feature.

{"entities":[{"name":"AgentSession","fields":[{"name":"id","type":"string","key":"PK","nullable":false},{"name":"protocolVersion","type":"integer","nullable":false},{"name":"workspaceIdentity","type":"string","nullable":false},{"name":"permissions","type":"json","nullable":false},{"name":"createdAt","type":"datetime","nullable":false},{"name":"closedAt","type":"datetime","nullable":true}]},{"name":"OperationPlan","fields":[{"name":"id","type":"string","key":"PK","nullable":false},{"name":"sessionId","type":"string","key":"FK","nullable":false},{"name":"toolId","type":"string","nullable":false},{"name":"permissionLevel","type":"string","nullable":false},{"name":"declaredTargets","type":"json","nullable":false},{"name":"reviewedHashes","type":"json","nullable":false},{"name":"status","type":"string","nullable":false},{"name":"createdAt","type":"datetime","nullable":false},{"name":"expiresAt","type":"datetime","nullable":false}]},{"name":"ApprovalDecision","fields":[{"name":"id","type":"string","key":"PK","nullable":false},{"name":"operationId","type":"string","key":"FK","nullable":false},{"name":"actorLabel","type":"string","nullable":true},{"name":"decision","type":"string","nullable":false},{"name":"approvedHashes","type":"json","nullable":false},{"name":"decidedAt","type":"datetime","nullable":false},{"name":"expiresAt","type":"datetime","nullable":false},{"name":"usedAt","type":"datetime","nullable":true}]},{"name":"ExecutionRecord","fields":[{"name":"id","type":"string","key":"PK","nullable":false},{"name":"operationId","type":"string","key":"FK","nullable":false},{"name":"outcome","type":"string","nullable":false},{"name":"startedAt","type":"datetime","nullable":false},{"name":"completedAt","type":"datetime","nullable":true},{"name":"affectedTargetCount","type":"integer","nullable":false},{"name":"diagnosticCodes","type":"json","nullable":false}]},{"name":"AuditEvent","fields":[{"name":"id","type":"string","key":"PK","nullable":false},{"name":"sessionId","type":"string","key":"FK","nullable":false},{"name":"requestId","type":"string","nullable":false},{"name":"eventType","type":"string","nullable":false},{"name":"metadata","type":"json","nullable":true},{"name":"createdAt","type":"datetime","nullable":false}]}],"relationships":[{"from":"AgentSession","to":"OperationPlan","type":"||--o{","label":"creates"},{"from":"OperationPlan","to":"ApprovalDecision","type":"||--o|","label":"receives"},{"from":"OperationPlan","to":"ExecutionRecord","type":"||--o|","label":"produces"},{"from":"AgentSession","to":"AuditEvent","type":"||--o{","label":"emits"}]}

### Define ownership, retention, deletion, audit, privacy, and backfill behavior for affected data.

{"ownership":"The user and approved workspace own all Agent Bridge records.","storage":".cocoframe/agent/","gitPolicy":"Ignored by Git by default.","approvalExpiryMinutes":15,"sessionTermination":"A session closes and all owned work is cancelled when its AI client disconnects.","auditRetentionDays":30,"excludedContent":["prompts","source-file contents","diff contents","secrets","credentials","tokens","cookies","authorization headers","request bodies"],"targetRepresentation":"Workspace-relative paths and reviewed content hashes only.","deletion":"cocoframe agent clean removes Agent Bridge session and audit records.","preservedCanonicalData":["CocoSpecs","CocoRef","CocoQA"],"formatVersion":1,"migrationPolicy":"Every format change requires explicit validation and migration; invalid records are preserved for diagnosis and are never silently rewritten.","backfillPolicy":"No automatic backfill from unrelated project or external data.","remotePolicy":"No automatic cloud backup, remote synchronization, or remote project mirror."}

- MCP transport and supported AI clients participate through provider-independent versioned tool contracts.
- The existing CocoFrame CLI project inspector supplies workspace routes, APIs, components, islands, middleware, dependencies, and generated capabilities.
- The existing context and public API reference generators supply repository and symbol metadata.
- @cocoframe/schema validates every versioned tool input, output, and diagnostic envelope.
- @cocoframe/specs, @cocoframe/cocoref, and @cocoframe/qa remain the canonical workflow implementations.
- Workspace filesystem access is constrained to the explicitly approved project root.
- A host-provided approval interface presents mutation plans and returns approve, revise, deny, expire, or cancel decisions.
- No AI-provider-specific integration is required.
- Every integration operation supports bounded timeouts, cancellation, structured failures, and safe degraded read-only behavior where applicable.

## Existing project context

No project snapshot was recorded.

## Non-functional requirements

### Which safe events, metrics, traces, and alerts prove the feature is operating correctly?

["Emit safe structured events for connection lifecycle, tool discovery and calls, validation failures, approval requests and decisions, mutations, cancellations, capability gaps, and CocoQA outcomes.","Record request ID, protocol version, tool ID, duration, outcome, permission level, retryability, and affected-target count where applicable.","Never record prompts, source-file contents, request bodies, credentials, tokens, cookies, authorization headers, or unredacted diagnostics.","For stdio MCP, operational logs use stderr and never corrupt protocol stdout.","Metrics and traces use an optional host-provided exporter so Agent Bridge remains vendor-neutral.","Raise a safe alert signal for repeated workspace-access denial, sensitive-output blocking, partial mutation, invalid canonical state, and required quality-gate failure."]

### What latency, payload, concurrency, or browser-performance limits must hold?

["Tool discovery completes within 100 milliseconds after a successful local connection.","Read-only inspection and search operations meet a p95 latency of at most 1 second for a workspace containing up to 10,000 source files.","Large result sets use deterministic pagination and one response payload is limited to 1 MiB.","Mutation planning completes within 2 seconds, excluding external processes and quality gates.","Cancellation propagates to owned in-process work within 250 milliseconds.","Read-only operations may execute concurrently, while mutations are serialized per workspace.","Agent Bridge adds no browser bundle and requires no browser runtime."]

## Out of scope

- Providing or hosting an AI model, inference service, or provider-specific prompt engine.
- Building a standalone chat application, IDE, or graphical desktop interface.
- Allowing autonomous source-code changes without explicit user approval.
- Providing arbitrary shell-command execution or unrestricted filesystem access.
- Reading or modifying files outside the explicitly approved CocoFrame workspace.
- Automatically committing, pushing, opening pull requests, publishing npm packages, or deploying applications.
- Executing database queries, CocoQL mutations, migrations, or production data changes.
- Storing or managing API keys, passwords, tokens, cookies, or other user secrets.
- Providing a remotely hosted multi-user Agent Bridge service, tenant isolation, or enterprise identity management.
- Supporting non-CocoFrame repositories or acting as a general-purpose coding-agent protocol.
- Replacing CocoSpecs, CocoRef, CocoQA, cocoframe inspect, or the generated API reference with parallel lifecycle conventions.
- Performing provider-owned image understanding, website crawling, or browser automation inside Agent Bridge.
- Maintaining a cloud vector database, external documentation index, or remote project mirror.
- Running persistent background jobs or continuing operations after the AI client disconnects.
- Guaranteeing compatibility with every MCP client, AI provider, operating system, or deployment platform in the first release.

## Unresolved decisions

All required discovery questions are resolved.
