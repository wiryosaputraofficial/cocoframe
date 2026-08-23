import { defineIsland } from "@cocoframe/client";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import HamburgerMenuIcon from "@cocoframe/icons/linear/hamburger-menu";

export default defineIsland<{ active: "home" | "features" | "docs" | "cocoql" | "components" | "icons" | "templates" | "none" }>({
  name: "site-header",
  setup: ({ active }) => () => (
    <header class="site-header">
      <a class="brand" href="/#top" aria-label="CocoFrame home"><img src="/assets/cocoframe-icon.png" alt="" /><span>cocoframe</span></a>
      <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" onClick={(event: Event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const nav = button.parentElement?.querySelector(".main-nav");
        const open = nav?.classList.toggle("open") ?? false;
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      }}><HamburgerMenuIcon size={24} /></button>
      <nav class="main-nav" aria-label="Primary navigation" onClick={(event: Event) => {
        if (!(event.target instanceof HTMLAnchorElement)) return;
        const nav = event.currentTarget as HTMLElement;
        nav.classList.remove("open");
        nav.parentElement?.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
      }}>
        <a class={active === "home" ? "active" : undefined} href="/">Home</a>
        <a class={active === "features" ? "active" : undefined} href="/features">Features</a>
        <a class={active === "docs" ? "active" : undefined} href="/docs">Docs</a>
        <a class={active === "cocoql" ? "active" : undefined} aria-current={active === "cocoql" ? "page" : undefined} href="/cocoql">CocoQL</a>
        <a class={active === "components" ? "active" : undefined} href="/components">Components</a>
        <a class={active === "icons" ? "active" : undefined} aria-current={active === "icons" ? "page" : undefined} href="/icons">Icons</a>
        <a class={active === "templates" ? "active" : undefined} href="/templates">Templates</a>
      </nav>
      <div class="header-actions"><a class="github-link" href="/docs#contributing" aria-label="Source and contribution guide"><CodeSquareIcon size={18} /></a><a class="button button-ghost button-small" href="/docs#api-reference">API Reference</a><a class="button button-primary button-small" href="/docs#quick-start">Get Started</a></div>
    </header>
  ),
});
