# create-cocoframe

Dependency-free project creator for [CocoFrame](https://github.com/wiryosaputraofficial/cocoframe).

```bash
npm create cocoframe@latest my-app
npm create cocoframe@latest my-dashboard -- --template dashboard
```

Available templates: `starter`, `marketing`, `dashboard`, and `documentation`.
Every template uses official `@cocoframe/ui` components and tree-shakeable
`@cocoframe/icons` imports.

## Options

- `--template starter|marketing|dashboard|documentation` selects the starter.
- `--package-manager npm|pnpm|yarn|bun` selects the installer.
- `--skip-install` or `--no-install` only writes the starter files.
- `--help` prints usage.
- `--version` prints the creator version.

The creator refuses filesystem roots and non-empty target directories. Each
starter includes a server-rendered page, typed health API, responsive CSS,
TypeScript configuration, and production scripts.

For development from the CocoFrame repository:

```bash
npm run create -- examples/my-app --template marketing --skip-install
```