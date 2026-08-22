import { definePage } from "@cocoframe/core";
import BellIcon from "@cocoframe/icons/linear/bell";
import CalendarIcon from "@cocoframe/icons/linear/calendar";
import GraphUpIcon from "@cocoframe/icons/linear/graph-up";
import MagnifierIcon from "@cocoframe/icons/linear/magnifier";
import { Badge, Card, Chart, DataTable, Heading, Inline, Stat, Text } from "@cocoframe/ui";

const rows = [
  { customer: "Acme Studio", plan: "Growth", status: <Badge variant="success">Active</Badge>, revenue: "$4,800" },
  { customer: "Northwind", plan: "Starter", status: <Badge variant="warning">Trial</Badge>, revenue: "$1,260" },
  { customer: "Vertex Labs", plan: "Scale", status: <Badge variant="success">Active</Badge>, revenue: "$8,940" },
  { customer: "Lumen Works", plan: "Growth", status: <Badge variant="neutral">Paused</Badge>, revenue: "$3,120" },
];

export default definePage({
  meta: { title: "{{PROJECT_NAME}} — Dashboard", description: "Accessible CocoFrame dashboard template with charts, stats, table, and official icons." },
  view: () => <main class="dashboard-page">
    <header class="dashboard-topbar"><div><Text tone="muted" size="small">Tuesday, 22 August</Text><Heading level={1}>Good morning, Alex</Heading></div><Inline gap="small"><button class="icon-action" type="button" aria-label="Search"><MagnifierIcon size={19} /></button><button class="icon-action" type="button" aria-label="Notifications"><BellIcon size={19} /></button><span class="avatar">AX</span></Inline></header>

    <section class="stats-grid" aria-label="Key metrics"><Stat label="Monthly revenue" value="$42,860" trend="+12.4% this month" tone="positive" /><Stat label="Active customers" value="1,284" trend="+86 this week" tone="positive" /><Stat label="Conversion" value="8.42%" trend="+1.2 percentage points" tone="positive" /><Stat label="Open tickets" value="18" trend="4 need attention" tone="negative" /></section>

    <section class="dashboard-grid" id="analytics">
      <Card class="chart-card"><div class="card-heading"><div><Badge variant="primary"><GraphUpIcon size={14} /> Analytics</Badge><Heading level={2} size="medium">Revenue overview</Heading></div><button class="period-button" type="button"><CalendarIcon size={16} /> Last 6 months</button></div><Chart type="area" label="Monthly revenue" description="Revenue increased from 24 to 43 thousand dollars." labels={["Mar","Apr","May","Jun","Jul","Aug"]} datasets={[{ label: "Revenue", data: [24,28,27,34,38,43], tone: "primary", fill: true }]} formatValue={(value) => `$${value}k`} /></Card>
      <Card class="goal-card"><Badge variant="success">On track</Badge><Heading level={2} size="medium">Quarter goal</Heading><strong>78%</strong><div class="goal-ring" aria-label="78 percent complete"><span>78%</span></div><Text tone="muted">$31,200 remaining to reach the quarterly target.</Text></Card>
    </section>

    <section id="customers"><Card class="customers-card"><div class="card-heading"><div><Heading level={2} size="medium">Recent customers</Heading><Text tone="muted" size="small">Latest account activity across the workspace.</Text></div><a href="#customers">View all</a></div><DataTable caption="Recent customers" columns={[{ key: "customer", label: "Customer", sortable: true }, { key: "plan", label: "Plan", sortable: true }, { key: "status", label: "Status" }, { key: "revenue", label: "Revenue", sortable: true }]} rows={rows} sortKey="customer" sortPath="/" /></Card></section>
  </main>,
});