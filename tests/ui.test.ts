import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { jsx, renderToString } from "../packages/jsx/src/index.ts";
import {
  Accordion, Alert, AlertDialog, Attachment, Avatar, Badge, BottomSheet, Breadcrumb, Button, Calendar, Card, Chart, Checkbox, Code, Collapsible, Combobox, Container, ContextMenu,
  DataTable, Details, Dialog, Divider, DropdownMenu, EmptyState, FileUpload, FormField, Grid, Heading,
  IconButton, IconInput, Inline, Input, InputGroup, InputOtp, MegaMenu, Message, MessageScroller, Offcanvas, Pagination, Popover, Progress, Questionnaire,
  Menubar, NavigationMenu, RadioGroup, SearchField, Select, SiteHeader, Skeleton, Spinner, Stack, Stat, Switch, Table,
  Sidebar, Slider, SyntaxHighlighter, Tabs, Text, Textarea, Toast, Toaster, ToggleGroup, Tooltip, VisuallyHidden, uiComponents,
} from "../packages/ui/src/index.ts";
import { tokenizeSyntax } from "../packages/ui/src/syntax-highlighter.ts";

test("renders accessible server-first UI primitives without browser runtime", async () => {
  const body = await renderToString(Stack({ as: "main", gap: "large", children: [
    Alert({ variant: "success", children: "Saved" }),
    Card({ children: FormField({
      label: "Email",
      htmlFor: "email",
      hint: "Work email",
      error: "Email is invalid",
      required: true,
      children: Input({ id: "email", name: "email", type: "email", required: true, "aria-invalid": "true", "aria-describedby": "email-hint email-error" }),
    }) }),
    Textarea({ id: "message", name: "message", value: "Hello", rows: 4 }),
    Button({ type: "submit", children: "Send" }),
    VisuallyHidden({ children: "Additional context" }),
  ] }));
  assert.match(body, /^<main class="coco-stack coco-stack--large">/);
  assert.match(body, /class="coco-alert coco-alert--success"/);
  assert.match(body, /class="coco-button coco-button--primary coco-button--medium"/);
  assert.match(body, /role="status">Saved/);
  assert.match(body, /<label class="coco-label" for="email">Email<span aria-hidden="true"> \*<\/span><\/label>/);
  assert.match(body, /aria-describedby="email-hint email-error"/);
  assert.match(body, /id="email-error" role="alert">Email is invalid/);
  assert.match(body, /<textarea id="message" name="message" rows="4" class="coco-input coco-input--medium">Hello<\/textarea>/);
  assert.doesNotMatch(body, /<script/);
});

test("renders the complete semantic UI catalog", async () => {
  const body = await renderToString(Container({ size: "medium", children: Stack({ children: [
    Heading({ level: 1, size: "xlarge", children: "Dashboard" }),
    Text({ tone: "muted", children: ["Run ", Code({ children: "npm run dev" })] }),
    Breadcrumb({ items: [{ label: "Home", href: "/" }, { label: "Dashboard" }] }),
    Inline({ justify: "between", children: [Avatar({ initials: "CF", alt: "CocoFrame" }), Badge({ variant: "info", children: "Info" }), Button({ variant: "ghost", children: "Edit" })] }),
    Grid({ columns: 2, children: [
      Card({ children: Progress({ value: 72, label: "Build progress" }) }),
      Card({ children: Spinner({ label: "Loading metrics" }) }),
    ] }),
    Divider({ label: "Settings" }),
    Select({ id: "region", name: "region", children: [jsx("option", { value: "sin", children: "Singapore" })] }),
    Checkbox({ id: "terms", name: "terms", label: "Accept terms", description: "Required", checked: true }),
    Details({ summary: "More information", open: true, children: "Native disclosure" }),
    Pagination({ current: 2, total: 3, basePath: "/items" }),
    Table({ caption: "Services", headers: ["Name", "State"], rows: [["Web", "Ready"]], striped: true }),
  ] }) }));

  assert.equal(uiComponents.length, 80);
  assert.match(body, /^<div class="coco-container coco-container--medium">/);
  assert.match(body, /<h1 class="coco-heading coco-heading--xlarge">Dashboard<\/h1>/);
  assert.match(body, /aria-current="page">Dashboard/);
  assert.match(body, /class="coco-badge coco-badge--info">Info/);
  assert.match(body, /class="coco-button coco-button--ghost coco-button--medium">Edit/);
  assert.match(body, /<progress value="72" max="100" aria-label="Build progress">/);
  assert.match(body, /role="status"><span class="coco-spinner coco-spinner--medium"/);
  assert.match(body, /type="checkbox" checked/);
  assert.match(body, /<details class="coco-details" open>/);
  assert.match(body, /<table class="coco-table coco-table--striped">/);
  assert.doesNotMatch(body, /<script/);
});

