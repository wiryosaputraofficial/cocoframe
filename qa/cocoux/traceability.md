# Traceability: CocoUX

| Source requirement | QA case | Status | Evidence |
| --- | --- | --- | --- |
| cocospec:acceptance-1 | `acceptance-1` | passed | npm test: deterministic CocoUX engine and CLI artifact tests passed; npm run check passed. |
| cocospec:acceptance-2 | `acceptance-2` | passed | npm test passed focused journey validation for declared triggers, outcomes, and dead-end detection. |
| cocospec:acceptance-3 | `acceptance-3` | passed | npm test passed required-state coverage checks for all nine approved state categories. |
| cocospec:acceptance-4 | `acceptance-4` | passed | npm test passed interaction contract checks for trigger, target, feedback, keyboard behavior, and recovery. |
| cocospec:acceptance-5 | `acceptance-5` | passed | npm test passed project inventory, reuse-decision, token, and explicit missing-component consent checks. |
| cocospec:acceptance-6 | `acceptance-6` | passed | Real Playwright integration captured five valid PNG previews from a local development-only CocoUX route; full E2E passed. |
| cocospec:acceptance-7 | `acceptance-7` | passed | npm test passed screenshot manifest assertions for viewport, theme, state, revision, source hash, and UX contract linkage. |
| cocospec:acceptance-8 | `acceptance-8` | passed | npm test passed approval and immutable evidence checks; approved CocoUX does not promote application source. |
| cocospec:acceptance-9 | `acceptance-9` | passed | npm test passed CocoUX-to-CocoRef handoff with copied visual references and UX hash linkage while CocoRef ownership remains intact. |
| cocospec:acceptance-10 | `acceptance-10` | passed | npm test passed managed preview cleanup for successful handoff and cancellation. |
| cocospec:acceptance-11 | `acceptance-11` | passed | npm test passed CocoRef linkage behavior; fidelity decisions remain represented by the CocoRef lifecycle. |
| cocospec:acceptance-12 | `acceptance-12` | passed | npm test passed CocoQA derivation from approved CocoUX and completed CocoRef traceability inputs. |
| cocospec:acceptance-13 | `acceptance-13` | passed | npm test and npm run inspect passed shared CLI and read-only Agent Bridge CocoUX contract coverage. |
| cocoframe:server-first | `framework-server-first` | passed | Package smoke passed SSR and production builds for every official template; CocoUX preview scaffolds server-rendered routes. |
| cocoframe:accessibility | `framework-accessibility` | passed | Full Chromium, Firefox, and WebKit E2E passed keyboard flows, focus behavior, semantic dialogs, 200 percent text zoom, and forced colors. |
| cocoframe:target-reachability | `framework-target-reachability` | passed | Full E2E, local documentation inspection, and package smoke passed route, CTA, API, redirect, and 404 reachability checks. |
| cocoframe:interaction-integrity | `framework-interaction-integrity` | passed | Full cross-browser E2E passed accessible keyboard-operated catalogs, dialogs, forms, islands, and controls. |
| cocoframe:responsive | `framework-responsive` | passed | Responsive E2E passed 320x568, 390x844, 768x1024, 1366x768, and 3840x2160 without horizontal overflow. |
