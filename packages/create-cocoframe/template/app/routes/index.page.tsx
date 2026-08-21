import { definePage } from "@cocoframe/core";
import Counter from "../islands/counter.island.tsx";

export default definePage({
  meta: {
    title: "{{PROJECT_NAME}} — CocoFrame",
    description: "A fast, server-first CocoFrame application.",
  },
  view: () => (
    <main class="hero">
      <p class="eyebrow">SERVER-FIRST · AI-FRIENDLY</p>
      <h1>Your CocoFrame project is ready.</h1>
      <p>Useful HTML is rendered on the server. Browser JavaScript is isolated to the counter below.</p>
      <Counter initial={0} />
      <small>Edit <code>app/routes/index.page.tsx</code> to get started.</small>
    </main>
  ),
});