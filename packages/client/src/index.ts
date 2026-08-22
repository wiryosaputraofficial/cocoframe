import { jsx, type Component, type CocoBinding, type CocoDeferred, type CocoElement, type CocoNode, type PrimitiveNode, type RawHtml } from "@cocoframe/jsx";

let islandAssetUrls: Readonly<Record<string, string>> = {};
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

type DomNamespace = "html" | "svg";

export function configureIslandAssets(assets: Readonly<Record<string, string>>): void {
  islandAssetUrls = Object.freeze({ ...assets });
}

export type Unsubscribe = () => void;
export type Subscriber<T> = (value: T, previous: T) => void;

interface Trackable {
  subscribe(subscriber: () => void): Unsubscribe;
}

let activeCollector: Set<Trackable> | null = null;

export interface Signal<T> {
  value: T;
  readonly peek: () => T;
  readonly subscribe: (subscriber: Subscriber<T>) => Unsubscribe;
}

export function signal<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;
  const subscribers = new Set<Subscriber<T>>();
  const trackable: Trackable = {
    subscribe(subscriber) {
      const wrapped = () => subscriber();
      subscribers.add(wrapped);
      return () => subscribers.delete(wrapped);
    },
  };

  return {
    get value() {
      activeCollector?.add(trackable);
      return currentValue;
    },
    set value(nextValue: T) {
      if (Object.is(currentValue, nextValue)) return;
      const previous = currentValue;
      currentValue = nextValue;
      for (const subscriber of [...subscribers]) subscriber(currentValue, previous);
    },
    peek: () => currentValue,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
  };
}

export interface ReadonlySignal<T> {
  readonly value: T;
  readonly peek: () => T;
  readonly subscribe: (subscriber: Subscriber<T>) => Unsubscribe;
}

export function computed<T>(compute: () => T): ReadonlySignal<T> {
  let initialized = false;
  let currentValue: T;
  let dependencies = new Set<Trackable>();
  const dependencyCleanups = new Map<Trackable, Unsubscribe>();
  const subscribers = new Set<Subscriber<T>>();

  const synchronizeDependencies = () => {
    for (const [dependency, cleanup] of dependencyCleanups) {
      if (!dependencies.has(dependency)) {
        cleanup();
        dependencyCleanups.delete(dependency);
      }
    }
    for (const dependency of dependencies) {
      if (!dependencyCleanups.has(dependency)) {
        dependencyCleanups.set(dependency, dependency.subscribe(refresh));
      }
    }
  };

  const evaluate = (): T => {
    const previousCollector = activeCollector;
    const nextDependencies = new Set<Trackable>();
    activeCollector = nextDependencies;
    try {
      currentValue = compute();
      initialized = true;
      dependencies = nextDependencies;
    } finally {
      activeCollector = previousCollector;
    }
    if (subscribers.size > 0) synchronizeDependencies();
    return currentValue;
  };

  function refresh(): void {
    const previous = currentValue;
    const next = evaluate();
    if (!Object.is(next, previous)) {
      for (const subscriber of [...subscribers]) subscriber(next, previous);
    }
  }

  const subscribe = (subscriber: Subscriber<T>): Unsubscribe => {
    if (subscribers.size === 0) evaluate();
    subscribers.add(subscriber);
    if (subscribers.size === 1) synchronizeDependencies();
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        for (const cleanup of dependencyCleanups.values()) cleanup();
        dependencyCleanups.clear();
        initialized = false;
      }
    };
  };

  const trackable: Trackable = {
    subscribe(subscriber) {
      return subscribe(() => subscriber());
    },
  };

  return {
    get value() {
      activeCollector?.add(trackable);
      return subscribers.size > 0 && initialized ? currentValue : evaluate();
    },
    peek: () => subscribers.size > 0 && initialized ? currentValue : evaluate(),
    subscribe,
  };
}

export function bind(source: ReadonlySignal<PrimitiveNode> & { subscribe?: (subscriber: () => void) => Unsubscribe }): CocoBinding {
  return {
    kind: "binding",
    read: () => source.value,
    ...(source.subscribe ? { subscribe: (subscriber: () => void) => source.subscribe?.(subscriber) ?? (() => {}) } : {}),
  };
}

export type IslandSetup<Props> = (props: Readonly<Props>) => () => CocoNode;
export type IslandEnhance<Props> = (root: Element, props: Readonly<Props>) => void | Promise<void>;

export interface IslandOptions<Props> {
  readonly name: string;
  readonly setup: IslandSetup<Props>;
  readonly enhance?: IslandEnhance<Props>;
}

export interface IslandComponent<Props> extends Component<Props> {
  readonly islandName: string;
  readonly mount: (root: Element, props: Props) => Promise<void>;
}

