import { jsx, type CocoNode } from "@cocoframe/jsx";
import AltArrowDownIcon from "@cocoframe/icons/linear/alt-arrow-down";
import AltArrowRightIcon from "@cocoframe/icons/linear/alt-arrow-right";
import CloseCircleIcon from "@cocoframe/icons/linear/close-circle";
import MagnifierIcon from "@cocoframe/icons/linear/magnifier";
import UploadMinimalisticIcon from "@cocoframe/icons/linear/upload-minimalistic";

export { SyntaxHighlighter } from "./syntax-highlighter.ts";
export type { SyntaxHighlighterProps, SyntaxLanguage } from "./syntax-highlighter.ts";
export * from "./advanced.ts";
export * from "./chart.ts";
export * from "./patterns.ts";

interface ClassProps {
  readonly class?: string;
  readonly children?: CocoNode;
}

export type ControlSize = "small" | "medium" | "large" | "xlarge";

export interface ButtonProps extends ClassProps {
  readonly type?: "button" | "submit" | "reset";
  readonly variant?: "primary" | "secondary" | "ghost" | "danger";
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly name?: string;
  readonly value?: string;
  readonly "aria-label"?: string;
  readonly "aria-expanded"?: "true" | "false";
  readonly "aria-controls"?: string;
  readonly "aria-haspopup"?: "dialog" | "menu" | "true";
  readonly onClick?: (event: Event) => void;
}

/**
 * Renders the Button server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Button({ variant = "primary", size = "medium", class: className, children, ...props }: ButtonProps): CocoNode {
  return jsx("button", { ...props, class: classes("coco-button", `coco-button--${variant}`, `coco-button--${size}`, className), children });
}

export interface InputProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly type?: "text" | "email" | "password" | "search" | "tel" | "url" | "number";
  readonly size?: ControlSize;
  readonly value?: string;
  readonly placeholder?: string;
  readonly autocomplete?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly "aria-invalid"?: "true";
  readonly "aria-describedby"?: string;
}

/**
 * Renders the Input server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Input({ size = "medium", class: className, children: _children, ...props }: InputProps): CocoNode {
  return jsx("input", { ...props, class: classes("coco-input", `coco-input--${size}`, className) });
}

export interface TextareaProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly value?: string;
  readonly size?: ControlSize;
  readonly rows?: number;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly "aria-invalid"?: "true";
  readonly "aria-describedby"?: string;
}

/**
 * Renders the Textarea server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Textarea({ size = "medium", class: className, value, children: _children, ...props }: TextareaProps): CocoNode {
  return jsx("textarea", { ...props, class: classes("coco-input", `coco-input--${size}`, className), children: value ?? "" });
}

export interface SelectProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly value?: string;
  readonly size?: ControlSize;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly multiple?: boolean;
  readonly "aria-invalid"?: "true";
  readonly "aria-describedby"?: string;
  readonly onInput?: (event: Event) => void;
}

/**
 * Renders the Select server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Select({ size = "medium", class: className, children, ...props }: SelectProps): CocoNode {
  const select = jsx("select", { ...props, class: classes("coco-input", `coco-input--${size}`, "coco-select", className), children });
  return props.multiple ? select : jsx("span", { class: "coco-select-shell", children: [select, jsx("span", { class: "coco-select-shell__icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 18 }) })] });
}

export interface CheckboxProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly description?: string;
  readonly checked?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
}

/**
 * Renders the Checkbox server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Checkbox({ id, name, label, value, description, checked, required, disabled, class: className }: CheckboxProps): CocoNode {
  const descriptionId = description ? `${id}-description` : undefined;
  return jsx("div", { class: classes("coco-checkbox", className), children: [
    jsx("input", { id, name, type: "checkbox", value, checked, required, disabled, "aria-describedby": descriptionId }),
    jsx("div", { children: [
      jsx("label", { for: id, children: [label, required ? jsx("span", { "aria-hidden": "true", children: " *" }) : null] }),
      description ? jsx("p", { id: descriptionId, children: description }) : null,
    ] }),
  ] });
}

export interface RadioOption {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export interface RadioGroupProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly legend: string;
  readonly options: readonly RadioOption[];
  readonly value?: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly orientation?: "vertical" | "horizontal";
  readonly size?: ControlSize;
}

/**
 * Renders the Radio Group server-first UI primitive with semantic markup and no required browser runtime.
 */
