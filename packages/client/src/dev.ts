interface DevelopmentErrorPayload {
  readonly type?: string;
  readonly message: string;
  readonly stack?: string;
  readonly phase?: string;
  readonly source?: string;
  readonly file?: string;
  readonly line?: string | number;
  readonly column?: string | number;
}

interface RuntimeErrorDetail {
  readonly error?: unknown;
  readonly phase?: string;
  readonly source?: string;
}

const scope = globalThis as typeof globalThis & { __cocoframeDevEvents?: EventSource };

function errorPayload(error: unknown, phase = "browser execution", source?: string): DevelopmentErrorPayload {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      message: error.message || "Unknown error",
      ...(error.stack ? { stack: error.stack } : {}),
      phase,
      ...(source ? { source } : {}),
    };
  }
  return { type: "Error", message: String(error ?? "Unknown error"), phase, ...(source ? { source } : {}) };
}

function locationFrom(payload: DevelopmentErrorPayload): { source: string; line: string; column: string } {
  const frame = payload.stack?.split(/\r?\n/).slice(1)
    .map((value) => {
      const line = value.trim();
      return /\((.+):(\d+):(\d+)\)$/.exec(line) ?? /(?:at\s+)?(.+):(\d+):(\d+)$/.exec(line);
    })
    .find(Boolean);
  return {
    source: payload.file ?? payload.source ?? frame?.[1] ?? "Unavailable",
    line: String(payload.line ?? frame?.[2] ?? "—"),
    column: String(payload.column ?? frame?.[3] ?? "—"),
  };
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function closeOverlay(root: Element): void {
  root.remove();
  if (!document.querySelector("[data-coco-dev-overlay]")) document.body.classList.remove("coco-dev-overlay-open");
}

function wireOverlay(root: HTMLElement, copyText?: string): void {
  if (root.dataset.cocoDevWired !== undefined) return;
  root.dataset.cocoDevWired = "";
  document.body.classList.add("coco-dev-overlay-open");

  root.querySelector<HTMLElement>("[data-coco-dev-close]")?.addEventListener("click", () => closeOverlay(root));
  root.querySelector<HTMLElement>("[data-coco-dev-reload]")?.addEventListener("click", () => location.reload());
  const copy = root.querySelector<HTMLButtonElement>("[data-coco-dev-copy]");
  copy?.addEventListener("click", async () => {
    const value = copyText ?? root.querySelector(".coco-dev-overlay__stack")?.textContent ?? root.textContent ?? "";
    await navigator.clipboard?.writeText(value);
    copy.textContent = "Copied";
    setTimeout(() => { copy.textContent = "Copy error"; }, 1600);
  });
  root.querySelector<HTMLElement>("[data-coco-dev-close]")?.focus();
}

function showDevelopmentError(payload: DevelopmentErrorPayload): void {
  document.querySelector("[data-coco-dev-overlay]")?.remove();
  const type = payload.type || "Error";
  const message = payload.message || "Unknown error";
  const stack = payload.stack || `${type}: ${message}`;
  const phase = payload.phase || "browser execution";
  const location = locationFrom(payload);

  const root = element("div", "coco-dev-overlay");
  root.dataset.cocoDevOverlay = "";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "coco-dev-error-title");
  const surface = element("div", "coco-dev-overlay__surface");

  const topbar = element("div", "coco-dev-overlay__topbar");
  topbar.append(element("p", "coco-dev-overlay__eyebrow", "Unhandled Runtime Error"));
  const topActions = element("div", "coco-dev-overlay__top-actions");
  topActions.append(element("span", "coco-dev-overlay__mode", "Development Mode"));
  const close = element("button", "coco-dev-overlay__close", "×");
  close.type = "button";
  close.dataset.cocoDevClose = "";
  close.setAttribute("aria-label", "Close error overlay");
  topActions.append(close);
  topbar.append(topActions);

  const heading = element("header", "coco-dev-overlay__heading");
  const title = element("h1", undefined, `${type}: ${message}`);
  title.id = "coco-dev-error-title";
  heading.append(title, element("p", undefined, `This error occurred during ${phase}.`));

  const layout = element("div", "coco-dev-overlay__layout");
  const stackPanel = element("div", "coco-dev-overlay__panel");
  const panelHeader = element("div", "coco-dev-overlay__panel-header");
  panelHeader.append(element("strong", undefined, location.source), element("code", undefined, `${location.line}:${location.column}`));
  const stackElement = element("pre", "coco-dev-overlay__stack", stack);
  const frames = element("ol", "coco-dev-overlay__frames");
  const stackFrames = stack.split(/\r?\n/).slice(1).map((frame) => frame.trim()).filter(Boolean).slice(0, 8);
  for (const [index, frame] of (stackFrames.length > 0 ? stackFrames : ["No call stack is available."]).entries()) {
    const item = element("li");
    item.dataset.index = String(index + 1);
    item.append(element("code", undefined, frame));
    frames.append(item);
  }
  stackPanel.append(panelHeader, stackElement, frames);

  const sidebar = element("aside", "coco-dev-overlay__panel coco-dev-overlay__sidebar");
  const infoSection = element("section");
  infoSection.append(element("h2", undefined, "Error Info"));
  const info = element("dl", "coco-dev-overlay__info");
  for (const [label, value] of [["Type", type], ["Message", message], ["Phase", phase], ["File", location.source], ["Line", location.line], ["Column", location.column]]) {
    info.append(element("dt", undefined, label), element("dd", undefined, value));
  }
  infoSection.append(info);
  const helpSection = element("section");
  helpSection.append(element("h2", undefined, "Helpful Links"));
  const help = element("nav", "coco-dev-overlay__help");
  help.setAttribute("aria-label", "Error help");
  const helpLinks: readonly (readonly [string, string])[] = [
    ["CocoFrame error handling ↗", "/docs#error-handling"],
    ["Development guide ↗", "/docs#development"],
    [`MDN: ${type} ↗`, `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/${encodeURIComponent(type)}`],
  ];
  for (const [label, href] of helpLinks) {
    const link = element("a", undefined, label);
    link.href = href;
    help.append(link);
  }
  helpSection.append(help);
  sidebar.append(infoSection, helpSection);
  layout.append(stackPanel, sidebar);

  const footer = element("footer", "coco-dev-overlay__footer");
  footer.append(element("p", undefined, "This error overlay is only visible in development. Press ESC to dismiss."));
  const actions = element("div", "coco-dev-overlay__actions");
  const copy = element("button", "coco-dev-overlay__action", "Copy error");
  copy.type = "button";
  copy.dataset.cocoDevCopy = "";
  const reload = element("button", "coco-dev-overlay__action coco-dev-overlay__action--primary", "Reload page");
  reload.type = "button";
  reload.dataset.cocoDevReload = "";
  actions.append(copy, reload);
  footer.append(actions);

  surface.append(topbar, heading, layout, footer);
  root.append(surface);
  document.body.append(root);
  wireOverlay(root, stack);
}

