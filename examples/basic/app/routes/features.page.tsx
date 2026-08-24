import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BoltIcon from "@cocoframe/icons/linear/bolt";
import CloudCheckIcon from "@cocoframe/icons/linear/cloud-check";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import GalleryIcon from "@cocoframe/icons/linear/gallery";
import ChecklistIcon from "@cocoframe/icons/linear/checklist";
import LayersMinimalisticIcon from "@cocoframe/icons/linear/layers-minimalistic";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import { Cta, FeatureIcon } from "../components/marketing-shell.tsx";

const items = [
  [BoltIcon, "Blazing Fast", "High performance through a lightweight, efficient architecture.", ["Server-first rendering", "Minimal browser bundle", "Streaming SSR"]],
  [LayersMinimalisticIcon, "Modular & Scalable", "A modular architecture that scales smoothly with your application.", ["Independent packages", "File-based routing", "Database adapters"]],
  [CodeSquareIcon, "Developer Friendly", "An outstanding developer experience with intuitive APIs and complete documentation.", ["TypeScript end-to-end", "Hot reload", "Concise CLI"]],
  [StarsMinimalisticIcon, "AI-Ready", "Purpose-built for AI integration and development automation.", ["CocoSpecs + CocoRef + CocoQA", "MCP Agent Bridge", "Inspectable manifest"]],
  [CloudCheckIcon, "Production Ready", "Ready for production with current best practices built in.", ["Hashed assets", "Health checks", "Graceful shutdown"]],
  [ShieldCheckIcon, "Secure by Default", "Security comes first, with safe defaults from the start.", ["Security headers", "CSRF protection", "Body limit & timeout"]],
] as const;

export default definePage({
  meta: { title: "Features — CocoFrame", description: "CocoFrame features for fast, scalable, secure, SEO-friendly, and AI-ready web applications with approved lifecycle workflows and a local MCP Agent Bridge.", canonical: "https://cocoframe.dev/features", image: "/assets/cocoframe-hero-isometric.png" },
  view: () => <main id="top">
    <section class="features-hero section-shell"><div class="features-hero-copy reveal"><span class="eyebrow pill">FEATURES</span><h1>Everything you need to<br />build <span>better applications</span></h1><p>A complete foundation for modern products without unnecessary complexity.</p><div class="hero-actions"><a class="button button-primary" href="/docs/getting-started">Get Started <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-ghost" href="/docs">View Documentation</a></div></div><div class="features-hero-art reveal"><div class="hero-art-glow"></div><img src="/assets/cocoframe-hero-isometric.png" alt="CocoFrame feature illustration" width="768" height="512" /></div></section>
    <section class="core-features section-shell"><div class="section-heading reveal"><span class="eyebrow">CORE FEATURES</span><h2>Powerful features for modern development</h2></div><div class="core-grid">{items.map(([Icon, title, text, details]) => <article class="core-card reveal"><div class="core-card-head"><FeatureIcon><Icon size={27} /></FeatureIcon><div><h3>{title}</h3><p>{text}</p></div></div><ul>{details.map((detail) => <li>{detail}</li>)}</ul></article>)}</div></section>
    <section class="cocospecs-feature section-shell reveal"><span aria-hidden="true"><StarsMinimalisticIcon size={29} /></span><div><h2>Meet CocoSpecs</h2><p>Give AI one feature request, answer a small adaptive question batch, and receive a complete PRD, flowchart, database proposal, acceptance criteria, and approved implementation plan.</p></div><a class="button" href="/cocospecs">Explore CocoSpecs <ArrowRightIcon size={16} /></a></section>
    <section class="cocospecs-feature cocoref-feature section-shell reveal"><span aria-hidden="true"><GalleryIcon size={29} /></span><div><h2>Meet CocoRef</h2><p>Give AI an image or website, audit your existing component system, and preview every missing candidate through a consent and approval loop before it enters the application.</p></div><a class="button" href="/cocoref">Explore CocoRef <ArrowRightIcon size={16} /></a></section>
    <section class="cocospecs-feature cocoqa-feature section-shell reveal"><span aria-hidden="true"><ChecklistIcon size={29} /></span><div><h2>Meet CocoQA</h2><p>Turn approved requirements into adaptive quality decisions, traceable cases, automated gates, defect evidence, and explicit release approval.</p></div><a class="button" href="/cocoqa">Explore CocoQA <ArrowRightIcon size={16} /></a></section>
    <section class="cocospecs-feature section-shell reveal"><span aria-hidden="true"><CodeSquareIcon size={29} /></span><div><h2>Connect through Agent Bridge</h2><p>Let supported AI clients discover and reuse CocoFrame capabilities, prepare approved lifecycles, and apply exact file changes only through expiring, role-aware, hash-bound human approval.</p></div><a class="button" href="/docs/agent-bridge">Explore Agent Bridge <ArrowRightIcon size={16} /></a></section>
    <section class="integrations section-shell reveal"><div class="integration-copy"><span class="eyebrow">BUILT FOR MODERN STACK</span><h2>Seamless integration with the<br />modern tools you already use</h2><p>Build with Web Standards and the TypeScript ecosystem you already know.</p><a class="button button-ghost" href="/docs">View Integration Documentation <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a></div><figure class="integration-art"><img src="/assets/cocoframe-modern-stack.png" alt="Illustration of an interconnected modern web development toolchain" width="1536" height="1024" loading="lazy" decoding="async" /></figure></section>
    <Cta />
  </main>,
});
