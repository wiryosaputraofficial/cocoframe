import type { spawn } from "node:child_process";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type TemplateName = "starter" | "marketing" | "dashboard" | "documentation";

export interface CreatorArguments {
  projectDirectory?: string;
  packageManager: PackageManager;
  template: TemplateName;
  install: boolean;
  help: boolean;
  version: boolean;
}

export interface ScaffoldOptions {
  projectDirectory: string;
  packageManager?: PackageManager;
  template?: TemplateName;
  install?: boolean;
  cwd?: string;
  templateDirectory?: string;
  spawnCommand?: typeof spawn;
}

export interface ScaffoldResult {
  targetDirectory: string;
  packageName: string;
  packageManager: PackageManager;
  template: TemplateName;
  installed: boolean;
}

export interface CreatorOptions extends Omit<ScaffoldOptions, "projectDirectory" | "packageManager" | "install"> {
  userAgent?: string;
  output?: Pick<Console, "log">;
}

export const helpText: string;
export const availableTemplates: readonly TemplateName[];
export function parseArguments(args: string[], userAgent?: string): CreatorArguments;
export function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult>;
export function runCreator(args: string[], options?: CreatorOptions): Promise<ScaffoldResult | undefined>;