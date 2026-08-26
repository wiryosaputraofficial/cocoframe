import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? ".");
const ignoredDirectories = new Set([".git", ".cocoframe", "node_modules"]);
const files = await markdownFiles(root);
const failures = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of source.matchAll(pattern)) {
    const rawTarget = match[1]?.trim().replace(/^<|>$/g, "") ?? "";
    if (!rawTarget || /^(?:https?:|mailto:|#|\{\{)/.test(rawTarget)) continue;
    const target = rawTarget.split("#", 1)[0]?.split("?", 1)[0] ?? "";
    if (!target) continue;
    let decoded;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      failures.push(problem(file, source, match.index ?? 0, rawTarget, "invalid URL encoding"));
      continue;
    }
    const resolved = path.resolve(path.dirname(file), decoded);
    if (!existsSync(resolved)) failures.push(problem(file, source, match.index ?? 0, rawTarget, "target does not exist"));
  }
}

if (failures.length > 0) {
  console.error(`Markdown link check failed with ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Markdown links: ${files.length} files checked.`);
}

async function markdownFiles(directory) {
  const output = [];
  for (const name of await readdir(directory)) {
    if (ignoredDirectories.has(name)) continue;
    const entry = path.join(directory, name);
    const information = await stat(entry);
    if (information.isDirectory()) output.push(...await markdownFiles(entry));
    else if (entry.endsWith(".md")) output.push(entry);
  }
  return output.sort();
}

function problem(file, source, index, target, reason) {
  const line = source.slice(0, index).split("\n").length;
  return `${path.relative(root, file).replaceAll("\\", "/")}:${line} ${target} (${reason})`;
}
