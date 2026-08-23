import { definePage } from "@cocoframe/core";
import CloseCircleIcon from "@cocoframe/icons/linear/close-circle";
import { solarLinearIcons, type SolarLinearCatalogEntry } from "@cocoframe/icons/linear/catalog";
import { SyntaxHighlighter } from "@cocoframe/ui";
import IconExplorer from "../islands/icon-explorer.island.tsx";

const directImportExample = `import HomeIcon from "@cocoframe/icons/linear/home";

export function HomeLink() {
  return <a href="/">
    <HomeIcon size={20} /> Home
  </a>;
}`;

const accessibleExample = `import BellIcon from "@cocoframe/icons/linear/bell";
import HeartIcon from "@cocoframe/icons/linear/heart";

<BellIcon label="Notifications" size={24} />
<HeartIcon /> // decorative by default`;

const stylingExample = `import SettingsIcon from "@cocoframe/icons/linear/settings";

<SettingsIcon
  size={32}
  color="#1e7a5a"
  strokeWidth={2}
  mirrored={false}
  class="settings-icon"
/>`;

export default definePage({
  load: ({ query }) => {
    const search = (query.get("q") ?? "").trim().toLowerCase().slice(0, 80);
    const selectedName = (query.get("icon") ?? "").trim().toLowerCase().slice(0, 80);
    const visibleCount = search ? solarLinearIcons.filter(({ name }) => name.includes(search)).length : solarLinearIcons.length;
    const selected = solarLinearIcons.find(({ name }) => name === selectedName);
    return { search, icons: solarLinearIcons, visibleCount, selected };
  },
  meta: ({ search, visibleCount }) => ({
    title: search ? `${visibleCount} icons for “${search}” — CocoFrame` : "1,246 Solar Linear Icons — CocoFrame",
    description: "Explore 1,246 typed, server-first Solar Linear icons for CocoFrame, complete with direct imports, accessibility, styling, and search.",
    canonical: "https://cocoframe.dev/icons",
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "CocoFrame Solar Linear Icons",
      numberOfItems: solarLinearIcons.length,
      inLanguage: "en",
    },
  }),
  cache: { browser: 300, edge: 3600, staleWhileRevalidate: 86400 },
  view: ({ search, icons, visibleCount, selected }) => <main class="icons-page" id="top">
    <section class="icons-hero section-shell">
      <div><span class="eyebrow pill">SOLAR LINEAR ICONS</span><h1>1,246 icons.<br /><span>One predictable API.</span></h1><p>A complete icon library for CocoFrame web applications. Every icon is typed, follows <code>currentColor</code>, renders on the server, and requires no browser JavaScript.</p><div class="icons-hero-actions"><a class="button button-primary" href="#icon-catalog">Browse all icons</a><a class="button button-ghost" href="#usage">How to use</a></div></div>
      <div class="icons-hero-preview" aria-hidden="true">{solarLinearIcons.slice(0, 20).map(({ Icon }, index) => <span class={`icons-orbit icons-orbit-${index % 5}`}><Icon size={28 + (index % 3) * 4} /></span>)}</div>
    </section>

    <section class="icons-usage section-shell" id="usage" aria-labelledby="icons-usage-title">
      <header><span class="eyebrow">USAGE</span><h2 id="icons-usage-title">Import only what you use</h2><p>Use direct subpaths in applications so only the icons you use enter the bundle. The aggregate catalog is intended for documentation and tooling such as this page.</p></header>
      <div class="icons-usage-grid"><UsageCard title="Direct import" code={directImportExample} /><UsageCard title="Accessibility" code={accessibleExample} /><UsageCard title="Styling props" code={stylingExample} /></div>
      <div class="icons-props"><code>size?: number</code><code>color?: string</code><code>strokeWidth?: 1 | 1.5 | 2</code><code>mirrored?: boolean</code><code>label?: string</code><code>class?: string</code></div>
    </section>

    <section class="icons-catalog" id="icon-catalog" aria-labelledby="icon-catalog-title">
      <IconExplorer initialSearch={search} initialVisible={visibleCount} initialIcon={selected?.name ?? ""} total={icons.length} />
      <div class="icons-grid">{icons.map((entry) => <IconCard entry={entry} search={search} />)}</div>
      <div class="icons-empty icons-live-empty" hidden={visibleCount > 0}><h2>Icon not found</h2><p>Try a shorter term such as <code>arrow</code>, <code>user</code>, <code>home</code>, or <code>chart</code>.</p><a class="button button-primary" href="/icons#icon-catalog">Show all icons</a></div>
      <UsageDialog selected={selected} />
    </section>
  </main>,
});

function UsageCard({ title, code }: { readonly title: string; readonly code: string }) {
  return <article><h3>{title}</h3><SyntaxHighlighter code={code} language="tsx" label={`${title} icon example`} /></article>;
}

function IconCard({ entry, search }: { readonly entry: SolarLinearCatalogEntry; readonly search: string }) {
  const { name, Icon } = entry;
  const displayName = name.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
  const href = `/icons?${search ? `q=${encodeURIComponent(search)}&` : ""}icon=${encodeURIComponent(name)}#icon-usage-modal`;
  return <article class="icon-catalog-card" data-icon-name={name} hidden={Boolean(search && !name.includes(search))}><a class="icon-card-trigger" href={href} data-icon-trigger data-icon-name={name} data-icon-label={displayName} aria-label={`View how to use the ${displayName} icon`}><div><Icon size={36} /></div><h3>{displayName}</h3><code title={`@cocoframe/icons/linear/${name}`}>{`linear/${name}`}</code></a></article>;
}

function UsageDialog({ selected }: { readonly selected: SolarLinearCatalogEntry | undefined }) {
  const name = selected?.name ?? "icon";
  const displayName = selected ? selected.name.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ") : "Icon usage";
  const component = `${name.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("")}Icon`;
  const importPath = `@cocoframe/icons/linear/${name}`;
  const snippet = `import ${component} from "${importPath}";\n\n<${component} label="${displayName}" size={24} />`;
  const SelectedIcon = selected?.Icon;
  return <dialog class="icon-usage-modal" id="icon-usage-modal" aria-labelledby="icon-modal-title" aria-describedby="icon-modal-description" open={selected ? true : undefined}><div class="icon-modal-header"><div><span class="eyebrow">ICON USAGE</span><h2 id="icon-modal-title" data-modal-title>{displayName}</h2></div><form method="dialog"><button type="submit" data-modal-close aria-label="Close dialog"><CloseCircleIcon size={22} /></button></form></div><div class="icon-modal-body"><div class="icon-modal-preview" data-modal-preview>{SelectedIcon ? <SelectedIcon size={64} /> : null}</div><p id="icon-modal-description">Use a direct import so only this icon enters your application bundle.</p><code class="icon-modal-path" data-modal-path>{importPath}</code><div data-modal-snippet><SyntaxHighlighter code={snippet} language="tsx" label={`${displayName} icon usage`} /></div><div class="icon-modal-actions"><button class="button button-primary" type="button" data-modal-copy>Copy code</button><a class="button button-ghost" href="/docs#icons">Read documentation</a></div></div></dialog>;
}
