import { defineLayout } from "@cocoframe/core";
import BoxMinimalisticIcon from "@cocoframe/icons/linear/box-minimalistic";

export default defineLayout(({ children }) => (
  <>
    <header class="site-header">
      <a href="/" class="brand"><BoxMinimalisticIcon size={24} label="CocoFrame" /> <span>CocoFrame</span></a>
      <nav aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/api/health">API</a>
      </nav>
    </header>
    {children}
  </>
));