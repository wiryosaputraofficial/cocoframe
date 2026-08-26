# Traceability: Coco Doctor

| Source requirement | QA case | Status | Evidence |
| --- | --- | --- | --- |
| cocospec:acceptance-1 | `acceptance-1` | passed | Unit test verified healthy reference project, exit 0 semantics, zero errors, and default runtime under 2 seconds; full QA test gate passed 171/171. |
| cocospec:acceptance-2 | `acceptance-2` | passed | Doctor fixture tests verified error diagnostics and strict warnings produce exit code 1. |
| cocospec:acceptance-3 | `acceptance-3` | passed | Cancellation test verified sanitized OPERATION_CANCELLED reporting; code inspection verified unexpected failures become DOCTOR_INTERNAL_FAILURE/internal-error and CLI maps internal-error or cancelled to exit code 2. |
| cocospec:acceptance-4 | `acceptance-4` | passed | JSON command test parsed the sole output as contractVersion 1 with no interleaved human logs. |
| cocospec:acceptance-5 | `acceptance-5` | passed | Before/after source snapshots were identical for default and deep runs; secret fixture was redacted; implementation has no network, install, database, or source-write operation. |
| cocospec:acceptance-6 | `acceptance-6` | passed | Diagnostic fixture asserted code, severity, category, message, non-empty sanitized evidence, suggestion, and /docs/doctor#diagnostics for every diagnostic. |
| cocospec:acceptance-7 | `acceptance-7` | passed | Reference test verified build.production is skipped by default and passed only with deep mode in an isolated temporary output. |
| cocospec:acceptance-8 | `acceptance-8` | passed | CLI and Agent Bridge tests verified the shared diagnoseProject engine, contract v1, project.doctor discovery, and stable read-only MCP output. |
| cocoframe:server-first | `framework-server-first` | passed | Package smoke passed SSR, typed API, inspect, and production build for all four official templates; documentation route rendered successfully without requiring browser JavaScript. |
| cocoframe:accessibility | `framework-accessibility` | passed | Playwright passed keyboard focus and semantic main-content checks across Chromium, Firefox, WebKit and approved responsive viewports. |
| cocoframe:target-reachability | `framework-target-reachability` | passed | Playwright critical-route matrix verified /docs/doctor and all changed documentation targets return HTTP 200. |
| cocoframe:interaction-integrity | `framework-interaction-integrity` | passed | Playwright verified every tested documentation page exposes a keyboard focus target; Doctor human output uses text labels and no color-only status. |
| cocoframe:responsive | `framework-responsive` | passed | Playwright verified /docs/doctor has no horizontal overflow and healthy content at 320x568, 390x844, 768x1024, 1366x768, and 3840x2160. |
