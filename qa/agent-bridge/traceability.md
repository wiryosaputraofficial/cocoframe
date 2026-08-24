# Traceability: CocoFrame Agent Bridge

| Source requirement | QA case | Status | Evidence |
| --- | --- | --- | --- |
| cocospec:acceptance-1 | `acceptance-1` | passed | tests/agent.test.ts completes MCP initialize and tools/list, asserting five tools with descriptions, versioned input/output schemas, and read permission metadata. |
| cocospec:acceptance-2 | `acceptance-2` | passed | project.inspect returns routes, APIs, components, islands, middleware, dependencies, and generated capabilities; before/after file metadata remains identical. |
| cocospec:acceptance-3 | `acceptance-3` | passed | Focused tests verify docs.search, component.find, and api.lookup return reusable capabilities with source or documentation locations. |
| cocospec:acceptance-4 | `acceptance-4` | passed | Agent lifecycle tests verify proposed and canonical CocoSpecs return only the bounded next adaptive batch and preserve before/after workspace state. |
| cocospec:acceptance-5 | `acceptance-5` | passed | Agent lifecycle tests verify CocoRef audits the inspected component inventory, reuses Button, and marks only the unmatched timeline as consent-required. |
| cocospec:acceptance-6 | `acceptance-6` | passed | Agent lifecycle tests verify approved-CocoSpec QA traceability includes acceptance criteria, questions, cases, gates, sanitized evidence, defects, and approval state. |
| cocospec:acceptance-7 | `acceptance-7` | passed | Read-only tests compare the complete example workspace file state before and after MCP discovery and find no changes. |
| cocospec:acceptance-8 | `acceptance-8` | passed | Unknown mutation tool file.write is refused with CAPABILITY_UNAVAILABLE and the workspace remains unchanged; Phase 1 exposes no state-changing tool. |
| cocospec:acceptance-9 | `acceptance-9` | passed | Phase 3 mutation tests verify exact current/proposed hashes, role-bound partial approval, unchanged undeclared targets, single-use execution, target conflict detection, and multi-file rollback. |
| cocospec:acceptance-10 | `acceptance-10` | passed | Phase 3 mutation tests verify denied, cancelled, expired, duplicate, and already-claimed approvals return stable diagnostics and leave every declared source target unchanged. |
| cocospec:acceptance-11 | `acceptance-11` | passed | A junction resolving outside the approved root is rejected with WORKSPACE_ACCESS_DENIED without exposing or reading the outside file. |
| cocospec:acceptance-12 | `acceptance-12` | passed | MCP malformed input returns structured INVALID_TOOL_INPUT; unsupported bridge versions and cancellation return versioned corrective diagnostics without crashing. |
| cocospec:acceptance-13 | `acceptance-13` | passed | Documentation containing an Authorization bearer secret is searched with the secret removed and REDACTED evidence returned; raw secret is never persisted. |
| cocospec:acceptance-14 | `acceptance-14` | passed | The bridge uses the official provider-neutral MCP server contract with no provider branches; raw MCP client discovery receives the same structural tool results. |
| cocospec:acceptance-15 | `acceptance-15` | passed | Canonical CocoQA artifacts and the implementation handoff report actions, approvals, affected files, automated evidence, blocked full-scope cases, and unresolved risks. |
| cocoframe:server-first | `framework-server-first` | passed | Agent Bridge has no browser runtime and its public guide renders server-side; production browser runtime tests pass. |
| cocoframe:accessibility | `framework-accessibility` | passed | Agent Bridge documentation uses semantic headings and links; keyboard and accessibility browser assertions pass across the official matrix. |
| cocoframe:responsive | `framework-responsive` | passed | The critical-page matrix includes /docs/agent-bridge and the filtered Agent API reference and passes at 320px, phone, tablet, laptop, and 4K viewports. |
