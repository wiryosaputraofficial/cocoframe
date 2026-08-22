import { defineLayout } from "@cocoframe/core";
import BookIcon from "@cocoframe/icons/linear/book-2";
import CodeIcon from "@cocoframe/icons/linear/code-square";
import DocumentIcon from "@cocoframe/icons/linear/document-text";
import RouteIcon from "@cocoframe/icons/linear/routing-2";
import SettingsIcon from "@cocoframe/icons/linear/settings";
import { Badge, Sidebar } from "@cocoframe/ui";

export default defineLayout(({ children }) => (
  <div class="docs-shell">
    <Sidebar brand={<a class="docs-brand" href="/"><BookIcon size={24} /> <span>Atlas Docs</span></a>} groups={[
      { label: "Getting started", items: [{ label: "Introduction", href: "#introduction", current: true, icon: <DocumentIcon size={17} /> }, { label: "Installation", href: "#installation", icon: <CodeIcon size={17} /> }] },
      { label: "Core concepts", items: [{ label: "Routing", href: "#routing", icon: <RouteIcon size={17} /> }, { label: "Configuration", href: "#configuration", icon: <SettingsIcon size={17} />, badge: <Badge variant="success">New</Badge> }] },
    ]} footer={<a href="/api/health">API status</a>} />
    <div class="docs-main">{children}</div>
  </div>
));