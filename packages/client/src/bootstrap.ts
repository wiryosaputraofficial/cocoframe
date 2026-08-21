import type { IslandComponent } from "./index.ts";

async function mountIsland(root: Element): Promise<void> {
  const moduleUrl = root.getAttribute("data-coco-module");
  const serializedProps = root.getAttribute("data-coco-props") ?? "{}";
  if (!moduleUrl) return;
  try {
    const module = await import(moduleUrl);
    const component = module.default as IslandComponent<Record<string, unknown>>;
    if (typeof component?.mount !== "function") throw new TypeError(`Island has no mount function: ${moduleUrl}`);
    await component.mount(root, JSON.parse(serializedProps));
    root.setAttribute("data-coco-mounted", "");
  } catch (error) {
    root.setAttribute("data-coco-error", "");
    dispatchEvent(new CustomEvent("cocoframe:runtime-error", {
      detail: { error, phase: "island mounting", source: moduleUrl },
    }));
    console.error("CocoFrame island failed to mount", { moduleUrl, error });
  }
}

await Promise.all([...document.querySelectorAll("coco-island[data-coco-module]")].map(mountIsland));
