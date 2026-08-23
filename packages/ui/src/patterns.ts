import { jsx, type CocoNode } from "@cocoframe/jsx";

interface ClassProps {
  readonly class?: string;
  readonly children?: CocoNode;
}

type ControlSize = "small" | "medium" | "large" | "xlarge";

export interface ThemeProps extends ClassProps {
  readonly theme?: "light" | "dark" | "system";
  readonly as?: "div" | "section" | "main";
}

/**
 * Renders the Theme server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Theme({ theme = "system", as = "div", class: className, children }: ThemeProps): CocoNode {
  return jsx(as, { "data-coco-theme": theme, class: classes("coco-theme", className), children });
}

export interface SkipLinkProps extends ClassProps {
  readonly href?: string;
  readonly label?: string;
}

/**
 * Renders the Skip Link server-first UI primitive with semantic markup and no required browser runtime.
 */
export function SkipLink({ href = "#main", label = "Skip to main content", class: className }: SkipLinkProps): CocoNode {
  return jsx("a", { href, class: classes("coco-skip-link", className), children: label });
}

export interface LiveRegionProps extends ClassProps {
  readonly politeness?: "polite" | "assertive" | "off";
  readonly atomic?: boolean;
  readonly busy?: boolean;
}

/**
 * Renders the Live Region server-first UI primitive with semantic markup and no required browser runtime.
 */
export function LiveRegion({ politeness = "polite", atomic = true, busy = false, class: className, children }: LiveRegionProps): CocoNode {
  return jsx("div", {
    role: politeness === "assertive" ? "alert" : politeness === "polite" ? "status" : undefined,
    "aria-live": politeness,
    "aria-atomic": atomic ? "true" : "false",
    "aria-busy": busy ? "true" : "false",
    class: classes("coco-live-region", className),
    children,
  });
}

export type SafeAreaEdge = "top" | "right" | "bottom" | "left";

export interface SafeAreaProps extends ClassProps {
  readonly edges?: readonly SafeAreaEdge[];
  readonly as?: "div" | "section" | "main" | "footer";
}

/**
 * Renders the Safe Area server-first UI primitive with semantic markup and no required browser runtime.
 */
export function SafeArea({ edges = ["top", "right", "bottom", "left"], as = "div", class: className, children }: SafeAreaProps): CocoNode {
  return jsx(as, { class: classes("coco-safe-area", ...edges.map((edge) => "coco-safe-area--" + edge), className), children });
}

export interface BottomNavigationItem {
  readonly label: string;
  readonly href: string;
  readonly icon?: CocoNode;
  readonly badge?: CocoNode;
  readonly current?: boolean;
}

export interface BottomNavigationProps extends ClassProps {
  readonly items: readonly BottomNavigationItem[];
  readonly label?: string;
  readonly fixed?: boolean;
}

/**
 * Renders the Bottom Navigation server-first UI primitive with semantic markup and no required browser runtime.
 */
export function BottomNavigation({ items, label = "Primary mobile navigation", fixed = false, class: className }: BottomNavigationProps): CocoNode {
  return jsx("nav", { "aria-label": label, class: classes("coco-bottom-navigation", fixed ? "coco-bottom-navigation--fixed" : undefined, className), children: jsx("ul", { children: items.map((item) => jsx("li", { children: jsx("a", { href: item.href, "aria-current": item.current ? "page" : undefined, children: [item.icon ? jsx("span", { class: "coco-bottom-navigation__icon", "aria-hidden": "true", children: item.icon }) : null, jsx("span", { children: item.label }), item.badge ? jsx("span", { class: "coco-bottom-navigation__badge", children: item.badge }) : null] }) })) }) });
}

export interface AppShellProps extends ClassProps {
  readonly header?: CocoNode;
  readonly sidebar?: CocoNode;
  readonly footer?: CocoNode;
  readonly mobileNavigation?: CocoNode;
  readonly mainId?: string;
  readonly contentAs?: "main" | "div";
}

/**
 * Renders the App Shell server-first UI primitive with semantic markup and no required browser runtime.
 */
