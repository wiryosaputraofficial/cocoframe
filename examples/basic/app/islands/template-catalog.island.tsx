import { defineIsland, signal } from "@cocoframe/client";
import type { CocoNode } from "@cocoframe/jsx";
import AltArrowDownIcon from "@cocoframe/icons/linear/alt-arrow-down";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BoxMinimalisticIcon from "@cocoframe/icons/linear/box-minimalistic";
import CloseCircleIcon from "@cocoframe/icons/linear/close-circle";
import GraphUpIcon from "@cocoframe/icons/linear/graph-up";
import { Button, Kbd, SearchField, Select } from "@cocoframe/ui";

interface TemplateItem {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly technology: readonly string[];
  readonly visual: "dashboard" | "landing" | "docs" | "commerce" | "saas" | "blog" | "portfolio" | "api" | "auth" | "support";
  readonly popularity: number;
  readonly badge?: "Popular" | "New";
}

const templates: readonly TemplateItem[] = [
  { slug: "cocoframe-dashboard", name: "CocoFrame Dashboard", description: "Dashboard admin modern dengan analytics, tabel, dan komponen siap pakai.", category: "Dashboards", technology: ["TypeScript", "CocoFrame", "Charts"], visual: "dashboard", popularity: 100, badge: "Popular" },
  { slug: "marketing-landing", name: "Marketing Landing", description: "Landing page yang bersih, responsif, dan siap untuk produk atau layanan Anda.", category: "Web Applications", technology: ["TypeScript", "CocoFrame", "CSS"], visual: "landing", popularity: 96 },
  { slug: "documentation-site", name: "Documentation Site", description: "Template dokumentasi lengkap dengan sidebar, pencarian, dan navigasi konten.", category: "Documentation", technology: ["TypeScript", "CocoFrame", "MDX"], visual: "docs", popularity: 94 },
  { slug: "ecommerce-store", name: "E-Commerce Store", description: "Toko online lengkap dengan katalog, keranjang, checkout, dan halaman produk.", category: "E-Commerce", technology: ["TypeScript", "CocoFrame", "Stripe"], visual: "commerce", popularity: 92, badge: "New" },
  { slug: "saas-starter", name: "SaaS Starter", description: "Starter kit SaaS dengan autentikasi, billing, dan manajemen pengguna.", category: "SaaS", technology: ["TypeScript", "CocoFrame", "Prisma"], visual: "saas", popularity: 90 },
  { slug: "blog-starter", name: "Blog Starter", description: "Template blog minimalis dengan MDX, kategori, tag, dan pencarian.", category: "Blogs", technology: ["TypeScript", "CocoFrame", "MDX"], visual: "blog", popularity: 87 },
  { slug: "analytics-dashboard", name: "Analytics Dashboard", description: "Dashboard analytics dengan charts, statistik, dan export data.", category: "Dashboards", technology: ["TypeScript", "CocoFrame", "Charts"], visual: "dashboard", popularity: 85 },
  { slug: "developer-portfolio", name: "Developer Portfolio", description: "Portfolio personal untuk developer atau designer dengan studi kasus.", category: "Web Applications", technology: ["TypeScript", "CocoFrame", "CSS"], visual: "portfolio", popularity: 82 },
  { slug: "api-starter", name: "API Starter", description: "Starter kit REST API dengan validasi, OpenAPI, security, dan typed client.", category: "Starter Kits", technology: ["TypeScript", "Node.js", "OpenAPI"], visual: "api", popularity: 80 },
  { slug: "auth-portal", name: "Auth Portal", description: "Alur sign-in, registrasi, recovery, dan account settings yang accessible.", category: "SaaS", technology: ["TypeScript", "CocoFrame", "Auth"], visual: "auth", popularity: 78, badge: "New" },
  { slug: "storefront-lite", name: "Storefront Lite", description: "Storefront ringan untuk katalog kecil dan pembayaran cepat.", category: "E-Commerce", technology: ["TypeScript", "CocoFrame", "Stripe"], visual: "commerce", popularity: 75 },
  { slug: "product-changelog", name: "Product Changelog", description: "Blog changelog untuk merilis pembaruan produk secara terstruktur.", category: "Blogs", technology: ["TypeScript", "CocoFrame", "MDX"], visual: "blog", popularity: 72 },
  { slug: "support-portal", name: "Support Portal", description: "Portal bantuan dengan knowledge base, pencarian, dan status layanan.", category: "Web Applications", technology: ["TypeScript", "CocoFrame", "Search"], visual: "support", popularity: 70 },
  { slug: "admin-minimal", name: "Admin Minimal", description: "Fondasi admin yang fokus untuk internal tool dan operasi sederhana.", category: "Dashboards", technology: ["TypeScript", "CocoFrame", "CSS"], visual: "dashboard", popularity: 68 },
];

