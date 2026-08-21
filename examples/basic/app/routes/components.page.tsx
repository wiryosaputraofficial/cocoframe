import { definePage } from "@cocoframe/core";
import AccessibilityIcon from "@cocoframe/icons/linear/accessibility";
import CheckCircleIcon from "@cocoframe/icons/linear/check-circle";
import PaletteIcon from "@cocoframe/icons/linear/palette";
import ServerSquareIcon from "@cocoframe/icons/linear/server-square";
import { SyntaxHighlighter } from "@cocoframe/ui";
import ComponentBrowser from "../islands/component-browser.island.tsx";
import DocsSidebar from "../islands/docs-sidebar.island.tsx";

const installCode = `import HomeIcon from "@cocoframe/icons/linear/home";
import { Button, Card, Stack } from "@cocoframe/ui";

export function WelcomeCard() {
  return <Card>
    <Stack gap="medium">
      <h2>Welcome</h2>
      <p>Your CocoFrame app is ready.</p>
      <Button><HomeIcon size={20} /> Continue</Button>
    </Stack>
  </Card>;
}`;

const themeCode = `:root {
  --coco-font-sans: "Satoshi", system-ui, sans-serif;
  --coco-primary-600: #1e7a5a;
  --coco-primary-500: #2ea36b;
  --coco-primary-400: #5fc09a;
  --coco-primary-300: #85d6ad;
  --coco-primary-100: #e6f4ec;
  --coco-neutral-900: #0f172a;
  --coco-neutral-700: #334155;
  --coco-neutral-500: #64748b;
  --coco-neutral-300: #cbd5e1;
  --coco-color-success: #16a34a;
  --coco-color-warning: #f59e0b;
  --coco-color-danger: #ef4444;
  --coco-color-info: #3b82f6;
  --coco-space-1: 0.25rem;
  --coco-space-2: 0.5rem;
  --coco-space-3: 1rem;
  --coco-space-4: 1.5rem;
  --coco-radius-sm: 0.25rem;
  --coco-radius: 0.5rem;
  --coco-radius-lg: 0.75rem;
}`;

const utilityCode = `<section class="c-grid c-grid-cols-1 md:c-grid-cols-3 c-gap-4">
  <article class="c-p-4 c-rounded-lg c-border c-shadow-sm">
    <h2 class="c-text-xl c-font-bold">Fast by default</h2>
    <p class="c-text-sm c-text-muted c-mt-2">Responsive without runtime JS.</p>
  </article>
</section>`;

const sizeCode = `type ControlSize = "small" | "medium" | "large" | "xlarge";

import MagnifierIcon from "@cocoframe/icons/linear/magnifier";

<Button size="small">Compact</Button>
<Input id="name" name="name" size="medium" />
<Select id="team" name="team" size="large">...</Select>
<IconInput id="search" name="search" size="xlarge" leadingIcon={<MagnifierIcon size={20} />} />`;

