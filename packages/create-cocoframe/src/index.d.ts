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

/**
 * Provides the help Text operation used by the dependency-free project creator.
 */
export const helpText: string;
/**
 * Provides the available Templates operation used by the dependency-free project creator.
 */
export const availableTemplates: readonly TemplateName[];
/**
 * Parses dependency-free create-cocoframe CLI arguments into validated creator options.
 */
export function parseArguments(args: string[], userAgent?: string): CreatorArguments;
/**
 * Creates a validated CocoFrame project from an official template without overwriting non-empty directories.
 */
export function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult>;
/**
 * Provides the run Creator operation used by the dependency-free project creator.
 */
export function runCreator(args: string[], options?: CreatorOptions): Promise<ScaffoldResult | undefined>;