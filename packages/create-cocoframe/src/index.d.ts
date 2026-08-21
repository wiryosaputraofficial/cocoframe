import type { spawn } from "node:child_process";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface CreatorArguments {
  projectDirectory?: string;
  packageManager: PackageManager;
  install: boolean;
  help: boolean;
  version: boolean;
}

export interface ScaffoldOptions {
  projectDirectory: string;
  packageManager?: PackageManager;
  install?: boolean;
  cwd?: string;
  templateDirectory?: string;
  spawnCommand?: typeof spawn;
}

export interface ScaffoldResult {
  targetDirectory: string;
  packageName: string;
  packageManager: PackageManager;
  installed: boolean;
}

export interface CreatorOptions extends Omit<ScaffoldOptions, "projectDirectory" | "packageManager" | "install"> {
  userAgent?: string;
  output?: Pick<Console, "log">;
}

export const helpText: string;
export function parseArguments(args: string[], userAgent?: string): CreatorArguments;
export function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult>;
export function runCreator(args: string[], options?: CreatorOptions): Promise<ScaffoldResult | undefined>;