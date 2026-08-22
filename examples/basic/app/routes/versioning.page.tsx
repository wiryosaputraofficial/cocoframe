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
    <ProjectHero active="versioning" eyebrow="VERSIONING POLICY" title={<>Know what changes.<br />Upgrade with confidence.</>} description="CocoFrame memakai versi yang eksplisit untuk public API, generated artifacts, dan contract formats. Sebelum 1.0, setiap breaking change harus disertai alasan dan jalur migrasi yang dapat diuji." icon={<RefreshCircleIcon size={86} />}>
      <a class="button button-primary" href="#upgrade-checklist">Upgrade checklist</a>
      <a class="button button-ghost" href="/docs#versioning">Versioning docs</a>
    </ProjectHero>

    <section class="project-release section-shell reveal" aria-label="Current CocoFrame release status">
      <div><span>Current release</span><strong>0.0.1</strong></div><div><span>Lifecycle</span><strong>Architectural MVP</strong></div><div><span>Public registry</span><strong>19 npm packages</strong></div><div><span>Compatibility</span><strong>Explicit per release</strong></div>
    </section>

    <ProjectSection eyebrow="VERSION MEANING" title="A version describes the promise." description="Versi package dan format contract diperlakukan sebagai boundary terpisah sehingga aplikasi dapat mengetahui perubahan yang relevan.">
      <div class="project-card-grid project-card-grid--three">
        <ProjectCard icon={<ShieldCheckIcon size={25} />} title="Patch"><p>Perbaikan kompatibel, hardening, dokumentasi, dan optimasi yang tidak mengubah pemakaian public API.</p></ProjectCard>
        <ProjectCard icon={<CalendarIcon size={25} />} title="Minor"><p>Capability baru yang kompatibel. Sebelum 1.0, minor juga dapat membawa perubahan API dengan migration note yang eksplisit.</p></ProjectCard>
        <ProjectCard icon={<RefreshCircleIcon size={25} />} title="Major"><p>Boundary kompatibilitas baru setelah 1.0, dengan upgrade guide, deprecated path, dan contoh before/after.</p></ProjectCard>
      </div>
    </ProjectSection>

    <ProjectSection id="upgrade-checklist" eyebrow="SAFE UPGRADE" title="Regenerate, verify, then deploy." description="Generated output berasal dari source contracts. Jangan mempertahankan edit manual ketika framework atau contract berubah.">
      <div class="project-split">
        <div class="project-checklist reveal"><h3>Upgrade sequence</h3><ol><li>Simpan baseline versi Node dan output <code>cocoframe inspect</code>.</li><li>Baca release notes serta migration note untuk public API yang digunakan.</li><li>Upgrade dependency dalam satu perubahan terisolasi.</li><li>Jalankan generator setelah perubahan API contract atau CSS module.</li><li>Jalankan seluruh gate dan bandingkan route, middleware, serta asset manifest.</li><li>Deploy bertahap dan pantau readiness serta structured request events.</li></ol></div>
        <div class="project-code reveal"><div><CodeSquareIcon size={17} /><span>release gate</span><small>required</small></div><SyntaxHighlighter code={upgradeCommands} language="bash" label="CocoFrame upgrade verification commands" /></div>
      </div>
    </ProjectSection>

    <ProjectSection eyebrow="STABILITY RULES" title="Some artifacts never move silently." description="Aturan berikut menjaga deployment lama tetap dapat dijelaskan dan direproduksi.">
      <div class="project-policy-list reveal"><article><strong>Public exports</strong><p>API stabil selalu berasal dari root package <code>@cocoframe/*</code>, bukan file internal.</p></article><article><strong>Database migrations</strong><p>Migration yang sudah diterapkan immutable; perubahan baru selalu memakai ID berikutnya.</p></article><article><strong>Generated artifacts</strong><p>Client, OpenAPI, manifest, dan CSS declaration dibuat ulang—tidak diedit manual.</p></article><article><strong>Contract versions</strong><p>CocoQL AST, issue, query plan, dan mutation plan memiliki versi formatnya sendiri.</p></article></div>
    </ProjectSection>

    <ProjectCta title="Plan an upgrade before changing dependencies." description="Gunakan checklist dan dokumentasi API sebagai satu sumber kebenaran." href="/docs#api-reference" label="Open API reference" />
  </main>,
});
