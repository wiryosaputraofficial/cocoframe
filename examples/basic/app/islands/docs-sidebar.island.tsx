import { defineIsland } from "@cocoframe/client";
import AltArrowDownIcon from "@cocoframe/icons/linear/alt-arrow-down";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import { componentNavigationGroups } from "../components/component-navigation.ts";

const groups = [
  ["GET STARTED", [["Documentation home", "/docs"], ["Getting Started", "/docs/getting-started"], ["Agent Bridge", "/docs/agent-bridge"], ["CocoSpecs", "/docs/cocospecs"], ["CocoRef", "/docs/cocoref"], ["CocoQA", "/docs/cocoqa"]]],
  ["FRONTEND", [["Pages & Routing", "/docs/pages"], ["Interactive Islands", "/docs/islands"], ["Forms & Validation", "/docs/forms"], ["Components & Icons", "/docs/components"]]],
  ["BACKEND", [["APIs & Typed Client", "/docs/apis"], ["Database", "/docs/database"], ["Security & Auth", "/docs/security"], ["CocoQL", "/docs/cocoql"], ["Generated API Reference", "/docs/api-reference"]]],
  ["PRODUCTION", [["Testing", "/docs/testing"], ["Deployment", "/docs/deployment"], ["Complete Guide", "/docs#guides"], ["Troubleshooting", "/docs#troubleshooting"], ["Versioning & Roadmap", "/docs#versioning"]]],
] as const;

export default defineIsland<{ kind: "documentation" | "components"; activePath?: string }>({
  name: "docs-sidebar",
  setup: ({ kind, activePath }) => () => {
    const navigationGroups = kind === "documentation" ? groups : componentNavigationGroups;
    return <><button class="docs-sidebar-toggle" type="button" aria-expanded="false" onClick={(event: Event) => { const button = event.currentTarget as HTMLElement; const sidebar = button.nextElementSibling; const open = sidebar?.classList.toggle("open") ?? false; button.setAttribute("aria-expanded", String(open)); }}>{kind === "documentation" ? "Browse documentation" : "Browse components"} <span aria-hidden="true"><AltArrowDownIcon size={18} /></span></button><aside class="docs-sidebar" aria-label={`${kind} navigation`}><nav>{navigationGroups.map(([title, links]) => <div class="sidebar-group"><h2>{title}</h2>{links.map(([label, href], index) => <a class={activePath ? href === activePath ? "active" : undefined : index === 0 && title === "GET STARTED" ? "active" : undefined} aria-current={activePath === href ? "page" : undefined} href={href} onClick={(event: Event) => { if (window.innerWidth <= 800) (event.currentTarget as HTMLElement).closest(".docs-sidebar")?.classList.remove("open"); }}>{label}</a>)}</div>)}</nav><div class="sidebar-help"><img src="/assets/cocoframe-icon.png" alt="" /><h3>Need help?</h3><p>Send a question or sanitized issue report.</p><a href="/contact">Contact support <span aria-hidden="true"><ArrowRightIcon size={14} /></span></a></div></aside></>;
  },
});