const categories = ["All Templates", "Starter Kits", "Web Applications", "Dashboards", "E-Commerce", "SaaS", "Blogs", "Documentation"] as const;
const technologies = ["All Tech", "TypeScript", "CocoFrame", "Node.js", "MDX", "Stripe", "Charts"] as const;

export default defineIsland<Record<string, never>>({
  name: "template-catalog",
  setup: () => {
    const query = signal("");
    const category = signal<(typeof categories)[number]>("All Templates");
    const technology = signal<(typeof technologies)[number]>("All Tech");
    const sort = signal<"popular" | "name" | "newest">("popular");
    const visible = signal(9);
    const selected = signal<TemplateItem | null>(null);

    const resetVisible = () => { visible.value = 9; };

    return () => {
      const normalized = query.value.trim().toLowerCase();
      const filtered = templates.filter((item) => {
        const matchesQuery = !normalized || `${item.name} ${item.description} ${item.category} ${item.technology.join(" ")}`.toLowerCase().includes(normalized);
        const matchesCategory = category.value === "All Templates" || item.category === category.value;
        const matchesTechnology = technology.value === "All Tech" || item.technology.includes(technology.value);
        return matchesQuery && matchesCategory && matchesTechnology;
      }).slice().sort((left, right) => sort.value === "name" ? left.name.localeCompare(right.name) : sort.value === "newest" ? Number(right.badge === "New") - Number(left.badge === "New") || right.popularity - left.popularity : right.popularity - left.popularity);
      const shown = filtered.slice(0, visible.value);

      return <section class="template-browser section-shell" id="catalog">
        <div class="template-toolbar">
          <div class="template-search"><SearchField id="template-search" name="query" label="Search templates" class="template-search-field" value={query.value} placeholder="Search templates..." onInput={(event: Event) => { query.value = (event.currentTarget as HTMLInputElement).value; resetVisible(); }} /><Kbd title="Search shortcut">⌘K</Kbd></div>
          <label class="template-select"><span class="coco-visually-hidden">Category</span><Select id="template-category" name="category" value={category.value} onInput={(event: Event) => { category.value = (event.currentTarget as HTMLSelectElement).value as (typeof categories)[number]; resetVisible(); }}>{categories.map((item) => <option value={item} selected={category.value === item}>{item === "All Templates" ? "All Categories" : item}</option>)}</Select></label>
          <label class="template-select"><span class="coco-visually-hidden">Technology</span><Select id="template-technology" name="technology" value={technology.value} onInput={(event: Event) => { technology.value = (event.currentTarget as HTMLSelectElement).value as (typeof technologies)[number]; resetVisible(); }}>{technologies.map((item) => <option value={item} selected={technology.value === item}>{item}</option>)}</Select></label>
          <label class="template-select"><span class="coco-visually-hidden">Sort templates</span><Select id="template-sort" name="sort" value={sort.value} onInput={(event: Event) => { sort.value = (event.currentTarget as HTMLSelectElement).value as "popular" | "name" | "newest"; }}><option value="popular" selected={sort.value === "popular"}>Sort by: Popular</option><option value="newest" selected={sort.value === "newest"}>Sort by: Newest</option><option value="name" selected={sort.value === "name"}>Sort by: Name</option></Select></label>
        </div>

        <div class="template-layout">
          <aside class="template-filters" aria-label="Template filters">
            <section><h2>Categories</h2>{categories.map((item) => <Button class={category.value === item ? "active" : ""} size="small" variant="ghost" onClick={() => { category.value = item; resetVisible(); }}><span>{item}</span><b>{item === "All Templates" ? templates.length : templates.filter((template) => template.category === item).length}</b></Button>)}</section>
            <section><h2>Technology</h2>{["TypeScript", "CocoFrame", "Node.js", "MDX", "Stripe", "Charts"].map((item) => <Button class={technology.value === item ? "active" : ""} size="small" variant="ghost" onClick={() => { technology.value = item as (typeof technologies)[number]; resetVisible(); }}><TechMark name={item} /><span>{item}</span><b>{templates.filter((template) => template.technology.includes(item)).length}</b></Button>)}</section>
            <div class="submit-template"><span aria-hidden="true"><BoxMinimalisticIcon size={24} /></span><h3>Punya template keren?</h3><p>Bagikan template Anda ke komunitas CocoFrame.</p><a href="/contact">Submit Template <b aria-hidden="true"><ArrowRightIcon size={14} /></b></a></div>
          </aside>

          <div class="template-results">
            <div class="template-result-summary" role="status"><strong>{filtered.length}</strong> template ditemukan{category.value !== "All Templates" ? ` dalam ${category.value}` : ""}</div>
            {shown.length ? <div class="template-grid">{shown.map((item) => <TemplateCard item={item} preview={() => { selected.value = item; }} />)}</div> : <div class="template-empty"><h2>Tidak ada template yang cocok</h2><p>Coba kata kunci atau filter lain.</p><Button size="small" onClick={() => { query.value = ""; category.value = "All Templates"; technology.value = "All Tech"; resetVisible(); }}>Reset filters</Button></div>}
            {shown.length < filtered.length ? <Button class="load-templates" size="small" variant="secondary" onClick={() => { visible.value += 6; }}>Load More Templates <span aria-hidden="true"><AltArrowDownIcon size={17} /></span></Button> : null}
          </div>
        </div>

        {selected.value ? <div class="template-modal-backdrop" role="presentation" onClick={(event: Event) => { if (event.target === event.currentTarget) selected.value = null; }}><section class="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-preview-title"><button class="template-modal-close" type="button" aria-label="Close preview" onClick={() => { selected.value = null; }}><CloseCircleIcon size={22} /></button><TemplateVisual item={selected.value} large /><div class="template-modal-copy"><span>{selected.value.category}</span><h2 id="template-preview-title">{selected.value.name}</h2><p>{selected.value.description}</p><div>{selected.value.technology.map((name) => <TechBadge name={name} />)}</div><a href={`/docs?template=${selected.value.slug}#quick-start`}>Use this template <b aria-hidden="true"><ArrowRightIcon size={14} /></b></a></div></section></div> : null}
      </section>;
    };
  },
});

