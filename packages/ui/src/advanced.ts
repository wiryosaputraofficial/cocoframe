import { jsx, type CocoNode } from "@cocoframe/jsx";
import AltArrowDownIcon from "@cocoframe/icons/linear/alt-arrow-down";
import PaperclipIcon from "@cocoframe/icons/linear/paperclip";
import SortVerticalIcon from "@cocoframe/icons/linear/sort-vertical";

interface ClassProps { readonly class?: string; readonly children?: CocoNode; }
type Size = "small" | "medium" | "large" | "xlarge";

export interface AccordionItem { readonly id: string; readonly title: string; readonly content: CocoNode; readonly disabled?: boolean; }
export interface AccordionProps extends ClassProps { readonly id: string; readonly items: readonly AccordionItem[]; readonly multiple?: boolean; readonly openIds?: readonly string[]; }
export function Accordion({ id, items, multiple = false, openIds = [], class: className }: AccordionProps): CocoNode {
  return jsx("div", { class: classes("coco-accordion", className), children: items.map((item) => jsx("details", { name: multiple ? undefined : id, open: openIds.includes(item.id), class: item.disabled ? "coco-accordion__item coco-accordion__item--disabled" : "coco-accordion__item", children: [jsx("summary", { "aria-disabled": item.disabled ? "true" : undefined, children: [jsx("span", { children: item.title }), jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 18 }) })] }), jsx("div", { class: "coco-accordion__content", children: item.content })] })) });
}

export interface AlertDialogProps extends ClassProps { readonly id: string; readonly title: string; readonly description: string; readonly open?: boolean; readonly cancel?: CocoNode; readonly action?: CocoNode; }
export function AlertDialog({ id, title, description, open, cancel, action, class: className, children }: AlertDialogProps): CocoNode {
  return jsx("dialog", { id, role: "alertdialog", open, class: classes("coco-alert-dialog", className), "aria-labelledby": `${id}-title`, "aria-describedby": `${id}-description`, children: jsx("div", { class: "coco-alert-dialog__surface", children: [jsx("header", { children: [jsx("h2", { id: `${id}-title`, children: title }), jsx("p", { id: `${id}-description`, children: description })] }), children ? jsx("div", { class: "coco-alert-dialog__body", children }) : null, jsx("footer", { children: [cancel, action] })] }) });
}

export interface AspectRatioProps extends ClassProps { readonly ratio?: "square" | "video" | "portrait" | "wide"; }
export function AspectRatio({ ratio = "video", class: className, children }: AspectRatioProps): CocoNode { return jsx("div", { class: classes("coco-aspect-ratio", `coco-aspect-ratio--${ratio}`, className), children }); }

export interface AttachmentItem { readonly name: string; readonly meta?: string; readonly href?: string; readonly status?: "ready" | "uploading" | "error"; readonly action?: CocoNode; }
export interface AttachmentProps extends ClassProps { readonly items: readonly AttachmentItem[]; readonly label?: string; }
export function Attachment({ items, label = "Attachments", class: className }: AttachmentProps): CocoNode {
  return jsx("ul", { class: classes("coco-attachment", className), "aria-label": label, children: items.map((item) => jsx("li", { class: `coco-attachment__item coco-attachment__item--${item.status ?? "ready"}`, children: [jsx("span", { class: "coco-attachment__icon", "aria-hidden": "true", children: PaperclipIcon({ size: 20 }) }), jsx("span", { children: [item.href ? jsx("a", { href: item.href, children: item.name }) : jsx("strong", { children: item.name }), item.meta ? jsx("small", { children: item.meta }) : null] }), item.action] })) });
}

export interface BubbleProps extends ClassProps { readonly side?: "incoming" | "outgoing"; readonly sender?: string; readonly timestamp?: string; }
export function Bubble({ side = "incoming", sender, timestamp, class: className, children }: BubbleProps): CocoNode { return jsx("article", { class: classes("coco-bubble", `coco-bubble--${side}`, className), children: [sender ? jsx("strong", { children: sender }) : null, jsx("div", { children }), timestamp ? jsx("time", { children: timestamp }) : null] }); }