test("uses bundled Solar icons for built-in component chrome", async () => {
  const body = await renderToString(Stack({ children: [
    SearchField({ id: "catalog-search", name: "q", label: "Search", onInput: () => {} }),
    Select({ id: "catalog-select", name: "option", onInput: () => {}, children: jsx("option", { children: "One" }) }),
    FileUpload({ id: "catalog-upload", name: "file", label: "Upload file" }),
    Details({ summary: "Details", open: true, children: "Content" }),
    DropdownMenu({ label: "Actions", open: true, items: [{ label: "Open", href: "/open" }] }),
    MegaMenu({ label: "Products", open: true, groups: [{ title: "Build", items: [{ label: "Web", href: "/web" }] }] }),
    Accordion({ id: "icon-faq", openIds: ["one"], items: [{ id: "one", title: "Question", content: "Answer" }] }),
    Collapsible({ summary: "Advanced", open: true, children: "Options" }),
    Attachment({ items: [{ name: "report.pdf", href: "/report.pdf" }] }),
    DataTable({ caption: "Users", sortKey: "name", columns: [{ key: "name", label: "Name", sortable: true }], rows: [{ name: "Raka" }] }),
    NavigationMenu({ items: [{ label: "Products", items: [{ label: "Web", href: "/web" }] }] }),
    ContextMenu({ label: "Project menu", open: true, items: [{ label: "Open", href: "/open" }] }),
    Menubar({ menus: [{ label: "File", items: [{ label: "Open", href: "/open" }] }] }),
    Toast({ title: "Saved", onDismiss: () => {} }),
  ] }));

  assert.match(body, /class="coco-select-shell"/);
  assert.match(body, /solar-magnifier-linear/);
  assert.match(body, /solar-upload-minimalistic-linear/);
  assert.match(body, /solar-close-circle-linear/);
  assert.match(body, /solar-paperclip-linear/);
  assert.match(body, /solar-sort-vertical-linear/);
  assert.ok((body.match(/solar-alt-arrow-down-linear/g) ?? []).length >= 8);
  assert.doesNotMatch(body, /[⌕⇧×⌄↗↕]/);
  assert.doesNotMatch(body, /oninput=/i);
  assert.doesNotMatch(body, /<script|\sstyle=/);
});

