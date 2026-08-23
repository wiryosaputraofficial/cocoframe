import { defineIsland, signal } from "@cocoframe/client";
import type { CocoNode } from "@cocoframe/jsx";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BookIcon from "@cocoframe/icons/linear/book-2";
import BoxIcon from "@cocoframe/icons/linear/box-minimalistic";
import CheckIcon from "@cocoframe/icons/linear/check-circle";
import CloseIcon from "@cocoframe/icons/linear/close-circle";
import CodeIcon from "@cocoframe/icons/linear/code-square";
import GraphIcon from "@cocoframe/icons/linear/graph-up";
import ShieldIcon from "@cocoframe/icons/linear/shield-check";
import StarsIcon from "@cocoframe/icons/linear/stars-minimalistic";
import { Badge, Button, Card, Chart, Heading, Kbd, SearchField, Select, Stat, SyntaxHighlighter, Text } from "@cocoframe/ui";

interface TemplateItem {
  readonly slug: "starter" | "marketing" | "dashboard" | "documentation";
  readonly name: string;
  readonly description: string;
  readonly category: "Starter Kits" | "Web Applications" | "Dashboards" | "Documentation";
  readonly technology: readonly string[];
  readonly components: readonly string[];
  readonly icons: readonly string[];
  readonly popularity: number;
  readonly badge: "Popular" | "New" | "Official";
}

const templates: readonly TemplateItem[] = [
  { slug: "starter", name: "CocoFrame Starter", description: "A minimal server-first foundation with a typed API and counter island.", category: "Starter Kits", technology: ["TypeScript", "CocoFrame"], components: ["Badge", "Button", "Card", "Heading", "Stack", "Text"], icons: ["box-minimalistic", "code-square"], popularity: 100, badge: "Official" },
  { slug: "marketing", name: "Marketing Launch", description: "An SEO-ready landing page with a hero, feature cards, metrics, and CTA.", category: "Web Applications", technology: ["TypeScript", "CocoFrame", "CSS"], components: ["Badge", "Card", "Container", "Heading", "Inline", "Stack", "Stat", "Text"], icons: ["arrow-right", "bolt", "graph-up", "shield-check", "stars-minimalistic"], popularity: 98, badge: "Popular" },
  { slug: "dashboard", name: "Orbit Dashboard", description: "A responsive admin dashboard with a sidebar, analytics, data table, and statuses.", category: "Dashboards", technology: ["TypeScript", "CocoFrame", "Charts"], components: ["Badge", "Card", "Chart", "DataTable", "Heading", "Inline", "Sidebar", "Stat", "Text"], icons: ["bell", "calendar", "graph-up", "home", "magnifier", "settings", "users-group-rounded", "widget-4"], popularity: 96, badge: "Popular" },
  { slug: "documentation", name: "Atlas Documentation", description: "Server-first documentation with a sidebar, code samples, alerts, and a route table.", category: "Documentation", technology: ["TypeScript", "CocoFrame"], components: ["Alert", "Badge", "Card", "Heading", "Sidebar", "SyntaxHighlighter", "Table", "Text"], icons: ["arrow-right", "book-2", "check-circle", "code-square", "document-text", "magnifier", "routing-2", "settings"], popularity: 92, badge: "New" },
];

const categories = ["All Templates", "Starter Kits", "Web Applications", "Dashboards", "Documentation"] as const;
const technologies = ["All Tech", "TypeScript", "CocoFrame", "CSS", "Charts"] as const;

export default defineIsland<Record<string, never>>({
  name: "template-catalog",
  setup: () => {
    const query = signal("");
    const category = signal<(typeof categories)[number]>("All Templates");
    const technology = signal<(typeof technologies)[number]>("All Tech");
    const sort = signal<"popular" | "name" | "newest">("popular");
    const selected = signal<TemplateItem | null>(null);
    const copied = signal(false);

    const openTemplate = (item: TemplateItem) => { selected.value = item; copied.value = false; };
    const resetFilters = () => { query.value = ""; category.value = "All Templates"; technology.value = "All Tech"; };

    return () => {
      const normalized = query.value.trim().toLowerCase();
      const filtered = templates.filter((item) => {
        const haystack = `${item.name} ${item.description} ${item.category} ${item.technology.join(" ")} ${item.components.join(" ")} ${item.icons.join(" ")}`.toLowerCase();
        return (!normalized || haystack.includes(normalized))
          && (category.value === "All Templates" || item.category === category.value)
          && (technology.value === "All Tech" || item.technology.includes(technology.value));
      }).slice().sort((left, right) => sort.value === "name" ? left.name.localeCompare(right.name) : sort.value === "newest" ? Number(right.badge === "New") - Number(left.badge === "New") || right.popularity - left.popularity : right.popularity - left.popularity);

      return <section class="template-browser section-shell" id="catalog">
        <div class="template-toolbar">
          <div class="template-search"><SearchField id="template-search" name="query" label="Search templates" class="template-search-field" value={query.value} placeholder="Search templates, components, or icons…" onInput={(event: Event) => { query.value = (event.currentTarget as HTMLInputElement).value; }} /><Kbd title="Search shortcut">⌘K</Kbd></div>
          <label class="template-select"><span class="coco-visually-hidden">Category</span><Select id="template-category" name="category" value={category.value} onInput={(event: Event) => { category.value = (event.currentTarget as HTMLSelectElement).value as (typeof categories)[number]; }}>{categories.map((item) => <option value={item} selected={category.value === item}>{item === "All Templates" ? "All Categories" : item}</option>)}</Select></label>
          <label class="template-select"><span class="coco-visually-hidden">Technology</span><Select id="template-technology" name="technology" value={technology.value} onInput={(event: Event) => { technology.value = (event.currentTarget as HTMLSelectElement).value as (typeof technologies)[number]; }}>{technologies.map((item) => <option value={item} selected={technology.value === item}>{item}</option>)}</Select></label>
          <label class="template-select"><span class="coco-visually-hidden">Sort templates</span><Select id="template-sort" name="sort" value={sort.value} onInput={(event: Event) => { sort.value = (event.currentTarget as HTMLSelectElement).value as "popular" | "name" | "newest"; }}><option value="popular" selected={sort.value === "popular"}>Sort by: Popular</option><option value="newest" selected={sort.value === "newest"}>Sort by: Newest</option><option value="name" selected={sort.value === "name"}>Sort by: Name</option></Select></label>
        </div>

        <div class="template-layout">
          <aside class="template-filters" aria-label="Template filters">
            <section><h2>Categories</h2>{categories.map((item) => <Button class={category.value === item ? "active" : ""} size="small" variant="ghost" onClick={() => { category.value = item; }}><span>{item}</span><b>{item === "All Templates" ? templates.length : templates.filter((template) => template.category === item).length}</b></Button>)}</section>
            <section><h2>Technology</h2>{technologies.slice(1).map((item) => <Button class={technology.value === item ? "active" : ""} size="small" variant="ghost" onClick={() => { technology.value = item; }}><TechMark name={item} /><span>{item}</span><b>{templates.filter((template) => template.technology.includes(item)).length}</b></Button>)}</section>
            <div class="submit-template"><BoxIcon size={24} /><h3>Source available</h3><p>Every template lives in the repository and is tested with every change.</p><a href="https://github.com/wiryosaputraofficial/cocoframe/tree/main/packages/create-cocoframe" target="_blank" rel="noreferrer">View source <ArrowRightIcon size={14} /></a></div>
          </aside>

          <div class="template-results">
            <div class="template-result-summary" role="status"><strong>{filtered.length}</strong> npm-ready template{filtered.length === 1 ? "" : "s"}</div>
            {filtered.length ? <div class="template-grid">{filtered.map((item) => <TemplateCard item={item} open={() => { openTemplate(item); }} />)}</div> : <div class="template-empty"><Heading level={2} size="medium">No matching templates</Heading><Text tone="muted">Try another keyword or filter.</Text><Button size="small" onClick={resetFilters}>Reset filters</Button></div>}
          </div>
        </div>

        {selected.value ? <TemplateDialog item={selected.value} copied={copied.value} close={() => { selected.value = null; }} copy={async () => { try { await navigator.clipboard.writeText(templateCommand(selected.value!.slug)); copied.value = true; window.setTimeout(() => { copied.value = false; }, 1600); } catch { copied.value = false; } }} /> : null}
      </section>;
    };
  },
});

function TemplateCard({ item, open }: { readonly item: TemplateItem; readonly open: () => void }) {
  return <article class="template-card" id={item.slug}><div class="template-card-visual"><span class={`template-status template-status--${item.badge.toLowerCase()}`}>{item.badge}</span><TemplateVisual item={item} /></div><div class="template-card-copy"><Heading level={2} size="medium">{item.name}</Heading><Text tone="muted" size="small">{item.description}</Text><div class="template-tech">{item.technology.map((name) => <TechBadge name={name} />)}</div></div><footer><Button type="button" size="small" variant="ghost" onClick={open}>Preview</Button><Button type="button" size="small" variant="ghost" onClick={open}>Use Template <ArrowRightIcon size={14} /></Button></footer></article>;
}