export interface ButtonGroupProps extends ClassProps { readonly orientation?: "horizontal" | "vertical"; readonly label?: string; }
export function ButtonGroup({ orientation = "horizontal", label = "Actions", class: className, children }: ButtonGroupProps): CocoNode { return jsx("div", { role: "group", "aria-label": label, class: classes("coco-button-group", `coco-button-group--${orientation}`, className), children }); }

export interface CalendarProps extends ClassProps { readonly id: string; readonly year: number; readonly month: number; readonly selected?: string; readonly weekdayLabels?: readonly string[]; }
export function Calendar({ id, year, month, selected, weekdayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"], class: className }: CalendarProps): CocoNode {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: CocoNode[] = Array.from({ length: offset }, () => jsx("span", { class: "coco-calendar__blank", "aria-hidden": "true" }));
  for (let day = 1; day <= count; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(jsx("button", { type: "submit", name: id, value: iso, class: selected === iso ? "coco-calendar__day coco-calendar__day--selected" : "coco-calendar__day", "aria-pressed": selected === iso ? "true" : "false", children: day }));
  }
  return jsx("section", { class: classes("coco-calendar", className), "aria-label": `${year}-${String(month).padStart(2, "0")}`, children: [jsx("header", { children: jsx("strong", { children: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(first) }) }), jsx("div", { class: "coco-calendar__weekdays", children: weekdayLabels.map((label) => jsx("span", { children: label })) }), jsx("div", { class: "coco-calendar__grid", children: cells })] });
}

export interface CarouselItem { readonly id: string; readonly content: CocoNode; readonly label?: string; }
export interface CarouselProps extends ClassProps { readonly id: string; readonly items: readonly CarouselItem[]; readonly label?: string; }
export function Carousel({ id, items, label = "Carousel", class: className }: CarouselProps): CocoNode { return jsx("section", { class: classes("coco-carousel", className), "aria-roledescription": "carousel", "aria-label": label, children: [jsx("div", { class: "coco-carousel__track", children: items.map((item, index) => jsx("article", { id: `${id}-${item.id}`, class: "coco-carousel__slide", "aria-label": item.label ?? `${index + 1} dari ${items.length}`, children: item.content })) }), jsx("nav", { "aria-label": "Carousel slides", children: items.map((item, index) => jsx("a", { href: `#${id}-${item.id}`, "aria-label": `Ke slide ${index + 1}`, children: index + 1 })) })] }); }

export interface CollapsibleProps extends ClassProps { readonly summary: string; readonly open?: boolean; }
export function Collapsible({ summary, open, class: className, children }: CollapsibleProps): CocoNode { return jsx("details", { class: classes("coco-collapsible", className), open, children: [jsx("summary", { children: [jsx("span", { children: summary }), jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 18 }) })] }), jsx("div", { children })] }); }

