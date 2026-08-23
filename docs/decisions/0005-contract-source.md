# ADR 0005: One API Contract Feeds Runtime and Generation

- Status: accepted
- Decision: stable API IDs plus serializable input/output schemas feed runtime validation, inspect, generated Fetch clients, and OpenAPI 3.1.
- Consequence: browser/mobile clients and public API documentation share the server contract.
- Rule: change source definitions and regenerate; never edit clients or OpenAPI manually.
- Rejected direction: independent runtime, client-type, and documentation schemas that can drift.
