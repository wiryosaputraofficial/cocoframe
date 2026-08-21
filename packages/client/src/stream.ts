function resolveTemplate(template: HTMLTemplateElement): void {
  const resolvedId = template.getAttribute("data-coco-resolve");
  const failedId = template.getAttribute("data-coco-reject");
  const id = resolvedId ?? failedId;
  if (!id) return;
  const boundary = document.querySelector(`coco-stream[data-coco-stream="${CSS.escape(id)}"]`);
  if (boundary) {
    if (resolvedId) boundary.replaceWith(template.content);
    else boundary.setAttribute("data-coco-error", "");
  }
  template.remove();
}

function scan(root: ParentNode): void {
  root.querySelectorAll<HTMLTemplateElement>("template[data-coco-resolve],template[data-coco-reject]").forEach(resolveTemplate);
}

scan(document);
new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof HTMLTemplateElement) resolveTemplate(node);
      else if (node instanceof Element) scan(node);
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });
