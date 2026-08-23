# ADR 0004: Page Error Boundaries Intentionally Buffer

- Status: accepted
- Decision: pages stream by default, but declaring a page `error` boundary buffers that page before headers are committed.
- Consequence: render failures can still produce an accurate HTTP 500 and safe error document.
- Tradeoff: that page gives up incremental streaming; use deferred boundaries for isolated supplementary latency.
- Rejected direction: reporting a render failure inside an already committed HTTP 200 page as if status remained correct.