export function RadioGroup({ id, name, legend, options, value, description, required, disabled, orientation = "vertical", size = "medium", class: className }: RadioGroupProps): CocoNode {
  const descriptionId = description ? `${id}-description` : undefined;
  return jsx("fieldset", { class: classes("coco-radio-group", `coco-radio-group--${orientation}`, `coco-radio-group--${size}`, className), disabled, "aria-describedby": descriptionId, children: [
    jsx("legend", { children: [legend, required ? jsx("span", { "aria-hidden": "true", children: " *" }) : null] }),
    description ? jsx("p", { id: descriptionId, class: "coco-radio-group__description", children: description }) : null,
    jsx("div", { class: "coco-radio-group__options", children: options.map((option, index) => {
      const optionId = `${id}-${index}`;
      const optionDescriptionId = option.description ? `${optionId}-description` : undefined;
      return jsx("label", { class: "coco-radio", for: optionId, children: [
        jsx("input", { id: optionId, name, type: "radio", value: option.value, checked: option.value === value, required, disabled: disabled || option.disabled, "aria-describedby": optionDescriptionId }),
        jsx("span", { children: [jsx("strong", { children: option.label }), option.description ? jsx("small", { id: optionDescriptionId, children: option.description }) : null] }),
      ] });
    }) }),
  ] });
}

export interface SwitchProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly value?: string;
  readonly checked?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly size?: ControlSize;
  readonly onChange?: (event: Event) => void;
}

/**
 * Renders the Switch server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Switch({ id, name, label, description, value, checked, required, disabled, size = "medium", onChange, class: className }: SwitchProps): CocoNode {
  const descriptionId = description ? `${id}-description` : undefined;
  return jsx("label", { class: classes("coco-switch", `coco-switch--${size}`, className), for: id, children: [
    jsx("input", { id, name, type: "checkbox", role: "switch", value, checked, required, disabled, onChange, "aria-describedby": descriptionId }),
    jsx("span", { class: "coco-switch__track", "aria-hidden": "true", children: jsx("span", { class: "coco-switch__thumb" }) }),
    jsx("span", { class: "coco-switch__copy", children: [jsx("strong", { children: label }), description ? jsx("small", { id: descriptionId, children: description }) : null] }),
  ] });
}

export interface SearchFieldProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly value?: string;
  readonly placeholder?: string;
  readonly autocomplete?: string;
  readonly disabled?: boolean;
  readonly size?: ControlSize;
  readonly onInput?: (event: Event) => void;
}

/**
 * Renders the Search Field server-first UI primitive with semantic markup and no required browser runtime.
 */
export function SearchField({ id, name, label, size = "medium", class: className, ...props }: SearchFieldProps): CocoNode {
  return jsx("div", { class: classes("coco-search-field", `coco-search-field--${size}`, className), children: [
    jsx("label", { for: id, class: "coco-visually-hidden", children: label }),
    jsx("span", { class: "coco-search-field__icon", "aria-hidden": "true", children: MagnifierIcon({ size: 18 }) }),
    jsx("input", { ...props, id, name, type: "search", "aria-label": label }),
  ] });
}

export interface IconInputProps extends InputProps {
  readonly leadingIcon?: CocoNode;
  readonly trailingIcon?: CocoNode;
  readonly trailingLabel?: string;
  readonly onTrailingClick?: (event: Event) => void;
}

/**
 * Renders the Icon Input server-first UI primitive with semantic markup and no required browser runtime.
 */
export function IconInput({ leadingIcon, trailingIcon, trailingLabel = "Input action", onTrailingClick, size = "medium", class: className, children: _children, ...props }: IconInputProps): CocoNode {
  return jsx("div", { class: classes("coco-icon-input", `coco-icon-input--${size}`, className), children: [
    leadingIcon ? jsx("span", { class: "coco-icon-input__leading", "aria-hidden": "true", children: leadingIcon }) : null,
    jsx("input", { ...props, class: classes("coco-input", `coco-input--${size}`) }),
    trailingIcon ? onTrailingClick
      ? jsx("button", { class: "coco-icon-input__action", type: "button", "aria-label": trailingLabel, onClick: onTrailingClick, children: trailingIcon })
      : jsx("span", { class: "coco-icon-input__trailing", "aria-hidden": "true", children: trailingIcon })
      : null,
  ] });
}

export interface InputGroupProps extends ClassProps {
  readonly start?: CocoNode;
  readonly end?: CocoNode;
  readonly size?: ControlSize;
}

/**
 * Renders the Input Group server-first UI primitive with semantic markup and no required browser runtime.
 */
