# @cocoframe/ui

Semantic server-first UI primitives, application patterns, charts, design tokens,
and collision-safe utilities.

Import components from `@cocoframe/ui`, syntax highlighting from
`@cocoframe/ui/syntax`, and styles through the exported CSS subpaths when tooling
does not inject them automatically.

```tsx
import { Alert, Button, FormField, Input, Stack } from "@cocoframe/ui";

export const Profile = () => (
  <Stack><Alert>Server rendered</Alert><FormField label="Name"><Input /></FormField><Button>Save</Button></Stack>
);
```

Components render semantic HTML without browser runtime by default. Use an island
only when interaction genuinely requires it, and prefer an existing primitive
before creating an application-specific equivalent. The live `/components`
catalog is the complete props and accessibility reference. Verify with
`tests/ui.test.ts`, project documentation tests, and responsive E2E.
