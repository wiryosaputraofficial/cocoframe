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
    <ProjectHero active="deployment" eyebrow="DEPLOYMENT" title={<>Build once.<br />Run on a clear boundary.</>} description="Production builds menghasilkan server bundle, hashed browser assets, dan deployment manifest. Pilih runtime target, pasang health probes, lalu biarkan adapter mempertahankan streaming dan AbortSignal end-to-end." icon={<CloudCheckIcon size={86} />}>
      <a class="button button-primary" href="#targets">Choose a target</a>
      <a class="button button-ghost" href="/docs#deployment">Deployment docs</a>
    </ProjectHero>

    <ProjectSection id="targets" eyebrow="RUNTIME TARGETS" title="Three deployment shapes, one web contract." description="Semua target memakai Web Standard Request dan Response; perbedaannya berada pada adapter dan lifecycle process.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<ServerSquareIcon size={25} />} title="Node server"><p>Jalankan <code>.cocoframe/server.mjs</code> melalui <code>npm start</code>. Adapter menangani body limit, timeout, health, proxy trust, dan graceful shutdown.</p></ProjectCard>
        <ProjectCard icon={<CloudCheckIcon size={25} />} title="Container"><p>Gunakan production start command, expose <code>PORT</code>, teruskan termination signal, dan arahkan probes ke endpoint health bawaan.</p></ProjectCard>
        <ProjectCard icon={<GlobalIcon size={25} />} title="Fetch / edge"><p>Gunakan <code>webHandler(app)</code> pada runtime Fetch-compatible dan verifikasi dukungan streaming serta batas platform sebelum production.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="BUILD OUTPUT" title="Artifacts are explicit and inspectable." description="Production filename memakai content hash dan harus diselesaikan melalui asset manifest, bukan path yang ditebak aplikasi.">
      <div class="project-artifact-table reveal" role="table" aria-label="CocoFrame deployment artifacts"><div role="row"><strong role="columnheader">Artifact</strong><strong role="columnheader">Purpose</strong><strong role="columnheader">Policy</strong></div><div role="row"><code>.cocoframe/server.mjs</code><span>Production server bundle</span><span>Run through the configured start command</span></div><div role="row"><code>.cocoframe/assets.json</code><span>Hashed browser asset mapping</span><span>Source of truth for deployed asset URLs</span></div><div role="row"><code>.cocoframe/deploy.json</code><span>Deployment target metadata</span><span>Consumed by hosting and operations tooling</span></div><div role="row"><code>/coco-assets/*</code><span>Client, stream, island, and CSS assets</span><span>Serve hashed production files with immutable caching</span></div></div>
    </ProjectSection>

    <ProjectSection eyebrow="RELEASE GATE" title="Verify before traffic moves." description="Build hanya menjadi kandidat release setelah contract, route manifest, security pipeline, dan production output lolos pemeriksaan.">
      <div class="project-split">
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>production build</span><small>Node</small></div><SyntaxHighlighter code={deployCommands} language="bash" label="CocoFrame production build commands" /></div>
        <div class="project-code reveal"><div><ShieldCheckIcon size={17} /><span>environment</span><small>example</small></div><SyntaxHighlighter code={environment} language="bash" label="CocoFrame deployment environment example" /></div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="OPERATIONS CHECKLIST" title="Ready means more than process alive." description="Health responses sengaja hanya mengungkap availability, bukan dependency error atau credential.">
      <div class="project-policy-list reveal"><article><strong>Liveness</strong><p>Probe <code>/_health/live</code> untuk memastikan process dapat merespons.</p></article><article><strong>Readiness</strong><p>Probe <code>/_health/ready</code>; shutdown menandainya false sebelum request draining.</p></article><article><strong>Trusted proxy</strong><p>Jangan percaya forwarded host, protocol, atau client IP sebelum direct peer dikonfigurasi.</p></article><article><strong>Observability</strong><p>Kirim request ID, timing, status, dan field aplikasi yang aman—tanpa cookie, authorization, atau request body.</p></article></div>
    </ProjectSection>

    <ProjectCta title="Inspect the application before deployment." description="Route, island, middleware, UI, icon, dan contract manifest tersedia dalam satu command." href="/docs#inspection" label="Learn cocoframe inspect" />
  </main>,
});
