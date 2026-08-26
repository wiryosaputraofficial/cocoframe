# Test Plan: CocoUX

> CocoQA v1 · thorough · approved

## Sources

- cocospec: `cocoux` (approved) — `specs/cocoux/spec.json`

## QA decisions

- **Which environments must this feature pass in?** ["Local development","Linux CI on Node.js 24","Packed npm artifacts","Production build"]
- **Which browsers, devices, and viewport ranges are required?** ["Chromium","Firefox","WebKit","320x568","390x844","768x1024","1366x768","3840x2160"]
- **Which fixtures, accounts, roles, and data states are safe to use?** ["Deterministic fixtures in temporary workspaces","No accounts or credentials","No private or authenticated production data","Clean up generated preview fixtures after tests"]
- **Which failures must block release, and which results may be explicitly waived?** ["All required type-check, unit test, inspect, build, E2E, package smoke, and benchmark gates must pass","Critical and high defects cannot be waived","Only framework maintainers may explicitly accept documented low or medium residual risk"]
- **Which accessibility standard and assistive interactions must be verified?** ["WCAG 2.2 AA","Keyboard-only operation","Logical focus order and visible focus","Accessible names and semantic HTML","Live announcements for status and feedback"]
- **Which security, authorization, privacy, and abuse cases require negative testing?** ["Reject path traversal and linked escape paths","Reject non-local preview URLs","Reject changed source or screenshot hashes after capture","Reject invalid approval roles","Never retain or expose sensitive data","Enforce screenshot count and size limits","CocoUX approval must never promote application source"]
- **Which measurable performance thresholds must pass?** ["Basic contract operations under 200 ms","Static check and artifact generation under 2 seconds","Preview build under 60 seconds","Each PNG capture under 30 seconds","At most 50 PNG files, 5 MiB each, and 100 MiB per revision"]
- **Which migrations, integrations, or legacy behaviors require regression coverage?** ["Node.js 24","CLI and Agent Bridge use the same UX engine","CocoRef handoff remains backward compatible","CocoQA traceability accepts CocoUX sources","Production excludes __cocoux routes","Existing CocoSpec and CocoRef lifecycles remain unchanged"]
- **Which areas need exploratory testing beyond scripted acceptance cases?** ["30-minute risk-focused exploration","Resume, revision, and cancellation paths","Source changes after screenshot capture","Port collision and missing Chromium recovery","50-screenshot boundary and non-applicable states","Existing CocoRef handoff conflict","Temporary source and route cleanup","Mobile and 4K preview inspection"]

## Test cases

| Case | Category | Required | Status | Intent | Evidence |
| --- | --- | --- | --- | --- | --- |
| `acceptance-1` | functional | yes | passed | Given the same canonical inputs, generated outputs are deterministic, versioned, and machine-readable. | npm test: deterministic CocoUX engine and CLI artifact tests passed; npm run check passed. |
| `acceptance-2` | functional | yes | passed | Every journey has no dead end and every transition declares a trigger and outcome. | npm test passed focused journey validation for declared triggers, outcomes, and dead-end detection. |
| `acceptance-3` | functional | yes | passed | Initial, loading, empty, success, validation, disabled, error, offline, and permission states are reviewed. | npm test passed required-state coverage checks for all nine approved state categories. |
| `acceptance-4` | functional | yes | passed | Every interaction declares trigger, target, feedback, keyboard behavior, and recovery. | npm test passed interaction contract checks for trigger, target, feedback, keyboard behavior, and recovery. |
| `acceptance-5` | functional | yes | passed | Visual recommendations reuse existing components and design tokens before proposing additions. | npm test passed project inventory, reuse-decision, token, and explicit missing-component consent checks. |
| `acceptance-6` | functional | yes | passed | CocoUX renders a real development-only website preview and captures PNG evidence for approved viewports, themes, and states. | Real Playwright integration captured five valid PNG previews from a local development-only CocoUX route; full E2E passed. |
| `acceptance-7` | functional | yes | passed | Every screenshot records its viewport, theme, state, revision, source hash, and linked UX contract. | npm test passed screenshot manifest assertions for viewport, theme, state, revision, source hash, and UX contract linkage. |
| `acceptance-8` | functional | yes | passed | CocoUX approval permits only handoff of the approved visual direction to CocoRef and never promotes application source. | npm test passed approval and immutable evidence checks; approved CocoUX does not promote application source. |
| `acceptance-9` | functional | yes | passed | CocoRef receives the approved screenshots and linked UX contract, then retains inventory audit, missing-component consent, exact-preview approval, and source promotion ownership. | npm test passed CocoUX-to-CocoRef handoff with copied visual references and UX hash linkage while CocoRef ownership remains intact. |
| `acceptance-10` | functional | yes | passed | Temporary CocoUX preview files are removed after successful handoff or cancellation. | npm test passed managed preview cleanup for successful handoff and cancellation. |
| `acceptance-11` | functional | yes | passed | When an external visual reference exists, CocoRef remains the source of fidelity decisions. | npm test passed CocoRef linkage behavior; fidelity decisions remain represented by the CocoRef lifecycle. |
| `acceptance-12` | functional | yes | passed | CocoQA can derive traceable cases from approved CocoUX and completed CocoRef. | npm test passed CocoQA derivation from approved CocoUX and completed CocoRef traceability inputs. |
| `acceptance-13` | functional | yes | passed | CLI and Agent Bridge use the same CocoUX engine and contract. | npm test and npm run inspect passed shared CLI and read-only Agent Bridge CocoUX contract coverage. |
| `framework-server-first` | compatibility | yes | passed | Useful server-rendered output exists without browser JavaScript. | Package smoke passed SSR and production builds for every official template; CocoUX preview scaffolds server-rendered routes. |
| `framework-accessibility` | accessibility | yes | passed | Keyboard, focus, labels, errors, and semantic structure satisfy the approved accessibility target. | Full Chromium, Firefox, and WebKit E2E passed keyboard flows, focus behavior, semantic dialogs, 200 percent text zoom, and forced colors. |
| `framework-target-reachability` | functional | yes | passed | Every changed internal link, CTA, route, anchor, and API target returns successful content or an intentional redirect; external targets have sanitized provider evidence. | Full E2E, local documentation inspection, and package smoke passed route, CTA, API, redirect, and 404 reachability checks. |
| `framework-interaction-integrity` | accessibility | yes | passed | Every changed link and control has an accessible name, keyboard behavior, visible focus, and an action matching its label. | Full cross-browser E2E passed accessible keyboard-operated catalogs, dialogs, forms, islands, and controls. |
| `framework-responsive` | responsive | yes | passed | The feature remains usable across the approved viewport and device range without horizontal overflow. | Responsive E2E passed 320x568, 390x844, 768x1024, 1366x768, and 3840x2160 without horizontal overflow. |

## Automated gates

| Gate | Command | Required | Status | Duration ms |
| --- | --- | --- | --- | --- |
| `check` | `npm run check` | yes | passed | 9769 |
| `test` | `npm run test` | yes | passed | 29906 |
| `inspect` | `npm run inspect` | yes | passed | 739 |
| `build` | `npm run build` | yes | passed | 726 |
| `test-e2e` | `npm run test:e2e` | yes | passed | 126447 |
