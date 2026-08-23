import { definePage } from "@cocoframe/core";
import CloudCheckIcon from "@cocoframe/icons/linear/cloud-check";
import CodeSquareIcon from "@cocoframe/icons/linear/code-square";
import GlobalIcon from "@cocoframe/icons/linear/global";
import ServerSquareIcon from "@cocoframe/icons/linear/server-square";
import ShieldCheckIcon from "@cocoframe/icons/linear/shield-check";
import { SyntaxHighlighter } from "@cocoframe/ui";
import { ProjectCard, ProjectCta, ProjectHero, ProjectSection } from "../components/project-page.tsx";

const deployCommands = `npm run check
npm test
npm run build

# Run the production artifact
npm start`;

const environment = `PORT=3000
COCOFRAME_HOST=0.0.0.0
COCOFRAME_TRUSTED_PROXIES=10.0.0.0/8

# Keep application secrets server-only
SESSION_SECRET=<managed-secret>`;

export default definePage({
  meta: {
    title: "Deployment guide | CocoFrame",
    description: "Build and deploy CocoFrame to Node, containers, or Fetch-compatible runtimes with production-safe defaults.",
    canonical: "https://cocoframe.dev/deployment",
  },
  view: () => <main class="project-page" id="top">
    <ProjectHero active="deployment" eyebrow="DEPLOYMENT" title={<>Build once.<br />Run on a clear boundary.</>} description="Production builds produce a server bundle, hashed browser assets, and a deployment manifest. Choose a runtime target, configure health probes, and let the adapter preserve streaming and AbortSignal propagation end-to-end." icon={<CloudCheckIcon size={86} />}>
      <a class="button button-primary" href="#targets">Choose a target</a>
      <a class="button button-ghost" href="/docs/deployment">Deployment docs</a>
    </ProjectHero>

    <ProjectSection id="targets" eyebrow="RUNTIME TARGETS" title="Three deployment shapes, one web contract." description="Every target uses Web Standard Request and Response objects; only the adapter and process lifecycle differ.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<ServerSquareIcon size={25} />} title="Node server"><p>Run <code>.cocoframe/server.mjs</code> through <code>npm start</code>. The adapter handles body limits, timeouts, health checks, proxy trust, and graceful shutdown.</p></ProjectCard>
        <ProjectCard icon={<CloudCheckIcon size={25} />} title="Container"><p>Use the production start command, expose <code>PORT</code>, forward termination signals, and point probes to the built-in health endpoints.</p></ProjectCard>
        <ProjectCard icon={<GlobalIcon size={25} />} title="Fetch / edge"><p>Use <code>webHandler(app)</code> on a Fetch-compatible runtime and verify streaming support and platform limits before production.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="BUILD OUTPUT" title="Artifacts are explicit and inspectable." description="Production filenames use content hashes and must be resolved through the asset manifest instead of application-guessed paths.">
      <div class="project-artifact-table reveal" role="table" aria-label="CocoFrame deployment artifacts"><div role="row"><strong role="columnheader">Artifact</strong><strong role="columnheader">Purpose</strong><strong role="columnheader">Policy</strong></div><div role="row"><code>.cocoframe/server.mjs</code><span>Production server bundle</span><span>Run through the configured start command</span></div><div role="row"><code>.cocoframe/assets.json</code><span>Hashed browser asset mapping</span><span>Source of truth for deployed asset URLs</span></div><div role="row"><code>.cocoframe/deploy.json</code><span>Deployment target metadata</span><span>Consumed by hosting and operations tooling</span></div><div role="row"><code>/coco-assets/*</code><span>Client, stream, island, and CSS assets</span><span>Serve hashed production files with immutable caching</span></div></div>
    </ProjectSection>

    <ProjectSection eyebrow="RELEASE GATE" title="Verify before traffic moves." description="A build becomes a release candidate only after its contracts, route manifest, security pipeline, and production output pass verification.">
      <div class="project-split">
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>production build</span><small>Node</small></div><SyntaxHighlighter code={deployCommands} language="bash" label="CocoFrame production build commands" /></div>
        <div class="project-code reveal"><div><ShieldCheckIcon size={17} /><span>environment</span><small>example</small></div><SyntaxHighlighter code={environment} language="bash" label="CocoFrame deployment environment example" /></div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="OPERATIONS CHECKLIST" title="Ready means more than process alive." description="Health responses intentionally expose availability only, never dependency errors or credentials.">
      <div class="project-policy-list reveal"><article><strong>Liveness</strong><p>Probe <code>/_health/live</code> to confirm that the process can respond.</p></article><article><strong>Readiness</strong><p>Probe <code>/_health/ready</code>; shutdown marks it false before draining requests.</p></article><article><strong>Trusted proxy</strong><p>Do not trust forwarded hosts, protocols, or client IPs until the direct peer is explicitly configured.</p></article><article><strong>Observability</strong><p>Record request IDs, timing, status, and safe application fields—never cookies, authorization headers, or request bodies.</p></article></div>
    </ProjectSection>

    <ProjectCta title="Inspect the application before deployment." description="Route, island, middleware, UI, icon, and contract manifests are available through a single command." href="/docs#inspection" label="Learn cocoframe inspect" />
  </main>,
});
