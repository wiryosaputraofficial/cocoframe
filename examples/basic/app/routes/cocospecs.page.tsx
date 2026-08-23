import { definePage } from "@cocoframe/core";
import ArrowRightIcon from "@cocoframe/icons/linear/arrow-right";
import BranchingPathsUpIcon from "@cocoframe/icons/linear/branching-paths-up";
import ChatRoundDotsIcon from "@cocoframe/icons/linear/chat-round-dots";
import CheckCircleIcon from "@cocoframe/icons/linear/check-circle";
import ChecklistIcon from "@cocoframe/icons/linear/checklist";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import DatabaseIcon from "@cocoframe/icons/linear/database";
import DocumentTextIcon from "@cocoframe/icons/linear/document-text";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import StarsMinimalisticIcon from "@cocoframe/icons/linear/stars-minimalistic";
import { ProjectCard, ProjectCta, ProjectSection } from "../components/project-page.tsx";

const stages = [
  ["01", "Understand the request", "CocoSpecs records the initial outcome and snapshots existing routes, islands, and dependencies before proposing new work."],
  ["02", "Ask adaptive questions", "The AI asks at most four unresolved questions per turn. New branches appear only when an answer makes them relevant."],
  ["03", "Generate review artifacts", "One canonical spec produces the PRD, flowchart, data model, acceptance criteria, decision log, and implementation tasks."],
  ["04", "Approve, then implement", "Code work begins only after required decisions are complete and the reviewed specification is explicitly approved."],
] as const;

const artifacts = [
  ["spec.json", "Canonical decisions", "Versioned answers, assumptions, project context, completeness, and approval state."],
  ["prd.md", "Product requirements", "Users, outcomes, scope, interface states, security, integrations, and quality constraints."],
  ["flow.mmd", "Mermaid flowchart", "Happy path and documented failure branches in a reviewable visual flow."],
  ["data-model.mmd", "Mermaid ER model", "Proposed entities, fields, keys, constraints, and relationships before migrations are written."],
  ["acceptance.md", "Delivery contract", "Checkable criteria that connect implementation and tests to product intent."],
  ["decisions.md + tasks.md", "Handoff evidence", "Every answer and the CocoFrame-aware sequence used to implement and verify the feature."],
] as const;

