# Test Plan: Coco Doctor

> CocoQA v1 · thorough · approved

## Sources

- cocospec: `coco-doctor` (approved) — `specs/coco-doctor/spec.json`

## QA decisions

- **Which environments must this feature pass in?** ["Local Node.js 24 or newer","CI on Ubuntu and Windows","Installed npm tarball and package-smoke environment","Default and deep Doctor modes against examples/basic","In-process Agent Bridge and MCP tool discovery"]
- **Which browsers, devices, and viewport ranges are required?** ["Doctor CLI has no browser runtime requirement","The /docs/doctor documentation must pass the existing Chromium, Firefox, WebKit, 320px, 390px phone, tablet, laptop, and 4K matrix","Narrow terminal behavior is verified through plain-text output without fixed-width tables"]
- **Which fixtures, accounts, roles, and data states are safe to use?** ["Use examples/basic as the healthy reference project","Use temporary sanitized fixtures for missing dependencies, stale generated files, island mismatch, unsafe configuration, invalid projects, and cancellation","Use no accounts, credentials, external services, or databases","Clean every temporary fixture after execution"]
- **Which failures must block release, and which results may be explicitly waived?** ["Any failed approved acceptance criterion","A Doctor-caused failure in check, test, inspect, build, test:e2e, or package smoke","Any secret disclosure or read outside the workspace","Any source or generated-artifact mutation by default or deep mode","Any JSON schema, diagnostic-field, or exit-code incompatibility","Default Doctor latency above two seconds on the reference project","No waiver is allowed for security, mutation safety, contract compatibility, or required gates"]
- **Which accessibility standard and assistive interactions must be verified?** ["WCAG 2.2 AA for the Doctor documentation","Keyboard navigation and visible focus on /docs/doctor","CLI output does not rely on color or symbols alone","Support NO_COLOR, non-TTY, screen readers, and plain-text copying","JSON contains no ANSI escape sequences","Headings, checks, diagnostics, evidence, suggestions, and summary use a consistent order"]
- **Which security, authorization, privacy, and abuse cases require negative testing?** ["Reject symlink escape from the workspace","Bound files above 1 MiB and workspaces above 10000 files","Return sanitized diagnostics for malformed or unreadable manifests","Never expose tokens, passwords, cookies, authorization headers, private keys, or environment values","Reject wildcard allowedHosts, credentialed CORS, and trusted proxy configuration","Default mode does not execute configuration or source","Deep mode does not import the application bundle","Perform no network request, dependency install, database access, or project mutation"]
- **Which measurable performance thresholds must pass?** ["Default Doctor completes below two seconds on examples/basic","Deep mode has a 60-second timeout","Inspect at most 10000 files, 1 MiB per source file, and return at most 1000 diagnostics","Check cancellation between checks and major filesystem operations","Write deep build output only to a temporary directory","Add no browser bundle or runtime for the CLI command"]
- **Which migrations, integrations, or legacy behaviors require regression coverage?** ["All existing CLI commands retain their behavior","buildProject(project, development) remains compatible and output override is optional","Existing Agent Bridge tools and read-only protocol v1 remain compatible","project.doctor is an additive read-only tool","JSON starts at contract version 1 and stable diagnostic codes never change meaning","Doctor does not change generated clients, OpenAPI, manifests, or project source","Ubuntu and Windows must pass","Rollback uses the previous coordinated package release"]
- **Which areas need exploratory testing beyond scripted acceptance cases?** ["Time-box exploratory testing to 20 minutes","Exercise flags in different orders and project paths containing spaces or Unicode","Repeat Doctor to verify deterministic output and no file mutation","Try missing node_modules, no routes, malformed manifest, linked configuration, and unreadable files","Verify temporary deep-build output is cleaned after success and failure","Verify human output in narrow terminals, non-TTY, and NO_COLOR","Verify Agent Bridge discovers project.doctor, honors cancellation, and preserves workspace state","Verify /docs/doctor server output, keyboard navigation, links, and mobile overflow without JavaScript","Persist only sanitized summaries without source, absolute paths, credentials, or raw command output"]

