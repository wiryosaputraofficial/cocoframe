import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { renderToString } from "../packages/jsx/src/index.ts";
import { solarLinearIconNames } from "../packages/icons/src/index.ts";
import { solarLinearIcons } from "../packages/icons/src/catalog.ts";
import GamepadOldIcon from "../packages/icons/src/linear/gamepad-old.ts";
import HomeIcon from "../packages/icons/src/linear/home.ts";

test("renders Solar icons as accessible CSP-safe server markup", async () => {
  const decorative = await renderToString(HomeIcon({ size: 20, class: "nav-icon" }));
  assert.match(decorative, /^<svg /);
  assert.match(decorative, /width="20" height="20"/);
  assert.match(decorative, /class="solar solar-home-linear nav-icon"/);
  assert.match(decorative, /aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(decorative, /role="img"|aria-label=|style=|<script|\son[a-z]+=/i);

  const meaningful = await renderToString(HomeIcon({ label: "Home", size: -1, color: "#1e7a5a", strokeWidth: 2, mirrored: true }));
  assert.match(meaningful, /width="24" height="24"/);
  assert.match(meaningful, /color="#1e7a5a" stroke-width="2"/);
  assert.match(meaningful, /role="img" aria-label="Home"/);
  assert.match(meaningful, /<g transform="translate\(24 0\) scale\(-1 1\)">/);
  assert.doesNotMatch(meaningful, /aria-hidden=|style=|<script/i);
});

test("ships the complete generated Solar Linear catalog safely", async () => {
  const iconDirectory = new URL("../packages/icons/src/linear/", import.meta.url);
  const files = (await readdir(iconDirectory)).filter((file) => file.endsWith(".ts"));
  assert.equal(solarLinearIconNames.length, 1246);
  assert.equal(solarLinearIcons.length, 1246);
  assert.deepEqual(solarLinearIcons.map(({ name }) => name), [...solarLinearIconNames]);
  assert.equal(files.length, 1246);
  assert.equal(new Set(solarLinearIconNames).size, 1246);
  assert.ok(solarLinearIconNames.includes("home"));
  assert.ok(solarLinearIconNames.includes("magnifier"));

  for (const file of files) {
    const source = await readFile(new URL(file, iconDirectory), "utf8");
    assert.doesNotMatch(source, /<(?:script|style|foreignObject)\b|\sstyle\\?=|\son[a-z]+\\?=/i, file);
    assert.doesNotMatch(source, /(?:https?:|data:|javascript:)/i, file);
  }

  const clipped = await renderToString(GamepadOldIcon());
  assert.match(clipped, /clip-path="url\(#solar-gamepad-old-/);
  assert.match(clipped, /id="solar-gamepad-old-/);

  const notice = await readFile(new URL("../packages/icons/THIRD_PARTY_NOTICE.md", import.meta.url), "utf8");
  assert.match(notice, /480 Design/);
  assert.match(notice, /Creative Commons Attribution 4\.0/);
});