export function InputGroup({ start, end, size = "medium", class: className, children }: InputGroupProps): CocoNode {
  return jsx("div", { class: classes("coco-input-group", `coco-input-group--${size}`, className), children: [
    start ? jsx("span", { class: "coco-input-group__addon", children: start }) : null,
    jsx("div", { class: "coco-input-group__control", children }),
    end ? jsx("span", { class: "coco-input-group__addon", children: end }) : null,
  ] });
}

export interface FileUploadProps extends ClassProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly size?: ControlSize;
}

/**
 * Renders the File Upload server-first UI primitive with semantic markup and no required browser runtime.
 */
export function FileUpload({ id, name, label, hint, size = "medium", class: className, ...props }: FileUploadProps): CocoNode {
  const hintId = hint ? `${id}-hint` : undefined;
  return jsx("label", { class: classes("coco-file-upload", `coco-file-upload--${size}`, className), for: id, children: [
    jsx("span", { class: "coco-file-upload__icon", "aria-hidden": "true", children: UploadMinimalisticIcon({ size: size === "small" ? 17 : size === "medium" ? 20 : 23 }) }),
    jsx("strong", { children: label }),
    hint ? jsx("small", { id: hintId, children: hint }) : null,
    jsx("input", { ...props, id, name, type: "file", "aria-describedby": hintId }),
  ] });
}

export interface FormFieldProps extends ClassProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly hint?: string;
  readonly error?: string | undefined;
  readonly required?: boolean;
}

/**
 * Renders the Form Field server-first UI primitive with semantic markup and no required browser runtime.
 */
export function FormField({ label, htmlFor, hint, error, required, class: className, children }: FormFieldProps): CocoNode {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return jsx("div", {
    class: classes("coco-field", className),
    children: [
      jsx("label", { class: "coco-label", for: htmlFor, children: [label, required ? jsx("span", { "aria-hidden": "true", children: " *" }) : null] }),
      hint ? jsx("p", { class: "coco-hint", id: hintId, children: hint }) : null,
      children,
      error ? jsx("p", { class: "coco-error", id: errorId, role: "alert", children: error }) : null,
    ],
  });
}

export interface AlertProps extends ClassProps {
  readonly variant?: "info" | "success" | "warning" | "error";
}

/**
 * Renders the Alert server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Alert({ variant = "info", class: className, children }: AlertProps): CocoNode {
  return jsx("div", { class: classes("coco-alert", `coco-alert--${variant}`, className), role: variant === "error" ? "alert" : "status", children });
}

export interface BadgeProps extends ClassProps {
  readonly variant?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
}

/**
 * Renders the Badge server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Badge({ variant = "neutral", class: className, children }: BadgeProps): CocoNode {
  return jsx("span", { class: classes("coco-badge", `coco-badge--${variant}`, className), children });
}

export interface ProgressProps extends ClassProps {
  readonly value: number;
  readonly max?: number;
  readonly label: string;
}

/**
 * Renders the Progress server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Progress({ value, max = 100, label, class: className }: ProgressProps): CocoNode {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(Math.max(0, value), safeMax);
  return jsx("div", { class: classes("coco-progress", className), children: [
    jsx("div", { class: "coco-progress__label", children: [jsx("span", { children: label }), jsx("span", { "aria-hidden": "true", children: `${safeValue}/${safeMax}` })] }),
    jsx("progress", { value: safeValue, max: safeMax, "aria-label": label }),
  ] });
}

export interface SpinnerProps extends ClassProps {
  readonly size?: ControlSize;
  readonly label?: string;
}

/**
 * Renders the Spinner server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Spinner({ size = "medium", label = "Loading", class: className }: SpinnerProps): CocoNode {
  return jsx("span", { class: classes("coco-spinner-wrap", className), role: "status", children: [
    jsx("span", { class: classes("coco-spinner", `coco-spinner--${size}`), "aria-hidden": "true" }),
    VisuallyHidden({ children: label }),
  ] });
}

export type SkeletonWidth = "quarter" | "half" | "three-quarter" | "full" | "avatar";
export type SkeletonHeight = "text" | "body" | "heading" | "avatar" | "card";

export interface SkeletonProps extends ClassProps {
  readonly width?: SkeletonWidth;
  readonly height?: SkeletonHeight;
  readonly radius?: "small" | "medium" | "large" | "full";
  readonly label?: string;
}

/**
 * Renders the Skeleton server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Skeleton({ width = "full", height = "body", radius = "medium", label = "Loading content", class: className }: SkeletonProps): CocoNode {
  return jsx("span", {
    class: classes("coco-skeleton", `coco-skeleton--width-${width}`, `coco-skeleton--height-${height}`, `coco-skeleton--${radius}`, className),
    role: "status",
    "aria-label": label,
  });
}

export interface EmptyStateProps extends ClassProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: CocoNode;
  readonly action?: CocoNode;
}

/**
 * Renders the Empty State server-first UI primitive with semantic markup and no required browser runtime.
 */
