import { definePage } from "@cocoframe/core";
import CalendarIcon from "@cocoframe/icons/linear/calendar";
import ChecklistIcon from "@cocoframe/icons/linear/checklist";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import RefreshCircleIcon from "@cocoframe/icons/linear/refresh-circle";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import { SyntaxHighlighter } from "@cocoframe/ui";
import { ProjectCard, ProjectCta, ProjectHero, ProjectSection } from "../components/project-page.tsx";

const upgradeCommands = `npm run check
npm test
npm run inspect
npm run build

# After API contract changes
npm run generate`;

export default definePage({
  meta: {
    title: "Versioning & upgrades | CocoFrame",
    description: "CocoFrame version guarantees, pre-1.0 policy, release notes, and a safe upgrade workflow.",
    canonical: "https://cocoframe.dev/versioning",
  },
  view: () => <main class="project-page" id="top">
    <ProjectHero active="versioning" eyebrow="VERSIONING POLICY" title={<>Know what changes.<br />Upgrade with confidence.</>} description="CocoFrame uses explicit versions for public APIs, generated artifacts, and contract formats. Before 1.0, every breaking change must include a rationale and a testable migration path." icon={<RefreshCircleIcon size={86} />}>
      <a class="button button-primary" href="#upgrade-checklist">Upgrade checklist</a>
      <a class="button button-ghost" href="/docs#versioning">Versioning docs</a>
    </ProjectHero>

    <section class="project-release section-shell reveal" aria-label="Current CocoFrame release status">
      <div><span>Current release</span><strong>0.0.4</strong></div><div><span>Lifecycle</span><strong>Architectural MVP</strong></div><div><span>Public registry</span><strong>19 npm packages</strong></div><div><span>Compatibility</span><strong>Explicit per release</strong></div>
    </section>

    <ProjectSection eyebrow="VERSION MEANING" title="A version describes the promise." description="Package versions and contract format versions are treated as separate boundaries so applications can identify relevant changes.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<ShieldCheckIcon size={25} />} title="Patch"><p>Compatible fixes, hardening, documentation, and optimizations that do not change public API usage.</p></ProjectCard>
        <ProjectCard icon={<CalendarIcon size={25} />} title="Minor"><p>New compatible capabilities. Before 1.0, minor releases may also carry API changes with an explicit migration note.</p></ProjectCard>
        <ProjectCard icon={<RefreshCircleIcon size={25} />} title="Major"><p>A new compatibility boundary after 1.0, with an upgrade guide, deprecated path, and before/after examples.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection id="upgrade-checklist" eyebrow="SAFE UPGRADE" title="Regenerate, verify, then deploy." description="Generated output comes from source contracts. Do not preserve manual edits when the framework or contracts change.">
      <div class="project-split">
        <div class="project-checklist reveal"><h3>Upgrade sequence</h3><ol><li>Record the baseline Node version and <code>cocoframe inspect</code> output.</li><li>Read the release notes and migration notes for the public APIs you use.</li><li>Upgrade dependencies in one isolated change.</li><li>Run generators after changes to API contracts or CSS modules.</li><li>Run every gate and compare routes, middleware, and the asset manifest.</li><li>Deploy gradually and monitor readiness and structured request events.</li></ol></div>
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>release gate</span><small>required</small></div><SyntaxHighlighter code={upgradeCommands} language="bash" label="CocoFrame upgrade verification commands" /></div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="STABILITY RULES" title="Some artifacts never move silently." description="The following rules keep previous deployments explainable and reproducible.">
      <div class="project-policy-list reveal"><article><strong>Public exports</strong><p>Stable APIs always come from root <code>@cocoframe/*</code> packages, not internal files.</p></article><article><strong>Database migrations</strong><p>Applied migrations are immutable; new changes always use the next ID.</p></article><article><strong>Generated artifacts</strong><p>Clients, OpenAPI, manifests, and CSS declarations are regenerated—not edited manually.</p></article><article><strong>Contract versions</strong><p>CocoQL ASTs, issues, query plans, and mutation plans each have their own format version.</p></article></div>
    </ProjectSection>

    <ProjectCta title="Plan an upgrade before changing dependencies." description="Use the checklist and API documentation as a single source of truth." href="/docs/api-reference" label="Open API reference" />
  </main>,
});
