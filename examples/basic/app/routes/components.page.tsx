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
    description: "Reference for 97 responsive @cocoframe/ui components and 1,246 typed Solar Linear icons, complete with props, previews, accessibility guidance, and usage examples.",
    canonical: "https://cocoframe.dev/components",
    image: "/assets/cocoframe-components-hero.png",
    type: "article",
    jsonLd: { "@context": "https://schema.org", "@type": "TechArticle", headline: "CocoFrame UI Components", inLanguage: "en" },
  },
  view: () => <main id="top" class="docs-layout components-layout">
    <DocsSidebar kind="components" />
    <div class="docs-content components-content">
      <section class="components-hero" id="overview"><div class="components-hero-copy reveal"><span class="eyebrow pill">COMPONENTS</span><h1>Utility-first speed.<br /><span>Ready-made patterns.<br />No hidden runtime.</span></h1><p>Build complete interfaces with four control sizes, advanced forms, mobile app shells, workflow navigation, data visualization, AI/chat patterns, feedback, overlays, and Solar Linear icons. Everything is typed and server-first; JavaScript loads only for interactions that genuinely need it.</p><div class="component-stats"><div><strong>97</strong><span>components</span></div><div><strong>1,246</strong><span>linear icons</span></div><div><strong>0 KB</strong><span>JS by default</span></div><div><strong>SSR</strong><span>semantic HTML</span></div></div></div><div class="components-hero-art reveal"><div class="hero-art-glow"></div><img src="/assets/cocoframe-components-hero.png" alt="CocoFrame illustration with a browser, mobile interface, and modular UI components" width="768" height="512" /></div></section>

      <section class="component-doc-panel" id="installation"><header><span class="eyebrow">GET STARTED</span><h2>Import only what you use</h2><p><code>@cocoframe/ui</code> contains server components with no browser dependency. Icons are available through direct subpaths such as <code>@cocoframe/icons/linear/home</code>, so the build includes only imported icons.</p></header><SyntaxHighlighter code={installCode} language="tsx" label="CocoFrame component import example" /><div class="component-callout"><strong>Current packages:</strong><span><code>@cocoframe/ui</code> and <code>@cocoframe/icons</code> are available as CocoFrame MVP workspace packages.</span></div></section>

      <section class="component-doc-panel" id="theming"><header><span class="eyebrow">THEMING</span><h2>Light, dark, and system themes</h2><p>Use the <code>Theme</code> component with <code>light</code>, <code>dark</code>, or <code>system</code>. All semantic tokens, native color-scheme, reduced motion, and forced colors remain consistent; applications can still override CSS tokens.</p></header><SyntaxHighlighter code={themeCode} language="css" label="CocoFrame CSS theme example" /></section>

      <section class="component-doc-panel" id="utilities"><header><span class="eyebrow">UTILITY-FIRST</span><h2>Compose UI like Tailwind, with a smaller vocabulary</h2><p>Every utility uses the <code>c-</code> prefix to avoid conflicts with application CSS. Breakpoints follow the reference: <code>sm:</code> 576px, <code>md:</code> 768px, <code>lg:</code> 1024px, <code>xl:</code> 1280px, and <code>2xl:</code> 1536px. State variants include <code>hover:</code>, <code>focus-visible:</code>, and <code>disabled:</code>.</p></header><SyntaxHighlighter code={utilityCode} language="html" label="CocoFrame CSS utility example" /><div class="utility-groups"><span>Layout & display</span><span>Flex & grid</span><span>Spacing 0–8</span><span>Satoshi typography</span><span>Semantic colors</span><span>Radius</span><span>Elevation</span><span>5 breakpoints</span><span>Interaction states</span></div></section>

      <section class="component-doc-panel" id="sizes"><header><span class="eyebrow">SIZE SYSTEM</span><h2>One size vocabulary across every control</h2><p><code>ControlSize</code> is shared by Button, IconButton, Input, IconInput, InputGroup, Textarea, Select, SearchField, RadioGroup, Switch, and FileUpload. Developers and AI only need to remember the same four values.</p></header><SyntaxHighlighter code={sizeCode} language="tsx" label="CocoFrame control size example" /><div class="control-size-map"><span><b>sm</b>32px</span><span><b>md</b>40px</span><span><b>lg</b>48px</span><span><b>xl</b>56px</span></div></section>

      <section class="component-doc-panel" id="shadcn-mapping"><header><span class="eyebrow">COMPONENT MAPPING</span><h2>Familiar coverage, smaller CocoFrame API</h2><p>Names that are only synonyms are not duplicated: <code>Sheet</code> uses <code>Offcanvas</code>, <code>Drawer</code> uses <code>BottomSheet</code>, <code>Separator</code> uses <code>Divider</code>, <code>Empty</code> uses <code>EmptyState</code>, <code>Field</code> uses <code>FormField</code>, <code>NativeSelect</code> uses <code>Select</code>, and <code>Typography</code> uses <code>Heading</code>, <code>Text</code>, <code>Code</code>, and <code>SyntaxHighlighter</code>.</p></header><div class="utility-groups"><span>Sheet → Offcanvas</span><span>Drawer → BottomSheet</span><span>Separator → Divider</span><span>Empty → EmptyState</span><span>Field → FormField</span><span>Native Select → Select</span><span>Typography → typed primitives</span></div></section>

      <section class="foundation-section" aria-labelledby="foundation-title"><header><span class="eyebrow">FOUNDATION</span><h2 id="foundation-title">Design tokens</h2><p>The official tokens currently used directly by the UI package.</p></header><div class="foundation-grid">
        <article id="colors"><h3>Colors</h3><div class="color-tokens"><TokenSwatch name="Primary 600" variable="--coco-primary-600" color="#1e7a5a" /><TokenSwatch name="Primary 500" variable="--coco-primary-500" color="#2ea36b" /><TokenSwatch name="Primary 400" variable="--coco-primary-400" color="#5fc09a" /><TokenSwatch name="Primary 300" variable="--coco-primary-300" color="#85d6ad" /><TokenSwatch name="Primary 100" variable="--coco-primary-100" color="#e6f4ec" /><TokenSwatch name="Neutral 900" variable="--coco-neutral-900" color="#0f172a" /><TokenSwatch name="Neutral 700" variable="--coco-neutral-700" color="#334155" /><TokenSwatch name="Neutral 500" variable="--coco-neutral-500" color="#64748b" /><TokenSwatch name="Neutral 300" variable="--coco-neutral-300" color="#cbd5e1" /><TokenSwatch name="Neutral 100" variable="--coco-neutral-100" color="#f1f5f9" /><TokenSwatch name="Success" variable="--coco-color-success" color="#16a34a" /><TokenSwatch name="Warning" variable="--coco-color-warning" color="#f59e0b" /><TokenSwatch name="Error" variable="--coco-color-danger" color="#ef4444" /><TokenSwatch name="Info" variable="--coco-color-info" color="#3b82f6" /></div></article>
        <article id="typography"><h3>Typography</h3><div class="type-samples"><p class="type-display">Aa <strong>Satoshi</strong></p><p class="type-h1">Heading 1 · Bold · 40/48</p><p class="type-h2">Heading 2 · Bold · 32/40</p><p class="type-h3">Heading 3 · Bold · 24/32</p><p class="type-body-large">Body Large · Regular · 16/24</p><p class="type-body">Body · Regular · 14/20</p><p class="type-small">Small · Regular · 12/16</p></div></article>
        <article id="spacing"><h3>Spacing</h3><div class="spacing-tokens"><TokenBar label="xs · 4px" size="4px" /><TokenBar label="sm · 8px" size="8px" /><TokenBar label="md · 16px" size="16px" /><TokenBar label="lg · 24px" size="24px" /><TokenBar label="xl · 32px" size="32px" /><TokenBar label="2xl · 48px" size="48px" /><TokenBar label="3xl · 64px" size="64px" /><TokenBar label="4xl · 96px" size="96px" /></div><p>All spacing follows a 4px base grid.</p></article>
        <article id="radius"><h3>Border radius</h3><div class="radius-scale"><span>None <b>0px</b></span><span>Sm <b>4px</b></span><span>Md <b>8px</b></span><span>Lg <b>12px</b></span><span>Xl <b>16px</b></span><span>Full <b>9999px</b></span></div></article>
        <article id="shadows"><h3>Shadows & elevation</h3><div class="shadow-scale"><span class="shadow-sm">Sm</span><span class="shadow-md">Md</span><span class="shadow-lg">Lg</span><span class="shadow-xl">Xl</span></div><p>Elevation levels 0–4 map to none, Sm, Md, Lg, and Xl.</p></article>
        <article id="z-index"><h3>Z-index</h3><div class="z-index-scale"><span><b>0</b> Base</span><span><b>10</b> Raised</span><span><b>20</b> Dropdown</span><span><b>30</b> Sticky</span><span><b>40</b> Overlay</span><span><b>50</b> Modal</span></div></article>
        <article id="breakpoints"><h3>Responsive behavior</h3><div class="breakpoint-list"><span><b>xs</b>&lt; 576px</span><span><b>sm</b>≥ 576px</span><span><b>md</b>≥ 768px</span><span><b>lg</b>≥ 1024px</span><span><b>xl</b>≥ 1280px</span><span><b>2xl</b>≥ 1536px</span></div><p>Example: <code>c-grid-cols-1 md:c-grid-cols-3</code>.</p></article>
        <article id="accessibility"><h3>Accessibility defaults</h3><ul><li>Native semantic HTML, not div elements with artificial roles.</li><li>Focus-visible rings for controls and navigation.</li><li>Dialog and BottomSheet use <code>dialog</code> elements with connected titles and descriptions.</li><li>RadioGroup uses <code>fieldset</code>/<code>legend</code>; Switch uses a native checkbox with <code>role="switch"</code>.</li><li>Toast/Toaster uses a live region, and errors use <code>role="alert"</code>.</li><li>Details, DropdownMenu, and Tooltip remain keyboard-accessible without additional runtime.</li></ul></article>
      </div></section>

      <ComponentBrowser />

      <section class="component-benefits"><h2>What the package guarantees</h2><div class="benefit-grid">{[[<ServerSquareIcon size={22} />, "Server-first", "Components produce complete HTML without hydration."], [<AccessibilityIcon size={22} />, "Accessible", "Sensible semantics, labels, statuses, errors, and focus states."], [<PaletteIcon size={22} />, "Customizable", "Tokens and classes can be extended through the class prop."], [<CheckCircleIcon size={22} />, "Honest surface", "The catalog shows only components that are genuinely available."]].map(([icon, title, text]) => <article><span class="love-icon" aria-hidden="true"><b>{icon}</b></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    </div>
  </main>,
});

function TokenSwatch({ name, variable, color }: { readonly name: string; readonly variable: string; readonly color: string }) {
  return <div><span class={`token-color token-color-${color.slice(1).toLowerCase()}`}></span><p><strong>{name}</strong><code>{variable}</code><small>{color}</small></p></div>;
}

function TokenBar({ label, size }: { readonly label: string; readonly size: string }) {
  return <div><span class={`token-width token-width-${size.replace("px", "")}`}></span><code>{label}</code></div>;
}
