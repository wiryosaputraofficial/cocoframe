import { defineIsland } from "@cocoframe/client";
import AltArrowDownIcon from "@cocoframe/icons/linear/alt-arrow-down";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import { componentNavigationGroups } from "../components/component-navigation.ts";

const groups = [
  ["GET STARTED", [["Introduction", "#introduction"], ["Installation", "#installation"], ["Project Creator", "#project-creator"], ["Quick Start", "#quick-start"], ["Project Structure", "#project-structure"], ["Configuration", "#configuration"]]],
  ["FRONTEND", [["Routing & Pages", "#routing"], ["Layouts", "#layouts"], ["Data & Cache", "#data-fetching"], ["Components", "#components"], ["Charts", "#charts"], ["Icons", "#icons"], ["Interactive Islands", "#islands"], ["Forms", "#forms"], ["Validation", "#validation"]]],
  ["BACKEND", [["API Routes", "#api-routes"], ["Typed Client", "#api"], ["Package API Reference", "#api-reference"], ["Middleware", "#middleware"], ["Observability", "#observability"], ["Security", "#security"], ["Authentication", "#authentication"], ["Database", "#database"], ["CRUD Recipe", "#recipes"], ["CocoQL", "#cocoql"]]],
  ["PRODUCTION", [["Streaming & SEO", "#performance"], ["Testing", "#testing"], ["Deployment", "#deployment"], ["Environment", "#environment"], ["CLI Reference", "#cli"], ["Troubleshooting", "#troubleshooting"], ["Versioning", "#versioning"], ["Roadmap", "#roadmap"], ["Contributing", "#contributing"], ["Conventions", "#conventions"]]],
] as const;

export default defineIsland<{ kind: "documentation" | "components" }>({
  name: "docs-sidebar",
  setup: ({ kind }) => () => {
    const navigationGroups = kind === "documentation" ? groups : componentNavigationGroups;
    return <><button class="docs-sidebar-toggle" type="button" aria-expanded="false" onClick={(event: Event) => { const button = event.currentTarget as HTMLElement; const sidebar = button.nextElementSibling; const open = sidebar?.classList.toggle("open") ?? false; button.setAttribute("aria-expanded", String(open)); }}>{kind === "documentation" ? "Browse documentation" : "Browse components"} <span aria-hidden="true"><AltArrowDownIcon size={18} /></span></button><aside class="docs-sidebar" aria-label={`Navigasi ${kind}`}><nav>{navigationGroups.map(([title, links]) => <div class="sidebar-group"><h2>{title}</h2>{links.map(([label, href], index) => <a class={index === 0 && title === "GET STARTED" ? "active" : undefined} href={href} onClick={(event: Event) => { if (window.innerWidth <= 800) (event.currentTarget as HTMLElement).closest(".docs-sidebar")?.classList.remove("open"); }}>{label}</a>)}</div>)}</nav><div class="sidebar-help"><img src="/assets/cocoframe-icon.png" alt="" /><h3>Need help?</h3><p>Kirim pertanyaan atau laporan masalah yang sudah disanitasi.</p><a href="/contact">Contact support <span aria-hidden="true"><ArrowRightIcon size={14} /></span></a></div></aside></>;
  },
});
