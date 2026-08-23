# ADR 0003: Web Standards at Runtime Boundaries

- Status: accepted
- Decision: framework handlers, adapters, generated clients, and deployment exports use Web `Request`, `Response`, Fetch, URL, and Headers.
- Consequence: Node, edge, serverless, browser, and mobile consumers share contracts without importing UI runtime details.
- Rejected direction: exposing Node-specific request/response objects through application APIs.
