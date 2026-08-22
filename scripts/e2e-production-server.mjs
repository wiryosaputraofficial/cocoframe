import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(repositoryRoot, "packages/cli/src/main.ts");
const example = resolve(repositoryRoot, "examples/basic");

function run(args) {
  return spawn(process.execPath, [cli, ...args, example], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: "inherit",
  });
}

const build = run(["build"]);
const [buildCode] = await once(build, "exit");

if (buildCode !== 0) {
  process.exit(Number(buildCode) || 1);
}

const server = run(["start"]);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.kill(signal);
  });
}

const [serverCode] = await once(server, "exit");
process.exit(Number(serverCode) || 0);