function TemplateCard({ item, preview }: { readonly item: TemplateItem; readonly preview: () => void }) {
  return <article class="template-card" id={item.slug}><div class="template-card-visual">{item.badge ? <span class={`template-status template-status--${item.badge.toLowerCase()}`}>{item.badge}</span> : null}<TemplateVisual item={item} /></div><div class="template-card-copy"><h2>{item.name}</h2><p>{item.description}</p><div class="template-tech">{item.technology.map((name) => <TechBadge name={name} />)}</div></div><footer><button type="button" onClick={preview}>Preview</button><a href={`/docs?template=${item.slug}#quick-start`}>Use Template <span aria-hidden="true"><ArrowRightIcon size={14} /></span></a></footer></article>;
}

function TemplateVisual({ item, large = false }: { readonly item: TemplateItem; readonly large?: boolean }): CocoNode {
  return <div class={`template-mockup template-mockup--${item.visual}${large ? " template-mockup--large" : ""}`} aria-label={`${item.name} preview`} role="img">
    <div class="mock-browser-bar"><i></i><i></i><i></i><span></span></div>
    {item.visual === "dashboard" ? <div class="mock-dashboard"><aside></aside><main><header></header><div class="mock-stats"><b></b><b></b><b></b></div><div class="mock-chart"><span></span></div><div class="mock-table"><i></i><i></i><i></i></div></main></div> : null}
    {item.visual === "landing" ? <div class="mock-landing"><nav></nav><section><div><b></b><span></span><span></span><em></em></div><div class="mock-cubes"><i></i><i></i><i></i></div></section></div> : null}
    {item.visual === "docs" ? <div class="mock-docs"><aside><i></i><i></i><i></i><i></i></aside><main><b></b><span></span><span></span><code></code><span></span></main></div> : null}
    {item.visual === "commerce" ? <div class="mock-commerce"><nav></nav><header><b></b><span></span></header><main>{[1,2,3,4].map(() => <i></i>)}</main></div> : null}
    {item.visual === "saas" ? <div class="mock-saas"><nav></nav><main><div><b></b><span></span><em></em></div><div class="mock-phone"><i></i><i></i><i></i></div></main></div> : null}
    {item.visual === "blog" ? <div class="mock-blog"><nav></nav><main><article><i></i><b></b><span></span></article><article><i></i><b></b><span></span></article><article><i></i><b></b><span></span></article></main></div> : null}
    {item.visual === "portfolio" ? <div class="mock-portfolio"><nav></nav><main><div><small>Hi, I'm</small><b>Alex</b><span></span><em></em></div><i></i></main></div> : null}
    {item.visual === "api" ? <div class="mock-api"><aside></aside><main><b></b><span></span><div><i>GET</i><em></em></div><div><i>POST</i><em></em></div><div><i>GET</i><em></em></div></main></div> : null}
    {item.visual === "auth" ? <div class="mock-auth"><main><b></b><span></span><label></label><label></label><button></button></main></div> : null}
    {item.visual === "support" ? <div class="mock-support"><nav></nav><header><b></b><label></label></header><main><i></i><i></i><i></i></main></div> : null}
  </div>;
}

function TechBadge({ name }: { readonly name: string }) {
  return <span class={`tech-badge tech-badge--${slug(name)}`}><TechMark name={name} />{name}</span>;
}

function TechMark({ name }: { readonly name: string }) {
  const label = name === "TypeScript" ? "TS" : name === "CocoFrame" ? "CF" : name === "Node.js" ? "N" : name === "Stripe" ? "S" : name === "MDX" ? "M" : name.slice(0, 1);
  return <i class={`tech-mark tech-mark--${slug(name)}`} aria-hidden="true">{name === "Charts" ? <GraphUpIcon size={13} /> : label}</i>;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