function TemplateDialog({ item, copied, close, copy }: { readonly item: TemplateItem; readonly copied: boolean; readonly close: () => void; readonly copy: () => void }) {
  const sourceFolder = item.slug === "starter" ? "template" : `templates/${item.slug}`;
  return <div class="template-modal-backdrop" role="presentation" onClick={(event: Event) => { if (event.target === event.currentTarget) close(); }}><section class="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-preview-title"><button class="template-modal-close" type="button" aria-label="Close preview" onClick={close}><CloseIcon size={22} /></button><TemplateVisual item={item} large /><div class="template-modal-copy"><Badge variant="success">{item.category}</Badge><Heading id="template-preview-title" level={2}>{item.name}</Heading><Text tone="muted">{item.description}</Text><div class="template-tech">{item.technology.map((name) => <TechBadge name={name} />)}</div><div class="template-inventory"><small>{item.components.length} UI components</small><small>{item.icons.length} Solar icons</small></div><SyntaxHighlighter code={templateCommand(item.slug)} language="bash" label={`Create ${item.name}`} /><div class="template-modal-actions"><Button type="button" size="small" onClick={copy}>{copied ? "Copied!" : "Copy command"}</Button><a href={`https://github.com/wiryosaputraofficial/cocoframe/tree/main/packages/create-cocoframe/${sourceFolder}`} target="_blank" rel="noreferrer">View source <ArrowRightIcon size={14} /></a></div></div></section></div>;
}

function TemplateVisual({ item, large = false }: { readonly item: TemplateItem; readonly large?: boolean }): CocoNode {
  return <div class={`template-mockup template-mockup--${item.slug}${large ? " template-mockup--large" : ""}`} aria-label={`${item.name} component preview`} role="img"><div class="mock-browser-bar"><i></i><i></i><i></i><span></span></div><div class="template-component-preview">
    {item.slug === "starter" ? <Card class="preview-starter"><Badge variant="success"><CodeIcon size={13} /> Server-first</Badge><Heading level={3} size="medium">Your project is ready.</Heading><Button size="small">Count: 0</Button></Card> : null}
    {item.slug === "marketing" ? <Card class="preview-marketing"><Badge variant="success"><StarsIcon size={13} /> New release</Badge><Heading level={3} size="medium">Build a clearer product story.</Heading><Text size="small" tone="muted">Fast, focused, and ready for search.</Text><div><span><GraphIcon size={15} /> Convert</span><span><ShieldIcon size={15} /> Secure</span></div></Card> : null}
    {item.slug === "dashboard" ? <div class="preview-dashboard"><div class="preview-stats"><Stat label="Revenue" value="$42.8k" trend="+12.4%" tone="positive" /><Stat label="Customers" value="1,284" trend="+86" tone="positive" /></div><Chart type="area" label="Revenue" labels={["Mar","Apr","May","Jun","Jul","Aug"]} datasets={[{ label: "Revenue", data: [24,28,27,34,38,43], tone: "primary", fill: true }]} showLegend={false} /></div> : null}
    {item.slug === "documentation" ? <div class="preview-docs"><aside><BookIcon size={19} /><span>Introduction</span><span>Installation</span><span>Routing</span></aside><Card><Badge variant="primary"><CheckIcon size={13} /> Guide</Badge><Heading level={3} size="medium">Build useful documentation.</Heading><SyntaxHighlighter code={`npm create cocoframe@latest`} language="bash" label="Install" /></Card></div> : null}
  </div></div>;
}

function templateCommand(template: TemplateItem["slug"]): string {
  return `npm create cocoframe@latest my-app -- --template ${template}`;
}

function TechBadge({ name }: { readonly name: string }) { return <span class={`tech-badge tech-badge--${slug(name)}`}><TechMark name={name} />{name}</span>; }
function TechMark({ name }: { readonly name: string }) { const label = name === "TypeScript" ? "TS" : name === "CocoFrame" ? "CF" : name === "CSS" ? "CSS" : name.slice(0, 1); return <i class={`tech-mark tech-mark--${slug(name)}`} aria-hidden="true">{name === "Charts" ? <GraphIcon size={13} /> : label}</i>; }
function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }