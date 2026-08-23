import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import CheckCircleIcon from "@cocoframe/icons/linear/check-circle";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import EyeIcon from "@cocoframe/icons/linear/eye";
import GalleryIcon from "@cocoframe/icons/linear/gallery";
import LayersIcon from "@cocoframe/icons/linear/layers-minimalistic";
import LinkIcon from "@cocoframe/icons/linear/link-circle";
import MagicWandIcon from "@cocoframe/icons/linear/magic-wand";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import { ProjectCard, ProjectCta, ProjectSection } from "../components/project-page.tsx";

const workflow = [
  ["01", "Attach a reference", "Add a local image or an HTTP website. CocoRef keeps the evidence attached to one review session."],
  ["02", "Audit before creating", "AI compares visible needs with CocoFrame UI, application components, islands, and prior approvals."],
  ["03", "Ask for consent", "A missing component remains blocked until the user explicitly permits a temporary candidate."],
  ["04", "Preview, refine, approve", "The actual TSX candidate receives a local URL, keeps feedback history, and is promoted only after approval."],
] as const;

export default definePage({
  meta: {
    title: "CocoRef — Adaptive Reference Components for CocoFrame",
    description: "Give AI an image or website reference, audit existing components, preview missing candidates, and approve exact reusable CocoFrame source.",
    canonical: "https://cocoframe.dev/cocoref",
    image: "/assets/cocoframe-hero-isometric.png",
  },
  view: () => <main class="project-page cocoref-page" id="top">
    <section class="cocoref-hero section-shell">
      <div class="cocoref-hero__copy reveal">
        <span class="eyebrow pill">REFERENCE-DRIVEN UI</span>
        <h1>Show the direction.<br /><span>Approve every new piece.</span></h1>
        <p>CocoRef helps AI learn from an image or website, reuse what your project already has, and ask before creating anything missing. Every new component is previewed, refined, and explicitly approved.</p>
        <div class="hero-actions"><a class="button button-primary" href="/docs/cocoref">Start with CocoRef <ArrowRightIcon size={17} /></a><a class="button button-ghost" href="#workflow">See the workflow</a></div>
        <ul class="cocoref-hero__proof"><li>Inventory first</li><li>Consent required</li><li>Actual TSX preview</li></ul>
      </div>
      <aside class="cocoref-audit reveal" aria-label="Example CocoRef component audit">
        <header><span><GalleryIcon size={18} /> dashboard-reference.png</span><code>state: awaiting-consent</code></header>
        <div class="cocoref-audit__canvas"><span><LayersIcon size={29} /></span><strong>Reference analyzed</strong><small>6 visible component requirements</small></div>
        <ul>
          <li><CheckCircleIcon size={17} /><div><strong>Primary action</strong><small>Reuse <code>ui:Button</code></small></div><b>REUSE</b></li>
          <li><CheckCircleIcon size={17} /><div><strong>Summary cards</strong><small>Reuse <code>component:stat-card</code></small></div><b>REUSE</b></li>
          <li class="cocoref-audit__missing"><MagicWandIcon size={17} /><div><strong>Expandable activity feed</strong><small>No matching component found</small></div><b>ASK</b></li>
        </ul>
        <footer>May I create and preview the missing activity feed?</footer>
      </aside>
    </section>

    <ProjectSection id="workflow" eyebrow="CONTROLLED WORKFLOW" title="Reference fidelity without silent duplication." description="CocoRef turns visual interpretation into an explicit component map and keeps user approval at every irreversible design decision.">
      <div class="cocoref-step-grid">{workflow.map(([number, title, description]) => <article class="cocoref-step reveal"><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    </ProjectSection>

    <ProjectSection id="audit" eyebrow="COMPONENT AUDIT" title="Check the system before extending it." description="The AI receives a compact inventory and must explain every reuse or missing decision. A reference never becomes permission to add redundant code.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<LayersIcon size={25} />} title="Complete inventory"><p>Built-in UI primitives, local components, islands, and previously approved CocoRef candidates share one searchable map.</p></ProjectCard>
        <ProjectCard icon={<ShieldCheckIcon size={25} />} title="Explicit consent"><p>Missing items stop at <code>awaiting-consent</code>. The original page request cannot be treated as permission to create them.</p></ProjectCard>
        <ProjectCard icon={<EyeIcon size={25} />} title="Source-faithful preview"><p>The local URL renders the same TSX and CSS that approval later promotes—there is no separate mock implementation.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection id="revision-loop" eyebrow="APPROVAL LOOP" title="Keep asking what is missing until it is right." description="Feedback reopens the same candidate. The preview URL remains stable while revision numbers and decisions remain reviewable.">
      <div class="cocoref-loop reveal">
        <div><span>1</span><strong>Preview ready</strong><small>Local development URL</small></div><i>→</i><div><span>2</span><strong>User reviews</strong><small>Approve or explain the gap</small></div><i>→</i><div><span>3</span><strong>AI revises</strong><small>Same candidate source</small></div><i>↺</i><div class="cocoref-loop__approved"><span>✓</span><strong>Promote</strong><small>Temporary route removed</small></div>
      </div>
    </ProjectSection>

    <ProjectSection id="cli" eyebrow="CLI WORKFLOW" title="A lifecycle that humans and AI can inspect." description="Canonical JSON keeps orchestration deterministic; Markdown reports make component choices and user feedback easy to review.">
      <div class="project-split project-split--structure">
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>terminal</span><small>CocoRef CLI</small></div><pre class="coco-syntax"><code>{`cocoframe ref create dashboard \\
  --image ./references/dashboard.png

cocoframe ref audit dashboard \\
  --requirements ./requirements.json
cocoframe ref consent dashboard activity-feed
cocoframe ref preview dashboard activity-feed
cocoframe ref feedback dashboard activity-feed \\
  "Use denser spacing"
cocoframe ref approve dashboard activity-feed`}</code></pre></div>
        <aside class="project-checklist reveal"><h3>Permanent evidence</h3><ol><li><code>ref.json</code> stores references, inventory, states, feedback, and decisions.</li><li><code>component-map.md</code> explains reuse and new candidates.</li><li>Approved TSX and module CSS move into <code>app/components/</code>.</li><li>Temporary source and preview routes are removed on approval or cancellation.</li><li>Production builds exclude every <code>__cocoref</code> preview route.</li></ol></aside>
      </div>
    </ProjectSection>

    <ProjectSection id="fit" eyebrow="ONE AI WORKFLOW" title="CocoSpecs decides what. CocoRef decides how it should look." description="Use both when a feature combines incomplete product behavior with a visual reference.">
      <div class="cocoref-pipeline reveal"><a href="/cocospecs"><strong>CocoSpecs</strong><span>PRD · flow · data · acceptance</span></a><i>→</i><a href="/cocoref"><strong>CocoRef</strong><span>reference · inventory · preview · approval</span></a><i>→</i><div><strong>CocoFrame</strong><span>implementation · tests · delivery</span></div></div>
    </ProjectSection>

    <ProjectCta title="Turn references into approved, reusable components." description="Attach a design, audit your existing system, and let AI iterate transparently before implementation." href="/docs/cocoref" label="Read the CocoRef guide" />
  </main>,
});
