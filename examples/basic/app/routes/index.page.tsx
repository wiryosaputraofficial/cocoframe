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
  [BoltIcon, "Blazing Fast", "Performa tinggi dengan arsitektur yang ringan dan efisien."],
  [LayersMinimalisticIcon, "Modular & Scalable", "Arsitektur modular yang memudahkan scaling aplikasi Anda."],
  [CodeSquareIcon, "Developer Friendly", "DX yang luar biasa dengan API intuitif dan dokumentasi lengkap."],
  [StarsMinimalisticIcon, "AI-Ready", "Dibangun khusus untuk integrasi AI dan otomatisasi pengembangan."],
  [CloudCheckIcon, "Production Ready", "Siap digunakan di produksi dengan best practice terkini."],
  [ShieldCheckIcon, "Secure by Default", "Keamanan menjadi prioritas dengan konfigurasi aman sejak awal."],
] as const;

const pageCode = `export default definePage({
  meta: { title: "Hello" },
  view: () => <h1>Hello</h1>,
});`;

export default definePage({
  meta: { title: "CocoFrame — Build faster. Ship smarter.", description: "Framework TypeScript server-first yang cepat, SEO-friendly, mobile-ready, dan efisien untuk pengembangan bersama AI.", canonical: "https://cocoframe.dev/", image: "/assets/cocoframe-hero-isometric.png" },
  cache: { browser: 60, edge: 300, staleWhileRevalidate: 600 },
  view: () => <main id="top">
    <section class="hero section-shell"><div class="hero-copy reveal"><span class="eyebrow pill">Modern · Fast · AI-Ready</span><h1>Build faster.<br /><span>Ship smarter.</span></h1><p>Framework modern untuk membangun aplikasi web yang cepat, efisien, dan mudah dikembangkan—oleh manusia maupun AI.</p><div class="hero-actions"><a class="button button-primary" href="/docs#quick-start">Get Started <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-ghost" href="/docs">View Documentation</a></div><div class="hero-benefits" aria-label="Keunggulan utama"><div><span class="mini-icon"><BoltIcon size={17} /></span><p><strong>Lightweight</strong><small>Super ringan</small></p></div><div><span class="mini-icon"><BranchingPathsUpIcon size={17} /></span><p><strong>Extensible</strong><small>Mudah diperluas</small></p></div><div><span class="mini-icon"><StarsMinimalisticIcon size={17} /></span><p><strong>AI-Optimized</strong><small>Siap untuk AI</small></p></div></div></div><HeroArt alt="Ilustrasi isometrik CocoFrame" /></section>
    <section class="trusted" aria-label="Dipercaya oleh perusahaan"><p>TRUSTED BY INNOVATIVE TEAMS</p><div class="logo-cloud"><span>ACME</span><span>Northstar</span><span>Vertex</span><span>Orbit</span><span>Pixelworks</span></div></section>
    <section class="features section-shell" id="features"><div class="section-heading reveal"><span class="eyebrow">FEATURES</span><h2>Everything you need to build<br />modern applications</h2></div><div class="feature-grid">{features.map(([Icon, title, description]) => <article class="feature-card reveal"><FeatureIcon><Icon size={27} /></FeatureIcon><h3>{title}</h3><p>{description}</p></article>)}</div><a class="button button-ghost feature-cta" href="/features">Explore All Features <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a></section>
    <section class="developer section-shell" id="developers"><div class="developer-copy reveal"><span class="eyebrow">BUILT FOR DEVELOPERS</span><h2>Clean. Intuitive.<br /><span>Powerful.</span></h2><p>Konvensi yang jelas dan TypeScript end-to-end membuat aplikasi mudah dibaca, dirawat, dan dikembangkan dengan bantuan AI.</p><ul><li>Server-first dan SEO-ready</li><li>Komponen TSX dengan islands interaktif</li><li>API typed dan OpenAPI otomatis</li></ul></div><div class="code-window reveal"><div class="window-bar"><div><span></span><span></span><span></span></div><small>TypeScript</small></div><div class="file-tab"><DocumentTextIcon size={14} /> <span>app.tsx</span> <CloseCircleIcon size={14} /></div><SyntaxHighlighter code={pageCode} language="tsx" label="CocoFrame page example" /><CopyCommand command="npm create cocoframe@latest" /></div></section>
    <section class="love" id="community"><div class="section-heading reveal"><span class="eyebrow">WHY DEVELOPERS LOVE COCOFRAME</span><h2>Fokus pada hal penting</h2></div><div class="love-grid section-shell">{[[<ClockCircleIcon size={23} />, "Hemat Waktu", "Kurangi waktu development hingga 50%."], [<UsersGroupRoundedIcon size={23} />, "Komunitas Aktif", "Bergabung dengan developer lainnya."], [<DocumentTextIcon size={23} />, "Dokumentasi Lengkap", "Panduan ringkas dengan contoh nyata."], [<RefreshCircleIcon size={23} />, "Update Berkala", "Rilis fitur baru secara konsisten."]].map(([icon, title, text]) => <article><span class="love-icon"><b>{icon}</b></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section class="testimonials section-shell" id="templates"><div class="section-heading reveal"><span class="eyebrow">WHAT THEY SAY</span><h2>Dipercaya oleh developer hebat</h2></div><Testimonials /></section>
    <section class="cta section-shell"><div><h2>Siap membangun sesuatu<br />yang luar biasa?</h2><p>Mulai project Anda dengan CocoFrame sekarang juga.</p></div><div class="cta-actions"><a class="button button-light" href="/docs#quick-start">Get Started <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-outline-light" href="/docs">View Documentation</a></div></section>
  </main>,
});
