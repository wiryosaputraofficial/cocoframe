# Coco Doctor

> CocoSpecs v1 · thorough mode · approved

## Summary

Add a read-only cocoframe doctor command that helps developers, CI, and AI clients quickly diagnose CocoFrame project, dependency, configuration, generated-artifact, security, build, and environment problems through actionable human output and a stable machine-readable JSON contract.

## Users and permissions

["Application developers running local diagnostics","CI pipelines evaluating project health","AI clients consuming machine-readable diagnostics"]

## Success outcome

One command identifies actionable CocoFrame project problems with stable diagnostic codes, safe evidence, remediation guidance, documentation references, and consistent exit status without exposing secrets.

## Entry points

- Terminal from the project root through cocoframe doctor
- An explicit project through cocoframe doctor <path>
- CI through cocoframe doctor --json
- Agent Bridge through the read-only project.doctor tool

## Happy path

1. User runs cocoframe doctor in a project
2. Doctor resolves the project root and environment
3. Doctor runs safe read-only checks
4. Doctor aggregates and deterministically orders diagnostics
5. Doctor renders human output or a versioned JSON document
6. Doctor exits with a status derived from the result

## Alternate and failure paths

- --json emits machine-readable output
- --deep enables build and other expensive validation
- --strict makes warnings produce exit status 1
- Without --strict warning-only results exit 0
- A healthy project emits a concise passed-check summary

- A non-CocoFrame directory reports PROJECT_NOT_FOUND with recovery guidance
- Configuration load failures identify the related file without exposing sensitive values
- Missing or incompatible dependencies produce dependency diagnostics
- Stale generated artifacts include the appropriate regeneration command
- Unreadable files produce sanitized diagnostics without including sensitive content
- A failed or timed-out deep check produces a check-specific diagnostic
- An unexpected doctor failure exits 2 and --json still emits a valid sanitized JSON document

## Interface states

- Initial argument and project-root validation
- Running checks without a required spinner
- Healthy result with no errors or warnings
- Warning result with exit behavior controlled by --strict
- Actionable error result with exit 1
- Sanitized internal failure with exit 2
- Invalid flag or path with concise usage guidance
- Disabled state is not applicable because this is a command-line interface

### Accessibility

- Do not distinguish information by color alone
- Support NO_COLOR and non-TTY output
- Avoid mandatory animation or spinners
- Use consistent textual ordering for headings, diagnostics, and summary
- Write every severity and diagnostic code explicitly
- JSON output contains no ANSI escape sequences
- Human output remains understandable when copied as plain text

### Responsive behavior

Human output uses no fixed-width tables, wraps long paths and suggestions safely, and remains vertically readable in narrow terminals; JSON output is independent of terminal dimensions.

## Authentication and security

Not applicable.

- Rely on local operating-system permissions; no application authentication is required
- Resolve and confine the project root safely
- Do not follow symlinks to read outside the workspace
- Default checks do not execute project source or configuration
- Deep build does not import or execute the application bundle
- Render project files as relative paths
- Never output environment values, cookies, tokens, authorization headers, passwords, private keys, or sensitive file contents
- Bound the size and number of files read
- Agent Bridge remains read-only and enforces cancellation and workspace confinement
- Collect no automatic telemetry

## Data and integrations

### Does this feature use no persistence, existing data, new data, or both existing and new data?

none

- Read-only project filesystem access
- Local package.json and dependency metadata
- Canonical CocoFrame discovery and inspection engine
- Canonical build pipeline in a temporary workspace for --deep
- In-process Agent Bridge consumption with AbortSignal cancellation
- No external providers or network requests
- File and parsing failures become targeted diagnostics
- A deep-check failure or timeout does not prevent independent checks from completing
- Cancellation stops work promptly and returns a sanitized status

## Existing project context

No project snapshot was recorded.

## Non-functional requirements

### Which safe events, metrics, traces, and alerts prove the feature is operating correctly?

["JSON records mode and counts for checks, passed, warning, error, skipped, and internal failure","Every check has a stable ID and status","Diagnostics are deterministically ordered","CI uses exit status and JSON as evidence","No event is transmitted or persisted outside the process","Default output omits timing so snapshots remain stable; doctor performance is measured by separate tests or benchmarks","Unexpected failures expose a stable sanitized code suitable for user reports"]

### What latency, payload, concurrency, or browser-performance limits must hold?

["Default doctor completes within 2 seconds on the reference project without running a build","--deep has a default timeout of 60 seconds","Cancellation is checked between every check and major filesystem operation","At most 10000 files are inspected per run","Source files are limited to 1 MiB per file","At most 1000 diagnostics are returned and the result sets truncated true when the limit is reached","Filesystem operations use bounded concurrency","JSON output never embeds full source files or other large payloads","No browser-performance limit applies because the feature is CLI-only"]

## Out of scope

- Automatic file repair or mutation
- Installing or updating dependencies
- Network requests or checks against external services
- Running migrations or accessing application databases
- Executing arbitrary shell commands
- Deploying or publishing applications or packages
- Replacing the complete test, typecheck, or security-audit suites

## Unresolved decisions

All required discovery questions are resolved.
