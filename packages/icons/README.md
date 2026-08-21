# @cocoframe/icons

Server-first Solar Linear icons for CocoFrame. Every icon is exposed as an
individual typed module so the bundler includes only imports used by an app.

```tsx
import HomeIcon from "@cocoframe/icons/linear/home";
import BellIcon from "@cocoframe/icons/linear/bell";

export function Navigation() {
  return <nav>
    <HomeIcon label="Home" />
    <BellIcon label="Notifications" size={20} strokeWidth={2} />
  </nav>;
}
```

Icons are decorative by default (`aria-hidden="true"`). Provide `label` when an
icon communicates meaning without adjacent text. Supported presentation props
are `size`, `color`, `strokeWidth`, `mirrored`, and `class`. No browser runtime or
inline styles are emitted.

For documentation browsers and build tooling that intentionally need the
complete collection, use the aggregate catalog. Application UI should keep using
direct subpath imports because the catalog imports every icon.

```tsx
import { solarLinearIcons } from "@cocoframe/icons/linear/catalog";
```

See [THIRD_PARTY_NOTICE.md](./THIRD_PARTY_NOTICE.md) for attribution and license
requirements.

## Regenerating the catalog

Download the pinned upstream archive at the repository root, then run the
generator. It validates every SVG and records the archive integrity in
`generated.json`.

```bash
npm pack @solar-icons/static@2.0.1
node packages/icons/scripts/generate-solar-linear.mjs solar-icons-static-2.0.1.tgz
```
