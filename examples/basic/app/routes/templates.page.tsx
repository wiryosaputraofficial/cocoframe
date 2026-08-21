import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import Book2Icon from "@cocoframe/icons/linear/book-2";
import TemplateCatalog from "../islands/template-catalog.island.tsx";

export default definePage({
  meta: {
    title: "Templates — CocoFrame",
    description: "Template CocoFrame siap pakai untuk dashboard, web application, SaaS, e-commerce, blog, dokumentasi, dan REST API.",
    canonical: "https://cocoframe.dev/templates",
    image: "/assets/cocoframe-hero-isometric.png",
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "CocoFrame Templates",
      description: "Koleksi template aplikasi web yang dibangun dengan CocoFrame.",
      inLanguage: "id",
    },
  },
  view: () => <main class="templates-page" id="top">
    <section class="templates-hero section-shell">
      <div class="templates-hero-copy reveal">
        <span class="eyebrow pill">TEMPLATES</span>
        <h1>Start your project<br />with <span>powerful templates</span></h1>
        <p>Template siap pakai untuk berbagai kebutuhan proyek Anda. Dibangun dengan CocoFrame, design system yang konsisten, dan praktik terbaik.</p>
        <div class="templates-hero-actions"><a class="button button-primary" href="#catalog">Browse Templates <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-ghost" href="/docs">View Documentation <span aria-hidden="true"><Book2Icon size={17} /></span></a></div>
        <div class="templates-hero-proof"><span><strong>14</strong> curated templates</span><span><strong>25</strong> UI components</span><span><strong>SSR</strong> by default</span></div>
      </div>
      <div class="templates-hero-art reveal"><div class="hero-art-glow"></div><img src="/assets/cocoframe-hero-isometric.png" alt="Ilustrasi modular CocoFrame untuk template web" width="768" height="512" /></div>
    </section>

    <TemplateCatalog />

    <section class="templates-bottom-cta section-shell">
      <div><span class="eyebrow">BUILD YOUR OWN</span><h2>Tidak menemukan template yang tepat?</h2><p>Mulai dari fondasi CocoFrame atau kirim template Anda untuk komunitas.</p></div>
      <div><a class="button button-primary" href="/docs#quick-start">Create from scratch</a><a class="button button-ghost" href="/contact">Submit a template</a></div>
    </section>
  </main>,
});
