import { defineIsland, signal } from "@cocoframe/client";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BranchingPathsUpIcon from "@cocoframe/icons/linear/branching-paths-up";
import CloudCheckIcon from "@cocoframe/icons/linear/cloud-check";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DatabaseIcon from "@cocoframe/icons/linear/database";
import DocumentTextIcon from "@cocoframe/icons/linear/document-text";
import MagnifierIcon from "@cocoframe/icons/linear/magnifier";
import PaletteIcon from "@cocoframe/icons/linear/palette";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import ChecklistIcon from "@cocoframe/icons/linear/checklist";

const cards = [
  [BranchingPathsUpIcon, "Getting Started", "Installation, struktur project, konfigurasi, dan quick start.", "getting started introduction installation quick start structure configuration", "#installation"],
  [DocumentTextIcon, "Pages & Routing", "Pages, layouts, data loading, caching, dan error boundaries.", "pages routing data fetching layouts cache errors", "#routing"],
  [PaletteIcon, "Frontend", "Server components, CSS Modules, UI primitives, islands, dan signals.", "components ui css reusable islands signals frontend", "#components"],
  [BranchingPathsUpIcon, "Charts", "Dua belas chart SVG server-first, multi-dataset, responsif, dan accessible.", "chart line area bar pie doughnut radar scatter bubble mixed analytics", "#charts"],
  [ChecklistIcon, "Forms & Validation", "Form progresif, CSRF, schema validation, dan field errors.", "forms csrf validation schema field errors", "#forms"],
  [CodeSquareIcon, "API & Mobile Client", "Typed API routes, generated Fetch client, dan OpenAPI.", "api reference routes client mobile fetch openapi", "#api-routes"],
  [DocumentTextIcon, "Package API Reference", "Seluruh public package, responsibility, dan primary export CocoFrame.", "package api reference exports core jsx router client ui schema server cli", "#api-reference"],
  [CloudCheckIcon, "Observability", "Request ID tervalidasi, timing, structured logs, dan custom writer.", "observability request id logger timing telemetry structured logs", "#observability"],
  [ShieldCheckIcon, "Security & Auth", "Middleware, browser hardening, CORS, session, dan rate limit.", "security middleware authentication cors csrf session rate limit", "#security"],
  [DatabaseIcon, "Database", "SQLite, PostgreSQL, transaction, query, dan migration.", "database sqlite postgres transaction migration query", "#database"],
  [ChecklistIcon, "End-to-end Recipes", "Hubungkan schema, form, database, API, dan mobile client.", "recipe crud schema form database api mobile tutorial end to end", "#recipes"],
  [DatabaseIcon, "CocoQL", "AI-first query language dengan safety policy, mutation preview, guarded writes, MySQL, dan PostgreSQL.", "cocoql ai permissions safety mutation preview guard query plan structured errors schema semantic dates utc aggregation mysql postgresql numbered parameters", "#cocoql"],
  [CloudCheckIcon, "Production", "Testing, streaming, SEO, deployment, health, environment, dan CLI.", "production testing streaming seo deployment health environment cli", "#performance"],
  [ShieldCheckIcon, "Troubleshooting", "Checklist route, island, generated files, CSRF, readiness, dan assets.", "troubleshooting error route island generated csrf readiness asset support", "#troubleshooting"],
  [BranchingPathsUpIcon, "Versioning & Roadmap", "Status MVP, kebijakan upgrade, roadmap, dan contribution workflow.", "version release upgrade migration changelog roadmap contributing mvp", "#versioning"],
] as const;

export default defineIsland<Record<string, never>>({
  name: "docs-search",
  setup: () => { const query = signal(""); return () => { const shown = cards.filter((card) => `${card[1]} ${card[2]} ${card[3]}`.toLowerCase().includes(query.value.toLowerCase())); return <><label class="docs-search"><span aria-hidden="true"><MagnifierIcon size={20} /></span><input type="search" value={query.value} placeholder="Search documentation..." aria-label="Search documentation" onInput={(event: Event) => { query.value = (event.currentTarget as HTMLInputElement).value; }} /><kbd>⌘K</kbd></label><div class="docs-card-grid">{shown.map(([Icon, title, text, , href]) => <article class="docs-card"><span class="feature-icon" aria-hidden="true"><b><Icon size={22} /></b></span><h3>{title}</h3><p>{text}</p><a href={href}>Lihat <span aria-hidden="true"><ArrowRightIcon size={14} /></span></a></article>)}</div>{shown.length === 0 ? <p class="docs-empty">Tidak ada dokumentasi yang cocok dengan pencarian.</p> : null}</>; }; },
});