export function AppShell({ header, sidebar, footer, mobileNavigation, mainId = "main", contentAs = "main", class: className, children }: AppShellProps): CocoNode {
  return jsx("div", { class: classes("coco-app-shell", sidebar ? "coco-app-shell--sidebar" : undefined, className), children: [
    header ? jsx("header", { class: "coco-app-shell__header", children: header }) : null,
    sidebar ? jsx("aside", { class: "coco-app-shell__sidebar", children: sidebar }) : null,
    jsx(contentAs, { id: mainId, class: "coco-app-shell__main", children }),
    footer ? jsx("footer", { class: "coco-app-shell__footer", children: footer }) : null,
    mobileNavigation ? jsx("div", { class: "coco-app-shell__mobile-navigation", children: mobileNavigation }) : null,
  ] });
}

export interface PageHeaderProps extends ClassProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly breadcrumbs?: CocoNode;
  readonly actions?: CocoNode;
  readonly size?: "compact" | "default" | "spacious";
}

/**
 * Renders the Page Header server-first UI primitive with semantic markup and no required browser runtime.
 */
export function PageHeader({ title, eyebrow, description, breadcrumbs, actions, size = "default", class: className, children }: PageHeaderProps): CocoNode {
  return jsx("header", { class: classes("coco-page-header", "coco-page-header--" + size, className), children: [breadcrumbs, jsx("div", { class: "coco-page-header__row", children: [jsx("div", { class: "coco-page-header__copy", children: [eyebrow ? jsx("span", { class: "coco-page-header__eyebrow", children: eyebrow }) : null, jsx("h1", { children: title }), description ? jsx("p", { children: description }) : null] }), actions ? jsx("div", { class: "coco-page-header__actions", children: actions }) : null] }), children] });
}

export interface ToolbarProps extends ClassProps {
  readonly label?: string;
  readonly start?: CocoNode;
  readonly end?: CocoNode;
  readonly sticky?: boolean;
  readonly wrap?: boolean;
}

/**
 * Renders the Toolbar server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Toolbar({ label = "Page actions", start, end, sticky = false, wrap = true, class: className, children }: ToolbarProps): CocoNode {
  return jsx("div", { role: "toolbar", "aria-label": label, class: classes("coco-toolbar", sticky ? "coco-toolbar--sticky" : undefined, wrap ? "coco-toolbar--wrap" : undefined, className), children: [jsx("div", { class: "coco-toolbar__start", children: start ?? children }), end ? jsx("div", { class: "coco-toolbar__end", children: end }) : null] });
}

export interface FilterBarProps extends ClassProps {
  readonly label?: string;
  readonly action?: string;
  readonly method?: "get" | "post";
  readonly filters: CocoNode;
  readonly actions?: CocoNode;
  readonly results?: CocoNode;
}

/**
 * Renders the Filter Bar server-first UI primitive with semantic markup and no required browser runtime.
 */
export function FilterBar({ label = "Filter results", action, method = "get", filters, actions, results, class: className }: FilterBarProps): CocoNode {
  return jsx("form", { role: "search", "aria-label": label, action, method, class: classes("coco-filter-bar", className), children: [jsx("div", { class: "coco-filter-bar__filters", children: filters }), actions ? jsx("div", { class: "coco-filter-bar__actions", children: actions }) : null, results ? jsx("div", { class: "coco-filter-bar__results", "aria-live": "polite", children: results }) : null] });
}

export interface NumberFieldProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly value?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly size?: ControlSize;
}

/**
 * Renders the Number Field server-first UI primitive with semantic markup and no required browser runtime.
 */
export function NumberField({ id, name, label, value, min, max, step, placeholder, hint, required, disabled, size = "medium", class: className }: NumberFieldProps): CocoNode {
  const hintId = hint ? id + "-hint" : undefined;
  return jsx("div", { class: classes("coco-number-field", className), children: [jsx("label", { for: id, children: [label, required ? jsx("span", { "aria-hidden": "true", children: " *" }) : null] }), jsx("input", { id, name, type: "number", value, min, max, step, placeholder, required, disabled, "aria-describedby": hintId, class: "coco-input coco-input--" + size }), hint ? jsx("p", { id: hintId, children: hint }) : null] });
}

