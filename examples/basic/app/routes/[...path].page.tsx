import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BoxMinimalisticIcon from "@cocoframe/icons/linear/box-minimalistic";
import ChatRoundDotsIcon from "@cocoframe/icons/linear/chat-round-dots";
import DocumentTextIcon from "@cocoframe/icons/linear/document-text";
import HomeIcon from "@cocoframe/icons/linear/home";
import UsersGroupRoundedIcon from "@cocoframe/icons/linear/users-group-rounded";
import Widget4Icon from "@cocoframe/icons/linear/widget-4";

const suggestions = [
  [DocumentTextIcon, "Documentation", "Pelajari fondasi CocoFrame langkah demi langkah.", "/docs", "Go to Docs"],
  [Widget4Icon, "Components", "Temukan komponen reusable yang siap digunakan.", "/components", "Browse Components"],
  [BoxMinimalisticIcon, "Templates", "Mulai lebih cepat dari template proyek gratis.", "/templates", "View Templates"],
  [UsersGroupRoundedIcon, "Community", "Dapatkan bantuan dan bagikan ide dengan komunitas.", "/contact", "Join Community"],
] as const;

export default definePage({
  load: ({ url }) => ({ path: url.pathname }),
  status: 404,
  meta: {
    title: "Page not found — CocoFrame",
    description: "Halaman yang Anda cari tidak tersedia.",
    robots: "noindex, nofollow",
  },
  view: ({ path }) => <main class="not-found-page" id="top">
    <section class="not-found-hero section-shell">
      <div class="not-found-copy">
        <p class="not-found-code" aria-label="Error 404">404</p>
        <h1>Oops! Page not found</h1>
        <p>Halaman <code>{path}</code> tidak dapat ditemukan. Halaman tersebut mungkin telah dipindahkan, dihapus, atau belum pernah tersedia.</p>
        <div class="not-found-actions">
          <a class="button button-primary" href="/"><HomeIcon size={17} /> Back to Home</a>
          <a class="button button-ghost" href="/docs">Browse Docs <ArrowRightIcon size={17} /></a>
        </div>
      </div>
      <figure class="not-found-art" aria-hidden="true">
        <div class="not-found-orbit"></div>
        <img src="/assets/cocoframe-hero-isometric.png" alt="" width="1536" height="1024" />
      </figure>
    </section>

    <section class="not-found-suggestions section-shell" aria-labelledby="not-found-suggestions-title">
      <h2 id="not-found-suggestions-title">Mungkin Anda mencari</h2>
      <div class="not-found-grid">{suggestions.map(([Icon, title, description, href, action]) => <article><span aria-hidden="true"><Icon size={24} /></span><h3>{title}</h3><p>{description}</p><a href={href}>{action} <ArrowRightIcon size={14} /></a></article>)}</div>
    </section>

    <section class="not-found-support section-shell">
      <span aria-hidden="true"><ChatRoundDotsIcon size={30} /></span>
      <div><h2>Masih membutuhkan bantuan?</h2><p>Hubungi kami jika Anda merasa halaman ini seharusnya tersedia.</p></div>
      <a class="button button-ghost" href="/contact">Contact Support <ArrowRightIcon size={16} /></a>
    </section>
  </main>,
});