export interface ComboboxOption { readonly label: string; readonly value: string; readonly disabled?: boolean; }
export interface ComboboxProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly options: readonly ComboboxOption[];
  readonly value?: string;
  readonly placeholder?: string;
  readonly interactive?: boolean;
  readonly emptyText?: string;
  readonly onInput?: (event: Event) => void;
  readonly onChange?: (value: string) => void;
}
export function Combobox({ id, name, label, options, value, placeholder, interactive = false, emptyText = "No options found.", onInput, onChange, class: className }: ComboboxProps): CocoNode {
  const listId = `${id}-options`;
  if (!interactive) {
    return jsx("div", { class: classes("coco-combobox", className), children: [
      jsx("label", { for: id, children: label }),
      jsx("input", { id, name, value, placeholder, list: listId, role: "combobox", autocomplete: "off", onInput }),
      jsx("datalist", { id: listId, children: options.map((option) => jsx("option", { value: option.value, disabled: option.disabled, children: option.label })) }),
    ] });
  }
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  return jsx("div", { class: classes("coco-combobox", "coco-combobox--interactive", className), children: [
    jsx("label", { for: id, children: label }),
    jsx("div", { class: "coco-combobox__control", children: [
      jsx("input", {
        id,
        value: selectedLabel,
        placeholder,
        role: "combobox",
        autocomplete: "off",
        "aria-autocomplete": "list",
        "aria-controls": listId,
        "aria-expanded": "false",
        onFocus: (event: Event) => openCombobox(event.currentTarget as HTMLInputElement),
        onClick: (event: Event) => openCombobox(event.currentTarget as HTMLInputElement),
        onInput: (event: Event) => { filterCombobox(event.currentTarget as HTMLInputElement); onInput?.(event); },
        onBlur: (event: Event) => closeComboboxAfterBlur(event.currentTarget as HTMLInputElement),
        onKeyDown: (event: Event) => handleComboboxInputKey(event as KeyboardEvent),
      }),
      jsx("span", { class: "coco-combobox__indicator", "aria-hidden": "true", children: AltArrowDownIcon({ size: 17 }) }),
    ] }),
    jsx("input", { type: "hidden", name, value: value ?? "", "data-combobox-submission": "" }),
    jsx("div", { id: listId, class: "coco-combobox__list", role: "listbox", "aria-label": label, children: [
      ...options.map((option, index) => jsx("button", {
        id: `${listId}-${index}`,
        type: "button",
        role: "option",
        class: "coco-combobox__option",
        disabled: option.disabled,
        "aria-selected": value === option.value ? "true" : "false",
        "data-combobox-value": option.value,
        "data-combobox-search": `${option.label} ${option.value}`.toLowerCase(),
        onClick: (event: Event) => selectComboboxOption(event.currentTarget as HTMLButtonElement, option.value, option.label, onChange),
        onKeyDown: (event: Event) => handleComboboxOptionKey(event as KeyboardEvent),
        children: [jsx("strong", { children: option.label }), option.label.toLowerCase() === option.value.toLowerCase() ? null : jsx("small", { children: option.value })],
      })),
      jsx("p", { class: "coco-combobox__empty", role: "status", hidden: true, children: emptyText }),
    ] }),
  ] });
}

function comboboxRoot(input: HTMLInputElement): HTMLElement | null { return input.closest<HTMLElement>(".coco-combobox--interactive"); }
function openCombobox(input: HTMLInputElement): void { comboboxRoot(input)?.classList.add("coco-combobox--open"); input.setAttribute("aria-expanded", "true"); }
function closeCombobox(input: HTMLInputElement): void { comboboxRoot(input)?.classList.remove("coco-combobox--open"); input.setAttribute("aria-expanded", "false"); }
function closeComboboxAfterBlur(input: HTMLInputElement): void {
  setTimeout(() => {
    const root = comboboxRoot(input);
    if (!root?.contains(input.ownerDocument.activeElement)) closeCombobox(input);
  }, 0);
}
function visibleComboboxOptions(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>(".coco-combobox__option:not([hidden]):not(:disabled)")];
}
function filterCombobox(input: HTMLInputElement): void {
  const root = comboboxRoot(input);
  if (!root) return;
  const query = input.value.trim().toLowerCase();
  const submission = root.querySelector<HTMLInputElement>("[data-combobox-submission]");
  if (submission) submission.value = "";
  root.querySelectorAll<HTMLElement>("[role=option]").forEach((option) => option.setAttribute("aria-selected", "false"));
  let matches = 0;
  for (const option of root.querySelectorAll<HTMLButtonElement>(".coco-combobox__option")) {
    option.hidden = Boolean(query) && !(option.dataset.comboboxSearch ?? "").includes(query);
    if (!option.hidden) matches++;
  }
  const empty = root.querySelector<HTMLElement>(".coco-combobox__empty");
  if (empty) empty.hidden = matches > 0;
  openCombobox(input);
}
function handleComboboxInputKey(event: KeyboardEvent): void {
  const input = event.currentTarget as HTMLInputElement;
  if (event.key === "Escape") { closeCombobox(input); return; }
  if (event.key !== "ArrowDown") return;
  event.preventDefault();
  openCombobox(input);
  visibleComboboxOptions(comboboxRoot(input) ?? input)[0]?.focus();
}
function handleComboboxOptionKey(event: KeyboardEvent): void {
  const option = event.currentTarget as HTMLButtonElement;
  const root = option.closest<HTMLElement>(".coco-combobox--interactive");
  if (!root) return;
  const options = visibleComboboxOptions(root);
  const index = options.indexOf(option);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
  } else if (event.key === "Escape") {
    event.preventDefault();
    const input = root.querySelector<HTMLInputElement>("input[role=combobox]");
    if (input) { input.focus(); closeCombobox(input); }
  }
}
function selectComboboxOption(option: HTMLButtonElement, value: string, label: string, onChange?: (value: string) => void): void {
  const root = option.closest<HTMLElement>(".coco-combobox--interactive");
  const input = root?.querySelector<HTMLInputElement>("input[role=combobox]");
  if (!input) return;
  input.value = label;
  const submission = root?.querySelector<HTMLInputElement>("[data-combobox-submission]");
  if (submission) submission.value = value;
  root?.querySelectorAll<HTMLElement>("[role=option]").forEach((item) => item.setAttribute("aria-selected", item === option ? "true" : "false"));
  onChange?.(value);
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.focus();
  closeCombobox(input);
}