export function EmptyState({ title, description, icon, action, class: className }: EmptyStateProps): CocoNode {
  return jsx("section", { class: classes("coco-empty-state", className), children: [
    icon ? jsx("div", { class: "coco-empty-state__icon", "aria-hidden": "true", children: icon }) : null,
    jsx("h3", { children: title }),
    description ? jsx("p", { children: description }) : null,
    action ? jsx("div", { class: "coco-empty-state__action", children: action }) : null,
  ] });
}

export interface ToastProps extends ClassProps {
  readonly title: string;
  readonly description?: string;
  readonly variant?: "info" | "success" | "warning" | "error";
  readonly action?: CocoNode;
  readonly dismissLabel?: string;
  readonly onDismiss?: (event: Event) => void;
}

/**
 * Renders the Toast server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Toast({ title, description, variant = "info", action, dismissLabel = "Dismiss notification", onDismiss, class: className }: ToastProps): CocoNode {
  return jsx("article", { class: classes("coco-toast", `coco-toast--${variant}`, className), role: variant === "error" ? "alert" : "status", children: [
    jsx("span", { class: "coco-toast__indicator", "aria-hidden": "true" }),
    jsx("div", { class: "coco-toast__copy", children: [jsx("strong", { children: title }), description ? jsx("p", { children: description }) : null] }),
    action ? jsx("div", { class: "coco-toast__action", children: action }) : null,
    onDismiss ? jsx("button", { class: "coco-toast__dismiss", type: "button", "aria-label": dismissLabel, onClick: onDismiss, children: CloseCircleIcon({ size: 19 }) }) : null,
  ] });
}

export interface ToasterProps extends ClassProps {
  readonly position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
  readonly label?: string;
}

/**
 * Renders the Toaster server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Toaster({ position = "bottom-right", label = "Notifications", class: className, children }: ToasterProps): CocoNode {
  return jsx("section", { class: classes("coco-toaster", `coco-toaster--${position}`, className), "aria-label": label, "aria-live": "polite", "aria-relevant": "additions", children });
}

export interface CardProps extends ClassProps {
  readonly as?: "article" | "section" | "div";
}

/**
 * Renders the Card server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Card({ as = "article", class: className, children }: CardProps): CocoNode {
  return jsx(as, { class: classes("coco-card", className), children });
}

export interface AvatarProps extends ClassProps {
  readonly src?: string;
  readonly alt?: string;
  readonly initials?: string;
  readonly size?: ControlSize;
}

/**
 * Renders the Avatar server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Avatar({ src, alt = "", initials = "?", size = "medium", class: className }: AvatarProps): CocoNode {
  const rootClass = classes("coco-avatar", `coco-avatar--${size}`, className);
  return src
    ? jsx("img", { class: rootClass, src, alt, loading: "lazy" })
    : jsx("span", { class: rootClass, role: alt ? "img" : undefined, "aria-label": alt || undefined, "aria-hidden": alt ? undefined : "true", children: initials.slice(0, 3) });
}

export interface StatProps extends ClassProps {
  readonly label: string;
  readonly value: CocoNode;
  readonly trend?: string;
  readonly tone?: "neutral" | "positive" | "negative";
}

/**
 * Renders the Stat server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Stat({ label, value, trend, tone = "neutral", class: className }: StatProps): CocoNode {
  return jsx("article", { class: classes("coco-stat", `coco-stat--${tone}`, className), children: [
    jsx("span", { class: "coco-stat__label", children: label }),
    jsx("strong", { class: "coco-stat__value", children: value }),
    trend ? jsx("small", { class: "coco-stat__trend", children: trend }) : null,
  ] });
}

export interface StackProps extends ClassProps {
  readonly gap?: "small" | "medium" | "large";
  readonly as?: "div" | "section" | "main" | "form";
  readonly method?: "get" | "post";
  readonly action?: string;
}

/**
 * Renders the Stack server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Stack({ gap = "medium", as = "div", class: className, children, ...props }: StackProps): CocoNode {
  return jsx(as, { ...props, class: classes("coco-stack", `coco-stack--${gap}`, className), children });
}

export interface ContainerProps extends ClassProps {
  readonly size?: "small" | "medium" | "large" | "full";
  readonly as?: "div" | "section" | "main";
}

/**
 * Renders the Container server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Container({ size = "large", as = "div", class: className, children }: ContainerProps): CocoNode {
  return jsx(as, { class: classes("coco-container", `coco-container--${size}`, className), children });
}

export interface GridProps extends ClassProps {
  readonly columns?: 1 | 2 | 3 | 4;
  readonly gap?: "small" | "medium" | "large";
  readonly as?: "div" | "section" | "ul";
}

/**
 * Renders the Grid server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Grid({ columns = 2, gap = "medium", as = "div", class: className, children }: GridProps): CocoNode {
  return jsx(as, { class: classes("coco-grid", `coco-grid--${columns}`, `coco-grid--gap-${gap}`, className), children });
}

export interface InlineProps extends ClassProps {
  readonly gap?: "small" | "medium" | "large";
  readonly align?: "start" | "center" | "end";
  readonly justify?: "start" | "center" | "between" | "end";
  readonly wrap?: boolean;
  readonly as?: "div" | "nav" | "section";
}

/**
 * Renders the Inline server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Inline({ gap = "medium", align = "center", justify = "start", wrap = true, as = "div", class: className, children }: InlineProps): CocoNode {
  return jsx(as, { class: classes("coco-inline", `coco-inline--gap-${gap}`, `coco-inline--align-${align}`, `coco-inline--justify-${justify}`, wrap ? "coco-inline--wrap" : undefined, className), children });
}

export interface DividerProps extends ClassProps {
  readonly orientation?: "horizontal" | "vertical";
  readonly label?: string;
}

/**
 * Renders the Divider server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Divider({ orientation = "horizontal", label, class: className }: DividerProps): CocoNode {
  if (orientation === "horizontal" && !label) return jsx("hr", { class: classes("coco-divider", className) });
  return jsx("div", { class: classes("coco-divider", `coco-divider--${orientation}`, label ? "coco-divider--labeled" : undefined, className), role: "separator", "aria-orientation": orientation, children: label ? [jsx("span", {}), jsx("em", { children: label }), jsx("span", {})] : undefined });
}

export interface HeadingProps extends ClassProps {
  readonly level?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly size?: "small" | "medium" | "large" | "xlarge";
  readonly id?: string;
}

/**
 * Renders the Heading server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Heading({ level = 2, size = "large", id, class: className, children }: HeadingProps): CocoNode {
  const tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return jsx(tag, { id, class: classes("coco-heading", `coco-heading--${size}`, className), children });
}

export interface TextProps extends ClassProps {
  readonly as?: "p" | "span" | "small" | "strong";
  readonly tone?: "default" | "muted" | "danger" | "success";
  readonly size?: "small" | "medium" | "large";
}

/**
 * Renders the Text server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Text({ as = "p", tone = "default", size = "medium", class: className, children }: TextProps): CocoNode {
  return jsx(as, { class: classes("coco-text", `coco-text--${tone}`, `coco-text--${size}`, className), children });
}

export interface CodeProps extends ClassProps {
  readonly block?: boolean;
}

/**
 * Renders the Code server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Code({ block = false, class: className, children }: CodeProps): CocoNode {
  const code = jsx("code", { class: block ? undefined : classes("coco-code", className), children });
  return block ? jsx("pre", { class: classes("coco-code-block", className), children: code }) : code;
}

export interface IconButtonProps extends ClassProps {
  readonly label: string;
  readonly type?: "button" | "submit" | "reset";
  readonly variant?: "primary" | "secondary" | "ghost" | "danger";
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly onClick?: (event: Event) => void;
}

/**
 * Renders the Icon Button server-first UI primitive with semantic markup and no required browser runtime.
 */
