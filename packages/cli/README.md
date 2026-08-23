# @cocoframe/cli

The `cocoframe` executable owns project discovery, inspection, development,
generation, production builds, asset serving, and startup.

## Commands

- `cocoframe inspect <project>` emits routes, layouts, islands, styles, UI/icon usage, contracts, middleware, and system routes.
- `cocoframe dev <project>` builds and watches isolated development output.
- `cocoframe generate <project>` writes typed clients, OpenAPI, and CSS module declarations.
- `cocoframe build <project>` writes production server and hashed browser assets.
- `cocoframe start <project>` serves the production deployment manifest.
- `cocoframe openapi <project>` regenerates the OpenAPI document.

The CLI is an executable boundary rather than an application library API.
Discovery/build helpers in `src/project.ts` are tested repository internals.
Generated files are never edited manually. Verify changes with
`tests/project.test.ts`, `npm run inspect`, and build/E2E when browser output changes.
