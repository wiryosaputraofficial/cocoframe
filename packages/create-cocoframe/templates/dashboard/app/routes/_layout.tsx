import { defineLayout } from "@cocoframe/core";
import ChartIcon from "@cocoframe/icons/linear/graph-up";
import HomeIcon from "@cocoframe/icons/linear/home";
import SettingsIcon from "@cocoframe/icons/linear/settings";
import UsersIcon from "@cocoframe/icons/linear/users-group-rounded";
import WidgetIcon from "@cocoframe/icons/linear/widget-4";
import { Badge, Sidebar } from "@cocoframe/ui";

export default defineLayout(({ children }) => (
  <div class="dashboard-shell">
    <Sidebar
      brand={<a class="dashboard-brand" href="/"><WidgetIcon size={24} /> <span>Orbit Admin</span></a>}
      groups={[{ label: "Workspace", items: [
        { label: "Overview", href: "/", current: true, icon: <HomeIcon size={18} /> },
        { label: "Analytics", href: "#analytics", icon: <ChartIcon size={18} /> },
        { label: "Customers", href: "#customers", icon: <UsersIcon size={18} />, badge: <Badge variant="success">24</Badge> },
        { label: "Settings", href: "#settings", icon: <SettingsIcon size={18} /> },
      ] }]}
      footer={<small>Server-rendered with CocoFrame</small>}
    />
    <div class="dashboard-main">{children}</div>
  </div>
));