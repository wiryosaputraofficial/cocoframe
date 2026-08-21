import { defineIsland } from "@cocoframe/client";
import MagnifierIcon from "@cocoframe/icons/linear/magnifier";
import { tokenizeSyntax } from "@cocoframe/ui/syntax";

interface IconExplorerProps extends Record<string, unknown> {
  readonly initialSearch: string;
  readonly initialVisible: number;
  readonly initialIcon: string;
  readonly total: number;
}

export default defineIsland<IconExplorerProps>({
  name: "icon-explorer",
  setup: ({ initialSearch, initialVisible, total }) => () => <div class="icons-catalog-bar">
    <div><span class="eyebrow">ICON CATALOG</span><h2 class="icons-live-heading" id="icon-catalog-title">{initialSearch ? `Hasil untuk “${initialSearch}”` : "All Solar Linear icons"}</h2><p role="status" aria-live="polite"><strong class="icons-live-count">{initialVisible.toLocaleString("id-ID")}</strong> dari {total.toLocaleString("id-ID")} ikon ditampilkan.</p></div>
    <form class="icons-search" method="get" action="/icons"><label for="icon-search">Cari berdasarkan nama ikon</label><div><span aria-hidden="true"><MagnifierIcon size={18} /></span><input id="icon-search" name="q" type="search" value={initialSearch} placeholder="Contoh: arrow, user, wallet..." autocomplete="off" /><button type="submit">Search</button></div></form>
  </div>,
  enhance: (root, props) => {
    const document = root.ownerDocument;
    const window = document.defaultView;
    const input = root.querySelector<HTMLInputElement>("#icon-search");
    const form = root.querySelector<HTMLFormElement>(".icons-search");
    const count = root.querySelector<HTMLElement>(".icons-live-count");
    const heading = root.querySelector<HTMLElement>(".icons-live-heading");
    const empty = document.querySelector<HTMLElement>(".icons-live-empty");
    const cards = [...document.querySelectorAll<HTMLElement>(".icon-catalog-card[data-icon-name]")];
    const dialog = document.querySelector<HTMLDialogElement>("#icon-usage-modal");
    let lastTrigger: HTMLAnchorElement | null = null;

    const applySearch = (rawQuery: string, updateUrl: boolean) => {
      const query = rawQuery.trim().toLowerCase();
      let visible = 0;
      for (const card of cards) {
        const matches = !query || (card.dataset.iconName ?? "").includes(query);
        card.hidden = !matches;
        if (matches) visible++;
      }
      if (count) count.textContent = visible.toLocaleString("id-ID");
      if (heading) heading.textContent = query ? `Hasil untuk “${query}”` : "All Solar Linear icons";
      if (empty) empty.hidden = visible > 0;
      if (updateUrl && window) {
        const url = new URL(window.location.href);
        if (query) url.searchParams.set("q", query);
        else url.searchParams.delete("q");
        url.searchParams.delete("icon");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    };

    input?.addEventListener("input", () => applySearch(input.value, true));
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      applySearch(input?.value ?? "", true);
    });
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const trigger = target?.closest<HTMLAnchorElement>("[data-icon-trigger]");
      if (trigger && dialog) {
        event.preventDefault();
        const name = trigger.dataset.iconName ?? "icon";
        const displayName = trigger.dataset.iconLabel ?? name;
        const importPath = `@cocoframe/icons/linear/${name}`;
        const snippet = `import ${componentName(name)} from "${importPath}";\n\n<${componentName(name)} label="${displayName}" size={24} />`;
        const preview = dialog.querySelector<HTMLElement>("[data-modal-preview]");
        const sourceIcon = trigger.querySelector("svg");
        preview?.replaceChildren(...(sourceIcon ? [sourceIcon.cloneNode(true)] : []));
        setText(dialog, "[data-modal-title]", displayName);
        setText(dialog, "[data-modal-path]", importPath);
        setHighlightedCode(dialog, snippet);
        lastTrigger = trigger;
        if (dialog.open) dialog.close();
        dialog.showModal();
        updateIconUrl(document, name);
        return;
      }

      if (target?.closest("[data-modal-close]") && dialog?.open) dialog.close();
      const copy = target?.closest<HTMLButtonElement>("[data-modal-copy]");
      if (copy && dialog && window) {
        const snippet = dialog.querySelector("[data-modal-snippet] code")?.textContent ?? "";
        void window.navigator.clipboard?.writeText(snippet).then(() => {
          copy.textContent = "Copied!";
          window.setTimeout(() => { copy.textContent = "Copy code"; }, 1500);
        }).catch(() => { copy.textContent = "Copy failed"; });
      }
    });

    dialog?.addEventListener("close", () => {
      updateIconUrl(document);
      lastTrigger?.focus();
    });
    applySearch(props.initialSearch, false);
    if (props.initialIcon && dialog?.open) {
      dialog.close();
      dialog.showModal();
      updateIconUrl(document, props.initialIcon);
    }
  },
});

function componentName(name: string): string {
  return `${name.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("")}Icon`;
}

function setText(root: ParentNode, selector: string, value: string): void {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}

function setHighlightedCode(root: ParentNode, value: string): void {
  const code = root.querySelector("[data-modal-snippet] code");
  if (!code) return;
  const document = code.ownerDocument;
  const fragment = document.createDocumentFragment();
  for (const token of tokenizeSyntax(value, "tsx")) {
    if (token.kind === "plain") fragment.append(document.createTextNode(token.value));
    else {
      const span = document.createElement("span");
      span.className = `coco-token coco-token--${token.kind}`;
      span.textContent = token.value;
      fragment.append(span);
    }
  }
  code.replaceChildren(fragment);
}

function updateIconUrl(document: Document, icon?: string): void {
  const window = document.defaultView;
  if (!window) return;
  const url = new URL(window.location.href);
  if (icon) url.searchParams.set("icon", icon);
  else url.searchParams.delete("icon");
  const hash = icon ? "#icon-usage-modal" : url.hash === "#icon-usage-modal" ? "#icon-catalog" : url.hash;
  window.history.replaceState(null, "", `${url.pathname}${url.search}${hash}`);
}
