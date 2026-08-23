# ADR 0002: Isolated Islands for Browser Interaction

- Status: accepted
- Decision: one stable lowercase island name maps server output to one browser module and boundary-local state.
- Consequence: the browser imports only referenced islands; `enhance` can preserve existing server DOM.
- Fine-grained path: `bind(signal)` updates reactive text without replacing its parent boundary.
- Rejected direction: global component registries and full-document hydration.
