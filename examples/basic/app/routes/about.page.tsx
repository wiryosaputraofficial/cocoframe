import { definePage } from "@cocoframe/core";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DatabaseIcon from "@cocoframe/icons/linear/database";
import GlobalIcon from "@cocoframe/icons/linear/global";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import Widget4Icon from "@cocoframe/icons/linear/widget-4";
import { ProjectCard, ProjectCta, ProjectHero, ProjectSection } from "../components/project-page.tsx";

const milestones = [
  ["01", "Useful HTML first", "Setiap halaman menghasilkan HTML lengkap, metadata SEO, dan status HTTP yang benar tanpa menunggu JavaScript browser."],
  ["02", "Interactivity by intent", "JavaScript hanya dikirim untuk island yang memang interaktif; halaman statis tidak menghidrasi seluruh dokumen."],
  ["03", "One explicit path", "Page, API contract, form, database adapter, dan middleware memiliki satu konvensi utama agar mudah dipahami manusia maupun AI."],
  ["04", "Portable contracts", "Web dan mobile memakai generated Fetch client yang sama tanpa mengimpor runtime UI atau server."],
] as const;

export default definePage({
  meta: {
    title: "About CocoFrame",
    description: "Learn why CocoFrame is server-first, AI-friendly, mobile-ready, and deliberately small.",
    canonical: "https://cocoframe.dev/about",
    image: "/assets/cocoframe-hero-isometric.png",
  },
  view: () => <main class="project-page" id="top">
    <ProjectHero active="about" eyebrow="ABOUT COCOFRAME" title={<>A smaller framework<br />for ambitious products.</>} description="CocoFrame adalah framework TypeScript server-first untuk membangun web cepat, SEO-friendly, API terkontrak, dan client yang dapat dipakai ulang pada mobile—dengan permukaan API yang sengaja dibuat kecil." icon={<GlobalIcon size={86} />}>
      <a class="button button-primary" href="/docs#quick-start">Start building</a>
      <a class="button button-ghost" href="/features">Explore features</a>
    </ProjectHero>

    <ProjectSection eyebrow="WHY IT EXISTS" title="Framework should reduce decisions, not add rituals." description="CocoFrame dibangun untuk menjaga request path sederhana, output mudah diperiksa, dan konteks implementasi tetap kecil saat proyek tumbuh.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<StarsMinimalisticIcon size={25} />} title="AI-friendly by structure"><p>Satu lifecycle page, API yang typed, manifest inspectable, dan generated contract mengurangi file serta token yang perlu dibaca AI.</p></ProjectCard>
        <ProjectCard icon={<ShieldCheckIcon size={25} />} title="Server-first by default"><p>Rendering, escaping, metadata, form validation, dan security boundary berada di server. Browser runtime selalu opt-in.</p></ProjectCard>
        <ProjectCard icon={<DatabaseIcon size={25} />} title="Data without lock-in"><p>Adapter database, CocoQL, dan Fetch-standard client menjaga kontrak data tetap eksplisit tanpa mengikat aplikasi ke UI framework.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="DESIGN PRINCIPLES" title="Four decisions shape every package." description="Prinsip ini menjadi batas saat menambah fitur baru dan membantu menjaga pemeliharaan tetap konsisten.">
      <div class="project-milestones">{milestones.map(([number, title, description]) => <article class="reveal"><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
    </ProjectSection>

    <ProjectSection eyebrow="CURRENT SCOPE" title="An architectural MVP with real foundations." description="Workspace saat ini sudah memiliki runtime, routing, streaming, forms, security, observability, UI, icons, database adapters, generated clients, dan CocoQL. Package publishing publik masih menjadi milestone berikutnya.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<CodeSquareIcon size={25} />} title="Typed framework"><p>Public APIs diekspor dari paket <code>@cocoframe/*</code> dan diverifikasi melalui TypeScript serta test suite.</p></ProjectCard>
        <ProjectCard icon={<Widget4Icon size={25} />} title="Complete web surface"><p>Pages, layouts, APIs, forms, middleware, islands, UI primitives, charts, icons, SEO, dan error boundaries tersedia dalam satu stack.</p></ProjectCard>
        <ProjectCard icon={<GlobalIcon size={25} />} title="Web standards"><p>Request, Response, Fetch, URL, Headers, AbortSignal, dan streaming menjadi boundary utama agar deployment dan mobile tetap portabel.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectCta title="See how the pieces fit together." description="Mulai dari dokumentasi arsitektur dan bangun halaman pertama Anda." href="/docs#architecture" label="Read architecture" />
  </main>,
});
