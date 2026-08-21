import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { bind, computed, defineIsland, renderToDom, signal } from "../packages/client/src/index.ts";
import { jsx, raw, renderToString } from "../packages/jsx/src/index.ts";

test("signals notify only when values change", () => {
  const count = signal(1);
  const events: Array<[number, number]> = [];
  const stop = count.subscribe((value, previous) => events.push([value, previous]));
  count.value = 2;
  count.value = 2;
  stop();
  count.value = 3;
  assert.deepEqual(events, [[2, 1]]);
  assert.equal(computed(() => count.value * 2).value, 6);
});

test("fine-grained bindings render on the server and subscribe directly", async () => {
  const count = signal(1);
  const binding = bind(count);
  assert.equal(await renderToString(binding), "1");
  let notifications = 0;
  const stop = binding.subscribe?.(() => notifications++);
  count.value = 2;
  stop?.();
  count.value = 3;
  assert.equal(notifications, 1);
});

test("progressively enhances server HTML without replacing the island boundary", async () => {
  let setupCalls = 0;
  let enhanceCalls = 0;
  const island = defineIsland<{ value: string }>({
    name: "preserved-html",
    setup: () => {
      setupCalls++;
      return () => "server content";
    },
    enhance: (_root, props) => {
      enhanceCalls++;
      assert.equal(props.value, "ready");
    },
  });

  await island.mount({} as Element, { value: "ready" });
  assert.equal(enhanceCalls, 1);
  assert.equal(setupCalls, 0);
});

test("development reload client stays singleton and keeps expected disconnects quiet", async () => {
  const source = await readFile(new URL("../packages/client/src/dev.ts", import.meta.url), "utf8");

  assert.match(source, /__cocoframeDevEvents\?\.close\(\)/);
  assert.match(source, /addEventListener\("pagehide"/);
  assert.match(source, /events\.addEventListener\("error", \(\) => \{\}\)/);
  assert.match(source, /events\.addEventListener\("build-error"/);
  assert.match(source, /addEventListener\("cocoframe:runtime-error"/);
  assert.match(source, /addEventListener\("unhandledrejection"/);
  assert.match(source, /data-coco-dev-overlay/);
  assert.doesNotMatch(source, /innerHTML/);
  assert.doesNotMatch(source, /console\.(?:debug|log|warn|error)/);
});

test("client rendering preserves SVG namespaces across elements and raw icon content", async () => {
  const namespaces: Array<[string, string]> = [];
  const document = {
    createDocumentFragment: () => new FakeNode("fragment"),
    createElement: (tag: string) => new FakeNode(tag),
    createElementNS: (namespace: string, tag: string) => {
      namespaces.push([namespace, tag]);
      return new FakeNode(tag);
    },
    createTextNode: (value: string) => new FakeNode("text", value),
  } as unknown as Document;

  await renderToDom(jsx("svg", {
    viewBox: "0 0 24 24",
    children: [jsx("path", { d: "M2 2L22 22" }), raw('<path d="M22 2L2 22"/>')],
  }), document);

  assert.deepEqual(namespaces, [
    ["http://www.w3.org/2000/svg", "svg"],
    ["http://www.w3.org/2000/svg", "path"],
    ["http://www.w3.org/2000/svg", "svg"],
  ]);
});

class FakeNode {
  readonly attributes = new Map<string, string>();
  readonly children: FakeNode[] = [];
  readonly style = {};
  readonly tag: string;
  readonly value: string;
  parent: FakeNode | undefined;
  content = this;

  constructor(tag: string, value = "") {
    this.tag = tag;
    this.value = value;
  }

  get firstChild(): FakeNode | null {
    return this.children[0] ?? null;
  }

  set innerHTML(value: string) {
    this.children.length = 0;
    if (value) {
      const child = new FakeNode("raw-svg");
      child.parent = this;
      this.children.push(child);
    }
  }

  append(child: FakeNode): void {
    if (child.parent) {
      const index = child.parent.children.indexOf(child);
      if (index >= 0) child.parent.children.splice(index, 1);
    }
    child.parent = this;
    this.children.push(child);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(): void {}
}
