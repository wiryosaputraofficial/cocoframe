import type { CocoNode } from "@cocoframe/jsx";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";

export type ProjectPageId = "about" | "versioning" | "deployment" | "conventions" | "contact";

const projectLinks: readonly (readonly [ProjectPageId, string, string])[] = [
  ["about", "About", "/about"],
  ["versioning", "Versioning", "/versioning"],
  ["deployment", "Deployment", "/deployment"],
  ["conventions", "Conventions", "/conventions"],
  ["contact", "Contact", "/contact"],
] as const;

export function ProjectHero({ active, eyebrow, title, description, icon, children }: {
  readonly active: ProjectPageId;
  readonly eyebrow: string;
  readonly title: CocoNode;
  readonly description: string;
  readonly icon: CocoNode;
  readonly children?: CocoNode;
}) {
  return <>
    <section class="project-hero section-shell">
      <div class="project-hero__copy reveal">
        <span class="eyebrow pill">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children ? <div class="project-hero__actions">{children}</div> : null}
      </div>
      <div class="project-hero__visual reveal" aria-hidden="true">
        <div class="project-hero__orbit"></div>
        <span>{icon}</span>
        <i></i><i></i><i></i>
      </div>
    </section>
    <nav class="project-nav section-shell" aria-label="Project pages">
      {projectLinks.map(([id, label, href]) => <a href={href} aria-current={id === active ? "page" : undefined}>{label}</a>)}
    </nav>
  </>;
}

export function ProjectSection({ id, eyebrow, title, description, children, class: className = "" }: {
  readonly id?: string;
  readonly eyebrow: string;
  readonly title: CocoNode;
  readonly description: string;
  readonly children: CocoNode;
  readonly class?: string;
}) {
  return <section class={`project-section section-shell ${className}`.trim()} id={id}>
    <header class="project-section__heading reveal"><span class="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></header>
    {children}
  </section>;
}

export function ProjectCard({ icon, title, children }: { readonly icon: CocoNode; readonly title: string; readonly children: CocoNode }) {
  return <article class="project-card reveal"><span aria-hidden="true">{icon}</span><h3>{title}</h3><div>{children}</div></article>;
}

export function ProjectCta({ title, description, href, label }: { readonly title: string; readonly description: string; readonly href: string; readonly label: string }) {
  return <section class="project-cta section-shell reveal"><div><h2>{title}</h2><p>{description}</p></div><a class="button button-primary" href={href}>{label} <ArrowRightIcon size={16} /></a></section>;
}
