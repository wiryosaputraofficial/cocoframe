import { defineIsland, signal } from "@cocoframe/client";
import { SyntaxHighlighter } from "@cocoframe/ui";

const commands = {
  npm: { create: "npm create cocoframe@latest my-app", dev: "npm run dev" },
  pnpm: { create: "pnpm create cocoframe@latest my-app --package-manager pnpm", dev: "pnpm dev" },
  yarn: { create: "yarn create cocoframe my-app --package-manager yarn", dev: "yarn dev" },
  bun: { create: "bun create cocoframe@latest my-app --package-manager bun", dev: "bun run dev" },
} as const;
type Manager = keyof typeof commands;

export default defineIsland<Record<string, never>>({
  name: "package-command",
  setup: () => {
    const selected = signal<Manager>("npm");
    const copied = signal(false);
    return () => {
      const command = commands[selected.value];
      const copyText = `${command.create}\ncd my-app\n${command.dev}`;
      return <div class="docs-code"><div class="docs-code-bar"><div>{(Object.keys(commands) as Manager[]).map((manager) => <button class={selected.value === manager ? "active" : undefined} type="button" onClick={() => { selected.value = manager; }}>{manager}</button>)}</div><button class="docs-copy" type="button" onClick={async () => { try { await navigator.clipboard.writeText(copyText); copied.value = true; window.setTimeout(() => { copied.value = false; }, 1600); } catch { copied.value = false; } }}>{copied.value ? "Copied!" : "Copy"}</button></div><SyntaxHighlighter code={`${copyText}\n# buka http://127.0.0.1:3000`} language="bash" label={`${selected.value} setup commands`} showLineNumbers /></div>;
    };
  },
});
