import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTemplate = path.join(packageRoot, "template");
const supportedPackageManagers = new Set(["npm", "pnpm", "yarn", "bun"]);

export const helpText = [
  "Create a CocoFrame application",
  "",
  "Usage:",
  "  npm create cocoframe@latest <project-directory> [options]",
  "",
  "Options:",
  "  --package-manager <npm|pnpm|yarn|bun>  Select the package manager",
  "  --skip-install, --no-install           Generate files without installing",
  "  --help, -h                             Show this help",
  "  --version, -v                          Show the package version",
].join("\n");

export function parseArguments(args, userAgent = process.env.npm_config_user_agent) {
  let projectDirectory;
  let packageManager = packageManagerFromUserAgent(userAgent);
  let install = true;
  let help = false;
  let version = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") help = true;
    else if (argument === "--version" || argument === "-v") version = true;
    else if (argument === "--skip-install" || argument === "--no-install") install = false;
    else if (argument === "--package-manager") {
      const value = args[++index];
      if (!value) throw new Error("--package-manager requires a value.");
      packageManager = validatePackageManager(value);
    } else if (argument?.startsWith("--package-manager=")) {
      packageManager = validatePackageManager(argument.slice("--package-manager=".length));
    } else if (argument?.startsWith("-")) throw new Error("Unknown option: " + argument);
    else if (projectDirectory) throw new Error("Only one project directory can be provided.");
    else projectDirectory = argument;
  }

  if (!help && !version && !projectDirectory) throw new Error("A project directory is required.");
  return { projectDirectory, packageManager, install, help, version };
}

export async function scaffoldProject(options) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const targetDirectory = resolveTargetDirectory(options.projectDirectory, cwd);
  const packageName = normalizePackageName(path.basename(targetDirectory));
  const packageManager = validatePackageManager(options.packageManager ?? "npm");
  const templateDirectory = path.resolve(options.templateDirectory ?? defaultTemplate);
  const entries = await directoryEntries(targetDirectory);
  if (entries.length > 0) throw new Error("Target directory is not empty: " + targetDirectory);

  await mkdir(targetDirectory, { recursive: true });
  await cp(templateDirectory, targetDirectory, { recursive: true, errorOnExist: false, force: false });
  await rename(path.join(targetDirectory, "_gitignore"), path.join(targetDirectory, ".gitignore"));
  await replacePlaceholders(targetDirectory, packageName);

  if (options.install !== false) {
    await installDependencies(targetDirectory, packageManager, options.spawnCommand);
  }

  return { targetDirectory, packageName, packageManager, installed: options.install !== false };
}

export async function runCreator(args, options = {}) {
  const parsed = parseArguments(args, options.userAgent);
  const output = options.output ?? console;
  if (parsed.help) {
    output.log(helpText);
    return undefined;
  }
  if (parsed.version) {
    const metadata = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
    output.log(metadata.version);
    return undefined;
  }

  const result = await scaffoldProject({
    projectDirectory: parsed.projectDirectory,
    packageManager: parsed.packageManager,
    install: parsed.install,
    cwd: options.cwd,
    templateDirectory: options.templateDirectory,
    spawnCommand: options.spawnCommand,
  });
  const relativeTarget = path.relative(path.resolve(options.cwd ?? process.cwd()), result.targetDirectory) || ".";
  output.log("\nCocoFrame project created in " + result.targetDirectory);
  output.log("\nNext steps:");
  if (relativeTarget !== ".") output.log("  cd " + quotePath(relativeTarget));
  if (!result.installed) output.log("  " + result.packageManager + " install");
  output.log("  " + devCommand(result.packageManager));
  output.log("\nOpen http://127.0.0.1:3000");
  return result;
}

function packageManagerFromUserAgent(userAgent) {
  const name = userAgent?.split("/")[0];
  return name && supportedPackageManagers.has(name) ? name : "npm";
}

function validatePackageManager(value) {
  if (!supportedPackageManagers.has(value)) {
    throw new Error("Unsupported package manager: " + value + ". Use npm, pnpm, yarn, or bun.");
  }
  return value;
}

function resolveTargetDirectory(input, cwd) {
  if (!input?.trim()) throw new Error("A project directory is required.");
  const target = path.resolve(cwd, input);
  if (target === path.parse(target).root) throw new Error("The filesystem root cannot be used as a project directory.");
  return target;
}

function normalizePackageName(value) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^[-._]+|[-._]+$/g, "");
  if (!normalized || normalized.length > 214) throw new Error("Cannot derive a valid package name from: " + value);
  return normalized;
}

async function directoryEntries(directory) {
  try {
    return await readdir(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function replacePlaceholders(targetDirectory, packageName) {
  const files = ["package.json", "README.md", "cocoframe.config.ts", "app/routes/index.page.tsx"];
  for (const relativeFile of files) {
    const file = path.join(targetDirectory, relativeFile);
    const contents = await readFile(file, "utf8");
    await writeFile(file, contents.replaceAll("{{PROJECT_NAME}}", packageName), "utf8");
  }
}

async function installDependencies(targetDirectory, packageManager, spawnCommand = spawn) {
  const windows = process.platform === "win32";
  const executable = windows ? process.env.ComSpec ?? "cmd.exe" : packageManager;
  const args = windows ? ["/d", "/s", "/c", packageManager, "install"] : ["install"];
  await new Promise((resolve, reject) => {
    const child = spawnCommand(executable, args, { cwd: targetDirectory, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else {
        const detail = signal ? " with signal " + signal : " with exit code " + (code ?? "unknown");
        reject(new Error(packageManager + " install failed" + detail + "."));
      }
    });
  });
}

function quotePath(value) {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function devCommand(packageManager) {
  return packageManager === "npm" ? "npm run dev" : packageManager + " dev";
}