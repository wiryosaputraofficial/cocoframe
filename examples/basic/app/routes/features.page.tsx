import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BoltIcon from "@cocoframe/icons/linear/bolt";
import CloudCheckIcon from "@cocoframe/icons/linear/cloud-check";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import LayersMinimalisticIcon from "@cocoframe/icons/linear/layers-minimalistic";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import { Cta, FeatureIcon } from "../components/marketing-shell.tsx";

const items = [
  [BoltIcon, "Blazing Fast", "Performa tinggi dengan arsitektur yang ringan dan efisien.", ["Server-first rendering", "Bundle browser minimal", "Streaming SSR"]],
  [LayersMinimalisticIcon, "Modular & Scalable", "Arsitektur modular yang memudahkan scaling aplikasi Anda.", ["Package terpisah", "File-based routing", "Adapter database"]],
  [CodeSquareIcon, "Developer Friendly", "DX luar biasa dengan API intuitif dan dokumentasi lengkap.", ["TypeScript end-to-end", "Hot reload", "CLI ringkas"]],
  [StarsMinimalisticIcon, "AI-Ready", "Dibangun khusus untuk integrasi AI dan otomatisasi pengembangan.", ["Konvensi eksplisit", "Konteks rendah token", "Manifest yang dapat diperiksa"]],
  [CloudCheckIcon, "Production Ready", "Siap digunakan di produksi dengan best practice terkini.", ["Hashed assets", "Health checks", "Graceful shutdown"]],
  [ShieldCheckIcon, "Secure by Default", "Keamanan menjadi prioritas dengan konfigurasi aman sejak awal.", ["Security headers", "CSRF protection", "Body limit & timeout"]],
] as const;

export default definePage({
  meta: { title: "Features — CocoFrame", description: "Fitur CocoFrame untuk aplikasi web cepat, scalable, aman, SEO-friendly, dan AI-ready.", canonical: "https://cocoframe.dev/features", image: "/assets/cocoframe-hero-isometric.png" },
  view: () => <main id="top">
    <section class="features-hero section-shell"><div class="features-hero-copy reveal"><span class="eyebrow pill">FEATURES</span><h1>Everything you need to<br />build <span>better applications</span></h1><p>Fondasi lengkap untuk membuat produk modern tanpa membawa kompleksitas yang tidak diperlukan.</p><div class="hero-actions"><a class="button button-primary" href="/docs#quick-start">Get Started <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-ghost" href="/docs">View Documentation</a></div></div><div class="features-hero-art reveal"><div class="hero-art-glow"></div><img src="/assets/cocoframe-hero-isometric.png" alt="Ilustrasi fitur CocoFrame" width="768" height="512" /></div></section>
    <section class="core-features section-shell"><div class="section-heading reveal"><span class="eyebrow">CORE FEATURES</span><h2>Powerful features for modern development</h2></div><div class="core-grid">{items.map(([Icon, title, text, details]) => <article class="core-card reveal"><div class="core-card-head"><FeatureIcon><Icon size={27} /></FeatureIcon><div><h3>{title}</h3><p>{text}</p></div></div><ul>{details.map((detail) => <li>{detail}</li>)}</ul></article>)}</div></section>
    <section class="integrations section-shell reveal"><div class="integration-copy"><span class="eyebrow">BUILT FOR MODERN STACK</span><h2>Integrasi mulus dengan tools<br />modern yang Anda gunakan</h2><p>Gunakan standar web dan ekosistem TypeScript yang sudah Anda kenal.</p><a class="button button-ghost" href="/docs">Lihat Dokumentasi Integrasi <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a></div><figure class="integration-art"><img src="/assets/cocoframe-modern-stack.png" alt="Ilustrasi toolchain pengembangan web modern yang saling terhubung" width="1536" height="1024" loading="lazy" decoding="async" /></figure></section>
    <Cta />
  </main>,
});
