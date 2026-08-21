import { defineIsland } from "@cocoframe/client";

export default defineIsland<{ command: string }>({
  name: "copy-command",
  setup: ({ command }) => () => <button class="install-command" type="button" onClick={async (event: Event) => {
    const label = (event.currentTarget as HTMLElement).querySelector("em");
    try {
      await navigator.clipboard.writeText(command);
      if (label) label.textContent = "Copied!";
      window.setTimeout(() => { if (label) label.textContent = "Copy"; }, 1800);
    } catch { if (label) label.textContent = command; }
  }}><code><span>$</span> {command}</code><em>Copy</em></button>,
});