## Test cases

| Case | Category | Required | Status | Intent | Evidence |
| --- | --- | --- | --- | --- | --- |
| `acceptance-1` | functional | yes | passed | Given a healthy project, when doctor runs, then it exits 0 with no error diagnostics | Unit test verified healthy reference project, exit 0 semantics, zero errors, and default runtime under 2 seconds; full QA test gate passed 171/171. |
| `acceptance-2` | functional | yes | passed | Given one or more error diagnostics, when doctor completes, then it exits 1 | Doctor fixture tests verified error diagnostics and strict warnings produce exit code 1. |
| `acceptance-3` | functional | yes | passed | Given an internal doctor failure, then it exits 2 with a sanitized failure | Cancellation test verified sanitized OPERATION_CANCELLED reporting; code inspection verified unexpected failures become DOCTOR_INTERNAL_FAILURE/internal-error and CLI maps internal-error or cancelled to exit code 2. |
| `acceptance-4` | functional | yes | passed | Given --json, output is a versioned contract with no interleaved human logs | JSON command test parsed the sole output as contractVersion 1 with no interleaved human logs. |
| `acceptance-5` | functional | yes | passed | Default checks do not modify files, perform network requests, or reveal secrets | Before/after source snapshots were identical for default and deep runs; secret fixture was redacted; implementation has no network, install, database, or source-write operation. |
| `acceptance-6` | functional | yes | passed | Every diagnostic includes code, severity, category, message, sanitized evidence, suggestion, and documentation reference | Diagnostic fixture asserted code, severity, category, message, non-empty sanitized evidence, suggestion, and /docs/doctor#diagnostics for every diagnostic. |
| `acceptance-7` | functional | yes | passed | Expensive checks run only when --deep is explicitly selected | Reference test verified build.production is skipped by default and passed only with deep mode in an isolated temporary output. |
| `acceptance-8` | functional | yes | passed | CLI, CI, and Agent Bridge consume the same diagnostic engine and contract | CLI and Agent Bridge tests verified the shared diagnoseProject engine, contract v1, project.doctor discovery, and stable read-only MCP output. |
| `framework-server-first` | compatibility | yes | passed | Useful server-rendered output exists without browser JavaScript. | Package smoke passed SSR, typed API, inspect, and production build for all four official templates; documentation route rendered successfully without requiring browser JavaScript. |
| `framework-accessibility` | accessibility | yes | passed | Keyboard, focus, labels, errors, and semantic structure satisfy the approved accessibility target. | Playwright passed keyboard focus and semantic main-content checks across Chromium, Firefox, WebKit and approved responsive viewports. |
| `framework-target-reachability` | functional | yes | passed | Every changed internal link, CTA, route, anchor, and API target returns successful content or an intentional redirect; external targets have sanitized provider evidence. | Playwright critical-route matrix verified /docs/doctor and all changed documentation targets return HTTP 200. |
| `framework-interaction-integrity` | accessibility | yes | passed | Every changed link and control has an accessible name, keyboard behavior, visible focus, and an action matching its label. | Playwright verified every tested documentation page exposes a keyboard focus target; Doctor human output uses text labels and no color-only status. |
| `framework-responsive` | responsive | yes | passed | The feature remains usable across the approved viewport and device range without horizontal overflow. | Playwright verified /docs/doctor has no horizontal overflow and healthy content at 320x568, 390x844, 768x1024, 1366x768, and 3840x2160. |

## Automated gates

| Gate | Command | Required | Status | Duration ms |
| --- | --- | --- | --- | --- |
| `check` | `npm run check` | yes | passed | 9505 |
| `test` | `npm run test` | yes | passed | 28243 |
| `inspect` | `npm run inspect` | yes | passed | 753 |
| `build` | `npm run build` | yes | passed | 743 |
| `test-e2e` | `npm run test:e2e` | yes | passed | 127962 |