export default definePage({
  meta: {
    title: "CocoSpecs — AI Product Discovery for CocoFrame",
    description: "Turn a feature request into an adaptive AI interview, complete PRD, flowchart, data model, acceptance criteria, and approved implementation plan.",
    canonical: "https://cocoframe.dev/cocospecs",
    image: "/assets/cocoframe-hero-isometric.png",
  },
  view: () => <main class="project-page cocospecs-page" id="top">
    <section class="cocospecs-hero section-shell">
      <div class="cocospecs-hero__copy reveal">
        <span class="eyebrow pill">AI PRODUCT DISCOVERY</span>
        <h1>One request.<br /><span>A complete build plan.</span></h1>
        <p>CocoSpecs helps AI ask the decisions that matter before it writes code—then turns reviewed answers into a PRD, user flow, database proposal, acceptance criteria, and implementation tasks.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="/docs/cocospecs">Start with CocoSpecs <ArrowRightIcon size={17} /></a>
          <a class="button button-ghost" href="#workflow">See the workflow</a>
        </div>
        <ul class="cocospecs-hero__proof"><li>Provider-independent</li><li>Adaptive questions</li><li>Approval before code</li></ul>
      </div>

      <aside class="cocospecs-console reveal" aria-label="Example CocoSpecs interview">
        <header><span><i></i><i></i><i></i></span><strong>login / discovery</strong><small>4 of 19 resolved</small></header>
        <div class="cocospecs-message cocospecs-message--user"><small>REQUEST</small><p>Create a login page that sends users to the dashboard.</p></div>
        <div class="cocospecs-message cocospecs-message--ai"><small>NEXT QUESTIONS</small><ol><li>Which users and roles can sign in?</li><li>Which identity methods are supported?</li><li>Does the account source already exist?</li><li>Can roles change the destination?</li></ol></div>
        <footer><span><CheckCircleIcon size={16} /> Objective recorded</span><code>state: draft</code></footer>
      </aside>
    </section>

    <ProjectSection id="workflow" eyebrow="THE WORKFLOW" title="Discovery that becomes implementation evidence." description="CocoSpecs keeps conversation, generated documents, and delivery checks connected through one versioned source of truth.">
      <div class="cocospecs-step-grid">{stages.map(([number, title, description]) => <article class="cocospecs-step reveal"><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
    </ProjectSection>

    <ProjectSection id="adaptive-interview" eyebrow="ADAPTIVE INTERVIEW" title="Ask what is relevant. Skip what is not." description="The next question set changes with the feature and prior answers, so users get thorough discovery without a generic questionnaire dump.">
      <div class="project-split cocospecs-interview-layout">
        <article class="cocospecs-interview reveal">
          <header><ChatRoundDotsIcon size={23} /><div><strong>Example: login flow</strong><small>Standard interview mode</small></div></header>
          <div><b>USER</b><p>Members and administrators sign in with email and password. Members go to <code>/dashboard</code>; administrators go to <code>/admin</code>.</p></div>
          <div><b>AI</b><p>How long should sessions last? What happens to unverified or locked accounts? Is password recovery included? Which rate limit protects failed attempts?</p></div>
          <footer><CheckCircleIcon size={17} /><span>Role routing, session policy, account states, and abuse protection activated.</span></footer>
        </article>
        <div class="cocospecs-branches reveal">
          <h3>Questions branch from real decisions</h3>
          <ul>
            <li><span><ShieldCheckIcon size={19} /></span><div><strong>Authentication</strong><p>Identity methods activate session, account-state, recovery, redirect, and abuse-prevention questions.</p></div></li>
            <li><span><BranchingPathsUpIcon size={19} /></span><div><strong>OAuth and roles</strong><p>Provider, callback, linking, authorization, and role destinations appear only when requested.</p></div></li>
            <li><span><DatabaseIcon size={19} /></span><div><strong>Persistence</strong><p>New or changed data activates entities, relationships, lifecycle, migration, and rollback decisions.</p></div></li>
          </ul>
        </div>
      </div>
    </ProjectSection>

    <ProjectSection id="artifacts" eyebrow="ONE SOURCE OF TRUTH" title="Every artifact comes from reviewed decisions." description="AI and humans read the same canonical specification. Generated files are review views, so the PRD, diagrams, acceptance criteria, and tasks cannot silently drift apart.">
      <div class="project-artifact-table reveal" role="table" aria-label="CocoSpecs generated artifacts">
        <div role="row"><strong role="columnheader">Artifact</strong><strong role="columnheader">Purpose</strong><strong role="columnheader">Outcome</strong></div>
        {artifacts.map(([file, purpose, outcome]) => <div role="row"><code>{file}</code><strong>{purpose}</strong><span>{outcome}</span></div>)}
      </div>
    </ProjectSection>

    <ProjectSection id="why-cocospecs" eyebrow="BUILT FOR RELIABLE AI" title="Less guessing, less duplication, clearer delivery." description="CocoSpecs gives an AI agent enough product context to make deliberate changes while preserving CocoFrame's small, explicit architecture.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<StarsMinimalisticIcon size={25} />} title="Existing context first"><p>Routes, islands, and dependencies are recorded before discovery so the AI can reuse capabilities instead of recreating them.</p></ProjectCard>
        <ProjectCard icon={<DocumentTextIcon size={25} />} title="Decisions stay explicit"><p>Answers are marked as reviewed, assumed, deferred, or not applicable. Required deferrals prevent premature approval.</p></ProjectCard>
        <ProjectCard icon={<ChecklistIcon size={25} />} title="Tests follow intent"><p>Acceptance criteria become the implementation contract, making the final verification traceable to the approved product behavior.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection id="cli" eyebrow="CLI WORKFLOW" title="Start from a sentence and continue at any time." description="The same commands work for developers and AI agents. JSON output keeps orchestration machine-readable, while generated Markdown and Mermaid remain easy to review.">
      <div class="project-split project-split--structure">
        <div class="project-code reveal">
          <div><CodeSquareIcon size={17} /><span>terminal</span><small>CocoSpecs CLI</small></div>
          <pre class="coco-syntax"><code>{`npm run spec -- create login \\
  --brief "Users sign in and continue to the dashboard."

npm run spec -- resume login
npm run spec -- check login
npm run spec -- generate login
npm run spec -- approve login`}</code></pre>
        </div>
        <aside class="project-checklist reveal">
          <h3>What happens next</h3>
          <ol><li>The AI inspects existing project context.</li><li>Users answer a small question batch in natural language.</li><li>CocoSpecs checks every required decision.</li><li>Generated artifacts are reviewed and corrected through <code>spec.json</code>.</li><li>Approval unlocks implementation against the acceptance criteria.</li></ol>
        </aside>
      </div>
    </ProjectSection>

    <ProjectCta title="Make the next feature clear before making it complex." description="Start a CocoSpec, answer the decisions that matter, and let AI implement against an approved contract." href="/docs/cocospecs" label="Read the CocoSpecs guide" />
  </main>,
});
