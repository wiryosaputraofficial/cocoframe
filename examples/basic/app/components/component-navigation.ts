export type ComponentNavigationLink = readonly [label: string, href: `#${string}`];
export type ComponentNavigationGroup = readonly [title: string, links: readonly ComponentNavigationLink[]];

export const componentNavigationGroups = [
  ["GET STARTED", [["Overview", "#overview"], ["Installation", "#installation"], ["Theming", "#theming"], ["Utility Classes", "#utilities"], ["Size System", "#sizes"], ["Component Mapping", "#shadcn-mapping"], ["Accessibility", "#accessibility"]]],
  ["FOUNDATION", [["Theme", "#theme"], ["Colors", "#colors"], ["Typography", "#typography"], ["Spacing", "#spacing"], ["Border Radius", "#radius"], ["Shadows", "#shadows"], ["Z-index", "#z-index"], ["Breakpoints", "#breakpoints"]]],
  ["LAYOUT", [["App Shell", "#app-shell"], ["Page Header", "#page-header"], ["Toolbar", "#toolbar"], ["Safe Area", "#safe-area"], ["Aspect Ratio", "#aspect-ratio"], ["Container", "#container"], ["Direction", "#direction"], ["Grid", "#grid"], ["Inline", "#inline"], ["Resizable", "#resizable"], ["Scroll Area", "#scroll-area"], ["Stack", "#stack"], ["Divider", "#divider"]]],
  ["TYPOGRAPHY", [["Heading", "#heading"], ["Text", "#text"], ["Code", "#code"], ["Kbd", "#kbd"], ["Syntax Highlighter", "#syntax-highlighter"]]],
  ["FORMS & ACTIONS", [["Button", "#button"], ["Button Group", "#button-group"], ["Icon Button", "#icon-button"], ["Input", "#input"], ["Number Field", "#number-field"], ["Icon Input", "#icon-input"], ["Input Group", "#input-group"], ["Input OTP", "#input-otp"], ["Search Field", "#search-field"], ["Textarea", "#textarea"], ["Select", "#select"], ["Multi Select", "#multi-select"], ["Combobox", "#combobox"], ["Filter Bar", "#filter-bar"], ["Calendar", "#calendar"], ["Date Picker", "#date-picker"], ["Date Range Picker", "#date-range-picker"], ["Checkbox", "#checkbox"], ["Radio Group", "#radio-group"], ["Questionnaire", "#questionnaire"], ["Slider", "#slider"], ["Switch", "#switch"], ["Toggle", "#toggle"], ["Toggle Group", "#toggle-group"], ["File Upload", "#file-upload"], ["Form Field", "#form-field"], ["Label", "#label"]]],
  ["FEEDBACK", [["Alert", "#alert"], ["Badge", "#badge"], ["Progress", "#progress"], ["Spinner", "#spinner"], ["Skeleton", "#skeleton"], ["Empty State", "#empty-state"], ["Toast", "#toast"], ["Toaster", "#toaster"]]],
  ["DATA DISPLAY", [["Attachment", "#attachment"], ["Avatar", "#avatar"], ["Card", "#card"], ["Carousel", "#carousel"], ["Chart", "#chart"], ["Data Table", "#data-table"], ["Item", "#item"], ["Marker", "#marker"], ["Stat", "#stat"], ["Table", "#table"]]],
  ["AI & CHAT", [["Prompt Composer", "#prompt-composer"], ["Thinking Indicator", "#thinking-indicator"], ["Citation", "#citation"], ["Bubble", "#bubble"], ["Message", "#message"], ["Message Scroller", "#message-scroller"]]],
  ["ICONOGRAPHY", [["Solar Linear Icons", "#solar-icons"]]],
  ["NAVIGATION", [["Bottom Navigation", "#bottom-navigation"], ["Stepper", "#stepper"], ["Tree View", "#tree-view"], ["Site Header", "#site-header"], ["Sidebar", "#sidebar"], ["Navigation Menu", "#navigation-menu"], ["Mega Menu", "#mega-menu"], ["Menubar", "#menubar"], ["Command", "#command"], ["Context Menu", "#context-menu"], ["Breadcrumb", "#breadcrumb"], ["Pagination", "#pagination"], ["Tabs", "#tabs"], ["Dropdown Menu", "#dropdown-menu"], ["Tooltip", "#tooltip"]]],
  ["OVERLAY", [["Alert Dialog", "#alert-dialog"], ["Dialog / Modal", "#dialog"], ["Bottom Sheet", "#bottom-sheet"], ["Off-canvas", "#offcanvas"], ["Hover Card", "#hover-card"], ["Popover", "#popover"]]],
  ["DISCLOSURE & A11Y", [["Skip Link", "#skip-link"], ["Live Region", "#live-region"], ["Accordion", "#accordion"], ["Collapsible", "#collapsible"], ["Details", "#details"], ["Visually Hidden", "#visually-hidden"]]],
] as const satisfies readonly ComponentNavigationGroup[];

const catalogChildren: Readonly<Record<string, readonly string[]>> = {
  chart: ["chart-bars", "chart-radial", "chart-radar", "chart-points", "chart-mixed"],
};

export const componentCatalogOrder = componentNavigationGroups.flatMap(([, links]) =>
  links.flatMap(([, href]) => {
    const id = href.slice(1);
    return [id, ...(catalogChildren[id] ?? [])];
  }),
);

const componentCatalogRank = new Map(componentCatalogOrder.map((id, index) => [id, index]));

export function sortComponentCatalogEntries<T extends { readonly id: string; readonly name: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const leftRank = componentCatalogRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = componentCatalogRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || left.name.localeCompare(right.name);
  });
}
