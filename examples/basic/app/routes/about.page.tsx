import { definePage } from "@cocoframe/core";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DatabaseIcon from "@cocoframe/icons/linear/database";
import GlobalIcon from "@cocoframe/icons/linear/global";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import Widget4Icon from "@cocoframe/icons/linear/widget-4";
import { ProjectCard, ProjectCta, ProjectHero, ProjectSection } from "../components/project-page.tsx";

const milestones = [
  ["01", "Useful HTML first", "Every page produces complete HTML, SEO metadata, and the correct HTTP status without waiting for browser JavaScript."],
  ["02", "Interactivity by intent", "JavaScript is sent only for genuinely interactive islands; static pages do not hydrate the entire document."],
  ["03", "One explicit path", "Pages, API contracts, forms, database adapters, and middleware each follow one primary convention that is easy for both humans and AI to understand."],
  ["04", "Portable contracts", "Web and mobile use the same generated Fetch client without importing UI or server runtimes."],
] as const;

export default definePage({
  meta: {
    title: "About CocoFrame",
    description: "Learn why CocoFrame is server-first, AI-friendly, mobile-ready, and deliberately small.",
    canonical: "https://cocoframe.dev/about",
    image: "/assets/cocoframe-hero-isometric.png",
  },
  view: () => <main class="project-page" id="top">
    <ProjectHero active="about" eyebrow="ABOUT COCOFRAME" title={<>A smaller framework<br />for ambitious products.</>} description="CocoFrame is a server-first TypeScript framework for building fast, SEO-friendly web applications, contracted APIs, and clients reusable on mobile—with a deliberately small API surface." icon={<GlobalIcon size={86} />}>
      <a class="button button-primary" href="/docs/getting-started">Start building</a>
      <a class="button button-ghost" href="/features">Explore features</a>
    </ProjectHero>

    <ProjectSection eyebrow="WHY IT EXISTS" title="Framework should reduce decisions, not add rituals." description="CocoFrame is built to keep request paths simple, output easy to inspect, and implementation context small as projects grow.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<StarsMinimalisticIcon size={25} />} title="AI-friendly by structure"><p>A single page lifecycle, typed APIs, an inspectable manifest, and generated contracts reduce the files and tokens AI needs to read.</p></ProjectCard>
        <ProjectCard icon={<ShieldCheckIcon size={25} />} title="Server-first by default"><p>Rendering, escaping, metadata, form validation, and security boundaries live on the server. The browser runtime is always opt-in.</p></ProjectCard>
        <ProjectCard icon={<DatabaseIcon size={25} />} title="Data without lock-in"><p>Database adapters, CocoQL, and Fetch-standard clients keep data contracts explicit without binding applications to a UI framework.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="DESIGN PRINCIPLES" title="Four decisions shape every package." description="These principles set boundaries for new features and help keep maintenance consistent.">
      <div class="project-milestones">{milestones.map(([number, title, description]) => <article class="reveal"><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
    </ProjectSection>

    <ProjectSection eyebrow="CURRENT SCOPE" title="An architectural MVP with real foundations." description="The current workspace already includes runtime, routing, streaming, forms, security, observability, UI, icons, database adapters, generated clients, and CocoQL. Public package publishing remains the next milestone.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<CodeSquareIcon size={25} />} title="Typed framework"><p>Public APIs are exported from <code>@cocoframe/*</code> packages and verified through TypeScript and the test suite.</p></ProjectCard>
        <ProjectCard icon={<Widget4Icon size={25} />} title="Complete web surface"><p>Pages, layouts, APIs, forms, middleware, islands, UI primitives, charts, icons, SEO, and error boundaries are available in one stack.</p></ProjectCard>
        <ProjectCard icon={<GlobalIcon size={25} />} title="Web standards"><p>Request, Response, Fetch, URL, Headers, AbortSignal, and streaming are the primary boundaries that keep deployments and mobile clients portable.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectCta title="See how the pieces fit together." description="Start with the architecture documentation and build your first page." href="/docs#architecture" label="Read architecture" />
  </main>,
});
