import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BugIcon from "@cocoframe/icons/linear/bug";
import CheckCircleIcon from "@cocoframe/icons/linear/check-circle";
import ChecklistIcon from "@cocoframe/icons/linear/checklist";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DocumentTextIcon from "@cocoframe/icons/linear/document-text";
import GraphUpIcon from "@cocoframe/icons/linear/graph-up";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import { ProjectCard, ProjectCta, ProjectSection } from "../components/project-page.tsx";

const workflow = [
  ["01", "Start from approved intent", "CocoQA requires an approved CocoSpec and can include a completed CocoRef, so every check traces back to reviewed behavior and design."],
  ["02", "Agree on quality", "AI asks short adaptive batches about environments, devices, test data, accessibility, security, performance, and release blockers."],
  ["03", "Execute and collect evidence", "Known npm quality gates run while manual and automated cases receive concise, sanitized evidence."],
  ["04", "Resolve and approve", "Open defects and failed required checks block release. Approval becomes available only when the complete record passes."],
] as const;

export default definePage({
  meta: {
    title: "CocoQA — Evidence-Based AI Quality for CocoFrame",
    description: "Turn approved CocoSpecs, CocoRef decisions, automated gates, test evidence, and defects into one explicit CocoFrame release approval.",
    canonical: "https://cocoframe.dev/cocoqa",
    image: "/assets/cocoframe-hero-isometric.png",
  },
  view: () => <main class="project-page cocoqa-page" id="top">
    <section class="cocoqa-hero section-shell">
      <div class="cocoqa-hero__copy reveal">
        <span class="eyebrow pill">EVIDENCE-BASED QUALITY</span>
        <h1>Define what passing means.<br /><span>Prove it before release.</span></h1>
        <p>CocoQA helps AI ask the missing quality questions, connect every test to approved requirements, execute known project checks, track defects, and request explicit approval only when the evidence is complete.</p>
        <div class="hero-actions"><a class="button button-primary" href="/docs/cocoqa">Start with CocoQA <ArrowRightIcon size={17} /></a><a class="button button-ghost" href="#workflow">See the lifecycle</a></div>
        <ul class="cocoqa-hero__proof"><li>Adaptive QA interview</li><li>Requirement traceability</li><li>Release-blocking evidence</li></ul>
      </div>
      <aside class="cocoqa-report reveal" aria-label="Example CocoQA release report">
        <header><span><ChecklistIcon size={18} /> qa/login/qa.json</span><code>state: passed</code></header>
        <div class="cocoqa-report__score"><span><CheckCircleIcon size={31} /></span><div><strong>Release evidence complete</strong><small>8 cases · 5 gates · 0 open defects</small></div><b>PASS</b></div>
        <ul>
          <li><CheckCircleIcon size={17} /><div><strong>Acceptance criteria</strong><small>3 / 3 passed</small></div></li>
          <li><CheckCircleIcon size={17} /><div><strong>Framework baseline</strong><small>SSR · accessibility · responsive</small></div></li>
          <li><CheckCircleIcon size={17} /><div><strong>Automated gates</strong><small>check · test · inspect · build · E2E</small></div></li>
        </ul>
        <footer>Ready for explicit release approval.</footer>
      </aside>
    </section>

    <ProjectSection id="workflow" eyebrow="CONTROLLED LIFECYCLE" title="Quality decisions before quality claims." description="CocoQA closes the gap between implementation completion and release confidence with one inspectable state machine.">
      <div class="cocoqa-step-grid">{workflow.map(([number, title, description]) => <article class="cocoqa-step reveal"><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    </ProjectSection>

    <ProjectSection id="coverage" eyebrow="TRACEABLE COVERAGE" title="Every result points back to approved evidence." description="Acceptance criteria, approved reference components, and CocoFrame's server-first baseline become required cases instead of informal reminders.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<DocumentTextIcon size={25} />} title="Requirement lineage"><p>Cases retain a stable source such as <code>cocospec:acceptance-1</code> or <code>cocoref:auth-card</code>.</p></ProjectCard>
        <ProjectCard icon={<ShieldCheckIcon size={25} />} title="Safe execution"><p>The CLI runs only recognized quality scripts and stores status, duration, and exit code—not potentially sensitive command output.</p></ProjectCard>
        <ProjectCard icon={<BugIcon size={25} />} title="Defect policy"><p>Reproduction steps and resolution stay reviewable. Critical and high defects must be fixed rather than silently accepted.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection id="cli" eyebrow="CLI WORKFLOW" title="One canonical record for humans and AI." description="The JSON contract drives the lifecycle while deterministic Markdown files provide readable plans, traceability, reports, and defect summaries.">
      <div class="project-split project-split--structure">
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>terminal</span><small>CocoQA CLI</small></div><pre class="coco-syntax"><code>{`cocoframe qa create login --spec login
cocoframe qa resume login
cocoframe qa answer login target-environments \\
  '["staging", "production-like"]'
cocoframe qa run login
cocoframe qa record login acceptance-1 pass \\
  --evidence "Login E2E passed."
cocoframe qa check login
cocoframe qa approve login`}</code></pre></div>
        <aside class="project-checklist reveal"><h3>Permanent evidence</h3><ol><li><code>qa.json</code> stores sources, decisions, cases, gates, defects, and approval.</li><li><code>test-plan.md</code> explains agreed scope and execution.</li><li><code>traceability.md</code> connects approved intent to evidence.</li><li><code>qa-report.md</code> exposes every release blocker.</li><li>Any changed result or decision invalidates prior approval.</li></ol></aside>
      </div>
    </ProjectSection>

    <ProjectSection id="pipeline" eyebrow="ONE AI DELIVERY LOOP" title="Discover, design, implement, verify, approve." description="CocoQA completes the same explicit-approval philosophy used throughout CocoFrame's AI workflow.">
      <div class="cocoqa-pipeline reveal"><a href="/cocospecs"><strong>CocoSpecs</strong><span>intent and acceptance</span></a><i>→</i><a href="/cocoref"><strong>CocoRef</strong><span>component decisions</span></a><i>→</i><div><strong>CocoFrame</strong><span>implementation</span></div><i>→</i><a href="/cocoqa"><strong>CocoQA</strong><span>evidence and approval</span></a></div>
    </ProjectSection>

    <ProjectSection id="release" eyebrow="RELEASE CONFIDENCE" title="Approval is a result, not an assumption." description="A feature passes only after its required questions, cases, gates, and defects are all resolved.">
      <div class="cocoqa-release reveal"><GraphUpIcon size={30} /><div><strong>Passed is computed. Approved is explicit.</strong><p>CocoQA derives pass or fail from evidence, then preserves the final human approval separately.</p></div></div>
    </ProjectSection>

    <ProjectCta title="Make AI-generated features prove they are ready." description="Start from approved requirements, agree on coverage, and keep every release decision traceable." href="/docs/cocoqa" label="Read the CocoQA guide" />
  </main>,
});