export function IconButton({ label, type = "button", variant = "ghost", size = "medium", disabled, onClick, class: className, children }: IconButtonProps): CocoNode {
  return jsx("button", { type, disabled, onClick, "aria-label": label, class: classes("coco-icon-button", `coco-icon-button--${variant}`, `coco-icon-button--${size}`, className), children });
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbProps extends ClassProps {
  readonly items: readonly BreadcrumbItem[];
  readonly label?: string;
}

/**
 * Renders the Breadcrumb server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Breadcrumb({ items, label = "Breadcrumb", class: className }: BreadcrumbProps): CocoNode {
  return jsx("nav", { class: classes("coco-breadcrumb", className), "aria-label": label, children: jsx("ol", { children: items.map((item, index) => {
    const current = index === items.length - 1;
    return jsx("li", { children: [index > 0 ? jsx("span", { class: "coco-breadcrumb__separator", "aria-hidden": "true", children: AltArrowRightIcon({ size: 14 }) }) : null, current || !item.href ? jsx("span", { "aria-current": current ? "page" : undefined, children: item.label }) : jsx("a", { href: item.href, children: item.label })] });
  }) }) });
}

export interface PaginationProps extends ClassProps {
  readonly current: number;
  readonly total: number;
  readonly basePath?: string;
  readonly label?: string;
}

/**
 * Renders the Pagination server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Pagination({ current, total, basePath = "", label = "Pagination", class: className }: PaginationProps): CocoNode {
  const pageCount = Math.max(1, Math.floor(total));
  const active = Math.min(Math.max(1, Math.floor(current)), pageCount);
  const href = (page: number) => `${basePath}${basePath.includes("?") ? "&" : "?"}page=${page}`;
  return jsx("nav", { class: classes("coco-pagination", className), "aria-label": label, children: jsx("ul", { children: Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    return jsx("li", { children: jsx("a", { href: href(page), "aria-current": page === active ? "page" : undefined, "aria-label": `Page ${page}`, children: page }) });
  }) }) });
}

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly panel: CocoNode;
  readonly disabled?: boolean;
}

export interface TabsProps extends ClassProps {
  readonly id: string;
  readonly items: readonly TabItem[];
  readonly activeId?: string;
  readonly label?: string;
  readonly onActivate?: (id: string) => void;
}

/**
 * Renders the Tabs server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Tabs({ id, items, activeId, label = "Tabs", onActivate, class: className }: TabsProps): CocoNode {
  const fallback = items.find((item) => !item.disabled)?.id;
  const active = items.some((item) => item.id === activeId && !item.disabled) ? activeId : fallback;
  return jsx("div", { class: classes("coco-tabs", className), children: [
    jsx("div", { class: "coco-tabs__list", role: "tablist", "aria-label": label, children: items.map((item) => jsx("button", {
      id: `${id}-tab-${item.id}`, type: "button", role: "tab", disabled: item.disabled, "aria-selected": item.id === active ? "true" : "false", "aria-controls": `${id}-panel-${item.id}`, tabindex: item.id === active ? 0 : -1,
      onClick: onActivate ? () => onActivate(item.id) : undefined, children: item.label,
    })) }),
    items.map((item) => jsx("section", { id: `${id}-panel-${item.id}`, class: "coco-tabs__panel", role: "tabpanel", "aria-labelledby": `${id}-tab-${item.id}`, hidden: item.id !== active, tabindex: 0, children: item.panel })),
  ] });
}

export interface DropdownMenuItem {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
  readonly danger?: boolean;
}

export interface DropdownMenuProps extends ClassProps {
  readonly label: string;
  readonly items: readonly DropdownMenuItem[];
  readonly open?: boolean;
  readonly align?: "start" | "end";
}

/**
 * Renders the Dropdown Menu server-first UI primitive with semantic markup and no required browser runtime.
 */
export function DropdownMenu({ label, items, open, align = "start", class: className }: DropdownMenuProps): CocoNode {
  return jsx("details", { class: classes("coco-dropdown", `coco-dropdown--${align}`, className), open, children: [
    jsx("summary", { children: [label, jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 16 }) })] }),
    jsx("nav", { class: "coco-dropdown__menu", "aria-label": label, children: items.map((item) => jsx("a", { href: item.href, class: item.danger ? "coco-dropdown__danger" : undefined, children: [jsx("strong", { children: item.label }), item.description ? jsx("small", { children: item.description }) : null] })) }),
  ] });
}

