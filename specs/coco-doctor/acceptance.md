# Acceptance Criteria: Coco Doctor

- [ ] Given a healthy project, when doctor runs, then it exits 0 with no error diagnostics
- [ ] Given one or more error diagnostics, when doctor completes, then it exits 1
- [ ] Given an internal doctor failure, then it exits 2 with a sanitized failure
- [ ] Given --json, output is a versioned contract with no interleaved human logs
- [ ] Default checks do not modify files, perform network requests, or reveal secrets
- [ ] Every diagnostic includes code, severity, category, message, sanitized evidence, suggestion, and documentation reference
- [ ] Expensive checks run only when --deep is explicitly selected
- [ ] CLI, CI, and Agent Bridge consume the same diagnostic engine and contract