export interface CommandItem { readonly label: string; readonly description?: string; readonly href?: string; readonly shortcut?: string; readonly disabled?: boolean; }
export interface CommandGroup { readonly label: string; readonly items: readonly CommandItem[]; }
export interface CommandProps extends ClassProps { readonly id: string; readonly groups: readonly CommandGroup[]; readonly query?: string; readonly placeholder?: string; readonly emptyText?: string; readonly onQuery?: (event: Event) => void; }
export function Command({ id, groups, query, placeholder = "Type a command…", emptyText = "No results found.", onQuery, class: className }: CommandProps): CocoNode { return jsx("section", { class: classes("coco-command", className), children: [jsx("label", { for: `${id}-search`, class: "coco-visually-hidden", children: "Search commands" }), jsx("input", { id: `${id}-search`, type: "search", value: query, placeholder, autocomplete: "off", onInput: onQuery }), jsx("div", { class: "coco-command__list", role: "listbox", children: groups.length ? groups.map((group) => jsx("section", { children: [jsx("h3", { children: group.label }), ...group.items.map((item) => { const content = [jsx("span", { children: [jsx("strong", { children: item.label }), item.description ? jsx("small", { children: item.description }) : null] }), item.shortcut ? jsx("kbd", { children: item.shortcut }) : null]; return item.href ? jsx("a", { href: item.href, role: "option", "aria-disabled": item.disabled ? "true" : undefined, children: content }) : jsx("button", { type: "button", role: "option", disabled: item.disabled, children: content }); })] })) : jsx("p", { children: emptyText }) })] }); }

export interface ContextMenuProps extends ClassProps { readonly label: string; readonly items: readonly CommandItem[]; readonly open?: boolean; }
export function ContextMenu({ label, items, open, class: className, children }: ContextMenuProps): CocoNode { return jsx("details", { class: classes("coco-context-menu", className), open, children: [jsx("summary", { children: [jsx("span", { children: children ?? label }), jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 16 }) })] }), jsx("div", { role: "menu", "aria-label": label, children: items.map((item) => item.href ? jsx("a", { href: item.href, role: "menuitem", children: item.label }) : jsx("button", { type: "button", role: "menuitem", disabled: item.disabled, children: item.label })) })] }); }