export interface NavigationItem {
  readonly label: string;
  readonly href: string;
  readonly current?: boolean;
}

export interface SiteHeaderProps extends ClassProps {
  readonly brand: CocoNode;
  readonly homeHref?: string;
  readonly items?: readonly NavigationItem[];
  readonly navigation?: CocoNode;
  readonly actions?: CocoNode;
  readonly menuButton?: CocoNode;
  readonly variant?: "standard" | "centered" | "split";
  readonly sticky?: boolean;
  readonly label?: string;
}

/**
 * Renders the Site Header server-first UI primitive with semantic markup and no required browser runtime.
 */
export function SiteHeader({ brand, homeHref = "/", items = [], navigation, actions, menuButton, variant = "standard", sticky = false, label = "Main navigation", class: className }: SiteHeaderProps): CocoNode {
  const navContent = navigation ?? items.map((item) => jsx("a", { href: item.href, "aria-current": item.current ? "page" : undefined, children: item.label }));
  return jsx("header", { class: classes("coco-site-header", `coco-site-header--${variant}`, sticky ? "coco-site-header--sticky" : undefined, className), children: jsx("div", { class: "coco-site-header__inner", children: [
    jsx("a", { class: "coco-site-header__brand", href: homeHref, children: brand }),
    jsx("nav", { class: "coco-site-header__nav", "aria-label": label, children: navContent }),
    actions ? jsx("div", { class: "coco-site-header__actions", children: actions }) : null,
    menuButton ? jsx("div", { class: "coco-site-header__menu", children: menuButton }) : null,
  ] }) });
}