export interface MultiSelectOption {
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
}

export interface MultiSelectProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly options: readonly MultiSelectOption[];
  readonly value?: readonly string[];
  readonly hint?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly size?: number;
}

/**
 * Renders the Multi Select server-first UI primitive with semantic markup and no required browser runtime.
 */
export function MultiSelect({ id, name, label, options, value = [], hint, required, disabled, size = Math.min(Math.max(options.length, 3), 6), class: className }: MultiSelectProps): CocoNode {
  const hintId = hint ? id + "-hint" : undefined;
  return jsx("div", { class: classes("coco-multi-select", className), children: [jsx("label", { for: id, children: [label, required ? jsx("span", { "aria-hidden": "true", children: " *" }) : null] }), jsx("select", { id, name, multiple: true, size, required, disabled, "aria-describedby": hintId, children: options.map((option) => jsx("option", { value: option.value, selected: value.includes(option.value), disabled: option.disabled, children: option.label })) }), hint ? jsx("p", { id: hintId, children: hint }) : null] });
}

export interface DateRangePickerProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly start?: string;
  readonly end?: string;
  readonly min?: string;
  readonly max?: string;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
}

/**
 * Renders the Date Range Picker server-first UI primitive with semantic markup and no required browser runtime.
 */
export function DateRangePicker({ id, name, label, start, end, min, max, startLabel = "Start date", endLabel = "End date", required, disabled, class: className }: DateRangePickerProps): CocoNode {
  return jsx("fieldset", { id, disabled, class: classes("coco-date-range", className), children: [jsx("legend", { children: label }), jsx("div", { children: [jsx("label", { for: id + "-start", children: [jsx("span", { children: startLabel }), jsx("input", { id: id + "-start", name: name + "Start", type: "date", value: start, min, max: end ?? max, required, class: "coco-input" })] }), jsx("span", { "aria-hidden": "true", children: "–" }), jsx("label", { for: id + "-end", children: [jsx("span", { children: endLabel }), jsx("input", { id: id + "-end", name: name + "End", type: "date", value: end, min: start ?? min, max, required, class: "coco-input" })] })] })] });
}

export interface StepperItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly href?: string;
  readonly state?: "complete" | "current" | "upcoming" | "error";
}

export interface StepperProps extends ClassProps {
  readonly items: readonly StepperItem[];
  readonly label?: string;
  readonly orientation?: "horizontal" | "vertical";
}

/**
 * Renders the Stepper server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Stepper({ items, label = "Progress", orientation = "horizontal", class: className }: StepperProps): CocoNode {
  return jsx("nav", { "aria-label": label, class: classes("coco-stepper", "coco-stepper--" + orientation, className), children: jsx("ol", { children: items.map((item, index) => { const state = item.state ?? "upcoming"; const content = [jsx("span", { class: "coco-stepper__marker", "aria-hidden": "true", children: state === "complete" ? "✓" : index + 1 }), jsx("span", { class: "coco-stepper__copy", children: [jsx("strong", { children: item.label }), item.description ? jsx("small", { children: item.description }) : null] })]; return jsx("li", { class: "coco-stepper__item coco-stepper__item--" + state, children: item.href ? jsx("a", { href: item.href, "aria-current": state === "current" ? "step" : undefined, children: content }) : jsx("div", { "aria-current": state === "current" ? "step" : undefined, children: content }) }); }) }) });
}

export interface TreeItem {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
  readonly icon?: CocoNode;
  readonly badge?: CocoNode;
  readonly expanded?: boolean;
  readonly current?: boolean;
  readonly children?: readonly TreeItem[];
}

export interface TreeViewProps extends ClassProps {
  readonly items: readonly TreeItem[];
  readonly label?: string;
}

/**
 * Renders the Tree View server-first UI primitive with semantic markup and no required browser runtime.
 */