export type DataTableSortValue = string | number | bigint | boolean | Date | null | undefined;
export interface DataTableColumn {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly sortValue?: (row: Readonly<Record<string, CocoNode>>) => DataTableSortValue;
}
export interface DataTableProps extends ClassProps {
  readonly columns: readonly DataTableColumn[];
  readonly rows: readonly Readonly<Record<string, CocoNode>>[];
  readonly caption: string;
  readonly sortKey?: string;
  readonly sortDirection?: "asc" | "desc";
  readonly sortPath?: string;
  readonly onSort?: (key: string, direction: "asc" | "desc") => void;
}
export function DataTable({ columns, rows, caption, sortKey, sortDirection = "asc", sortPath = "", onSort, class: className }: DataTableProps): CocoNode {
  const activeColumn = columns.find((column) => column.sortable && column.key === sortKey);
  const sortedRows = activeColumn ? sortDataTableRows(rows, activeColumn, sortDirection) : rows;
  return jsx("div", { class: classes("coco-table-wrap", "coco-data-table", className), children: jsx("table", { class: "coco-table coco-table--striped", children: [
    jsx("caption", { children: caption }),
    jsx("thead", { children: jsx("tr", { children: columns.map((column) => {
      const active = column === activeColumn;
      const nextDirection = active && sortDirection === "asc" ? "desc" : "asc";
      return jsx("th", { scope: "col", "aria-sort": active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined, children: column.sortable ? jsx("a", {
        href: dataTableSortHref(sortPath, column.key, nextDirection),
        onClick: onSort ? (event: Event) => { event.preventDefault(); onSort(column.key, nextDirection); } : undefined,
        children: [jsx("span", { children: column.label }), jsx("span", { "aria-hidden": "true", children: SortVerticalIcon({ size: 15 }) })],
      }) : column.label });
    }) }) }),
    jsx("tbody", { children: sortedRows.map((row) => jsx("tr", { children: columns.map((column) => jsx("td", { children: row[column.key] })) })) }),
  ] }) });
}

function sortDataTableRows(rows: readonly Readonly<Record<string, CocoNode>>[], column: DataTableColumn, direction: "asc" | "desc"): readonly Readonly<Record<string, CocoNode>>[] {
  return rows.map((row, index) => ({ row, index, value: column.sortValue ? column.sortValue(row) : primitiveSortValue(row[column.key]) }))
    .sort((left, right) => {
      if (left.value == null && right.value == null) return left.index - right.index;
      if (left.value == null) return 1;
      if (right.value == null) return -1;
      const comparison = compareDataTableValues(left.value, right.value);
      return (direction === "desc" ? -comparison : comparison) || left.index - right.index;
    })
    .map(({ row }) => row);
}

function primitiveSortValue(value: CocoNode): DataTableSortValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean" ? value : undefined;
}

