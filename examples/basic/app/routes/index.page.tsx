import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BoltIcon from "@cocoframe/icons/linear/bolt";
import BranchingPathsUpIcon from "@cocoframe/icons/linear/branching-paths-up";
import ClockCircleIcon from "@cocoframe/icons/linear/clock-circle";
import CloseCircleIcon from "@cocoframe/icons/linear/close-circle";
import CloudCheckIcon from "@cocoframe/icons/linear/cloud-check";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DocumentTextIcon from "@cocoframe/icons/linear/document-text";
import LayersMinimalisticIcon from "@cocoframe/icons/linear/layers-minimalistic";
import RefreshCircleIcon from "@cocoframe/icons/linear/refresh-circle";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import UsersGroupRoundedIcon from "@cocoframe/icons/linear/users-group-rounded";
import { SyntaxHighlighter } from "@cocoframe/ui";
import { FeatureIcon, HeroArt } from "../components/marketing-shell.tsx";
import CopyCommand from "../islands/copy-command.island.tsx";
import Testimonials from "../islands/testimonials.island.tsx";

const features = [
  [BoltIcon, "Blazing Fast", "High performance through a lightweight, efficient architecture."],
  [LayersMinimalisticIcon, "Modular & Scalable", "A modular architecture that scales smoothly with your application."],
  [CodeSquareIcon, "Developer Friendly", "An outstanding developer experience with intuitive APIs and complete documentation."],
  [StarsMinimalisticIcon, "AI-Ready", "Purpose-built for AI integration and development automation."],
  [CloudCheckIcon, "Production Ready", "Ready for production with current best practices built in."],
  [ShieldCheckIcon, "Secure by Default", "Security comes first, with safe defaults from the start."],
] as const;

const pageCode = `export default definePage({
  meta: { title: "Hello" },
  view: () => <h1>Hello</h1>,
});`;

export default definePage({
  meta: { title: "CocoFrame — Build faster. Ship smarter.", description: "A fast, server-first TypeScript framework built for SEO, mobile clients, and efficient AI-assisted development.", canonical: "https://cocoframe.dev/", image: "/assets/cocoframe-hero-isometric.png" },
  cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },
  view: () => <main id="top">
    <section class="hero section-shell"><div class="hero-copy reveal"><span class="eyebrow pill">Modern · Fast · AI-Ready</span><h1>Build faster.<br /><span>Ship smarter.</span></h1><p>A modern framework for building fast, efficient web applications that are easy to evolve—by humans and AI alike.</p><div class="hero-actions"><a class="button button-primary" href="/docs/getting-started">Get Started <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-ghost" href="/docs">View Documentation</a></div><div class="hero-benefits" aria-label="Key benefits"><div><span class="mini-icon"><BoltIcon size={17} /></span><p><strong>Lightweight</strong><small>Remarkably lean</small></p></div><div><span class="mini-icon"><BranchingPathsUpIcon size={17} /></span><p><strong>Extensible</strong><small>Easy to extend</small></p></div><div><span class="mini-icon"><StarsMinimalisticIcon size={17} /></span><p><strong>AI-Optimized</strong><small>Ready for AI</small></p></div></div></div><HeroArt alt="CocoFrame isometric illustration" /></section>
    <section class="trusted" aria-label="Trusted by companies"><p>TRUSTED BY INNOVATIVE TEAMS</p><div class="logo-cloud"><span>ACME</span><span>Northstar</span><span>Vertex</span><span>Orbit</span><span>Pixelworks</span></div></section>
    <section class="features section-shell" id="features"><div class="section-heading reveal"><span class="eyebrow">FEATURES</span><h2>Everything you need to build<br />modern applications</h2></div><div class="feature-grid">{features.map(([Icon, title, description]) => <article class="feature-card reveal"><FeatureIcon><Icon size={27} /></FeatureIcon><h3>{title}</h3><p>{description}</p></article>)}</div><a class="button button-ghost feature-cta" href="/features">Explore All Features <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a></section>
    <section class="developer section-shell" id="developers"><div class="developer-copy reveal"><span class="eyebrow">BUILT FOR DEVELOPERS</span><h2>Clean. Intuitive.<br /><span>Powerful.</span></h2><p>Clear conventions and end-to-end TypeScript make applications easy to read, maintain, and evolve with AI assistance.</p><ul><li>Server-first and SEO-ready</li><li>TSX components with interactive islands</li><li>Typed APIs and automatic OpenAPI</li></ul></div><div class="code-window reveal"><div class="window-bar"><div><span></span><span></span><span></span></div><small>TypeScript</small></div><div class="file-tab"><DocumentTextIcon size={14} /> <span>app.tsx</span> <CloseCircleIcon size={14} /></div><SyntaxHighlighter code={pageCode} language="tsx" label="CocoFrame page example" /><CopyCommand command="npm create cocoframe@latest" /></div></section>
    <section class="love" id="community"><div class="section-heading reveal"><span class="eyebrow">WHY DEVELOPERS LOVE COCOFRAME</span><h2>Focus on what matters</h2></div><div class="love-grid section-shell">{[[<ClockCircleIcon size={23} />, "Save Time", "Cut development time by up to 50%."], [<UsersGroupRoundedIcon size={23} />, "Active Community", "Connect with fellow developers."], [<DocumentTextIcon size={23} />, "Complete Documentation", "Concise guides with practical examples."], [<RefreshCircleIcon size={23} />, "Regular Updates", "New features delivered consistently."]].map(([icon, title, text]) => <article><span class="love-icon"><b>{icon}</b></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section class="testimonials section-shell" id="templates"><div class="section-heading reveal"><span class="eyebrow">WHAT THEY SAY</span><h2>Trusted by exceptional developers</h2></div><Testimonials /></section>
    <section class="cta section-shell"><div><h2>Ready to build something<br />extraordinary?</h2><p>Start your next project with CocoFrame today.</p></div><div class="cta-actions"><a class="button button-light" href="/docs/getting-started">Get Started <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-outline-light" href="/docs">View Documentation</a></div></section>
  </main>,
});
