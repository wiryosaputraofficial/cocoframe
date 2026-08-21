export type PrimitiveNode = string | number | bigint | boolean | null | undefined;

export type CocoNode =
  | PrimitiveNode
  | CocoElement
  | RawHtml
  | CocoBinding
  | CocoDeferred
  | Promise<unknown>
  | readonly CocoNode[];

export interface CocoElement {
  readonly kind: "element";
  readonly tag: string;
  readonly props: Readonly<Record<string, unknown>>;
}

export interface RawHtml {
  readonly kind: "raw";
  readonly value: string;
}

export interface CocoBinding {
  readonly kind: "binding";
  readonly read: () => PrimitiveNode;
  readonly subscribe?: (subscriber: () => void) => () => void;
}

export interface CocoDeferred {
  readonly kind: "deferred";
  readonly content: Promise<unknown>;
  readonly fallback: CocoNode;
}

export type Component<Props = Record<string, unknown>> = (
  props: Props & { children?: CocoNode },
) => CocoNode;

export const Fragment = Symbol.for("fast.fragment");

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const BOOLEAN_ATTRIBUTES = new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
]);

const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  className: "class",
  htmlFor: "for",
  httpEquiv: "http-equiv",
};

export function raw(value: string): RawHtml {
  return { kind: "raw", value };
}

export function defer(content: Promise<unknown>, fallback: CocoNode): CocoDeferred {
  return { kind: "deferred", content, fallback };
}

export function escapeText(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function escapeAttribute(value: unknown): string {
  return escapeText(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function jsx<Props extends object = Record<string, unknown>>(
  type: string | Component<Props> | typeof Fragment,
  inputProps: (Props & { children?: CocoNode }) | null,
): CocoNode {
  const props = (inputProps ?? {}) as Props & { children?: CocoNode };

  if (type === Fragment) {
    return (props.children ?? null) as CocoNode;
  }

  if (typeof type === "function") {
    return type(props as Props & { children?: CocoNode });
  }

  if (!/^[A-Za-z][A-Za-z0-9:_-]*$/.test(type)) {
    throw new TypeError(`Invalid HTML element name: ${type}`);
  }

  return { kind: "element", tag: type, props: props as Record<string, unknown> };
}

export const jsxs = jsx;

export interface RenderOptions {
  readonly onElement?: (tag: string) => void;
  readonly onDeferred?: (content: Promise<unknown>) => string;
}

export async function renderToString(node: CocoNode, options: RenderOptions = {}): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of renderToChunks(node, options)) chunks.push(chunk);
  return chunks.join("");
}

export async function* renderToChunks(node: unknown, options: RenderOptions = {}): AsyncGenerator<string> {
  const resolved: unknown = await node;

  if (resolved === null || resolved === undefined || typeof resolved === "boolean") {
    return;
  }

  if (typeof resolved === "string" || typeof resolved === "number" || typeof resolved === "bigint") {
    yield escapeText(resolved);
    return;
  }

  if (Array.isArray(resolved)) {
    for (const child of resolved) {
      yield* renderToChunks(child, options);
    }
    return;
  }

  if (!isRenderedObject(resolved)) {
    throw new TypeError(`Unsupported component result: ${Object.prototype.toString.call(resolved)}`);
  }

  if (resolved.kind === "raw") {
    yield resolved.value;
    return;
  }

  if (resolved.kind === "binding") {
    yield escapeText(resolved.read());
    return;
  }
  if (resolved.kind === "deferred") {
    if (!options.onDeferred) {
      yield* renderToChunks(resolved.content, options);
      return;
    }
    const id = options.onDeferred(resolved.content);
    const fallback = await renderToString(resolved.fallback, options);
    yield `<coco-stream data-coco-stream="${escapeAttribute(id)}">${fallback}</coco-stream>`;
    return;
  }

  options.onElement?.(resolved.tag);
  const opening: string[] = ["<", resolved.tag];
  renderAttributes(resolved.props, opening);
  opening.push(">");
  yield opening.join("");

  if (!VOID_ELEMENTS.has(resolved.tag.toLowerCase())) {
    yield* renderToChunks((resolved.props.children ?? null) as CocoNode, options);
    yield `</${resolved.tag}>`;
  }
}

function isRenderedObject(value: unknown): value is CocoElement | RawHtml | CocoBinding | CocoDeferred {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "element" || kind === "raw" || kind === "binding" || kind === "deferred";
}

function renderAttributes(props: Readonly<Record<string, unknown>>, chunks: string[]): void {
  for (const [sourceName, value] of Object.entries(props)) {
    if (
      sourceName === "children" ||
      sourceName === "key" ||
      value === null ||
      value === undefined ||
      value === false ||
      /^on[A-Z]/.test(sourceName)
    ) {
      continue;
    }

    const name = ATTRIBUTE_ALIASES[sourceName] ?? sourceName;
    if (!/^[A-Za-z_:][A-Za-z0-9:._-]*$/.test(name)) {
      throw new TypeError(`Invalid HTML attribute name: ${name}`);
    }

    if (BOOLEAN_ATTRIBUTES.has(name.toLowerCase()) && value === true) {
      chunks.push(" ", name);
      continue;
    }

    const serialized = name === "style" && isStyleObject(value) ? serializeStyle(value) : String(value);
    chunks.push(" ", name, '="', escapeAttribute(serialized), '"');
  }
}

function isStyleObject(value: unknown): value is Record<string, string | number> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeStyle(style: Record<string, string | number>): string {
  return Object.entries(style)
    .map(([property, value]) => `${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}`)
    .join(";");
}

export namespace JSX {
  export type Element = CocoNode;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicAttributes {
    key?: string | number;
  }
  export interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}
