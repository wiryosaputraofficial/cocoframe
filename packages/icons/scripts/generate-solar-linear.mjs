import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const packageRoot = path.resolve(import.meta.dirname, "..");
const archive = path.resolve(process.argv[2] ?? path.join(packageRoot, "..", "..", "solar-icons-static-2.0.1.tgz"));
const outputDirectory = path.resolve(packageRoot, "src", "linear");
const namesFile = path.resolve(packageRoot, "src", "names.ts");
const catalogFile = path.resolve(packageRoot, "src", "catalog.ts");
const metadataFile = path.resolve(packageRoot, "generated.json");

if (!outputDirectory.startsWith(`${packageRoot}${path.sep}`)) {
  throw new Error(`Refusing to generate icons outside ${packageRoot}`);
}

const extractionRoot = await mkdtemp(path.join(tmpdir(), "cocoframe-solar-linear-"));
try {
  const extraction = spawnSync("tar", [
    "-xf", archive,
    "-C", extractionRoot,
    "package/dist/icons/linear",
    "package/package.json",
  ], { encoding: "utf8" });
  if (extraction.status !== 0) throw new Error(extraction.stderr || "Unable to extract Solar Icons archive");

  const sourceDirectory = path.join(extractionRoot, "package", "dist", "icons", "linear");
  const entries = await readdir(sourceDirectory);
  const moduleNames = new Set(entries.filter((file) => file.endsWith(".mjs")).map((file) => file.slice(0, -4)));
  const names = [...moduleNames].sort();
  if (names.length < 1200) throw new Error(`Expected the complete Solar Linear set, received ${names.length} icons`);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  for (const name of names) {
    const svg = await readFile(path.join(sourceDirectory, `${name}.svg`), "utf8");
    const content = extractSafeContent(svg, name);
    const generated = [
      "// Generated from @solar-icons/static. Do not edit manually.",
      'import { defineSolarIcon } from "../internal.ts";',
      "",
      `export default defineSolarIcon(${JSON.stringify(name)}, ${JSON.stringify(content)});`,
      "",
    ].join("\n");
    await writeFile(path.join(outputDirectory, `${name}.ts`), generated, "utf8");
  }

  const namesSource = [
    "// Generated from @solar-icons/static. Do not edit manually.",
    "export const solarLinearIconNames = [",
    ...names.map((name) => `  ${JSON.stringify(name)},`),
    "] as const;",
    "",
    "export type SolarLinearIconName = typeof solarLinearIconNames[number];",
    "",
  ].join("\n");
  await writeFile(namesFile, namesSource, "utf8");

  const identifiers = new Set();
  const catalogEntries = names.map((name) => {
    const identifier = `Solar${name.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("")}Icon`;
    if (identifiers.has(identifier)) throw new Error(`Duplicate generated icon identifier: ${identifier}`);
    identifiers.add(identifier);
    return { name, identifier };
  });
  const catalogSource = [
    "// Generated from @solar-icons/static. Do not edit manually.",
    'import type { SolarIconComponent } from "./index.ts";',
    ...catalogEntries.map(({ name, identifier }) => `import ${identifier} from "./linear/${name}.ts";`),
    "",
    "export interface SolarLinearCatalogEntry {",
    "  readonly name: string;",
    "  readonly Icon: SolarIconComponent;",
    "}",
    "",
    "export const solarLinearIcons: readonly SolarLinearCatalogEntry[] = [",
    ...catalogEntries.map(({ name, identifier }) => `  { name: ${JSON.stringify(name)}, Icon: ${identifier} },`),
    "] as const;",
    "",
  ].join("\n");
  await writeFile(catalogFile, catalogSource, "utf8");

  const upstream = JSON.parse(await readFile(path.join(extractionRoot, "package", "package.json"), "utf8"));
  const sourceIntegrity = `sha256-${createHash("sha256").update(await readFile(archive)).digest("hex")}`;
  await writeFile(metadataFile, `${JSON.stringify({
    source: "@solar-icons/static",
    sourceVersion: upstream.version,
    sourceIntegrity,
    style: "linear",
    iconCount: names.length,
  }, null, 2)}\n`, "utf8");
  console.log(`Generated ${names.length} Solar Linear icon modules.`);
} finally {
  await rm(extractionRoot, { recursive: true, force: true });
}

function extractSafeContent(svg, name) {
  if (/<(?:script|style|foreignObject)\b/i.test(svg) || /\sstyle\s*=/i.test(svg) || /\son[a-z]+\s*=/i.test(svg)) {
    throw new Error(`Unsafe SVG content in ${name}`);
  }
  if (/\s(?:href|xlink:href)\s*=\s*["'](?:https?:|data:|javascript:)/i.test(svg)) {
    throw new Error(`External SVG reference in ${name}`);
  }
  if (!/viewBox="0 0 24 24"/.test(svg)) throw new Error(`Unexpected viewBox in ${name}`);
  const match = /^<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/.exec(svg.trim());
  if (!match?.[1]) throw new Error(`Invalid SVG document in ${name}`);
  const prefix = `solar-${name}-`;
  return match[1]
    .trim()
    .replace(/\bid="([A-Za-z_][A-Za-z0-9_.:-]*)"/g, (_match, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([A-Za-z_][A-Za-z0-9_.:-]*)\)/g, (_match, id) => `url(#${prefix}${id})`)
    .replace(/\b(?:href|xlink:href)="#([A-Za-z_][A-Za-z0-9_.:-]*)"/g, (match, id) => match.replace(`#${id}`, `#${prefix}${id}`));
}
