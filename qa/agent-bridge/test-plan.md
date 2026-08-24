# Test Plan: CocoFrame Agent Bridge

> CocoQA v1 · standard · approved

## Sources

- cocospec: `agent-bridge` (approved) — `specs/agent-bridge/spec.json`

## QA decisions

- **Which environments must this feature pass in?** Local Windows, macOS, and Linux with Node.js 24 or newer; supported MCP stdio clients; and production-like npm package staging.
- **Which browsers, devices, and viewport ranges are required?** Agent Bridge itself has no browser requirement. Its public documentation must pass Chromium, Firefox, and WebKit plus responsive viewport coverage from 320px through 4K.
- **Which fixtures, accounts, roles, and data states are safe to use?** Use examples/basic, the canonical Agent Bridge CocoSpec and CocoQA records, and isolated temporary directories. Do not use credentials, secrets, external services, production accounts, or production data; remove temporary fixtures after each test.
- **Which failures must block release, and which results may be explicitly waived?** Every required gate, critical or high defect, workspace escape, sensitive-output exposure, protocol incompatibility, and read-only guarantee violation blocks release. Only low-risk non-security findings may be waived with explicit framework maintainer approval.
- **Which accessibility standard and assistive interactions must be verified?** Public documentation must meet WCAG 2.2 AA, including semantic headings, descriptive links, keyboard-only navigation, visible focus, logical focus order, screen-reader labels, zoom support, and responsive readability. The stdio Agent Bridge itself has no visual interface.
- **Which security, authorization, privacy, and abuse cases require negative testing?** Negative tests must cover malformed input, unsupported protocol versions, path traversal, symlink or junction workspace escape, invalid workspaces, cancellation, response and file limits, secret and authorization-header redaction, stdout protocol cleanliness, mutation refusal, absence of arbitrary shell execution, and prevention of AI self-approval or permission widening.

## Test cases