test("highlights source code on the server without changing or trusting its content", async () => {
  const samples = {
    tsx: `export const View = () => <script data-name="unsafe">alert("x")</script>;`,
    typescript: `interface User { readonly id: number } // typed`,
    javascript: `const ready = true;`,
    json: `{"ready":true,"count":42}`,
    css: `.card { color: #1e7a5a; }`,
    html: `<button aria-label="Save">Save</button>`,
    bash: `npm run build\n# production`,
    cocoql: `from orders\nwith customer\nfilter created_at in this_month\ngroup customer.name\nselect customer.name, sum(total) as revenue\n# safe query`,
    text: `app/routes/index.page.tsx`,
  } as const;

  for (const [language, source] of Object.entries(samples)) {
    assert.equal(tokenizeSyntax(source, language as keyof typeof samples).map((token) => token.value).join(""), source);
  }

  const body = await renderToString(SyntaxHighlighter({
    code: samples.tsx,
    language: "tsx",
    label: "Unsafe TSX example",
    showLineNumbers: true,
  }));
  assert.match(body, /^<pre class="coco-syntax coco-syntax--numbered" data-language="tsx" tabindex="0" aria-label="Unsafe TSX example">/);
  assert.match(body, /coco-token--keyword/);
  assert.match(body, /coco-token--tag/);
  assert.match(body, /data-line="1"/);
  assert.match(body, /&lt;/);
  assert.doesNotMatch(body, /<script/);

  const cocoqlBody = await renderToString(SyntaxHighlighter({ code: samples.cocoql, language: "cocoql" }));
  assert.match(cocoqlBody, /data-language="cocoql"/);
  assert.match(cocoqlBody, /coco-token--keyword[^>]*>from</);
  assert.match(cocoqlBody, /coco-token--keyword[^>]*>with</);
  assert.match(cocoqlBody, /coco-token--keyword[^>]*>this_month</);
  assert.match(cocoqlBody, /coco-token--keyword[^>]*>group</);
  assert.match(cocoqlBody, /coco-token--keyword[^>]*>sum</);
  assert.match(await renderToString(SyntaxHighlighter({ code: "preview\nfrom users\nupdate\nconfirm affected <= 1", language: "cocoql" })), /coco-token--keyword[^>]*>preview/);
  assert.match(cocoqlBody, /coco-token--comment[^>]*># safe query</);
});

test("renders the extended component coverage as accessible server-first HTML", async () => {
  const body = await renderToString(Stack({ children: [
    Accordion({ id: "faq", openIds: ["one"], items: [{ id: "one", title: "First", content: "Answer" }, { id: "two", title: "Second", content: "More" }] }),
    AlertDialog({ id: "danger", title: "Delete?", description: "Cannot be undone", action: Button({ variant: "danger", children: "Delete" }) }),
    Calendar({ id: "date", year: 2026, month: 8, selected: "2026-08-21" }),
    Chart({ label: "Requests", data: [{ label: "Mon", value: 20 }, { label: "Tue", value: 40 }] }),
    Combobox({ id: "framework", name: "framework", label: "Framework", options: [{ label: "CocoFrame", value: "cocoframe" }] }),
    Combobox({ id: "interactive-framework", name: "interactive-framework", label: "Interactive framework", interactive: true, options: [{ label: "CocoFrame", value: "cocoframe" }, { label: "Disabled", value: "disabled", disabled: true }] }),
    InputOtp({ id: "otp", name: "otp", label: "Verification code", value: "24" }),
    Popover({ id: "info", trigger: "Open", label: "Information", children: "Details" }),
    Questionnaire({ name: "survey", questions: [{ id: "goal", prompt: "Goal?", choices: [{ label: "Web", value: "web" }], value: "web" }] }),
    Sidebar({ brand: "Coco", groups: [{ label: "Main", items: [{ label: "Home", href: "/", current: true }] }] }),
    Slider({ id: "volume", name: "volume", label: "Volume", value: 64 }),
    ToggleGroup({ label: "Alignment", value: "left", items: [{ label: "Left", value: "left" }, { label: "Right", value: "right" }] }),
    MessageScroller({ children: Message({ author: "Coco AI", children: "Ready" }) }),
  ] }));

  assert.match(body, /<details name="faq" open class="coco-accordion__item">/);
  assert.match(body, /role="alertdialog"/);
  assert.match(body, /value="2026-08-21" class="coco-calendar__day coco-calendar__day--selected" aria-pressed="true"/);
  assert.match(body, /data-chart-type="bar"/);
  assert.match(body, /<svg viewBox="0 0 720 360" role="img" aria-label="Requests">/);
  assert.match(body, /<table class="coco-visually-hidden">/);
  assert.match(body, /role="combobox" autocomplete="off"/);
  assert.match(body, /class="coco-combobox coco-combobox--interactive"/);
  assert.match(body, /aria-autocomplete="list" aria-controls="interactive-framework-options" aria-expanded="false"/);
  assert.match(body, /id="interactive-framework-options" class="coco-combobox__list" role="listbox"/);
  assert.match(body, /type="hidden" name="interactive-framework" value="" data-combobox-submission/);
  assert.match(body, /data-combobox-value="cocoframe"/);
  assert.equal((body.match(/<datalist/g) ?? []).length, 1);
  assert.match(body, /autocomplete="one-time-code" aria-label="Verification code digit 1"/);
  assert.match(body, /popovertarget="info" aria-haspopup="dialog"/);
  assert.match(body, /role="log" aria-label="Conversation" aria-live="polite"/);
  assert.match(body, /aria-current="page">/);
  assert.match(body, /type="range" value="64"/);
  assert.doesNotMatch(body, /\sstyle=/);
  assert.doesNotMatch(body, /<script/);
});

test("renders the complete Chart family as responsive accessible SVG without browser JavaScript", async () => {
  const labels = ["Jan", "Feb", "Mar", "Apr"];
  const series = [
    { label: "Requests", data: [24, 42, 35, 58], tone: "primary" as const },
    { label: "Conversions", data: [12, 18, 26, 31], tone: "blue" as const },
  ];
  const radial = [{ label: "Traffic", data: [48, 27, 16, 9] }];
  const points = [{ label: "Segments", data: [{ x: 12, y: 24, r: 7 }, { x: 26, y: 43, r: 14 }] }];
  const body = await renderToString(Stack({ children: [
    Chart({ type: "line", label: "Line", labels, datasets: series }),
    Chart({ type: "area", label: "Area", labels, datasets: series }),
    Chart({ type: "bar", label: "Bar", labels, datasets: series, showValues: true }),
    Chart({ type: "horizontal-bar", label: "Horizontal", labels, datasets: series }),
    Chart({ type: "stacked-bar", label: "Stacked", labels, datasets: series }),
    Chart({ type: "pie", label: "Pie", labels, datasets: radial }),
    Chart({ type: "doughnut", label: "Doughnut", labels, datasets: radial }),
    Chart({ type: "polar-area", label: "Polar", labels, datasets: radial }),
    Chart({ type: "radar", label: "Radar", labels, datasets: series, max: 100 }),
    Chart({ type: "scatter", label: "Scatter", datasets: points }),
    Chart({ type: "bubble", label: "Bubble", datasets: points }),
    Chart({ type: "mixed", label: "Mixed", labels, datasets: [
      { label: "Actual", type: "bar", data: [20, 28, 34, 45] },
      { label: "Target", type: "line", data: [22, 27, 36, 43], tone: "amber" },
    ] }),
  ] }));

  for (const type of ["line", "area", "bar", "horizontal-bar", "stacked-bar", "pie", "doughnut", "polar-area", "radar", "scatter", "bubble", "mixed"]) {
    assert.match(body, new RegExp(`data-chart-type="${type}"`));
  }
  assert.equal((body.match(/<figure class="coco-chart/g) ?? []).length, 12);
  assert.equal((body.match(/<table class="coco-visually-hidden">/g) ?? []).length, 12);
  assert.match(body, /class="coco-chart__line coco-chart__tone--primary"/);
  assert.match(body, /class="coco-chart__area coco-chart__tone--primary"/);
  assert.match(body, /class="coco-chart__arc coco-chart__arc--rings-1 coco-chart__tone--primary"/);
  assert.match(body, /class="coco-chart__radar-area coco-chart__tone--primary"/);
  assert.match(body, /class="coco-chart__bubble coco-chart__tone--primary"/);
  assert.match(body, /aria-label="Chart legend"/);
  assert.match(body, /<title>Requests · Jan: 24<\/title>/);
  assert.doesNotMatch(body, /<script|style="/);

  const empty = await renderToString(Chart({ type: "line", label: "No results", datasets: [], emptyText: "Nothing to plot." }));
  assert.match(empty, /class="coco-chart__empty" role="status">Nothing to plot\.<\/div>/);
  const invalidScatter = await renderToString(Chart({ type: "scatter", label: "Invalid scatter", datasets: [{ label: "Numbers", data: [1, 2, 3] }] }));
  assert.match(invalidScatter, /class="coco-chart__empty" role="status">No chart data available\.<\/div>/);
});

test("sorts DataTable rows deterministically and keeps URL sorting accessible", async () => {
  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "score", label: "Score", sortable: true },
  ] as const;
  const rows = [
    { name: "Raka", score: 8 },
    { name: "Alya", score: 10 },
    { name: "Bima", score: 8 },
  ];

  const ascending = await renderToString(DataTable({ caption: "Users", columns, rows, sortKey: "name", sortDirection: "asc", sortPath: "/users?active=true#table" }));
  assert.ok(ascending.indexOf(">Alya</td>") < ascending.indexOf(">Bima</td>"));
  assert.ok(ascending.indexOf(">Bima</td>") < ascending.indexOf(">Raka</td>"));
  assert.match(ascending, /aria-sort="ascending"/);
  assert.match(ascending, /href="\/users\?active=true&amp;sort=name&amp;direction=desc#table"/);

  const descending = await renderToString(DataTable({ caption: "Users", columns, rows, sortKey: "score", sortDirection: "desc" }));
  assert.ok(descending.indexOf(">Alya</td>") < descending.indexOf(">Raka</td>"));
  assert.ok(descending.indexOf(">Raka</td>") < descending.indexOf(">Bima</td>"));
  assert.match(descending, /aria-sort="descending"/);
});

test("renders accessible form, feedback, navigation, and overlay additions", async () => {
  const body = await renderToString(Stack({ children: [
    IconButton({ label: "Open settings", children: "⚙" }),
    SearchField({ id: "search", name: "q", label: "Search projects", placeholder: "Search" }),
    RadioGroup({ id: "plan", name: "plan", legend: "Plan", value: "pro", options: [
      { label: "Starter", value: "starter" },
      { label: "Pro", value: "pro", description: "For teams" },
    ] }),
    Switch({ id: "updates", name: "updates", label: "Product updates", description: "Email notifications", checked: true }),
    FileUpload({ id: "files", name: "files", label: "Upload files", hint: "PDF only", accept: ".pdf", multiple: true }),
    Skeleton({ width: "three-quarter", height: "heading" }),
    EmptyState({ title: "No projects", description: "Create your first project", action: Button({ children: "Create" }) }),
    Stat({ label: "Revenue", value: "$24k", trend: "Up 12%", tone: "positive" }),
    Tabs({ id: "settings", activeId: "profile", items: [
      { id: "profile", label: "Profile", panel: "Profile settings" },
      { id: "billing", label: "Billing", panel: "Billing settings" },
    ] }),
    DropdownMenu({ label: "Actions", open: true, items: [{ label: "Edit", href: "/edit" }, { label: "Delete", href: "/delete", danger: true }] }),
    Tooltip({ id: "help", content: "Helpful text", children: "?" }),
    Dialog({ id: "publish", title: "Publish project", description: "Visible to everyone", open: true, footer: Button({ children: "Publish" }), children: "Review changes" }),
    BottomSheet({ id: "filters", title: "Filter projects", open: true, footer: Button({ children: "Apply" }), children: "Filter controls" }),
    Toaster({ position: "bottom-right", children: Toast({ title: "Saved", description: "Changes are live", variant: "success" }) }),
  ] }));

  assert.match(body, /aria-label="Open settings" class="coco-icon-button/);
  assert.match(body, /type="search" aria-label="Search projects"/);
  assert.match(body, /<fieldset class="coco-radio-group coco-radio-group--vertical coco-radio-group--medium"/);
  assert.match(body, /type="radio" value="pro" checked/);
  assert.match(body, /role="switch" checked/);
  assert.match(body, /type="file" aria-describedby="files-hint"/);
  assert.match(body, /class="coco-skeleton coco-skeleton--width-three-quarter coco-skeleton--height-heading coco-skeleton--medium"/);
  assert.match(body, /class="coco-empty-state"/);
  assert.match(body, /class="coco-stat coco-stat--positive"/);
  assert.match(body, /role="tablist" aria-label="Tabs"/);
  assert.match(body, /aria-selected="true" aria-controls="settings-panel-profile"/);
  assert.match(body, /<details class="coco-dropdown coco-dropdown--start" open>/);
  assert.match(body, /id="help" class="coco-tooltip__content" role="tooltip"/);
  assert.match(body, /<dialog id="publish" class="coco-dialog coco-dialog--medium" open aria-labelledby="publish-title"/);
  assert.match(body, /<dialog id="filters" class="coco-bottom-sheet" open aria-labelledby="filters-title"/);
  assert.match(body, /aria-live="polite" aria-relevant="additions"/);
  assert.match(body, /class="coco-toast coco-toast--success" role="status"/);
  assert.doesNotMatch(body, /\sstyle=/);
  assert.doesNotMatch(body, /<script/);
});

test("renders shared control sizes, icon forms, and ready-made navigation patterns", async () => {
  const body = await renderToString(Stack({ children: [
    Inline({ children: [
      Button({ size: "small", children: "Small" }),
      Button({ size: "medium", children: "Medium" }),
      Button({ size: "large", children: "Large" }),
      Button({ size: "xlarge", children: "Extra large" }),
    ] }),
    IconInput({ id: "email-icon", name: "email", type: "email", size: "large", leadingIcon: "@", trailingIcon: "✓" }),
    InputGroup({ start: "$", end: "USD", size: "xlarge", children: Input({ id: "amount", name: "amount", type: "number", size: "xlarge" }) }),
    SiteHeader({ brand: "Coco", variant: "centered", sticky: true, items: [{ label: "Home", href: "/", current: true }, { label: "Docs", href: "/docs" }], actions: Button({ size: "small", children: "Start" }), menuButton: IconButton({ label: "Open menu", children: "☰" }) }),
    MegaMenu({ label: "Products", open: true, groups: [{ title: "Build", items: [{ label: "Web Apps", href: "/web", description: "Server-first", icon: "◇" }] }], featured: "New release" }),
    Offcanvas({ id: "mobile-nav", title: "Navigation", description: "Browse pages", side: "right", open: true, footer: Button({ children: "Close" }), children: "Navigation links" }),
  ] }));

  assert.match(body, /coco-button--small/);
  assert.match(body, /coco-button--medium/);
  assert.match(body, /coco-button--large/);
  assert.match(body, /coco-button--xlarge/);
  assert.match(body, /class="coco-icon-input coco-icon-input--large"/);
  assert.match(body, /class="coco-icon-input__leading" aria-hidden="true">@/);
  assert.match(body, /class="coco-input-group coco-input-group--xlarge"/);
  assert.match(body, /class="coco-site-header coco-site-header--centered coco-site-header--sticky"/);
  assert.match(body, /aria-current="page">Home/);
  assert.match(body, /class="coco-mega-menu coco-mega-menu--center" open/);
  assert.match(body, /class="coco-mega-menu__groups" aria-label="Products"/);
  assert.match(body, /<dialog id="mobile-nav" class="coco-offcanvas coco-offcanvas--right" open aria-labelledby="mobile-nav-title"/);
  assert.doesNotMatch(body, /<script/);
});

test("ships the responsive utility-first layer", async () => {
  const css = await readFile(new URL("../packages/ui/utilities.css", import.meta.url), "utf8");
  assert.match(css, /\.c-grid-cols-3\{grid-template-columns/);
  assert.match(css, /\.c-p-6\{padding:var\(--coco-space-6\)\}/);
  assert.match(css, /\.md\\:c-grid-cols-3/);
  assert.match(css, /@media\(min-width:64rem\)/);
});

test("keeps component documentation and overlays responsive from 320px through 4K", async () => {
  const pageCss = await readFile(new URL("../examples/basic/app/styles/80-responsive-components.css", import.meta.url), "utf8");
  const catalogCss = await readFile(new URL("../examples/basic/app/styles/50-official-components.css", import.meta.url), "utf8");
  const migrationCss = await readFile(new URL("../examples/basic/app/styles/99-framework-migration.css", import.meta.url), "utf8");
  const uiCss = await readFile(new URL("../packages/ui/styles.css", import.meta.url), "utf8");

  assert.match(pageCss, /@media \(max-width: 360px\)/);
  assert.match(pageCss, /@media \(max-width: 950px\)/);
  assert.match(pageCss, /@media \(min-width: 1920px\)/);
  assert.match(pageCss, /@media \(min-width: 2560px\)/);
  assert.match(pageCss, /max-width: 1680px/);
  assert.match(uiCss, /\.coco-bottom-sheet__surface\{width:min\(100%,48rem\);margin-inline:auto\}/);
  assert.match(uiCss, /@media\(max-width:22\.5rem\)/);
  assert.match(uiCss, /safe-area-inset-bottom/);
  assert.match(uiCss, /\.coco-calendar__grid\{display:grid;grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(uiCss, /\.coco-message-scroller\{display:grid;max-height:28rem/);
  assert.match(uiCss, /\.coco-chart--wide \.coco-chart__viewport\{aspect-ratio:2\/1\}/);
  assert.match(uiCss, /\.coco-chart__line\{fill:none;stroke:currentColor/);
  assert.match(uiCss, /\.coco-chart__radar-area\{fill:currentColor/);
  assert.match(uiCss, /@media \(max-width:575px\)\{\.coco-chart/);
  assert.match(uiCss, /@media\(max-width:40rem\)[\s\S]*\.coco-sidebar\{width:100%;min-height:0\}/);
  assert.match(catalogCss, /\.official-component:has\(\.coco-dropdown/);
  assert.match(catalogCss, /min-height:340px/);
  assert.match(migrationCss, /aspect-ratio: 3 \/ 2/);
  assert.match(migrationCss, /object-fit: contain/);
  assert.match(migrationCss, /\.official-component:has\(\.coco-hover-card\)[\s\S]*min-height: 360px/);
  assert.match(migrationCss, /\.component-source > \.coco-syntax[\s\S]*border-radius: 0 0 8px 8px/);
});

test("ships smooth motion and branded scrollbars with reduced-motion fallbacks", async () => {
  const motionCss = await readFile(new URL("../examples/basic/app/styles/85-motion-system.css", import.meta.url), "utf8");
  const uiCss = await readFile(new URL("../packages/ui/styles.css", import.meta.url), "utf8");

  assert.match(motionCss, /scroll-behavior: smooth/);
  assert.match(motionCss, /scrollbar-color: var\(--scrollbar-thumb\)/);
  assert.match(motionCss, /::-webkit-scrollbar-thumb/);
  assert.match(motionCss, /@supports \(animation-timeline: view\(\)\)/);
  assert.match(motionCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(uiCss, /@keyframes coco-dialog-in/);
  assert.match(uiCss, /@keyframes coco-sheet-in/);
  assert.match(uiCss, /@keyframes coco-drawer-right-in/);
  assert.match(uiCss, /@keyframes coco-toast-in/);
  assert.match(uiCss, /@media\(prefers-reduced-motion:reduce\)/);
});

test("keeps the native file input accessible without exposing browser chrome", async () => {
  const css = await readFile(new URL("../packages/ui/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.coco-file-upload input\{position:absolute;width:1px;height:1px/);
  assert.match(css, /clip-path:inset\(50%\)/);
  assert.match(css, /\.coco-file-upload:has\(input:focus-visible\)/);
  assert.match(css, /\.coco-file-upload:has\(input:disabled\)/);
});

test("uses the primary design token for the Command keyboard focus line", async () => {
  const css = await readFile(new URL("../packages/ui/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.coco-command>input:focus-visible\{border-bottom-color:var\(--coco-color-primary\);box-shadow:inset 0 -2px 0 var\(--coco-color-primary\)\}/);
});

test("uses a high-contrast syntax palette for CocoQL errors on light surfaces", async () => {
  const css = await readFile(new URL("../examples/basic/app/styles/95-cocoql.css", import.meta.url), "utf8");
  assert.match(css, /\.cocoql-error \.coco-token--property \{ color: #1d4ed8; \}/);
  assert.match(css, /\.cocoql-error \.coco-token--string \{ color: #047857; \}/);
  assert.match(css, /\.cocoql-error \.coco-token--operator \{ color: #6d28d9; \}/);
  assert.match(css, /\.cocoql-error \.coco-syntax::before \{ color: #17684a; background: #e6f4ec;/);
});

test("keeps the complete icon catalog usable from 320px through wide screens", async () => {
  const source = await readFile(new URL("../examples/basic/app/styles/75-icons.css", import.meta.url), "utf8");
  assert.match(source, /width:\s*min\(1600px, calc\(100% - 48px\)\)/);
  assert.match(source, /content-visibility:\s*auto/);
  assert.match(source, /@media \(max-width: 600px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(source, /@media \(max-width: 340px\)/);
});
