import { defineIsland } from "@cocoframe/client";
import AltArrowDownIcon from "@cocoframe/icons/linear/alt-arrow-down";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";

const groups = [
  ["GET STARTED", [["Introduction", "#introduction"], ["Installation", "#installation"], ["Quick Start", "#quick-start"], ["Project Structure", "#project-structure"], ["Configuration", "#configuration"]]],
  ["FRONTEND", [["Routing & Pages", "#routing"], ["Layouts", "#layouts"], ["Data & Cache", "#data-fetching"], ["Components", "#components"], ["Charts", "#charts"], ["Icons", "#icons"], ["Interactive Islands", "#islands"], ["Forms", "#forms"], ["Validation", "#validation"]]],
  ["BACKEND", [["API Routes", "#api-routes"], ["Typed Client", "#api"], ["Package API Reference", "#api-reference"], ["Middleware", "#middleware"], ["Observability", "#observability"], ["Security", "#security"], ["Authentication", "#authentication"], ["Database", "#database"], ["CRUD Recipe", "#recipes"], ["CocoQL", "#cocoql"]]],
  ["PRODUCTION", [["Streaming & SEO", "#performance"], ["Testing", "#testing"], ["Deployment", "#deployment"], ["Environment", "#environment"], ["CLI Reference", "#cli"], ["Troubleshooting", "#troubleshooting"], ["Versioning", "#versioning"], ["Roadmap", "#roadmap"], ["Contributing", "#contributing"], ["Conventions", "#conventions"]]],
] as const;

const componentGroups = [
  ["GET STARTED", [["Overview", "#overview"], ["Installation", "#installation"], ["Theming", "#theming"], ["Utility Classes", "#utilities"], ["Size System", "#sizes"], ["Component Mapping", "#shadcn-mapping"], ["Accessibility", "#accessibility"]]],
  ["FOUNDATION", [["Colors", "#colors"], ["Typography", "#typography"], ["Spacing", "#spacing"], ["Border Radius", "#radius"], ["Shadows", "#shadows"], ["Z-index", "#z-index"], ["Breakpoints", "#breakpoints"]]],
  ["LAYOUT", [["Aspect Ratio", "#aspect-ratio"], ["Container", "#container"], ["Direction", "#direction"], ["Grid", "#grid"], ["Inline", "#inline"], ["Resizable", "#resizable"], ["Scroll Area", "#scroll-area"], ["Stack", "#stack"], ["Divider", "#divider"]]],
  ["TYPOGRAPHY", [["Heading", "#heading"], ["Text", "#text"], ["Code", "#code"], ["Kbd", "#kbd"], ["Syntax Highlighter", "#syntax-highlighter"]]],
  ["FORMS & ACTIONS", [["Button", "#button"], ["Button Group", "#button-group"], ["Icon Button", "#icon-button"], ["Input", "#input"], ["Icon Input", "#icon-input"], ["Input Group", "#input-group"], ["Input OTP", "#input-otp"], ["Search Field", "#search-field"], ["Textarea", "#textarea"], ["Select", "#select"], ["Combobox", "#combobox"], ["Calendar", "#calendar"], ["Date Picker", "#date-picker"], ["Checkbox", "#checkbox"], ["Radio Group", "#radio-group"], ["Questionnaire", "#questionnaire"], ["Slider", "#slider"], ["Switch", "#switch"], ["Toggle", "#toggle"], ["Toggle Group", "#toggle-group"], ["File Upload", "#file-upload"], ["Form Field", "#form-field"], ["Label", "#label"]]],
  ["FEEDBACK", [["Alert", "#alert"], ["Badge", "#badge"], ["Progress", "#progress"], ["Spinner", "#spinner"], ["Skeleton", "#skeleton"], ["Empty State", "#empty-state"], ["Toast", "#toast"], ["Toaster", "#toaster"]]],
  ["DATA DISPLAY", [["Attachment", "#attachment"], ["Avatar", "#avatar"], ["Card", "#card"], ["Carousel", "#carousel"], ["Chart", "#chart"], ["Data Table", "#data-table"], ["Item", "#item"], ["Marker", "#marker"], ["Stat", "#stat"], ["Table", "#table"]]],
  ["AI & CHAT", [["Bubble", "#bubble"], ["Message", "#message"], ["Message Scroller", "#message-scroller"]]],
  ["ICONOGRAPHY", [["Solar Linear Icons", "#solar-icons"]]],
  ["NAVIGATION", [["Site Header", "#site-header"], ["Sidebar", "#sidebar"], ["Navigation Menu", "#navigation-menu"], ["Mega Menu", "#mega-menu"], ["Menubar", "#menubar"], ["Command", "#command"], ["Context Menu", "#context-menu"], ["Breadcrumb", "#breadcrumb"], ["Pagination", "#pagination"], ["Tabs", "#tabs"], ["Dropdown Menu", "#dropdown-menu"], ["Tooltip", "#tooltip"]]],
  ["OVERLAY", [["Alert Dialog", "#alert-dialog"], ["Dialog / Modal", "#dialog"], ["Bottom Sheet", "#bottom-sheet"], ["Off-canvas", "#offcanvas"], ["Hover Card", "#hover-card"], ["Popover", "#popover"]]],
  ["DISCLOSURE & A11Y", [["Accordion", "#accordion"], ["Collapsible", "#collapsible"], ["Details", "#details"], ["Visually Hidden", "#visually-hidden"]]],
] as const;

export default defineIsland<{ kind: "documentation" | "components" }>({
  name: "docs-sidebar",
  setup: ({ kind }) => () => {
    const navigationGroups = kind === "documentation" ? groups : componentGroups;
    return <><button class="docs-sidebar-toggle" type="button" aria-expanded="false" onClick={(event: Event) => { const button = event.currentTarget as HTMLElement; const sidebar = button.nextElementSibling; const open = sidebar?.classList.toggle("open") ?? false; button.setAttribute("aria-expanded", String(open)); }}>{kind === "documentation" ? "Browse documentation" : "Browse components"} <span aria-hidden="true"><AltArrowDownIcon size={18} /></span></button><aside class="docs-sidebar" aria-label={`Navigasi ${kind}`}><nav>{navigationGroups.map(([title, links]) => <div class="sidebar-group"><h2>{title}</h2>{links.map(([label, href], index) => <a class={index === 0 && title === "GET STARTED" ? "active" : undefined} href={href} onClick={(event: Event) => { if (window.innerWidth <= 800) (event.currentTarget as HTMLElement).closest(".docs-sidebar")?.classList.remove("open"); }}>{label}</a>)}</div>)}</nav><div class="sidebar-help"><img src="/assets/cocoframe-icon.png" alt="" /><h3>Need help?</h3><p>Kirim pertanyaan atau laporan masalah yang sudah disanitasi.</p><a href="/contact">Contact support <span aria-hidden="true"><ArrowRightIcon size={14} /></span></a></div></aside></>;
  },
});