export function TreeView({ items, label = "Tree navigation", class: className }: TreeViewProps): CocoNode {
  return jsx("nav", { "aria-label": label, class: classes("coco-tree-view", className), children: renderTreeItems(items, true) });
}

function renderTreeItems(items: readonly TreeItem[], root = false): CocoNode {
  return jsx("ul", { role: root ? "tree" : "group", children: items.map((item) => {
    const content = [item.icon ? jsx("span", { "aria-hidden": "true", children: item.icon }) : null, jsx("span", { children: item.label }), item.badge];
    if (item.children?.length) return jsx("li", { role: "treeitem", "aria-expanded": item.expanded ? "true" : "false", children: jsx("details", { open: item.expanded, children: [jsx("summary", { children: content }), renderTreeItems(item.children)] }) });
    return jsx("li", { role: "treeitem", children: item.href ? jsx("a", { href: item.href, "aria-current": item.current ? "page" : undefined, children: content }) : jsx("span", { children: content }) });
  }) });
}

export interface PromptComposerProps extends ClassProps {
  readonly id: string;
  readonly name?: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly value?: string;
  readonly hint?: string;
  readonly attachments?: CocoNode;
  readonly actions?: CocoNode;
  readonly submit?: CocoNode;
  readonly action?: string;
  readonly method?: "get" | "post";
  readonly rows?: number;
  readonly busy?: boolean;
  readonly disabled?: boolean;
}

/**
 * Renders the Prompt Composer server-first UI primitive with semantic markup and no required browser runtime.
 */
export function PromptComposer({ id, name = "prompt", label = "Message", placeholder = "Ask anything…", value, hint, attachments, actions, submit, action, method = "post", rows = 3, busy = false, disabled, class: className, children }: PromptComposerProps): CocoNode {
  const hintId = hint ? id + "-hint" : undefined;
  return jsx("form", { action, method, class: classes("coco-prompt-composer", className), "aria-busy": busy ? "true" : "false", children: [attachments ? jsx("div", { class: "coco-prompt-composer__attachments", children: attachments }) : null, jsx("label", { for: id, class: "coco-visually-hidden", children: label }), jsx("textarea", { id, name, rows, placeholder, disabled: disabled || busy, "aria-describedby": hintId, class: "coco-prompt-composer__input", children: value }), hint ? jsx("p", { id: hintId, class: "coco-prompt-composer__hint", children: hint }) : null, children, jsx("footer", { children: [actions ? jsx("div", { class: "coco-prompt-composer__actions", children: actions }) : null, submit ?? jsx("button", { type: "submit", disabled: disabled || busy, class: "coco-button coco-button--primary coco-button--medium", children: busy ? "Sending…" : "Send" })] })] });
}

export interface ThinkingIndicatorProps extends ClassProps {
  readonly label?: string;
}

/**
 * Renders the Thinking Indicator server-first UI primitive with semantic markup and no required browser runtime.
 */
export function ThinkingIndicator({ label = "AI is thinking", class: className }: ThinkingIndicatorProps): CocoNode {
  return jsx("div", { role: "status", class: classes("coco-thinking", className), children: [jsx("span", { children: label }), jsx("span", { class: "coco-thinking__dots", "aria-hidden": "true", children: [jsx("i", {}), jsx("i", {}), jsx("i", {})] })] });
}

export interface CitationProps extends ClassProps {
  readonly index: number;
  readonly href: string;
  readonly title: string;
  readonly source?: string;
}

/**
 * Renders the Citation server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Citation({ index, href, title, source, class: className }: CitationProps): CocoNode {
  return jsx("a", { href, class: classes("coco-citation", className), "aria-label": "Source " + index + ": " + title, children: [jsx("sup", { children: index }), jsx("span", { children: title }), source ? jsx("small", { children: source }) : null] });
}

function classes(...values: readonly (string | undefined)[]): string {
  // Stable class composition shared by every server-rendered pattern.
  return values.filter(Boolean).join(" ");
}