function compareDataTableValues(left: Exclude<DataTableSortValue, null | undefined>, right: Exclude<DataTableSortValue, null | undefined>): number {
  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;
  if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue;
  if (typeof leftValue === "bigint" && typeof rightValue === "bigint") return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  const leftText = String(leftValue).toLowerCase();
  const rightText = String(rightValue).toLowerCase();
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

function dataTableSortHref(sortPath: string, key: string, direction: "asc" | "desc"): string {
  const hashIndex = sortPath.indexOf("#");
  const path = hashIndex === -1 ? sortPath : sortPath.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : sortPath.slice(hashIndex);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}sort=${encodeURIComponent(key)}&direction=${direction}${hash}`;
}

export interface DatePickerProps extends ClassProps { readonly id: string; readonly name: string; readonly label: string; readonly value?: string; readonly min?: string; readonly max?: string; readonly required?: boolean; readonly disabled?: boolean; readonly size?: Size; }
export function DatePicker({ id, name, label, value, min, max, required, disabled, size = "medium", class: className }: DatePickerProps): CocoNode { return jsx("div", { class: classes("coco-date-picker", className), children: [jsx("label", { for: id, children: label }), jsx("input", { id, name, type: "date", value, min, max, required, disabled, class: `coco-input coco-input--${size}` })] }); }

export interface DirectionProps extends ClassProps { readonly dir: "ltr" | "rtl" | "auto"; readonly as?: "div" | "section" | "article"; }
export function Direction({ dir, as = "div", class: className, children }: DirectionProps): CocoNode { return jsx(as, { dir, class: classes("coco-direction", className), children }); }

export interface HoverCardProps extends ClassProps { readonly id: string; readonly trigger: CocoNode; readonly placement?: "top" | "bottom"; }
export function HoverCard({ id, trigger, placement = "bottom", class: className, children }: HoverCardProps): CocoNode { return jsx("span", { class: classes("coco-hover-card", `coco-hover-card--${placement}`, className), children: [jsx("span", { class: "coco-hover-card__trigger", tabindex: 0, "aria-describedby": id, children: trigger }), jsx("span", { id, class: "coco-hover-card__content", role: "tooltip", children })] }); }

export interface InputOtpProps extends ClassProps { readonly id: string; readonly name: string; readonly label: string; readonly length?: number; readonly value?: string; readonly disabled?: boolean; }
export function InputOtp({ id, name, label, length = 6, value = "", disabled, class: className }: InputOtpProps): CocoNode { return jsx("fieldset", { id, class: classes("coco-input-otp", className), disabled, children: [jsx("legend", { children: label }), jsx("div", { children: Array.from({ length }, (_, index) => jsx("input", { name: `${name}-${index + 1}`, value: value[index] ?? "", inputmode: "numeric", pattern: "[0-9]*", maxlength: 1, autocomplete: index === 0 ? "one-time-code" : "off", "aria-label": `${label} digit ${index + 1}` })) })] }); }

export interface ItemProps extends ClassProps { readonly title: string; readonly description?: string; readonly icon?: CocoNode; readonly action?: CocoNode; readonly href?: string; }
export function Item({ title, description, icon, action, href, class: className, children }: ItemProps): CocoNode { const content = [icon ? jsx("span", { class: "coco-item__icon", "aria-hidden": "true", children: icon }) : null, jsx("span", { class: "coco-item__content", children: [jsx("strong", { children: title }), description ? jsx("small", { children: description }) : null, children] }), action]; return jsx("article", { class: classes("coco-item", className), children: href ? jsx("a", { href, children: content }) : content }); }

export interface KbdProps extends ClassProps { readonly title?: string; }
export function Kbd({ title, class: className, children }: KbdProps): CocoNode { return jsx("kbd", { title, class: classes("coco-kbd", className), children }); }
export interface LabelProps extends ClassProps { readonly for: string; readonly required?: boolean; }
export function Label({ for: htmlFor, required, class: className, children }: LabelProps): CocoNode { return jsx("label", { for: htmlFor, class: classes("coco-label", className), children: [children, required ? jsx("span", { "aria-hidden": "true", children: " *" }) : null] }); }

export interface MarkerProps extends ClassProps { readonly tone?: "neutral" | "primary" | "success" | "warning" | "danger"; readonly icon?: CocoNode; }
export function Marker({ tone = "neutral", icon, class: className, children }: MarkerProps): CocoNode { return jsx("span", { class: classes("coco-marker", `coco-marker--${tone}`, className), children: [icon ? jsx("span", { "aria-hidden": "true", children: icon }) : null, children] }); }

export interface MenubarMenu { readonly label: string; readonly items: readonly CommandItem[]; }
export interface MenubarProps extends ClassProps { readonly menus: readonly MenubarMenu[]; readonly label?: string; }
export function Menubar({ menus, label = "Application menu", class: className }: MenubarProps): CocoNode { return jsx("nav", { class: classes("coco-menubar", className), "aria-label": label, children: menus.map((menu) => jsx("details", { children: [jsx("summary", { children: [jsx("span", { children: menu.label }), jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 14 }) })] }), jsx("div", { role: "menu", children: menu.items.map((item) => item.href ? jsx("a", { href: item.href, role: "menuitem", children: [item.label, item.shortcut ? jsx("kbd", { children: item.shortcut }) : null] }) : jsx("button", { type: "button", role: "menuitem", disabled: item.disabled, children: [item.label, item.shortcut ? jsx("kbd", { children: item.shortcut }) : null] })) })] })) }); }

export interface MessageProps extends ClassProps { readonly author: string; readonly avatar?: CocoNode; readonly timestamp?: string; readonly actions?: CocoNode; readonly role?: "user" | "assistant" | "system"; }
export function Message({ author, avatar, timestamp, actions, role = "assistant", class: className, children }: MessageProps): CocoNode { return jsx("article", { class: classes("coco-message", `coco-message--${role}`, className), children: [avatar ? jsx("div", { class: "coco-message__avatar", children: avatar }) : null, jsx("div", { class: "coco-message__content", children: [jsx("header", { children: [jsx("strong", { children: author }), timestamp ? jsx("time", { children: timestamp }) : null] }), jsx("div", { class: "coco-message__body", children }), actions ? jsx("footer", { children: actions }) : null] })] }); }
export interface MessageScrollerProps extends ClassProps { readonly label?: string; readonly busy?: boolean; }
export function MessageScroller({ label = "Conversation", busy = false, class: className, children }: MessageScrollerProps): CocoNode { return jsx("section", { class: classes("coco-message-scroller", className), role: "log", "aria-label": label, "aria-live": "polite", "aria-busy": busy ? "true" : "false", children }); }

export interface NavigationMenuItem { readonly label: string; readonly href?: string; readonly description?: string; readonly items?: readonly NavigationMenuItem[]; readonly current?: boolean; }
export interface NavigationMenuProps extends ClassProps { readonly items: readonly NavigationMenuItem[]; readonly label?: string; }
export function NavigationMenu({ items, label = "Primary", class: className }: NavigationMenuProps): CocoNode { return jsx("nav", { class: classes("coco-navigation-menu", className), "aria-label": label, children: jsx("ul", { children: items.map((item) => jsx("li", { children: item.items?.length ? jsx("details", { children: [jsx("summary", { children: [jsx("span", { children: item.label }), jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 15 }) })] }), jsx("div", { children: item.items.map((child) => jsx("a", { href: child.href ?? "#", children: [jsx("strong", { children: child.label }), child.description ? jsx("small", { children: child.description }) : null] })) })] }) : jsx("a", { href: item.href ?? "#", "aria-current": item.current ? "page" : undefined, children: item.label }) })) }) }); }

export interface PopoverProps extends ClassProps { readonly id: string; readonly trigger: CocoNode; readonly label: string; readonly placement?: "top" | "right" | "bottom" | "left"; }
export function Popover({ id, trigger, label, placement = "bottom", class: className, children }: PopoverProps): CocoNode { return jsx("span", { class: classes("coco-popover", className), children: [jsx("button", { type: "button", popovertarget: id, "aria-haspopup": "dialog", children: trigger }), jsx("div", { id, popover: "auto", role: "dialog", "aria-label": label, class: `coco-popover__content coco-popover__content--${placement}`, children })] }); }

export interface QuestionnaireChoice { readonly label: string; readonly value: string; readonly description?: string; }
export interface QuestionnaireQuestion { readonly id: string; readonly prompt: string; readonly choices: readonly QuestionnaireChoice[]; readonly value?: string; }
export interface QuestionnaireProps extends ClassProps { readonly name: string; readonly questions: readonly QuestionnaireQuestion[]; }
export function Questionnaire({ name, questions, class: className }: QuestionnaireProps): CocoNode { return jsx("div", { class: classes("coco-questionnaire", className), children: questions.map((question, questionIndex) => jsx("fieldset", { children: [jsx("legend", { children: [jsx("span", { children: `${questionIndex + 1}.` }), question.prompt] }), jsx("div", { children: question.choices.map((choice, index) => { const id = `${name}-${question.id}-${index}`; return jsx("label", { for: id, children: [jsx("input", { id, type: "radio", name: `${name}-${question.id}`, value: choice.value, checked: choice.value === question.value }), jsx("span", { children: [jsx("strong", { children: choice.label }), choice.description ? jsx("small", { children: choice.description }) : null] })] }); }) })] })) }); }

export interface ResizablePanel { readonly id: string; readonly content: CocoNode; readonly min?: "small" | "medium" | "large"; }
export interface ResizableProps extends ClassProps { readonly panels: readonly ResizablePanel[]; readonly orientation?: "horizontal" | "vertical"; readonly label?: string; }
export function Resizable({ panels, orientation = "horizontal", label = "Resizable panels", class: className }: ResizableProps): CocoNode { return jsx("div", { class: classes("coco-resizable", `coco-resizable--${orientation}`, className), role: "group", "aria-label": label, children: panels.flatMap((panel, index) => [jsx("section", { id: panel.id, class: `coco-resizable__panel coco-resizable__panel--${panel.min ?? "small"}`, children: panel.content }), index < panels.length - 1 ? jsx("span", { class: "coco-resizable__handle", role: "separator", "aria-orientation": orientation, tabindex: 0 }) : null]) }); }

export interface ScrollAreaProps extends ClassProps { readonly size?: "small" | "medium" | "large"; readonly label?: string; }
export function ScrollArea({ size = "medium", label = "Scrollable content", class: className, children }: ScrollAreaProps): CocoNode { return jsx("div", { class: classes("coco-scroll-area", `coco-scroll-area--${size}`, className), tabindex: 0, role: "region", "aria-label": label, children }); }

export interface SidebarItem { readonly label: string; readonly href: string; readonly icon?: CocoNode; readonly current?: boolean; readonly badge?: CocoNode; }
export interface SidebarGroup { readonly label: string; readonly items: readonly SidebarItem[]; }
export interface SidebarProps extends ClassProps { readonly brand?: CocoNode; readonly groups: readonly SidebarGroup[]; readonly footer?: CocoNode; readonly label?: string; readonly compact?: boolean; }
export function Sidebar({ brand, groups, footer, label = "Sidebar navigation", compact = false, class: className }: SidebarProps): CocoNode { return jsx("aside", { class: classes("coco-sidebar", compact ? "coco-sidebar--compact" : undefined, className), children: [brand ? jsx("header", { children: brand }) : null, jsx("nav", { "aria-label": label, children: groups.map((group) => jsx("section", { children: [jsx("h2", { children: group.label }), ...group.items.map((item) => jsx("a", { href: item.href, "aria-current": item.current ? "page" : undefined, children: [item.icon ? jsx("span", { "aria-hidden": "true", children: item.icon }) : null, jsx("strong", { children: item.label }), item.badge] }))] })) }), footer ? jsx("footer", { children: footer }) : null] }); }

export interface SliderProps extends ClassProps { readonly id: string; readonly name: string; readonly label: string; readonly value?: number; readonly min?: number; readonly max?: number; readonly step?: number; readonly disabled?: boolean; readonly showValue?: boolean; }
export function Slider({ id, name, label, value = 0, min = 0, max = 100, step = 1, disabled, showValue = true, class: className }: SliderProps): CocoNode { return jsx("label", { for: id, class: classes("coco-slider", className), children: [jsx("span", { children: [jsx("strong", { children: label }), showValue ? jsx("output", { for: id, children: value }) : null] }), jsx("input", { id, name, type: "range", value, min, max, step, disabled })] }); }

export interface ToggleProps extends ClassProps { readonly pressed?: boolean; readonly disabled?: boolean; readonly size?: Size; readonly variant?: "default" | "outline"; readonly label?: string; readonly onClick?: (event: Event) => void; }
export function Toggle({ pressed = false, disabled, size = "medium", variant = "default", label, onClick, class: className, children }: ToggleProps): CocoNode { return jsx("button", { type: "button", "aria-pressed": pressed ? "true" : "false", "aria-label": label, disabled, onClick, class: classes("coco-toggle", `coco-toggle--${size}`, `coco-toggle--${variant}`, className), children }); }
export interface ToggleGroupItem { readonly value: string; readonly label: string; readonly content?: CocoNode; readonly disabled?: boolean; }
export interface ToggleGroupProps extends ClassProps { readonly items: readonly ToggleGroupItem[]; readonly value?: string | readonly string[]; readonly multiple?: boolean; readonly label?: string; readonly size?: Size; readonly onToggle?: (value: string) => void; }
export function ToggleGroup({ items, value, multiple = false, label = "Options", size = "medium", onToggle, class: className }: ToggleGroupProps): CocoNode { const selected = Array.isArray(value) ? value : value ? [value] : []; return jsx("div", { role: "group", "aria-label": label, "data-multiple": multiple ? "true" : "false", class: classes("coco-toggle-group", `coco-toggle-group--${size}`, className), children: items.map((item) => jsx("button", { type: "button", value: item.value, disabled: item.disabled, "aria-pressed": selected.includes(item.value) ? "true" : "false", onClick: onToggle ? () => onToggle(item.value) : undefined, children: item.content ?? item.label })) }); }

function classes(...values: readonly (string | undefined)[]): string { return values.filter(Boolean).join(" "); }
