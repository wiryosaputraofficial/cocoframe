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
  [BranchingPathsUpIcon, "Getting Started", "GitHub clone, project creator, installation, project structure, configuration, and quick start.", "getting started github clone repository create creator scaffolder installation quick start structure configuration", "/docs/getting-started"],
  [ChecklistIcon, "CocoSpecs", "Adaptive AI discovery that generates a PRD, flowchart, data model, acceptance criteria, and implementation plan.", "cocospecs ai prd requirements interview flowchart data model acceptance specification", "/docs/cocospecs"],
  [BranchingPathsUpIcon, "CocoUX", "Reachable journeys, complete states, accessible interactions, visual recommendations, and real PNG previews before CocoRef.", "cocoux ux journey state interaction visual recommendation png screenshot preview cocoref", "/docs/cocoux"],
  [PaletteIcon, "CocoRef", "Reference-driven component audits with consent, actual TSX previews, feedback, and approval.", "cocoref ai image website reference component inventory consent preview feedback approval", "/docs/cocoref"],
  [ChecklistIcon, "CocoQA", "Adaptive quality decisions, traceable cases, automated gates, defects, evidence, and release approval.", "cocoqa ai qa quality testing evidence traceability defect gate release approval", "/docs/cocoqa"],
  [DocumentTextIcon, "Pages & Routing", "Pages, layouts, data loading, caching, and error boundaries.", "pages routing data fetching layouts cache errors", "/docs/pages"],
  [PaletteIcon, "Frontend", "Server components, CSS Modules, UI primitives, islands, and signals.", "components ui css reusable islands signals frontend", "/docs/components"],
  [BranchingPathsUpIcon, "Charts", "Twelve responsive, accessible, multi-dataset server-first SVG charts.", "chart line area bar pie doughnut radar scatter bubble mixed analytics", "/docs/components#charts"],
  [ChecklistIcon, "Forms & Validation", "Progressive forms, CSRF, schema validation, and field errors.", "forms csrf validation schema field errors", "/docs/forms"],
  [CodeSquareIcon, "API & Mobile Client", "Typed API routes, generated Fetch client, and OpenAPI.", "api reference routes client mobile fetch openapi", "/docs/apis"],
  [DocumentTextIcon, "Package API Reference", "Every public CocoFrame package, responsibility, and primary export.", "package api reference exports core jsx router client ui schema server cli", "/docs/api-reference"],
  [CloudCheckIcon, "Observability", "Validated request IDs, timing, structured logs, and custom writers.", "observability request id logger timing telemetry structured logs", "/docs/security#logs"],
  [ShieldCheckIcon, "Security & Auth", "Middleware, browser hardening, CORS, sessions, and rate limiting.", "security middleware authentication cors csrf session rate limit", "/docs/security"],
  [DatabaseIcon, "Database", "SQLite, PostgreSQL, transactions, queries, and migrations.", "database sqlite postgres transaction migration query", "/docs/database"],
  [ChecklistIcon, "End-to-end Recipes", "Connect schemas, forms, databases, APIs, and mobile clients.", "recipe crud schema form database api mobile tutorial end to end", "/docs/getting-started#verify"],
  [DatabaseIcon, "CocoQL", "AI-first query language with safety policies, mutation previews, guarded writes, MySQL, and PostgreSQL.", "cocoql ai permissions safety mutation preview guard query plan structured errors schema semantic dates utc aggregation mysql postgresql numbered parameters", "/docs/cocoql"],
  [ShieldCheckIcon, "CocoFrame Doctor", "Read-only project, dependency, generated-artifact, security, and isolated-build diagnostics for developers, CI, and AI.", "doctor diagnostics troubleshoot project dependency generated security build json strict deep ai ci", "/docs/doctor"],
  [CloudCheckIcon, "Production", "Testing, streaming, SEO, deployment, health, environment, and CLI.", "production testing streaming seo deployment health environment cli", "/docs/deployment"],
  [ShieldCheckIcon, "Troubleshooting", "Checklist for routes, islands, generated files, CSRF, readiness, and assets.", "troubleshooting error route island generated csrf readiness asset support", "/docs#troubleshooting"],
  [BranchingPathsUpIcon, "Versioning & Roadmap", "MVP status, upgrade policy, roadmap, and contribution workflow.", "version release upgrade migration changelog roadmap contributing mvp", "/docs#versioning"],
] as const;

export default defineIsland<Record<string, never>>({
  name: "docs-search",
  setup: () => { const query = signal(""); return () => { const shown = cards.filter((card) => `${card[1]} ${card[2]} ${card[3]}`.toLowerCase().includes(query.value.toLowerCase())); return <><label class="docs-search"><span aria-hidden="true"><MagnifierIcon size={20} /></span><input type="search" value={query.value} placeholder="Search documentation..." aria-label="Search documentation" onInput={(event: Event) => { query.value = (event.currentTarget as HTMLInputElement).value; }} /><kbd>⌘K</kbd></label><div class="docs-card-grid">{shown.map(([Icon, title, text, , href]) => <article class="docs-card"><span class="feature-icon" aria-hidden="true"><b><Icon size={22} /></b></span><h3>{title}</h3><p>{text}</p><a href={href}>View <span aria-hidden="true"><ArrowRightIcon size={14} /></span></a></article>)}</div>{shown.length === 0 ? <p class="docs-empty">No documentation matches your search.</p> : null}</>; }; },
});