export default definePage({
  meta: {
    title: "Components — CocoFrame",
    description: "Referensi 80 komponen responsif @cocoframe/ui dan 1.246 Solar Linear icons typed, lengkap dengan props, preview, accessibility, serta contoh penggunaan.",
    canonical: "https://cocoframe.dev/components",
    image: "/assets/cocoframe-components-hero.png",
    type: "article",
    jsonLd: { "@context": "https://schema.org", "@type": "TechArticle", headline: "CocoFrame UI Components", inLanguage: "id" },
  },
  view: () => <main id="top" class="docs-layout components-layout">
    <DocsSidebar kind="components" />
    <div class="docs-content components-content">
      <section class="components-hero" id="overview"><div class="components-hero-copy reveal"><span class="eyebrow pill">COMPONENTS</span><h1>Utility-first speed.<br /><span>Ready-made patterns.<br />No hidden runtime.</span></h1><p>Bangun UI lengkap dengan empat ukuran control, form berikon, header responsif, mega menu, data visualization, pola AI/chat, feedback, overlay, dan Solar Linear icons. Semua typed dan server-first; JavaScript hanya dimuat untuk interaksi yang memang membutuhkannya.</p><div class="component-stats"><div><strong>80</strong><span>components</span></div><div><strong>1.246</strong><span>linear icons</span></div><div><strong>0 KB</strong><span>JS by default</span></div><div><strong>SSR</strong><span>semantic HTML</span></div></div></div><div class="components-hero-art reveal"><div class="hero-art-glow"></div><img src="/assets/cocoframe-components-hero.png" alt="Ilustrasi CocoFrame dengan browser, tampilan mobile, dan komponen UI modular" width="768" height="512" /></div></section>

      <section class="component-doc-panel" id="installation"><header><span class="eyebrow">GET STARTED</span><h2>Import only what you use</h2><p><code>@cocoframe/ui</code> berisi server components tanpa dependency browser. Ikon tersedia lewat subpath langsung seperti <code>@cocoframe/icons/linear/home</code>, sehingga hanya ikon yang diimpor yang masuk ke build.</p></header><SyntaxHighlighter code={installCode} language="tsx" label="Contoh import komponen CocoFrame" /><div class="component-callout"><strong>Current packages:</strong><span><code>@cocoframe/ui</code> dan <code>@cocoframe/icons</code> tersedia sebagai workspace package CocoFrame versi MVP.</span></div></section>

      <section class="component-doc-panel" id="theming"><header><span class="eyebrow">THEMING</span><h2>Customize with CSS variables</h2><p>Override token pada stylesheet aplikasi. API komponen tidak perlu diubah dan semua komponen mengikuti theme yang sama.</p></header><SyntaxHighlighter code={themeCode} language="css" label="Contoh theme CSS CocoFrame" /></section>

      <section class="component-doc-panel" id="utilities"><header><span class="eyebrow">UTILITY-FIRST</span><h2>Compose UI like Tailwind, with a smaller vocabulary</h2><p>Semua utility memakai prefix <code>c-</code> agar tidak bentrok dengan CSS aplikasi. Breakpoint mengikuti referensi: <code>sm:</code> 576px, <code>md:</code> 768px, <code>lg:</code> 1024px, <code>xl:</code> 1280px, dan <code>2xl:</code> 1536px. State variant mencakup <code>hover:</code>, <code>focus-visible:</code>, dan <code>disabled:</code>.</p></header><SyntaxHighlighter code={utilityCode} language="html" label="Contoh utility CSS CocoFrame" /><div class="utility-groups"><span>Layout & display</span><span>Flex & grid</span><span>Spacing 0–8</span><span>Satoshi typography</span><span>Semantic colors</span><span>Radius</span><span>Elevation</span><span>5 breakpoints</span><span>Interaction states</span></div></section>

      <section class="component-doc-panel" id="sizes"><header><span class="eyebrow">SIZE SYSTEM</span><h2>One size vocabulary across every control</h2><p><code>ControlSize</code> dipakai bersama oleh Button, IconButton, Input, IconInput, InputGroup, Textarea, Select, SearchField, RadioGroup, Switch, dan FileUpload. Developer maupun AI cukup mengingat empat nilai yang sama.</p></header><SyntaxHighlighter code={sizeCode} language="tsx" label="Contoh ukuran control CocoFrame" /><div class="control-size-map"><span><b>sm</b>32px</span><span><b>md</b>40px</span><span><b>lg</b>48px</span><span><b>xl</b>56px</span></div></section>

      <section class="component-doc-panel" id="shadcn-mapping"><header><span class="eyebrow">COMPONENT MAPPING</span><h2>Familiar coverage, smaller CocoFrame API</h2><p>Nama yang hanya merupakan sinonim tidak diduplikasi: <code>Sheet</code> memakai <code>Offcanvas</code>, <code>Drawer</code> memakai <code>BottomSheet</code>, <code>Separator</code> memakai <code>Divider</code>, <code>Empty</code> memakai <code>EmptyState</code>, <code>Field</code> memakai <code>FormField</code>, <code>NativeSelect</code> memakai <code>Select</code>, dan <code>Typography</code> memakai <code>Heading</code>, <code>Text</code>, <code>Code</code>, serta <code>SyntaxHighlighter</code>.</p></header><div class="utility-groups"><span>Sheet → Offcanvas</span><span>Drawer → BottomSheet</span><span>Separator → Divider</span><span>Empty → EmptyState</span><span>Field → FormField</span><span>Native Select → Select</span><span>Typography → typed primitives</span></div></section>

      <section class="foundation-section" aria-labelledby="foundation-title"><header><span class="eyebrow">FOUNDATION</span><h2 id="foundation-title">Design tokens</h2><p>Token resmi yang saat ini digunakan langsung oleh package UI.</p></header><div class="foundation-grid">
        <article id="colors"><h3>Colors</h3><div class="color-tokens"><TokenSwatch name="Primary 600" variable="--coco-primary-600" color="#1e7a5a" /><TokenSwatch name="Primary 500" variable="--coco-primary-500" color="#2ea36b" /><TokenSwatch name="Primary 400" variable="--coco-primary-400" color="#5fc09a" /><TokenSwatch name="Primary 300" variable="--coco-primary-300" color="#85d6ad" /><TokenSwatch name="Primary 100" variable="--coco-primary-100" color="#e6f4ec" /><TokenSwatch name="Neutral 900" variable="--coco-neutral-900" color="#0f172a" /><TokenSwatch name="Neutral 700" variable="--coco-neutral-700" color="#334155" /><TokenSwatch name="Neutral 500" variable="--coco-neutral-500" color="#64748b" /><TokenSwatch name="Neutral 300" variable="--coco-neutral-300" color="#cbd5e1" /><TokenSwatch name="Neutral 100" variable="--coco-neutral-100" color="#f1f5f9" /><TokenSwatch name="Success" variable="--coco-color-success" color="#16a34a" /><TokenSwatch name="Warning" variable="--coco-color-warning" color="#f59e0b" /><TokenSwatch name="Error" variable="--coco-color-danger" color="#ef4444" /><TokenSwatch name="Info" variable="--coco-color-info" color="#3b82f6" /></div></article>
        <article id="typography"><h3>Typography</h3><div class="type-samples"><p class="type-display">Aa <strong>Satoshi</strong></p><p class="type-h1">Heading 1 · Bold · 40/48</p><p class="type-h2">Heading 2 · Bold · 32/40</p><p class="type-h3">Heading 3 · Bold · 24/32</p><p class="type-body-large">Body Large · Regular · 16/24</p><p class="type-body">Body · Regular · 14/20</p><p class="type-small">Small · Regular · 12/16</p></div></article>
        <article id="spacing"><h3>Spacing</h3><div class="spacing-tokens"><TokenBar label="xs · 4px" size="4px" /><TokenBar label="sm · 8px" size="8px" /><TokenBar label="md · 16px" size="16px" /><TokenBar label="lg · 24px" size="24px" /><TokenBar label="xl · 32px" size="32px" /><TokenBar label="2xl · 48px" size="48px" /><TokenBar label="3xl · 64px" size="64px" /><TokenBar label="4xl · 96px" size="96px" /></div><p>Seluruh spacing mengikuti grid dasar 4px.</p></article>
        <article id="radius"><h3>Border radius</h3><div class="radius-scale"><span>None <b>0px</b></span><span>Sm <b>4px</b></span><span>Md <b>8px</b></span><span>Lg <b>12px</b></span><span>Xl <b>16px</b></span><span>Full <b>9999px</b></span></div></article>
        <article id="shadows"><h3>Shadows & elevation</h3><div class="shadow-scale"><span class="shadow-sm">Sm</span><span class="shadow-md">Md</span><span class="shadow-lg">Lg</span><span class="shadow-xl">Xl</span></div><p>Elevation 0–4 memetakan none, Sm, Md, Lg, dan Xl.</p></article>
        <article id="z-index"><h3>Z-index</h3><div class="z-index-scale"><span><b>0</b> Base</span><span><b>10</b> Raised</span><span><b>20</b> Dropdown</span><span><b>30</b> Sticky</span><span><b>40</b> Overlay</span><span><b>50</b> Modal</span></div></article>
        <article id="breakpoints"><h3>Responsive behavior</h3><div class="breakpoint-list"><span><b>xs</b>&lt; 576px</span><span><b>sm</b>≥ 576px</span><span><b>md</b>≥ 768px</span><span><b>lg</b>≥ 1024px</span><span><b>xl</b>≥ 1280px</span><span><b>2xl</b>≥ 1536px</span></div><p>Contoh: <code>c-grid-cols-1 md:c-grid-cols-3</code>.</p></article>
        <article id="accessibility"><h3>Accessibility defaults</h3><ul><li>HTML native dan semantik, bukan div dengan role palsu.</li><li>Focus-visible ring untuk control dan navigasi.</li><li>Dialog dan BottomSheet memakai elemen <code>dialog</code> dengan title serta description terhubung.</li><li>RadioGroup memakai <code>fieldset</code>/<code>legend</code>; Switch memakai native checkbox dengan <code>role="switch"</code>.</li><li>Toast/Toaster memakai live region, dan error memakai <code>role="alert"</code>.</li><li>Details, DropdownMenu, dan Tooltip tetap keyboard-accessible tanpa runtime tambahan.</li></ul></article>
      </div></section>

      <ComponentBrowser />

      <section class="component-benefits"><h2>What the package guarantees</h2><div class="benefit-grid">{[[<ServerSquareIcon size={22} />, "Server-first", "Komponen menghasilkan HTML lengkap tanpa hydration."], [<AccessibilityIcon size={22} />, "Accessible", "Semantik, label, status, error, dan focus state yang masuk akal."], [<PaletteIcon size={22} />, "Customizable", "Token dan class dapat ditambah melalui prop class."], [<CheckCircleIcon size={22} />, "Honest surface", "Katalog hanya menampilkan komponen yang benar-benar tersedia."]].map(([icon, title, text]) => <article><span class="love-icon" aria-hidden="true"><b>{icon}</b></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    </div>
  </main>,
});

function TokenSwatch({ name, variable, color }: { readonly name: string; readonly variable: string; readonly color: string }) {
  return <div><span class={`token-color token-color-${color.slice(1).toLowerCase()}`}></span><p><strong>{name}</strong><code>{variable}</code><small>{color}</small></p></div>;
}

function TokenBar({ label, size }: { readonly label: string; readonly size: string }) {
  return <div><span class={`token-width token-width-${size.replace("px", "")}`}></span><code>{label}</code></div>;
}