export interface MegaMenuItem {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
  readonly icon?: CocoNode;
}

export interface MegaMenuGroup {
  readonly title: string;
  readonly items: readonly MegaMenuItem[];
}

export interface MegaMenuProps extends ClassProps {
  readonly label: string;
  readonly groups: readonly MegaMenuGroup[];
  readonly featured?: CocoNode;
  readonly open?: boolean;
  readonly align?: "start" | "center" | "end";
}

/**
 * Renders the Mega Menu server-first UI primitive with semantic markup and no required browser runtime.
 */
export function MegaMenu({ label, groups, featured, open, align = "center", class: className }: MegaMenuProps): CocoNode {
  return jsx("details", { class: classes("coco-mega-menu", `coco-mega-menu--${align}`, className), open, children: [
    jsx("summary", { children: [label, jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 16 }) })] }),
    jsx("div", { class: "coco-mega-menu__panel", children: [
      jsx("nav", { class: "coco-mega-menu__groups", "aria-label": label, children: groups.map((group) => jsx("section", { children: [
        jsx("h3", { children: group.title }),
        jsx("div", { children: group.items.map((item) => jsx("a", { href: item.href, children: [
          item.icon ? jsx("span", { class: "coco-mega-menu__icon", "aria-hidden": "true", children: item.icon }) : null,
          jsx("span", { children: [jsx("strong", { children: item.label }), item.description ? jsx("small", { children: item.description }) : null] }),
        ] })) }),
      ] })) }),
      featured ? jsx("aside", { class: "coco-mega-menu__featured", children: featured }) : null,
    ] }),
  ] });
}

export interface TooltipProps extends ClassProps {
  readonly id: string;
  readonly content: string;
  readonly placement?: "top" | "right" | "bottom" | "left";
}

/**
 * Renders the Tooltip server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Tooltip({ id, content, placement = "top", class: className, children }: TooltipProps): CocoNode {
  return jsx("span", { class: classes("coco-tooltip", `coco-tooltip--${placement}`, className), children: [
    jsx("span", { class: "coco-tooltip__trigger", tabindex: 0, "aria-describedby": id, children }),
    jsx("span", { id, class: "coco-tooltip__content", role: "tooltip", children: content }),
  ] });
}

export interface DetailsProps extends ClassProps {
  readonly summary: string;
  readonly open?: boolean;
}

/**
 * Renders the Details server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Details({ summary, open, class: className, children }: DetailsProps): CocoNode {
  return jsx("details", { class: classes("coco-details", className), open, children: [jsx("summary", { children: [jsx("span", { children: summary }), jsx("span", { class: "coco-disclosure-icon", "aria-hidden": "true", children: AltArrowDownIcon({ size: 18 }) })] }), jsx("div", { children })] });
}

export interface DialogProps extends ClassProps {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly open?: boolean;
  readonly size?: "small" | "medium" | "large";
  readonly footer?: CocoNode;
}

/**
 * Renders the Dialog server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Dialog({ id, title, description, open, size = "medium", footer, class: className, children }: DialogProps): CocoNode {
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;
  return jsx("dialog", { id, class: classes("coco-dialog", `coco-dialog--${size}`, className), open, "aria-labelledby": titleId, "aria-describedby": descriptionId, children: jsx("div", { class: "coco-dialog__surface", children: [
    jsx("header", { class: "coco-dialog__header", children: [jsx("h2", { id: titleId, children: title }), description ? jsx("p", { id: descriptionId, children: description }) : null] }),
    jsx("div", { class: "coco-dialog__body", children }),
    footer ? jsx("footer", { class: "coco-dialog__footer", children: footer }) : null,
  ] }) });
}

export interface BottomSheetProps extends ClassProps {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly open?: boolean;
  readonly footer?: CocoNode;
}

/**
 * Renders the Bottom Sheet server-first UI primitive with semantic markup and no required browser runtime.
 */
