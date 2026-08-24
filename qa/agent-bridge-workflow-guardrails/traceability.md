# Traceability: Agent Bridge Workflow Guardrails

| Source requirement | QA case | Status | Evidence |
| --- | --- | --- | --- |
| cocospec:acceptance-1 | `acceptance-1` | passed | Focused guardrail tests prove Agent Bridge performs internal inspection and refuses user-facing mutation planning until the canonical CocoSpec workflow is present and approved. |
| cocospec:acceptance-2 | `acceptance-2` | passed | Lifecycle tests prove an existing CocoSpec resumes from canonical state and returns only the next adaptive question batch without overwriting reviewed answers. |
| cocospec:acceptance-3 | `acceptance-3` | passed | Agent read-operation tests compare workspace and Git state before and after inspect/search workflows and confirm no mutation. |
| cocospec:acceptance-4 | `acceptance-4` | passed | Workflow guardrail tests prove visual work cannot plan a mutation until an explicit reference-or-no-reference decision is bound. |
| cocospec:acceptance-5 | `acceptance-5` | passed | CocoRef lifecycle tests prove application and framework component inventories are audited before missing reference components are proposed. |
| cocospec:acceptance-6 | `acceptance-6` | passed | Workflow tests prove a confirmed no-reference path binds the approved Design Profile hash and reusable component inventory. |
| cocospec:acceptance-7 | `acceptance-7` | passed | Project inspection, documentation search, API lookup, and component-find tests return reusable routes and capabilities with source locations before new implementation. |
| cocospec:acceptance-8 | `acceptance-8` | passed | Mutation guardrail tests assert stable prerequisite diagnostics and unchanged declared files when workflow requirements are absent or stale. |
| cocospec:acceptance-9 | `acceptance-9` | passed | Target verification tests resolve changed internal links and routes against the inspected existing-plus-proposed route graph before planning. |
| cocospec:acceptance-10 | `acceptance-10` | passed | A temporary CocoFrame application is production-built and its newly proposed /dashboard route is fetched successfully with status 200, non-empty Dashboard content, and no 404. |
| cocospec:acceptance-11 | `acceptance-11` | passed | Target declarations and browser E2E checks cover accessible names, keyboard operation, visible focus, and label-to-action integrity. |
| cocospec:acceptance-12 | `acceptance-12` | passed | Guardrail tests reject unverifiable external targets with TARGET_NOT_REACHABLE unless sanitized provider evidence is supplied. |
| cocospec:acceptance-13 | `acceptance-13` | passed | Product Design Quality tests require alignment, spacing, color, contrast, overflow, and responsive criteria, including the VISUAL_ALIGNMENT_FAILED diagnostic. |
| cocospec:acceptance-14 | `acceptance-14` | passed | Responsive E2E passed at 320px, phone, tablet, laptop, and 4K profiles plus 200 percent text zoom without unintended overflow or overlap. |
| cocospec:acceptance-15 | `acceptance-15` | passed | Lifecycle tests prove a completed CocoRef contributes approved reference criteria and a required design-fidelity case to CocoQA. |
| cocospec:acceptance-16 | `acceptance-16` | passed | This canonical QA binds cocoframe.design.json and includes alignment/design-system cases while omitting fidelity because no CocoRef applies to this feature. |
| cocospec:acceptance-17 | `acceptance-17` | passed | QA state-machine and workflow tests prove failed required cases, failed gates, missing targets, inaccessible controls, and destructive alignment defects prevent approval. |
| cocospec:acceptance-18 | `acceptance-18` | passed | npm run generate, API documentation generation, npm run check, and generated-artifact assertions passed; generated files were refreshed only through owning commands. |
| cocospec:acceptance-19 | `acceptance-19` | passed | In-process and MCP adapter tests use the same versioned descriptors, prerequisite diagnostics, workflow hashes, and structurally equivalent result contracts. |
| cocospec:acceptance-20 | `acceptance-20` | passed | Operation results and generated QA reports include lifecycle/reference state, workflow hashes, affected targets, approvals, verified targets, gate evidence, defects, and unresolved risks. |
| design:component-reuse | `design-component-reuse` | passed | Component discovery and CocoRef audit tests prove @cocoframe/ui and application inventories are searched before a missing component is proposed. |
| design:semantic-tokens | `design-semantic-tokens` | passed | The canonical Design Profile is hash-bound to the workflow, and Product Design Quality tests require semantic tokens instead of duplicated hardcoded styles. |
| design:alignment | `design-alignment` | passed | Alignment is a mandatory design principle covering containers, baselines, icon-label pairs, cards, and columns; responsive E2E passed all approved viewports and zoom. |
| design:spacing | `design-spacing` | passed | Design criteria and profile validation require the approved spacing scale; Product Design Quality focused tests passed. |
| design:color | `design-color` | passed | Design criteria and profile validation require consistent semantic color roles; Product Design Quality focused tests passed. |
| design:contrast | `design-contrast` | passed | WCAG 2.2 AA contrast is required by the canonical QA decisions; browser checks including forced-colors passed. |
| design:typography | `design-typography` | passed | Design profile tests validate the approved typography family, scale, weight, line height, and wrapping rules. |
| design:radius | `design-radius` | passed | Design profile tests validate consistent use of the approved semantic radius scale. |
| design:elevation | `design-elevation` | passed | Design profile tests validate semantic elevation while preserving focus visibility and contrast. |
| design:iconography | `design-iconography` | passed | Design criteria require approved icon catalog reuse, sizing, alignment, and accessible labels; catalog E2E passed. |
| design:overflow | `design-overflow` | passed | Responsive browser checks passed from 320px through 4K and at 200 percent text zoom without unintended horizontal overflow, clipping, or overlap. |
| design:responsive | `design-responsive` | passed | Critical-page responsive E2E passed the approved 320px, phone, tablet, laptop, and 4K viewport profiles. |
| design:accessibility | `design-accessibility` | passed | Keyboard, focus, semantics, announcements, forced-colors, and reduced-motion requirements are represented in QA; accessibility-focused E2E passed. |
| cocoframe:server-first | `framework-server-first` | passed | Build and runtime tests confirm useful server-rendered output exists before browser JavaScript hydration. |
| cocoframe:accessibility | `framework-accessibility` | passed | Accessibility tests and browser E2E passed keyboard, focus, labels, errors, and semantic structure checks. |
| cocoframe:target-reachability | `framework-target-reachability` | passed | Target verifier tests cover existing and proposed routes, anchors, external evidence, and a real production fetch of /dashboard returning successful content. |
| cocoframe:interaction-integrity | `framework-interaction-integrity` | passed | Changed controls are statically declared with accessibility expectations and verified by keyboard/focus browser tests; inert or mismatched actions are rejected. |
| cocoframe:responsive | `framework-responsive` | passed | Responsive E2E passed all approved viewport profiles without unintended horizontal overflow. |