export function defineIsland<Props extends Record<string, unknown>>(
  options: IslandOptions<Props>,
): IslandComponent<Props> {
  if (!/^[a-z][a-z0-9-]*$/.test(options.name)) {
    throw new TypeError(`Island name must use lowercase letters, numbers, and dashes: ${options.name}`);
  }

  const component = ((props: Props & { children?: CocoNode }) => {
    const serializedProps = serializeProps(props);
    const view = options.setup(props);
    return jsx("coco-island", {
      "data-coco-module": islandAssetUrls[options.name] ?? `/coco-assets/islands/${options.name}.js`,
      "data-coco-props": serializedProps,
      children: view(),
    });
  }) as IslandComponent<Props>;

  Object.defineProperties(component, {
    islandName: { value: options.name, enumerable: true },
    mount: { value: async (root: Element, props: Props) => {
      if (options.enhance) {
        await options.enhance(root, props);
        return;
      }
      await mountReactive(root, options.setup(props));
    } },
  });
  return component;
}

export async function mountReactive(root: Element, view: () => CocoNode): Promise<void> {
  let cleanups: Unsubscribe[] = [];
  let scheduled = false;
  let rendering = false;

  const update = async () => {
    if (rendering) {
      scheduled = true;
      return;
    }
    rendering = true;
    scheduled = false;
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
    const dependencies = new Set<Trackable>();
    activeCollector = dependencies;
    let node: CocoNode;
    try {
      node = view();
    } finally {
      activeCollector = null;
    }
    const dom = await renderToDom(node, root.ownerDocument, cleanups);
    root.replaceChildren(dom);
    cleanups.push(...[...dependencies].map((dependency) => dependency.subscribe(() => schedule())));
    rendering = false;
    if (scheduled) await update();
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => void update());
  };

  await update();
}

export async function renderToDom(node: unknown, document: Document, cleanups: Unsubscribe[] = [], namespace: DomNamespace = "html"): Promise<Node> {
  const resolved: unknown = await node;
  if (resolved === null || resolved === undefined || typeof resolved === "boolean") return document.createDocumentFragment();
  if (typeof resolved === "string" || typeof resolved === "number" || typeof resolved === "bigint") {
    return document.createTextNode(String(resolved));
  }
  if (Array.isArray(resolved)) {
    const fragment = document.createDocumentFragment();
    for (const child of resolved) fragment.append(await renderToDom(child, document, cleanups, namespace));
    return fragment;
  }
  if (!isRenderedObject(resolved)) throw new TypeError("Unsupported island render result");
  if (resolved.kind === "raw") {
    if (namespace === "svg") {
      const wrapper = document.createElementNS(SVG_NAMESPACE, "svg");
      wrapper.innerHTML = resolved.value;
      const fragment = document.createDocumentFragment();
      while (wrapper.firstChild) fragment.append(wrapper.firstChild);
      return fragment;
    }
    const template = document.createElement("template");
    template.innerHTML = resolved.value;
    return template.content;
  }
  if (resolved.kind === "binding") {
    const text = document.createTextNode(String(resolved.read() ?? ""));
    if (resolved.subscribe) cleanups.push(resolved.subscribe(() => { text.data = String(resolved.read() ?? ""); }));
    return text;
  }
  if (resolved.kind === "deferred") return renderToDom(resolved.content, document, cleanups, namespace);

  const elementNamespace: DomNamespace = namespace === "svg" || resolved.tag === "svg" ? "svg" : "html";
  const element = elementNamespace === "svg"
    ? document.createElementNS(SVG_NAMESPACE, resolved.tag)
    : document.createElement(resolved.tag);
  for (const [sourceName, value] of Object.entries(resolved.props)) {
    if (sourceName === "children" || sourceName === "key" || value === null || value === undefined || value === false) continue;
    if (/^on[A-Z]/.test(sourceName) && typeof value === "function") {
      element.addEventListener(sourceName.slice(2).toLowerCase(), value as EventListener);
      continue;
    }
    const name = sourceName === "className" ? "class" : sourceName === "htmlFor" ? "for" : sourceName;
    if (name === "style" && typeof value === "object") Object.assign((element as HTMLElement).style, value);
    else if (value === true) element.setAttribute(name, "");
    else element.setAttribute(name, String(value));
  }
  const childNamespace: DomNamespace = elementNamespace === "svg" && resolved.tag !== "foreignObject" ? "svg" : "html";
  element.append(await renderToDom(resolved.props.children, document, cleanups, childNamespace));
  return element;
}

function serializeProps(props: Record<string, unknown>): string {
  try {
    return JSON.stringify(props).replaceAll("<", "\\u003c");
  } catch (error) {
    throw new TypeError(`Island props must be JSON-serializable: ${error instanceof Error ? error.message : "unknown value"}`);
  }
}

function isRenderedObject(value: unknown): value is CocoElement | RawHtml | CocoBinding | CocoDeferred {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "element" || kind === "raw" || kind === "binding" || kind === "deferred";
}
