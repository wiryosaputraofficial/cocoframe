# CocoFrame Task Recipes

Use these recipes as minimal golden paths. Read `docs/ai-context.md` first, then
open only the recipe, owning package README, focused test, and one referenced
example needed by the task.

- `create-page.md`: server-rendered page, metadata, cache, and layout.
- `create-island.md`: opt-in interactivity with signals and fine-grained text.
- `create-form.md`: schema-backed 422/303 progressive form with CSRF.
- `create-api.md`: stable schema contract, runtime validation, and generation.
- `add-middleware.md`: ordered middleware with typed context and a stable ID.
- `add-auth-session.md`: server-only signed session and explicit authorization.
- `add-database.md`: driver-neutral lifecycle and safe concrete adapters.
- `debug-streaming.md`: distinguish page buffering, deferred boundaries, and failures.

Every behavior change still requires a focused regression test plus the gates in
`docs/testing.md`.
