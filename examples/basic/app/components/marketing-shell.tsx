import type { CocoNode } from "@cocoframe/jsx";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import ChatRoundDotsIcon from "@cocoframe/icons/linear/chat-round-dots";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import GlobalIcon from "@cocoframe/icons/linear/global";
import VideoFramePlayHorizontalIcon from "@cocoframe/icons/linear/video-frame-play-horizontal";
import SiteHeader from "../islands/site-header.island.tsx";

export function MarketingHeader({ active }: { readonly active: "home" | "features" | "docs" | "cocoql" | "components" | "icons" | "templates" | "none" }) {
  return <SiteHeader active={active} />;
}

export function MarketingFooter() {
  return (
    <footer class="site-footer">
      <div class="footer-grid section-shell">
        <div class="footer-brand">
          <a class="brand footer-logo" href="/#top" aria-label="CocoFrame home"><img src="/assets/cocoframe-icon.png" alt="" /><span>cocoframe</span></a>
          <p>A modern framework for building fast, efficient, AI-friendly web applications.</p>
          <div class="socials">
            <a href="/docs#contributing" aria-label="Source and contribution guide"><CodeSquareIcon size={17} /></a>
            <a href="/contact" aria-label="Contact support"><ChatRoundDotsIcon size={17} /></a>
            <a href="/docs#roadmap" aria-label="CocoFrame roadmap"><GlobalIcon size={17} /></a>
            <a href="/docs/getting-started" aria-label="CocoFrame quick start"><VideoFramePlayHorizontalIcon size={17} /></a>
          </div>
        </div>
        <FooterColumn title="Product" links={[["Features", "/features"], ["CocoSpecs", "/cocospecs"], ["CocoRef", "/cocoref"], ["CocoQA", "/cocoqa"], ["Docs", "/docs"], ["CocoQL", "/cocoql"], ["Components", "/components"], ["Icons", "/icons"], ["Templates", "/templates"]]} />
        <FooterColumn title="Resources" links={[["Guides", "/docs#guides"], ["API Reference", "/docs/api-reference"], ["Recipes", "/docs#recipes"], ["Troubleshooting", "/docs#troubleshooting"], ["Roadmap", "/docs#roadmap"]]} />
        <FooterColumn title="Community" links={[["Contributing", "/docs#contributing"], ["Support", "/contact"], ["CocoQL", "/cocoql"], ["Component Library", "/components"], ["Icon Library", "/icons"]]} />
        <FooterColumn title="Project" links={[["About", "/about"], ["Versioning", "/versioning"], ["Deployment", "/deployment"], ["Conventions", "/conventions"], ["Contact", "/contact"]]} />
      </div>
      <p class="copyright">© 2026 CocoFrame. All rights reserved.</p>
    </footer>
  );
}

function FooterColumn({ title, links }: { readonly title: string; readonly links: readonly (readonly [string, string])[] }) {
  return <div><h3>{title}</h3>{links.map(([label, href]) => <a href={href}>{label}</a>)}</div>;
}

export function HeroArt({ alt }: { readonly alt: string }) {
  return <div class="hero-visual reveal"><div class="hero-art-glow"></div><img class="hero-art" src="/assets/cocoframe-hero-isometric.png" alt={alt} width="768" height="512" /></div>;
}

export function FeatureIcon({ children }: { readonly children: CocoNode }) {
  return <span class="feature-icon" aria-hidden="true"><b>{children}</b></span>;
}

export function Cta() {
  return <section class="cta section-shell" id="get-started"><div><h2>Ready to build something<br />extraordinary?</h2><p>Start your next project with CocoFrame today.</p></div><div class="cta-actions"><a class="button button-light" href="/docs/getting-started">Get Started <span aria-hidden="true"><ArrowRightIcon size={17} /></span></a><a class="button button-outline-light" href="/docs">View Documentation</a></div></section>;
}
