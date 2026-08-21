import { defineLayout } from "@cocoframe/core";

export default defineLayout(({ children }) => (
  <>
    <header class="site-header">
      <a href="/" class="brand">CocoFrame</a>
      <nav aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/api/health">API</a>
      </nav>
    </header>
    {children}
  </>
));