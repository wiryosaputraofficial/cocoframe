# ADR 0001: Server Rendering by Default

- Status: accepted
- Decision: every route returns useful escaped HTML without browser JavaScript.
- Consequence: static pages ship no application runtime; SEO and accessibility do not depend on hydration.
- Interactivity: opt in through isolated islands only.
- Rejected direction: application-wide hydration or a virtual DOM as the default lifecycle.