document.querySelectorAll<HTMLElement>("[data-coco-dev-overlay]").forEach((root) => wireOverlay(root));

addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const root = document.querySelector("[data-coco-dev-overlay]");
    if (root) closeOverlay(root);
  }
});

addEventListener("cocoframe:runtime-error", (event) => {
  const detail = (event as CustomEvent<RuntimeErrorDetail>).detail;
  showDevelopmentError(errorPayload(detail?.error, detail?.phase, detail?.source));
});

addEventListener("error", (event) => {
  if (event instanceof ErrorEvent && (event.error || event.message)) {
    const payload = errorPayload(event.error ?? new Error(event.message));
    showDevelopmentError({ ...payload, file: event.filename, line: event.lineno, column: event.colno });
  }
});

addEventListener("unhandledrejection", (event) => {
  showDevelopmentError(errorPayload((event as PromiseRejectionEvent).reason, "promise execution"));
});

// A development document owns one reload channel. Closing an older channel also
// keeps browser consoles quiet when the client entry is evaluated more than once.
scope.__cocoframeDevEvents?.close();
const events = new EventSource("/coco-assets/events");
scope.__cocoframeDevEvents = events;

events.addEventListener("message", (event) => {
  if (event.data === "reload") location.reload();
});

events.addEventListener("build-error", (event) => {
  try {
    showDevelopmentError(JSON.parse((event as MessageEvent<string>).data) as DevelopmentErrorPayload);
  } catch {
    showDevelopmentError({ message: "The development build failed.", phase: "building" });
  }
});

// EventSource reconnects automatically. A disconnect during a rebuild is normal
// development behavior, so it must not be reported as an application error.
events.addEventListener("error", () => {});

addEventListener("pagehide", () => {
  events.close();
  if (scope.__cocoframeDevEvents === events) delete scope.__cocoframeDevEvents;
}, { once: true });
