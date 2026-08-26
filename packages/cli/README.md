# @cocoframe/cli

The `cocoframe` executable owns project discovery, inspection, read-only diagnostics, development,
generation, CocoSpecs discovery, CocoUX journey and visual preview, CocoRef component approval, CocoQA evidence and release approval, local Agent Bridge MCP serving, production builds, asset serving, and startup.

## Commands

- `cocoframe spec create|resume|answer|check|generate|approve` manages adaptive product discovery and review artifacts under `specs/<feature>/`.
- `cocoframe ux create|resume|answer|check|generate|preview|feedback|approve|handoff|cancel` manages journey, state, interaction, visual recommendation, PNG evidence, and CocoRef handoff under `ux/<feature>/`.
- `cocoframe ref create|add|audit|status|consent|decline|preview|feedback|approve|cancel` manages reference audits and consent-gated component previews under `refs/<name>/`.
- `cocoframe qa create|resume|answer|run|record|defect|resolve|check|approve` manages traceable quality evidence and release approval under `qa/<feature>/`; create accepts `--design <profile>` for Product Design Quality.
- `cocoframe inspect <project>` emits routes, layouts, islands, styles, UI/icon usage, contracts, middleware, and system routes.
- `cocoframe doctor <project> [--json] [--deep] [--strict]` returns actionable project, dependency, configuration, generated-artifact, security, and isolated-build diagnostics without changing the project.
- `cocoframe agent <project>` serves versioned MCP discovery, lifecycle, and controlled mutation tools; `agent approve|deny|cancel|expire` records host-only hash-bound decisions outside the MCP tool surface.
- `cocoframe dev <project>` builds and watches isolated development output.
- `cocoframe generate <project>` writes typed clients, OpenAPI, and CSS module declarations.
- `cocoframe build <project>` writes production server and hashed browser assets.
- `cocoframe start <project>` serves the production deployment manifest.
- `cocoframe openapi <project>` regenerates the OpenAPI document.

The CLI is an executable boundary rather than an application library API.
Discovery/build helpers in `src/project.ts` are tested repository internals.
Generated files are never edited manually. Verify changes with
`tests/project.test.ts`, `tests/doctor.test.ts`, `tests/agent.test.ts`, `npm run inspect`, and build/E2E when browser output changes.