| Case | Category | Required | Status | Intent | Evidence |
| --- | --- | --- | --- | --- | --- |
| `acceptance-1` | functional | yes | passed | Given a supported AI client, when it connects through MCP, then it can discover every Agent Bridge tool together with its versioned input schema, output schema, description, and permission level. | tests/agent.test.ts completes MCP initialize and tools/list, asserting five tools with descriptions, versioned input/output schemas, and read permission metadata. |
| `acceptance-2` | functional | yes | passed | Given a valid CocoFrame workspace, when project.inspect is called, then it returns the existing routes, APIs, components, islands, middleware, dependencies, and generated capabilities without modifying the workspace. | project.inspect returns routes, APIs, components, islands, middleware, dependencies, and generated capabilities; before/after file metadata remains identical. |
| `acceptance-3` | functional | yes | passed | Given an existing framework capability, when the AI searches documentation, APIs, or components, then Agent Bridge returns the reusable capability and its source or documentation location before suggesting a new implementation. | Focused tests verify docs.search, component.find, and api.lookup return reusable capabilities with source or documentation locations. |
| `acceptance-4` | functional | yes | passed | Given a new feature request, when the AI starts or resumes CocoSpecs, then Agent Bridge returns only the next adaptive question batch and preserves the canonical specification state. | Agent lifecycle tests verify proposed and canonical CocoSpecs return only the bounded next adaptive batch and preserve before/after workspace state. |
| `acceptance-5` | functional | yes | passed | Given an image or website reference, when CocoRef is invoked, then existing components are audited before a missing component is proposed. | Agent lifecycle tests verify CocoRef audits the inspected component inventory, reuses Button, and marks only the unmatched timeline as consent-required. |
| `acceptance-6` | functional | yes | passed | Given an implemented feature with an approved CocoSpec, when CocoQA is invoked, then acceptance criteria, required gates, evidence, defects, and approval state remain traceable. | Agent lifecycle tests verify approved-CocoSpec QA traceability includes acceptance criteria, questions, cases, gates, sanitized evidence, defects, and approval state. |
| `acceptance-7` | functional | yes | passed | Given a read-only operation, when it is executed, then no source file, generated artifact, Git state, package state, or external system is changed. | Read-only tests compare the complete example workspace file state before and after MCP discovery and find no changes. |
| `acceptance-8` | functional | yes | passed | Given an operation that may change state, when explicit approval has not been granted, then Agent Bridge refuses the operation and leaves all state unchanged. | Unknown mutation tool file.write is refused with CAPABILITY_UNAVAILABLE and the workspace remains unchanged; Phase 1 exposes no state-changing tool. |
| `acceptance-9` | functional | yes | passed | Given an approved mutation, when the operation is executed, then only the declared workspace targets and declared action are modified. | Phase 3 mutation tests verify exact current/proposed hashes, role-bound partial approval, unchanged undeclared targets, single-use execution, target conflict detection, and multi-file rollback. |
| `acceptance-10` | functional | yes | passed | Given a denied, expired, or cancelled approval, when execution is attempted, then no mutation occurs and a stable machine-readable diagnostic is returned. | Phase 3 mutation tests verify denied, cancelled, expired, duplicate, and already-claimed approvals return stable diagnostics and leave every declared source target unchanged. |
| `acceptance-11` | functional | yes | passed | Given any workspace path supplied by an AI client, when it resolves outside the approved project root, then Agent Bridge rejects access. | A junction resolving outside the approved root is rejected with WORKSPACE_ACCESS_DENIED without exposing or reading the outside file. |
| `acceptance-12` | functional | yes | passed | Given malformed input or an unsupported protocol version, when a tool is called, then Agent Bridge returns a versioned corrective error without crashing. | MCP malformed input returns structured INVALID_TOOL_INPUT; unsupported bridge versions and cancellation return versioned corrective diagnostics without crashing. |
| `acceptance-13` | functional | yes | passed | Given secrets, cookies, authorization headers, tokens, or request bodies exist in the environment, when results and errors are returned, then none of those sensitive values are exposed or persisted. | Documentation containing an Authorization bearer secret is searched with the secret removed and REDACTED evidence returned; raw secret is never persisted. |
| `acceptance-14` | functional | yes | passed | Given two supported AI providers, when they perform the same Agent Bridge workflow, then they use the same provider-independent tool contracts and receive structurally equivalent results. | The bridge uses the official provider-neutral MCP server contract with no provider branches; raw MCP client discovery receives the same structural tool results. |
| `acceptance-15` | functional | yes | passed | Given a completed workflow, when the AI reports completion, then the result includes the actions performed, approvals received, files or artifacts affected, quality evidence, and unresolved risks. | Canonical CocoQA artifacts and the implementation handoff report actions, approvals, affected files, automated evidence, blocked full-scope cases, and unresolved risks. |
| `framework-server-first` | compatibility | yes | passed | Useful server-rendered output exists without browser JavaScript. | Agent Bridge has no browser runtime and its public guide renders server-side; production browser runtime tests pass. |
| `framework-accessibility` | accessibility | yes | passed | Keyboard, focus, labels, errors, and semantic structure satisfy the approved accessibility target. | Agent Bridge documentation uses semantic headings and links; keyboard and accessibility browser assertions pass across the official matrix. |
| `framework-responsive` | responsive | yes | passed | The feature remains usable across the approved viewport and device range without horizontal overflow. | The critical-page matrix includes /docs/agent-bridge and the filtered Agent API reference and passes at 320px, phone, tablet, laptop, and 4K viewports. |

## Automated gates

| Gate | Command | Required | Status | Duration ms |
| --- | --- | --- | --- | --- |
| `check` | `npm run check` | yes | passed | 10252 |
| `test` | `npm run test` | yes | passed | 28128 |
| `inspect` | `npm run inspect` | yes | passed | 1226 |
| `build` | `npm run build` | yes | passed | 1101 |
| `test-e2e` | `npm run test:e2e` | yes | passed | 168708 |
