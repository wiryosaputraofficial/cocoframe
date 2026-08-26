# Getting Started with CocoFrame

This guide creates a server-first CocoFrame application, explains its files,
and takes it through inspection, diagnosis, generation, production build, and
startup.

## Requirements

- Node.js 24 or newer.
- npm, pnpm, Yarn, or Bun.
- A current browser for local development.

Check the active tools:

```bash
node --version
npm --version
```

## Create an application

```bash
npm create cocoframe@latest my-app
cd my-app
npm run dev
```

Open `http://127.0.0.1:3000`. The development server watches the application,
rebuilds changed routes and assets, and reloads the browser.

Choose a template when creating the project:

```bash
npm create cocoframe@latest my-app -- --template starter
npm create cocoframe@latest my-site -- --template marketing
npm create cocoframe@latest my-dashboard -- --template dashboard
npm create cocoframe@latest my-docs -- --template documentation
```

Creator options:

| Option | Meaning |
| --- | --- |
| `--template starter\|marketing\|dashboard\|documentation` | Select the official template. |
| `--package-manager npm\|pnpm\|yarn\|bun` | Select the dependency installer. |
| `--skip-install`, `--no-install` | Write files without installing dependencies. |
| `--help`, `-h` | Print creator usage. |
| `--version`, `-v` | Print the creator version. |

The creator refuses filesystem roots and non-empty target directories. It does
not overwrite existing application files.

## Project structure

```text
my-app/
├─ app/
│  ├─ components/             reusable server components
│  ├─ islands/                opt-in browser components (*.island.tsx)
│  ├─ generated/              typed client and OpenAPI output
│  ├─ routes/                 pages, API routes, and nested layouts
│  └─ styles/                 global CSS and CSS modules
├─ public/                    copied static assets
├─ specs/<feature>/           CocoSpec canonical state and review views
├─ ux/<feature>/              CocoUX state and approved PNG evidence
├─ refs/<name>/               CocoRef sources, audit, and approvals
├─ qa/<feature>/              CocoQA plan, evidence, defects, and approval
├─ cocoframe.config.ts        typed application configuration
├─ package.json
└─ tsconfig.json
```

`.cocoframe/` contains generated development, production, preview, and package
output. It is never application source.

## Add a server-rendered page

Create `app/routes/about.page.tsx`:

```tsx
import { definePage } from "@cocoframe/core";

export default definePage({
  meta: {
    title: "About",
    description: "About this application",
  },
  view: () => (
    <main>
      <h1>About</h1>
      <p>This HTML is rendered on the server.</p>
    </main>
  ),
});
```

The filename becomes `/about`. Dynamic segments use `[id].page.tsx`; catch-all
segments use `[...path].page.tsx`; `index.page.tsx` maps to its containing
directory. Layouts use `_layout.tsx` and are inherited through directory
nesting.

## Add opt-in interactivity

Create `app/islands/counter.island.tsx`:

```tsx
import { bind, defineIsland, signal } from "@cocoframe/client";

export default defineIsland<{ initial: number }>({
  name: "counter",
  setup: ({ initial }) => {
    const count = signal(initial);
    return () => (
      <button type="button" onClick={() => count.value++}>
        Count: {bind(count)}
      </button>
    );
  },
});
```

The stable lowercase `name` must match the filename. Static routes receive no
application JavaScript; an island adds only its own bundle and the small client
bootstrap.

## Add a typed API

Create `app/routes/api/greeting.route.ts`:

```ts
import { defineApi } from "@cocoframe/core";
import { schema } from "@cocoframe/schema";

export default defineApi({
  id: "get-greeting",
  method: "GET",
  input: {
    query: schema.object({ name: schema.string({ min: 2 }) }),
  },
  output: schema.object({ message: schema.string() }),
  handle: ({ input }) => ({ message: `Hello, ${input.query.name}` }),
});
```

Regenerate all contract-derived artifacts:

```bash
npm run generate
```

This writes the Fetch-standard typed client, OpenAPI 3.1 document, and exact CSS
module declarations. Never edit those generated files manually.

## Inspect and diagnose

```bash
npm run inspect
npx cocoframe doctor
npx cocoframe doctor --deep --strict
```

`inspect` prints routes, layouts, islands, styles, UI/icon usage, API contracts,
middleware, and system routes as JSON. Doctor performs deterministic project,
dependency, configuration, generated-artifact, security, and optional isolated
build checks. Read [CocoFrame Doctor](cocodoctor.md) for CI and JSON usage.

## Development loop

Use this loop for ordinary application work:

```bash
npm run dev
npm run check
npm run inspect
npm run generate
npm run build
```

Run generation after changing an API contract or CSS module classes. Add
focused application tests for every behavior change. Browser, island, form,
security-header, visual, or responsive changes also need E2E coverage.

## Build and start production

```bash
npm run build
npm start
```

The build writes `.cocoframe/server.mjs`, hashed browser assets,
`.cocoframe/assets.json`, and `.cocoframe/deploy.json`. `npm start` serves that
output without rediscovering application source.

Runtime environment variables:

```bash
HOST=0.0.0.0
PORT=3000
COCOFRAME_MAX_BODY_BYTES=1048576
COCOFRAME_REQUEST_TIMEOUT_MS=30000
COCOFRAME_SHUTDOWN_TIMEOUT_MS=10000
npm start
```

Before exposing the service, configure explicit `allowedHosts`, explicit CORS
origins, trusted direct proxies when required, readiness checks, CSRF for
cookie-authenticated unsafe requests, and application authorization. Continue
with [Configuration](configuration.md), [Security](https://github.com/wiryosaputraofficial/cocoframe/blob/main/packages/security/README.md),
and [Deployment](deployment.md).

## AI-assisted feature workflow

For a new user-facing workflow, start with a reviewed product contract rather
than implementation:

```bash
cocoframe spec create checkout --brief "A user completes checkout."
cocoframe spec resume checkout
```

After CocoSpec approval, use CocoUX for journeys and visual direction, CocoRef
for exact reference-driven component approval, and CocoQA for release evidence.
The complete sequence is documented in [Product workflow](product-workflow.md).

## Next steps

- Follow a [task recipe](recipes/README.md).
- Review the [CLI reference](cli-reference.md).
- Learn the [request lifecycle](request-lifecycle.md).
- Select packages from the [package catalog](packages.md).
- Query PostgreSQL through [CocoQL PostgreSQL](cocoql-postgresql.md).
- Diagnose problems with [Doctor](cocodoctor.md) and
  [Troubleshooting](troubleshooting.md).
