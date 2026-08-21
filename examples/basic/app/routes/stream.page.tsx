import { defer, definePage } from "@cocoframe/core";

async function SlowSection() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <p>Slow section completed.</p>;
}

export default definePage({
  meta: {
    title: "Streaming",
    description: "CocoFrame sends useful HTML before slow components finish.",
  },
  view: () => (
    <main>
      <h1>Streaming SSR</h1>
      <p>This content can reach the browser immediately.</p>
      {defer(SlowSection(), <p role="status">Loading slow section…</p>)}
    </main>
  ),
});