export function BottomSheet({ id, title, description, open, footer, class: className, children }: BottomSheetProps): CocoNode {
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;
  return jsx("dialog", { id, class: classes("coco-bottom-sheet", className), open, "aria-labelledby": titleId, "aria-describedby": descriptionId, children: jsx("div", { class: "coco-bottom-sheet__surface", children: [
    jsx("span", { class: "coco-bottom-sheet__handle", "aria-hidden": "true" }),
    jsx("header", { children: [jsx("h2", { id: titleId, children: title }), description ? jsx("p", { id: descriptionId, children: description }) : null] }),
    jsx("div", { class: "coco-bottom-sheet__body", children }),
    footer ? jsx("footer", { class: "coco-bottom-sheet__footer", children: footer }) : null,
  ] }) });
}

export interface OffcanvasProps extends ClassProps {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly side?: "left" | "right";
  readonly open?: boolean;
  readonly footer?: CocoNode;
}

/**
 * Renders the Offcanvas server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Offcanvas({ id, title, description, side = "left", open, footer, class: className, children }: OffcanvasProps): CocoNode {
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;
  return jsx("dialog", { id, class: classes("coco-offcanvas", `coco-offcanvas--${side}`, className), open, "aria-labelledby": titleId, "aria-describedby": descriptionId, children: jsx("div", { class: "coco-offcanvas__surface", children: [
    jsx("header", { class: "coco-offcanvas__header", children: [jsx("h2", { id: titleId, children: title }), description ? jsx("p", { id: descriptionId, children: description }) : null] }),
    jsx("div", { class: "coco-offcanvas__body", children }),
    footer ? jsx("footer", { class: "coco-offcanvas__footer", children: footer }) : null,
  ] }) });
}

export interface TableProps extends ClassProps {
  readonly headers: readonly CocoNode[];
  readonly rows: readonly (readonly CocoNode[])[];
  readonly caption?: string;
  readonly striped?: boolean;
}

/**
 * Renders the Table server-first UI primitive with semantic markup and no required browser runtime.
 */
export function Table({ headers, rows, caption, striped = false, class: className }: TableProps): CocoNode {
  return jsx("div", { class: "coco-table-wrap", children: jsx("table", { class: classes("coco-table", striped ? "coco-table--striped" : undefined, className), children: [
    caption ? jsx("caption", { children: caption }) : null,
    jsx("thead", { children: jsx("tr", { children: headers.map((header) => jsx("th", { scope: "col", children: header })) }) }),
    jsx("tbody", { children: rows.map((row) => jsx("tr", { children: row.map((cell) => jsx("td", { children: cell })) })) }),
  ] }) });
}

/**
 * Renders the Visually Hidden server-first UI primitive with semantic markup and no required browser runtime.
 */
export function VisuallyHidden({ class: className, children }: ClassProps): CocoNode {
  return jsx("span", { class: classes("coco-visually-hidden", className), children });
}

/**
 * Provides the public ui Components API for @cocoframe/ui.
 */
export const uiComponents = [
  "Accordion", "Alert", "AlertDialog", "AppShell", "AspectRatio", "Attachment", "Avatar", "Badge", "BottomNavigation", "BottomSheet", "Breadcrumb", "Bubble", "Button", "ButtonGroup", "Calendar", "Card", "Carousel", "Chart", "Checkbox", "Citation", "Code", "Collapsible", "Combobox", "Command", "Container", "ContextMenu", "DataTable", "DatePicker", "DateRangePicker", "Details", "Dialog", "Direction", "Divider", "DropdownMenu", "EmptyState", "FileUpload", "FilterBar", "FormField", "Grid", "Heading", "HoverCard", "IconButton", "IconInput", "Inline", "Input", "InputGroup", "InputOtp", "Item", "Kbd", "Label", "LiveRegion", "Marker", "MegaMenu", "Menubar", "Message", "MessageScroller", "MultiSelect", "NavigationMenu", "NumberField", "Offcanvas", "PageHeader", "Pagination", "Popover", "Progress", "PromptComposer", "Questionnaire", "RadioGroup", "Resizable", "SafeArea", "ScrollArea", "SearchField", "Select", "Sidebar", "SiteHeader", "Skeleton", "SkipLink", "Slider", "Spinner", "Stack", "Stat", "Stepper", "Switch", "SyntaxHighlighter", "Table", "Tabs", "Text", "Textarea", "Theme", "ThinkingIndicator", "Toast", "Toaster", "Toggle", "ToggleGroup", "Toolbar", "Tooltip", "TreeView", "VisuallyHidden",
] as const;

function classes(...values: readonly (string | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
